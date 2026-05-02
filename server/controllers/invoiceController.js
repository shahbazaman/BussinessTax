import Invoice from '../models/Invoice.js';
import Product from '../models/Product.js';
import Account from '../models/Account.js';
import mongoose from 'mongoose';
import { createJournalEntry, getSystemAccount, reverseJournalEntries } from '../services/journalService.js';
import { ACCOUNTS, ACCOUNT_TYPES } from '../services/systemAccounts.js';
import LedgerAccount from '../models/LedgerAccount.js';

const adjustAccount = async (accountId, userId, amount, direction, session) => {
  if (!accountId) return { ok: false, message: 'No account specified' };
  const account = await Account.findOne({ _id: accountId, userId }).session(session);
  if (!account) return { ok: false, message: 'Account not found' };

  if (direction === 'debit') {
    if (account.balance < amount) {
      return { ok: false, message: `Insufficient balance in "${account.bankName}". Available: ${account.balance.toFixed(2)}` };
    }
    account.balance -= amount;
  } else {
    account.balance += amount;
  }
  await account.save({ session });
  return { ok: true };
};

// ─── CREATE invoice ───────────────────────────────────────────────────────────
export const createInvoice = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const {
  client: rawClient, clientName, items, discount, type, invoiceDate, status,
  notes, globalTaxRate, gstNumber, billingAddress,
  shippingAddress, referenceNumber, invoiceNumber, purchaseNumber,
  paidIntoAccount,
  buyerState
} = req.body;
const sellerState = req.user.state || '';
const finalBuyerState = req.body.buyerState || '';

let gstType = 'none';
if (sellerState && finalBuyerState) {
  gstType = sellerState === finalBuyerState ? 'intra' : 'inter';
}

    if (!req.user?._id) return res.status(401).json({ message: 'Auth failed' });

    const client = rawClient && String(rawClient).trim() !== '' ? rawClient : undefined;
    const invoiceType = type || 'Sale';
    const field = invoiceType === 'Sale' ? 'invoiceNumber' : 'purchaseNumber';
    const numberValue = invoiceType === 'Sale' ? invoiceNumber : purchaseNumber;

    if (numberValue) {
      const existing = await Invoice.findOne({ user: req.user._id, [field]: numberValue }).session(session);
      if (existing) {
        await session.abortTransaction();
        return res.status(400).json({
          message: `${field === 'invoiceNumber' ? 'Invoice' : 'Purchase'} number "${numberValue}" already exists.`
        });
      }
    }
// ❗ FIX: Validate items before loop
if (!items || !Array.isArray(items) || items.length === 0) {
  await session.abortTransaction();
  return res.status(400).json({ message: 'Items are required' });
}
    // Validate items
    const validatedItems = [];
    for (const item of items) {
      const product = await Product.findById(item.productId).session(session);
      if (!product) { await session.abortTransaction(); return res.status(404).json({ message: 'Product not found' }); }
      const variant = product.variants.id(item.variantId);
      if (!variant) { await session.abortTransaction(); return res.status(404).json({ message: 'Variant not found' }); }
      validatedItems.push({
  productId: item.productId,
  variantId: item.variantId,
  name: item.name,
  sku: variant.sku || '',
  barcode: variant.barcode || '',
  quantity: Number(item.quantity || 0),
  price: Number(item.price || 0),
  hsnCode: item.hsnCode || '',
  taxRate: item.taxRate || 0
});
    }

    const invoice = new Invoice({
      user: req.user._id,client,sellerState,
      buyerState: finalBuyerState,gstType,
      clientName: clientName?.trim() || undefined,
      invoiceDate: invoiceDate || new Date(),
      type: invoiceType,
      invoiceNumber:   invoiceType === 'Sale'     ? (invoiceNumber  || undefined) : undefined,
      purchaseNumber:  invoiceType === 'Purchase'  ? (purchaseNumber || undefined) : undefined,
      referenceNumber: referenceNumber?.trim() || undefined,
      gstNumber, billingAddress, shippingAddress,
      items: validatedItems,
      discount: Number(discount || 0),
      globalTaxRate: Number(globalTaxRate || 0),
      status: status || 'Pending',
      notes,
      paidIntoAccount: paidIntoAccount || undefined
    });

    const savedInvoice = await invoice.save({ session });
const invoiceAmount = savedInvoice.totalAmount;

