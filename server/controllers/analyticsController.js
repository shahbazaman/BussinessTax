import Invoice from '../models/Invoice.js';
import Transaction from '../models/Transaction.js';
import Product from '../models/Product.js';

export const getMonthlyReport = async (req, res) => {
  try {
    const userId = req.user._id;
    // Removed the 'startOfMonth' constraint so you can see data immediately. 
    // You can add it back later if you want strictly monthly reports.

    // 1. Calculate Total Revenue (All Paid Invoices)
    const revenueData = await Invoice.aggregate([
      { $match: { user: userId, status: 'Paid' } },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } }
    ]);

    // 2. Calculate Total Expenses
    const expenseData = await Transaction.aggregate([
      { $match: { userId: userId, type: 'Expense' } },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);

    // 3. Inventory Value logic fix (using variant costPrice)
    const products = await Product.find({ user: userId });
    let inventoryValue = 0;
    products.forEach(p => {
      p.variants.forEach(v => {
        // v.costPrice is likely where your data is stored based on previous files
        inventoryValue += (v.stock * (v.costPrice || 0));
      });
    });

    const totalIncome = revenueData[0]?.total || 0;
    const totalExpenses = expenseData[0]?.total || 0;
    const netProfit = totalIncome - totalExpenses;

    res.json({
      totalIncome,
      totalExpenses,
      netProfit,
      inventoryValue,
      month: new Date().toLocaleString('default', { month: 'long' }),
      profitMargin: totalIncome > 0 ? ((netProfit / totalIncome) * 100).toFixed(2) : 0
    });

  } catch (error) {
    res.status(500).json({ message: "Analytics Error", error: error.message });
  }
};