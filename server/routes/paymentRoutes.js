import express from 'express';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import auth from '../middleware/authMiddleware.js';
import Invoice from '../models/Invoice.js';
import Transaction from '../models/Transaction.js';
import Account from '../models/Account.js';

const router = express.Router();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// --- 1. Create Order ---
// @desc    Create a Razorpay Order
// @route   POST /api/payments/order
router.post('/order', auth, async (req, res) => {
  try {
    const { amount, currency = "INR" } = req.body;

    const options = {
      amount: Math.round(Number(amount) * 100), // Ensure integer subunits
      currency,
      receipt: `receipt_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);
    res.json(order);
  } catch (err) {
    console.error("Order Error:", err);
    res.status(500).json({ message: "Razorpay Order Error" });
  }
});

// --- 2. Verify Payment ---
// @desc    Verify signature, update invoice status & account balance
// @route   POST /api/payments/verify
router.post('/verify', auth, async (req, res) => {
  const { 
    razorpay_order_id, 
    razorpay_payment_id, 
    razorpay_signature,
    invoiceId,
    accountId 
  } = req.body;

  try {
    // A. Generate expected signature to verify authenticity
    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(sign.toString())
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ message: "Invalid payment signature" });
    }

    // B. Update Financial Records
    // 1. Mark Invoice as Paid
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) return res.status(404).json({ message: "Invoice not found" });
    
    invoice.status = 'Paid';
    await invoice.save();

    // 2. Add funds to the selected Account
    const account = await Account.findById(accountId);
    if (account) {
      account.balance += Number(invoice.total || invoice.amount);
      await account.save();
    }

    // 3. Create a Transaction Log for the Feed
    const incomeLog = new Transaction({
      userId: req.user._id,
      fromAccount: accountId, // In an income scenario, we track where it landed
      toAccount: accountId,   // Keeping schema consistency
      amount: Number(invoice.total || invoice.amount),
      description: `Invoice Payment: ${invoice.customerName || 'Client'}`,
      status: 'Completed'
    });
    await incomeLog.save();

    res.json({ 
      success: true, 
      message: "Payment verified and records updated" 
    });

  } catch (err) {
    console.error("Verification Error:", err);
    res.status(500).json({ message: "Internal Server Error during verification" });
  }
});

export default router;