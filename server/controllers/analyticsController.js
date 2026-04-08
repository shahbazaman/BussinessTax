import Invoice from '../models/Invoice.js';
import Expense from '../models/Expense.js';

export const getMonthlyReport = async (req, res) => {
  try {
    const userId = req.user._id;

    const [invoices, expenses] = await Promise.all([
      Invoice.find({ user: userId }),
      Expense.find({ user: userId })
    ]);

    // Income = all Sale-type invoices that are Paid
    const totalIncome = invoices
      .filter(inv => inv.type === 'Sale' && inv.status === 'Paid')
      .reduce((acc, inv) => acc + Number(inv.totalAmount || 0), 0);

    // Expenses = actual Expense records + Purchase-type invoices
    const totalExpenseRecords = expenses
      .reduce((acc, exp) => acc + Number(exp.amount || 0), 0);

    const totalPurchaseInvoices = invoices
      .filter(inv => inv.type === 'Purchase')
      .reduce((acc, inv) => acc + Number(inv.totalAmount || 0), 0);

    const totalExpenses = totalExpenseRecords + totalPurchaseInvoices;
    const netProfit = totalIncome - totalExpenses;

    res.json({
      totalIncome:   Number(totalIncome.toFixed(2)),
      totalExpenses: Number(totalExpenses.toFixed(2)),
      netProfit:     Number(netProfit.toFixed(2)),
      summary: {
        totalIncome:   Number(totalIncome.toFixed(2)),
        totalExpenses: Number(totalExpenses.toFixed(2)),
        netProfit:     Number(netProfit.toFixed(2)),
      }
    });
  } catch (error) {
    console.error('Analytics Error:', error);
    res.status(500).json({ message: error.message });
  }
};