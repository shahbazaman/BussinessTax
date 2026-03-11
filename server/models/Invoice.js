import mongoose from 'mongoose';

const invoiceSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  type: { type: String, enum: ['Sale', 'Purchase'], default: 'Sale' },
  
  invoiceNumber: { type: String, trim: true },
  purchaseNumber: { type: String, trim: true }, 
  referenceNumber: { type: String, trim: true }, 

  invoiceDate: { type: Date, default: Date.now },
  gstNumber: { type: String },
  billingAddress: { type: String },
  shippingAddress: { type: String }, 
  
  items: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    variantId: { type: mongoose.Schema.Types.ObjectId, required: true },
    name: String,
    quantity: { type: Number, default: 0 },
    price: { type: Number, default: 0 },
    sku: String,
    barcode: String,
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

// Sparse indexes: These ONLY work if the field is missing or undefined (not "")
invoiceSchema.index({ user: 1, invoiceNumber: 1 }, { unique: true, sparse: true });
invoiceSchema.index({ user: 1, purchaseNumber: 1 }, { unique: true, sparse: true });
invoiceSchema.index({ user: 1, referenceNumber: 1 }, { unique: true, sparse: true });

invoiceSchema.pre('save', function(next) {
  const items = this.items || [];
  
  const calculatedSubtotal = items.reduce((acc, item) => {
    return acc + (Number(item.price || 0) * Number(item.quantity || 0));
  }, 0);

  const calculatedTax = calculatedSubtotal * (Number(this.globalTaxRate || 0) / 100);

  this.subtotal = Number(calculatedSubtotal.toFixed(2));
  this.taxAmount = Number(calculatedTax.toFixed(2));
  
  const finalTotal = (this.subtotal + this.taxAmount) - Number(this.discount || 0);
  this.totalAmount = Number(finalTotal.toFixed(2));
  
  // next();
});

const Invoice = mongoose.model('Invoice', invoiceSchema);
export default Invoice;