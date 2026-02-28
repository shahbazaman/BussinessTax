import Invoice from '../models/Invoice.js';
import Product from '../models/Product.js';
export const createInvoice = async (req, res) => {
  try {
    const { 
      clientId, 
      customerName, 
      amount, 
      dueDate, 
      status, 
      type,
      items
    } = req.body; 
    const invoiceType = type || 'Sale';
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
        if (invoiceType === 'Sale' && variant.stock < qty) {
          return res.status(400).json({ 
            message: `Insufficient stock for ${product.title} - ${variant.name}. Available: ${variant.stock}` 
          });
        }
      }
    }
const invoice = await Invoice.create({
  user: req.user._id,
  client: clientId, 
  customerName,     
  invoiceNumber: `INV-${Date.now()}`,
  amount,
  dueDate,
  status: status || 'Pending',
  type: invoiceType,
  items: items || []
});
if (items && items.length > 0) {
  for (const item of items) {
    const qty = Number(item.quantity);
    const adjustment = (invoiceType === 'Purchase') ? qty : -qty;
    await Product.findByIdAndUpdate(item.productId, {
      $inc: { "variants.$[v].stock": adjustment } 
    }, {
      arrayFilters: [{ "v._id": item.variantId }] 
    });
  }
}
await Promise.all(invoice.items.map(async (item) => {
    await Product.findByIdAndUpdate(item.productId, {
        $inc: { quantity: -item.quantity }
    });
}));
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
    const invoices = await Invoice.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json(invoices);
  } catch (error) {
    res.status(500).json({ message: "Error fetching invoices" });
  }
};
export const deleteInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }
    if (invoice.user.toString() !== req.user.id) {
      return res.status(401).json({ message: "Not authorized to delete this" });
    }
    await invoice.deleteOne();
    res.json({ message: "Invoice removed" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};
export const updateInvoice = async (req, res) => {
  try {
    const { customerName, amount, status, dueDate, clientId } = req.body;
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ message: "Invoice not found" });
    if (invoice.user.toString() !== req.user.id) {
      return res.status(401).json({ message: "Not authorized" });
    }
    invoice.customerName = customerName || invoice.customerName;
    invoice.amount = amount || invoice.amount;
    invoice.status = status || invoice.status;
    invoice.dueDate = dueDate || invoice.dueDate;
    invoice.client = clientId || invoice.client;
    const updatedInvoice = await invoice.save();
    res.json(updatedInvoice);
  } catch (error) {
    res.status(500).json({ message: "Server error updating invoice", error: error.message });
  }
};
export const toggleInvoiceStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const invoice = await Invoice.findByIdAndUpdate(
      req.params.id, 
      { status }, 
      { new: true }
    );
    res.json(invoice);
  } catch (err) {
    res.status(500).json({ message: "Update failed" });
  }
};
export const updateInvoiceStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const invoice = await Invoice.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    if (!invoice) return res.status(404).json({ message: "Invoice not found" });
    res.json(invoice);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};