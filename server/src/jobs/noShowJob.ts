import cron from 'node-cron';
import { pool } from '../db/pool.js';
import { logActivity } from '../services/activityLogService.js';
import { sendNotification } from '../services/notificationService.js';

export function startNoShowJob() {
  // Runs every minute: "* * * * *"
  cron.schedule('* * * * *', async () => {
    try {
      // Find appointments that passed check-in window without checking in
      const res = await pool.query(
        `SELECT a.id, a.appointment_number, a.user_id, a.slot_id,
                sl.date::text as slot_date, sl.start_time::text as slot_start_time,
                COALESCE(br.check_in_window_min, 10) as window_min
         FROM appointments a
         JOIN appointment_slots sl ON a.slot_id = sl.id
         LEFT JOIN booking_rules br ON br.service_id = a.service_id
         WHERE a.status IN ('booked', 'confirmed')
           AND (sl.date + sl.start_time + (COALESCE(br.check_in_window_min, 10) || ' minutes')::interval) < NOW()`
      );

      if (res.rows.length === 0) return;

      console.log(`[NoShowJob] Processing ${res.rows.length} missed appointments...`);

      for (const row of res.rows) {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');

          // Mark appointment missed
          await client.query(
            "UPDATE appointments SET status = 'missed', updated_at = NOW() WHERE id = $1 AND status IN ('booked', 'confirmed')",
            [row.id]
          );

          // Release slot capacity where appropriate
          await client.query(
            'UPDATE appointment_slots SET booked_count = GREATEST(0, booked_count - 1), updated_at = NOW() WHERE id = $1',
            [row.slot_id]
          );

          await client.query('COMMIT');

          logActivity('appointment', row.id, 'AUTO_MARKED_MISSED', 'SYSTEM_JOB', {
            appointmentNumber: row.appointment_number,
          });

          sendNotification(
            row.user_id,
            'Appointment Marked as Missed',
            `Your appointment #${row.appointment_number} was marked as missed because the check-in window expired.`,
            'cancelled'
          );
        } catch (err) {
          await client.query('ROLLBACK');
          console.error(`[NoShowJob] Error processing appointment ${row.id}:`, err);
        } finally {
          client.release();
        }
      }
    } catch (err) {
      console.error('[NoShowJob] Error checking missed appointments:', err);
    }
  });

  console.log('⏰ No-Show appointment scheduled job initialized (every minute)');
}
