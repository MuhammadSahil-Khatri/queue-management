import { prisma } from '../lib/prisma.js';
import { hashPassword, comparePassword } from '../lib/password.js';
import {
  generateAccessToken,
  generateRefreshTokenString,
  hashRefreshToken,
  getRefreshTokenExpiryDate,
} from '../lib/jwt.js';
import { logAudit } from './audit.service.js';
import { AuthResponseUser, AuthTokens } from '../types/auth.js';

export function toAuthResponseUser(user: any): AuthResponseUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone || null,
    role: user.role,
    departmentId: user.departmentId || null,
    departmentName: user.department?.name || null,
    isActive: user.isActive,
    lastLoginAt: user.lastLoginAt || null,
    staffProfile: user.staffProfile
      ? {
          id: user.staffProfile.id,
          staffCode: user.staffProfile.staffCode,
          shift: user.staffProfile.shift,
          currentStatus: user.staffProfile.currentStatus,
          assignedCounterId: user.staffProfile.assignedCounterId || null,
          serviceType: user.staffProfile.serviceType || null,
        }
      : null,
  };
}

export class AuthService {
  /**
   * Register a new public CUSTOMER account.
   * Privilege escalation prevention: role is strictly hardcoded to CUSTOMER.
   */
  static async register(data: {
    name: string;
    email: string;
    phone?: string;
    password: string;
  }, context: { userAgent?: string; ip?: string }): Promise<{ user: AuthResponseUser; tokens: AuthTokens }> {
    const existing = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });

    if (existing) {
      const err: any = new Error('An account with this email address already exists');
      err.status = 409;
      err.code = 'EMAIL_ALREADY_EXISTS';
      throw err;
    }

    const passwordHash = await hashPassword(data.password);

    // Create user strictly with role CUSTOMER
    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email.toLowerCase(),
        phone: data.phone || null,
        passwordHash,
        role: 'CUSTOMER',
        isActive: true,
      },
    });

    await logAudit({
      actorId: user.id,
      action: 'USER_REGISTERED',
      targetType: 'USER',
      targetId: user.id,
      metadata: { role: 'CUSTOMER', email: user.email },
    });

    // Generate tokens
    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      departmentId: user.departmentId,
    });

    const refreshToken = generateRefreshTokenString();
    const tokenHash = hashRefreshToken(refreshToken);
    const expiresAt = getRefreshTokenExpiryDate();

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
        userAgent: context.userAgent,
        ip: context.ip,
      },
    });

    return {
      user: toAuthResponseUser(user),
      tokens: { accessToken, refreshToken },
    };
  }

  /**
   * Log in an existing user.
   * Rejects inactive users.
   * Uses generic error message "Invalid email or password" to prevent user enumeration.
   */
  static async login(
    email: string,
    passwordPlain: string,
    context: { userAgent?: string; ip?: string }
  ): Promise<{ user: AuthResponseUser; tokens: AuthTokens }> {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        department: true,
        staffProfile: true,
      },
    });

    if (!user) {
      await logAudit({
        actorId: null,
        action: 'LOGIN_FAILED',
        targetType: 'AUTH',
        metadata: { reason: 'User not found', email },
      });
      const err: any = new Error('Invalid email or password');
      err.status = 401;
      err.code = 'INVALID_CREDENTIALS';
      throw err;
    }

    const isMatch = await comparePassword(passwordPlain, user.passwordHash);
    if (!isMatch) {
      await logAudit({
        actorId: user.id,
        action: 'LOGIN_FAILED',
        targetType: 'AUTH',
        targetId: user.id,
        metadata: { reason: 'Invalid password', email },
      });
      const err: any = new Error('Invalid email or password');
      err.status = 401;
      err.code = 'INVALID_CREDENTIALS';
      throw err;
    }

    if (!user.isActive) {
      await logAudit({
        actorId: user.id,
        action: 'LOGIN_FAILED',
        targetType: 'AUTH',
        targetId: user.id,
        metadata: { reason: 'Account inactive', email },
      });
      const err: any = new Error('Your account has been deactivated. Please contact an administrator.');
      err.status = 401;
      err.code = 'ACCOUNT_DEACTIVATED';
      throw err;
    }

    // Update lastLoginAt
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    await logAudit({
      actorId: user.id,
      action: 'LOGIN_SUCCESS',
      targetType: 'AUTH',
      targetId: user.id,
      metadata: { role: user.role, email: user.email },
    });

    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      departmentId: user.departmentId,
    });

    const refreshToken = generateRefreshTokenString();
    const tokenHash = hashRefreshToken(refreshToken);
    const expiresAt = getRefreshTokenExpiryDate();

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
        userAgent: context.userAgent,
        ip: context.ip,
      },
    });

    return {
      user: toAuthResponseUser(user),
      tokens: { accessToken, refreshToken },
    };
  }

  /**
   * Rotate refresh token and issue new access token.
   */
  static async refresh(
    rawRefreshToken: string,
    context: { userAgent?: string; ip?: string }
  ): Promise<{ accessToken: string; newRefreshToken: string; user: AuthResponseUser }> {
    const tokenHash = hashRefreshToken(rawRefreshToken);

    const tokenRecord = await prisma.refreshToken.findFirst({
      where: {
        tokenHash,
        revokedAt: null,
      },
    });

    if (!tokenRecord || new Date() > new Date(tokenRecord.expiresAt)) {
      const err: any = new Error('Invalid or expired refresh session. Please sign in again.');
      err.status = 401;
      err.code = 'REFRESH_TOKEN_INVALID';
      throw err;
    }

    // Immediately revoke previous refresh token to prevent replay attacks
    await prisma.refreshToken.update({
      where: { id: tokenRecord.id },
      data: { revokedAt: new Date() },
    });

    const user = await prisma.user.findUnique({
      where: { id: tokenRecord.userId },
      include: {
        department: true,
        staffProfile: true,
      },
    });

    if (!user || !user.isActive) {
      const err: any = new Error('User account is invalid or deactivated');
      err.status = 401;
      err.code = 'UNAUTHORIZED';
      throw err;
    }

    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      departmentId: user.departmentId,
    });

    const newRefreshToken = generateRefreshTokenString();
    const newHash = hashRefreshToken(newRefreshToken);
    const expiresAt = getRefreshTokenExpiryDate();

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: newHash,
        expiresAt,
        userAgent: context.userAgent,
        ip: context.ip,
      },
    });

    await logAudit({
      actorId: user.id,
      action: 'TOKEN_REFRESHED',
      targetType: 'AUTH',
      targetId: user.id,
    });

    return {
      accessToken,
      newRefreshToken,
      user: toAuthResponseUser(user),
    };
  }

  /**
   * Log out user and revoke refresh token.
   */
  static async logout(rawRefreshToken?: string, actorId?: string): Promise<void> {
    if (rawRefreshToken) {
      const tokenHash = hashRefreshToken(rawRefreshToken);
      const record = await prisma.refreshToken.findFirst({
        where: { tokenHash, revokedAt: null },
      });
      if (record) {
        await prisma.refreshToken.update({
          where: { id: record.id },
          data: { revokedAt: new Date() },
        });
      }
    }

    if (actorId) {
      await logAudit({
        actorId,
        action: 'LOGOUT',
        targetType: 'AUTH',
        targetId: actorId,
      });
    }
  }

  /**
   * Get current user by ID.
   */
  static async getMe(userId: string): Promise<AuthResponseUser> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
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

    return toAuthResponseUser(user);
  }

  /**
   * Update own profile (name, phone).
   */
  static async updateMe(
    userId: string,
    data: { name?: string; phone?: string | null }
  ): Promise<AuthResponseUser> {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.name ? { name: data.name } : {}),
        ...(data.phone !== undefined ? { phone: data.phone } : {}),
      },
      include: {
        department: true,
        staffProfile: true,
      },
    });

    await logAudit({
      actorId: userId,
      action: 'PROFILE_UPDATED',
      targetType: 'USER',
      targetId: userId,
      metadata: { fields: Object.keys(data) },
    });

    return toAuthResponseUser(user);
  }

  /**
   * Change current user's password.
   */
  static async changePassword(
    userId: string,
    currentPasswordPlain: string,
    newPasswordPlain: string
  ): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      const err: any = new Error('User not found');
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    const isMatch = await comparePassword(currentPasswordPlain, user.passwordHash);
    if (!isMatch) {
      const err: any = new Error('Current password does not match');
      err.status = 400;
      err.code = 'INVALID_CURRENT_PASSWORD';
      throw err;
    }

    const newHash = await hashPassword(newPasswordPlain);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    });

    // Revoke all existing refresh tokens for security
    await prisma.refreshToken.updateMany({
      where: { userId },
      data: { revokedAt: new Date() },
    });

    await logAudit({
      actorId: userId,
      action: 'PASSWORD_CHANGED',
      targetType: 'USER',
      targetId: userId,
    });
  }
}
