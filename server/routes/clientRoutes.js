import express from 'express';
import Client from '../models/Client.js';
import Invoice from '../models/Invoice.js'; 
import protect from '../middleware/authMiddleware.js';

const router = express.Router();

// @route   GET /api/clients
// @desc    Fetch clients with Revenue and Invoice stats
router.get('/', protect, async (req, res) => {
  try {
    const clients = await Client.find({ user: req.user.id }).lean();
    const invoices = await Invoice.find({ user: req.user.id });

    const clientsWithStats = clients.map(client => {
      const clientInvoices = invoices.filter(inv => 
        inv.client && inv.client.toString() === client._id.toString()
      );
      const totalInvoiced = clientInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);      
      return {
        ...client,
        invoiceCount: clientInvoices.length,
        totalInvoiced: totalInvoiced
      };
    });

    res.json(clientsWithStats);
  } catch (err) {
    res.status(500).json({ message: "Error fetching clients" });
  }
});
// Add this to routes/clientRoutes.js
router.get('/names', protect, async (req, res) => {
  try {
    const clients = await Client.find({ user: req.user.id }).select('name');
    res.json(clients);
  } catch (err) {
    res.status(500).json({ message: "Error fetching names" });
  }
});
// @route   POST /api/clients
// @desc    Add new client (Supports Shipping, Client Type, & Terms)
router.post('/', protect, async (req, res) => {
  try {
    const { 
  name, email, phone, clientType, businessName, 
  taxId, paymentTerms, creditLimit, openingBalance,
  billingAddress, shippingAddress, businessCategory
} = req.body;

    const client = await Client.create({
      user: req.user.id,
      name, email, phone,
      clientType, businessName, taxId, 
      paymentTerms, creditLimit, openingBalance, businessCategory,
      billingAddress, shippingAddress
    });

    res.status(201).json(client);
  } catch (err) {
    res.status(500).json({ message: "Error creating client" });
  }
});

// @route   PUT /api/clients/:id
// @desc    Update client including professional accounting fields
router.put('/:id', protect, async (req, res) => {
  try {
    const updatedClient = await Client.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { $set: req.body }, // Dynamically updates nested address objects
      { new: true }
    );
    
    if (!updatedClient) return res.status(404).json({ message: "Client not found" });
    res.json(updatedClient);
  } catch (err) {
    res.status(500).json({ message: "Error updating client" });
  }
});

// @route   DELETE /api/clients/:id
router.delete('/:id', protect, async (req, res) => {
  try {
    const client = await Client.findOneAndDelete({ _id: req.params.id, user: req.user.id });
    if (!client) return res.status(404).json({ message: "Client not found" });
    res.json({ message: "Client removed" });
  } catch (err) {
    res.status(500).json({ message: "Error deleting client" });
  }
});
// GET /api/clients/ar-aging
router.get('/ar-aging', protect, async (req, res) => {
  try {
    const Invoice = (await import('../models/Invoice.js')).default;
    const Client  = (await import('../models/Client.js')).default;
    const now = new Date();

    const unpaid = await Invoice.find({
      userId: req.user._id,
      type: 'Sale',
      status: { $in: ['Unpaid', 'Partial'] }
    }).populate('clientId', 'name').lean();

    const map = {};
    for (const inv of unpaid) {
      const name = inv.clientId?.name || 'Unknown';
      if (!map[name]) map[name] = { client: name, '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0, total: 0 };
      const days = Math.floor((now - new Date(inv.dueDate || inv.date)) / 86400000);
      const bucket = days <= 30 ? '0-30' : days <= 60 ? '31-60' : days <= 90 ? '61-90' : '90+';
      const due = inv.totalAmount - (inv.paidAmount || 0);
      map[name][bucket] += due;
      map[name].total   += due;
    }
    res.json(Object.values(map));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
export default router;