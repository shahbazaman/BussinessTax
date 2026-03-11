import mongoose from 'mongoose';

const AccountSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  bankName: { type: String, required: [true, 'Name is required'], trim: true },
  balance: { type: Number, default: 0, min: [0, 'Balance cannot be negative'] },
  accountType: {
  type: String,
  enum: [
    'Checking Account', 'Checking', 
    'Savings Account', 'Savings', 
    'Cash', 
    'Wallet/UPI', 
    'Payment Gateway'
  ],
  default: 'Checking Account'
},
  accountNumber: { type: String, sparse: true },
  notes: { type: String, trim: true },
  createdAt: { type: Date, default: Date.now }
});

AccountSchema.index({ userId: 1, accountNumber: 1 }, { unique: true });
export default mongoose.model('Account', AccountSchema);