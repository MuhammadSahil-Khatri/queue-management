import cron from 'node-cron';
import { pool } from '../db/pool.js';
import { sendNotification } from '../services/notificationService.js';

export function startReminderJob() {
  // Runs every 5 minutes: "*/5 * * * *"
  cron.schedule('*/5 * * * *', async () => {
    try {
      // Find appointments coming up between 15 and 30 minutes from now
      const res = await pool.query(
        `SELECT a.id, a.appointment_number, a.user_id, s.name as service_name,
                sl.date::text as slot_date, sl.start_time::text as slot_start_time
         FROM appointments a
         JOIN services s ON a.service_id = s.id
         JOIN appointment_slots sl ON a.slot_id = sl.id
         WHERE a.status = 'confirmed'
           AND (sl.date + sl.start_time) BETWEEN NOW() AND NOW() + INTERVAL '30 MINUTE'
           AND NOT EXISTS (
             SELECT 1 FROM notifications n 
             WHERE n.user_id = a.user_id 
               AND n.type = 'reminder' 
               AND n.created_at >= NOW() - INTERVAL '2 HOUR'
           )`
      );

      for (const row of res.rows) {
        await sendNotification(
          row.user_id,
          'Upcoming Appointment Reminder',
          `Reminder: Your appointment #${row.appointment_number} for ${row.service_name} starts at ${row.slot_start_time.substring(0, 5)}. Check-in opens 10 minutes before.`,
          'reminder'
        );
      }
    } catch (err) {
      console.error('[ReminderJob] Error sending reminders:', err);
    }
  });

  console.log('⏰ Reminder scheduled job initialized (every 5 minutes)');
}
