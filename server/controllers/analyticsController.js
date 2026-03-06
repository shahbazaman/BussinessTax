import Invoice from '../models/Invoice.js';
import Transaction from '../models/Transaction.js';
// Example of what the backend should return for this frontend to work
export const getMonthlyReport = async (req, res) => {
  try {
    const report = await Invoice.aggregate([
      { $match: { user: req.user._id } },
      {
        $group: {
          _id: null,
          totalRevenue: { 
            $sum: { $cond: [{ $eq: ["$type", "Sale"] }, "$totalAmount", 0] } 
          },
          totalExpenses: { 
            $sum: { $cond: [{ $eq: ["$type", "Purchase"] }, "$totalAmount", 0] } 
          }
        }
      }
    ]);

    const data = report[0] || { totalRevenue: 0, totalExpenses: 0 };
    res.json({
      totalIncome: data.totalRevenue,
      totalExpenses: data.totalExpenses,
      netProfit: data.totalRevenue - data.totalExpenses
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};