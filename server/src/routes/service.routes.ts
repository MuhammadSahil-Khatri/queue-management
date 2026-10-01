import { Router } from 'express';
import { getServiceSlots, getServiceAvailableDates } from '../controllers/slotController.js';

const router = Router();

router.get('/:id/available-dates', getServiceAvailableDates);
router.get('/:id/slots', getServiceSlots);

export default router;
