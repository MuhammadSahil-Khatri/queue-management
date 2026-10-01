import bcrypt from 'bcryptjs';

async function main() {
  console.log('🌱 Starting QueueCraft database seed for Supabase PostgreSQL...');

  // Dynamically load PrismaClient or fallback store
  let prisma: any;
  try {
    const pkg: any = await import('@prisma/client');
    prisma = new pkg.PrismaClient();
  } catch {
    const local = await import('../src/lib/prisma.js');
    prisma = local.prisma;
  }

  const adminPasswordHash = await bcrypt.hash('AdminPass123!', 12);
  const managerPasswordHash = await bcrypt.hash('ManagerPass123!', 12);
  const staffPasswordHash = await bcrypt.hash('StaffPass123!', 12);
  const customerPasswordHash = await bcrypt.hash('CustomerPass123!', 12);

  // 1. Examination Department
  let department: any;
  if (prisma.department?.upsert) {
    department = await prisma.department.upsert({
      where: { name: 'Examination Department' },
      update: {},
      create: {
        name: 'Examination Department',
        description: 'Department managing candidate examinations, document verification, and certifications',
        isActive: true,
      },
    });
  } else {
    department = await prisma.department.create({
      data: {
        name: 'Examination Department',
        description: 'Department managing candidate examinations, document verification, and certifications',
        isActive: true,
      },
    });
  }

  console.log(`✅ Department seeded: ${department.name} (${department.id})`);

  // 2. 1 Admin
  const admin = await prisma.user.create({
    data: {
      name: 'Super Administrator',
      email: 'admin@queuecraft.local',
      phone: '+1-555-0100',
      passwordHash: adminPasswordHash,
      role: 'ADMIN',
      isActive: true,
    },
  });
  console.log(`✅ Admin user seeded: ${admin.email}`);

  // 3. 1 Manager (assigned to Examination Department)
  const manager = await prisma.user.create({
    data: {
      name: 'Elena Rostova (Manager)',
      email: 'manager@queuecraft.local',
      phone: '+1-555-0105',
      passwordHash: managerPasswordHash,
      role: 'MANAGER',
      departmentId: department.id,
      isActive: true,
      staffProfile: {
        create: {
          staffCode: 'MGR-0001',
          departmentId: department.id,
          shift: 'FULL_DAY',
          currentStatus: 'AVAILABLE',
          serviceType: 'Department Oversight',
        },
      },
    },
  });
  console.log(`✅ Manager seeded: ${manager.email}`);

  // 4. Staff 1 (Examination Department)
  const staff1 = await prisma.user.create({
    data: {
      name: 'Marcus Vance (Staff 1)',
      email: 'staff1@queuecraft.local',
      phone: '+1-555-0106',
      passwordHash: staffPasswordHash,
      role: 'STAFF',
      departmentId: department.id,
      isActive: true,
      staffProfile: {
        create: {
          staffCode: 'STF-0001',
          departmentId: department.id,
          shift: 'MORNING',
          currentStatus: 'AVAILABLE',
          serviceType: 'Document Intake & ID Check',
          assignedCounterId: 'CTR-01',
        },
      },
    },
  });
  console.log(`✅ Staff 1 seeded: ${staff1.email}`);

  // 5. Staff 2 (Examination Department)
  const staff2 = await prisma.user.create({
    data: {
      name: 'Sarah Jenkins (Staff 2)',
      email: 'staff2@queuecraft.local',
      phone: '+1-555-0107',
      passwordHash: staffPasswordHash,
      role: 'STAFF',
      departmentId: department.id,
      isActive: true,
      staffProfile: {
        create: {
          staffCode: 'STF-0002',
          departmentId: department.id,
          shift: 'EVENING',
          currentStatus: 'OFFLINE',
          serviceType: 'Certificate Issuance',
          assignedCounterId: 'CTR-02',
        },
      },
    },
  });
  console.log(`✅ Staff 2 seeded: ${staff2.email}`);

  // 6. Customer 1
  const customer1 = await prisma.user.create({
    data: {
      name: 'Alex Rivera',
      email: 'customer1@queuecraft.local',
      phone: '+1-555-0101',
      passwordHash: customerPasswordHash,
      role: 'CUSTOMER',
      isActive: true,
    },
  });
  console.log(`✅ Customer 1 seeded: ${customer1.email}`);

  // 7. Customer 2
  const customer2 = await prisma.user.create({
    data: {
      name: 'Maya Patel',
      email: 'customer2@queuecraft.local',
      phone: '+1-555-0102',
      passwordHash: customerPasswordHash,
      role: 'CUSTOMER',
      isActive: true,
    },
  });
  console.log(`✅ Customer 2 seeded: ${customer2.email}`);

  console.log('\n=============================================================');
  console.log('  QUEUECRAFT SEED COMPLETED SUCCESSFULLY');
  console.log('=============================================================');
  console.log('  Admin:     admin@queuecraft.local     / AdminPass123!');
  console.log('  Manager:   manager@queuecraft.local   / ManagerPass123!');
  console.log('  Staff 1:   staff1@queuecraft.local    / StaffPass123!');
  console.log('  Staff 2:   staff2@queuecraft.local    / StaffPass123!');
  console.log('  Customer 1: customer1@queuecraft.local / CustomerPass123!');
  console.log('  Customer 2: customer2@queuecraft.local / CustomerPass123!');
  console.log('=============================================================\n');

  if (prisma.$disconnect) {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error('Seed error:', e);
  process.exit(1);
});
