import { Router } from 'express';
import { UserController } from '../controllers/user.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';

const router = Router();

// All user management routes require authentication
router.use(authenticate);

// Department list for dropdown selections (accessible to Admin and Manager)
router.get('/departments', authorize('ADMIN', 'MANAGER'), UserController.listDepartments);

// Audit logs (accessible only to Admin)
router.get('/audit-logs', authorize('ADMIN'), UserController.listAuditLogs);

// User CRUD - restricted strictly to ADMIN and MANAGER
router.get('/', authorize('ADMIN', 'MANAGER'), UserController.listUsers);
router.post('/', authorize('ADMIN', 'MANAGER'), UserController.createUser);
router.get('/:id', authorize('ADMIN', 'MANAGER'), UserController.getUser);
router.patch('/:id', authorize('ADMIN', 'MANAGER'), UserController.updateUser);
router.patch('/:id/status', authorize('ADMIN', 'MANAGER'), UserController.updateUserStatus);
router.delete('/:id', authorize('ADMIN'), UserController.deleteUser);

export default router;
