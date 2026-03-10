import Product from '../models/Product.js';

export const getProducts = async (req, res) => {
  try {
    const products = await Product.find({ user: req.user.id });
    res.json(products.map(p => p.toJSON({ virtuals: true })));
  } catch (error) {
    res.status(500).json({ message: "Server error fetching products" });
  }
};

export const addProduct = async (req, res) => {
  try {
    const { title, category, variants, lowStockAlert, supplier, reorderQuantity } = req.body;
    
    const formattedVariants = variants.map((v, index) => ({
      name: v.name,
      sku: v.sku || `${category.substring(0,3).toUpperCase()}-${title.substring(0,3).toUpperCase()}-${Date.now()}-${index}`,
      barcode: v.barcode,
      price: v.price, 
      costPrice: v.costPrice,
      stock: v.stock,
      taxRate: v.taxRate,
      weight: v.weight,
      unit: v.unit
    }));

    const product = new Product({
      user: req.user.id,
      title,
      category,
      supplier,
      variants: formattedVariants, 
      lowStockAlert,
      reorderQuantity
    });
    await product.save();
    res.status(201).json(product);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const updateProduct = async (req, res) => {
  try {
    const { title, category, variants, lowStockAlert, supplier, reorderQuantity } = req.body;
    const product = await Product.findById(req.params.id);

    if (!product) return res.status(404).json({ message: "Product not found" });
    if (product.user.toString() !== req.user.id) return res.status(401).json({ message: "Not authorized" });
    product.title = title || product.title;
    product.category = category || product.category;
    product.supplier = supplier || product.supplier;
    product.lowStockAlert = lowStockAlert ?? product.lowStockAlert;
    product.reorderQuantity = reorderQuantity ?? product.reorderQuantity;
    
    if (variants) {
      product.variants = variants;
    }

    const updatedProduct = await product.save();
    res.json(updatedProduct);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const updateProductStock = async (req, res) => {
  try {
    const { variantId, newStock } = req.body;
    const product = await Product.findById(req.params.id);

    if (!product) return res.status(404).json({ message: "Product not found" });

    const variant = product.variants.id(variantId);
    if (!variant) return res.status(404).json({ message: "Variant not found" });

    variant.stock = newStock;
    await product.save();

    res.json(product);
  } catch (error) {
    res.status(400).json({ message: "Update failed" });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    
    if (product.user.toString() !== req.user.id) {
      return res.status(401).json({ message: "Not authorized" });
    }
    
    await product.deleteOne();
    res.json({ message: "Product removed" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};