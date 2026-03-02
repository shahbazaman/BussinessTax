import express from 'express';
import { getMonthlyReport } from '../controllers/analyticsController.js';
import protect from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/monthly-report', protect, getMonthlyReport);

export default router;