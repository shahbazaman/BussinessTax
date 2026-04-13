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
// GET /api/ledger-accounts/:id/entries
router.get('/:id/entries', protect, async (req, res) => {
  try {
    const JournalEntry = (await import('../models/JournalEntry.js')).default;
    const entries = await JournalEntry.find({
      userId: req.user._id,
      $or: [{ debitAccount: req.params.id }, { creditAccount: req.params.id }]
    })
    .populate('debitAccount', 'name')
    .populate('creditAccount', 'name')
    .sort({ date: 1 });

    let balance = 0;
    const rows = entries.map(e => {
      const isDr = String(e.debitAccount?._id) === req.params.id;
      balance += isDr ? e.amount : -e.amount;
      return {
        date: e.date,
        description: e.description,
        debitAccount: e.debitAccount?.name,
        creditAccount: e.creditAccount?.name,
        debit: isDr ? e.amount : null,
        credit: !isDr ? e.amount : null,
        balance: Number(balance.toFixed(2)),
        sourceType: e.sourceType,
        isReversed: e.isReversed,
      };
    });

    res.json({
      entries: rows,
      totalDebit:     Number(rows.reduce((s,r) => s+(r.debit||0),  0).toFixed(2)),
      totalCredit:    Number(rows.reduce((s,r) => s+(r.credit||0), 0).toFixed(2)),
      closingBalance: Number(balance.toFixed(2)),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
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
// GET /api/ledger-accounts/reports/trial-balance
router.get('/reports/trial-balance', protect, async (req, res) => {
  try {
    const JournalEntry = (await import('../models/JournalEntry.js')).default;
    const accounts = await LedgerAccount.find({ userId: req.user._id, isActive: true }).lean();
    const entries  = await JournalEntry.find({ userId: req.user._id }).lean();

    const rows = accounts.map(acc => {
      const debits  = entries.filter(e => String(e.debitAccount)  === String(acc._id)).reduce((s,e) => s+e.amount, 0);
      const credits = entries.filter(e => String(e.creditAccount) === String(acc._id)).reduce((s,e) => s+e.amount, 0);
      return {
        _id: acc._id, name: acc.name, type: acc.type,
        isSystem: acc.isSystem,
        totalDebit: Number(debits.toFixed(2)),
        totalCredit: Number(credits.toFixed(2)),
        balance: Number((debits - credits).toFixed(2)),
      };
    }).filter(r => r.totalDebit > 0 || r.totalCredit > 0); // hide zero accounts

    const grandDebit  = Number(rows.reduce((s,r) => s+r.totalDebit,  0).toFixed(2));
    const grandCredit = Number(rows.reduce((s,r) => s+r.totalCredit, 0).toFixed(2));

    res.json({ rows, grandDebit, grandCredit });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;