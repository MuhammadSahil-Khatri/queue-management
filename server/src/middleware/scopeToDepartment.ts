import { Request, Response, NextFunction } from 'express';

/**
 * Ensures MANAGER and STAFF can only interact with resources in their own assigned department.
 * ADMIN has organization-wide access and bypasses this check.
 */
export function scopeToDepartment(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const user = req.user;
  if (!user) {
    res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
    });
    return;
  }

  // Admins bypass department boundaries
  if (user.role === 'ADMIN') {
    next();
    return;
  }

  // For MANAGER and STAFF, departmentId must be assigned
  if (!user.departmentId) {
    res.status(403).json({
      error: {
        code: 'NO_DEPARTMENT_ASSIGNED',
        message: 'Staff/Manager user does not have an assigned department',
      },
    });
    return;
  }

  // If a departmentId is explicitly specified in params, body, or query, enforce match
  const requestedDeptId =
    req.params.departmentId || req.body.departmentId || (req.query.departmentId as string | undefined);

  if (requestedDeptId && requestedDeptId !== user.departmentId) {
    res.status(403).json({
      error: {
        code: 'DEPARTMENT_MISMATCH',
        message: 'You are not authorized to view or manage resources outside your assigned department',
      },
    });
    return;
  }

  // Automatically enforce departmentId filter in query or body for the controller
  if (req.method === 'GET' && !req.query.departmentId) {
    req.query.departmentId = user.departmentId;
  }

  next();
}
