import { prisma } from '../lib/prisma.js';
import { hashPassword } from '../lib/password.js';
import { logAudit } from './audit.service.js';
import { toAuthResponseUser } from './auth.service.js';
import { Role, Shift, StaffStatus, AuthResponseUser } from '../types/auth.js';

export interface UserFilterOptions {
  search?: string;
  role?: Role;
  departmentId?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

export class UserService {
  /**
   * Generate next sequential staff code (e.g. STF-0003)
   */
  static async generateStaffCode(prefix = 'STF'): Promise<string> {
    const existing = await prisma.staffProfile.findMany();
    let highest = 0;
    for (const p of existing) {
      if (p.staffCode && p.staffCode.startsWith(`${prefix}-`)) {
        const numPart = parseInt(p.staffCode.replace(`${prefix}-`, ''), 10);
        if (!isNaN(numPart) && numPart > highest) highest = numPart;
      }
    }
    const nextNum = highest + 1;
    return `${prefix}-${nextNum.toString().padStart(4, '0')}`;
  }

  /**
   * List users with search, filtering, and pagination.
   */
  static async listUsers(
    filters: UserFilterOptions,
    actor: AuthResponseUser
  ): Promise<{ users: AuthResponseUser[]; total: number; page: number; limit: number; totalPages: number }> {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 10));
    const skip = (page - 1) * limit;

    const where: any = {};

