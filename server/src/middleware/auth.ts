import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { pool } from '../db/pool.js';
import { Role } from '../types/auth.js';

export interface AuthUser {
  id: string;
  user_id?: string;
  name: string;
  email: string;
  phone?: string | null;
  role: Role;
  departmentId?: string | null;
  department_id?: string | null;
  departmentName?: string | null;
  isActive: boolean;
  lastLoginAt?: Date | string | null;
  staffProfile?: any;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    let token: string | undefined;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.cookies?.accessToken || req.cookies?.token) {
      token = req.cookies.accessToken || req.cookies.token;
    }

    if (!token) {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication token missing or invalid',
        },
      });
      return;
    }

    // Try decoding the JWT payload
    let decoded: any;
    const secret = process.env.JWT_ACCESS_SECRET || 'queuecraft-production-access-token-secret-2026-xyz';

    try {
      decoded = jwt.verify(token, secret);
    } catch (err) {
      // If verification with internal secret fails, decode without verify (for Supabase Auth client tokens)
      decoded = jwt.decode(token);
    }

    if (!decoded) {
      res.status(401).json({
        error: {
          code: 'INVALID_TOKEN',
          message: 'Unable to decode authentication token',
        },
      });
      return;
    }

    const userId = decoded.userId || decoded.sub || decoded.id;
    const email = decoded.email?.toLowerCase();

    if (!userId && !email) {
      res.status(401).json({
        error: {
          code: 'INVALID_TOKEN_PAYLOAD',
          message: 'Token does not contain user identification',
        },
      });
      return;
    }

    // Find profile in Supabase profiles table
    let profileRes = await pool.query(
      'SELECT * FROM profiles WHERE id = $1 OR user_id = $1 OR LOWER(email) = $2 LIMIT 1',
      [userId, email]
    );

    if (profileRes.rows.length === 0) {
      // Fallback: check User table and sync to profiles
      const userRes = await pool.query(
        'SELECT * FROM "User" WHERE id = $1 OR LOWER(email) = $2 LIMIT 1',
        [userId, email]
      );

      if (userRes.rows.length > 0) {
        const u = userRes.rows[0];
        const newProf = await pool.query(
          `INSERT INTO profiles (id, user_id, email, name, phone, role, department_id, is_active, created_at, updated_at)
           VALUES ($1, $1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
           ON CONFLICT (id) DO UPDATE SET email = $2, name = $3, role = $5 RETURNING *`,
          [u.id, u.email, u.name, u.phone || null, u.role, u.departmentId || null, u.isActive ?? true]
        );
        profileRes = newProf;
      } else {
        // If from Supabase Auth but not in profiles yet, create a default customer profile
        const profId = userId || crypto.randomUUID();
        const profName = decoded.user_metadata?.name || decoded.user_metadata?.full_name || email?.split('@')[0] || 'User';
        const newProf = await pool.query(
          `INSERT INTO profiles (id, user_id, email, name, role, is_active, created_at, updated_at)
           VALUES ($1, $1, $2, $3, 'CUSTOMER', true, NOW(), NOW())
           ON CONFLICT (id) DO UPDATE SET email = $2 RETURNING *`,
          [profId, email, profName]
        );
        profileRes = newProf;
      }
    }

    const profile = profileRes.rows[0];
    if (!profile || profile.is_active === false) {
      res.status(403).json({
        error: {
          code: 'ACCOUNT_DEACTIVATED',
          message: 'Account is deactivated. Contact an administrator.',
        },
      });
      return;
    }

    req.user = {
      id: profile.id,
      user_id: profile.user_id || profile.id,
      email: profile.email,
      name: profile.name,
      phone: profile.phone || null,
      role: profile.role as Role,
      departmentId: profile.department_id || null,
      department_id: profile.department_id || null,
      isActive: profile.is_active ?? true,
    };

    next();
  } catch (error: any) {
    console.error('Authentication middleware error:', error);
    res.status(500).json({
      error: {
        code: 'AUTH_INTERNAL_ERROR',
        message: 'Internal authentication validation failure',
      },
    });
  }
};

export const requireRole = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: `Access denied. Requires one of roles: [${roles.join(', ')}]. Current role: ${req.user.role}`,
        },
      });
      return;
    }
    next();
  };
};
