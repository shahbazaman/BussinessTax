// import express from 'express';
// import Razorpay from 'razorpay';
// import crypto from 'crypto';
// import auth from '../middleware/authMiddleware.js';
// import Invoice from '../models/Invoice.js';
// import Transaction from '../models/Transaction.js';
// import Account from '../models/Account.js';

// const router = express.Router();

// const razorpay = new Razorpay({
//   key_id: process.env.RAZORPAY_KEY_ID,
//   key_secret: process.env.RAZORPAY_KEY_SECRET,
// });

// // --- 1. Create Order ---
// router.post('/create-order', auth, async (req, res) => {
//   try {
//     const { amount, currency } = req.body; 
//     const finalAmount = Math.round(Number(amount) * 100);

// const options = {
//   amount: finalAmount,
//   currency: currency || "INR",
//   receipt: `receipt_${Date.now()}`,
// };

//     const order = await razorpay.orders.create(options);
//     res.json(order);
//   } catch (err) {
//     console.error("Order Error:", err);
//     res.status(500).json({ message: "Razorpay Order Error" });
//   }
// });

// // --- 2. Verify Payment ---
// // @desc    Verify signature, update invoice status & account balance
// // @route   POST /api/payments/verify
// router.post('/verify', auth, async (req, res) => {
//   const { 
//     razorpay_order_id, 
//     razorpay_payment_id, 
//     razorpay_signature,
//     invoiceId,
//     accountId 
//   } = req.body;

//   try {
//     // A. Generate expected signature to verify authenticity
//     const sign = razorpay_order_id + "|" + razorpay_payment_id;
//     const expectedSignature = crypto
//       .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
//       .update(sign.toString())
//       .digest("hex");

//     if (expectedSignature !== razorpay_signature) {
//       return res.status(400).json({ message: "Invalid payment signature" });
//     }

//     // B. Update Financial Records
//     // 1. Mark Invoice as Paid
//     const invoice = await Invoice.findById(invoiceId);
//     if (!invoice) return res.status(404).json({ message: "Invoice not found" });
    
//     invoice.status = 'Paid';
//     await invoice.save();

//     // 2. Add funds to the selected Account
//     const account = await Account.findById(accountId);
//     if (account) {
//       account.balance += Number(invoice.total || invoice.amount);
//       await account.save();
//     }

//     // 3. Create a Transaction Log for the Feed
//     const incomeLog = new Transaction({
//       userId: req.user._id,
//       fromAccount: accountId, // In an income scenario, we track where it landed
//       toAccount: accountId,   // Keeping schema consistency
//       amount: Number(invoice.total || invoice.amount),
//       description: `Invoice Payment: ${invoice.customerName || 'Client'}`,
//       status: 'Completed'
//     });
//     await incomeLog.save();

//     res.json({ 
//       success: true, 
//       message: "Payment verified and records updated" 
//     });

//   } catch (err) {
//     console.error("Verification Error:", err);
//     res.status(500).json({ message: "Internal Server Error during verification" });
//   }
// });

// export default router;
// server/routes/paymentRoutes.js
// Razorpay payment gateway integration
// On successful payment verification, posts double-entry journal:
//   Dr: Bank Account (asset increases)
//   Cr: Accounts Receivable (receivable cleared)
import express from 'express';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import auth from '../middleware/authMiddleware.js';
import Invoice from '../models/Invoice.js';
import Transaction from '../models/Transaction.js';
import Account from '../models/Account.js';
import LedgerAccount from '../models/LedgerAccount.js';
import { createJournalEntry, getOrCreateAccount, syncBankToLedger } from '../services/journalService.js';
import { ACCOUNTS } from '../services/systemAccounts.js';

const router = express.Router();

const razorpay = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ── POST /api/payments/create-order ──────────────────────────────────────────
router.post('/create-order', auth, async (req, res) => {
  try {
    const { amount, currency } = req.body;
    const finalAmount = Math.round(Number(amount) * 100); // Razorpay uses paise

    const order = await razorpay.orders.create({
      amount:   finalAmount,
      currency: currency || 'INR',
      receipt:  `receipt_${Date.now()}`,
    });

    res.json(order);
  } catch (err) {
    console.error('Razorpay order error:', err);
    res.status(500).json({ message: 'Failed to create payment order' });
  }
});

// ── POST /api/payments/verify ─────────────────────────────────────────────────
// Verify Razorpay signature → mark invoice paid → post journal entry
router.post('/verify', auth, async (req, res) => {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    invoiceId,
    accountId,
  } = req.body;

  try {
    // A. Verify Razorpay signature (HMAC-SHA256)
    const sign = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(sign)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ message: 'Invalid payment signature' });
    }

    // B. Fetch invoice
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });

    const invoiceAmount = Number(invoice.totalAmount || invoice.total || invoice.amount || 0);
    const oldStatus     = invoice.status;

    // C. Mark invoice as paid
    invoice.status = 'Paid';
    if (accountId) invoice.paidIntoAccount = accountId;
    await invoice.save();

    // D. Credit bank account balance
    let bankName = 'Bank Account';
    if (accountId) {
      const bankAccount = await Account.findById(accountId);
      if (bankAccount) {
        bankAccount.balance += invoiceAmount;
        await bankAccount.save();
        bankName = bankAccount.bankName;
      }
    }

    // E. Transaction audit log
    await Transaction.create({
      userId:      req.user._id,
      fromAccount: accountId,
      toAccount:   accountId,
      amount:      invoiceAmount,
      type:        'Payment',
      description: `Razorpay Payment: Invoice #${invoice.invoiceNumber || invoice._id}`,
      status:      'Completed',
    });

    // F. ── Double-entry journal ────────────────────────────────────────────────
    // Only post if the invoice wasn't already paid (avoid duplicate entries)
    if (oldStatus !== 'Paid') {
      try {
        const arAccount   = await getOrCreateAccount(req.user._id, ACCOUNTS.ACCOUNTS_RECEIVABLE, 'Asset', 'Accounts Receivable', null);
        await syncBankToLedger(req.user._id, bankName, accountId, null, null);
        const bankLedger  = await LedgerAccount.findOne({ userId: req.user._id, name: bankName });

        if (bankLedger) {
          // Dr: Bank Account / Cr: Accounts Receivable
          await createJournalEntry({
            userId:          req.user._id,
            debitAccountId:  bankLedger._id,
            creditAccountId: arAccount._id,
            amount:          invoiceAmount,
            date:            new Date(),
            description:     `Payment received: Invoice #${invoice.invoiceNumber || invoice._id}`,
            narration:       `Razorpay payment ID: ${razorpay_payment_id}`,
            sourceType:      'Payment',
            sourceId:        invoice._id,
            sourceModel:     'Invoice',
            entrySequence:   2,
          });
        }
      } catch (jeErr) {
        console.warn('Journal entry for Razorpay payment failed:', jeErr.message);
      }
    }
    // ─────────────────────────────────────────────────────────────────────────

    res.json({
      success: true,
      message: 'Payment verified and records updated',
    });

  } catch (err) {
    console.error('Payment verification error:', err);
    res.status(500).json({ message: 'Payment verification failed' });
  }
});

export default router;