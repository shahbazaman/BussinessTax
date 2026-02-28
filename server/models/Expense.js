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
  category: { 
    type: String, 
    enum: ['Rent', 'Software', 'Marketing', 'Travel', 'Supplies', 'Other'],
    default: 'Other' 
  },
  status: {
    type: String,
    enum: ['Paid', 'Unpaid'],
    default: 'Paid'
  },
  receiptUrl: { 
    type: String 
  },
  expenseDate: { 
    type: Date, 
    default: Date.now 
  }
}, { 
  timestamps: true 
});

const Expense = mongoose.model('Expense', expenseSchema);

export default Expense;