import Client from '../models/Client.js';

// @desc    Get all clients for the user
export const getClients = async (req, res) => {
  try {
    const clients = await Client.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json(clients);
  } catch (err) {
    res.status(500).json({ message: "Error fetching clients" });
  }
};

// @desc    Create a new client with advanced fields
export const createClient = async (req, res) => {
  try {
    const { 
      name, email, phone, clientType, businessName, 
      taxId, paymentTerms, creditLimit, openingBalance,
      billingAddress, shippingAddress 
    } = req.body;

    const client = new Client({
      user: req.user.id,
      name,
      email,
      phone,
      clientType,
      businessName,
      taxId,
      paymentTerms,
      creditLimit,
      openingBalance,
      billingAddress,
      shippingAddress
    });

    const savedClient = await client.save();
    res.status(201).json(savedClient);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// @desc    Update client details
export const updateClient = async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);

    if (!client) return res.status(404).json({ message: "Client not found" });
    if (client.user.toString() !== req.user.id) return res.status(401).json({ message: "Not authorized" });

    // Update fields dynamically
    const updatedClient = await Client.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    );

    res.json(updatedClient);
  } catch (err) {
    res.status(400).json({ message: "Update failed" });
  }
};

// @desc    Delete client
export const deleteClient = async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);

    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }

    if (client.user.toString() !== req.user.id) {
      return res.status(401).json({ message: "Not authorized" });
    }

    await client.deleteOne();
    res.json({ message: "Client removed successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error during deletion" });
  }
};