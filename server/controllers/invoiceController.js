import Invoice from '../models/Invoice.js';
import Product from '../models/Product.js';

// ─── Helper: find true highest sequence and return next number ──────────────
const getNextNumber = async (userId, type) => {
  const field = type === 'Sale' ? 'invoiceNumber' : 'purchaseNumber';
  const prefix = type === 'Sale' ? 'INV-S-' : 'INV-P-';

  const allInvoices = await Invoice.find(
    { user: userId, type: type, [field]: { $exists: true, $ne: null } },
    { [field]: 1 }
  );

  let maxSeq = 0;
  for (const inv of allInvoices) {
    const code = inv[field];
    if (!code) continue;
    const parts = code.split('-');
    const num = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(num) && num > maxSeq) maxSeq = num;
  }

  return `${prefix}${String(maxSeq + 1).padStart(3, '0')}`;
};

export const createInvoice = async (req, res) => {
  try {
    const {
      client, items, discount, type, invoiceDate, status,
      notes, globalTaxRate, gstNumber, billingAddress,
      shippingAddress, referenceNumber
    } = req.body;

    if (!req.user?._id) return res.status(401).json({ message: "Auth failed" });

    const invoiceType = type || 'Sale';

    // ─── Generate next unique number ────────────────────────────────────────
    const field = invoiceType === 'Sale' ? 'invoiceNumber' : 'purchaseNumber';
    let nextNumber;
    let attempts = 0;

    while (attempts < 10) {
      nextNumber = await getNextNumber(req.user._id, invoiceType);
      const exists = await Invoice.findOne({ user: req.user._id, [field]: nextNumber });
      if (!exists) break;
      attempts++;
    }

    const invoiceNumber  = invoiceType === 'Sale'     ? nextNumber : undefined;
    const purchaseNumber = invoiceType === 'Purchase' ? nextNumber : undefined;

    // Only store referenceNumber if user actually typed something
    const resolvedRefNum = (invoiceType === 'Purchase' && referenceNumber?.trim())
      ? referenceNumber.trim()
      : undefined;

    // ─── Validate items ─────────────────────────────────────────────────────
    const validatedItems = [];
    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product) return res.status(404).json({ message: `Product not found` });

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

    // ─── Create and save ────────────────────────────────────────────────────
    const invoice = new Invoice({
      user: req.user._id,
      client,
      invoiceDate: invoiceDate || new Date(),
      type: invoiceType,
      invoiceNumber,
      purchaseNumber,
      referenceNumber: resolvedRefNum,
      gstNumber,
      billingAddress,
      shippingAddress,
      items: validatedItems,
      discount: Number(discount || 0),
      globalTaxRate: Number(globalTaxRate || 0),
      status: status || 'Pending',
      notes
    });

    const savedInvoice = await invoice.save();

    // ─── Adjust stock ───────────────────────────────────────────────────────
    for (const item of validatedItems) {
      const adjustment = invoiceType === 'Purchase' ? item.quantity : -item.quantity;
      await Product.updateOne(
        { _id: item.productId, "variants._id": item.variantId },
        { $inc: { "variants.$.stock": adjustment } }
      );
    }

    res.status(201).json(savedInvoice);

  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0];
      return res.status(400).json({
        message: `Duplicate number on ${field}. Please refresh and try again.`
      });
    }
    res.status(500).json({ message: error.message });
  }
};

export const updateInvoice = async (req, res) => {
  try {
    const oldInvoice = await Invoice.findById(req.params.id);
    if (!oldInvoice) return res.status(404).json({ message: "Invoice not found" });

    for (const item of oldInvoice.items) {
      const revertQty = (oldInvoice.type === 'Purchase') ? -item.quantity : item.quantity;
      await Product.updateOne(
        { _id: item.productId, "variants._id": item.variantId },
        { $inc: { "variants.$.stock": revertQty } }
      );
    }

    const invoiceType = req.body.type || oldInvoice.type;
    const cleanedUpdate = {
      ...req.body,
      invoiceNumber: invoiceType === 'Sale' ? (req.body.invoiceNumber || undefined) : undefined,
      purchaseNumber: invoiceType === 'Purchase' ? (req.body.purchaseNumber || undefined) : undefined,
      referenceNumber: (invoiceType === 'Purchase' && req.body.referenceNumber?.trim())
        ? req.body.referenceNumber.trim()
        : undefined,
      $unset: invoiceType === 'Sale'
        ? { purchaseNumber: 1, referenceNumber: 1 }
        : { invoiceNumber: 1 }
    };

    const updatedInvoice = await Invoice.findByIdAndUpdate(
      req.params.id,
      cleanedUpdate,
      { new: true, runValidators: true }
    );

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