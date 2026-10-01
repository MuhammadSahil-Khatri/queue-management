import { Request, Response, NextFunction } from 'express';
import { Role } from '../types/auth.js';

/**
 * Allows access if the authenticated user is the owner of the resource (matching id/userId param)
 * OR has one of the authorized override roles.
 */
export function ownerOrRole(userIdParamKey = 'id', ...overrideRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
      return;
    }

    const targetUserId = req.params[userIdParamKey];

    // If user is accessing their own record
    if (targetUserId && targetUserId === req.user.id) {
      next();
      return;
    }

    // Otherwise check if user's role is in overrideRoles
    if (overrideRoles.includes(req.user.role)) {
      next();
      return;
    }

    res.status(403).json({
      error: {
        code: 'FORBIDDEN',
        message: 'You can only view or manage your own account records',
      },
    });
  };
}
