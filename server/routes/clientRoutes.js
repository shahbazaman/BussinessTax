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
      billingAddress, shippingAddress 
    } = req.body;

    const client = await Client.create({
      user: req.user.id,
      name, email, phone,
      clientType, businessName, taxId, 
      paymentTerms, creditLimit, openingBalance,
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

export default router;