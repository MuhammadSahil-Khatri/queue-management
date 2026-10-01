import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { getPublicQueue, callNext, updateStatus } from '../controllers/queueController.js';

const router = Router();

const updateStatusSchema = z.object({
  status: z.enum(['called', 'in_service', 'completed', 'skipped', 'missed', 'cancelled']),
});

// Public queue stats
router.get('/:serviceId', getPublicQueue);

// Staff counter actions
router.post('/counters/:id/call-next', authenticate, requireRole('STAFF', 'MANAGER', 'ADMIN'), callNext);
router.patch('/tokens/:id/status', authenticate, requireRole('STAFF', 'MANAGER', 'ADMIN'), validate(updateStatusSchema), updateStatus);

export default router;
