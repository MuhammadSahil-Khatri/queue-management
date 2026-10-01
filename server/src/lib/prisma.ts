import dotenv from 'dotenv';
dotenv.config();
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import pg from 'pg';
import { Role, Shift, StaffStatus } from '../types/auth.js';

const { Pool } = pg;

export interface UserEntity {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  passwordHash: string;
  role: Role;
  departmentId?: string | null;
  isActive: boolean;
  lastLoginAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DepartmentEntity {
  id: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface StaffProfileEntity {
  id: string;
  userId: string;
  staffCode: string;
  departmentId: string;
  assignedCounterId?: string | null;
  serviceType?: string | null;
  shift: Shift;
  currentStatus: StaffStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface RefreshTokenEntity {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt?: Date | null;
  createdAt: Date;
  userAgent?: string | null;
  ip?: string | null;
}

export interface AuditLogEntity {
  id: string;
  actorId?: string | null;
  action: string;
  targetType: string;
  targetId?: string | null;
  metadata?: any;
  createdAt: Date;
}

class InMemoryPrismaStore {
  departments: Map<string, DepartmentEntity> = new Map();
  users: Map<string, UserEntity> = new Map();
  staffProfiles: Map<string, StaffProfileEntity> = new Map();
  refreshTokens: Map<string, RefreshTokenEntity> = new Map();
  auditLogs: AuditLogEntity[] = [];

  private isSeeded = false;

  constructor() {
    this.seed();
  }

  async seed() {
    if (this.isSeeded) return;
    this.isSeeded = true;

    // Salt password for demo accounts
    const adminHash = bcrypt.hashSync('AdminPass123!', 10);
    const managerHash = bcrypt.hashSync('ManagerPass123!', 10);
    const staffHash = bcrypt.hashSync('StaffPass123!', 10);
    const customerHash = bcrypt.hashSync('CustomerPass123!', 10);

    // 1. Department
    const deptId = 'dept-exam-001';
    this.departments.set(deptId, {
      id: deptId,
      name: 'Examination Department',
      description: 'Department managing candidate examinations, document verification, and certifications',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 2. Admin
    const adminId = 'user-admin-001';
    this.users.set(adminId, {
      id: adminId,
      name: 'Super Administrator',
      email: 'admin@queuecraft.local',
      phone: '+1-555-0100',
      passwordHash: adminHash,
      role: 'ADMIN',
      departmentId: null,
      isActive: true,
      lastLoginAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 3. Manager
    const managerId = 'user-manager-001';
    this.users.set(managerId, {
      id: managerId,
      name: 'Elena Rostova (Manager)',
      email: 'manager@queuecraft.local',
      phone: '+1-555-0105',
      passwordHash: managerHash,
      role: 'MANAGER',
      departmentId: deptId,
      isActive: true,
      lastLoginAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    this.staffProfiles.set('sp-manager-001', {
      id: 'sp-manager-001',
      userId: managerId,
      staffCode: 'MGR-0001',
      departmentId: deptId,
      assignedCounterId: null,
      serviceType: 'Department Oversight',
      shift: 'FULL_DAY',
      currentStatus: 'AVAILABLE',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 4. Staff 1
    const staff1Id = 'user-staff-001';
    this.users.set(staff1Id, {
      id: staff1Id,
      name: 'Marcus Vance (Staff 1)',
      email: 'staff1@queuecraft.local',
      phone: '+1-555-0106',
      passwordHash: staffHash,
      role: 'STAFF',
      departmentId: deptId,
      isActive: true,
      lastLoginAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    this.staffProfiles.set('sp-staff-001', {
      id: 'sp-staff-001',
      userId: staff1Id,
      staffCode: 'STF-0001',
      departmentId: deptId,
      assignedCounterId: 'CTR-01',
      serviceType: 'Document Intake & ID Check',
      shift: 'MORNING',
      currentStatus: 'AVAILABLE',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 5. Staff 2
    const staff2Id = 'user-staff-002';
    this.users.set(staff2Id, {
      id: staff2Id,
      name: 'Sarah Jenkins (Staff 2)',
      email: 'staff2@queuecraft.local',
      phone: '+1-555-0107',
      passwordHash: staffHash,
      role: 'STAFF',
      departmentId: deptId,
      isActive: true,
      lastLoginAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    this.staffProfiles.set('sp-staff-002', {
      id: 'sp-staff-002',
      userId: staff2Id,
      staffCode: 'STF-0002',
      departmentId: deptId,
      assignedCounterId: 'CTR-02',
      serviceType: 'Certificate Issuance',
      shift: 'EVENING',
      currentStatus: 'OFFLINE',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 6. Customer 1
    const cust1Id = 'user-customer-001';
    this.users.set(cust1Id, {
      id: cust1Id,
      name: 'Alex Rivera',
      email: 'customer1@queuecraft.local',
      phone: '+1-555-0101',
      passwordHash: customerHash,
      role: 'CUSTOMER',
      departmentId: null,
      isActive: true,
      lastLoginAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 7. Customer 2
    const cust2Id = 'user-customer-002';
    this.users.set(cust2Id, {
      id: cust2Id,
      name: 'Maya Patel',
      email: 'customer2@queuecraft.local',
      phone: '+1-555-0102',
      passwordHash: customerHash,
      role: 'CUSTOMER',
      departmentId: null,
      isActive: true,
      lastLoginAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log('\n=============================================================');
    console.log('  QUEUECRAFT SEED DATA INITIALIZED (DEMO CREDENTIALS)');
    console.log('=============================================================');
    console.log('  Role      | Email                      | Password        ');
    console.log('  --------- | -------------------------- | ----------------');
    console.log('  ADMIN     | admin@queuecraft.local     | AdminPass123!   ');
    console.log('  MANAGER   | manager@queuecraft.local   | ManagerPass123! ');
    console.log('  STAFF 1   | staff1@queuecraft.local    | StaffPass123!   ');
    console.log('  STAFF 2   | staff2@queuecraft.local    | StaffPass123!   ');
    console.log('  CUSTOMER1 | customer1@queuecraft.local | CustomerPass123!');
    console.log('  CUSTOMER2 | customer2@queuecraft.local | CustomerPass123!');
    console.log('=============================================================\n');
  }

  // --- Department operations ---
  department = {
    findUnique: async (args: { where: { id?: string; name?: string } }) => {
      if (args.where.id) {
        return this.departments.get(args.where.id) || null;
      }
      if (args.where.name) {
        for (const dept of this.departments.values()) {
          if (dept.name.toLowerCase() === args.where.name.toLowerCase()) return dept;
        }
      }
      return null;
    },
    findMany: async (args?: { where?: { isActive?: boolean } }) => {
      let list = Array.from(this.departments.values());
      if (args?.where?.isActive !== undefined) {
        list = list.filter((d) => d.isActive === args.where!.isActive);
      }
      return list;
    },
    create: async (args: { data: Partial<DepartmentEntity> & { name: string } }) => {
      const id = args.data.id || `dept-${crypto.randomUUID()}`;
      const dept: DepartmentEntity = {
        id,
        name: args.data.name,
        description: args.data.description || null,
        isActive: args.data.isActive ?? true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.departments.set(id, dept);
      return dept;
    },
  };

  // --- User operations ---
  user = {
    findUnique: async (args: {
      where: { id?: string; email?: string };
      include?: { department?: boolean; staffProfile?: boolean };
    }) => {
      let user: UserEntity | null = null;
      if (args.where.id) {
        user = this.users.get(args.where.id) || null;
      } else if (args.where.email) {
        const targetEmail = args.where.email.toLowerCase();
        for (const u of this.users.values()) {
          if (u.email.toLowerCase() === targetEmail) {
            user = u;
            break;
          }
        }
      }
      if (!user) return null;
      return this.enrichUser(user, args.include);
    },

    findFirst: async (args: {
      where: any;
      include?: { department?: boolean; staffProfile?: boolean };
    }) => {
      const all = await this.user.findMany(args);
      return all[0] || null;
    },

    findMany: async (args?: {
      where?: any;
      include?: { department?: boolean; staffProfile?: boolean };
      skip?: number;
      take?: number;
      orderBy?: any;
    }) => {
      let list = Array.from(this.users.values());

      if (args?.where) {
        const w = args.where;
        if (w.role) {
          if (typeof w.role === 'string') {
            list = list.filter((u) => u.role === w.role);
          } else if (w.role.in) {
            list = list.filter((u) => w.role.in.includes(u.role));
          }
        }
        if (w.departmentId !== undefined) {
          list = list.filter((u) => u.departmentId === w.departmentId);
        }
        if (w.isActive !== undefined) {
          list = list.filter((u) => u.isActive === w.isActive);
        }
        if (w.OR) {
          list = list.filter((u) => {
            return w.OR.some((clause: any) => {
              if (clause.name?.contains) {
                return u.name.toLowerCase().includes(clause.name.contains.toLowerCase());
              }
              if (clause.email?.contains) {
                return u.email.toLowerCase().includes(clause.email.contains.toLowerCase());
              }
              return false;
            });
          });
        }
      }

      // Default sorting: created desc
      list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      const total = list.length;
      const skip = args?.skip || 0;
      const take = args?.take || total;
      const paged = list.slice(skip, skip + take);

      return paged.map((u) => this.enrichUser(u, args?.include));
    },

    count: async (args?: { where?: any }) => {
      const items = await this.user.findMany({ where: args?.where });
      return items.length;
    },

    create: async (args: {
      data: any;
      include?: { department?: boolean; staffProfile?: boolean };
    }) => {
      const id = args.data.id || crypto.randomUUID();
      const user: UserEntity = {
        id,
        name: args.data.name,
        email: args.data.email.toLowerCase(),
        phone: args.data.phone || null,
        passwordHash: args.data.passwordHash,
        role: args.data.role || 'CUSTOMER',
        departmentId: args.data.departmentId || null,
        isActive: args.data.isActive ?? true,
        lastLoginAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.users.set(id, user);

      if (args.data.staffProfile?.create) {
        const spData = args.data.staffProfile.create;
        const spId = crypto.randomUUID();
        const profile: StaffProfileEntity = {
          id: spId,
          userId: id,
          staffCode: spData.staffCode,
          departmentId: spData.departmentId || user.departmentId || '',
          assignedCounterId: spData.assignedCounterId || null,
          serviceType: spData.serviceType || null,
          shift: spData.shift || 'FULL_DAY',
          currentStatus: spData.currentStatus || 'OFFLINE',
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        this.staffProfiles.set(spId, profile);
      }

      return this.enrichUser(user, args.include);
    },

    update: async (args: {
      where: { id: string };
      data: any;
      include?: { department?: boolean; staffProfile?: boolean };
    }) => {
      const user = this.users.get(args.where.id);
      if (!user) throw new Error(`User not found: ${args.where.id}`);

      if (args.data.name !== undefined) user.name = args.data.name;
      if (args.data.email !== undefined) user.email = args.data.email.toLowerCase();
      if (args.data.phone !== undefined) user.phone = args.data.phone;
      if (args.data.passwordHash !== undefined) user.passwordHash = args.data.passwordHash;
      if (args.data.role !== undefined) user.role = args.data.role;
      if (args.data.departmentId !== undefined) user.departmentId = args.data.departmentId;
      if (args.data.isActive !== undefined) user.isActive = args.data.isActive;
      if (args.data.lastLoginAt !== undefined) user.lastLoginAt = args.data.lastLoginAt;
      user.updatedAt = new Date();

      if (args.data.staffProfile?.update) {
        for (const sp of this.staffProfiles.values()) {
          if (sp.userId === user.id) {
            Object.assign(sp, args.data.staffProfile.update, { updatedAt: new Date() });
            break;
          }
        }
      }

      return this.enrichUser(user, args.include);
    },

    delete: async (args: { where: { id: string } }) => {
      const user = this.users.get(args.where.id);
      if (!user) throw new Error('User not found');
      this.users.delete(args.where.id);
      for (const [id, sp] of this.staffProfiles.entries()) {
        if (sp.userId === args.where.id) this.staffProfiles.delete(id);
      }
      return user;
    },
  };

  // --- StaffProfile operations ---
  staffProfile = {
    findUnique: async (args: { where: { userId?: string; staffCode?: string } }) => {
      for (const sp of this.staffProfiles.values()) {
        if (args.where.userId && sp.userId === args.where.userId) return sp;
        if (args.where.staffCode && sp.staffCode === args.where.staffCode) return sp;
      }
      return null;
    },
    findMany: async (args?: { where?: any }) => {
      let list = Array.from(this.staffProfiles.values());
      if (args?.where?.departmentId) {
        list = list.filter((sp) => sp.departmentId === args.where.departmentId);
      }
      return list;
    },
    create: async (args: { data: any }) => {
      const id = crypto.randomUUID();
      const profile: StaffProfileEntity = {
        id,
        userId: args.data.userId,
        staffCode: args.data.staffCode,
        departmentId: args.data.departmentId,
        assignedCounterId: args.data.assignedCounterId || null,
        serviceType: args.data.serviceType || null,
        shift: args.data.shift || 'FULL_DAY',
        currentStatus: args.data.currentStatus || 'OFFLINE',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.staffProfiles.set(id, profile);
      return profile;
    },
    update: async (args: { where: { userId?: string; id?: string }; data: any }) => {
      let profile: StaffProfileEntity | undefined;
      if (args.where.id) profile = this.staffProfiles.get(args.where.id);
      else if (args.where.userId) {
        for (const sp of this.staffProfiles.values()) {
          if (sp.userId === args.where.userId) {
            profile = sp;
            break;
          }
        }
      }
      if (!profile) throw new Error('Staff profile not found');
      Object.assign(profile, args.data, { updatedAt: new Date() });
      return profile;
    },
  };

  // --- RefreshToken operations ---
  refreshToken = {
    create: async (args: { data: any }) => {
      const id = crypto.randomUUID();
      const token: RefreshTokenEntity = {
        id,
        userId: args.data.userId,
        tokenHash: args.data.tokenHash,
        expiresAt: args.data.expiresAt,
        revokedAt: null,
        createdAt: new Date(),
        userAgent: args.data.userAgent || null,
        ip: args.data.ip || null,
      };
      this.refreshTokens.set(id, token);
      return token;
    },
    findFirst: async (args: { where: { tokenHash: string; revokedAt?: null } }) => {
      for (const t of this.refreshTokens.values()) {
        if (t.tokenHash === args.where.tokenHash) {
          if (args.where.revokedAt === null && t.revokedAt !== null && t.revokedAt !== undefined) {
            continue;
          }
          return t;
        }
      }
      return null;
    },
    update: async (args: { where: { id: string }; data: any }) => {
      const token = this.refreshTokens.get(args.where.id);
      if (!token) throw new Error('Token record not found');
      Object.assign(token, args.data);
      return token;
    },
    updateMany: async (args: { where: { userId: string }; data: any }) => {
      let count = 0;
      for (const t of this.refreshTokens.values()) {
        if (t.userId === args.where.userId) {
          Object.assign(t, args.data);
          count++;
        }
      }
      return { count };
    },
    deleteMany: async (args: { where: { userId: string } }) => {
      let count = 0;
      for (const [id, t] of this.refreshTokens.entries()) {
        if (t.userId === args.where.userId) {
          this.refreshTokens.delete(id);
          count++;
        }
      }
      return { count };
    },
  };

  // --- AuditLog operations ---
  auditLog = {
    create: async (args: { data: any }) => {
      const log: AuditLogEntity = {
        id: crypto.randomUUID(),
        actorId: args.data.actorId || null,
        action: args.data.action,
        targetType: args.data.targetType,
        targetId: args.data.targetId || null,
        metadata: args.data.metadata || null,
        createdAt: new Date(),
      };
      this.auditLogs.unshift(log);
      return log;
    },
    findMany: async (args?: { take?: number }) => {
      const limit = args?.take || 50;
      return this.auditLogs.slice(0, limit);
    },
  };

  private enrichUser(user: UserEntity, include?: { department?: boolean; staffProfile?: boolean }) {
    const copy: any = { ...user };
    if (include?.department && user.departmentId) {
      copy.department = this.departments.get(user.departmentId) || null;
    } else if (include?.department) {
      copy.department = null;
    }

    if (include?.staffProfile) {
      let sp: StaffProfileEntity | null = null;
      for (const p of this.staffProfiles.values()) {
        if (p.userId === user.id) {
          sp = p;
          break;
        }
      }
      copy.staffProfile = sp;
    }
    return copy;
  }
}

/**
 * PostgreSQL Database Adapter for Supabase
 */
class PostgresPrismaStore {
  private pool: pg.Pool;
  private isInitialized = false;

  constructor(connectionString: string) {
    this.pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false }, // Required for Supabase pooling & cloud Postgres
    });
  }

  async seed() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    try {
      // Check if schema is present; if not, apply migration SQL
      const checkTable = await this.pool.query(
        "SELECT 1 FROM information_schema.tables WHERE table_name = 'User' LIMIT 1"
      );

      if (checkTable.rows.length === 0) {
        console.log('⚡ Applying initial schema migrations to Supabase Postgres...');
        const migrationPath = path.resolve(process.cwd(), 'server/prisma/migrations/20261001000000_init/migration.sql');
        if (fs.existsSync(migrationPath)) {
          const sql = fs.readFileSync(migrationPath, 'utf8');
          await this.pool.query(sql);
          console.log('✅ Supabase PostgreSQL schema initialized successfully.');
        }
      }

      // Check if seed users exist
      const userCountRes = await this.pool.query('SELECT count(*) FROM "User"');
      const count = parseInt(userCountRes.rows[0].count, 10);

      if (count === 0) {
        console.log('🌱 Seeding demo accounts into Supabase PostgreSQL...');
        const adminHash = await bcrypt.hash('AdminPass123!', 12);
        const managerHash = await bcrypt.hash('ManagerPass123!', 12);
        const staffHash = await bcrypt.hash('StaffPass123!', 12);
        const customerHash = await bcrypt.hash('CustomerPass123!', 12);

        // 1. Department
        const deptRes = await this.pool.query(
          `INSERT INTO "Department" ("id", "name", "description", "isActive", "createdAt", "updatedAt")
           VALUES ($1, $2, $3, true, NOW(), NOW()) RETURNING "id"`,
          ['dept-exam-001', 'Examination Department', 'Department managing candidate examinations, document verification, and certifications']
        );
        const deptId = deptRes.rows[0].id;

        // 2. Admin
        await this.pool.query(
          `INSERT INTO "User" ("id", "name", "email", "phone", "passwordHash", "role", "isActive", "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, $5, 'ADMIN', true, NOW(), NOW())`,
          ['user-admin-001', 'Super Administrator', 'admin@queuecraft.local', '+1-555-0100', adminHash]
        );

        // 3. Manager
        await this.pool.query(
          `INSERT INTO "User" ("id", "name", "email", "phone", "passwordHash", "role", "departmentId", "isActive", "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, $5, 'MANAGER', $6, true, NOW(), NOW())`,
          ['user-manager-001', 'Elena Rostova (Manager)', 'manager@queuecraft.local', '+1-555-0105', managerHash, deptId]
        );
        await this.pool.query(
          `INSERT INTO "StaffProfile" ("id", "userId", "staffCode", "departmentId", "shift", "currentStatus", "serviceType", "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, 'FULL_DAY', 'AVAILABLE', 'Department Oversight', NOW(), NOW())`,
          ['sp-manager-001', 'user-manager-001', 'MGR-0001', deptId]
        );

        // 4. Staff 1
        await this.pool.query(
          `INSERT INTO "User" ("id", "name", "email", "phone", "passwordHash", "role", "departmentId", "isActive", "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, $5, 'STAFF', $6, true, NOW(), NOW())`,
          ['user-staff-001', 'Marcus Vance (Staff 1)', 'staff1@queuecraft.local', '+1-555-0106', staffHash, deptId]
        );
        await this.pool.query(
          `INSERT INTO "StaffProfile" ("id", "userId", "staffCode", "departmentId", "shift", "currentStatus", "serviceType", "assignedCounterId", "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, 'MORNING', 'AVAILABLE', 'Document Intake & ID Check', 'CTR-01', NOW(), NOW())`,
          ['sp-staff-001', 'user-staff-001', 'STF-0001', deptId]
        );

        // 5. Staff 2
        await this.pool.query(
          `INSERT INTO "User" ("id", "name", "email", "phone", "passwordHash", "role", "departmentId", "isActive", "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, $5, 'STAFF', $6, true, NOW(), NOW())`,
          ['user-staff-002', 'Sarah Jenkins (Staff 2)', 'staff2@queuecraft.local', '+1-555-0107', staffHash, deptId]
        );
        await this.pool.query(
          `INSERT INTO "StaffProfile" ("id", "userId", "staffCode", "departmentId", "shift", "currentStatus", "serviceType", "assignedCounterId", "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, 'EVENING', 'OFFLINE', 'Certificate Issuance', 'CTR-02', NOW(), NOW())`,
          ['sp-staff-002', 'user-staff-002', 'STF-0002', deptId]
        );

        // 6. Customers
        await this.pool.query(
          `INSERT INTO "User" ("id", "name", "email", "phone", "passwordHash", "role", "isActive", "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, $5, 'CUSTOMER', true, NOW(), NOW())`,
          ['user-cust-001', 'Alex Rivera', 'customer1@queuecraft.local', '+1-555-0101', customerHash]
        );
        await this.pool.query(
          `INSERT INTO "User" ("id", "name", "email", "phone", "passwordHash", "role", "isActive", "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, $5, 'CUSTOMER', true, NOW(), NOW())`,
          ['user-cust-002', 'Maya Patel', 'customer2@queuecraft.local', '+1-555-0102', customerHash]
        );

        console.log('✅ Demo accounts seeded into Supabase PostgreSQL.');
      }
    } catch (err) {
      console.error('PostgreSQL initialization warning:', err);
    }
  }

  department = {
    findUnique: async (args: { where: { id?: string; name?: string } }) => {
      let query = 'SELECT * FROM "Department" WHERE ';
      const params: any[] = [];
      if (args.where.id) {
        query += '"id" = $1';
        params.push(args.where.id);
      } else if (args.where.name) {
        query += 'LOWER("name") = LOWER($1)';
        params.push(args.where.name);
      } else return null;

      const res = await this.pool.query(query, params);
      return res.rows[0] || null;
    },
    findMany: async (args?: { where?: { isActive?: boolean } }) => {
      let query = 'SELECT * FROM "Department"';
      const params: any[] = [];
      if (args?.where?.isActive !== undefined) {
        query += ' WHERE "isActive" = $1';
        params.push(args.where.isActive);
      }
      query += ' ORDER BY "name" ASC';
      const res = await this.pool.query(query, params);
      return res.rows;
    },
    create: async (args: { data: Partial<DepartmentEntity> & { name: string } }) => {
      const id = args.data.id || crypto.randomUUID();
      const res = await this.pool.query(
        `INSERT INTO "Department" ("id", "name", "description", "isActive", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING *`,
        [id, args.data.name, args.data.description || null, args.data.isActive ?? true]
      );
      return res.rows[0];
    },
  };

  user = {
    findUnique: async (args: {
      where: { id?: string; email?: string };
      include?: { department?: boolean; staffProfile?: boolean };
    }) => {
      let query = 'SELECT u.* FROM "User" u WHERE ';
      const params: any[] = [];
      if (args.where.id) {
        query += 'u."id" = $1';
        params.push(args.where.id);
      } else if (args.where.email) {
        query += 'LOWER(u."email") = LOWER($1)';
        params.push(args.where.email);
      } else return null;

      const res = await this.pool.query(query, params);
      const user = res.rows[0];
      if (!user) return null;
      return this.enrichPostgresUser(user, args.include);
    },

    findFirst: async (args: {
      where: any;
      include?: { department?: boolean; staffProfile?: boolean };
    }) => {
      const list = await this.user.findMany({ ...args, take: 1 });
      return list[0] || null;
    },

    findMany: async (args?: {
      where?: any;
      include?: { department?: boolean; staffProfile?: boolean };
      skip?: number;
      take?: number;
    }) => {
      let query = 'SELECT u.* FROM "User" u WHERE 1=1';
      const params: any[] = [];
      let paramIdx = 1;

      if (args?.where) {
        const w = args.where;
        if (w.role) {
          if (typeof w.role === 'string') {
            query += ` AND u."role" = $${paramIdx++}`;
            params.push(w.role);
          } else if (w.role.in) {
            query += ` AND u."role" = ANY($${paramIdx++})`;
            params.push(w.role.in);
          }
        }
        if (w.departmentId !== undefined) {
          query += ` AND u."departmentId" = $${paramIdx++}`;
          params.push(w.departmentId);
        }
        if (w.isActive !== undefined) {
          query += ` AND u."isActive" = $${paramIdx++}`;
          params.push(w.isActive);
        }
        if (w.OR) {
          const conditions: string[] = [];
          for (const clause of w.OR) {
            if (clause.name?.contains) {
              conditions.push(`u."name" ILIKE $${paramIdx++}`);
              params.push(`%${clause.name.contains}%`);
            }
            if (clause.email?.contains) {
              conditions.push(`u."email" ILIKE $${paramIdx++}`);
              params.push(`%${clause.email.contains}%`);
            }
          }
          if (conditions.length > 0) {
            query += ` AND (${conditions.join(' OR ')})`;
          }
        }
      }

      query += ' ORDER BY u."createdAt" DESC';

      if (args?.take) {
        query += ` LIMIT $${paramIdx++}`;
        params.push(args.take);
      }
      if (args?.skip) {
        query += ` OFFSET $${paramIdx++}`;
        params.push(args.skip);
      }

      const res = await this.pool.query(query, params);
      const enriched = await Promise.all(
        res.rows.map((row) => this.enrichPostgresUser(row, args?.include))
      );
      return enriched;
    },

    count: async (args?: { where?: any }) => {
      let query = 'SELECT count(*) FROM "User" u WHERE 1=1';
      const params: any[] = [];
      let paramIdx = 1;

      if (args?.where) {
        const w = args.where;
        if (w.role) {
          if (typeof w.role === 'string') {
            query += ` AND u."role" = $${paramIdx++}`;
            params.push(w.role);
          } else if (w.role.in) {
            query += ` AND u."role" = ANY($${paramIdx++})`;
            params.push(w.role.in);
          }
        }
        if (w.departmentId !== undefined) {
          query += ` AND u."departmentId" = $${paramIdx++}`;
          params.push(w.departmentId);
        }
        if (w.isActive !== undefined) {
          query += ` AND u."isActive" = $${paramIdx++}`;
          params.push(w.isActive);
        }
      }

      const res = await this.pool.query(query, params);
      return parseInt(res.rows[0].count, 10);
    },

    create: async (args: {
      data: any;
      include?: { department?: boolean; staffProfile?: boolean };
    }) => {
      const id = args.data.id || crypto.randomUUID();
      const res = await this.pool.query(
        `INSERT INTO "User" ("id", "name", "email", "phone", "passwordHash", "role", "departmentId", "isActive", "createdAt", "updatedAt")
         VALUES ($1, $2, LOWER($3), $4, $5, $6, $7, $8, NOW(), NOW()) RETURNING *`,
        [
          id,
          args.data.name,
          args.data.email,
          args.data.phone || null,
          args.data.passwordHash,
          args.data.role || 'CUSTOMER',
          args.data.departmentId || null,
          args.data.isActive ?? true,
        ]
      );
      const user = res.rows[0];

      if (args.data.staffProfile?.create) {
        const sp = args.data.staffProfile.create;
        await this.pool.query(
          `INSERT INTO "StaffProfile" ("id", "userId", "staffCode", "departmentId", "assignedCounterId", "serviceType", "shift", "currentStatus", "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())`,
          [
            crypto.randomUUID(),
            id,
            sp.staffCode,
            sp.departmentId || user.departmentId,
            sp.assignedCounterId || null,
            sp.serviceType || null,
            sp.shift || 'FULL_DAY',
            sp.currentStatus || 'OFFLINE',
          ]
        );
      }

      return this.enrichPostgresUser(user, args.include);
    },

    update: async (args: {
      where: { id: string };
      data: any;
      include?: { department?: boolean; staffProfile?: boolean };
    }) => {
      const sets: string[] = ['"updatedAt" = NOW()'];
      const params: any[] = [];
      let idx = 1;

      if (args.data.name !== undefined) {
        sets.push(`"name" = $${idx++}`);
        params.push(args.data.name);
      }
      if (args.data.email !== undefined) {
        sets.push(`"email" = LOWER($${idx++})`);
        params.push(args.data.email);
      }
      if (args.data.phone !== undefined) {
        sets.push(`"phone" = $${idx++}`);
        params.push(args.data.phone);
      }
      if (args.data.passwordHash !== undefined) {
        sets.push(`"passwordHash" = $${idx++}`);
        params.push(args.data.passwordHash);
      }
      if (args.data.role !== undefined) {
        sets.push(`"role" = $${idx++}`);
        params.push(args.data.role);
      }
      if (args.data.departmentId !== undefined) {
        sets.push(`"departmentId" = $${idx++}`);
        params.push(args.data.departmentId);
      }
      if (args.data.isActive !== undefined) {
        sets.push(`"isActive" = $${idx++}`);
        params.push(args.data.isActive);
      }
      if (args.data.lastLoginAt !== undefined) {
        sets.push(`"lastLoginAt" = $${idx++}`);
        params.push(args.data.lastLoginAt);
      }

      params.push(args.where.id);
      const query = `UPDATE "User" SET ${sets.join(', ')} WHERE "id" = $${idx} RETURNING *`;
      const res = await this.pool.query(query, params);
      const user = res.rows[0];

      if (args.data.staffProfile?.update) {
        const sp = args.data.staffProfile.update;
        const spSets: string[] = ['"updatedAt" = NOW()'];
        const spParams: any[] = [];
        let sIdx = 1;

        if (sp.shift !== undefined) {
          spSets.push(`"shift" = $${sIdx++}`);
          spParams.push(sp.shift);
        }
        if (sp.serviceType !== undefined) {
          spSets.push(`"serviceType" = $${sIdx++}`);
          spParams.push(sp.serviceType);
        }
        if (sp.assignedCounterId !== undefined) {
          spSets.push(`"assignedCounterId" = $${sIdx++}`);
          spParams.push(sp.assignedCounterId);
        }
        if (sp.currentStatus !== undefined) {
          spSets.push(`"currentStatus" = $${sIdx++}`);
          spParams.push(sp.currentStatus);
        }

        spParams.push(args.where.id);
        await this.pool.query(
          `UPDATE "StaffProfile" SET ${spSets.join(', ')} WHERE "userId" = $${sIdx}`,
          spParams
        );
      }

      return this.enrichPostgresUser(user, args.include);
    },

    delete: async (args: { where: { id: string } }) => {
      const res = await this.pool.query('DELETE FROM "User" WHERE "id" = $1 RETURNING *', [
        args.where.id,
      ]);
      return res.rows[0];
    },
  };

  staffProfile = {
    findUnique: async (args: { where: { userId?: string; staffCode?: string } }) => {
      let query = 'SELECT * FROM "StaffProfile" WHERE ';
      const params: any[] = [];
      if (args.where.userId) {
        query += '"userId" = $1';
        params.push(args.where.userId);
      } else if (args.where.staffCode) {
        query += '"staffCode" = $1';
        params.push(args.where.staffCode);
      } else return null;

      const res = await this.pool.query(query, params);
      return res.rows[0] || null;
    },
    findMany: async (args?: { where?: any }) => {
      let query = 'SELECT * FROM "StaffProfile"';
      const params: any[] = [];
      if (args?.where?.departmentId) {
        query += ' WHERE "departmentId" = $1';
        params.push(args.where.departmentId);
      }
      const res = await this.pool.query(query, params);
      return res.rows;
    },
    create: async (args: { data: any }) => {
      const id = crypto.randomUUID();
      const res = await this.pool.query(
        `INSERT INTO "StaffProfile" ("id", "userId", "staffCode", "departmentId", "assignedCounterId", "serviceType", "shift", "currentStatus", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW()) RETURNING *`,
        [
          id,
          args.data.userId,
          args.data.staffCode,
          args.data.departmentId,
          args.data.assignedCounterId || null,
          args.data.serviceType || null,
          args.data.shift || 'FULL_DAY',
          args.data.currentStatus || 'OFFLINE',
        ]
      );
      return res.rows[0];
    },
    update: async (args: { where: { userId?: string; id?: string }; data: any }) => {
      const sets: string[] = ['"updatedAt" = NOW()'];
      const params: any[] = [];
      let idx = 1;

      for (const [key, val] of Object.entries(args.data)) {
        sets.push(`"${key}" = $${idx++}`);
        params.push(val);
      }

      let whereClause = '';
      if (args.where.id) {
        whereClause = `"id" = $${idx}`;
        params.push(args.where.id);
      } else if (args.where.userId) {
        whereClause = `"userId" = $${idx}`;
        params.push(args.where.userId);
      }

      const res = await this.pool.query(
        `UPDATE "StaffProfile" SET ${sets.join(', ')} WHERE ${whereClause} RETURNING *`,
        params
      );
      return res.rows[0];
    },
  };

  refreshToken = {
    create: async (args: { data: any }) => {
      const id = crypto.randomUUID();
      const res = await this.pool.query(
        `INSERT INTO "RefreshToken" ("id", "userId", "tokenHash", "expiresAt", "revokedAt", "userAgent", "ip", "createdAt")
         VALUES ($1, $2, $3, $4, NULL, $5, $6, NOW()) RETURNING *`,
        [
          id,
          args.data.userId,
          args.data.tokenHash,
          args.data.expiresAt,
          args.data.userAgent || null,
          args.data.ip || null,
        ]
      );
      return res.rows[0];
    },
    findFirst: async (args: { where: { tokenHash: string; revokedAt?: null } }) => {
      const res = await this.pool.query(
        'SELECT * FROM "RefreshToken" WHERE "tokenHash" = $1 AND "revokedAt" IS NULL LIMIT 1',
        [args.where.tokenHash]
      );
      return res.rows[0] || null;
    },
    update: async (args: { where: { id: string }; data: any }) => {
      const res = await this.pool.query(
        'UPDATE "RefreshToken" SET "revokedAt" = $1 WHERE "id" = $2 RETURNING *',
        [args.data.revokedAt, args.where.id]
      );
      return res.rows[0];
    },
    updateMany: async (args: { where: { userId: string }; data: any }) => {
      const res = await this.pool.query(
        'UPDATE "RefreshToken" SET "revokedAt" = $1 WHERE "userId" = $2',
        [args.data.revokedAt, args.where.userId]
      );
      return { count: res.rowCount };
    },
    deleteMany: async (args: { where: { userId: string } }) => {
      const res = await this.pool.query('DELETE FROM "RefreshToken" WHERE "userId" = $1', [
        args.where.userId,
      ]);
      return { count: res.rowCount };
    },
  };

  auditLog = {
    create: async (args: { data: any }) => {
      const id = crypto.randomUUID();
      const res = await this.pool.query(
        `INSERT INTO "AuditLog" ("id", "actorId", "action", "targetType", "targetId", "metadata", "createdAt")
         VALUES ($1, $2, $3, $4, $5, $6, NOW()) RETURNING *`,
        [
          id,
          args.data.actorId || null,
          args.data.action,
          args.data.targetType,
          args.data.targetId || null,
          JSON.stringify(args.data.metadata || {}),
        ]
      );
      return res.rows[0];
    },
    findMany: async (args?: { take?: number }) => {
      const limit = args?.take || 50;
      const res = await this.pool.query(
        'SELECT * FROM "AuditLog" ORDER BY "createdAt" DESC LIMIT $1',
        [limit]
      );
      return res.rows;
    },
  };

  private async enrichPostgresUser(user: any, include?: { department?: boolean; staffProfile?: boolean }) {
    const copy = { ...user };
    if (include?.department && user.departmentId) {
      const d = await this.pool.query('SELECT * FROM "Department" WHERE "id" = $1', [user.departmentId]);
      copy.department = d.rows[0] || null;
    } else if (include?.department) {
      copy.department = null;
    }

    if (include?.staffProfile) {
      const sp = await this.pool.query('SELECT * FROM "StaffProfile" WHERE "userId" = $1', [user.id]);
      copy.staffProfile = sp.rows[0] || null;
    }
    return copy;
  }
}

// Select Postgres store if DATABASE_URL is set, otherwise fall back to InMemory store
export const prisma: any =
  process.env.DATABASE_URL &&
  (process.env.DATABASE_URL.startsWith('postgres://') || process.env.DATABASE_URL.startsWith('postgresql://'))
    ? new PostgresPrismaStore(process.env.DATABASE_URL)
    : new InMemoryPrismaStore();

export default prisma;
