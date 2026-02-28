import Invoice from '../models/Invoice.js';
import Client from '../models/Client.js';
import Expense from '../models/Expense.js';
import Account from '../models/Account.js'; 
export const getDashboardStats = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const [clientsCount, invoiceCount, unpaidBillsCount, invoices, expenses] = await Promise.all([
      Client.countDocuments({ user: userId }),
      Invoice.countDocuments({ user: userId }),
      Expense.countDocuments({ user: userId, status: 'Unpaid' }),
      Invoice.find({ user: userId }),
      Expense.find({ user: userId })
    ]);
    const totalIncome = invoices
      .filter(inv => inv.status === 'Paid')
      .reduce((acc, inv) => acc + Number(inv.amount || 0), 0);
    const totalExpenses = expenses
      .reduce((acc, exp) => acc + Number(exp.amount || 0), 0);
    const netProfit = totalIncome - totalExpenses;
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const chartData = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const targetMonth = d.getMonth();
      const targetYear = d.getFullYear();
      const monthlyIncome = invoices
        .filter(inv => {
          const invDate = new Date(inv.createdAt);
          return invDate.getMonth() === targetMonth && 
                 invDate.getFullYear() === targetYear && 
                 inv.status === 'Paid';
        })
        .reduce((acc, inv) => acc + Number(inv.amount || 0), 0);
      const monthlyExpense = expenses
        .filter(exp => {
          const expDate = new Date(exp.createdAt); 
          return expDate.getMonth() === targetMonth && 
                 expDate.getFullYear() === targetYear;
        })
        .reduce((acc, exp) => acc + Number(exp.amount || 0), 0);
      chartData.push({ 
        name: monthNames[targetMonth], 
        income: monthlyIncome, 
        expense: monthlyExpense 
      });
    }
    res.json({
      customers: clientsCount,
      vendors: 0,
      invoiceCount,
      bills: unpaidBillsCount,
      totalIncome: Number(totalIncome.toFixed(2)),
      totalExpenses: Number(totalExpenses.toFixed(2)),
      netProfit: Number(netProfit.toFixed(2)),
      chartData
    });
  } catch (err) {
    console.error("Dashboard Stats Error:", err);
    res.status(500).json({ message: 'Error generating dashboard stats' });
  }
};
export const generateReportPDF = async (req, res) => {
    res.status(200).json({ message: "Feature coming soon!" });
};