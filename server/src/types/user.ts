import { Role, Shift, StaffStatus } from './auth.js';

export interface UserRecord {
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

export interface DepartmentRecord {
  id: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface StaffProfileRecord {
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

export interface RefreshTokenRecord {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt?: Date | null;
  createdAt: Date;
  userAgent?: string | null;
  ip?: string | null;
}

export interface AuditLogRecord {
  id: string;
  actorId?: string | null;
  action: string;
  targetType: string;
  targetId?: string | null;
  metadata?: any;
  createdAt: Date;
}
