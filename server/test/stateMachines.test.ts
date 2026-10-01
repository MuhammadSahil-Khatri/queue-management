import { describe, it, expect } from 'vitest';
import {
  canTransitionAppointment,
  validateAppointmentTransition,
  InvalidStateTransitionError,
} from '../src/domain/appointmentStateMachine.js';
import {
  canTransitionToken,
  validateTokenTransition,
  InvalidTokenTransitionError,
} from '../src/domain/tokenStateMachine.js';

describe('Appointment State Machine', () => {
  it('allows main path transitions: booked -> confirmed -> checked_in -> waiting -> in_service -> completed', () => {
    expect(canTransitionAppointment('booked', 'confirmed')).toBe(true);
    expect(canTransitionAppointment('confirmed', 'checked_in')).toBe(true);
    expect(canTransitionAppointment('checked_in', 'waiting')).toBe(true);
    expect(canTransitionAppointment('waiting', 'in_service')).toBe(true);
    expect(canTransitionAppointment('in_service', 'completed')).toBe(true);
  });

  it('allows side transitions: cancellation, rescheduling, missed, and delayed', () => {
    expect(canTransitionAppointment('booked', 'cancelled')).toBe(true);
    expect(canTransitionAppointment('confirmed', 'cancelled')).toBe(true);
    expect(canTransitionAppointment('confirmed', 'rescheduled')).toBe(true);
    expect(canTransitionAppointment('confirmed', 'missed')).toBe(true);
    expect(canTransitionAppointment('confirmed', 'delayed')).toBe(true);
    expect(canTransitionAppointment('delayed', 'checked_in')).toBe(true);
  });

  it('rejects invalid transitions with InvalidStateTransitionError and status 409', () => {
    // Cannot jump from booked straight to completed
    expect(canTransitionAppointment('booked', 'completed')).toBe(false);
    expect(() => validateAppointmentTransition('booked', 'completed')).toThrow(InvalidStateTransitionError);

    // Completed is terminal
    expect(canTransitionAppointment('completed', 'in_service')).toBe(false);
    expect(() => validateAppointmentTransition('completed', 'in_service')).toThrow(InvalidStateTransitionError);

    // Cancelled is terminal
    expect(canTransitionAppointment('cancelled', 'confirmed')).toBe(false);
    expect(() => validateAppointmentTransition('cancelled', 'confirmed')).toThrow(InvalidStateTransitionError);

    // Verify error has statusCode 409
    try {
      validateAppointmentTransition('completed', 'booked');
    } catch (err: any) {
      expect(err.statusCode).toBe(409);
      expect(err.message).toContain("Cannot transition appointment from status 'completed' to 'booked'");
    }
  });
});

describe('Token State Machine', () => {
  it('allows valid token transitions including recall and skip', () => {
    expect(canTransitionToken('waiting', 'called')).toBe(true);
    expect(canTransitionToken('called', 'in_service')).toBe(true);
    expect(canTransitionToken('called', 'called')).toBe(true); // recall
    expect(canTransitionToken('called', 'skipped')).toBe(true);
    expect(canTransitionToken('skipped', 'waiting')).toBe(true);
    expect(canTransitionToken('in_service', 'completed')).toBe(true);
  });

  it('rejects illegal transitions with 409 InvalidTokenTransitionError', () => {
    expect(canTransitionToken('waiting', 'completed')).toBe(false);
    expect(() => validateTokenTransition('waiting', 'completed')).toThrow(InvalidTokenTransitionError);

    expect(canTransitionToken('completed', 'waiting')).toBe(false);
    expect(() => validateTokenTransition('completed', 'waiting')).toThrow(InvalidTokenTransitionError);

    try {
      validateTokenTransition('completed', 'called');
    } catch (err: any) {
      expect(err.statusCode).toBe(409);
    }
  });
});
