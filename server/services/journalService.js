// server/services/journalService.js
import LedgerAccount from '../models/LedgerAccount.js';
import JournalEntry  from '../models/JournalEntry.js';

/**
 * Get or create a system ledger account by name for a user.
 * System accounts: Accounts Receivable, Sales Revenue, etc.
 */
export const getSystemAccount = async (userId, name, type, session) => {
  let acc = await LedgerAccount.findOne({ userId, name }).session(session);
  if (!acc) {
    [acc] = await LedgerAccount.create([{
      userId, name, type, isSystem: true, isActive: true
    }], { session });
  }
  return acc;
};

/**
 * Create a double-entry journal entry (always Dr + Cr together).
 * debitAccountId and creditAccountId must be LedgerAccount _id values.
 */
export const createJournalEntry = async ({
  userId, debitAccountId, creditAccountId,
  amount, date, description, narration,
  sourceType, sourceId, entrySequence = 1, session
}) => {
  const [entry] = await JournalEntry.create([{
    userId, debitAccount: debitAccountId, creditAccount: creditAccountId,
    amount, date: date || new Date(), description, narration,
    sourceType, sourceId, entrySequence
  }], { session });
  return entry;
};

/**
 * Reverse all journal entries for a given source (e.g. cancelled invoice).
 * Creates mirror entries with debit/credit swapped.
 */
export const reverseJournalEntries = async ({ userId, sourceId, sourceType, date, session }) => {
  const originals = await JournalEntry.find({ userId, sourceId, sourceType, isReversed: false }).session(session);
  for (const orig of originals) {
    await JournalEntry.create([{
      userId,
      debitAccount:  orig.creditAccount,  // swapped
      creditAccount: orig.debitAccount,   // swapped
      amount: orig.amount,
      date: date || new Date(),
      description: `Reversal: ${orig.description}`,
      narration: `Reversal of entry ${orig._id}`,
      sourceType, sourceId,
      isReversed: false,
      reversalOf: orig._id,
    }], { session });
    // Mark original as reversed
    await JournalEntry.findByIdAndUpdate(orig._id, { isReversed: true }, { session });
  }
};