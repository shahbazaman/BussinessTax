import Invoice from '../models/Invoice.js';
import Transaction from '../models/Transaction.js';

export const getMonthlyReport = async (req, res) => {
  try {
    const userId = req.user._id;

    // 1. Calculate Total Revenue from Invoices
    const revenueData = await Invoice.aggregate([
      { $match: { user: userId, status: 'Paid' } },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } }
    ]);

    // 2. Calculate Total Expenses & Breakdown from Transactions
    // We group by 'description' since 'category' doesn't exist in your model
    const categoryTotals = await Transaction.aggregate([
      { $match: { userId: userId, status: 'Completed' } },
      { $group: { 
          _id: "$description", 
          total: { $sum: "$amount" } 
        } 
      },
      { $sort: { total: -1 } }
    ]);

    const totalIncome = revenueData[0]?.total || 0;
    // Sum up all transactions as expenses for now
    const totalExpenses = categoryTotals.reduce((acc, curr) => acc + curr.total, 0);
    const netProfit = totalIncome - totalExpenses;

    res.json({
      totalIncome: Number(totalIncome),
      totalExpenses: Number(totalExpenses),
      netProfit: Number(netProfit),
      categoryTotals, // This feeds the progress bars in TaxSummary
      month: new Date().toLocaleString('default', { month: 'long' }),
      taxRate: 15 // Default rate
    });

  } catch (error) {
    console.error("Analytics Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};