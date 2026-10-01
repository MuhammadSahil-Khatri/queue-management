import { Request, Response, NextFunction } from 'express';
import { pool } from '../db/pool.js';

export async function getDepartments(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await pool.query(
      'SELECT id, name, description, working_hours, is_active FROM departments WHERE is_active = true ORDER BY name ASC'
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
}

export async function getDepartmentServices(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT id, name, department_id, code_prefix, avg_duration_min, description, daily_limit, is_active
       FROM services
       WHERE department_id = $1 AND is_active = true
       ORDER BY name ASC`,
      [id]
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
}
