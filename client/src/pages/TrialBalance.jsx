import React, { useState, useEffect, useContext } from 'react';
import { Scale, Loader2, TrendingUp, TrendingDown, CheckCircle, XCircle } from 'lucide-react';
import api from '../utils/api';
import { toast } from 'react-toastify';
import { CurrencyContext } from '../context/CurrencyContext';

const TYPE_COLOR = {
  Asset:     'bg-blue-50 text-blue-700',
  Liability: 'bg-orange-50 text-orange-700',
  Equity:    'bg-purple-50 text-purple-700',
  Revenue:   'bg-emerald-50 text-emerald-700',
  Expense:   'bg-rose-50 text-rose-700',
};

const TrialBalance = () => {
  const { symbol } = useContext(CurrencyContext);
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/ledger-accounts/reports/trial-balance')
      .then(r => setData(r.data))
      .catch(() => toast.error('Failed to load trial balance.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex flex-col justify-center items-center h-screen gap-4 bg-slate-50">
      <Loader2 className="animate-spin text-indigo-600" size={40} />
      <p className="text-slate-400 font-black animate-pulse uppercase tracking-widest text-[10px]">Loading Trial Balance...</p>
    </div>
  );

  const isBalanced = data?.grandDebit === data?.grandCredit;
  const fmt = (n) => `${symbol}${Number(n||0).toLocaleString(undefined,{minimumFractionDigits:2})}`;

  // Group by type
  const types = ['Asset','Liability','Equity','Revenue','Expense'];
  const grouped = types.reduce((acc, t) => {
    const items = (data?.rows||[]).filter(r => r.type === t);
    if (items.length) acc[t] = items;
    return acc;
  }, {});

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-5xl mx-auto min-h-screen bg-slate-50">

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2.5 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-200">
              <Scale size={22} className="text-white" />
            </div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Trial Balance</h2>
          </div>
          <p className="text-slate-500 font-medium text-sm ml-1">Total debits must equal total credits</p>
        </div>
        {/* Balanced indicator */}
        <div className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-black text-sm ${isBalanced ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
          {isBalanced ? <CheckCircle size={18}/> : <XCircle size={18}/>}
          {isBalanced ? 'Balanced ✓' : 'Not Balanced — check entries'}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown size={16} className="text-rose-500"/>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Debits</p>
          </div>
          <p className="text-2xl font-black text-rose-600">{fmt(data?.grandDebit)}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={16} className="text-emerald-500"/>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Credits</p>
          </div>
          <p className="text-2xl font-black text-emerald-600">{fmt(data?.grandCredit)}</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="px-5 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Account</th>
              <th className="px-5 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Type</th>
              <th className="px-5 py-3 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Debit</th>
              <th className="px-5 py-3 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Credit</th>
              <th className="px-5 py-3 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Balance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {Object.entries(grouped).map(([type, items]) => (
              <>
                {/* Group label row */}
                <tr key={`group-${type}`} className="bg-slate-50/60">
                  <td colSpan={5} className="px-5 py-1.5">
                    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${TYPE_COLOR[type]}`}>{type}</span>
                  </td>
                </tr>
                {items.map(row => (
                  <tr key={row._id} className="hover:bg-slate-50/50">
                    <td className="px-5 py-3 font-bold text-slate-700">{row.name}</td>
                    <td className="px-5 py-3">
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${TYPE_COLOR[row.type]}`}>{row.type}</span>
                    </td>
                    <td className="px-5 py-3 text-right font-black text-rose-600">
                      {row.totalDebit > 0 ? fmt(row.totalDebit) : <span className="text-slate-200">—</span>}
                    </td>
                    <td className="px-5 py-3 text-right font-black text-emerald-600">
                      {row.totalCredit > 0 ? fmt(row.totalCredit) : <span className="text-slate-200">—</span>}
                    </td>
                    <td className={`px-5 py-3 text-right font-black ${row.balance >= 0 ? 'text-slate-800' : 'text-orange-600'}`}>
                      {row.balance < 0 ? '-' : ''}{fmt(Math.abs(row.balance))}
                    </td>
                  </tr>
                ))}
              </>
            ))}
            {/* Grand total row */}
            <tr className="border-t-2 border-slate-200 bg-slate-50">
              <td className="px-5 py-3 font-black text-slate-900 text-sm" colSpan={2}>TOTAL</td>
              <td className="px-5 py-3 text-right font-black text-rose-700 text-sm">{fmt(data?.grandDebit)}</td>
              <td className="px-5 py-3 text-right font-black text-emerald-700 text-sm">{fmt(data?.grandCredit)}</td>
              <td className={`px-5 py-3 text-right font-black text-sm ${isBalanced ? 'text-emerald-600' : 'text-rose-600'}`}>
                {fmt(Math.abs((data?.grandDebit||0) - (data?.grandCredit||0)))}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p className="text-center text-[10px] text-slate-300 font-bold uppercase tracking-widest pb-4">
        Trial Balance · Based on all journal entries in the system
      </p>
    </div>
  );
};

export default TrialBalance;