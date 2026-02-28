import express from 'express';
import protect from '../middleware/authMiddleware.js';
import Account from '../models/Account.js';
import { 
  getDashboardStats, 
  generateReportPDF 
} from '../controllers/dashboardController.js';
const router = express.Router();
router.get('/stats', protect, getDashboardStats);
router.get('/export-pdf', protect, generateReportPDF);
router.get('/accounts', protect, async (req, res) => {
  try {
    const accounts = await Account.find({ userId: req.user.id });
    res.json(accounts); 
  } catch (err) {
    console.error("Dashboard Accounts Error:", err.message);
    res.status(500).json({ message: 'Failed to fetch dashboard accounts' });
  }
});
export default router;