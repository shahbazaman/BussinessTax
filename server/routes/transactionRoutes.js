import express from 'express';
import auth from '../middleware/authMiddleware.js';
import { 
  addTransaction, 
  getTransactions, 
  deleteTransaction, 
  getTransactionReports 
} from '../controllers/transactionController.js';

const router = express.Router();

router.get('/reports/spending', auth, getTransactionReports);
router.get('/', auth, getTransactions);
router.post('/', auth, addTransaction);
router.delete('/:id', auth, deleteTransaction);

export default router;