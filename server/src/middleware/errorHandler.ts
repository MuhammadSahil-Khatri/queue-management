import { Request, Response, NextFunction } from 'express';
import { InvalidStateTransitionError } from '../domain/appointmentStateMachine.js';
import { InvalidTokenTransitionError } from '../domain/tokenStateMachine.js';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (err instanceof InvalidStateTransitionError || err instanceof InvalidTokenTransitionError) {
    res.status(409).json({
      error: {
        code: 'CONFLICT_STATE_TRANSITION',
        message: err.message,
      },
    });
    return;
  }

  const statusCode = err.statusCode || (err.status >= 400 && err.status < 600 ? err.status : 500);
  const errorCode = err.code || (statusCode === 409 ? 'CONFLICT' : statusCode === 404 ? 'NOT_FOUND' : 'INTERNAL_ERROR');

  if (statusCode === 500) {
    console.error('Unhandled server error:', err);
  }

  res.status(statusCode).json({
    error: {
      code: errorCode,
      message: err.message || 'Internal server error occurred',
      ...(process.env.NODE_ENV !== 'production' && err.details ? { details: err.details } : {}),
    },
  });
};
