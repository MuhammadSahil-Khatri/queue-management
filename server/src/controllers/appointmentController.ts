import { Request, Response, NextFunction } from 'express';
import {
  bookAppointment,
  getUserAppointments,
  cancelAppointment,
  rescheduleAppointment,
  checkInAppointment,
} from '../services/appointmentService.js';

export async function book(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const { serviceId, slotId, notes } = req.body;

    const appointment = await bookAppointment({
      userId,
      serviceId,
      slotId,
      notes,
    });

    res.status(201).json(appointment);
  } catch (error) {
    next(error);
  }
}

export async function getMine(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const appointments = await getUserAppointments(userId);
    res.json(appointments);
  } catch (error) {
    next(error);
  }
}

export async function cancel(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const result = await cancelAppointment(id, userId);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function reschedule(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { slotId } = req.body;

    const result = await rescheduleAppointment(id, slotId, userId);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function checkIn(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const result = await checkInAppointment(id, userId);
    res.json(result);
  } catch (error) {
    next(error);
  }
}
