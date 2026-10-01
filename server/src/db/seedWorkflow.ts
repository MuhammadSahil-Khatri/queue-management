import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { pool } from './pool.js';
import { ensureSlotsForService } from '../services/slotService.js';

export async function seedWorkflowDatabase() {
  console.log('🌱 Seeding Supabase PostgreSQL for Appointment & Queue Workflow...');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Seed Profiles from User table & demo passwords
    const userHash = await bcrypt.hash('CustomerPass123!', 10);
    const staffHash = await bcrypt.hash('StaffPass123!', 10);
    const adminHash = await bcrypt.hash('AdminPass123!', 10);

    const initialUsers = [
      { id: 'user-admin-001', email: 'admin@queuecraft.local', name: 'Super Administrator', role: 'ADMIN' },
      { id: 'user-manager-001', email: 'manager@queuecraft.local', name: 'Elena Rostova (Manager)', role: 'MANAGER', dept: 'dept-exam-001' },
      { id: 'user-staff-001', email: 'staff1@queuecraft.local', name: 'Marcus Vance (Staff 1)', role: 'STAFF', dept: 'dept-exam-001' },
      { id: 'user-staff-002', email: 'staff2@queuecraft.local', name: 'Sarah Jenkins (Staff 2)', role: 'STAFF', dept: 'dept-exam-001' },
      { id: 'user-cust-001', email: 'customer1@queuecraft.local', name: 'Alex Rivera', role: 'CUSTOMER' },
      { id: 'user-cust-002', email: 'customer2@queuecraft.local', name: 'Maya Patel', role: 'CUSTOMER' },
    ];

    for (const u of initialUsers) {
      // Sync into profiles
      await client.query(
        `INSERT INTO profiles (id, user_id, email, name, role, department_id, is_active, created_at, updated_at)
         VALUES ($1, $1, $2, $3, $4, $5, true, NOW(), NOW())
         ON CONFLICT (id) DO UPDATE SET email = $2, name = $3, role = $4`,
        [u.id, u.email, u.name, u.role, u.dept || null]
      );
    }
    console.log('✅ Profiles synchronized.');

    // 2. Seed Departments
    const depts = [
      { id: 'dept-exam-001', name: 'Examination Department', description: 'Degree verifications, transcript evaluations, and exam records' },
      { id: 'dept-stu-001', name: 'Student Affairs', description: 'Admissions, student cards, campus registration and housing' },
      { id: 'dept-reg-001', name: 'Registrar Office', description: 'Academic transcripts, attestations, and diploma issuance' },
    ];

    for (const d of depts) {
      await client.query(
        `INSERT INTO departments (id, name, description, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, true, NOW(), NOW())
         ON CONFLICT (id) DO UPDATE SET name = $2, description = $3`,
        [d.id, d.name, d.description]
      );
    }
    console.log('✅ Departments seeded.');

    // 3. Seed Services
    const services = [
      {
        id: 'srv-doc-verif',
        name: 'Document Verification',
        deptId: 'dept-exam-001',
        prefix: 'A',
        duration: 10,
        desc: 'Verification of academic diplomas, certificates, and ID documents',
      },
      {
        id: 'srv-cert-verif',
        name: 'Certificate Verification',
        deptId: 'dept-exam-001',
        prefix: 'B',
        duration: 10,
        desc: 'Official attestation and stamp verification for graduation certificates',
      },
      {
        id: 'srv-doc-coll',
        name: 'Document Collection',
        deptId: 'dept-exam-001',
        prefix: 'C',
        duration: 5,
        desc: 'Pick up processed documents, attested certificates, and duplicate ID cards',
      },
      {
        id: 'srv-new-reg',
        name: 'New Registration',
        deptId: 'dept-stu-001',
        prefix: 'D',
        duration: 20,
        desc: 'New candidate enrollment, account setup, and biometric photo capture',
      },
    ];

    for (const s of services) {
      await client.query(
        `INSERT INTO services (id, name, department_id, code_prefix, avg_duration_min, description, daily_limit, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, 100, true, NOW(), NOW())
         ON CONFLICT (id) DO UPDATE SET name = $2, code_prefix = $4, avg_duration_min = $5`,
        [s.id, s.name, s.deptId, s.prefix, s.duration, s.desc]
      );

      // Seed booking rules
      await client.query(
        `INSERT INTO booking_rules (id, department_id, service_id, check_in_window_min, max_active_tokens_per_user, cancellation_deadline_hours)
         VALUES ($1, $2, $3, 10, 1, 1)
         ON CONFLICT (id) DO NOTHING`,
        [`rule-${s.id}`, s.deptId, s.id]
      );
    }
    console.log('✅ Services & Booking Rules seeded.');

    // 4. Seed Counters and Counter-Service Links
    const counters = [
      { id: 'ctr-01', number: 'Counter 1', deptId: 'dept-exam-001', staffId: 'user-staff-001', status: 'available', serviceId: 'srv-doc-verif' },
      { id: 'ctr-02', number: 'Counter 2', deptId: 'dept-exam-001', staffId: 'user-staff-002', status: 'available', serviceId: 'srv-cert-verif' },
      { id: 'ctr-03', number: 'Counter 3', deptId: 'dept-exam-001', staffId: null, status: 'available', serviceId: 'srv-doc-coll' },
    ];

    for (const c of counters) {
      await client.query(
        `INSERT INTO counters (id, counter_number, department_id, assigned_staff_id, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
         ON CONFLICT (id) DO UPDATE SET counter_number = $2, status = $5, assigned_staff_id = $4`,
        [c.id, c.number, c.deptId, c.staffId, c.status]
      );

      await client.query(
        `INSERT INTO counter_services (counter_id, service_id)
         VALUES ($1, $2)
         ON CONFLICT (counter_id, service_id) DO NOTHING`,
        [c.id, c.serviceId]
      );
    }
    console.log('✅ Counters & Counter-Service links seeded.');

    // 5. Seed historical completed tokens so rolling average wait time works
    const now = new Date();
    for (let i = 1; i <= 10; i++) {
      const tokenId = `tok-history-${i}`;
      const started = new Date(now.getTime() - (20 - i) * 15 * 60 * 1000);
      const completed = new Date(started.getTime() + (8 + (i % 5)) * 60 * 1000); // 8 to 12 minutes duration
      await client.query(
        `INSERT INTO tokens (
          id, token_number, user_id, service_id, department_id,
          status, priority, queue_position, estimated_wait_min,
          created_at, called_at, started_at, completed_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, 'completed', 0, 0, 0, $6, $7, $8, $9, $9)
        ON CONFLICT (id) DO NOTHING`,
        [
          tokenId,
          `A-00${i}`,
          'user-cust-001',
          'srv-doc-verif',
          'dept-exam-001',
          started,
          started,
          started,
          completed,
        ]
      );
    }
    console.log('✅ Completed tokens seeded (rolling average service duration = ~10m).');

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seed transaction failed:', err);
    throw err;
  } finally {
    client.release();
  }

  // 6. Ensure appointment slots for the next 7 days for all services
  for (const s of ['srv-doc-verif', 'srv-cert-verif', 'srv-doc-coll', 'srv-new-reg']) {
    await ensureSlotsForService(s, 7);
  }
  console.log('✅ Appointment slots generated for the next 7 days.');

  console.log('\n🎉 Supabase PostgreSQL Appointment & Queue Workflow Seeding Complete!\n');
  await pool.end();
}

// Run if called directly
if (process.argv[1]?.endsWith('seedWorkflow.ts') || process.argv[1]?.endsWith('seedWorkflow.js')) {
  seedWorkflowDatabase()
    .then(() => {
      console.log('Seed finished successfully.');
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
