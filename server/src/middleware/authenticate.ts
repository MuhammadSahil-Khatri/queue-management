import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../lib/jwt.js';
import { prisma } from '../lib/prisma.js';
import { AuthResponseUser } from '../types/auth.js';

export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication token is required',
      },
    });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = verifyAccessToken(token);

    // Look up user to ensure they are active and exist
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: {
        department: true,
        staffProfile: true,
      },
    });

    if (!user) {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Account not found',
        },
      });
      return;
    }

    if (!user.isActive) {
      res.status(401).json({
        error: {
          code: 'ACCOUNT_DEACTIVATED',
          message: 'Your account has been deactivated. Please contact an administrator.',
        },
      });
      return;
    }

    const safeUser: AuthResponseUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      departmentId: user.departmentId,
      departmentName: user.department ? user.department.name : null,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      staffProfile: user.staffProfile
        ? {
            id: user.staffProfile.id,
            staffCode: user.staffProfile.staffCode,
            shift: user.staffProfile.shift,
            currentStatus: user.staffProfile.currentStatus,
            assignedCounterId: user.staffProfile.assignedCounterId,
            serviceType: user.staffProfile.serviceType,
          }
        : null,
    };

    req.user = safeUser;
    next();
  } catch (err: any) {
    res.status(401).json({
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid or expired authentication token',
      },
    });
  }
}
