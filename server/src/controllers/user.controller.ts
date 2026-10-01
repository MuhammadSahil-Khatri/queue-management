import { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/user.service.js';
import {
  createUserSchema,
  updateUserSchema,
  updateUserStatusSchema,
} from '../validators/user.schema.js';
import { prisma } from '../lib/prisma.js';

export class UserController {
  static async listUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters = {
        search: typeof req.query.search === 'string' ? req.query.search : undefined,
        role: typeof req.query.role === 'string' ? (req.query.role as any) : undefined,
        departmentId: typeof req.query.departmentId === 'string' ? req.query.departmentId : undefined,
        isActive:
          req.query.isActive !== undefined
            ? req.query.isActive === 'true'
              ? true
              : req.query.isActive === 'false'
              ? false
              : undefined
            : undefined,
        page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 10,
      };

      const result = await UserService.listUsers(filters, req.user!);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  static async getUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await UserService.getUserById(req.params.id, req.user!);
      res.status(200).json({ user });
    } catch (err) {
      next(err);
    }
  }

  static async createUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = createUserSchema.parse(req.body);
      const user = await UserService.createUser(validated as any, req.user!);
      res.status(201).json({ user });
    } catch (err) {
      next(err);
    }
  }

  static async updateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = updateUserSchema.parse(req.body);
      const user = await UserService.updateUser(req.params.id, validated as any, req.user!);
      res.status(200).json({ user });
    } catch (err) {
      next(err);
    }
  }

  static async updateUserStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = updateUserStatusSchema.parse(req.body);
      const user = await UserService.updateUserStatus(req.params.id, validated.isActive, req.user!);
      res.status(200).json({ user });
    } catch (err) {
      next(err);
    }
  }

  static async deleteUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await UserService.deleteUser(req.params.id, req.user!);
      res.status(200).json({
        success: true,
        message: 'User removed successfully',
      });
    } catch (err) {
      next(err);
    }
  }

  static async listDepartments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const departments = await prisma.department.findMany({
        where: { isActive: true },
      });
      res.status(200).json({ departments });
    } catch (err) {
      next(err);
    }
  }

  static async listAuditLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (req.user?.role !== 'ADMIN') {
        res.status(403).json({
          error: { code: 'FORBIDDEN', message: 'Only Administrators can view audit logs' },
        });
        return;
      }
      const logs = await prisma.auditLog.findMany({ take: 50 });
      res.status(200).json({ logs });
    } catch (err) {
      next(err);
    }
  }
}
