import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { pool } from '../src/db/pool.js';
import { bookAppointment } from '../src/services/appointmentService.js';

describe('Concurrency Slot Booking Test (10 simultaneous bookings for capacity 6)', () => {
  const TEST_SLOT_ID = 'test-slot-concurrency-001';
  const TEST_SERVICE_ID = 'srv-doc-verif';
  const TEST_USERS = Array.from({ length: 10 }, (_, i) => ({
    id: `test-user-conc-${i + 1}`,
    email: `conc_user_${i + 1}@test.local`,
    name: `Concurrency User ${i + 1}`,
  }));

  beforeAll(async () => {
    // 1. Ensure test users exist in profiles
    for (const u of TEST_USERS) {
      await pool.query(
        `INSERT INTO profiles (id, user_id, email, name, role, is_active)
         VALUES ($1, $1, $2, $3, 'CUSTOMER', true)
         ON CONFLICT (id) DO UPDATE SET email = $2, name = $3`,
        [u.id, u.email, u.name]
      );
    }

    // 2. Clean up any previous test slot / appointments
    await pool.query('DELETE FROM appointments WHERE slot_id = $1', [TEST_SLOT_ID]);
    await pool.query('DELETE FROM appointment_slots WHERE id = $1', [TEST_SLOT_ID]);

    // 3. Create isolated slot with max_capacity = 6 and booked_count = 0
    await pool.query(
      `INSERT INTO appointment_slots (
        id, service_id, date, start_time, end_time, max_capacity, booked_count, is_active
      ) VALUES ($1, $2, '2026-12-31', '18:00:00', '18:30:00', 6, 0, true)`,
      [TEST_SLOT_ID, TEST_SERVICE_ID]
    );
  }, 15000);

  afterAll(async () => {
    // Cleanup
    await pool.query('DELETE FROM appointments WHERE slot_id = $1', [TEST_SLOT_ID]);
    await pool.query('DELETE FROM appointment_slots WHERE id = $1', [TEST_SLOT_ID]);
    for (const u of TEST_USERS) {
      await pool.query('DELETE FROM profiles WHERE id = $1', [u.id]);
    }
  }, 15000);

  it('fires 10 simultaneous bookings at a slot with capacity 6 and asserts exactly 6 succeed and 4 are rejected with 409', async () => {
    // Launch all 10 booking attempts concurrently
    const bookingPromises = TEST_USERS.map((user) =>
      bookAppointment({
        userId: user.id,
        serviceId: TEST_SERVICE_ID,
        slotId: TEST_SLOT_ID,
        notes: `Simultaneous test by ${user.name}`,
      })
    );

    const results = await Promise.allSettled(bookingPromises);

    const succeeded = results.filter((r) => r.status === 'fulfilled');
    const failed = results.filter((r) => r.status === 'rejected');

    console.log(`[Concurrency Test Results] Succeeded: ${succeeded.length}, Rejected: ${failed.length}`);

    // Assertions required by the specification:
    // Exactly 6 succeed, exactly 4 rejected
    expect(succeeded.length).toBe(6);
    expect(failed.length).toBe(4);

    // Verify all 4 failed with 409 conflict
    for (const f of failed) {
      if (f.status === 'rejected') {
        const error = f.reason;
        expect(error.statusCode).toBe(409);
        expect(error.message).toMatch(/capacity/i);
      }
    }

    // Verify database state directly:
    // Slot booked_count must be exactly 6 (cannot exceed max_capacity 6)
    const slotCheck = await pool.query(
      'SELECT booked_count, max_capacity FROM appointment_slots WHERE id = $1',
      [TEST_SLOT_ID]
    );
    expect(slotCheck.rows[0].booked_count).toBe(6);
    expect(slotCheck.rows[0].max_capacity).toBe(6);

    // Total appointments inserted for this slot must be exactly 6
    const apptCount = await pool.query(
      'SELECT count(*) FROM appointments WHERE slot_id = $1',
      [TEST_SLOT_ID]
    );
    expect(parseInt(apptCount.rows[0].count, 10)).toBe(6);
  }, 25000);
});
