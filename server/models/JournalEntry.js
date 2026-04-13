// server/models/JournalEntry.js
import mongoose from 'mongoose';

const JournalEntrySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // The two sides of the double entry
  debitAccount:  { type: mongoose.Schema.Types.ObjectId, ref: 'LedgerAccount', required: true },
  creditAccount: { type: mongoose.Schema.Types.ObjectId, ref: 'LedgerAccount', required: true },

  amount:      { type: Number, required: true },
  date:        { type: Date,   default: Date.now },
  description: { type: String, trim: true },
  narration:   { type: String, trim: true }, // e.g. "Invoice #INV-001 created"

  // Link back to the source document
  sourceType: { type: String, enum: ['Invoice', 'Expense', 'Transfer', 'Manual'] },
  sourceId:   { type: mongoose.Schema.Types.ObjectId },

  // Optional: track which "entry number" in a sequence for a given source
  entrySequence: { type: Number, default: 1 }, // 1=first entry, 2=payment entry, etc.

  isReversed: { type: Boolean, default: false }, // for cancelled invoices
  reversalOf: { type: mongoose.Schema.Types.ObjectId, ref: 'JournalEntry' },
}, { timestamps: true });

JournalEntrySchema.index({ userId: 1, date: -1 });
JournalEntrySchema.index({ sourceId: 1, sourceType: 1 });
export default mongoose.model('JournalEntry', JournalEntrySchema);