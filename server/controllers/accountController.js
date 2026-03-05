import Account from '../models/Account.js';
import Transaction from '../models/Transaction.js';
import mongoose from 'mongoose';

// @desc    Transfer funds between accounts with full audit trail
export const transferFunds = async (req, res) => {
  const { fromId, toId, amount, notes, transferDate, receiptUrl } = req.body;
  const numAmount = Number(amount);

  // Start a Mongoose session for atomicity (prevents partial updates)
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1. Validate 'From' account and sufficient balance
    const fromAccount = await Account.findOne({ _id: fromId, userId: req.user._id }).session(session);
    if (!fromAccount || fromAccount.balance < numAmount) {
      throw new Error("Insufficient funds or source account not found");
    }

    // 2. Validate 'To' account
    const toAccount = await Account.findOne({ _id: toId, userId: req.user._id }).session(session);
    if (!toAccount) {
      throw new Error("Destination account not found");
    }

    // 3. Perform the balance swap
    fromAccount.balance -= numAmount;
    toAccount.balance += numAmount;

    await fromAccount.save({ session });
    await toAccount.save({ session });

    // 4. Create an audit record in the Transaction model
    await Transaction.create([{
      userId: req.user._id,
      fromAccount: fromId,
      toAccount: toId,
      amount: numAmount,
      type: 'Transfer',
      description: `Internal Transfer: ${fromAccount.bankName} to ${toAccount.bankName}`,
      notes: notes || '',
      transferDate: transferDate || new Date(),
      receiptUrl: receiptUrl || '',
      status: 'Completed'
    }], { session });

    // Commit changes
    await session.commitTransaction();
    session.endSession();

    res.json({ 
      success: true, 
      message: "Transfer successful",
      transferredAmount: numAmount 
    });

  } catch (err) {
    // Rollback any balance changes if something failed
    await session.abortTransaction();
    session.endSession();
    
    res.status(400).json({ 
      success: false, 
      message: "Transfer failed: " + err.message 
    });
  }
};