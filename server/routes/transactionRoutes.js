import express from 'express';
import auth from '../middleware/authMiddleware.js';
import { 
  addTransaction, 
  getTransactions, 
  deleteTransaction, 
  getTransactionReports 
} from '../controllers/transactionController.js';

const router = express.Router();

// @route   GET /api/transactions/reports/spending
// NOTE: Must be ABOVE /:id routes
router.get('/reports/spending', auth, getTransactionReports);

// @route   GET /api/transactions
router.get('/', auth, getTransactions);

// @route   POST /api/transactions
router.post('/', auth, addTransaction);

// @route   DELETE /api/transactions/:id
router.delete('/:id', auth, deleteTransaction);

export default router;