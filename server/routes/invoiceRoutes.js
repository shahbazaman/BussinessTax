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

router.route('/:id')
  .put(protect, updateInvoice)
  .delete(protect, deleteInvoice); 

router.put('/:id/status', protect, updateInvoiceStatus);
router.get('/next-number', protect, getNextInvoiceNumber);
export default router;