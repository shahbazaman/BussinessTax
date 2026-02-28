import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: String,
  totalSales: { type: Number, default: 0 }
}, { timestamps: true });

const Customer = mongoose.model('Customer', customerSchema);
export default Customer;