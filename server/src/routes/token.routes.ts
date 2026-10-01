import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { generateWalkIn, getActive } from '../controllers/tokenController.js';

const router = Router();

const walkInSchema = z.object({
  serviceId: z.string().min(1, 'Service ID is required'),
});

// Walk-in can be called with or without auth (if token present, attaches user)
router.post('/walk-in', (req, res, next) => {
  if (req.headers.authorization || req.cookies?.accessToken || req.cookies?.token) {
    return authenticate(req, res, next);
  }
  next();
}, validate(walkInSchema), generateWalkIn);

router.get('/me/active', authenticate, getActive);

export default router;
