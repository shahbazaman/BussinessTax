import mongoose from 'mongoose';

const invoiceSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  type: { type: String, enum: ['Sale', 'Purchase'], default: 'Sale' },
  
  // Sales specific (INV-S-001)
  invoiceNumber: { type: String },
  
  // Purchase specific (INV-P-001 and INV-REF-001)
  purchaseNumber: { type: String }, 
  referenceNumber: { type: String }, 

  invoiceDate: { type: Date, default: Date.now },
  gstNumber: { type: String },
  billingAddress: { type: String },
  shippingAddress: { type: String }, 
  
  items: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },
    sku: { type: String }, 
    barcode: { type: String },
    quantity: { type: Number, default: 1 },
    price: { type: Number, default: 0 },
  }],

  subtotal: { type: Number, default: 0 },
  globalTaxRate: { type: Number, default: 0 }, 
  taxAmount: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  totalAmount: { type: Number, default: 0 },
  
  status: { 
    type: String, 
    enum: ['Paid', 'Pending', 'Partially Paid', 'Cancelled'], 
    default: 'Pending' 
  },
  
  notes: { type: String },
  paidIntoAccount: { type: mongoose.Schema.Types.ObjectId, ref: 'Account' }
}, { timestamps: true });

// Sparse indexes to handle unique numbering for both Sales and Purchases
invoiceSchema.index({ user: 1, invoiceNumber: 1 }, { unique: true, sparse: true });
invoiceSchema.index({ user: 1, purchaseNumber: 1 }, { unique: true, sparse: true });
invoiceSchema.index({ user: 1, referenceNumber: 1 }, { unique: true, sparse: true });

// PRE-SAVE HOOK: Ensures data integrity for every transaction
invoiceSchema.pre('save', function(next) {
  const items = this.items || [];
  
  // 1. Calculate Subtotal
  const calculatedSubtotal = items.reduce((acc, item) => {
    return acc + (Number(item.price || 0) * Number(item.quantity || 0));
  }, 0);

  // 2. Calculate Global Tax
  const calculatedTax = calculatedSubtotal * (Number(this.globalTaxRate || 0) / 100);

  this.subtotal = Number(calculatedSubtotal.toFixed(2));
  this.taxAmount = Number(calculatedTax.toFixed(2));
  
  // 3. Grand Total: (Subtotal + Tax) - Discount
  const finalTotal = (this.subtotal + this.taxAmount) - Number(this.discount || 0);
  this.totalAmount = Number(finalTotal.toFixed(2));

  next();
});

const Invoice = mongoose.model('Invoice', invoiceSchema);
export default Invoice;