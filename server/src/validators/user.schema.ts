import { z } from 'zod';
import { passwordSchema } from './auth.schema.js';

export const createUserSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters'),
  email: z.string().trim().email('Invalid email address').toLowerCase(),
  phone: z.string().trim().optional(),
  password: passwordSchema,
  role: z.enum(['CUSTOMER', 'STAFF', 'MANAGER', 'ADMIN']),
  departmentId: z.string().uuid().or(z.string().min(1)).optional().nullable(),
  // StaffProfile fields (optional for STAFF/MANAGER creation)
  staffCode: z.string().trim().optional(),
  shift: z.enum(['MORNING', 'EVENING', 'FULL_DAY']).optional(),
  serviceType: z.string().trim().optional(),
  assignedCounterId: z.string().trim().optional(),
}).refine((data) => {
  if (data.role === 'STAFF' || data.role === 'MANAGER') {
    return !!data.departmentId;
  }
  return true;
}, {
  message: 'Department is required for STAFF and MANAGER roles',
  path: ['departmentId'],
});

export const createStaffByManagerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters'),
  email: z.string().trim().email('Invalid email address').toLowerCase(),
  phone: z.string().trim().optional(),
  password: passwordSchema,
  // Role is implicitly STAFF
  staffCode: z.string().trim().optional(),
  shift: z.enum(['MORNING', 'EVENING', 'FULL_DAY']).default('FULL_DAY'),
  serviceType: z.string().trim().optional(),
  assignedCounterId: z.string().trim().optional(),
});

export const updateUserSchema = z.object({
  name: z.string().trim().min(2).optional(),
  email: z.string().trim().email().toLowerCase().optional(),
  phone: z.string().trim().nullable().optional(),
  role: z.enum(['CUSTOMER', 'STAFF', 'MANAGER', 'ADMIN']).optional(),
  departmentId: z.string().optional().nullable(),
  shift: z.enum(['MORNING', 'EVENING', 'FULL_DAY']).optional(),
  serviceType: z.string().trim().optional().nullable(),
  assignedCounterId: z.string().trim().optional().nullable(),
  currentStatus: z.enum(['AVAILABLE', 'BUSY', 'BREAK', 'OFFLINE']).optional(),
});

export const updateUserStatusSchema = z.object({
  isActive: z.boolean(),
});
