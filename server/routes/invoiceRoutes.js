import express from 'express';
const router = express.Router();
import protect  from '../middleware/authMiddleware.js'; 
import { 
  createInvoice, 
  getInvoices, 
  deleteInvoice, 
  updateInvoice,      // Ensure this is imported!
  updateInvoiceStatus 
} from '../controllers/invoiceController.js';

router.route('/')
  .get(protect, getInvoices)
  .post(protect, createInvoice);

// This is the line that fixes the 404 error
router.route('/:id')
  .delete(protect, deleteInvoice)
  .put(protect, updateInvoice); 

router.put('/:id/status', protect, updateInvoiceStatus);

export default router;