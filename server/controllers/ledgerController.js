import Invoice from '../models/Invoice.js';
import Expense from '../models/Expense.js';
import Transaction from '../models/Transaction.js';
import Account from '../models/Account.js';
import mongoose from 'mongoose';

/**
 * GET /api/ledger
 * Returns a unified ledger: all invoices, expenses, and transfers for the user,
 * merged and sorted by date, with running balance per account (or overall).
 *
 * Query params:
 *   accountId  - filter by a specific account (optional)
 *   startDate  - ISO date string (optional)
 *   endDate    - ISO date string (optional)
 *   type       - 'all' | 'income' | 'expense' | 'transfer' (optional, default 'all')
 */
export const getLedger = async (req, res) => {
  try {
    const userId = req.user._id;
    const { accountId, startDate, endDate, type } = req.query;

    // --- Build date filter ---
    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      dateFilter.$lte = end;
    }

    // ---- 1. Fetch Invoices (Sales = Credit / Purchases = Debit) ----
    const invoiceQuery = { user: userId };
    if (Object.keys(dateFilter).length) invoiceQuery.invoiceDate = dateFilter;

    const invoices = await Invoice.find(invoiceQuery)
      .populate('client', 'name')
      .populate('paidIntoAccount', 'bankName')
      .lean();

    const invoiceEntries = invoices.map(inv => ({
      _id: inv._id,
      date: inv.invoiceDate || inv.createdAt,
      description: inv.type === 'Purchase'
        ? `Purchase: ${inv.clientName || inv.client?.name || 'Vendor'}`
        : `Invoice: ${inv.clientName || inv.client?.name || 'Customer'}`,
      reference: inv.invoiceNumber || inv.purchaseNumber || inv.referenceNumber || '',
      category: inv.type === 'Purchase' ? 'Purchase' : 'Sales',
      entryType: inv.type === 'Purchase' ? 'debit' : 'credit',
      amount: Number(inv.totalAmount || inv.grandTotal || 0),
      account: inv.paidIntoAccount?.bankName || '—',
      accountId: inv.paidIntoAccount?._id || null,
      status: inv.status || 'Pending',
      source: 'invoice',
      rawType: inv.type === 'Purchase' ? 'expense' : 'income',
    }));

    // ---- 2. Fetch Expenses (Debit) ----
    const expenseQuery = { user: userId };
    if (Object.keys(dateFilter).length) expenseQuery.date = dateFilter;

    const expenses = await Expense.find(expenseQuery)
      .populate('paidFromAccount', 'bankName')
      .lean();

    const expenseEntries = expenses.map(exp => ({
      _id: exp._id,
      date: exp.date || exp.createdAt,
      description: `Expense: ${exp.title}`,
      reference: exp.category || '',
      category: exp.category || 'Other',
      entryType: 'debit',
      amount: Number(exp.amount || 0),
      account: exp.paidFromAccount?.bankName || '—',
      accountId: exp.paidFromAccount?._id || null,
      status: exp.status || 'Paid',
      source: 'expense',
      rawType: 'expense',
    }));

    // ---- 3. Fetch Internal Transfers ----
    const transQuery = { userId };
    if (Object.keys(dateFilter).length) transQuery.transferDate = dateFilter;

    const transactions = await Transaction.find(transQuery)
      .populate('fromAccount', 'bankName')
      .populate('toAccount', 'bankName')
      .lean();

    // Each transfer creates two entries (debit from source, credit to dest)
    const transferEntries = [];
    transactions.forEach(txn => {
      transferEntries.push({
        _id: `${txn._id}_debit`,
        date: txn.transferDate || txn.createdAt,
        description: `Transfer to ${txn.toAccount?.bankName || 'Account'}`,
        reference: txn.description || '',
        category: 'Transfer',
        entryType: 'debit',
        amount: Number(txn.amount || 0),
        account: txn.fromAccount?.bankName || '—',
        accountId: txn.fromAccount?._id || null,
        status: txn.status || 'Completed',
        source: 'transfer',
        rawType: 'transfer',
      });
      transferEntries.push({
        _id: `${txn._id}_credit`,
        date: txn.transferDate || txn.createdAt,
        description: `Transfer from ${txn.fromAccount?.bankName || 'Account'}`,
        reference: txn.description || '',
        category: 'Transfer',
        entryType: 'credit',
        amount: Number(txn.amount || 0),
        account: txn.toAccount?.bankName || '—',
        accountId: txn.toAccount?._id || null,
        status: txn.status || 'Completed',
        source: 'transfer',
        rawType: 'transfer',
      });
    });

    // ---- 4. Merge and filter ----
    let allEntries = [...invoiceEntries, ...expenseEntries, ...transferEntries];

    // Filter by accountId if provided
    if (accountId && accountId !== 'all') {
      allEntries = allEntries.filter(e => e.accountId && String(e.accountId) === String(accountId));
    }

    // Filter by type
    if (type && type !== 'all') {
      const typeMap = { income: 'income', expense: 'expense', transfer: 'transfer' };
      if (typeMap[type]) {
        allEntries = allEntries.filter(e => e.rawType === typeMap[type]);
      }
    }

    // ---- 5. Sort by date ascending (for running balance calc) ----
    allEntries.sort((a, b) => new Date(a.date) - new Date(b.date));

    // ---- 6. Compute running balance ----
    let runningBalance = 0;
    const withBalance = allEntries.map(entry => {
      if (entry.entryType === 'credit') {
        runningBalance += entry.amount;
      } else {
        runningBalance -= entry.amount;
      }
      return { ...entry, runningBalance: Number(runningBalance.toFixed(2)) };
    });

    // Return in reverse order for UI (newest first)
    withBalance.reverse();

    // ---- 7. Summary stats ----
    const totalCredits = allEntries
      .filter(e => e.entryType === 'credit')
      .reduce((s, e) => s + e.amount, 0);
    const totalDebits = allEntries
      .filter(e => e.entryType === 'debit')
      .reduce((s, e) => s + e.amount, 0);

    // Get accounts for the filter dropdown
    const accounts = await Account.find({ userId }).lean();

    res.json({
      entries: withBalance,
      summary: {
        totalCredits: Number(totalCredits.toFixed(2)),
        totalDebits: Number(totalDebits.toFixed(2)),
        netBalance: Number((totalCredits - totalDebits).toFixed(2)),
        totalEntries: withBalance.length,
      },
      accounts: accounts.map(a => ({ _id: a._id, bankName: a.bankName, accountType: a.accountType })),
    });
  } catch (error) {
    console.error('Ledger Error:', error);
    res.status(500).json({ message: 'Failed to generate ledger: ' + error.message });
  }
};