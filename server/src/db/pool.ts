import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;

const connectionString =
  process.env.DATABASE_URL ||
  'postgresql://postgres:Alien%40124_124@db.hxkvffuebtvjjxcynxky.supabase.co:5432/postgres';

export const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client:', err);
});

export default pool;
