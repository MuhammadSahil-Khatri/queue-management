import pg from 'pg';
import bcrypt from 'bcryptjs';

const { Pool } = pg;

const connectionString =
  process.env.DATABASE_URL ||
  'postgresql://postgres:Alien%40124_124@db.hxkvffuebtvjjxcynxky.supabase.co:5432/postgres';

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

async function seed() {
  console.log('🌱 Seeding live Supabase PostgreSQL database...');

  const adminHash = await bcrypt.hash('AdminPass123!', 12);
  const managerHash = await bcrypt.hash('ManagerPass123!', 12);
  const staffHash = await bcrypt.hash('StaffPass123!', 12);
  const customerHash = await bcrypt.hash('CustomerPass123!', 12);

  // 1. Department
  const deptRes = await pool.query(
    `INSERT INTO "Department" ("id", "name", "description", "isActive", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, true, NOW(), NOW())
     ON CONFLICT ("name") DO UPDATE SET "updatedAt" = NOW()
     RETURNING "id"`,
    [
      'dept-exam-001',
      'Examination Department',
      'Department managing candidate examinations, document verification, and certifications',
    ]
  );
  const deptId = deptRes.rows[0].id;
  console.log(`✅ Department seeded: Examination Department (${deptId})`);

  // 2. Admin
  await pool.query(
    `INSERT INTO "User" ("id", "name", "email", "phone", "passwordHash", "role", "isActive", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, $5, 'ADMIN', true, NOW(), NOW())
     ON CONFLICT ("email") DO NOTHING`,
    ['user-admin-001', 'Super Administrator', 'admin@queuecraft.local', '+1-555-0100', adminHash]
  );
  console.log('✅ Admin seeded: admin@queuecraft.local');

  // 3. Manager
  await pool.query(
    `INSERT INTO "User" ("id", "name", "email", "phone", "passwordHash", "role", "departmentId", "isActive", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, $5, 'MANAGER', $6, true, NOW(), NOW())
     ON CONFLICT ("email") DO NOTHING`,
    [
      'user-manager-001',
      'Elena Rostova (Manager)',
      'manager@queuecraft.local',
      '+1-555-0105',
      managerHash,
      deptId,
    ]
  );
  await pool.query(
    `INSERT INTO "StaffProfile" ("id", "userId", "staffCode", "departmentId", "shift", "currentStatus", "serviceType", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, 'FULL_DAY', 'AVAILABLE', 'Department Oversight', NOW(), NOW())
     ON CONFLICT ("staffCode") DO NOTHING`,
    ['sp-manager-001', 'user-manager-001', 'MGR-0001', deptId]
  );
  console.log('✅ Manager seeded: manager@queuecraft.local');

  // 4. Staff 1
  await pool.query(
    `INSERT INTO "User" ("id", "name", "email", "phone", "passwordHash", "role", "departmentId", "isActive", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, $5, 'STAFF', $6, true, NOW(), NOW())
     ON CONFLICT ("email") DO NOTHING`,
    [
      'user-staff-001',
      'Marcus Vance (Staff 1)',
      'staff1@queuecraft.local',
      '+1-555-0106',
      staffHash,
      deptId,
    ]
  );
  await pool.query(
    `INSERT INTO "StaffProfile" ("id", "userId", "staffCode", "departmentId", "shift", "currentStatus", "serviceType", "assignedCounterId", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, 'MORNING', 'AVAILABLE', 'Document Intake & ID Check', 'CTR-01', NOW(), NOW())
     ON CONFLICT ("staffCode") DO NOTHING`,
    ['sp-staff-001', 'user-staff-001', 'STF-0001', deptId]
  );
  console.log('✅ Staff 1 seeded: staff1@queuecraft.local');

  // 5. Staff 2
  await pool.query(
    `INSERT INTO "User" ("id", "name", "email", "phone", "passwordHash", "role", "departmentId", "isActive", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, $5, 'STAFF', $6, true, NOW(), NOW())
     ON CONFLICT ("email") DO NOTHING`,
    [
      'user-staff-002',
      'Sarah Jenkins (Staff 2)',
      'staff2@queuecraft.local',
      '+1-555-0107',
      staffHash,
      deptId,
    ]
  );
  await pool.query(
    `INSERT INTO "StaffProfile" ("id", "userId", "staffCode", "departmentId", "shift", "currentStatus", "serviceType", "assignedCounterId", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, 'EVENING', 'OFFLINE', 'Certificate Issuance', 'CTR-02', NOW(), NOW())
     ON CONFLICT ("staffCode") DO NOTHING`,
    ['sp-staff-002', 'user-staff-002', 'STF-0002', deptId]
  );
  console.log('✅ Staff 2 seeded: staff2@queuecraft.local');

  // 6. Customers
  await pool.query(
    `INSERT INTO "User" ("id", "name", "email", "phone", "passwordHash", "role", "isActive", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, $5, 'CUSTOMER', true, NOW(), NOW())
     ON CONFLICT ("email") DO NOTHING`,
    ['user-cust-001', 'Alex Rivera', 'customer1@queuecraft.local', '+1-555-0101', customerHash]
  );
  await pool.query(
    `INSERT INTO "User" ("id", "name", "email", "phone", "passwordHash", "role", "isActive", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, $5, 'CUSTOMER', true, NOW(), NOW())
     ON CONFLICT ("email") DO NOTHING`,
    ['user-cust-002', 'Maya Patel', 'customer2@queuecraft.local', '+1-555-0102', customerHash]
  );
  console.log('✅ Customers seeded: customer1 & customer2');

  const countRes = await pool.query('SELECT count(*) FROM "User"');
  console.log(`\n🎉 Supabase PostgreSQL Seed Complete! Total users in database: ${countRes.rows[0].count}`);

  await pool.end();
}

seed().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
