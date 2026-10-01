import { Request, Response, NextFunction } from 'express';
import { getSlotsByDate, getAvailableDates, ensureSlotsForService } from '../services/slotService.js';

export async function getServiceSlots(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const date = req.query.date as string;

    if (!date) {
      res.status(400).json({ error: { code: 'MISSING_DATE', message: 'Query parameter date=YYYY-MM-DD is required' } });
      return;
    }

    // Ensure slots exist for that day
    await ensureSlotsForService(id, 7);

    const slots = await getSlotsByDate(id, date);
    res.json(slots);
  } catch (error) {
    next(error);
  }
}

export async function getServiceAvailableDates(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    // Ensure slots exist
    await ensureSlotsForService(id, 7);

    const dates = await getAvailableDates(id);
    res.json(dates);
  } catch (error) {
    next(error);
  }
}
