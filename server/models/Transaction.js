import mongoose from 'mongoose';

const TransactionSchema = new mongoose.Schema({
  // Use userId to match your Auth and Employee logic
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  fromAccount: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Account', 
    required: true 
  },
  // Made optional because Expenses (like Payroll) don't have a "toAccount" in the system
  toAccount: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Account',
    required: false 
  },
  amount: { 
    type: Number, 
    required: true 
  },
  // Added Type to distinguish between money moving in vs out
  type: {
    type: String,
    enum: ['Income', 'Expense', 'Transfer'],
    required: true,
    default: 'Transfer'
  },
  // Added Category for your Reports tab
  category: {
    type: String,
    default: 'General'
  },
  description: { 
    type: String, 
    default: 'Internal Transfer' 
  },
  status: { 
    type: String, 
    enum: ['Completed', 'Pending', 'Failed'], 
    default: 'Completed' 
  },
  timestamp: { 
    type: Date, 
    default: Date.now 
  }
}, { timestamps: true });

export default mongoose.model('Transaction', TransactionSchema);