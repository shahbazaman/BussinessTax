import mongoose from 'mongoose';

const ClientSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String },
  
  // --- New: Client Classification ---
  clientType: { 
    type: String, 
    enum: ['Individual', 'Business'], 
    default: 'Individual' 
  },

  // --- Advanced Accounting Fields ---
  businessName: { type: String },
  taxId: { type: String }, // GST, VAT, or Tax ID
  paymentTerms: { 
    type: String, 
    enum: ['Immediate', 'Net 15', 'Net 30', 'Net 60', 'Due on Receipt'], 
    default: 'Immediate' 
  },
  creditLimit: { type: Number, default: 0 },
  openingBalance: { type: Number, default: 0 },
  
  // --- Professional Address Formatting ---
  billingAddress: {
    street: String,
    city: String,
    state: String,
    zip: String,
    country: String
  },

  // --- New: Shipping Address ---
  shippingAddress: {
    street: String,
    city: String,
    state: String,
    zip: String,
    country: String
  },
  
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Client', ClientSchema);