import crypto from 'crypto';
import { pool } from '../db/pool.js';

export type NotificationType =
  | 'appointment_confirmed'
  | 'reminder'
  | 'rescheduled'
  | 'cancelled'
  | 'token_generated'
  | 'check_in_due';

export async function sendNotification(
  userId: string,
  title: string,
  message: string,
  type: NotificationType
): Promise<void> {
  try {
    const id = crypto.randomUUID();
    await pool.query(
      `INSERT INTO notifications (id, user_id, title, message, type, read, created_at)
       VALUES ($1, $2, $3, $4, $5, false, NOW())`,
      [id, userId, title, message, type]
    );
  } catch (err) {
    console.error('Failed to create in-app notification:', err);
  }
}
