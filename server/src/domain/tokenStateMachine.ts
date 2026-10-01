export type TokenStatus =
  | 'waiting'
  | 'called'
  | 'in_service'
  | 'completed'
  | 'skipped'
  | 'missed'
  | 'cancelled';

export class InvalidTokenTransitionError extends Error {
  statusCode = 409;
  constructor(public currentStatus: string, public nextStatus: string) {
    super(`Cannot transition token from status '${currentStatus}' to '${nextStatus}'.`);
    this.name = 'InvalidTokenTransitionError';
  }
}

const ALLOWED_TOKEN_TRANSITIONS: Record<TokenStatus, TokenStatus[]> = {
  waiting: ['called', 'cancelled'],
  called: ['in_service', 'skipped', 'missed', 'called'], // can recall
  skipped: ['waiting', 'called', 'missed', 'cancelled'],
  in_service: ['completed'],
  completed: [],
  missed: [],
  cancelled: [],
};

export function canTransitionToken(from: TokenStatus, to: TokenStatus): boolean {
  if (from === to) return true;
  const allowed = ALLOWED_TOKEN_TRANSITIONS[from];
  return allowed ? allowed.includes(to) : false;
}

export function validateTokenTransition(from: TokenStatus, to: TokenStatus): void {
  if (!canTransitionToken(from, to)) {
    throw new InvalidTokenTransitionError(from, to);
  }
}
