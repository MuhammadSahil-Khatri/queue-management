import { Request, Response, NextFunction } from 'express';
import { Role } from '../types/auth.js';
import { PermissionAction, hasPermission } from './permissions.js';

/**
 * Checks if the authenticated user has one of the allowed roles
 */
export function authorize(...allowedRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: `Access denied. Requires one of roles: [${allowedRoles.join(', ')}]`,
        },
      });
      return;
    }

    next();
  };
}

/**
 * Reusable permission check middleware based on the centralized permission matrix
 */
export function authorizePermission(action: PermissionAction) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
      return;
    }

    if (!hasPermission(req.user.role, action)) {
      res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: `Access denied. Your role (${req.user.role}) lacks permission: ${action}`,
        },
      });
      return;
    }

    next();
  };
}
