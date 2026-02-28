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
  // Added: Currency field to store what the user selected (USD, INR, etc.)
  currency: { 
    type: String, 
    default: 'USD' 
  },
  // Added: The result of the exchange rate conversion for your charts
  convertedAmount: { 
    type: Number 
  },
  category: { 
    type: String, 
    // Note: Removed 'enum' to allow custom "Other" categories from the frontend
    default: 'Other',
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
  }
}, { 
  timestamps: true 
});

const Expense = mongoose.model('Expense', expenseSchema);

export default Expense;