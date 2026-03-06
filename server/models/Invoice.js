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
    type: String 
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
    default: 0
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

// Indexes to speed up queries and ensure uniqueness per user
invoiceSchema.index({ user: 1, invoiceNumber: 1 }, { unique: true, sparse: true });
invoiceSchema.index({ user: 1, referenceNumber: 1 });

// PRE-SAVE HOOK: Financial Calculations
invoiceSchema.pre('save', async function(next) {
  try {
    const items = this.items || [];
    
    // 1. Calculate Subtotal
    const calculatedSubtotal = items.reduce((acc, item) => {
      return acc + (Number(item.price || 0) * Number(item.quantity || 0));
    }, 0);

    // 2. Calculate Tax Amount
    const calculatedTax = items.reduce((acc, item) => {
      const itemTotal = Number(item.price || 0) * Number(item.quantity || 0);
      return acc + (itemTotal * (Number(item.taxRate || 0) / 100));
    }, 0);

    // 3. Update Fields
    this.subtotal = Number(calculatedSubtotal.toFixed(2));
    this.taxAmount = Number(calculatedTax.toFixed(2));
    this.shipping = Number(this.shipping || 0);
    this.discount = Number(this.discount || 0);

    // 4. Calculate Final Total
    // Formula: Total = (Subtotal + Tax + Shipping) - Discount
    const finalTotal = (this.subtotal + this.taxAmount + this.shipping) - this.discount;
    this.totalAmount = Number(finalTotal.toFixed(2));

    next();
  } catch (error) {
    next(error); // Sends error to the Controller try-catch block
  }
});

const Invoice = mongoose.model('Invoice', invoiceSchema);
export default Invoice;