// server/models/LedgerAccount.js
import mongoose from 'mongoose';

const LedgerAccountSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true, trim: true },
  code: { type: String, trim: true },   // e.g. "1100", "4000"
  type: {
    type: String,
    required: true,
    enum: ['Asset', 'Liability', 'Equity', 'Revenue', 'Expense'],
  },
  isSystem: { type: Boolean, default: false }, // system accounts can't be deleted
  description: { type: String, trim: true },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

LedgerAccountSchema.index({ userId: 1, name: 1 }, { unique: true });
export default mongoose.model('LedgerAccount', LedgerAccountSchema);