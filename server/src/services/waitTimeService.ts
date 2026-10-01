import { pool } from '../db/pool.js';

export interface WaitTimeParams {
  peopleAhead: number;
  avgServiceDuration: number;
  activeCounters: number;
}

/**
 * Pure calculation function for unit tests and instant recalculation
 */
export function calculateWaitTimeMinutes({
  peopleAhead,
  avgServiceDuration,
  activeCounters,
}: WaitTimeParams): number {
  if (peopleAhead <= 0) return 0;
  const counters = Math.max(1, activeCounters);
  const duration = Math.max(1, avgServiceDuration);
  return Math.ceil((peopleAhead * duration) / counters);
}

/**
 * Database-backed wait time calculation using rolling average and active counter links
 */
export async function getEstimatedWaitTime(serviceId: string, peopleAhead: number): Promise<number> {
  if (peopleAhead <= 0) return 0;

  // 1. Fetch fallback duration from service
  const serviceRes = await pool.query(
    'SELECT avg_duration_min FROM services WHERE id = $1',
    [serviceId]
  );
  const fallbackDuration = serviceRes.rows[0]?.avg_duration_min || 15;

  // 2. Compute rolling average duration of the last 20 completed tokens for this service
  const rollingRes = await pool.query(
    `SELECT EXTRACT(EPOCH FROM (completed_at - started_at)) / 60.0 AS duration_min
     FROM tokens
     WHERE service_id = $1 
       AND status = 'completed'
       AND completed_at IS NOT NULL
       AND started_at IS NOT NULL
     ORDER BY completed_at DESC
     LIMIT 20`,
    [serviceId]
  );

  let avgDuration = fallbackDuration;
  if (rollingRes.rows.length > 0) {
    const validDurations = rollingRes.rows
      .map((r) => parseFloat(r.duration_min))
      .filter((d) => !isNaN(d) && d > 0 && d < 120); // Sanity filter: positive and < 2 hours
    if (validDurations.length > 0) {
      const sum = validDurations.reduce((acc, d) => acc + d, 0);
      avgDuration = Math.round(sum / validDurations.length);
    }
  }

  // 3. Count active counters (available or busy and linked to that service via counter_services)
  const counterRes = await pool.query(
    `SELECT count(DISTINCT c.id) as active_count
     FROM counters c
     JOIN counter_services cs ON c.id = cs.counter_id
     WHERE cs.service_id = $1
       AND c.status IN ('available', 'busy')`,
    [serviceId]
  );

  const activeCounters = parseInt(counterRes.rows[0]?.active_count || '0', 10);

  return calculateWaitTimeMinutes({
    peopleAhead,
    avgServiceDuration: avgDuration,
    activeCounters: activeCounters > 0 ? activeCounters : 1, // Fallback to 1 if none active yet
  });
}
