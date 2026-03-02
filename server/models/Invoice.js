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
    required: true 
  },
  type: { 
    type: String, 
    enum: ['Sale', 'Purchase'], 
    default: 'Sale' 
  },
  invoiceNumber: { 
    type: String, 
    required: true
  },
  poNumber: { 
    type: String 
  },
  items: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    name: { type: String, required: true },
    quantity: { type: Number, default: 1 },
    price: { type: Number, default: 0 },
    taxRate: { type: Number, default: 0 } 
  }],
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
  razorpayOrderId: { 
    type: String, 
    unique: true, 
    sparse: true 
  },
  paidIntoAccount: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Account' // Updated to match your route: ./routes/accountRoutes.js
  },
  paymentDate: { 
    type: Date 
  },
  notes: {
    type: String
  }
}, { timestamps: true });
invoiceSchema.index({ user: 1, invoiceNumber: 1 }, { unique: true });
invoiceSchema.pre('save', function(next) {
  this.subtotal = this.items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  this.taxAmount = this.items.reduce((acc, item) => {
    return acc + (item.price * item.quantity * (item.taxRate / 100));
  }, 0);
  this.totalAmount = (this.subtotal + this.taxAmount + this.shipping) - this.discount;

  next();
});

const Invoice = mongoose.model('Invoice', invoiceSchema);
export default Invoice;