import mongoose from 'mongoose';

const expenseSchema = new mongoose.Schema({
  // Reference to the user who owns this expense
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
  // Added status to support the "Unpaid Bills" stat on your dashboard
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
  timestamps: true // Automatically creates createdAt and updatedAt fields
});

const Expense = mongoose.model('Expense', expenseSchema);

export default Expense;