import express from 'express';
import Transaction from '../models/Transaction.js';
import auth from '../middleware/authMiddleware.js';

const router = express.Router();

// @desc    Get all internal transfers for the logged-in user
// @route   GET /api/transactions
router.get('/', auth, async (req, res) => {
  try {
    // We find transactions belonging to the user
    // We use .populate to get the names of the banks involved
    const transactions = await Transaction.find({ userId: req.user.id })
      .populate('fromAccount', 'bankName')
      .populate('toAccount', 'bankName')
      .sort({ timestamp: -1 }); // Newest first

    res.json(transactions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching transaction history" });
  }
});

export default router;