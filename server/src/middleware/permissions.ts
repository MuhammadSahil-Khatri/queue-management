import { Role } from '../types/auth.js';

export type PermissionAction =
  // Auth & Profile
  | 'auth:self_register'
  | 'auth:login'
  | 'profile:read_own'
  | 'profile:update_own'
  | 'profile:change_password'

  // User Management
  | 'users:list_all'
  | 'users:create_any'
  | 'users:update_any'
  | 'users:deactivate_any'
  | 'users:delete_any'

  // Department-Scoped Staff Management
  | 'staff:list_department'
  | 'staff:create_department'
  | 'staff:update_department'
  | 'staff:deactivate_department'

  // Department Management
  | 'departments:manage'
  | 'departments:view'

  // Tokens & Queue (Chunk 4+)
  | 'queue:view_own_token'
  | 'queue:book_token'
  | 'queue:view_department_waitlist'
  | 'queue:call_next'
  | 'queue:start_service'
  | 'queue:complete_service'
  | 'queue:skip_token'
  | 'queue:recall_token'

  // Services & Counters (Chunk 3+)
  | 'counters:manage_department'
  | 'services:manage_department'
  | 'services:manage_all'

  // Analytics & Logs (Chunk 5+)
  | 'analytics:view_department'
  | 'analytics:view_organization'
  | 'audit:view_logs';

/**
 * Single source of truth for Role -> Allowed Permissions matrix
 */
export const ROLE_PERMISSIONS: Record<Role, readonly PermissionAction[]> = {
  CUSTOMER: [
    'auth:self_register',
    'auth:login',
    'profile:read_own',
    'profile:update_own',
    'profile:change_password',
    'queue:view_own_token',
    'queue:book_token',
  ],

  STAFF: [
    'auth:login',
    'profile:read_own',
    'profile:update_own',
    'profile:change_password',
    'departments:view',
    'queue:view_department_waitlist',
    'queue:call_next',
    'queue:start_service',
    'queue:complete_service',
    'queue:skip_token',
    'queue:recall_token',
  ],

  MANAGER: [
    'auth:login',
    'profile:read_own',
    'profile:update_own',
    'profile:change_password',
    'departments:view',
    'staff:list_department',
    'staff:create_department',
    'staff:update_department',
    'staff:deactivate_department',
    'counters:manage_department',
    'services:manage_department',
    'queue:view_department_waitlist',
    'analytics:view_department',
  ],

  ADMIN: [
    'auth:login',
    'profile:read_own',
    'profile:update_own',
    'profile:change_password',
    'users:list_all',
    'users:create_any',
    'users:update_any',
    'users:deactivate_any',
    'users:delete_any',
    'staff:list_department',
    'staff:create_department',
    'staff:update_department',
    'staff:deactivate_department',
    'departments:manage',
    'departments:view',
    'counters:manage_department',
    'services:manage_department',
    'services:manage_all',
    'queue:view_department_waitlist',
    'analytics:view_department',
    'analytics:view_organization',
    'audit:view_logs',
  ],
};

/**
 * Checks whether a given role has a specific permission
 */
export function hasPermission(role: Role, action: PermissionAction): boolean {
  const permissions = ROLE_PERMISSIONS[role];
  return permissions ? permissions.includes(action) : false;
}
