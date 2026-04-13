import express from 'express';
import protect from '../middleware/authMiddleware.js';
import LedgerAccount from '../models/LedgerAccount.js';
import { getSystemAccount } from '../services/journalService.js';
import { ACCOUNTS, ACCOUNT_TYPES } from '../services/systemAccounts.js';

const router = express.Router();

// GET all accounts for the user
router.get('/', protect, async (req, res) => {
  const accounts = await LedgerAccount.find({ userId: req.user._id, isActive: true }).sort({ type: 1, name: 1 });
  res.json(accounts);
});

// POST seed default system accounts
router.post('/seed', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    const defaults = Object.entries(ACCOUNTS).map(([, name]) => ({
      userId, name, type: ACCOUNT_TYPES[name] || 'Asset', isSystem: true,
    }));
    for (const acc of defaults) {
      await LedgerAccount.findOneAndUpdate(
        { userId, name: acc.name },
        { $setOnInsert: acc },
        { upsert: true, new: true }
      );
    }
    res.json({ message: 'System accounts seeded.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST create a custom account
router.post('/', protect, async (req, res) => {
  try {
    const { name, type, code, description } = req.body;
    const acc = await LedgerAccount.create({ userId: req.user._id, name, type, code, description });
    res.status(201).json(acc);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE an account (only non-system ones)
router.delete('/:id', protect, async (req, res) => {
  const acc = await LedgerAccount.findOne({ _id: req.params.id, userId: req.user._id });
  if (!acc) return res.status(404).json({ message: 'Not found' });
  if (acc.isSystem) return res.status(400).json({ message: 'Cannot delete a system account' });
  await acc.deleteOne();
  res.json({ message: 'Deleted' });
});

export default router;