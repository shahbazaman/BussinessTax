import Invoice from '../models/Invoice.js';
import Product from '../models/Product.js';

export const createInvoice = async (req, res) => {
  try {
    const { 
      clientId, items, discount, type, 
      invoiceDate, status, notes, 
      globalTaxRate, gstNumber, billingAddress 
    } = req.body; 

    if (!req.user?._id) return res.status(401).json({ message: "Auth failed" });

    const invoiceType = type || 'Sale';

    // 1. AUTO-INCREMENT NUMBERING LOGIC
    const lastInvoice = await Invoice.findOne({ type: invoiceType, user: req.user._id })
      .sort({ createdAt: -1 });

    let nextNumber;
    const prefix = invoiceType === 'Sale' ? 'INV' : 'PI';
    
    if (lastInvoice) {
      const lastNumStr = invoiceType === 'Sale' ? lastInvoice.invoiceNumber : lastInvoice.purchaseNumber;
      const lastNum = parseInt(lastNumStr?.split('-')[1]) || 0;
      nextNumber = `${prefix}-${(lastNum + 1).toString().padStart(4, '0')}`;
    } else {
      nextNumber = `${prefix}-0001`;
    }

    // 2. Validate Items & Prices
    const validatedItems = [];
    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product) return res.status(404).json({ message: `Product not found` });
      
      const variant = product.variants.id(item.variantId);
      validatedItems.push({
        productId: item.productId,
        variantId: item.variantId,
        name: item.name || product.title,
        quantity: Number(item.quantity || 0),
        price: Number(item.price || 0)
      });
    }

    // 3. Create Invoice Instance
    const invoice = new Invoice({
      user: req.user._id,
      client: clientId, 
      invoiceNumber: invoiceType === 'Sale' ? nextNumber : undefined,
      purchaseNumber: invoiceType === 'Purchase' ? nextNumber : undefined,
      invoiceDate: invoiceDate || new Date(),
      // dueDate is handled automatically in Invoice.js pre-save hook
      gstNumber,
      billingAddress,
      items: validatedItems,
      discount: Number(discount || 0),
      globalTaxRate: Number(globalTaxRate || 0),
      status: status || 'Pending',
      type: invoiceType,
      notes
    });

    const savedInvoice = await invoice.save();

    // 4. Adjust Stock
    for (const item of validatedItems) {
      const adjustment = (invoiceType === 'Purchase') ? item.quantity : -item.quantity;
      await Product.updateOne(
        { _id: item.productId, "variants._id": item.variantId },
        { $inc: { "variants.$.stock": adjustment } }
      );
    }
    
    res.status(201).json(savedInvoice);
  } catch (error) {
    console.error("CREATE INVOICE ERROR:", error); 
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
      await Product.updateOne(
        { _id: item.productId, "variants._id": item.variantId },
        { $inc: { "variants.$.stock": revertQty } }
      );
    }

    const { items, clientId, ...updateData } = req.body;
    
    if (clientId) oldInvoice.client = clientId;
    if (items) oldInvoice.items = items;
    
    Object.assign(oldInvoice, updateData);
    const updatedInvoice = await oldInvoice.save();

    // 2. Apply new stock
    for (const item of updatedInvoice.items) {
      const newAdjustment = (updatedInvoice.type === 'Purchase') ? item.quantity : -item.quantity;
      await Product.updateOne(
        { _id: item.productId, "variants._id": item.variantId },
        { $inc: { "variants.$.stock": newAdjustment } }
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
    ).populate('client', 'name email');
    res.json(invoice);
  } catch (err) {
    res.status(500).json({ message: "Status update failed" });
  }
};