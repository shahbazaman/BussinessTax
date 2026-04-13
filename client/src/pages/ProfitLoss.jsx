import React, { useState, useEffect, useContext } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Loader2 } from 'lucide-react';
import api from '../utils/api';
import { toast } from 'react-toastify';
import { CurrencyContext } from '../context/CurrencyContext';

const ProfitLoss = () => {
  const { symbol } = useContext(CurrencyContext);
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/ledger-accounts/reports/trial-balance')
      .then(r => {
        const rows = r.data.rows || [];
        const revenue  = rows.filter(r => r.type === 'Revenue');
        const expenses = rows.filter(r => r.type === 'Expense');
        const totalRevenue  = revenue.reduce((s,r)  => s + r.totalCredit, 0);
        const totalExpenses = expenses.reduce((s,r) => s + r.totalDebit,  0);
        setData({ revenue, expenses, totalRevenue, totalExpenses, netProfit: totalRevenue - totalExpenses });
      })
      .catch(() => toast.error('Failed to load P&L.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex flex-col justify-center items-center h-screen gap-4 bg-slate-50">
      <Loader2 className="animate-spin text-indigo-600" size={40} />
      <p className="text-slate-400 font-black animate-pulse uppercase tracking-widest text-[10px]">Loading P&L...</p>
    </div>
  );

  const fmt = (n) => `${symbol}${Number(n||0).toLocaleString(undefined,{minimumFractionDigits:2})}`;
  const isProfit = (data?.netProfit || 0) >= 0;

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-4xl mx-auto min-h-screen bg-slate-50">

      {/* Header */}
      <div className="flex items-center gap-3 mb-1">
        <div className="p-2.5 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-200">
          <DollarSign size={22} className="text-white" />
        </div>
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Profit & Loss</h2>
          <p className="text-slate-500 font-medium text-sm">Revenue minus Expenses = Net Profit</p>
        </div>
      </div>

      {/* Net Profit card */}
      <div className={`rounded-2xl p-6 border ${isProfit ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
        <p className="text-[10px] font-black uppercase tracking-widest mb-1 text-slate-500">Net {isProfit ? 'Profit' : 'Loss'}</p>
        <p className={`text-4xl font-black ${isProfit ? 'text-emerald-600' : 'text-rose-600'}`}>
          {isProfit ? '+' : '-'}{fmt(Math.abs(data?.netProfit || 0))}
        </p>
        <p className="text-xs text-slate-400 mt-2 font-medium">
          {fmt(data?.totalRevenue)} revenue − {fmt(data?.totalExpenses)} expenses
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={16} className="text-emerald-500"/>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Revenue</p>
          </div>
          <p className="text-2xl font-black text-emerald-600">{fmt(data?.totalRevenue)}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown size={16} className="text-rose-500"/>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Expenses</p>
          </div>
          <p className="text-2xl font-black text-rose-600">{fmt(data?.totalExpenses)}</p>
        </div>
      </div>

      {/* Revenue Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3 bg-emerald-50 border-b border-emerald-100 flex justify-between items-center">
          <span className="text-xs font-black text-emerald-700 uppercase tracking-widest">Revenue</span>
          <span className="text-sm font-black text-emerald-700">{fmt(data?.totalRevenue)}</span>
        </div>
        <table className="w-full text-xs">
          <tbody className="divide-y divide-slate-50">
            {data?.revenue.length === 0 && (
              <tr><td colSpan={2} className="px-5 py-6 text-center text-slate-400 font-bold">No revenue entries yet</td></tr>
            )}
            {data?.revenue.map(r => (
              <tr key={r._id} className="hover:bg-slate-50">
                <td className="px-5 py-3 font-bold text-slate-700">{r.name}</td>
                <td className="px-5 py-3 text-right font-black text-emerald-600">{fmt(r.totalCredit)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3 bg-rose-50 border-b border-rose-100 flex justify-between items-center">
          <span className="text-xs font-black text-rose-700 uppercase tracking-widest">Expenses</span>
          <span className="text-sm font-black text-rose-700">{fmt(data?.totalExpenses)}</span>
        </div>
        <table className="w-full text-xs">
          <tbody className="divide-y divide-slate-50">
            {data?.expenses.length === 0 && (
              <tr><td colSpan={2} className="px-5 py-6 text-center text-slate-400 font-bold">No expense entries yet</td></tr>
            )}
            {data?.expenses.map(r => (
              <tr key={r._id} className="hover:bg-slate-50">
                <td className="px-5 py-3 font-bold text-slate-700">{r.name}</td>
                <td className="px-5 py-3 text-right font-black text-rose-600">{fmt(r.totalDebit)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-center text-[10px] text-slate-300 font-bold uppercase tracking-widest pb-4">
        P&L Statement · Computed from all journal entries
      </p>
    </div>
  );
};

export default ProfitLoss;