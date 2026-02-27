import mongoose from 'mongoose';

const ClientSchema = new mongoose.Schema({
  // Standardized to 'user'
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String },
  address: { type: String },
  businessName: { type: String },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Client', ClientSchema);