import { pool } from '../db/pool.js';
import crypto from 'crypto';

export interface SlotDTO {
  id: string;
  service_id: string;
  date: string;
  start_time: string;
  end_time: string;
  max_capacity: number;
  booked_count: number;
  remaining_capacity: number;
  status: 'Available' | 'Full';
}

/**
 * Returns distinct dates with at least one available slot for the service
 */
export async function getAvailableDates(serviceId: string): Promise<string[]> {
  const res = await pool.query(
    `SELECT DISTINCT date::text as date_str
     FROM appointment_slots
     WHERE service_id = $1
       AND is_active = true
       AND date >= CURRENT_DATE
       AND booked_count < max_capacity
     ORDER BY date_str ASC`,
    [serviceId]
  );

  return res.rows.map((r) => r.date_str);
}

/**
 * Returns all slots for a given service and date with capacity and status
 */
export async function getSlotsByDate(serviceId: string, date: string): Promise<SlotDTO[]> {
  const res = await pool.query(
    `SELECT id, service_id, date::text as date, start_time::text, end_time::text, 
            max_capacity, booked_count, is_active
     FROM appointment_slots
     WHERE service_id = $1
       AND date = $2
       AND is_active = true
     ORDER BY start_time ASC`,
    [serviceId, date]
  );

  return res.rows.map((row) => {
    const remaining = Math.max(0, row.max_capacity - row.booked_count);
    return {
      id: row.id,
      service_id: row.service_id,
      date: row.date,
      start_time: row.start_time.substring(0, 5),
      end_time: row.end_time.substring(0, 5),
      max_capacity: row.max_capacity,
      booked_count: row.booked_count,
      remaining_capacity: remaining,
      status: remaining > 0 ? 'Available' : 'Full',
    };
  });
}

/**
 * Utility to ensure slots exist for the next N days for a service (batch optimized)
 */
export async function ensureSlotsForService(serviceId: string, daysAhead: number = 7): Promise<void> {
  const times = [
    { start: '09:00:00', end: '09:30:00' },
    { start: '09:30:00', end: '10:00:00' },
    { start: '10:00:00', end: '10:30:00' },
    { start: '10:30:00', end: '11:00:00' },
    { start: '11:00:00', end: '11:30:00' },
    { start: '11:30:00', end: '12:00:00' },
    { start: '13:00:00', end: '13:30:00' },
    { start: '13:30:00', end: '14:00:00' },
    { start: '14:00:00', end: '14:30:00' },
    { start: '14:30:00', end: '15:00:00' },
    { start: '15:00:00', end: '15:30:00' },
    { start: '15:30:00', end: '16:00:00' },
  ];

  const values: string[] = [];
  const params: any[] = [];
  let pIdx = 1;

  for (let i = 0; i < daysAhead; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];

    for (const t of times) {
      const id = crypto.randomUUID();
      values.push(`($${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, 6, 0, true)`);
      params.push(id, serviceId, dateStr, t.start, t.end);
    }
  }

  if (values.length > 0) {
    const query = `
      INSERT INTO appointment_slots (id, service_id, date, start_time, end_time, max_capacity, booked_count, is_active)
      VALUES ${values.join(', ')}
      ON CONFLICT (service_id, date, start_time) DO NOTHING
    `;
    await pool.query(query, params);
  }
}
