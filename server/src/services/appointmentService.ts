import crypto from 'crypto';
import { pool } from '../db/pool.js';
import { validateAppointmentTransition, AppointmentStatus } from '../domain/appointmentStateMachine.js';
import { logActivity } from './activityLogService.js';
import { sendNotification } from './notificationService.js';
import { getEstimatedWaitTime } from './waitTimeService.js';

export interface BookAppointmentInput {
  userId: string;
  serviceId: string;
  slotId: string;
  notes?: string;
}

/**
 * Generate formatted appointment number: APT-YYYYMMDD-XXXX
 */
function generateAppointmentNumber(dateStr: string): string {
  const cleanDate = dateStr.replace(/[^0-9]/g, '').slice(0, 8);
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `APT-${cleanDate}-${randomSuffix}`;
}

export async function bookAppointment(input: BookAppointmentInput) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Lock slot row with SELECT ... FOR UPDATE
    const slotRes = await client.query(
      'SELECT * FROM appointment_slots WHERE id = $1 FOR UPDATE',
      [input.slotId]
    );

    if (slotRes.rows.length === 0) {
      const err: any = new Error('Appointment slot not found');
      err.statusCode = 404;
      throw err;
    }

    const slot = slotRes.rows[0];

    if (!slot.is_active) {
      const err: any = new Error('This appointment slot is inactive');
      err.statusCode = 400;
      throw err;
    }

    // 2. Prevent overbooking: check booked_count < max_capacity
    if (slot.booked_count >= slot.max_capacity) {
      const err: any = new Error('Slot is at maximum capacity. Please choose another time.');
      err.statusCode = 409;
      throw err;
    }

    // 3. Prevent duplicate active appointments for user in the same slot
    const dupRes = await client.query(
      `SELECT id FROM appointments 
       WHERE user_id = $1 AND slot_id = $2 AND status NOT IN ('cancelled', 'missed')`,
      [input.userId, input.slotId]
    );

    if (dupRes.rows.length > 0) {
      const err: any = new Error('You already have an active appointment booked for this time slot');
      err.statusCode = 409;
      throw err;
    }

    // 4. Increment slot booked_count
    await client.query(
      'UPDATE appointment_slots SET booked_count = booked_count + 1, updated_at = NOW() WHERE id = $1',
      [input.slotId]
    );

    // 5. Insert appointment
    const appointmentId = crypto.randomUUID();
    const apptNumber = generateAppointmentNumber(slot.date.toISOString ? slot.date.toISOString() : String(slot.date));

    const insertRes = await client.query(
      `INSERT INTO appointments (id, appointment_number, user_id, service_id, slot_id, status, notes, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, 'confirmed', $6, NOW(), NOW())
       RETURNING *`,
      [appointmentId, apptNumber, input.userId, input.serviceId, input.slotId, input.notes || null]
    );

    await client.query('COMMIT');

    const appointment = insertRes.rows[0];

    // Async background side-effects (logging & notification)
    logActivity('appointment', appointmentId, 'BOOKED', input.userId, {
      appointmentNumber: apptNumber,
      slotId: input.slotId,
      date: slot.date,
    });

    sendNotification(
      input.userId,
      'Appointment Confirmed',
      `Your appointment #${apptNumber} has been successfully confirmed.`,
      'appointment_confirmed'
    );

    return appointment;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function getUserAppointments(userId: string) {
  const res = await pool.query(
    `SELECT 
        a.id, a.appointment_number, a.status, a.check_in_time, a.notes, a.created_at,
        s.id AS service_id, s.name AS service_name, s.code_prefix, s.avg_duration_min,
        d.id AS department_id, d.name AS department_name,
        sl.id AS slot_id, sl.date::text as date, sl.start_time::text, sl.end_time::text,
        t.id AS token_id, t.token_number, t.status AS token_status, t.queue_position, t.estimated_wait_min
     FROM appointments a
     JOIN services s ON a.service_id = s.id
     JOIN departments d ON s.department_id = d.id
     JOIN appointment_slots sl ON a.slot_id = sl.id
     LEFT JOIN tokens t ON t.appointment_id = a.id
     WHERE a.user_id = $1
     ORDER BY sl.date DESC, sl.start_time DESC`,
    [userId]
  );

  return res.rows.map((row) => ({
    id: row.id,
    appointmentNumber: row.appointment_number,
    status: row.status,
    checkInTime: row.check_in_time,
    notes: row.notes,
    createdAt: row.created_at,
    service: {
      id: row.service_id,
      name: row.service_name,
      codePrefix: row.code_prefix,
      avgDurationMin: row.avg_duration_min,
      departmentName: row.department_name,
    },
    slot: {
      id: row.slot_id,
      date: row.date,
      startTime: row.start_time.substring(0, 5),
      endTime: row.end_time.substring(0, 5),
    },
    token: row.token_id
      ? {
          id: row.token_id,
          tokenNumber: row.token_number,
          status: row.token_status,
          queuePosition: row.queue_position,
          estimatedWaitMin: row.estimated_wait_min,
        }
      : null,
  }));
}

