import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  book,
  getMine,
  cancel,
  reschedule,
  checkIn,
} from '../controllers/appointmentController.js';

const router = Router();

const bookSchema = z.object({
  serviceId: z.string().min(1, 'Service ID is required'),
  slotId: z.string().min(1, 'Slot ID is required'),
  notes: z.string().max(500).optional(),
});

const rescheduleSchema = z.object({
  slotId: z.string().min(1, 'New Slot ID is required'),
});

router.use(authenticate);

router.post('/', validate(bookSchema), book);
router.get('/me', getMine);
router.patch('/:id/cancel', cancel);
router.patch('/:id/reschedule', validate(rescheduleSchema), reschedule);
router.post('/:id/check-in', checkIn);

export default router;