// ── Define these BEFORE the double-entry block ──
const isPaid    = status === 'Paid';
const isSale    = invoiceType === 'Sale';
const accountId = paidIntoAccount;

// ── DOUBLE-ENTRY: Invoice Created ────
// if (isSale) {
//   // Always post Dr Accounts Receivable / Cr Sales Revenue on invoice creation
//   const arAccount  = await getSystemAccount(req.user._id, ACCOUNTS.ACCOUNTS_RECEIVABLE, 'Asset', session);
//   const revAccount = await getSystemAccount(req.user._id, ACCOUNTS.SALES_REVENUE, 'Revenue', session);

//   await createJournalEntry({
//     userId: req.user._id,
//     debitAccountId:  arAccount._id,
//     creditAccountId: revAccount._id,
//     amount: invoiceAmount,
//     date: savedInvoice.invoiceDate,
//     description: `Invoice: ${savedInvoice.invoiceNumber || savedInvoice.referenceNumber || savedInvoice._id}`,
//     narration: `Sale to ${savedInvoice.clientName || 'Customer'}`,
//     sourceType: 'Invoice',
//     sourceId: savedInvoice._id,
//     entrySequence: 1,
//     session,
//   });

//   // If invoice is immediately Paid, also post the payment entry
// if (isPaid && accountId) {
//   // Get the actual bank name from the Account record
//   const bankAccountDoc = await Account.findById(accountId).session(session);
//   const bankName = bankAccountDoc?.bankName || 'Bank Account';

//   // Find or create a LedgerAccount with the same name
//   let bankLedgerAccount = await LedgerAccount.findOne({
//     userId: req.user._id, name: bankName
//   }).session(session);
//   if (!bankLedgerAccount) {
//     [bankLedgerAccount] = await LedgerAccount.create([{
//       userId: req.user._id, name: bankName, type: 'Asset', isSystem: false
//     }], { session });
//   }

