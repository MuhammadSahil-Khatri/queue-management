import crypto from 'crypto';
import { pool } from '../db/pool.js';

export async function logActivity(
  entityType: 'appointment' | 'token' | 'slot' | 'counter',
  entityId: string,
  action: string,
  actorId?: string | null,
  details?: Record<string, any>
): Promise<void> {
  try {
    const id = crypto.randomUUID();
    await pool.query(
      `INSERT INTO activity_logs (id, entity_type, entity_id, action, actor_id, details, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [id, entityType, entityId, action, actorId || null, JSON.stringify(details || {})]
    );
  } catch (err) {
    console.error('Failed to write activity log:', err);
  }
}
