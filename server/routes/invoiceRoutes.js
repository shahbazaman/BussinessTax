import express from 'express';
const router = express.Router();
import protect  from '../middleware/authMiddleware.js'; 
import { 
  createInvoice, 
  getInvoices, 
  deleteInvoice, 
  updateInvoice,     
  updateInvoiceStatus 
} from '../controllers/invoiceController.js';
router.route('/')
  .get(protect, getInvoices)
  .post(protect, createInvoice);
router.route('/:id')
  .delete(protect, deleteInvoice)
  .put(protect, updateInvoice); 
router.put('/:id/status', protect, updateInvoiceStatus);
export default router;