// import express from 'express';
// import Expense from '../models/Expense.js';
// import protect from '../middleware/authMiddleware.js';
// import axios from 'axios';
// import { deleteExpense } from '../controllers/expenseController.js';
// import multer from 'multer';
// import streamifier from 'streamifier';
// import { v2 as cloudinary } from 'cloudinary';

// cloudinary.config({
//   cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
//   api_key: process.env.CLOUDINARY_API_KEY,
//   api_secret: process.env.CLOUDINARY_API_SECRET,
// });

// const storage = multer.memoryStorage();
// const upload = multer({ storage });
// const router = express.Router();
// router.post('/upload-receipt', protect, upload.single('receipt'), async (req, res) => {
//   try {
//     if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

//     const streamUpload = (buffer) =>
//       new Promise((resolve, reject) => {
//         const stream = cloudinary.uploader.upload_stream(
//           { folder: 'expense_receipts' },
//           (error, result) => (error ? reject(error) : resolve(result))
//         );
//         streamifier.createReadStream(buffer).pipe(stream);
//       });

//     const result = await streamUpload(req.file.buffer);
//     res.json({ receiptUrl: result.secure_url });
//   } catch (err) {
//     console.error('Receipt upload error:', err);
//     res.status(500).json({ message: 'Upload failed' });
//   }
// });
// router.post('/', protect, async (req, res) => {
//   try {
//     const { 
//       title, category, amount, currency, date, 
//       paymentMethod, paidFromAccount, notes, receiptUrl 
//     } = req.body;
    
//     const userId = req.user._id;
//     if (!userId) {
//       return res.status(401).json({ message: 'User context missing' });
//     }

//     // --- Currency Conversion Logic ---
//     let convertedAmount = amount;
//     const homeCurrency = process.env.HOME_CURRENCY || 'USD';

//     if (currency !== homeCurrency && process.env.EXCHANGE_RATE_KEY) {
//       try {
//         const response = await axios.get(
//           `https://v6.exchangerate-api.com/v6/${process.env.EXCHANGE_RATE_KEY}/pair/${currency}/${homeCurrency}/${amount}`
//         );
//         convertedAmount = response.data.conversion_result;
//       } catch (apiError) {
//         console.error('Exchange Rate API Error:', apiError.message);
//         convertedAmount = amount; 
//       }
//     }

//     const expense = await Expense.create({
//       user: userId,
//       title,
//       category,
//       amount,
//       currency,
//       convertedAmount,
//       paymentMethod: paymentMethod || 'Bank Transfer',
//       paidFromAccount: paidFromAccount || null,
//       notes: notes || '',
//       receiptUrl: receiptUrl || '',
//       date: date || new Date()
//     });

//     res.status(201).json(expense);
//   } catch (error) {
//     console.error('Create Expense Error:', error.message);
//     res.status(400).json({ message: error.message });
//   }
// });

// // @desc    Get all user expenses
// // @route   GET /api/expenses
// router.get('/', protect, async (req, res) => {
//   try {
//     const userId = req.user._id;
//     // Population allows us to see the Bank Name instead of just an ID in the frontend
//     const expenses = await Expense.find({ user: userId })
//       .populate('paidFromAccount', 'bankName')
//       .sort({ date: -1 });
//     res.json(expenses);
//   } catch (error) {
//     console.error('Get Expenses Error:', error.message);
//     res.status(500).json({ message: 'Server error fetching expenses' });
//   }
// });

// // @desc    Update an expense
// // @route   PUT /api/expenses/:id
// router.put('/:id', protect, async (req, res) => {
//   try {
//     const expense = await Expense.findById(req.params.id);    
//     if (!expense) {
//       return res.status(404).json({ message: 'Expense not found' });
//     }
//     if (expense.user.toString() !== req.user._id.toString()) {
//       return res.status(401).json({ message: 'Not authorized' });
//     }

//     const { 
//       title, amount, category, date, 
//       receiptUrl, paymentMethod, paidFromAccount, notes 
//     } = req.body;

//     // Update with new fields
//     expense.title = title || expense.title;
//     expense.amount = amount || expense.amount;
//     expense.category = category || expense.category;
//     expense.date = date || expense.date;
//     expense.receiptUrl = receiptUrl || expense.receiptUrl;
//     expense.paymentMethod = paymentMethod || expense.paymentMethod;
//     expense.paidFromAccount = paidFromAccount || expense.paidFromAccount;
//     expense.notes = notes || expense.notes;

//     const updatedExpense = await expense.save();
//     res.json(updatedExpense);
//   } catch (error) {
//     res.status(400).json({ message: "Update failed: " + error.message });
//   }
// });

// router.delete('/:id', protect, deleteExpense);

// export default router;
import express from 'express';
import Expense from '../models/Expense.js';
import protect from '../middleware/authMiddleware.js';
import multer from 'multer';
import streamifier from 'streamifier';
import { v2 as cloudinary } from 'cloudinary';
import { createExpense, updateExpense, deleteExpense } from '../controllers/expenseController.js';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = multer.memoryStorage();
const upload  = multer({ storage });
const router  = express.Router();

// Receipt upload (Cloudinary) — unchanged
router.post('/upload-receipt', protect, upload.single('receipt'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const streamUpload = (buffer) =>
      new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: 'expense_receipts' },
          (error, result) => (error ? reject(error) : resolve(result))
        );
        streamifier.createReadStream(buffer).pipe(stream);
      });
    const result = await streamUpload(req.file.buffer);
    res.json({ receiptUrl: result.secure_url });
  } catch (err) {
    console.error('Receipt upload error:', err);
    res.status(500).json({ message: 'Upload failed' });
  }
});

// FIXED: uses new controller that deducts account balance
router.post('/', protect, createExpense);

// GET all expenses with account name populated
router.get('/', protect, async (req, res) => {
  try {
    const expenses = await Expense.find({ user: req.user._id })
      .populate('paidFromAccount', 'bankName balance')
      .sort({ date: -1 });
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching expenses' });
  }
});

// FIXED: uses new controller that handles account balance diff on edit
router.put('/:id', protect, updateExpense);

// FIXED: uses new controller that refunds account balance on delete
router.delete('/:id', protect, deleteExpense);

export default router;