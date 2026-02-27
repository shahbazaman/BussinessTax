import express from 'express';
import mongoose from 'mongoose'; 
import Account from '../models/Account.js';
import protect from '../middleware/authMiddleware.js'; // You named it 'protect' here
import Transaction from '../models/Transaction.js';
import {updatePassword} from '../controllers/authController.js';
const router = express.Router();

// 1. Get All Accounts
router.get('/', protect, async (req, res) => {
  try {
    const accounts = await Account.find({ userId: req.user._id });
    res.json(accounts);
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// 2. Add New Account
router.post('/', protect, async (req, res) => {
  try {
    const { bankName, balance, accountType, accountNumber } = req.body;
    const newAccount = new Account({
      userId: req.user._id,
      bankName,
      balance: parseFloat(balance) || 0,
      accountType,
      accountNumber
    });
    await newAccount.save();
    res.status(201).json(newAccount);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// 3. Get Internal Transfers
router.get('/transactions', protect, async (req, res) => {
  try {
    const transactions = await Transaction.find({ userId: req.user._id })
      .populate('fromAccount', 'bankName')
      .populate('toAccount', 'bankName')
      .sort({ timestamp: -1 });

    res.json(transactions);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching transactions' });
  }
});

// 4. Perform Transfer (The Transactional Version)
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
      description: description || `Transfer from ${fromAcc.bankName} to ${toAcc.bankName}`,
      status: 'Completed'
    });

    await transactionRecord.save({ session });
    await session.commitTransaction();
    
    res.json({ message: 'Transfer successful' });

  } catch (err) {
    await session.abortTransaction();
    res.status(400).json({ message: err.message });
  } finally {
    session.endSession();
  }
});

// 5. Delete Account
router.delete('/:id', protect, async (req, res) => {
  try {
    const account = await Account.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!account) return res.status(404).json({ message: "Account not found" });
    res.json({ message: "Account deleted" });
  } catch (err) {
    res.status(500).json({ message: "Server Error" });
  }
});
router.put('/update-password', protect, updatePassword);
export default router;