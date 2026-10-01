export type AppointmentStatus =
  | 'booked'
  | 'confirmed'
  | 'checked_in'
  | 'waiting'
  | 'in_service'
  | 'completed'
  | 'cancelled'
  | 'missed'
  | 'rescheduled'
  | 'delayed';

export class InvalidStateTransitionError extends Error {
  statusCode = 409;
  constructor(public currentStatus: string, public nextStatus: string) {
    super(`Cannot transition appointment from status '${currentStatus}' to '${nextStatus}'.`);
    this.name = 'InvalidStateTransitionError';
  }
}

const ALLOWED_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  booked: ['confirmed', 'cancelled', 'rescheduled', 'missed'],
  confirmed: ['checked_in', 'cancelled', 'rescheduled', 'missed', 'delayed'],
  delayed: ['checked_in', 'cancelled', 'missed', 'rescheduled'],
  checked_in: ['waiting', 'in_service', 'cancelled'],
  waiting: ['in_service', 'missed', 'cancelled'],
  in_service: ['completed'],
  completed: [],
  cancelled: [],
  missed: [],
  rescheduled: [],
};

export function canTransitionAppointment(from: AppointmentStatus, to: AppointmentStatus): boolean {
  if (from === to) return true;
  const allowed = ALLOWED_TRANSITIONS[from];
  return allowed ? allowed.includes(to) : false;
}

export function validateAppointmentTransition(from: AppointmentStatus, to: AppointmentStatus): void {
  if (!canTransitionAppointment(from, to)) {
    throw new InvalidStateTransitionError(from, to);
  }
}
