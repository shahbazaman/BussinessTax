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
// GET /api/ledger-accounts/reports/cash-flow
router.get('/reports/cash-flow', protect, async (req, res) => {
  try {
    const JournalEntry = (await import('../models/JournalEntry.js')).default;
    const accounts = await LedgerAccount.find({ userId: req.user._id, isActive: true }).lean();
    const entries  = await JournalEntry.find({ userId: req.user._id, isReversed: false }).lean();

    const getNet = (types) => {
      const accs = accounts.filter(a => types.includes(a.type));
      return accs.reduce((sum, acc) => {
        const dr = entries.filter(e => String(e.debitAccount)  === String(acc._id)).reduce((s,e) => s+e.amount, 0);
        const cr = entries.filter(e => String(e.creditAccount) === String(acc._id)).reduce((s,e) => s+e.amount, 0);
        // Revenue/Liability: CR increases = positive cash; Expense/Asset: DR increases = negative cash
        if (types.includes('Revenue')) return sum + (cr - dr);
        return sum + (dr - cr);
      }, 0);
    };

    const operating  = Number((getNet(['Revenue']) - getNet(['Expense'])).toFixed(2));
    const investing  = Number((-getNet(['Asset'])).toFixed(2));
    const financing  = Number(getNet(['Liability', 'Equity']).toFixed(2));
    const netCash    = Number((operating + investing + financing).toFixed(2));

    res.json({ operating, investing, financing, netCash });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
// GET /api/ledger-accounts/reports/balance-sheet
router.get('/reports/balance-sheet', protect, async (req, res) => {
  try {
    const JournalEntry = (await import('../models/JournalEntry.js')).default;
    const accounts = await LedgerAccount.find({ userId: req.user._id, isActive: true }).lean();
    const entries  = await JournalEntry.find({ userId: req.user._id, isReversed: false }).lean();

    const calcBalance = (acc) => {
      const dr = entries.filter(e => String(e.debitAccount)  === String(acc._id)).reduce((s,e) => s+e.amount, 0);
      const cr = entries.filter(e => String(e.creditAccount) === String(acc._id)).reduce((s,e) => s+e.amount, 0);
      // Assets: DR normal; Liabilities/Equity: CR normal
      return acc.type === 'Asset' ? dr - cr : cr - dr;
    };

    const byType = (type) => accounts
      .filter(a => a.type === type)
      .map(a => ({ name: a.name, balance: Number(calcBalance(a).toFixed(2)) }))
      .filter(a => a.balance !== 0);

    const assets      = byType('Asset');
    const liabilities = byType('Liability');
    const equity      = byType('Equity');

    const totalAssets      = Number(assets.reduce((s,a) => s+a.balance, 0).toFixed(2));
    const totalLiabilities = Number(liabilities.reduce((s,a) => s+a.balance, 0).toFixed(2));
    const totalEquity      = Number(equity.reduce((s,a) => s+a.balance, 0).toFixed(2));

    res.json({ assets, liabilities, equity, totalAssets, totalLiabilities, totalEquity });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
// PUT /api/ledger-accounts/:id  (edit non-system accounts)
router.put('/:id', protect, async (req, res) => {
  try {
    const acc = await LedgerAccount.findOne({ _id: req.params.id, userId: req.user._id });
    if (!acc) return res.status(404).json({ message: 'Not found' });
    if (acc.isSystem) return res.status(400).json({ message: 'Cannot edit a system account' });
    const { name, code, description } = req.body;
    if (name) acc.name = name.trim();
    if (code !== undefined) acc.code = code.trim();
    if (description !== undefined) acc.description = description.trim();
    await acc.save();
    res.json(acc);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});
export default router;