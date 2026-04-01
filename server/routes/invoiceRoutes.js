import express from 'express';
const router = express.Router();
import protect from '../middleware/authMiddleware.js'; 
import { 
  createInvoice, 
  getInvoices, 
  deleteInvoice, 
  updateInvoice, 
  updateInvoiceStatus,
  getNextInvoiceNumber
} from '../controllers/invoiceController.js';

router.route('/')
  .get(protect, getInvoices) 
  .post(protect, createInvoice);
router.get('/next-number', protect, getNextInvoiceNumber);
router.route('/:id')
  .put(protect, updateInvoice)
  .delete(protect, deleteInvoice); 

router.put('/:id/status', protect, updateInvoiceStatus);
export default router;