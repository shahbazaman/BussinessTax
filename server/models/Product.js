import mongoose from 'mongoose';

const variantSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true 
  },
  weight: { 
    type: Number 
  },
  unit: { 
    type: String, 
    enum: ['g', 'kg', 'ml', 'L', 'pcs'], 
    default: 'pcs' 
  },
  costPrice: { 
    type: Number, 
    required: true, 
    default: 0 
  },
  price: { 
    type: Number, 
    required: true 
  },
  stock: { 
    type: Number, 
    default: 0 
  },
  sku: { 
    type: String, 
    unique: true, 
    sparse: true 
  },barcode: { 
    type: String 
  }
});

const productSchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  title: { 
    type: String, 
    required: true,
    trim: true 
  },
  category: { 
    type: String,
    required: true
  },
  supplier: { 
    type: String,
    trim: true 
  },
  variants: [variantSchema],
  lowStockAlert: { 
    type: Number, 
    default: 10 
  }, 
  reorderQuantity: { 
    type: Number, 
    default: 50 
  } 
}, { 
  timestamps: true,
  toJSON: { virtuals: true }, 
  toObject: { virtuals: true } 
});

productSchema.virtual('margins').get(function() {
  if (!this.variants) return [];
  
  return this.variants.map(v => {
    const profit = v.price - v.costPrice;
    const percentage = v.price > 0 ? (profit / v.price) * 100 : 0;
    return {
      variant: v.name,
      profit: profit.toFixed(2),
      marginPercentage: percentage.toFixed(2) + '%'
    };
  });
});

export default mongoose.model('Product', productSchema);