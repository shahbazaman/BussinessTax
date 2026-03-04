import Invoice from '../models/Invoice.js';
import Product from '../models/Product.js';

export const createInvoice = async (req, res) => {
  try {
    const { 
      clientId, items, shipping, discount, type, 
      invoiceNumber, dueDate, status, notes, poNumber ,taxRate
    } = req.body; 

    if (!req.user?._id) return res.status(401).json({ message: "Auth failed" });

    const invoiceType = type || 'Sale';
    const validatedItems = [];

    // 1. Validation & Stock Check
    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product) return res.status(404).json({ message: `Product ${item.name} not found` });

      const variant = product.variants.id(item.variantId);
      if (!variant) return res.status(404).json({ message: "Variant not found" });

      const qty = Number(item.quantity || 0);
      if (invoiceType === 'Sale' && variant.stock < qty) {
        return res.status(400).json({ message: `Insufficient stock for ${product.title}` });
      }

      validatedItems.push({
        productId: item.productId,
        variantId: item.variantId,
        name: item.name || product.title,
        quantity: qty,
        price: Number(item.price || 0),
        taxRate: Number(item.taxRate || 0)
      });
    }

    // 2. Create Document
    const invoice = new Invoice({
      user: req.user._id,
      client: clientId, 
      invoiceNumber: invoiceNumber || `INV-${Date.now()}`,
      poNumber,
      items: validatedItems,
      shipping: Number(shipping || 0),
      discount: Number(discount || 0),
      taxRate: Number(taxRate || 0),
      dueDate,
      status: status || 'Pending',
      type: invoiceType,
      notes,
      totalAmount: 0 // Pre-save hook will calculate this
    });

    const savedInvoice = await invoice.save();

    // 3. Update Stock
    for (const item of validatedItems) {
      const adjustment = (invoiceType === 'Purchase') ? item.quantity : -item.quantity;
      await Product.updateOne(
        { _id: item.productId, "variants._id": item.variantId },
        { $inc: { "variants.$.stock": adjustment } }
      );
    }

    res.status(201).json(savedInvoice);
  } catch (error) {
    res.status(500).json({ message: "Creation failed", error: error.message });
  }
};

export const getInvoices = async (req, res) => {
  try {
    const invoices = await Invoice.find({ user: req.user.id })
      .populate('client', 'name email')
      .sort({ createdAt: -1 });
    res.json(invoices);
  } catch (error) {
    res.status(500).json({ message: "Error fetching invoices" });
  }
};

export const updateInvoice = async (req, res) => {
  try {
    const oldInvoice = await Invoice.findById(req.params.id);
    if (!oldInvoice) return res.status(404).json({ message: "Not found" });

    // --- NEW: REVERT OLD STOCK BEFORE APPLYING NEW ---
    // This ensures if you change quantity from 10 to 2, the 8 items go back to stock.
    for (const item of oldInvoice.items) {
      const revertQty = (oldInvoice.type === 'Purchase') ? -item.quantity : item.quantity;
      await Product.updateOne(
        { _id: item.productId, "variants._id": item.variantId },
        { $inc: { "variants.$.stock": revertQty } }
      );
    }

    // Apply updates (excluding user/id)
    const { _id, user, ...updateData } = req.body;
    
    // Support both 'clientId' and 'client' from frontend
    if (updateData.clientId) {
        updateData.client = updateData.clientId;
        delete updateData.clientId;
    }

    Object.assign(oldInvoice, updateData);
    const updatedInvoice = await oldInvoice.save();

    // --- APPLY NEW STOCK ---
    for (const item of updatedInvoice.items) {
      const newAdjustment = (updatedInvoice.type === 'Purchase') ? item.quantity : -item.quantity;
      await Product.updateOne(
        { _id: item.productId, "variants._id": item.variantId },
        { $inc: { "variants.$.stock": newAdjustment } }
      );
    }

    res.json(updatedInvoice);
  } catch (error) {
    res.status(500).json({ message: "Update failed", error: error.message });
  }
};

export const deleteInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ message: "Not found" });

    // REVERT STOCK ON DELETE
    for (const item of invoice.items) {
        const revertQty = (invoice.type === 'Purchase') ? -item.quantity : item.quantity;
        await Product.updateOne(
          { _id: item.productId, "variants._id": item.variantId },
          { $inc: { "variants.$.stock": revertQty } }
        );
      }

    await invoice.deleteOne();
    res.json({ message: "Invoice removed & stock reverted" });
  } catch (error) {
    res.status(500).json({ message: "Deletion failed" });
  }
};

export const updateInvoiceStatus = async (req, res) => {
  try {
    const invoice = await Invoice.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id }, 
      { status: req.body.status }, 
      { new: true }
    ).populate('client', 'name email');
    res.json(invoice);
  } catch (err) {
    res.status(500).json({ message: "Status update failed" });
  }
};