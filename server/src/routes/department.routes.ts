import { Router } from 'express';
import { getDepartments, getDepartmentServices } from '../controllers/departmentController.js';

const router = Router();

router.get('/', getDepartments);
router.get('/:id/services', getDepartmentServices);

export default router;
