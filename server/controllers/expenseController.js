import Expense from '../models/Expense.js';
import Account from '../models/Account.js';
import mongoose from 'mongoose';

// ─── CREATE expense ───────────────────────────────────────────────────────────
export const createExpense = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { title, category, amount, currency, date, paymentMethod, paidFromAccount, notes, receiptUrl } = req.body;
    const userId = req.user._id;
    const numAmount = Number(amount);

    // Deduct from account if one is selected
    if (paidFromAccount) {
      const account = await Account.findOne({ _id: paidFromAccount, userId }).session(session);
      if (!account) {
        await session.abortTransaction();
        return res.status(404).json({ message: 'Account not found' });
      }
      if (account.balance < numAmount) {
        await session.abortTransaction();
        return res.status(400).json({
          message: `Insufficient balance in "${account.bankName}". Available: ${account.balance.toFixed(2)}`
        });
      }
      account.balance -= numAmount;
      await account.save({ session });
    }

    const expense = await Expense.create([{
      user: userId, title, category, amount: numAmount, currency,
      paymentMethod: paymentMethod || 'Bank Transfer',
      paidFromAccount: paidFromAccount || null,
      notes: notes || '', receiptUrl: receiptUrl || '',
      date: date || new Date()
    }], { session });

    await session.commitTransaction();
    res.status(201).json(expense[0]);
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ message: error.message });
  } finally {
    session.endSession();
  }
};

// ─── UPDATE expense ───────────────────────────────────────────────────────────
export const updateExpense = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const expense = await Expense.findOne({ _id: req.params.id, user: req.user._id }).session(session);
    if (!expense) { await session.abortTransaction(); return res.status(404).json({ message: 'Expense not found' }); }

    const oldAmount    = Number(expense.amount);
    const oldAccountId = expense.paidFromAccount;
    const newAmount    = Number(req.body.amount || expense.amount);
    const newAccountId = req.body.paidFromAccount || null;

    // Revert old account deduction
    if (oldAccountId) {
      const oldAcc = await Account.findOne({ _id: oldAccountId, userId: req.user._id }).session(session);
      if (oldAcc) { oldAcc.balance += oldAmount; await oldAcc.save({ session }); }
    }

    // Apply new account deduction
    if (newAccountId) {
      const newAcc = await Account.findOne({ _id: newAccountId, userId: req.user._id }).session(session);
      if (!newAcc) { await session.abortTransaction(); return res.status(404).json({ message: 'Account not found' }); }
      if (newAcc.balance < newAmount) {
        await session.abortTransaction();
        return res.status(400).json({
          message: `Insufficient balance in "${newAcc.bankName}". Available: ${newAcc.balance.toFixed(2)}`
        });
      }
      newAcc.balance -= newAmount;
      await newAcc.save({ session });
    }

    Object.assign(expense, {
      title:           req.body.title           || expense.title,
      amount:          newAmount,
      category:        req.body.category        || expense.category,
      date:            req.body.date            || expense.date,
      receiptUrl:      req.body.receiptUrl      ?? expense.receiptUrl,
      paymentMethod:   req.body.paymentMethod   || expense.paymentMethod,
      paidFromAccount: newAccountId,
      notes:           req.body.notes           ?? expense.notes,
    });

    const updated = await expense.save({ session });
    await session.commitTransaction();
    res.json(updated);
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ message: 'Update failed: ' + error.message });
  } finally {
    session.endSession();
  }
};

// ─── DELETE expense ───────────────────────────────────────────────────────────
export const deleteExpense = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const expense = await Expense.findOne({ _id: req.params.id, user: req.user._id }).session(session);
    if (!expense) { await session.abortTransaction(); return res.status(404).json({ message: 'Expense not found or not authorized' }); }

    // Refund account balance
    if (expense.paidFromAccount) {
      const account = await Account.findOne({ _id: expense.paidFromAccount, userId: req.user._id }).session(session);
      if (account) { account.balance += Number(expense.amount); await account.save({ session }); }
    }

    await expense.deleteOne({ session });
    await session.commitTransaction();
    res.json({ message: 'Expense deleted and balance refunded' });
  } catch (error) {
    await session.abortTransaction();
    if (error.kind === 'ObjectId') return res.status(404).json({ message: 'Invalid ID format' });
    res.status(500).json({ message: 'Server Error: ' + error.message });
  } finally {
    session.endSession();
  }
};