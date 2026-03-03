import Invoice from '../models/Invoice.js';
import Product from '../models/Product.js';

export const createInvoice = async (req, res) => {
  try {
    const { 
      clientId, items, shipping, discount, type, 
      invoiceNumber, dueDate, status, notes, poNumber 
    } = req.body; 

    // Safety check for Auth
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: "User authentication failed" });
    }

    const invoiceType = type || 'Sale';

    // 1. DATA VALIDATION & STOCK CHECK
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Invoice must have at least one item" });
    }

    // Prepare a clean items array for the Database
    const validatedItems = [];

    for (const item of items) {
      if (!item.productId || !item.variantId) {
        return res.status(400).json({ message: "Product and Variant selection required for all items" });
      }

      const product = await Product.findById(item.productId);
      if (!product) return res.status(404).json({ message: `Product not found: ${item.name}` });

      const variant = product.variants.id(item.variantId);
      if (!variant) return res.status(404).json({ message: `Variant not found for: ${product.title}` });

      const qty = Number(item.quantity || 0);

      // Inventory check for Sales
      if (invoiceType === 'Sale' && variant.stock < qty) {
        return res.status(400).json({ 
          message: `Insufficient stock for ${product.title}. Available: ${variant.stock}` 
        });
      }

      // Push sanitized data to the array
      validatedItems.push({
        productId: item.productId,
        variantId: item.variantId,
        name: item.name || product.title,
        quantity: qty,
        price: Number(item.price || 0),
        taxRate: Number(item.taxRate || 0)
      });
    }

    // 2. CREATE INVOICE 
    // We use "new Invoice" + ".save()" to properly trigger the async pre-save hook 
    // and avoid the "next is not a function" error.
    const invoice = new Invoice({
      user: req.user._id,
      client: clientId, 
      invoiceNumber: invoiceNumber || `INV-${Date.now()}`,
      poNumber,
      items: validatedItems,
      shipping: Number(shipping || 0),
      discount: Number(discount || 0),
      dueDate: dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Default 7 days
      status: status || 'Pending',
      type: invoiceType,
      notes,
      totalAmount: 0 // This will be calculated by the Pre-Save Hook in Invoice.js
    });

    const savedInvoice = await invoice.save();

    // 3. ATOMIC STOCK UPDATE
    for (const item of validatedItems) {
      const adjustment = (invoiceType === 'Purchase') ? item.quantity : -item.quantity;

      await Product.findByIdAndUpdate(
        item.productId, 
        { $inc: { "variants.$[v].stock": adjustment } }, 
        {
          arrayFilters: [{ "v._id": item.variantId }],
          new: true 
        }
      );
    }

    // Send back the populated invoice
    res.status(201).json(savedInvoice);

  } catch (error) {
    console.error("CRITICAL ERROR IN CREATE_INVOICE:", error);
    res.status(500).json({ 
      message: "Internal Server Error during invoice creation", 
      error: error.message 
    });
  }
};

export const getInvoices = async (req, res) => {
  try {
    const invoices = await Invoice.find({ user: req.user.id })
      .populate('client', 'name email') // Added population for UI clarity
      .sort({ createdAt: -1 });
    res.json(invoices);
  } catch (error) {
    res.status(500).json({ message: "Error fetching invoices" });
  }
};

export const deleteInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);

    if (!invoice) return res.status(404).json({ message: "Invoice not found" });
    if (invoice.user.toString() !== req.user.id) {
      return res.status(401).json({ message: "Not authorized" });
    }

    await invoice.deleteOne();
    res.json({ message: "Invoice removed" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

export const updateInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);

    if (!invoice) return res.status(404).json({ message: "Invoice not found" });
    if (invoice.user.toString() !== req.user.id) {
      return res.status(401).json({ message: "Not authorized" });
    }

    // Update with new schema fields
    Object.assign(invoice, req.body);

    const updatedInvoice = await invoice.save(); // save() triggers the pre-save math hook
    res.json(updatedInvoice);
  } catch (error) {
    res.status(500).json({ message: "Error updating invoice", error: error.message });
  }
};

export const toggleInvoiceStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const invoice = await Invoice.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id }, 
      { status }, 
      { new: true }
    );
    if (!invoice) return res.status(404).json({ message: "Invoice not found" });
    res.json(invoice);
  } catch (err) {
    res.status(500).json({ message: "Update failed" });
  }
};

// Simplified alias for toggleInvoiceStatus to match your existing frontend calls
export const updateInvoiceStatus = toggleInvoiceStatus;