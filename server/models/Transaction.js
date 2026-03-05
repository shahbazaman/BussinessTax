import mongoose from 'mongoose';

const TransactionSchema = new mongoose.Schema({
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
  toAccount: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Account',
    required: false 
  },
  amount: { 
    type: Number, 
    required: true 
  },
  type: {
    type: String,
    enum: ['Income', 'Expense', 'Transfer'],
    required: true,
    default: 'Transfer'
  },
  category: {
    type: String,
    default: 'General'
  },
  description: { 
    type: String, 
    default: 'Internal Transfer' 
  },
  // --- New Detailed Fields ---
  transferDate: {
    type: Date,
    default: Date.now
  },
  notes: {
    type: String,
    trim: true
  },
  receiptUrl: {
    type: String
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