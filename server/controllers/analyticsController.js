import Invoice from '../models/Invoice.js';
import Transaction from '../models/Transaction.js';
import Product from '../models/Product.js';

export const getMonthlyReport = async (req, res) => {
  try {
    const userId = req.user._id;
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    // 1. Calculate Total Revenue (Paid Invoices this month)
    const revenueData = await Invoice.aggregate([
      { $match: { user: userId, status: 'Paid', date: { $gte: startOfMonth } } },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } }
    ]);

    // 2. Calculate Total Expenses (Payroll + other Expenses)
    const expenseData = await Transaction.aggregate([
      { $match: { userId: userId, type: 'Expense', createdAt: { $gte: startOfMonth } } },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);

    // 3. Calculate Total Inventory Value (Cost Price * Stock)
    const products = await Product.find({ user: userId });
    let inventoryValue = 0;
    products.forEach(p => {
      p.variants.forEach(v => {
        inventoryValue += (v.stock * (p.costPrice || 0));
      });
    });

    const totalRevenue = revenueData[0]?.total || 0;
    const totalExpenses = expenseData[0]?.total || 0;
    const netProfit = totalRevenue - totalExpenses;

    res.json({
      month: new Date().toLocaleString('default', { month: 'long' }),
      revenue: totalRevenue,
      expenses: totalExpenses,
      profit: netProfit,
      inventoryValue: inventoryValue,
      profitMargin: totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(2) : 0
    });

  } catch (error) {
    res.status(500).json({ message: "Analytics Error", error: error.message });
  }
};