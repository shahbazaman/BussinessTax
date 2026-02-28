import express from 'express';
import Transaction from '../models/Transaction.js';
import auth from '../middleware/authMiddleware.js';
const router = express.Router();
router.get('/', auth, async (req, res) => {
  try {
    const transactions = await Transaction.find({ userId: req.user.id })
      .populate('fromAccount', 'bankName')
      .populate('toAccount', 'bankName')
      .sort({ timestamp: -1 });
    res.json(transactions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching transaction history" });
  }
});
export default router;