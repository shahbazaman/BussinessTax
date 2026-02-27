import express from 'express';
import Expense from '../models/Expense.js';
import protect from '../middleware/authMiddleware.js';
import axios from 'axios';
import {deleteExpense} from '../controllers/expenseController.js';
const router = express.Router();

// @desc    Create new expense
// @route   POST /api/expenses
router.post('/', protect, async (req, res) => {
  try {
    const { title, category, amount, currency, date } = req.body;

    // Safety Check: Ensure user exists from middleware
    if (!req.user?._id) {
      return res.status(401).json({ message: 'User context missing' });
    }

    // Fetch live exchange rate
    let convertedAmount = amount;
    const homeCurrency = process.env.HOME_CURRENCY || 'USD';

    if (currency !== homeCurrency) {
      try {
        const response = await axios.get(
          `https://v6.exchangerate-api.com/v6/${process.env.EXCHANGE_RATE_KEY}/pair/${currency}/${homeCurrency}/${amount}`
        );
        convertedAmount = response.data.conversion_result;
      } catch (apiError) {
        console.error('Exchange Rate API Error:', apiError.message);
        // Fallback: If API fails, use the original amount to prevent a 500 error
        convertedAmount = amount; 
      }
    }

    const expense = await Expense.create({
      user: req.user._id, // req.user is populated by protect middleware
      title,
      category,
      amount,
      currency,
      convertedAmount,
      date
    });

    res.status(201).json(expense);
  } catch (error) {
    console.error('Create Expense Error:', error.message);
    res.status(400).json({ message: error.message });
  }
});

// @desc    Get all user expenses
// @route   GET /api/expenses
router.get('/', protect, async (req, res) => {
  try {
    // Safety Check: Ensure user exists
    if (!req.user?._id) {
      return res.status(401).json({ message: 'User not found' });
    }

    const expenses = await Expense.find({ user: req.user._id }).sort({ date: -1 });
    res.json(expenses);
  } catch (error) {
    console.error('Get Expenses Error:', error.message);
    res.status(500).json({ message: 'Server error fetching expenses' });
  }
});
router.delete('/:id', protect, deleteExpense);
export default router;