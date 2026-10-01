import api, { setAccessToken } from './axios.ts';

export type Role = 'CUSTOMER' | 'STAFF' | 'MANAGER' | 'ADMIN';
export type Shift = 'MORNING' | 'EVENING' | 'FULL_DAY';
export type StaffStatus = 'AVAILABLE' | 'BUSY' | 'BREAK' | 'OFFLINE';

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: Role;
  departmentId?: string | null;
  departmentName?: string | null;
  isActive: boolean;
  lastLoginAt?: string | null;
  staffProfile?: {
    id: string;
    staffCode: string;
    shift: Shift;
    currentStatus: StaffStatus;
    assignedCounterId?: string | null;
    serviceType?: string | null;
  } | null;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
}

export const authApi = {
  async register(data: { name: string; email: string; password: string; phone?: string }): Promise<AuthResponse> {
    const res = await api.post<AuthResponse>('/api/auth/register', data);
    setAccessToken(res.data.accessToken);
    return res.data;
  },

  async login(credentials: { email: string; password: string }): Promise<AuthResponse> {
    const res = await api.post<AuthResponse>('/api/auth/login', credentials);
    setAccessToken(res.data.accessToken);
    return res.data;
  },

  async refresh(): Promise<AuthResponse> {
    const res = await api.post<AuthResponse>('/api/auth/refresh');
    setAccessToken(res.data.accessToken);
    return res.data;
  },

  async logout(): Promise<void> {
    try {
      await api.post('/api/auth/logout');
    } finally {
      setAccessToken(null);
    }
  },

  async getMe(): Promise<{ user: User }> {
    const res = await api.get<{ user: User }>('/api/auth/me');
    return res.data;
  },

  async updateMe(data: { name?: string; phone?: string | null }): Promise<{ user: User }> {
    const res = await api.patch<{ user: User }>('/api/auth/me', data);
    return res.data;
  },

  async changePassword(data: { currentPassword: string; newPassword: string }): Promise<{ success: boolean; message: string }> {
    const res = await api.post<{ success: boolean; message: string }>('/api/auth/change-password', data);
    setAccessToken(null); // Force re-login after password change
    return res.data;
  },
};
