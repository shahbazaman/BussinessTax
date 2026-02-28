import express from 'express';
const router = express.Router();
import protect from '../middleware/authMiddleware.js';
import { 
  getEmployees, 
  addEmployee, 
  updateAttendance, 
  closeMonth, 
  updateEmployee, 
  deleteEmployee 
} from '../controllers/employeeController.js';

router.route('/')
  .get(protect, getEmployees)
  .post(protect, addEmployee);
router.post('/close-month', protect, closeMonth);
router.route('/:id')
  .put(protect, updateEmployee) 
  .delete(protect, deleteEmployee);
router.put('/:id/attendance', protect, updateAttendance);

export default router;