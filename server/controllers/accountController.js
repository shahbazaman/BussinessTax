export const transferFunds = async (req, res) => {
  const { fromId, toId, amount } = req.body;
  const numAmount = Number(amount);
  try {
    await Account.findByIdAndUpdate(fromId, { $inc: { balance: -numAmount } });
    await Account.findByIdAndUpdate(toId, { $inc: { balance: numAmount } });
    res.json({ message: "Transfer successful" });
  } catch (err) {
    res.status(500).json({ message: "Transfer failed" });
  }
};