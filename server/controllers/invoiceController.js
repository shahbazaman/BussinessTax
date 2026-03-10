import Invoice from '../models/Invoice.js';
import Product from '../models/Product.js';

export const createInvoice = async (req, res) => {
  try {
    const { 
      client, items, discount, type, invoiceDate, status, 
      notes, globalTaxRate, gstNumber, billingAddress, 
      shippingAddress, invoiceNumber, purchaseNumber, referenceNumber 
    } = req.body;

    if (!req.user?._id) return res.status(401).json({ message: "Auth failed" });
    const invoiceType = type || 'Sale';

    const validatedItems = [];
    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product) return res.status(404).json({ message: `Product not found: ${item.productId}` });
      
      const variant = product.variants.id(item.variantId);
      if (!variant) return res.status(404).json({ message: "Variant not found" });

      validatedItems.push({
        productId: item.productId,
        variantId: item.variantId,
        name: item.name,
        sku: variant.sku || '',
        barcode: variant.barcode || '',
        quantity: Number(item.quantity || 0),
        price: Number(item.price || 0)
      });
    }

    const invoice = new Invoice({
      user: req.user._id, 
      client, 
      invoiceNumber, 
      purchaseNumber, 
      referenceNumber,
      invoiceDate: invoiceDate || new Date(), 
      gstNumber, 
      billingAddress, 
      shippingAddress,
      items: validatedItems, 
      discount: Number(discount || 0),
      globalTaxRate: Number(globalTaxRate || 0), 
      status: status || 'Pending',
      type: invoiceType, 
      notes
    });

    const savedInvoice = await invoice.save();

    for (const item of validatedItems) {
      const adjustment = (invoiceType === 'Purchase') ? item.quantity : -item.quantity;
      const result = await Product.updateOne(
        { _id: item.productId, "variants._id": item.variantId },
        { $inc: { "variants.$.stock": adjustment } }
      );
      if (result.matchedCount === 0) throw new Error(`Stock update failed for variant ${item.variantId}`);
    }
    
    res.status(201).json(savedInvoice);
  } catch (error) {
    console.error("Create Invoice Error:", error);
    if (error.code === 11000) {
      return res.status(400).json({ message: "Invoice or Reference number already exists." });
    }
    res.status(500).json({ message: "Creation failed", error: error.message });
  }
};

export const updateInvoice = async (req, res) => {
  try {
    const oldInvoice = await Invoice.findById(req.params.id);
    if (!oldInvoice) return res.status(404).json({ message: "Invoice not found" });

    // 1. Revert Old Stock
    for (const item of oldInvoice.items) {
      const revertQty = (oldInvoice.type === 'Purchase') ? -item.quantity : item.quantity;
      await Product.updateOne(
        { _id: item.productId, "variants._id": item.variantId }, 
        { $inc: { "variants.$.stock": revertQty } }
      );
    }

    // 2. Update Invoice Data
    const { items, client, globalTaxRate, discount, ...updateData } = req.body;
    
    // Explicitly update fields to ensure pre-save hook triggers correctly
    Object.assign(oldInvoice, { 
      ...updateData, 
      client, 
      items,
      globalTaxRate: Number(globalTaxRate || 0),
      discount: Number(discount || 0)
    });

    const updatedInvoice = await oldInvoice.save();

    // 3. Apply New Stock
    for (const item of updatedInvoice.items) {
      const newAdjustment = (updatedInvoice.type === 'Purchase') ? item.quantity : -item.quantity;
      const result = await Product.updateOne(
        { _id: item.productId, "variants._id": item.variantId }, 
        { $inc: { "variants.$.stock": newAdjustment } }
      );
      if (result.matchedCount === 0) throw new Error(`Stock adjustment failed for ${item.variantId}`);
    }

    res.json(updatedInvoice);
  } catch (error) {
    console.error("Update Invoice Error:", error);
    res.status(500).json({ message: "Update failed", error: error.message });
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

export const deleteInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ message: "Not found" });

    for (const item of invoice.items) {
      const revertQty = (invoice.type === 'Purchase') ? -item.quantity : item.quantity;
      await Product.updateOne(
        { _id: item.productId, "variants._id": item.variantId },
        { $inc: { "variants.$.stock": revertQty } }
      );
    }

    await invoice.deleteOne();
    res.json({ message: "Invoice removed & stock updated" });
  } catch (error) {
    res.status(500).json({ message: "Deletion failed", error: error.message });
  }
};

export const updateInvoiceStatus = async (req, res) => {
  try {
    const invoice = await Invoice.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id }, 
      { status: req.body.status }, 
      { new: true }
    );
    res.json(invoice);
  } catch (err) {
    res.status(500).json({ message: "Status update failed" });
  }
};