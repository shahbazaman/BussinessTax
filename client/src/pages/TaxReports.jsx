import React, { useState, useEffect } from 'react';
import { Landmark, Receipt, ArrowUpRight, ArrowDownRight, Calculator } from 'lucide-react';
import api from '../utils/api';
const TaxReports = () => {
  const [invoices, setInvoices] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [invRes, expRes] = await Promise.all([
          api.get('/invoices'),
          api.get('/expenses')
        ]);
        setInvoices(invRes.data);
        setExpenses(expRes.data);
        setLoading(false);
      } catch (err) {
        console.error("Error loading tax data", err);
      }
    };
    fetchData();
  }, []);
  const taxCollected = invoices.reduce((acc, inv) => {
    const subtotal = (inv.convertedAmount || inv.totalAmount) / (1 + (inv.taxRate / 100));
    return acc + ((inv.convertedAmount || inv.totalAmount) - subtotal);
  }, 0);
  const taxDeductible = expenses.reduce((acc, exp) => acc + ((exp.convertedAmount || exp.amount) * 0.15), 0);
  const netTaxOwed = taxCollected - taxDeductible;
  if (loading) return <div className="p-8">Calculating your tax liability...</div>;
  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-slate-900">Tax Reports</h1>
          <p className="text-slate-500 font-medium">Quarterly breakdown of your tax position.</p>
        </div>
        <button className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-800 transition-all">
          <Calculator size={18} /> Export for Accountant
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div className="p-3 bg-blue-50 text-blue-600 w-fit rounded-2xl mb-4"><ArrowUpRight /></div>
          <p className="text-slate-500 text-sm font-bold uppercase tracking-wider">Tax Collected</p>
          <h2 className="text-3xl font-black text-slate-900 mt-1">${taxCollected.toLocaleString(undefined, {minimumFractionDigits: 2})}</h2>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div className="p-3 bg-amber-50 text-amber-600 w-fit rounded-2xl mb-4"><ArrowDownRight /></div>
          <p className="text-slate-500 text-sm font-bold uppercase tracking-wider">Tax Deductible</p>
          <h2 className="text-3xl font-black text-slate-900 mt-1">${taxDeductible.toLocaleString(undefined, {minimumFractionDigits: 2})}</h2>
        </div>
        <div className={`p-6 rounded-3xl border shadow-lg ${netTaxOwed > 0 ? 'bg-red-50 border-red-100' : 'bg-emerald-50 border-emerald-100'}`}>
          <div className={`p-3 w-fit rounded-2xl mb-4 ${netTaxOwed > 0 ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'}`}><Landmark /></div>
          <p className="text-slate-600 text-sm font-bold uppercase tracking-wider">Net Tax Owed</p>
          <h2 className={`text-3xl font-black mt-1 ${netTaxOwed > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
            ${Math.abs(netTaxOwed).toLocaleString(undefined, {minimumFractionDigits: 2})}
          </h2>
        </div>
      </div>
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-50 font-bold text-slate-800">Detailed Transaction Log</div>
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-slate-400 text-xs font-bold uppercase tracking-widest">
            <tr>
              <th className="px-6 py-4">Type</th>
              <th className="px-6 py-4">Ref</th>
              <th className="px-6 py-4">Total Amount</th>
              <th className="px-6 py-4 text-right">Tax Portion</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {invoices.map(inv => (
              <tr key={inv._id} className="hover:bg-slate-50/50">
                <td className="px-6 py-4 font-bold text-blue-600 text-sm">INVOICE</td>
                <td className="px-6 py-4 text-slate-700 font-medium">{inv.clientName}</td>
                <td className="px-6 py-4 text-slate-500">{inv.currencySymbol}{inv.totalAmount}</td>
                <td className="px-6 py-4 text-right font-bold text-red-400">
                  +${((inv.convertedAmount || inv.totalAmount) - (inv.convertedAmount || inv.totalAmount) / (1 + inv.taxRate / 100)).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
export default TaxReports;