export type Role = 'CUSTOMER' | 'STAFF' | 'MANAGER' | 'ADMIN';
export type Shift = 'MORNING' | 'EVENING' | 'FULL_DAY';
export type StaffStatus = 'AVAILABLE' | 'BUSY' | 'BREAK' | 'OFFLINE';

export interface JwtUserPayload {
  userId: string;
  email: string;
  role: Role;
  departmentId?: string | null;
}

export interface AuthResponseUser {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: Role;
  departmentId?: string | null;
  departmentName?: string | null;
  isActive: boolean;
  lastLoginAt?: Date | string | null;
  staffProfile?: {
    id: string;
    staffCode: string;
    shift: Shift;
    currentStatus: StaffStatus;
    assignedCounterId?: string | null;
    serviceType?: string | null;
  } | null;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}
