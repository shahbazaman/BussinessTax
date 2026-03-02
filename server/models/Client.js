import mongoose from 'mongoose';

const ClientSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String },
  
  // --- Advanced Accounting Fields ---
  businessName: { type: String },
  taxId: { type: String }, // GST, VAT, or SSN
  paymentTerms: { 
    type: String, 
    enum: ['Immediate', 'Net 15', 'Net 30', 'Net 60'], 
    default: 'Immediate' 
  },
  creditLimit: { type: Number, default: 0 },
  openingBalance: { type: Number, default: 0 },
  
  // Separate Address Fields for better professional formatting
  billingAddress: {
    street: String,
    city: String,
    state: String,
    zip: String,
    country: String
  },
  
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Client', ClientSchema);