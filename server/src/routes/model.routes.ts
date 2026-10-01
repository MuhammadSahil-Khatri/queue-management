import { Router, Request, Response } from 'express';
import pg from 'pg';

const { Pool } = pg;
const router = Router();

const connectionString =
  process.env.DATABASE_URL ||
  'postgresql://postgres:Alien%40124_124@db.hxkvffuebtvjjxcynxky.supabase.co:5432/postgres';

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

// GET /api/data-model/overview - Retrieve Section 8 Data Model entities and live database state
router.get('/overview', async (req: Request, res: Response) => {
  try {
    const services = await pool.query(
      'SELECT s.*, d.name as "departmentName" FROM "Service" s LEFT JOIN "Department" d ON s."departmentId" = d.id ORDER BY s."name" ASC'
    );
    const counters = await pool.query(
      `SELECT c.*, u.name as "assignedStaffName", s.name as "serviceName" 
       FROM "Counter" c 
       LEFT JOIN "User" u ON c."assignedStaffId" = u.id 
       LEFT JOIN "Service" s ON c."serviceId" = s.id 
       ORDER BY c."counterNumber" ASC`
    );
    const appointments = await pool.query(
      `SELECT a.*, u.name as "userName", u.email as "userEmail", s.name as "serviceName" 
       FROM "Appointment" a 
       LEFT JOIN "User" u ON a."userId" = u.id 
       LEFT JOIN "Service" s ON a."serviceId" = s.id 
       ORDER BY a."createdAt" DESC LIMIT 10`
    );
    const tokens = await pool.query(
      `SELECT t.*, u.name as "userName", s.name as "serviceName", c."counterNumber" 
       FROM "Token" t 
       LEFT JOIN "User" u ON t."userId" = u.id 
       LEFT JOIN "Service" s ON t."serviceId" = s.id 
       LEFT JOIN "Counter" c ON t."counterId" = c.id 
       ORDER BY t."createdAt" DESC LIMIT 10`
    );
    const users = await pool.query(
      'SELECT id, name, email, role, "isActive", "createdAt" FROM "User" ORDER BY "createdAt" DESC LIMIT 10'
    );

    res.json({
      databaseStatus: 'CONNECTED_SUPABASE_POSTGRESQL',
      host: 'db.hxkvffuebtvjjxcynxky.supabase.co',
      schemaEntities: {
        userData: {
          tableName: 'User',
          section8Fields: ['user_id', 'name', 'email', 'phone', 'role', 'account_status'],
          count: users.rowCount,
          records: users.rows,
        },
        serviceData: {
          tableName: 'Service',
          section8Fields: ['service_id', 'service_name', 'department_id', 'average_duration', 'active_status'],
          count: services.rowCount,
          records: services.rows,
        },
        counterData: {
          tableName: 'Counter',
          section8Fields: ['counter_id', 'department_id', 'assigned_staff', 'service_type', 'current_token', 'status'],
          count: counters.rowCount,
          records: counters.rows,
        },
        appointmentData: {
          tableName: 'Appointment',
          section8Fields: ['appointment_id', 'user_id', 'service_id', 'appointment_date', 'start_time', 'end_time', 'appointment_status', 'check_in_time'],
          count: appointments.rowCount,
          records: appointments.rows,
        },
        tokenData: {
          tableName: 'Token',
          section8Fields: ['token_id', 'token_number', 'user_id', 'service_id', 'queue_position', 'estimated_wait', 'token_status', 'created_at'],
          count: tokens.rowCount,
          records: tokens.rows,
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to retrieve data model overview', details: error.message });
  }
});

export default router;
