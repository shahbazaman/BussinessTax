import Invoice from '../models/Invoice.js';
import Product from '../models/Product.js';

export const createInvoice = async (req, res) => {
  try {
    const { 
      client, items, discount, type, 
      invoiceDate, status, notes, 
      globalTaxRate, gstNumber, billingAddress, shippingAddress,
      invoiceNumber, purchaseNumber, referenceNumber
    } = req.body; 

    if (!req.user?._id) return res.status(401).json({ message: "Auth failed" });

    const invoiceType = type || 'Sale';

    // 1. Validate Items & Fetch SKU/Barcode from DB to ensure accuracy
    const validatedItems = [];
    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product) return res.status(404).json({ message: `Product not found: ${item.name}` });
      
      validatedItems.push({
        productId: item.productId,
        name: item.name || product.name,
        sku: product.sku || '',             // Taking from DB
        barcode: product.barcode || '',     // Taking from DB
        quantity: Number(item.quantity || 0),
        price: Number(item.price || 0)
      });
    }

    // 2. Create Invoice Instance
    const invoice = new Invoice({
      user: req.user._id,
      client: client, 
      // Using frontend generated numbers, fallback to undefined if empty strings
      invoiceNumber: invoiceType === 'Sale' ? (invoiceNumber || undefined) : undefined,
      purchaseNumber: invoiceType === 'Purchase' ? (purchaseNumber || undefined) : undefined,
      referenceNumber: invoiceType === 'Purchase' ? (referenceNumber || undefined) : undefined,
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

    // 3. Adjust Stock directly on the Product document
    for (const item of validatedItems) {
      const adjustment = (invoiceType === 'Purchase') ? item.quantity : -item.quantity;
      await Product.findByIdAndUpdate(
        item.productId,
        { $inc: { stock: adjustment } }
      );
    }
    
    res.status(201).json(savedInvoice);
  } catch (error) {
    console.error("CREATE INVOICE ERROR:", error); 
    // Handle duplicate key error from MongoDB elegantly
    if (error.code === 11000) {
      return res.status(400).json({ message: "An invoice with this number already exists. Please refresh and try again." });
    }
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
    if (!oldInvoice) return res.status(404).json({ message: "Invoice not found" });

    // 1. Revert old stock
    for (const item of oldInvoice.items) {
      const revertQty = (oldInvoice.type === 'Purchase') ? -item.quantity : item.quantity;
      await Product.findByIdAndUpdate(
        item.productId,
        { $inc: { stock: revertQty } }
      );
    }

    const { items, client, ...updateData } = req.body;
    
    if (client) oldInvoice.client = client;
    
    // Ensure updated items have current SKU/Barcode if changed
    if (items) {
      oldInvoice.items = await Promise.all(items.map(async (item) => {
        const product = await Product.findById(item.productId);
        return {
          ...item,
          sku: product?.sku || item.sku,
          barcode: product?.barcode || item.barcode
        };
      }));
    }
    
    Object.assign(oldInvoice, updateData);
    const updatedInvoice = await oldInvoice.save();

    // 2. Apply new stock
    for (const item of updatedInvoice.items) {
      const newAdjustment = (updatedInvoice.type === 'Purchase') ? item.quantity : -item.quantity;
      await Product.findByIdAndUpdate(
        item.productId,
        { $inc: { stock: newAdjustment } }
      );
    }

    res.json(updatedInvoice);
  } catch (error) {
    console.error("UPDATE INVOICE ERROR:", error);
    res.status(500).json({ message: "Update failed", error: error.message });
  }
};

export const deleteInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ message: "Not found" });

    // Revert stock upon deletion
    for (const item of invoice.items) {
        const revertQty = (invoice.type === 'Purchase') ? -item.quantity : item.quantity;
        await Product.findByIdAndUpdate(
          item.productId,
          { $inc: { stock: revertQty } }
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
    ).populate('client', 'name email');
    res.json(invoice);
  } catch (err) {
    res.status(500).json({ message: "Status update failed" });
  }
};