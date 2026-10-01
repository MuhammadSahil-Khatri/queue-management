import { Request, Response, NextFunction } from 'express';
import { generateWalkInToken, getActiveTokenForUser } from '../services/tokenService.js';

export async function generateWalkIn(req: Request, res: Response, next: NextFunction) {
  try {
    const { serviceId } = req.body;
    const userId = req.user ? req.user.id : null;

    const result = await generateWalkInToken(serviceId, userId);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

export async function getActive(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const result = await getActiveTokenForUser(userId);
    res.json(result);
  } catch (error) {
    next(error);
  }
}
