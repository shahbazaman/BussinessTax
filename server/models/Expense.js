import mongoose from 'mongoose';

const expenseSchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  title: { 
    type: String, 
    required: true,
    trim: true 
  },
  amount: { 
    type: Number, 
    required: true 
  },
  currency: { 
    type: String, 
    default: 'USD' 
  },
  convertedAmount: { 
    type: Number 
  },
  category: { 
    type: String, 
    default: 'Other',
    trim: true
  },
  // --- New Expense Tracking Fields ---
  paymentMethod: {
    type: String,
    enum: ['Bank Transfer', 'Cash', 'Card', 'UPI', 'Check', 'Other'],
    default: 'Bank Transfer'
  },
  paidFromAccount: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Account',
    required: false // Optional if paid by cash not tracked in a bank account
  },
  notes: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['Paid', 'Unpaid'],
    default: 'Paid'
  },
  receiptUrl: { 
    type: String 
  },
  date: { 
    type: Date, 
    default: Date.now 
  },
  hsnCode:    { type: String, default: '' },
gstRate:    { type: Number, default: 0 },
cgst:       { type: Number, default: 0 },
sgst:       { type: Number, default: 0 },
igst:       { type: Number, default: 0 },
gstType:    { type: String, enum: ['intra','inter','none'], default: 'none' },
vendorGstin:{ type: String, default: '' },
}, { 
  timestamps: true 
});

const Expense = mongoose.model('Expense', expenseSchema);
export default Expense;