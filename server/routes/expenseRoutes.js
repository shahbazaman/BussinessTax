import express from 'express';
import Expense from '../models/Expense.js';
import protect from '../middleware/authMiddleware.js';
import axios from 'axios';
import { deleteExpense } from '../controllers/expenseController.js';

const router = express.Router();

router.post('/', protect, async (req, res) => {
  try {
    const { title, category, amount, currency, date } = req.body;
    const userId = req.user._id;
    if (!userId) {
      return res.status(401).json({ message: 'User context missing' });
    }
    let convertedAmount = amount;
    const homeCurrency = process.env.HOME_CURRENCY || 'USD';

    if (currency !== homeCurrency && process.env.EXCHANGE_RATE_KEY) {
      try {
        const response = await axios.get(
          `https://v6.exchangerate-api.com/v6/${process.env.EXCHANGE_RATE_KEY}/pair/${currency}/${homeCurrency}/${amount}`
        );
        convertedAmount = response.data.conversion_result;
      } catch (apiError) {
        console.error('Exchange Rate API Error:', apiError.message);
        convertedAmount = amount; 
      }
    }

    const expense = await Expense.create({
      user: userId,
      title,
      category,
      amount,
      currency,
      convertedAmount,
      date: date || new Date()
    });

    res.status(201).json(expense);
  } catch (error) {
    console.error('Create Expense Error:', error.message);
    res.status(400).json({ message: error.message });
  }
});

router.get('/', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    const expenses = await Expense.find({ user: userId }).sort({ date: -1 });
    res.json(expenses);
  } catch (error) {
    console.error('Get Expenses Error:', error.message);
    res.status(500).json({ message: 'Server error fetching expenses' });
  }
});

router.put('/:id', protect, async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);    
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }
    if (expense.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'Not authorized' });
    }
    const { title, amount, category, date, receiptUrl } = req.body;
    expense.title = title || expense.title;
    expense.amount = amount || expense.amount;
    expense.category = category || expense.category;
    expense.date = date || expense.date;
    expense.receiptUrl = receiptUrl || expense.receiptUrl;
    const updatedExpense = await expense.save();
    res.json(updatedExpense);
  } catch (error) {
    res.status(400).json({ message: "Update failed: " + error.message });
  }
});

router.delete('/:id', protect, deleteExpense);

export default router;