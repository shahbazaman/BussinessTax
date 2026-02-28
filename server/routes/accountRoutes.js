import express from 'express';
import mongoose from 'mongoose'; 
import Account from '../models/Account.js';
import protect from '../middleware/authMiddleware.js'; 
import Transaction from '../models/Transaction.js';
import { updatePassword } from '../controllers/authController.js';
const router = express.Router();
router.get('/', protect, async (req, res) => {
  try {
    const accounts = await Account.find({ userId: req.user._id });
    res.json(accounts);
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});
router.post('/', protect, async (req, res) => {
  try {
    const { bankName, balance, accountType, accountNumber } = req.body;
    if (!bankName || !accountType) {
      return res.status(400).json({ message: "Bank Name and Account Type are required" });
    }
    const existing = await Account.findOne({ accountNumber, userId: req.user._id });
    if (existing && accountNumber) {
      return res.status(400).json({ message: "You have already added this account number" });
    }
    const newAccount = new Account({
      userId: req.user._id,
      bankName: bankName.trim(),
      balance: parseFloat(balance) || 0,
      accountType,
      accountNumber
    });    
    await newAccount.save();
    res.status(201).json(newAccount);
  } catch (err) {
    console.error("Account Add Error:", err);
    if (err.code === 11000) {
       return res.status(400).json({ message: "Account number must be unique" });
    }
    res.status(400).json({ message: err.message });
  }
});
router.get('/transactions', protect, async (req, res) => {
  try {
    const transactions = await Transaction.find({ userId: req.user._id })
      .populate('fromAccount', 'bankName')
      .populate('toAccount', 'bankName')
      .sort({ createdAt: -1 });
    res.json(transactions);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching transactions' });
  }
});
router.post('/transfer', protect, async (req, res) => {
  const { fromId, toId, amount, description } = req.body;
  const transferAmount = Number(amount);
  if (!fromId || !toId || transferAmount <= 0) {
    return res.status(400).json({ message: 'Invalid transfer details' });
  }
  if (fromId === toId) {
    return res.status(400).json({ message: 'Cannot transfer to the same account' });
  }
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const fromAcc = await Account.findOne({ _id: fromId, userId: req.user._id }).session(session);
    const toAcc = await Account.findOne({ _id: toId, userId: req.user._id }).session(session);
    if (!fromAcc || !toAcc) throw new Error('Account not found or unauthorized');
    if (fromAcc.balance < transferAmount) throw new Error('Insufficient funds');
    fromAcc.balance -= transferAmount;
    toAcc.balance += transferAmount;
    await fromAcc.save({ session });
    await toAcc.save({ session });
    const transactionRecord = new Transaction({
      userId: req.user._id,
      fromAccount: fromId,
      toAccount: toId,
      amount: transferAmount,
      description: description || `Internal Transfer`,
      type: 'Transfer',
      status: 'Completed'
    });
    await transactionRecord.save({ session });
    await session.commitTransaction();
    res.json({ message: 'Transfer successful', newBalance: fromAcc.balance });
  } catch (err) {
    await session.abortTransaction();
    res.status(400).json({ message: err.message });
  } finally {
    session.endSession();
  }
});
router.delete('/:id', protect, async (req, res) => {
  try {
    const account = await Account.findOne({ _id: req.params.id, userId: req.user._id });
    if (!account) return res.status(404).json({ message: "Account not found" });
    if (account.balance > 0) {
      return res.status(400).json({ message: "Cannot delete account with remaining balance. Transfer funds first." });
    }
    await Account.findByIdAndDelete(req.params.id);
    res.json({ message: "Account deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server Error" });
  }
});
router.put('/update-password', protect, updatePassword);
export default router;