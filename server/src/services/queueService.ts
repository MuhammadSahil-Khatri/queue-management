import { pool } from '../db/pool.js';
import { validateTokenTransition, TokenStatus } from '../domain/tokenStateMachine.js';
import { logActivity } from './activityLogService.js';
import { sendNotification } from './notificationService.js';

export async function getPublicQueueState(serviceId: string) {
  // Current serving token
  const currentRes = await pool.query(
    `SELECT t.token_number, t.status, c.counter_number, t.called_at
     FROM tokens t
     LEFT JOIN counters c ON t.counter_id = c.id
     WHERE t.service_id = $1 AND t.status IN ('called', 'in_service')
     ORDER BY t.updated_at DESC LIMIT 1`,
    [serviceId]
  );

  // Waiting count
  const waitingRes = await pool.query(
    "SELECT count(*) as count FROM tokens WHERE service_id = $1 AND status = 'waiting'",
    [serviceId]
  );

  // Active counters for this service
  const countersRes = await pool.query(
    `SELECT c.id, c.counter_number, c.status, u.name as staff_name
     FROM counters c
     JOIN counter_services cs ON c.id = cs.counter_id
     LEFT JOIN profiles u ON c.assigned_staff_id = u.id
     WHERE cs.service_id = $1`,
    [serviceId]
  );

  return {
    serviceId,
    currentServingToken: currentRes.rows[0]?.token_number || null,
    currentCounter: currentRes.rows[0]?.counter_number || null,
    waitingCount: parseInt(waitingRes.rows[0]?.count || '0', 10),
    counters: countersRes.rows,
  };
}

export async function callNextToken(counterId: string, staffId: string) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Get counter & its linked services
    const counterRes = await client.query(
      'SELECT * FROM counters WHERE id = $1 FOR UPDATE',
      [counterId]
    );

    if (counterRes.rows.length === 0) {
      const err: any = new Error('Counter not found');
      err.statusCode = 404;
      throw err;
    }

    const counter = counterRes.rows[0];

    const servicesRes = await client.query(
      'SELECT service_id FROM counter_services WHERE counter_id = $1',
      [counterId]
    );
    const serviceIds = servicesRes.rows.map((r) => r.service_id);

    if (serviceIds.length === 0) {
      const err: any = new Error('No services assigned to this counter');
      err.statusCode = 400;
      throw err;
    }

    // 2. Find next waiting token in queue order (priority DESC, created_at ASC)
    const tokenRes = await client.query(
      `SELECT * FROM tokens 
       WHERE service_id = ANY($1) AND status = 'waiting'
       ORDER BY priority DESC, created_at ASC
       LIMIT 1
       FOR UPDATE`,
      [serviceIds]
    );

    if (tokenRes.rows.length === 0) {
      await client.query('COMMIT');
      return { message: 'No waiting tokens in queue for this counter', token: null };
    }

    const token = tokenRes.rows[0];

    // Validate transition
    validateTokenTransition(token.status as TokenStatus, 'called');

    // Update token
    const updatedRes = await client.query(
      `UPDATE tokens 
       SET status = 'called', counter_id = $1, called_at = NOW(), updated_at = NOW()
       WHERE id = $2 RETURNING *`,
      [counterId, token.id]
    );

    // Update counter status to busy
    await client.query(
      "UPDATE counters SET status = 'busy', updated_at = NOW() WHERE id = $1",
      [counterId]
    );

    // Record token_counter call
    await client.query(
      `INSERT INTO token_counters (id, token_id, counter_id, called_at)
       VALUES ($1, $2, $3, NOW())`,
      [crypto.randomUUID(), token.id, counterId]
    );

    await client.query('COMMIT');

    const updatedToken = updatedRes.rows[0];

    logActivity('token', token.id, 'CALLED', staffId, {
      counterId,
      counterNumber: counter.counter_number,
      tokenNumber: token.token_number,
    });

    if (token.user_id) {
      sendNotification(
        token.user_id,
        'Your Turn! Token Called',
        `Token ${token.token_number}: Please proceed to ${counter.counter_number}.`,
        'reminder'
      );
    }

    return {
      message: `Token ${token.token_number} called to ${counter.counter_number}`,
      token: updatedToken,
      counterNumber: counter.counter_number,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function updateTokenStatus(
  tokenId: string,
  newStatus: TokenStatus,
  staffId: string
) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const tokenRes = await client.query(
      'SELECT * FROM tokens WHERE id = $1 FOR UPDATE',
      [tokenId]
    );

    if (tokenRes.rows.length === 0) {
      const err: any = new Error('Token not found');
      err.statusCode = 404;
      throw err;
    }

    const token = tokenRes.rows[0];

    validateTokenTransition(token.status as TokenStatus, newStatus);

    const sets: string[] = ['status = $1', 'updated_at = NOW()'];
    const params: any[] = [newStatus, tokenId];
    let paramIdx = 3;

    if (newStatus === 'in_service') {
      sets.push('started_at = NOW()');
    } else if (newStatus === 'completed') {
      sets.push('completed_at = NOW()');
    }

    const updatedTokenRes = await client.query(
      `UPDATE tokens SET ${sets.join(', ')} WHERE id = $2 RETURNING *`,
      params
    );

    // If completed and linked to appointment, mark appointment completed
    if (newStatus === 'completed' && token.appointment_id) {
      await client.query(
        "UPDATE appointments SET status = 'completed', updated_at = NOW() WHERE id = $1",
        [token.appointment_id]
      );
    }

    // If token completed or missed and counter was assigned, set counter back to available
    if (['completed', 'missed', 'skipped', 'cancelled'].includes(newStatus) && token.counter_id) {
      await client.query(
        "UPDATE counters SET status = 'available', updated_at = NOW() WHERE id = $1",
        [token.counter_id]
      );
    }

    await client.query('COMMIT');

    logActivity('token', tokenId, newStatus.toUpperCase(), staffId, {
      tokenNumber: token.token_number,
    });

    return updatedTokenRes.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