export async function cancelAppointment(appointmentId: string, userId: string) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const apptRes = await client.query(
      'SELECT * FROM appointments WHERE id = $1 FOR UPDATE',
      [appointmentId]
    );

    if (apptRes.rows.length === 0) {
      const err: any = new Error('Appointment not found');
      err.statusCode = 404;
      throw err;
    }

    const appt = apptRes.rows[0];

    if (appt.user_id !== userId) {
      const err: any = new Error('Unauthorized to cancel this appointment');
      err.statusCode = 403;
      throw err;
    }

    // State machine check
    validateAppointmentTransition(appt.status as AppointmentStatus, 'cancelled');

    // Update appointment
    await client.query(
      "UPDATE appointments SET status = 'cancelled', updated_at = NOW() WHERE id = $1",
      [appointmentId]
    );

    // Free the slot capacity
    await client.query(
      'UPDATE appointment_slots SET booked_count = GREATEST(0, booked_count - 1), updated_at = NOW() WHERE id = $1',
      [appt.slot_id]
    );

    // Cancel linked token if any
    await client.query(
      "UPDATE tokens SET status = 'cancelled', updated_at = NOW() WHERE appointment_id = $1 AND status IN ('waiting', 'called')",
      [appointmentId]
    );

    await client.query('COMMIT');

    logActivity('appointment', appointmentId, 'CANCELLED', userId, {
      appointmentNumber: appt.appointment_number,
    });

    sendNotification(
      userId,
      'Appointment Cancelled',
      `Your appointment #${appt.appointment_number} has been cancelled.`,
      'cancelled'
    );

    return { message: 'Appointment cancelled successfully' };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function rescheduleAppointment(
  appointmentId: string,
  newSlotId: string,
  userId: string
) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const apptRes = await client.query(
      'SELECT * FROM appointments WHERE id = $1 FOR UPDATE',
      [appointmentId]
    );

    if (apptRes.rows.length === 0) {
      const err: any = new Error('Appointment not found');
      err.statusCode = 404;
      throw err;
    }

    const appt = apptRes.rows[0];

    if (appt.user_id !== userId) {
      const err: any = new Error('Unauthorized to reschedule this appointment');
      err.statusCode = 403;
      throw err;
    }

    validateAppointmentTransition(appt.status as AppointmentStatus, 'rescheduled');

    // Lock new slot
    const newSlotRes = await client.query(
      'SELECT * FROM appointment_slots WHERE id = $1 FOR UPDATE',
      [newSlotId]
    );

    if (newSlotRes.rows.length === 0) {
      const err: any = new Error('Target appointment slot not found');
      err.statusCode = 404;
      throw err;
    }

    const newSlot = newSlotRes.rows[0];

    if (newSlot.booked_count >= newSlot.max_capacity) {
      const err: any = new Error('Target slot is already full');
      err.statusCode = 409;
      throw err;
    }

    // Decrement old slot, increment new slot
    await client.query(
      'UPDATE appointment_slots SET booked_count = GREATEST(0, booked_count - 1), updated_at = NOW() WHERE id = $1',
      [appt.slot_id]
    );

    await client.query(
      'UPDATE appointment_slots SET booked_count = booked_count + 1, updated_at = NOW() WHERE id = $1',
      [newSlotId]
    );

    // Update appointment
    const updateRes = await client.query(
      "UPDATE appointments SET slot_id = $1, status = 'confirmed', updated_at = NOW() WHERE id = $2 RETURNING *",
      [newSlotId, appointmentId]
    );

    await client.query('COMMIT');

    logActivity('appointment', appointmentId, 'RESCHEDULED', userId, {
      fromSlot: appt.slot_id,
      toSlot: newSlotId,
    });

    sendNotification(
      userId,
      'Appointment Rescheduled',
      `Your appointment #${appt.appointment_number} has been rescheduled to ${newSlot.date} at ${newSlot.start_time}.`,
      'rescheduled'
    );

    return updateRes.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function checkInAppointment(appointmentId: string, userId: string) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const apptRes = await client.query(
      `SELECT a.*, s.department_id, s.code_prefix, s.avg_duration_min,
              sl.date::text as slot_date, sl.start_time::text as slot_start_time
       FROM appointments a
       JOIN services s ON a.service_id = s.id
       JOIN appointment_slots sl ON a.slot_id = sl.id
       WHERE a.id = $1 FOR UPDATE`,
      [appointmentId]
    );

    if (apptRes.rows.length === 0) {
      const err: any = new Error('Appointment not found');
      err.statusCode = 404;
      throw err;
    }

    const appt = apptRes.rows[0];

    if (appt.user_id !== userId) {
      const err: any = new Error('Unauthorized to check in for this appointment');
      err.statusCode = 403;
      throw err;
    }

    validateAppointmentTransition(appt.status as AppointmentStatus, 'checked_in');

    // Check-in window validation (read booking_rules.check_in_window_min, default 10)
    const ruleRes = await client.query(
      'SELECT check_in_window_min FROM booking_rules WHERE service_id = $1 OR department_id = $2 ORDER BY created_at DESC LIMIT 1',
      [appt.service_id, appt.department_id]
    );
    const windowMin = ruleRes.rows[0]?.check_in_window_min || 10;

    // Parse appointment start datetime
    const dateStr = appt.slot_date; // YYYY-MM-DD
    const timeStr = appt.slot_start_time.substring(0, 8); // HH:mm:ss
    const apptStart = new Date(`${dateStr}T${timeStr}`);
    const now = new Date();

    const diffMs = now.getTime() - apptStart.getTime();
    const diffMin = diffMs / (1000 * 60);

    // Allowed window: -windowMin <= diffMin <= +windowMin
    if (diffMin < -windowMin) {
      const remainingMin = Math.ceil(-diffMin - windowMin);
      const err: any = new Error(
        `Check-in window is not open yet. Check-in opens ${windowMin} minutes before your appointment time (in ~${remainingMin} minutes).`
      );
      err.statusCode = 400;
      throw err;
    }

    if (diffMin > windowMin) {
      const err: any = new Error(
        `Check-in window has closed. Check-in was required within ${windowMin} minutes of appointment start time.`
      );
      err.statusCode = 400;
      throw err;
    }

    // Update appointment status to checked_in
    await client.query(
      "UPDATE appointments SET status = 'checked_in', check_in_time = NOW(), updated_at = NOW() WHERE id = $1",
      [appointmentId]
    );

    // Atomically increment daily token counter for service
    const counterRes = await client.query(
      `INSERT INTO daily_token_counters (service_id, date, last_number)
       VALUES ($1, CURRENT_DATE, 1)
       ON CONFLICT (service_id, date)
       DO UPDATE SET last_number = daily_token_counters.last_number + 1
       RETURNING last_number`,
      [appt.service_id]
    );
    const tokenSeq = counterRes.rows[0].last_number;
    const tokenNumber = `${appt.code_prefix}-${String(tokenSeq).padStart(3, '0')}`;

    // Queue position and wait time calculation
    const waitingRes = await client.query(
      "SELECT count(*) as count FROM tokens WHERE service_id = $1 AND status = 'waiting'",
      [appt.service_id]
    );
    const peopleAhead = parseInt(waitingRes.rows[0]?.count || '0', 10);
    const estWait = await getEstimatedWaitTime(appt.service_id, peopleAhead);

    // Create high-priority token linked to appointment
    const tokenId = crypto.randomUUID();
    const tokenRes = await client.query(
      `INSERT INTO tokens (
        id, token_number, user_id, service_id, department_id, appointment_id,
        status, priority, queue_position, estimated_wait_min, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, 'waiting', 10, $7, $8, NOW(), NOW())
      RETURNING *`,
      [
        tokenId,
        tokenNumber,
        userId,
        appt.service_id,
        appt.department_id,
        appointmentId,
        peopleAhead + 1,
        estWait,
      ]
    );

    await client.query('COMMIT');

    const token = tokenRes.rows[0];

    logActivity('appointment', appointmentId, 'CHECKED_IN', userId, {
      tokenId: token.id,
      tokenNumber: token.token_number,
    });

    sendNotification(
      userId,
      'Checked In - Token Generated',
      `You are checked in! Your priority token is ${token.token_number}. Current estimated wait: ${estWait} minutes.`,
      'token_generated'
    );

    return {
      appointment: { ...appt, status: 'checked_in', check_in_time: new Date() },
      token: {
        id: token.id,
        tokenNumber: token.token_number,
        queuePosition: peopleAhead + 1,
        peopleAhead,
        estimatedWaitMin: estWait,
        status: token.status,
      },
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
