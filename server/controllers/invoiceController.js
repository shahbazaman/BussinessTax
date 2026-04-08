import Invoice from '../models/Invoice.js';
import Product from '../models/Product.js';

export const createInvoice = async (req, res) => {
  try {
    const {
      client: rawClient, clientName, items, discount, type, invoiceDate, status,
      notes, globalTaxRate, gstNumber, billingAddress,
      shippingAddress, referenceNumber, invoiceNumber, purchaseNumber
    } = req.body;

    if (!req.user?._id) return res.status(401).json({ message: "Auth failed" });

    // Sanitize client — empty string will fail ObjectId cast
    const client = rawClient && String(rawClient).trim() !== '' ? rawClient : undefined;

    const invoiceType = type || 'Sale';
    const field = invoiceType === 'Sale' ? 'invoiceNumber' : 'purchaseNumber';
    const numberValue = invoiceType === 'Sale' ? invoiceNumber : purchaseNumber;

    // Check if number already exists for this user
    if (numberValue) {
      const existing = await Invoice.findOne({ 
        user: req.user._id, 
        [field]: numberValue 
      });
      if (existing) {
        return res.status(400).json({ 
          message: `${field === 'invoiceNumber' ? 'Invoice' : 'Purchase'} number "${numberValue}" already exists. Please use a different number.`
        });
      }
    }

    // Validate items
    const validatedItems = [];
    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product) return res.status(404).json({ message: `Product not found` });
      const variant = product.variants.id(item.variantId);
      if (!variant) return res.status(404).json({ message: "Variant not found" });
      validatedItems.push({
        productId: item.productId,
        variantId: item.variantId,
        name:      item.name,
        sku:       variant.sku || '',
        barcode:   variant.barcode || '',
        quantity:  Number(item.quantity || 0),
        price:     Number(item.price || 0)
      });
    }

    const invoice = new Invoice({
      user:            req.user._id,
      client,
      clientName: clientName?.trim() || undefined,
      invoiceDate:     invoiceDate || new Date(),
      type:            invoiceType,
      invoiceNumber:   invoiceType === 'Sale' ? (invoiceNumber || undefined) : undefined,
      purchaseNumber:  invoiceType === 'Purchase' ? (purchaseNumber || undefined) : undefined,
      referenceNumber: (referenceNumber?.trim()) ? referenceNumber.trim() : undefined,
      gstNumber,
      billingAddress,
      shippingAddress,
      items:           validatedItems,
      discount:        Number(discount || 0),
      globalTaxRate:   Number(globalTaxRate || 0),
      status:          status || 'Pending',
      notes
    });

    const savedInvoice = await invoice.save();

    // Adjust stock
    for (const item of validatedItems) {
      const adjustment = invoiceType === 'Purchase' ? item.quantity : -item.quantity;
      await Product.updateOne(
        { _id: item.productId, "variants._id": item.variantId },
        { $inc: { "variants.$.stock": adjustment } }
      );
    }

    res.status(201).json(savedInvoice);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ message: "Invoice not found" });

    // Revert stock from old items
    for (const item of invoice.items) {
      const revertQty = invoice.type === 'Purchase' ? -item.quantity : item.quantity;
      await Product.updateOne(
        { _id: item.productId, "variants._id": item.variantId },
        { $inc: { "variants.$.stock": revertQty } }
      );
    }

    // Merge updates and trigger calculation hook by using .save()
    Object.assign(invoice, {
      ...req.body,
      client: (req.body.client && String(req.body.client).trim() !== '') ? req.body.client : undefined,
      invoiceNumber: invoice.invoiceNumber, // Preserve original
      purchaseNumber: invoice.purchaseNumber // Preserve original
    });

    const updatedInvoice = await invoice.save(); // Totals are recalculated here

    // Apply new stock adjustments
    for (const item of updatedInvoice.items) {
      const adjustment = updatedInvoice.type === 'Purchase' ? item.quantity : -item.quantity;
      await Product.updateOne(
        { _id: item.productId, "variants._id": item.variantId },
        { $inc: { "variants.$.stock": adjustment } }
      );
    }

    res.json(updatedInvoice);
  } catch (error) {
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
      const revertQty = invoice.type === 'Purchase' ? -item.quantity : item.quantity;
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

export const getNextInvoiceNumber = async (req, res) => {
  try {
    const { type } = req.query;
    const field = type === 'Sale' ? 'invoiceNumber' : 'purchaseNumber';
    const prefix = type === 'Sale' ? 'INV-S-' : 'INV-P-';

    const invoices = await Invoice.find({
      user: req.user._id,
      [field]: { $regex: `^${prefix}` }
    }).select(field);

    let maxNum = 0;
    for (const inv of invoices) {
      const val = inv[field];
      if (val) {
        const num = parseInt(val.replace(prefix, ''), 10);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      }
    }

    const nextNum = String(maxNum + 1).padStart(3, '0');
    res.json({ number: `${prefix}${nextNum}` });
  } catch (err) {
    res.status(500).json({ message: 'Failed to generate number' });
  }
};