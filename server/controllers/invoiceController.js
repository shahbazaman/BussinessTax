import Invoice from '../models/Invoice.js';
import Product from '../models/Product.js';

export const createInvoice = async (req, res) => {
  try {
    const { 
      clientId, 
      invoiceNumber,
      poNumber,
      items, // Array of { productId, variantId, name, quantity, price, taxRate }
      subtotal,
      taxAmount,
      shipping,
      discount,
      totalAmount,
      dueDate, 
      status, 
      type, // 'Sale' or 'Purchase'
      notes
    } = req.body; 

    const invoiceType = type || 'Sale';

    // 1. PRE-CHECK STOCK & VALIDATION
    if (items && items.length > 0) {
      for (const item of items) {
        const product = await Product.findById(item.productId);
        if (!product) {
          return res.status(404).json({ message: `Product not found: ${item.productId}` });
        }

        const variant = product.variants.id(item.variantId);
        if (!variant) {
          return res.status(404).json({ message: `Variant not found in product: ${product.title}` });
        }

        const qty = Number(item.quantity);

        // If it's a Sale, prevent overselling
        if (invoiceType === 'Sale' && variant.stock < qty) {
          return res.status(400).json({ 
            message: `Insufficient stock for ${product.title} - ${variant.name}. Available: ${variant.stock}` 
          });
        }
      }
    }

    // 2. CREATE INVOICE 
    // The pre-save hook in our model will re-verify the totals automatically
    const invoice = await Invoice.create({
      user: req.user._id,
      client: clientId, 
      invoiceNumber: invoiceNumber || `INV-${Date.now()}`,
      poNumber,
      items: items || [],
      subtotal,
      taxAmount,
      shipping: Number(shipping) || 0,
      discount: Number(discount) || 0,
      totalAmount,
      dueDate,
      status: status || 'Pending',
      type: invoiceType,
      notes
    });

    // 3. ATOMIC STOCK UPDATE
    if (items && items.length > 0) {
      for (const item of items) {
        const qty = Number(item.quantity);
        // Purchase increases stock (+), Sale decreases stock (-)
        const adjustment = (invoiceType === 'Purchase') ? qty : -qty;

        await Product.findByIdAndUpdate(item.productId, {
          $inc: { "variants.$[v].stock": adjustment } 
        }, {
          arrayFilters: [{ "v._id": item.variantId }],
          new: true 
        });
      }
    }

    res.status(201).json(invoice);
  } catch (error) {
    console.error("Invoice Creation Error:", error);
    res.status(500).json({ 
      message: "Error creating invoice and updating stock", 
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