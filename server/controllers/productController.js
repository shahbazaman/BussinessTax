import Product from '../models/Product.js';
export const getProducts = async (req, res) => {
  try {
    const products = await Product.find({ user: req.user.id });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: "Server error fetching products" });
  }
};
export const addProduct = async (req, res) => {
  try {
    const { title, category, variants, lowStockAlert } = req.body;
    const product = new Product({
      user: req.user.id,
      title,
      category,
      variants,
      lowStockAlert
    });
    const savedProduct = await product.save();
    res.status(201).json(savedProduct);
  } catch (error) {
    console.log("DETAILED ERROR:", error);
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
    if (product.user.toString() !== req.user.id) {
      return res.status(401).json({ message: "Not authorized" });
    }
    await product.deleteOne();
    res.json({ message: "Product removed" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};
export const updateProduct = async (req, res) => {
  try {
    const { title, category, variants, lowStockAlert } = req.body;
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    if (product.user.toString() !== req.user.id) {
      return res.status(401).json({ message: "Not authorized" });
    }
    product.title = title || product.title;
    product.category = category || product.category;
    product.lowStockAlert = lowStockAlert || product.lowStockAlert;
    product.variants = variants || product.variants;
    const updatedProduct = await product.save();
    res.json(updatedProduct);
  } catch (error) {
    console.error("Update Error:", error);
    res.status(400).json({ message: error.message });
  }
};