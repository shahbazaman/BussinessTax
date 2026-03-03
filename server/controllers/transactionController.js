import Transaction from '../models/Transaction.js';
import Account from '../models/Account.js';
import mongoose from 'mongoose';

export const addTransaction = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { fromAccount, toAccount, amount, type, category, description, timestamp } = req.body;
    const userId = req.user._id;

    // 1. Validation: Ensure the "fromAccount" exists and belongs to the user
    const sourceAccount = await Account.findOne({ _id: fromAccount, userId });
    if (!sourceAccount) throw new Error("Source account not found or unauthorized.");

    // 2. Core Logic based on Transaction Type
    if (type === 'Expense') {
      // Deduct from source
      sourceAccount.balance -= Number(amount);
      await sourceAccount.save({ session });
    } 
    
    else if (type === 'Income') {
      // Add to source
      sourceAccount.balance += Number(amount);
      await sourceAccount.save({ session });
    } 
    
    else if (type === 'Transfer') {
      // Must have a destination account
      if (!toAccount) throw new Error("Destination account required for transfers.");
      const destAccount = await Account.findOne({ _id: toAccount, userId });
      if (!destAccount) throw new Error("Destination account not found.");

      sourceAccount.balance -= Number(amount);
      destAccount.balance += Number(amount);

      await sourceAccount.save({ session });
      await destAccount.save({ session });
    }

    // 3. Create the Transaction Record
    const newTransaction = new Transaction({
      userId,
      fromAccount,
      toAccount: type === 'Transfer' ? toAccount : null,
      amount: Number(amount),
      type,
      category: category || 'General',
      description: description || `${type} recorded`,
      timestamp: timestamp || new Date()
    });

    await newTransaction.save({ session });
    await session.commitTransaction();

    res.status(201).json(newTransaction);
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ message: error.message });
  } finally {
    session.endSession();
  }
};

export const getTransactions = async (req, res) => {
  try {
    // We populate the bank names so the frontend can show "Bank A -> Bank B"
    const transactions = await Transaction.find({ userId: req.user._id })
      .populate('fromAccount', 'bankName')
      .populate('toAccount', 'bankName')
      .sort({ timestamp: -1 });

    res.json(transactions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteTransaction = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const transaction = await Transaction.findOne({ _id: req.params.id, userId: req.user._id });
    if (!transaction) throw new Error("Transaction not found.");

    const sourceAccount = await Account.findById(transaction.fromAccount);

    // Revert the balance changes before deleting
    if (transaction.type === 'Expense') {
      sourceAccount.balance += transaction.amount;
    } else if (transaction.type === 'Income') {
      sourceAccount.balance -= transaction.amount;
    } else if (transaction.type === 'Transfer') {
      const destAccount = await Account.findById(transaction.toAccount);
      sourceAccount.balance += transaction.amount;
      destAccount.balance -= transaction.amount;
      await destAccount.save({ session });
    }

    await sourceAccount.save({ session });
    await Transaction.findByIdAndDelete(req.params.id).session(session);

    await session.commitTransaction();
    res.json({ message: "Transaction deleted and balance reverted." });
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ message: error.message });
  } finally {
    session.endSession();
  }
};
export const getTransactionReports = async (req, res) => {
  try {
    const userId = req.user._id;

    const report = await Transaction.aggregate([
      // 1. Filter: Only this user's Expenses
      { 
        $match: { 
          userId: new mongoose.Types.ObjectId(userId), 
          type: 'Expense' 
        } 
      },
      // 2. Group: Group by category and sum the amounts
      { 
        $group: { 
          _id: "$category", 
          totalAmount: { $sum: "$amount" },
          count: { $sum: 1 }
        } 
      },
      // 3. Sort: Highest spending first
      { $sort: { totalAmount: -1 } }
    ]);

    res.json(report);
  } catch (error) {
    res.status(500).json({ message: "Report generation failed: " + error.message });
  }
};