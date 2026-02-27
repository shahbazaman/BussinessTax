import express from 'express';
const router = express.Router();
import protect from '../middleware/authMiddleware.js';
import { 
  getProducts, 
  addProduct, 
  updateProduct,
  deleteProduct 
} from '../controllers/productController.js';

// Base route: /api/products
router.route('/')
  .get(protect, getProducts)
  .post(protect, addProduct);

// Specific product route: /api/products/:id
router.route('/:id')
  .put(protect, updateProduct)
  .delete(protect, deleteProduct);

export default router;