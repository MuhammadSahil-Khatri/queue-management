import { Request, Response, NextFunction } from 'express';
import { getPublicQueueState, callNextToken, updateTokenStatus } from '../services/queueService.js';
import { TokenStatus } from '../domain/tokenStateMachine.js';

export async function getPublicQueue(req: Request, res: Response, next: NextFunction) {
  try {
    const { serviceId } = req.params;
    const result = await getPublicQueueState(serviceId);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function callNext(req: Request, res: Response, next: NextFunction) {
  try {
    const staffId = req.user!.id;
    const { id: counterId } = req.params;

    const result = await callNextToken(counterId, staffId);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function updateStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const staffId = req.user!.id;
    const { id: tokenId } = req.params;
    const { status } = req.body;

    const result = await updateTokenStatus(tokenId, status as TokenStatus, staffId);
    res.json(result);
  } catch (error) {
    next(error);
  }
}