//   await createJournalEntry({
//     userId: req.user._id,
//     debitAccountId:  bankLedgerAccount._id,
//     creditAccountId: arAccount._id,
//     amount: invoiceAmount,
//     date: savedInvoice.invoiceDate,
//     description: `Payment received: ${savedInvoice.invoiceNumber || savedInvoice._id}`,
//     narration: `Payment from ${savedInvoice.clientName || 'Customer'}`,
//     sourceType: 'Invoice',
//     sourceId: savedInvoice._id,
//     entrySequence: 2,
//     session,
//   });
// }
// }
// ── DOUBLE-ENTRY: Invoice Created ────
if (isSale) {
  // Dr Accounts Receivable / Cr Sales Revenue
  const arAccount  = await getSystemAccount(req.user._id, ACCOUNTS.ACCOUNTS_RECEIVABLE, 'Asset', session);
  const revAccount = await getSystemAccount(req.user._id, ACCOUNTS.SALES_REVENUE, 'Revenue', session);

  await createJournalEntry({
    userId: req.user._id,
    debitAccountId:  arAccount._id,
    creditAccountId: revAccount._id,
    amount: invoiceAmount,
    date: savedInvoice.invoiceDate,
    description: `Invoice: ${savedInvoice.invoiceNumber || savedInvoice.referenceNumber || savedInvoice._id}`,
    narration: `Sale to ${savedInvoice.clientName || 'Customer'}`,
    sourceType: 'Invoice',
    sourceId: savedInvoice._id,
    entrySequence: 1,
    session,
  });

  // If paid immediately → Dr Bank / Cr AR
  if (isPaid && accountId) {
    const bankAccountDoc = await Account.findById(accountId).session(session);
    if (!bankAccountDoc) {
  throw new Error('Bank account not found');
}

const bankName = bankAccountDoc.bankName && bankAccountDoc.bankName.trim() !== ''
  ? bankAccountDoc.bankName
  : 'Bank Account';
    let bankLedgerAccount = await LedgerAccount.findOne({ userId: req.user._id, name: bankName }).session(session);
    if (!bankLedgerAccount) {
      [bankLedgerAccount] = await LedgerAccount.create([{
        userId: req.user._id, name: bankName, type: 'Asset', isSystem: false
      }], { session });
    }
    await createJournalEntry({
      userId: req.user._id,
      debitAccountId:  bankLedgerAccount._id,
      creditAccountId: arAccount._id,
      amount: invoiceAmount,
      date: savedInvoice.invoiceDate,
      description: `Payment received: ${savedInvoice.invoiceNumber || savedInvoice._id}`,
      narration: `Payment from ${savedInvoice.clientName || 'Customer'}`,
      sourceType: 'Invoice',
      sourceId: savedInvoice._id,
      entrySequence: 2,
      session,
    });
  }

} else {
  // ── PURCHASE INVOICE double-entry ──────────────────────────────────────
  // Dr Purchase/COGS (Expense ↑) / Cr Accounts Payable (Liability ↑)
  const purchaseAccount = await getSystemAccount(req.user._id, ACCOUNTS.PURCHASE_EXPENSE, 'Expense', session);
  const apAccount = await getSystemAccount(req.user._id, ACCOUNTS.ACCOUNTS_PAYABLE, 'Liability', session);

  await createJournalEntry({
    userId: req.user._id,
    debitAccountId:  purchaseAccount._id,
    creditAccountId: apAccount._id,
    amount: invoiceAmount,
    date: savedInvoice.invoiceDate,
    description: `Purchase: ${savedInvoice.purchaseNumber || savedInvoice.referenceNumber || savedInvoice._id}`,
    narration: `Purchase from ${savedInvoice.clientName || 'Vendor'}`,
    sourceType: 'Invoice',
    sourceId: savedInvoice._id,
    entrySequence: 1,
    session,
  });

  // If paid immediately → Dr Accounts Payable / Cr Bank (cash paid out)
  if (isPaid && accountId) {
    const bankAccountDoc = await Account.findById(accountId).session(session);

if (!bankAccountDoc) {
  throw new Error('Bank account not found');
}

const bankName = bankAccountDoc.bankName && bankAccountDoc.bankName.trim() !== ''
  ? bankAccountDoc.bankName
  : 'Bank Account';

let bankLedgerAccount = await LedgerAccount.findOne({
  userId: req.user._id,
  name: bankName
}).session(session);

if (!bankLedgerAccount) {
  [bankLedgerAccount] = await LedgerAccount.create([{
    userId: req.user._id,
    name: bankName,
    type: 'Asset',
    isSystem: false
  }], { session });
}
    await createJournalEntry({
      userId: req.user._id,
      debitAccountId:  apAccount._id,
      creditAccountId: bankLedgerAccount._id,
      amount: invoiceAmount,
      date: savedInvoice.invoiceDate,
      description: `Payment made: ${savedInvoice.purchaseNumber || savedInvoice._id}`,
      narration: `Payment to ${savedInvoice.clientName || 'Vendor'}`,
      sourceType: 'Invoice',
      sourceId: savedInvoice._id,
      entrySequence: 2,
      session,
    });
  }
}
    if (accountId) {
  let result = { ok: true };

  if (isSale && isPaid) {
    result = await adjustAccount(accountId, req.user._id, invoiceAmount, 'credit', session);
  } else if (!isSale && isPaid) {
    result = await adjustAccount(accountId, req.user._id, invoiceAmount, 'debit', session);
  }

  if (!result.ok) {
    await session.abortTransaction();
    return res.status(400).json({ message: result.message });
  }
}

    // Adjust stock
    for (const item of validatedItems) {
      const adjustment = invoiceType === 'Purchase' ? item.quantity : -item.quantity;
      await Product.updateOne(
        { _id: item.productId, 'variants._id': item.variantId },
        { $inc: { 'variants.$.stock': adjustment } }
      ).session(session);
    }

    await session.commitTransaction();
    res.status(201).json(savedInvoice);

  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({ message: error.message });
  } finally {
    session.endSession();
  }
};

// ─── UPDATE invoice ───────────────────────────────────────────────────────────
export const updateInvoice = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const invoice = await Invoice.findById(req.params.id).session(session);
    if (!invoice) { await session.abortTransaction(); return res.status(404).json({ message: 'Invoice not found' }); }

    const oldStatus    = invoice.status;
    const oldAmount    = invoice.totalAmount;
    const oldAccountId = invoice.paidIntoAccount;
    const isSale       = invoice.type === 'Sale';

    // Revert stock from old items
    for (const item of invoice.items) {
      const revertQty = invoice.type === 'Purchase' ? -item.quantity : item.quantity;
      await Product.updateOne(
        { _id: item.productId, 'variants._id': item.variantId },
        { $inc: { 'variants.$.stock': revertQty } }
      ).session(session);
    }

    // ── Revert old account effect ─────────────────────────────────────────
    if (oldAccountId) {
      if (isSale && oldStatus === 'Paid') {
        // Was credited → reverse by debiting
        await adjustAccount(oldAccountId, req.user._id, oldAmount, 'debit', session);
      } else if (!isSale) {
        // Was debited → reverse by crediting
        await adjustAccount(oldAccountId, req.user._id, oldAmount, 'credit', session);
      }
    }

    // Apply updated fields
    Object.assign(invoice, {
      ...req.body,
      client: (req.body.client && String(req.body.client).trim() !== '') ? req.body.client : undefined,
      invoiceNumber:  invoice.invoiceNumber,
      purchaseNumber: invoice.purchaseNumber
    });

