import mongoose from 'mongoose';

const invoiceSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  type: { type: String, enum: ['Sale', 'Purchase'], default: 'Sale' },
  // Sales specific number (INV-0001)
  invoiceNumber: { type: String },
  // Purchase specific number (PI-0001)
  purchaseNumber: { type: String }, 
  invoiceDate: { type: Date, default: Date.now },
  paymentMethod: { 
    type: String, 
    enum: ['Cash', 'Bank Transfer', 'UPI', 'Card', 'Cheque'],
    default: 'Cash'
  },
  referenceNumber: { type: String }, 
  poNumber: { type: String },
  gstNumber: { type: String },
  billingAddress: { type: String },
  // shippingAddress and paymentTerms removed as per request
  items: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    variantId: { type: String, required: true },
    name: { type: String, required: true },
    quantity: { type: Number, default: 1 },
    price: { type: Number, default: 0 },
    taxRate: { type: Number, default: 0 } 
  }],
  subtotal: { type: Number, default: 0 },
  taxAmount: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  shipping: { type: Number, default: 0 }, // Kept in schema for internal calculation safety, set to 0
  totalAmount: { type: Number, default: 0 },
  globalTaxRate: { type: Number, default: 0 }, // Added to track the Global Tax applied
  status: { 
    type: String, 
    enum: ['Paid', 'Pending', 'Partially Paid', 'Overdue', 'Draft', 'Cancelled'], 
    default: 'Pending' 
  },
  // Auto-calculated in background, hidden from UI
  dueDate: { type: Date }, 
  razorpayOrderId: { type: String, unique: true, sparse: true },
  paidIntoAccount: { type: mongoose.Schema.Types.ObjectId, ref: 'Account' },
  paymentDate: { type: Date },
  notes: { type: String }
}, { timestamps: true });

// Updated index to handle unique Sales and Purchase numbers per user
invoiceSchema.index({ user: 1, invoiceNumber: 1 }, { unique: true, sparse: true });
invoiceSchema.index({ user: 1, purchaseNumber: 1 }, { unique: true, sparse: true });
invoiceSchema.index({ user: 1, referenceNumber: 1 });

// PRE-SAVE HOOK: Financial Calculations
invoiceSchema.pre('save', async function() {
  try {
    const items = this.items || [];
    const calculatedSubtotal = items.reduce((acc, item) => {
      return acc + (Number(item.price || 0) * Number(item.quantity || 0));
    }, 0);
    const netBeforeTax = calculatedSubtotal - Number(this.discount || 0);
    const calculatedTax = netBeforeTax * (Number(this.globalTaxRate || 0) / 100);

    this.subtotal = Number(calculatedSubtotal.toFixed(2));
    this.taxAmount = Number(calculatedTax.toFixed(2));
    this.shipping = 0; 
    this.discount = Number(this.discount || 0);
    const finalTotal = netBeforeTax + this.taxAmount;
    this.totalAmount = Number(finalTotal.toFixed(2));
    if (this.invoiceDate && !this.dueDate) {
      const date = new Date(this.invoiceDate);
      date.setDate(date.getDate() + 30);
      this.dueDate = date;
    }

  } catch (error) {
    throw error;
  }
});

const Invoice = mongoose.model('Invoice', invoiceSchema);
export default Invoice;