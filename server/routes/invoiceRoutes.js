import express from 'express';
const router = express.Router();
import protect from '../middleware/authMiddleware.js'; 
import { 
  createInvoice, 
  getInvoices, 
  deleteInvoice, 
  updateInvoice, 
  updateInvoiceStatus 
} from '../controllers/invoiceController.js';

// Base routes for fetching all and creating new invoices
router.route('/')
  .get(protect, getInvoices)
  .post(protect, createInvoice);

// Detail routes for updating and deleting specific invoices
router.route('/:id')
  .delete(protect, deleteInvoice)
  .put(protect, updateInvoice); 

// Dedicated endpoint for status changes (e.g., Pending -> Paid)
router.put('/:id/status', protect, updateInvoiceStatus);

export default router;