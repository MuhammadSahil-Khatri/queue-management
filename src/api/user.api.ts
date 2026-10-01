import api from './axios.ts';
import { User, Role, Shift, StaffStatus } from './auth.api.ts';
export type { User, Role, Shift, StaffStatus };

export interface Department {
  id: string;
  name: string;
  description?: string | null;
  isActive: boolean;
}

export interface AuditLog {
  id: string;
  actorId?: string | null;
  action: string;
  targetType: string;
  targetId?: string | null;
  metadata?: any;
  createdAt: string;
}

export interface UserListResponse {
  users: User[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const userApi = {
  async listUsers(params?: {
    search?: string;
    role?: Role;
    departmentId?: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
  }): Promise<UserListResponse> {
    const res = await api.get<UserListResponse>('/api/users', { params });
    return res.data;
  },

  async getUser(id: string): Promise<{ user: User }> {
    const res = await api.get<{ user: User }>(`/api/users/${id}`);
    return res.data;
  },

  async createUser(data: {
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
  }): Promise<{ user: User }> {
    const res = await api.post<{ user: User }>('/api/users', data);
    return res.data;
  },

  async updateUser(
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
    }
  ): Promise<{ user: User }> {
    const res = await api.patch<{ user: User }>(`/api/users/${id}`, data);
    return res.data;
  },

  async updateStatus(id: string, isActive: boolean): Promise<{ user: User }> {
    const res = await api.patch<{ user: User }>(`/api/users/${id}/status`, { isActive });
    return res.data;
  },

  async deleteUser(id: string): Promise<{ success: boolean; message: string }> {
    const res = await api.delete<{ success: boolean; message: string }>(`/api/users/${id}`);
    return res.data;
  },

  async listDepartments(): Promise<{ departments: Department[] }> {
    const res = await api.get<{ departments: Department[] }>('/api/users/departments');
    return res.data;
  },

  async listAuditLogs(): Promise<{ logs: AuditLog[] }> {
    const res = await api.get<{ logs: AuditLog[] }>('/api/users/audit-logs');
    return res.data;
  },
};
