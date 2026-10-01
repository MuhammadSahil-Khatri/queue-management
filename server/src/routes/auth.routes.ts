import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { loginLimiter, registerLimiter, refreshLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// Public auth endpoints
router.post('/register', registerLimiter, AuthController.register);
router.post('/login', loginLimiter, AuthController.login);
router.post('/refresh', refreshLimiter, AuthController.refresh);
router.post('/logout', AuthController.logout);

// Protected auth endpoints
router.get('/me', authenticate, AuthController.getMe);
router.patch('/me', authenticate, AuthController.updateMe);
router.post('/change-password', authenticate, AuthController.changePassword);

export default router;
