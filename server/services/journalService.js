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
/**
 * Get or create a ledger account by name and type for a user.
 * Alias used by paymentRoutes and other routes needing a flexible account lookup.
 * @param {string} userId
 * @param {string} name   - Account name (e.g. 'Accounts Receivable')
 * @param {string} type   - Account type (e.g. 'Asset', 'Revenue', 'Expense')
 * @param {string} [subType] - Optional sub-type (ignored if not needed by schema)
 * @param {ClientSession|null} session - Mongoose session for transactions
 */
export const getOrCreateAccount = async (userId, name, type, subType = null, session = null) => {
  const query = LedgerAccount.findOne({ userId, name });
  if (session) query.session(session);
  let acc = await query;
  if (!acc) {
    const docs = await LedgerAccount.create(
      [{ userId, name, type, isSystem: true, isActive: true }],
      session ? { session } : {}
    );
    acc = docs[0];
  }
  return acc;
};

/**
 * Sync a bank Account document to the LedgerAccount table so journal entries
 * can reference it.  If a LedgerAccount with the given name already exists for
 * this user it is left untouched; otherwise one is created.
 *
 * @param {string} userId
 * @param {string} bankName    - Human-readable bank name (e.g. 'HDFC Bank')
 * @param {string} accountId   - Account._id from the Accounts collection
 * @param {ClientSession|null} session
 * @param {*} _unused          - kept for call-site compatibility
 */
export const syncBankToLedger = async (userId, bankName, accountId, session = null, _unused = null) => {
  const name = bankName || 'Bank Account';
  const query = LedgerAccount.findOne({ userId, name });
  if (session) query.session(session);
  let ledger = await query;
  if (!ledger) {
    const docs = await LedgerAccount.create(
      [{ userId, name, type: 'Asset', isSystem: true, isActive: true, linkedAccountId: accountId }],
      session ? { session } : {}
    );
    ledger = docs[0];
  }
  return ledger;
};