const sellerState = req.user.state || '';
const finalBuyerState = req.body.buyerState || '';

invoice.sellerState = sellerState;
invoice.buyerState = finalBuyerState;

if (sellerState && finalBuyerState) {
  invoice.gstType = sellerState === finalBuyerState ? 'intra' : 'inter';
} else {
  invoice.gstType = 'none';
}
    const updatedInvoice = await invoice.save({ session });
    const newAmount    = updatedInvoice.totalAmount;
    const newStatus    = updatedInvoice.status;
    const newAccountId = updatedInvoice.paidIntoAccount;

    // ── Apply new account effect ──────────────────────────────────────────
    if (newAccountId) {
  let result;

  if (isSale && newStatus === 'Paid') {
    result = await adjustAccount(newAccountId, req.user._id, newAmount, 'credit', session);
  } else if (!isSale) {
    result = await adjustAccount(newAccountId, req.user._id, newAmount, 'debit', session);
  }

  if (result && !result.ok) {
    await session.abortTransaction();
    return res.status(400).json({ message: result.message });
  }
}
    // ── DOUBLE-ENTRY: Status changed to Paid ─────────────────────────────────────
const wasJustPaid = newStatus === 'Paid' && oldStatus !== 'Paid' && isSale;
if (wasJustPaid && newAccountId) {
  const arAccount   = await getSystemAccount(req.user._id, ACCOUNTS.ACCOUNTS_RECEIVABLE, 'Asset', session);
  const bankAccount = await getSystemAccount(req.user._id, ACCOUNTS.BANK_DEFAULT, 'Asset', session);

  await createJournalEntry({
    userId: req.user._id,
    debitAccountId:  bankAccount._id,
    creditAccountId: arAccount._id,
    amount: newAmount,
    date: new Date(),
    description: `Payment received: ${updatedInvoice.invoiceNumber || updatedInvoice._id}`,
    narration: `Payment from ${updatedInvoice.clientName || 'Customer'}`,
    sourceType: 'Invoice',
    sourceId: updatedInvoice._id,
    entrySequence: 2,
    session,
  });
}

// ── DOUBLE-ENTRY: Invoice Cancelled → reverse all entries ────────────────────
const wasJustCancelled = newStatus === 'Cancelled' && oldStatus !== 'Cancelled';
if (wasJustCancelled) {
  await reverseJournalEntries({
    userId: req.user._id,
    sourceId: invoice._id,
    sourceType: 'Invoice',
    date: new Date(),
    session,
  });
}
// ─────────────────────────────────────────────────────────────────────────────

    // Apply new stock adjustments
    for (const item of updatedInvoice.items) {
      const adjustment = updatedInvoice.type === 'Purchase' ? item.quantity : -item.quantity;
      await Product.updateOne(
        { _id: item.productId, 'variants._id': item.variantId },
        { $inc: { 'variants.$.stock': adjustment } }
      ).session(session);
    }

    await session.commitTransaction();
    res.json(updatedInvoice);

  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({ message: 'Update failed: ' + error.message });
  } finally {
    session.endSession();
  }
};

// ─── GET invoices 
export const getInvoices = async (req, res) => {
  try {
    const {
      page    = 1,
      limit   = 20,
      type,           
      status,         
      search,         
    } = req.query;

    const pageNum  = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit))); 
    const skip     = (pageNum - 1) * limitNum;
    const filter = { user: req.user._id };
    if (type)   filter.type   = type;
    if (status) filter.status = status;
    if (search) {
      const regex = new RegExp(search, 'i');
      filter.$or = [
        { clientName:     regex },
        { invoiceNumber:  regex },
        { purchaseNumber: regex },
        { referenceNumber: regex },
      ];
    }

    const [invoices, total] = await Promise.all([
      Invoice.find(filter)
        .populate('client', 'name email phone taxId billingAddress shippingAddress')
        .populate('paidIntoAccount', 'bankName accountType')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),                      
      Invoice.countDocuments(filter), 
    ]);

    res.json({
      data:       invoices,
      total,
      page:       pageNum,
      totalPages: Math.ceil(total / limitNum),
      limit:      limitNum,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching invoices', error: error.message });
  }
};