    // Role-based restrictions
    if (actor.role === 'MANAGER') {
      // Managers can only list STAFF within their own department
      where.departmentId = actor.departmentId;
      where.role = 'STAFF';
    } else if (actor.role === 'ADMIN') {
      if (filters.role) where.role = filters.role;
      if (filters.departmentId) where.departmentId = filters.departmentId;
    } else {
      const err: any = new Error('Access denied');
      err.status = 403;
      err.code = 'FORBIDDEN';
      throw err;
    }

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search } },
        { email: { contains: filters.search } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        include: {
          department: true,
          staffProfile: true,
        },
      }),
      prisma.user.count({ where }),
    ]);

    return {
      users: users.map(toAuthResponseUser),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Get user by ID with authorization checks.
   */
  static async getUserById(id: string, actor: AuthResponseUser): Promise<AuthResponseUser> {
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        department: true,
        staffProfile: true,
      },
    });

    if (!user) {
      const err: any = new Error('User not found');
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    // Role checks
    if (actor.role === 'MANAGER') {
      if (user.role !== 'STAFF' || user.departmentId !== actor.departmentId) {
        const err: any = new Error('Managers can only view staff within their assigned department');
        err.status = 403;
        err.code = 'FORBIDDEN';
        throw err;
      }
    } else if (actor.role !== 'ADMIN' && actor.id !== id) {
      const err: any = new Error('Access denied');
      err.status = 403;
      err.code = 'FORBIDDEN';
      throw err;
    }

    return toAuthResponseUser(user);
  }

  /**
   * Create user (ADMIN can create any role; MANAGER can create only STAFF in own department).
   */
  static async createUser(
    data: {
      name: string;
      email: string;
      phone?: string;
      password: string;
      role: Role;
      departmentId?: string | null;
      staffCode?: string;
      shift?: Shift;
      serviceType?: string;
      assignedCounterId?: string;
    },
    actor: AuthResponseUser
  ): Promise<AuthResponseUser> {
    // 1. Role enforcement
    let targetRole = data.role;
    let targetDeptId = data.departmentId;

    if (actor.role === 'MANAGER') {
      if (data.role && data.role !== 'STAFF') {
        const err: any = new Error('Managers can only create STAFF accounts');
        err.status = 403;
        err.code = 'FORBIDDEN';
        throw err;
      }
      targetRole = 'STAFF';
      targetDeptId = actor.departmentId;
    } else if (actor.role !== 'ADMIN') {
      const err: any = new Error('Only Admins and Managers can create user accounts');
      err.status = 403;
      err.code = 'FORBIDDEN';
      throw err;
    }

    // Check duplicate email
    const existing = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });
    if (existing) {
      const err: any = new Error('An account with this email address already exists');
      err.status = 409;
      err.code = 'EMAIL_ALREADY_EXISTS';
      throw err;
    }

    // Department requirement for STAFF and MANAGER
    if ((targetRole === 'STAFF' || targetRole === 'MANAGER') && !targetDeptId) {
      const err: any = new Error('Department is required for STAFF and MANAGER accounts');
      err.status = 400;
      err.code = 'DEPARTMENT_REQUIRED';
      throw err;
    }

    const passwordHash = await hashPassword(data.password);

    // Auto-generate staff code if needed
    let staffCode = data.staffCode;
    if ((targetRole === 'STAFF' || targetRole === 'MANAGER') && !staffCode) {
      const prefix = targetRole === 'MANAGER' ? 'MGR' : 'STF';
      staffCode = await this.generateStaffCode(prefix);
    }

    const createPayload: any = {
      name: data.name,
      email: data.email.toLowerCase(),
      phone: data.phone || null,
      passwordHash,
      role: targetRole,
      departmentId: targetDeptId || null,
      isActive: true,
    };

    if (targetRole === 'STAFF' || targetRole === 'MANAGER') {
      createPayload.staffProfile = {
        create: {
          staffCode: staffCode!,
          departmentId: targetDeptId!,
          assignedCounterId: data.assignedCounterId || null,
          serviceType: data.serviceType || null,
          shift: data.shift || 'FULL_DAY',
          currentStatus: 'OFFLINE',
        },
      };
    }

    const created = await prisma.user.create({
      data: createPayload,
      include: {
        department: true,
        staffProfile: true,
      },
    });

    await logAudit({
      actorId: actor.id,
      action: 'USER_CREATED',
      targetType: 'USER',
      targetId: created.id,
      metadata: {
        role: created.role,
        departmentId: created.departmentId,
        staffCode,
      },
    });

    return toAuthResponseUser(created);
  }

  /**
   * Update user details and staff profile.
   */
  static async updateUser(
    id: string,
    data: {
      name?: string;
      email?: string;
      phone?: string | null;
      role?: Role;
      departmentId?: string | null;
      shift?: Shift;
      serviceType?: string | null;
      assignedCounterId?: string | null;
      currentStatus?: StaffStatus;
    },
    actor: AuthResponseUser
  ): Promise<AuthResponseUser> {
    const existing = await prisma.user.findUnique({
      where: { id },
      include: {
        department: true,
        staffProfile: true,
      },
    });

    if (!existing) {
      const err: any = new Error('User not found');
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    // Role safety & permissions
    if (actor.role === 'MANAGER') {
      if (existing.role !== 'STAFF' || existing.departmentId !== actor.departmentId) {
        const err: any = new Error('Managers can only edit staff in their own department');
        err.status = 403;
        err.code = 'FORBIDDEN';
        throw err;
      }
      if (data.role && data.role !== 'STAFF') {
        const err: any = new Error('Managers cannot change staff role');
        err.status = 403;
        err.code = 'FORBIDDEN';
        throw err;
      }
      if (data.departmentId && data.departmentId !== actor.departmentId) {
        const err: any = new Error('Managers cannot move staff to another department');
        err.status = 403;
        err.code = 'FORBIDDEN';
        throw err;
      }
    } else if (actor.role !== 'ADMIN') {
      const err: any = new Error('Access denied');
      err.status = 403;
      err.code = 'FORBIDDEN';
      throw err;
    }

    // Safety rule: Admin cannot demote themselves
    if (existing.id === actor.id && data.role && data.role !== 'ADMIN') {
      const err: any = new Error('Administrators cannot demote their own account');
      err.status = 400;
      err.code = 'CANNOT_DEMOTE_SELF';
      throw err;
    }

    // Safety rule: Last active admin cannot be demoted
    if (existing.role === 'ADMIN' && data.role && data.role !== 'ADMIN') {
      const adminCount = await prisma.user.count({
        where: { role: 'ADMIN', isActive: true },
      });
      if (adminCount <= 1) {
        const err: any = new Error('Cannot demote the last active Administrator');
        err.status = 400;
        err.code = 'LAST_ADMIN_PROTECTED';
        throw err;
      }
    }

    // Email collision check
    if (data.email && data.email.toLowerCase() !== existing.email.toLowerCase()) {
      const emailConflict = await prisma.user.findUnique({
        where: { email: data.email.toLowerCase() },
      });
      if (emailConflict) {
        const err: any = new Error('Email address is already in use by another account');
        err.status = 409;
        err.code = 'EMAIL_ALREADY_EXISTS';
        throw err;
      }
    }

    const updatePayload: any = {};
    if (data.name !== undefined) updatePayload.name = data.name;
    if (data.email !== undefined) updatePayload.email = data.email.toLowerCase();
    if (data.phone !== undefined) updatePayload.phone = data.phone;
    if (data.role !== undefined && actor.role === 'ADMIN') updatePayload.role = data.role;
    if (data.departmentId !== undefined && actor.role === 'ADMIN') updatePayload.departmentId = data.departmentId;

    // Staff profile updates
    const staffProfileUpdates: any = {};
    if (data.shift !== undefined) staffProfileUpdates.shift = data.shift;
    if (data.serviceType !== undefined) staffProfileUpdates.serviceType = data.serviceType;
    if (data.assignedCounterId !== undefined) staffProfileUpdates.assignedCounterId = data.assignedCounterId;
    if (data.currentStatus !== undefined) staffProfileUpdates.currentStatus = data.currentStatus;

    if (Object.keys(staffProfileUpdates).length > 0) {
      if (existing.staffProfile) {
        updatePayload.staffProfile = { update: staffProfileUpdates };
      } else if (existing.role === 'STAFF' || existing.role === 'MANAGER' || data.role === 'STAFF' || data.role === 'MANAGER') {
        const code = await this.generateStaffCode(existing.role === 'MANAGER' ? 'MGR' : 'STF');
        await prisma.staffProfile.create({
          data: {
            userId: existing.id,
            staffCode: code,
            departmentId: data.departmentId || existing.departmentId || actor.departmentId || '',
            ...staffProfileUpdates,
          },
        });
      }
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updatePayload,
      include: {
        department: true,
        staffProfile: true,
      },
    });

    if (data.role && data.role !== existing.role) {
      await logAudit({
        actorId: actor.id,
        action: 'ROLE_CHANGED',
        targetType: 'USER',
        targetId: updated.id,
        metadata: { oldRole: existing.role, newRole: data.role },
      });
    }

    await logAudit({
      actorId: actor.id,
      action: 'USER_UPDATED',
      targetType: 'USER',
      targetId: updated.id,
      metadata: { fields: Object.keys(data) },
    });

    return toAuthResponseUser(updated);
  }

  /**
   * Activate or deactivate a user account.
   */
  static async updateUserStatus(
    id: string,
    isActive: boolean,
    actor: AuthResponseUser
  ): Promise<AuthResponseUser> {
    const existing = await prisma.user.findUnique({
      where: { id },
    });

    if (!existing) {
      const err: any = new Error('User not found');
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    // Role safety & permissions
    if (actor.role === 'MANAGER') {
      if (existing.role !== 'STAFF' || existing.departmentId !== actor.departmentId) {
        const err: any = new Error('Managers can only activate/deactivate staff within their own department');
        err.status = 403;
        err.code = 'FORBIDDEN';
        throw err;
      }
    } else if (actor.role !== 'ADMIN') {
      const err: any = new Error('Access denied');
      err.status = 403;
      err.code = 'FORBIDDEN';
      throw err;
    }

    // Safety rule: Admin cannot deactivate themselves
    if (existing.id === actor.id && !isActive) {
      const err: any = new Error('Administrators cannot deactivate their own account');
      err.status = 400;
      err.code = 'CANNOT_DEACTIVATE_SELF';
      throw err;
    }

    // Safety rule: Last active admin cannot be deactivated
    if (existing.role === 'ADMIN' && !isActive) {
      const activeAdminCount = await prisma.user.count({
        where: { role: 'ADMIN', isActive: true },
      });
      if (activeAdminCount <= 1) {
        const err: any = new Error('Cannot deactivate the last active Administrator');
        err.status = 400;
        err.code = 'LAST_ADMIN_PROTECTED';
        throw err;
      }
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { isActive },
      include: {
        department: true,
        staffProfile: true,
      },
    });

    // If deactivated, revoke all refresh tokens immediately
    if (!isActive) {
      await prisma.refreshToken.updateMany({
        where: { userId: id },
        data: { revokedAt: new Date() },
      });
    }

    await logAudit({
      actorId: actor.id,
      action: isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
      targetType: 'USER',
      targetId: id,
    });

    return toAuthResponseUser(updated);
  }

  /**
   * Delete or soft-delete user (Admin only)
   */
  static async deleteUser(id: string, actor: AuthResponseUser): Promise<void> {
    if (actor.role !== 'ADMIN') {
      const err: any = new Error('Only Administrators can delete accounts');
      err.status = 403;
      err.code = 'FORBIDDEN';
      throw err;
    }

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      const err: any = new Error('User not found');
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    if (existing.id === actor.id) {
      const err: any = new Error('Administrators cannot delete their own account');
      err.status = 400;
      err.code = 'CANNOT_DELETE_SELF';
      throw err;
    }

    if (existing.role === 'ADMIN') {
      const activeAdminCount = await prisma.user.count({
        where: { role: 'ADMIN', isActive: true },
      });
      if (activeAdminCount <= 1) {
        const err: any = new Error('Cannot delete the last active Administrator');
        err.status = 400;
        err.code = 'LAST_ADMIN_PROTECTED';
        throw err;
      }
    }

    await prisma.user.delete({ where: { id } });

    await logAudit({
      actorId: actor.id,
      action: 'USER_DELETED',
      targetType: 'USER',
      targetId: id,
      metadata: { deletedEmail: existing.email, deletedRole: existing.role },
    });
  }
}
