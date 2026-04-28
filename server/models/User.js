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
  phone: { type: String, default: '' },
  businessAddress: { type: String, default: '' },
  state: { type: String, default: '' },
  gstNumber: { type: String, default: '' },
  companyName: { type: String },
  logo: { type: String, default: '' },
  profilePhoto: { type: String, default: '' },
  bankName:      { type: String, default: '' },
  bankAccount:   { type: String, default: '' },
  bankIfsc:      { type: String, default: '' },
  bankBranch:    { type: String, default: '' },
  upiId:         { type: String, default: '' },
  role: { type: String, enum: ['Admin', 'User'], default: 'Admin' },
  // Add this field to your existing userSchema
customUnits: {
  type: [String],
  default: []
},
}, { timestamps: true });

// Corrected Async Pre-save Hook
// UserSchema.pre('save', async function () {
//   if (!this.isModified('password')) return; // No next() needed
  
//   const salt = await bcrypt.genSalt(10);
//   this.password = await bcrypt.hash(this.password, salt);
// });
// Remove 'next' from the parameters
UserSchema.pre('save', async function () {
  // Just use 'return' instead of 'next()'
  if (!this.isModified('password')) return; 

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  } catch (error) {
    throw error; // Mongoose will catch this as a save error
  }
});

export default mongoose.model('User', UserSchema);