// ─── DELETE invoice ───────────────────────────────────────────────────────────
export const deleteInvoice = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const invoice = await Invoice.findById(req.params.id).session(session);
    if (!invoice) { await session.abortTransaction(); return res.status(404).json({ message: 'Not found' }); }

    const isSale = invoice.type === 'Sale';

    // Revert account balance
    if (invoice.paidIntoAccount) {
      if (isSale && invoice.status === 'Paid') {
        await adjustAccount(invoice.paidIntoAccount, req.user._id, invoice.totalAmount, 'debit', session);
      } else if (!isSale) {
        await adjustAccount(invoice.paidIntoAccount, req.user._id, invoice.totalAmount, 'credit', session);
      }
    }

    // Revert stock
    for (const item of invoice.items) {
      const revertQty = invoice.type === 'Purchase' ? -item.quantity : item.quantity;
      await Product.updateOne(
        { _id: item.productId, 'variants._id': item.variantId },
        { $inc: { 'variants.$.stock': revertQty } }
      ).session(session);
    }
    await reverseJournalEntries({
      userId: req.user._id,
      sourceId: invoice._id,
      sourceType: 'Invoice',
      date: new Date(),
      session,
    });
    await invoice.deleteOne({ session });
    await session.commitTransaction();
    res.json({ message: 'Invoice removed, stock & balance reverted' });

  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({ message: 'Deletion failed: ' + error.message });
  } finally {
    session.endSession();
  }
};

// ─── UPDATE STATUS only ───────────────────────────────────────────────────────
export const updateInvoiceStatus = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const invoice = await Invoice.findOne({ _id: req.params.id, user: req.user._id }).session(session);
    if (!invoice) { await session.abortTransaction(); return res.status(404).json({ message: 'Invoice not found' }); }

    const oldStatus = invoice.status;
    const newStatus = req.body.status;
    const amount    = invoice.totalAmount;
    const accountId = invoice.paidIntoAccount || req.body.accountId;
    const isSale    = invoice.type === 'Sale';

    // Only touch balance if account is linked
    if (accountId && isSale) {
      const wasAlreadyPaid = oldStatus === 'Paid';
      const isNowPaid      = newStatus === 'Paid';

      if (!wasAlreadyPaid && isNowPaid) {
        // Transition → Paid: credit the account
        const result = await adjustAccount(accountId, req.user._id, amount, 'credit', session);
        if (!result.ok) {
          await session.abortTransaction();
          return res.status(400).json({ message: result.message });
        }
      } else if (wasAlreadyPaid && !isNowPaid) {
        // Transition away from Paid: reverse the credit
        const result = await adjustAccount(accountId, req.user._id, amount, 'debit', session);
        if (!result.ok) {
          await session.abortTransaction();
          return res.status(400).json({ message: result.message });
        }
      }
    }

    invoice.status = newStatus;
    if (accountId) invoice.paidIntoAccount = accountId;
    await invoice.save({ session });

    await session.commitTransaction();
    res.json(invoice);

  } catch (err) {
    await session.abortTransaction();
    res.status(500).json({ message: 'Status update failed: ' + err.message });
  } finally {
    session.endSession();
  }
};

// ─── NEXT invoice number ──────────────────────────────────────────────────────
export const getNextInvoiceNumber = async (req, res) => {
  try {
    const { type } = req.query;
    const field  = type === 'Sale' ? 'invoiceNumber' : 'purchaseNumber';
    const prefix = type === 'Sale' ? 'INV-S-' : 'INV-P-';

    const invoices = await Invoice.find({
      user: req.user._id,
      [field]: { $regex: `^${prefix}` }
    }).select(field);

    let maxNum = 0;
    for (const inv of invoices) {
      const val = inv[field];
      if (val) {
        const num = parseInt(val.replace(prefix, ''), 10);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      }
    }

    const nextNum = String(maxNum + 1).padStart(3, '0');
    res.json({ number: `${prefix}${nextNum}` });
  } catch (err) {
    res.status(500).json({ message: 'Failed to generate number' });
  }
};