import Account from '../models/Account.js';
import Transaction from '../models/Transaction.js';
import mongoose from 'mongoose';
import LedgerAccount from '../models/LedgerAccount.js';
import { createJournalEntry } from '../services/journalService.js';

// ─── helper: sync a bank Account → LedgerAccount ─────────────────────────────
const syncLedgerAccount = async (userId, bankName, session = null) => {
  const opts = session ? { session } : {};
  const filter = { userId, name: bankName };
  const update = {
    $setOnInsert: { userId, name: bankName, type: 'Asset', isSystem: false, isActive: true }
  };
  if (session) {
    await LedgerAccount.findOneAndUpdate(filter, update, { upsert: true, new: true, ...opts });
  } else {
    await LedgerAccount.findOneAndUpdate(filter, update, { upsert: true, new: true });
  }
};

// ─── GET all accounts ─────────────────────────────────────────────────────────
export const getAccounts = async (req, res) => {
  try {
    const accounts = await Account.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json(accounts);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch accounts' });
  }
};

// ─── CREATE account ───────────────────────────────────────────────────────────
export const createAccount = async (req, res) => {
  try {
    const { bankName, accountType, accountNumber, balance, notes } = req.body;

    const account = await Account.create({
      userId: req.user._id,
      bankName,
      accountType,
      accountNumber: accountNumber || undefined,
      balance: Number(balance || 0),
      notes,
    });

    // ── Auto-sync: create matching LedgerAccount ──────────────────────────────
    try {
      await syncLedgerAccount(req.user._id, account.bankName);
    } catch (syncErr) {
      console.warn('LedgerAccount sync failed for new bank:', syncErr.message);
    }
    // ─────────────────────────────────────────────────────────────────────────

    res.status(201).json(account);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// ─── UPDATE account ───────────────────────────────────────────────────────────
export const updateAccount = async (req, res) => {
  try {
    const account = await Account.findOne({ _id: req.params.id, userId: req.user._id });
    if (!account) return res.status(404).json({ message: 'Account not found' });

    const oldBankName = account.bankName; // capture BEFORE overwriting

    Object.assign(account, {
      bankName:      req.body.bankName      || account.bankName,
      accountType:   req.body.accountType   || account.accountType,
      accountNumber: req.body.accountNumber ?? account.accountNumber,
      balance:       req.body.balance !== undefined ? Number(req.body.balance) : account.balance,
      notes:         req.body.notes         ?? account.notes,
    });

    const updatedAccount = await account.save();

    // ── Auto-sync: rename or upsert LedgerAccount ─────────────────────────────
    try {
      if (req.body.bankName && req.body.bankName !== oldBankName) {
        // Bank was renamed → rename the ledger account too
        await LedgerAccount.findOneAndUpdate(
          { userId: req.user._id, name: oldBankName },
          { $set: { name: req.body.bankName } }
        );
      } else {
        // No rename → just make sure the ledger account exists
        await syncLedgerAccount(req.user._id, updatedAccount.bankName);
      }
    } catch (syncErr) {
      console.warn('LedgerAccount sync failed on update:', syncErr.message);
    }
    // ─────────────────────────────────────────────────────────────────────────

    res.json(updatedAccount);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// ─── DELETE account ───────────────────────────────────────────────────────────
export const deleteAccount = async (req, res) => {
  try {
    const account = await Account.findOne({ _id: req.params.id, userId: req.user._id });
    if (!account) return res.status(404).json({ message: 'Account not found' });

    await account.deleteOne();

    // Deactivate the matching LedgerAccount (don't delete — historical entries still reference it)
    try {
      await LedgerAccount.findOneAndUpdate(
        { userId: req.user._id, name: account.bankName },
        { $set: { isActive: false } }
      );
    } catch (syncErr) {
      console.warn('LedgerAccount deactivation failed:', syncErr.message);
    }

    res.json({ message: 'Account deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── TRANSFER funds ───────────────────────────────────────────────────────────
export const transferFunds = async (req, res) => {
  const { fromId, toId, amount, notes, transferDate, receiptUrl } = req.body;
  const numAmount = Number(amount);

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1. Validate From account
    const fromAccount = await Account.findOne({ _id: fromId, userId: req.user._id }).session(session);
    if (!fromAccount || fromAccount.balance < numAmount) {
      throw new Error('Insufficient funds or source account not found');
    }

    // 2. Validate To account
    const toAccount = await Account.findOne({ _id: toId, userId: req.user._id }).session(session);
    if (!toAccount) {
      throw new Error('Destination account not found');
    }

    // 3. Perform balance swap
    fromAccount.balance -= numAmount;
    toAccount.balance   += numAmount;
    await fromAccount.save({ session });
    await toAccount.save({ session });

    // 4. Audit record
    await Transaction.create([{
      userId:       req.user._id,
      fromAccount:  fromId,
      toAccount:    toId,
      amount:       numAmount,
      type:         'Transfer',
      description:  `Internal Transfer: ${fromAccount.bankName} to ${toAccount.bankName}`,
      notes:        notes || '',
      transferDate: transferDate || new Date(),
      receiptUrl:   receiptUrl || '',
      status:       'Completed',
    }], { session });

    // 5. ── DOUBLE-ENTRY: Transfer ──────────────────────────────────────────────
    try {
      // Ensure both bank accounts have matching LedgerAccounts
      await syncLedgerAccount(req.user._id, fromAccount.bankName, session);
      await syncLedgerAccount(req.user._id, toAccount.bankName,   session);

      const fromLedger = await LedgerAccount.findOne({
        userId: req.user._id, name: fromAccount.bankName
      }).session(session);
      const toLedger = await LedgerAccount.findOne({
        userId: req.user._id, name: toAccount.bankName
      }).session(session);

      if (fromLedger && toLedger) {
        await createJournalEntry({
          userId:          req.user._id,
          debitAccountId:  toLedger._id,       // To account increases (Dr)
          creditAccountId: fromLedger._id,     // From account decreases (Cr)
          amount:          numAmount,
          date:            transferDate ? new Date(transferDate) : new Date(),
          description:     `Transfer: ${fromAccount.bankName} → ${toAccount.bankName}`,
          narration:       notes || '',
          sourceType:      'Transfer',
          // sourceId will be set after transaction is created — acceptable to omit here
          session,
        });
      }
    } catch (jeErr) {
      console.warn('Journal entry for transfer failed:', jeErr.message);
    }
    // ─────────────────────────────────────────────────────────────────────────

    await session.commitTransaction();

    res.json({
      success:           true,
      message:           'Transfer successful',
      transferredAmount: numAmount,
    });

  } catch (err) {
    await session.abortTransaction();
    res.status(400).json({ success: false, message: 'Transfer failed: ' + err.message });
  } finally {
    session.endSession();
  }
};