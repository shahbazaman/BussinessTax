import mongoose from 'mongoose';

const variantSchema = new mongoose.Schema({
  name: { type: String, required: true }, // e.g., "500g Pack" or "1 Liter Bottle"
  weight: { type: Number, required: true },
  unit: { type: String, enum: ['g', 'kg', 'ml', 'L', 'pcs'], required: true },
  price: { type: Number, required: true },
  stock: { type: Number, default: 0 },
  sku: { type: String, unique: true } // Stock Keeping Unit
});

const productSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  category: { type: String },
  variants: [variantSchema],
  lowStockAlert: { type: Number, default: 10 } 
}, { timestamps: true });

export default mongoose.model('Product', productSchema);