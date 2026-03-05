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
    required: function() { return this.type === 'Sale'; } 
  },
  invoiceDate: { 
    type: Date, 
    default: Date.now 
  },
  paymentTerms: { 
    type: String 
  },
  paymentMethod: { 
    type: String, 
    enum: ['Cash', 'Bank Transfer', 'UPI', 'Card', 'Cheque'],
    default: 'Cash'
  },
  referenceNumber: { 
    type: String 
  }, 
  poNumber: { 
    type: String 
  },
  gstNumber: { type: String },
  billingAddress: { type: String },
  shippingAddress: { type: String },
  items: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    variantId: { type: String, required: true },
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
    enum: ['Paid', 'Pending', 'Partially Paid', 'Overdue', 'Draft', 'Cancelled'], 
    default: 'Pending' 
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
    ref: 'Account'
  },
  paymentDate: { 
    type: Date 
  },
  notes: {
    type: String
  }
}, { timestamps: true });

invoiceSchema.index({ user: 1, invoiceNumber: 1 }, { unique: true, sparse: true });
invoiceSchema.index({ user: 1, referenceNumber: 1 });

// Calculation Hook
invoiceSchema.pre('save', async function(next) {
  const items = this.items || [];
  
  const calculatedSubtotal = items.reduce((acc, item) => {
    return acc + (Number(item.price || 0) * Number(item.quantity || 0));
  }, 0);

  const calculatedTax = items.reduce((acc, item) => {
    const itemTotal = Number(item.price || 0) * Number(item.quantity || 0);
    return acc + (itemTotal * (Number(item.taxRate || 0) / 100));
  }, 0);

  this.subtotal = calculatedSubtotal;
  this.taxAmount = calculatedTax;
  this.shipping = Number(this.shipping || 0);
  this.discount = Number(this.discount || 0);

  this.totalAmount = (this.subtotal + this.taxAmount + this.shipping) - this.discount;
  
  next();
});

const Invoice = mongoose.model('Invoice', invoiceSchema);
export default Invoice;