import JournalEntry  from '../models/JournalEntry.js';
import LedgerAccount from '../models/LedgerAccount.js';
import Account       from '../models/Account.js';
import mongoose      from 'mongoose';

export const getLedger = async (req, res) => {
  try {
    const userId = req.user._id;
    const { accountId, startDate, endDate, type } = req.query;

    // Build date filter
    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      dateFilter.$lte = end;
    }

    const query = { userId };
    if (Object.keys(dateFilter).length) query.date = dateFilter;

    // Fetch all journal entries, populated with account names
    let entries = await JournalEntry.find(query)
      .populate('debitAccount',  'name type')
      .populate('creditAccount', 'name type')
      .sort({ date: 1 })
      .lean();

    // Filter by ledger account if accountId is provided
    if (accountId && accountId !== 'all') {
      entries = entries.filter(e =>
        String(e.debitAccount?._id)  === accountId ||
        String(e.creditAccount?._id) === accountId
      );
    }

    // Filter by type
    if (type && type !== 'all') {
      const typeMap = {
        income:   e => e.creditAccount?.type === 'Revenue',
        expense:  e => e.debitAccount?.type  === 'Expense',
        transfer: e => e.sourceType === 'Transfer',
      };
      if (typeMap[type]) entries = entries.filter(typeMap[type]);
    }

    // Compute running balance + format for UI
    let runningBalance = 0;
    const formatted = entries.map(e => {
      const isCredit = e.creditAccount?.type === 'Revenue';
      runningBalance += isCredit ? e.amount : -e.amount;

      return {
        _id:            e._id,
        date:           e.date,
        description:    e.description,
        narration:      e.narration || '',
        reference:      e.sourceId  || '',
        debitAccount:   e.debitAccount?.name  || '—',
        creditAccount:  e.creditAccount?.name || '—',
        debitAccountId: e.debitAccount?._id   || null,
        creditAccountId:e.creditAccount?._id  || null,
        amount:         e.amount,
        sourceType:     e.sourceType,
        entrySequence:  e.entrySequence,
        isReversed:     e.isReversed,
        runningBalance: Number(runningBalance.toFixed(2)),
        // Legacy fields so existing UI still works
        entryType:  isCredit ? 'credit' : 'debit',
        category:   e.sourceType || 'Manual',
        account:    isCredit ? (e.creditAccount?.name || '—') : (e.debitAccount?.name || '—'),
        accountId:  isCredit ? (e.creditAccount?._id  || null) : (e.debitAccount?._id  || null),
        status:     e.isReversed ? 'Reversed' : 'Completed',
        source:     (e.sourceType || 'Manual').toLowerCase(),
      };
    });

    formatted.reverse(); // newest first for UI

    const totalCredits = entries.filter(e => e.creditAccount?.type === 'Revenue').reduce((s, e) => s + e.amount, 0);
    const totalDebits  = entries.filter(e => e.debitAccount?.type  === 'Expense').reduce((s, e) => s + e.amount, 0);

    // Get ledger accounts for filter dropdown
    const ledgerAccounts = await LedgerAccount.find({ userId, isActive: true }).lean();
    const bankAccounts   = await Account.find({ userId }).lean();

    res.json({
      entries: formatted,
      summary: {
        totalCredits:  Number(totalCredits.toFixed(2)),
        totalDebits:   Number(totalDebits.toFixed(2)),
        netBalance:    Number((totalCredits - totalDebits).toFixed(2)),
        totalEntries:  formatted.length,
      },
      accounts:       bankAccounts.map(a => ({ _id: a._id, bankName: a.bankName, accountType: a.accountType })),
      ledgerAccounts: ledgerAccounts.map(a => ({ _id: a._id, name: a.name, type: a.type })),
    });
  } catch (error) {
    console.error('Ledger Error:', error);
    res.status(500).json({ message: 'Failed to generate ledger: ' + error.message });
  }
};