import mongoose from 'mongoose';

const invoiceSchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  client: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Client'
  },
  // Add this field to your existing Schema
type: { 
    type: String, 
    enum: ['Sale', 'Purchase'], 
    default: 'Sale' 
  },
  items: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    variantId: { type: String }, // The ID of the specific weight/size
    name: String,
    quantity: Number,
    price: Number
  }],
  invoiceNumber: { type: String, required: true },
  customerName: { type: String, required: true },
  amount: { type: Number, required: true },
  status: { 
    type: String, 
    enum: ['Paid', 'Pending', 'Overdue'], 
    default: 'Pending' 
  },
  dueDate: { type: Date, required: true }
}, { timestamps: true });

const Invoice = mongoose.model('Invoice', invoiceSchema);
export default Invoice;