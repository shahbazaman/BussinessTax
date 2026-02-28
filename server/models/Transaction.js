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
    required: true 
  },
  amount: { 
    type: Number, 
    required: true 
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
});
export default mongoose.model('Transaction', TransactionSchema);