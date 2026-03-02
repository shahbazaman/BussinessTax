import mongoose from 'mongoose';

const invoiceSchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  client: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Client',
    required: true // Essential for linking revenue to specific clients
  },
  type: { 
    type: String, 
    enum: ['Sale', 'Purchase'], 
    default: 'Sale' 
  },
  invoiceNumber: { 
    type: String, 
    required: true,
    unique: true 
  },
  poNumber: { 
    type: String // Purchase Order number for corporate clients
  },
  items: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    name: { type: String, required: true },
    quantity: { type: Number, default: 1 },
    price: { type: Number, default: 0 },
    taxRate: { type: Number, default: 0 } // Item-specific tax (VAT/GST)
  }],

  // Financial Breakdown for Accounting
  subtotal: { 
    type: Number, 
    required: true,
    default: 0
  },
  taxAmount: { 
    type: Number, 
    default: 0 
  },
  discount: { 
    type: Number, 
    default: 0 
  },
  shipping: { 
    type: Number, 
    default: 0 
  },
  totalAmount: { 
    type: Number, 
    required: true 
  },

  status: { 
    type: String, 
    enum: ['Paid', 'Pending', 'Overdue', 'Draft', 'Cancelled'], 
    default: 'Pending' 
  },
  date: { 
    type: Date, 
    default: Date.now 
  },
  dueDate: { 
    type: Date, 
    required: true 
  },

  // Payment Tracking
  razorpayOrderId: { 
    type: String, 
    unique: true, 
    sparse: true 
  },
  paidIntoAccount: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Account'
  },
  paymentDate: { 
    type: Date 
  },
  notes: {
    type: String
  }
}, { timestamps: true });

// Pre-save index to ensure invoice numbers are unique per user
invoiceSchema.index({ user: 1, invoiceNumber: 1 }, { unique: true });

const Invoice = mongoose.model('Invoice', invoiceSchema);
export default Invoice;