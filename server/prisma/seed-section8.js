import pg from 'pg';

const { Pool } = pg;

const connectionString =
  process.env.DATABASE_URL ||
  'postgresql://postgres:Alien%40124_124@db.hxkvffuebtvjjxcynxky.supabase.co:5432/postgres';

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

async function seed() {
  console.log('🌱 Seeding Section 8 entities (Services, Counters, Appointments, Tokens) into Supabase...');

  const deptRes = await pool.query('SELECT id FROM "Department" WHERE name = $1', ['Examination Department']);
  if (deptRes.rows.length === 0) {
    throw new Error('Examination Department not found. Run seed-supabase.js first.');
  }
  const deptId = deptRes.rows[0].id;

  // 1. Seed Services (Section 8 & Section 5)
  const services = [
    {
      id: 'srv-doc-verif',
      name: 'Document Verification',
      code: 'DOC-VERIF',
      tokenPrefix: 'A',
      averageDuration: 10,
      description: 'Intake and authenticity verification for academic and civil documentation',
      dailyLimit: 80,
    },
    {
      id: 'srv-cert-verif',
      name: 'Certificate Verification',
      code: 'CERT-VERIF',
      tokenPrefix: 'B',
      averageDuration: 10,
      description: 'Official diploma, transcript, and certificate attestation',
      dailyLimit: 60,
    },
    {
      id: 'srv-doc-coll',
      name: 'Document Collection',
      code: 'DOC-COLL',
      tokenPrefix: 'C',
      averageDuration: 5,
      description: 'Pick up processed documents, attested certificates, and transcripts',
      dailyLimit: 120,
    },
    {
      id: 'srv-new-reg',
      name: 'New Registration',
      code: 'NEW-REG',
      tokenPrefix: 'D',
      averageDuration: 20,
      description: 'Candidate enrolment and initial biometric registration',
      dailyLimit: 40,
    },
  ];

  for (const s of services) {
    await pool.query(
      `INSERT INTO "Service" ("id", "name", "code", "tokenPrefix", "departmentId", "averageDuration", "description", "dailyLimit", "isActive", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, NOW(), NOW())
       ON CONFLICT ("departmentId", "code") DO UPDATE SET "name" = $2, "averageDuration" = $6, "updatedAt" = NOW()`,
      [s.id, s.name, s.code, s.tokenPrefix, deptId, s.averageDuration, s.description, s.dailyLimit]
    );
  }
  console.log('✅ Services seeded (Document Verification, Certificate Verification, Document Collection, New Registration)');

  // 2. Seed Counters (Section 8 & Section 6)
  const staff1Res = await pool.query('SELECT id FROM "User" WHERE email = $1', ['staff1@queuecraft.local']);
  const staff2Res = await pool.query('SELECT id FROM "User" WHERE email = $1', ['staff2@queuecraft.local']);
  const staff1Id = staff1Res.rows[0]?.id || null;
  const staff2Id = staff2Res.rows[0]?.id || null;

  const counters = [
    {
      id: 'ctr-01',
      counterNumber: 'Counter 1',
      assignedStaffId: staff1Id,
      serviceId: 'srv-doc-verif',
      status: 'AVAILABLE',
    },
    {
      id: 'ctr-02',
      counterNumber: 'Counter 2',
      assignedStaffId: staff2Id,
      serviceId: 'srv-cert-verif',
      status: 'AVAILABLE',
    },
    {
      id: 'ctr-03',
      counterNumber: 'Counter 3',
      assignedStaffId: null,
      serviceId: 'srv-doc-coll',
      status: 'CLOSED',
    },
  ];

  for (const c of counters) {
    await pool.query(
      `INSERT INTO "Counter" ("id", "counterNumber", "departmentId", "assignedStaffId", "serviceId", "status", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
       ON CONFLICT ("id") DO UPDATE SET "status" = $6, "assignedStaffId" = $4, "updatedAt" = NOW()`,
      [c.id, c.counterNumber, deptId, c.assignedStaffId, c.serviceId, c.status]
    );
  }
  console.log('✅ Counters seeded (Counter 1, Counter 2, Counter 3)');

  // 3. Seed Appointments (Section 8 & Section 3)
  const cust1Res = await pool.query('SELECT id FROM "User" WHERE email = $1', ['customer1@queuecraft.local']);
  const cust2Res = await pool.query('SELECT id FROM "User" WHERE email = $1', ['customer2@queuecraft.local']);
  const cust1Id = cust1Res.rows[0]?.id;
  const cust2Id = cust2Res.rows[0]?.id;

  if (cust1Id && cust2Id) {
    const today = new Date();
    await pool.query(
      `INSERT INTO "Appointment" ("id", "appointmentNumber", "userId", "serviceId", "departmentId", "appointmentDate", "startTime", "endTime", "status", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'CONFIRMED', NOW(), NOW())
       ON CONFLICT ("appointmentNumber") DO NOTHING`,
      ['apt-001', 'APT-20261001-001', cust1Id, 'srv-doc-verif', deptId, today, '09:30', '10:00']
    );

    await pool.query(
      `INSERT INTO "Appointment" ("id", "appointmentNumber", "userId", "serviceId", "departmentId", "appointmentDate", "startTime", "endTime", "status", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'BOOKED', NOW(), NOW())
       ON CONFLICT ("appointmentNumber") DO NOTHING`,
      ['apt-002', 'APT-20261001-002', cust2Id, 'srv-cert-verif', deptId, today, '10:00', '10:30']
    );
    console.log('✅ Appointments seeded (APT-20261001-001, APT-20261001-002)');
  }

  // 4. Seed Tokens (Section 8, Section 3, Section 4 Example: Token A-027, Current Token A-021)
  await pool.query(
    `INSERT INTO "Token" ("id", "tokenNumber", "userId", "serviceId", "departmentId", "counterId", "queuePosition", "estimatedWait", "status", "calledAt", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, $5, $6, 0, 0, 'IN_SERVICE', NOW(), NOW() - INTERVAL '15 MINUTE', NOW())
     ON CONFLICT ("id") DO NOTHING`,
    ['tok-021', 'A-021', cust1Id || null, 'srv-doc-verif', deptId, 'ctr-01']
  );

  // Link current token to Counter 1
  await pool.query('UPDATE "Counter" SET "currentTokenId" = $1, "status" = \'BUSY\' WHERE "id" = $2', [
    'tok-021',
    'ctr-01',
  ]);

  // Token A-027 (Waiting, 5 people ahead, estimated wait: 18 mins)
  await pool.query(
    `INSERT INTO "Token" ("id", "tokenNumber", "userId", "serviceId", "departmentId", "queuePosition", "estimatedWait", "status", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, $5, 6, 18, 'WAITING', NOW() - INTERVAL '5 MINUTE', NOW())
     ON CONFLICT ("id") DO NOTHING`,
    ['tok-027', 'A-027', cust2Id || null, 'srv-doc-verif', deptId]
  );
  console.log('✅ Tokens seeded (A-021 IN_SERVICE at Counter 1, A-027 WAITING with 18m wait)');

  console.log('\n🎉 Section 8 Entities seeded successfully into live Supabase PostgreSQL!\n');
  await pool.end();
}

seed().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
