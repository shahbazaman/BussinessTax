import Client from '../models/Client.js'; // <-- FIXED: Changed from Customer.js

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