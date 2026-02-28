import express from 'express';
import Client from '../models/Client.js';
import Invoice from '../models/Invoice.js'; // Ensure this path matches your project
import protect from '../middleware/authMiddleware.js';

const router = express.Router();

// GET: Fetch clients with correctly mapped Revenue and Invoice Counts
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

// POST: Add new client
router.post('/', protect, async (req, res) => {
  try {
    const { name, email, phone, address } = req.body;
    const client = await Client.create({
      user: req.user.id,
      name, email, phone, address
    });
    res.status(201).json(client);
  } catch (err) {
    res.status(500).json({ message: "Error creating client" });
  }
});

// PUT: Edit existing client
router.put('/:id', protect, async (req, res) => {
  try {
    const { name, email, phone, address } = req.body;
    const updatedClient = await Client.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id }, // Ensure user owns the client
      { name, email, phone, address },
      { returnDocument: 'after' }
    );
    
    if (!updatedClient) return res.status(404).json({ message: "Client not found" });
    res.json(updatedClient);
  } catch (err) {
    res.status(500).json({ message: "Error updating client" });
  }
});

// DELETE: Remove client
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