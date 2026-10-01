import crypto from 'crypto';
import { pool } from '../db/pool.js';
import { getEstimatedWaitTime } from './waitTimeService.js';
import { logActivity } from './activityLogService.js';
import { sendNotification } from './notificationService.js';

export interface WalkInTokenResult {
  token: {
    id: string;
    tokenNumber: string;
    status: string;
    serviceId: string;
    serviceName: string;
    createdAt: Date;
  };
  currentTokenNumber: string | null;
  peopleAhead: number;
  estimatedWaitMinutes: number;
  message: string;
}

export async function generateWalkInToken(
  serviceId: string,
  userId?: string | null
): Promise<WalkInTokenResult> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Fetch service info
    const serviceRes = await client.query(
      `SELECT s.*, d.name AS department_name 
       FROM services s 
       JOIN departments d ON s.department_id = d.id 
       WHERE s.id = $1`,
      [serviceId]
    );

    if (serviceRes.rows.length === 0) {
      const err: any = new Error('Selected service not found');
      err.statusCode = 404;
      throw err;
    }

    const service = serviceRes.rows[0];

    // 2. Prevent duplicate active token for the user for this service
    if (userId) {
      const existingRes = await client.query(
        `SELECT id, token_number FROM tokens 
         WHERE user_id = $1 AND service_id = $2 AND status IN ('waiting', 'called', 'in_service')`,
        [userId, serviceId]
      );

      if (existingRes.rows.length > 0) {
        const err: any = new Error(
          `You already have an active token (${existingRes.rows[0].token_number}) in line for this service.`
        );
        err.statusCode = 409;
        throw err;
      }
    }

    // 3. Generate atomic token number
    const counterRes = await client.query(
      `INSERT INTO daily_token_counters (service_id, date, last_number)
       VALUES ($1, CURRENT_DATE, 1)
       ON CONFLICT (service_id, date)
       DO UPDATE SET last_number = daily_token_counters.last_number + 1
       RETURNING last_number`,
      [serviceId]
    );
    const lastNumber = counterRes.rows[0].last_number;
    const tokenNumber = `${service.code_prefix}-${String(lastNumber).padStart(3, '0')}`;

    // 4. Calculate people ahead:
    // In queue order (priority DESC, created_at ASC), count waiting tokens
    // For a walk-in (priority = 0), all current waiting tokens (both priority=10 and priority=0) are ahead
    const aheadRes = await client.query(
      "SELECT count(*) as count FROM tokens WHERE service_id = $1 AND status = 'waiting'",
      [serviceId]
    );
    const peopleAhead = parseInt(aheadRes.rows[0]?.count || '0', 10);

    // 5. Estimated wait time
    const estimatedWait = await getEstimatedWaitTime(serviceId, peopleAhead);

    // 6. Insert token
    const tokenId = crypto.randomUUID();
    const tokenInsertRes = await client.query(
      `INSERT INTO tokens (
        id, token_number, user_id, service_id, department_id,
        status, priority, queue_position, estimated_wait_min, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, 'waiting', 0, $6, $7, NOW(), NOW())
      RETURNING *`,
      [tokenId, tokenNumber, userId || null, serviceId, service.department_id, peopleAhead + 1, estimatedWait]
    );

    // 7. Find current serving token for this service
    const currentRes = await client.query(
      `SELECT token_number FROM tokens 
       WHERE service_id = $1 AND status IN ('called', 'in_service')
       ORDER BY updated_at DESC LIMIT 1`,
      [serviceId]
    );
    const currentTokenNumber = currentRes.rows[0]?.token_number || null;

    await client.query('COMMIT');

    const createdToken = tokenInsertRes.rows[0];

    // Logging & notification
    logActivity('token', tokenId, 'TOKEN_GENERATED', userId || null, {
      tokenNumber,
      serviceId,
      estimatedWait,
    });

    if (userId) {
      sendNotification(
        userId,
        'Digital Token Issued',
        `Your walk-in token ${tokenNumber} is ready. Estimated wait: ${estimatedWait} mins (${peopleAhead} ahead). You can wait nearby.`,
        'token_generated'
      );
    }

    return {
      token: {
        id: createdToken.id,
        tokenNumber: createdToken.token_number,
        status: createdToken.status,
        serviceId: service.id,
        serviceName: service.name,
        createdAt: createdToken.created_at,
      },
      currentTokenNumber,
      peopleAhead,
      estimatedWaitMinutes: estimatedWait,
      message: 'You can wait comfortably nearby instead of standing in line. Your position updates live.',
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function getActiveTokenForUser(userId: string) {
  const tokenRes = await pool.query(
    `SELECT t.*, s.name as service_name, s.code_prefix, s.avg_duration_min, d.name as department_name,
            c.counter_number
     FROM tokens t
     JOIN services s ON t.service_id = s.id
     JOIN departments d ON t.department_id = d.id
     LEFT JOIN counters c ON t.counter_id = c.id
     WHERE t.user_id = $1 
       AND t.status IN ('waiting', 'called', 'in_service')
     ORDER BY t.created_at DESC
     LIMIT 1`,
    [userId]
  );

  if (tokenRes.rows.length === 0) {
    return null;
  }

  const token = tokenRes.rows[0];

  // People ahead: waiting tokens for same service ahead in queue order (priority DESC, created_at ASC)
  const aheadRes = await pool.query(
    `SELECT count(*) as count
     FROM tokens
     WHERE service_id = $1 
       AND status = 'waiting'
       AND (
         priority > $2
         OR (priority = $2 AND created_at < $3)
       )`,
    [token.service_id, token.priority, token.created_at]
  );

  const peopleAhead = parseInt(aheadRes.rows[0]?.count || '0', 10);
  const estimatedWait = await getEstimatedWaitTime(token.service_id, peopleAhead);

  // Current serving token
  const currentRes = await pool.query(
    `SELECT token_number FROM tokens 
     WHERE service_id = $1 AND status IN ('called', 'in_service')
     ORDER BY updated_at DESC LIMIT 1`,
    [token.service_id]
  );

  return {
    token: {
      id: token.id,
      tokenNumber: token.token_number,
      status: token.status,
      priority: token.priority,
      serviceId: token.service_id,
      serviceName: token.service_name,
      departmentName: token.department_name,
      counterNumber: token.counter_number || null,
      createdAt: token.created_at,
      calledAt: token.called_at,
    },
    currentTokenNumber: currentRes.rows[0]?.token_number || null,
    peopleAhead,
    estimatedWaitMinutes: estimatedWait,
    message:
      token.status === 'called'
        ? `Please proceed immediately to ${token.counter_number || 'your assigned counter'}!`
        : 'You can wait comfortably nearby instead of standing in line. Your position updates live.',
  };
}
