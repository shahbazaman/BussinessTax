import express from 'express';
import protect from '../middleware/authMiddleware.js';
import Account from '../models/Account.js'; // Ensure this path is correct
import { 
  getDashboardStats, 
  generateReportPDF 
} from '../controllers/dashboardController.js';

const router = express.Router();

// Fetch overall financial stats (Revenue, Pending, etc.)
router.get('/stats', protect, getDashboardStats);

// Export the Tax Report PDF
router.get('/export-pdf', protect, generateReportPDF);

/**
 * GET /api/dashboard/accounts
 * Purpose: Fetches the user's bank accounts to display balances on the dashboard.
 * This ensures the frontend "Accounts" widget stays updated.
 */
router.get('/accounts', protect, async (req, res) => {
  try {
    // We find all accounts belonging to the logged-in user
    const accounts = await Account.find({ userId: req.user.id });
    res.json(accounts); 
  } catch (err) {
    console.error("Dashboard Accounts Error:", err.message);
    res.status(500).json({ message: 'Failed to fetch dashboard accounts' });
  }
});

export default router;