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
  type: { 
    type: String, 
    enum: ['Sale', 'Purchase'], 
    default: 'Sale' 
  },
  items: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    variantId: { type: String }, 
    name: String,
    quantity: { type: Number, default: 1 },
    price: { type: Number, default: 0 }
  }],
  invoiceNumber: { 
    type: String, 
    required: true,
    unique: true 
  },
  customerName: { type: String, required: true },
  amount: { type: Number, required: true },
  status: { 
    type: String, 
    enum: ['Paid', 'Pending', 'Overdue'], 
    default: 'Pending' 
  },
  dueDate: { type: Date, required: true },
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
  }
}, { timestamps: true });

const Invoice = mongoose.model('Invoice', invoiceSchema);
export default Invoice;