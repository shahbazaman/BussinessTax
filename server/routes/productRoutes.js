import express from 'express';
const router = express.Router();
import protect from '../middleware/authMiddleware.js';
import { 
  getProducts, 
  addProduct, 
  updateProduct,
  deleteProduct,
  updateProductStock 
} from '../controllers/productController.js';

router.route('/')
  .get(protect, getProducts)
  .post(protect, addProduct);

router.route('/:id')
  .put(protect, updateProduct)
  .delete(protect, deleteProduct);

router.route('/:id/stock')
  .patch(protect, updateProductStock);

export default router;