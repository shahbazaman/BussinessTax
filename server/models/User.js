import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String },
  googleId: { type: String },
  businessName: { type: String, default: '' },
  currency: { type: String, default: 'USD', enum: ['USD', 'INR', 'EUR', 'GBP'] },
  taxRate: { type: Number, default: 20 },
  companyName: { type: String },
  logo: { type: String }, 
  role: { type: String, enum: ['Admin', 'User'], default: 'Admin' },
}, { timestamps: true });

// Corrected Async Pre-save Hook
UserSchema.pre('save', async function () {
  if (!this.isModified('password')) return; // No next() needed
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

export default mongoose.model('User', UserSchema);