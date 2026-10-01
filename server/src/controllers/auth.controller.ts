import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service.js';
import {
  registerSchema,
  loginSchema,
  updateMeSchema,
  changePasswordSchema,
} from '../validators/auth.schema.js';

const REFRESH_COOKIE_NAME = 'refreshToken';
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days in ms

function setRefreshTokenCookie(res: Response, token: string): void {
  res.cookie(REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  });
}

function clearRefreshTokenCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });
}

export class AuthController {
  static async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = registerSchema.parse(req.body);
      const userAgent = req.headers['user-agent'];
      const ip = req.ip || req.socket.remoteAddress;

      const { user, tokens } = await AuthService.register(validated, { userAgent, ip });

      setRefreshTokenCookie(res, tokens.refreshToken);

      res.status(201).json({
        user,
        accessToken: tokens.accessToken,
      });
    } catch (err) {
      next(err);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = loginSchema.parse(req.body);
      const userAgent = req.headers['user-agent'];
      const ip = req.ip || req.socket.remoteAddress;

      const { user, tokens } = await AuthService.login(
        validated.email,
        validated.password,
        { userAgent, ip }
      );

      setRefreshTokenCookie(res, tokens.refreshToken);

      res.status(200).json({
        user,
        accessToken: tokens.accessToken,
      });
    } catch (err) {
      next(err);
    }
  }

  static async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Look for refresh token in cookie or fallback to header/body
      const rawRefreshToken = req.cookies?.[REFRESH_COOKIE_NAME] || req.body?.refreshToken;

      if (!rawRefreshToken) {
        res.status(401).json({
          error: {
            code: 'NO_REFRESH_TOKEN',
            message: 'Refresh token cookie is missing',
          },
        });
        return;
      }

      const userAgent = req.headers['user-agent'];
      const ip = req.ip || req.socket.remoteAddress;

      const { accessToken, newRefreshToken, user } = await AuthService.refresh(
        rawRefreshToken,
        { userAgent, ip }
      );

      setRefreshTokenCookie(res, newRefreshToken);

      res.status(200).json({
        accessToken,
        user,
      });
    } catch (err) {
      clearRefreshTokenCookie(res);
      next(err);
    }
  }

  static async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rawRefreshToken = req.cookies?.[REFRESH_COOKIE_NAME] || req.body?.refreshToken;
      const actorId = req.user?.id;

      await AuthService.logout(rawRefreshToken, actorId);
      clearRefreshTokenCookie(res);

      res.status(200).json({
        success: true,
        message: 'Successfully logged out',
      });
    } catch (err) {
      next(err);
    }
  }

  static async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await AuthService.getMe(req.user!.id);
      res.status(200).json({ user });
    } catch (err) {
      next(err);
    }
  }

  static async updateMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = updateMeSchema.parse(req.body);
      const user = await AuthService.updateMe(req.user!.id, validated);
      res.status(200).json({ user });
    } catch (err) {
      next(err);
    }
  }

  static async changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = changePasswordSchema.parse(req.body);
      await AuthService.changePassword(
        req.user!.id,
        validated.currentPassword,
        validated.newPassword
      );
      clearRefreshTokenCookie(res);

      res.status(200).json({
        success: true,
        message: 'Password changed successfully. Please log in again with your new password.',
      });
    } catch (err) {
      next(err);
    }
  }
}
