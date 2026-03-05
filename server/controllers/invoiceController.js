import Invoice from '../models/Invoice.js';
import Product from '../models/Product.js';

export const createInvoice = async (req, res) => {
  try {
    const { 
      clientId, items, shipping, discount, type, 
      invoiceNumber, invoiceDate, dueDate, status, notes, 
      paymentMethod, paymentTerms, referenceNumber,
      poNumber, taxRate, gstNumber, billingAddress, shippingAddress 
    } = req.body; 

    if (!req.user?._id) return res.status(401).json({ message: "Auth failed" });

    const invoiceType = type || 'Sale';
    const validatedItems = [];

    // 1. Validate Products & Variants and apply the taxRate
    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product) return res.status(404).json({ message: `Product ${item.name} not found` });
      
      const variant = product.variants.id(item.variantId);
      if (!variant) return res.status(404).json({ message: `Variant for ${product.title} not found` });

      validatedItems.push({
        productId: item.productId,
        variantId: item.variantId,
        name: item.name || product.title,
        quantity: Number(item.quantity || 0),
        price: Number(item.price || 0),
        // Use item-specific taxRate if it exists, otherwise use the global taxRate from body
        taxRate: Number(item.taxRate || taxRate || 0)
      });
    }

    // 2. Setup Invoice Numbering Logic
    let finalInvoiceNumber = invoiceNumber;
    if (invoiceType === 'Sale' && !finalInvoiceNumber) {
        finalInvoiceNumber = `INV-${Date.now().toString().slice(-6)}`;
    }

    const invoice = new Invoice({
      user: req.user._id,
      client: clientId, 
      invoiceNumber: finalInvoiceNumber,
      invoiceDate: invoiceDate || new Date(),
      paymentMethod,
      paymentTerms,
      referenceNumber, 
      poNumber,
      gstNumber,
      billingAddress,
      shippingAddress,
      items: validatedItems,
      shipping: Number(shipping || 0),
      discount: Number(discount || 0),
      dueDate,
      status: status || 'Pending',
      type: invoiceType,
      notes,
      totalAmount: 0 // Will be calculated by pre-save hook in model
    });

    const savedInvoice = await invoice.save();

    // 3. Adjust Stock (Purchase increases stock, Sale decreases it)
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
    const invoices = await Invoice.find({ user: req.user._id })
      .populate('client', 'name email')
      .sort({ createdAt: -1 });
    res.json(invoices);
  } catch (error) {
    res.status(500).json({ message: "Error fetching invoices", error: error.message });
  }
};

export const updateInvoice = async (req, res) => {
  try {
    const oldInvoice = await Invoice.findById(req.params.id);
    if (!oldInvoice) return res.status(404).json({ message: "Not found" });

    // 1. Revert old stock levels before applying update
    for (const item of oldInvoice.items) {
      const revertQty = (oldInvoice.type === 'Purchase') ? -item.quantity : item.quantity;
      await Product.updateOne(
        { _id: item.productId, "variants._id": item.variantId },
        { $inc: { "variants.$.stock": revertQty } }
      );
    }

    // 2. Handle update data and map clientId
    const { _id, user, items, taxRate, ...updateData } = req.body;
    
    if (updateData.clientId) {
        oldInvoice.client = updateData.clientId;
    }

    // If items are being updated, ensure taxRate is applied to each new item
    if (items) {
      oldInvoice.items = items.map(item => ({
        ...item,
        taxRate: Number(item.taxRate || taxRate || 0)
      }));
    }

    // Apply remaining updates
    Object.assign(oldInvoice, updateData);
    
    // Save triggers the calculation hook in Invoice.js
    const updatedInvoice = await oldInvoice.save();

    // 3. Apply new stock levels
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

    // Revert stock levels (Sale deletion adds back, Purchase deletion removes)
    for (const item of invoice.items) {
        const revertQty = (invoice.type === 'Purchase') ? -item.quantity : item.quantity;
        await Product.updateOne(
          { _id: item.productId, "variants._id": item.variantId },
          { $inc: { "variants.$.stock": revertQty } }
        );
      }

    await invoice.deleteOne();
    res.json({ message: "Invoice removed & stock updated accordingly" });
  } catch (error) {
    res.status(500).json({ message: "Deletion failed" });
  }
};

export const updateInvoiceStatus = async (req, res) => {
  try {
    const invoice = await Invoice.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id }, 
      { status: req.body.status }, 
      { new: true }
    ).populate('client', 'name email');
    res.json(invoice);
  } catch (err) {
    res.status(500).json({ message: "Status update failed" });
  }
};