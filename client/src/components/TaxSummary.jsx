import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { Download, PieChart, TrendingUp, AlertCircle, FileSpreadsheet } from 'lucide-react';
const TaxSummary = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const res = await api.get('/dashboard/summary');
        setData(res.data);
      } catch (err) {
        console.error("Summary fetch failed");
      } finally {
        setLoading(false);
      }
    };
    fetchSummary();
  }, []);
  if (loading) return <div className="p-10 text-center text-slate-400">Calculating your tax outlook...</div>;
  const taxableIncome = (data?.totalRevenue || 0) - (data?.totalExpenses || 0);
const userTaxRate = data?.userSettings?.taxRate || 20; 
const estimatedTax = taxableIncome > 0 ? taxableIncome * (userTaxRate / 100) : 0;
  return (
    <div className="p-4 lg:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="text-3xl font-black text-slate-800">Tax Overview</h2>
            <p className="text-slate-500">Estimated based on current fiscal year data</p>
          </div>
          <button className="flex items-center gap-2 bg-white border border-slate-200 px-4 py-2 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all shadow-sm">
            <Download size={16} /> Export Report
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Revenue</p>
            <p className="text-2xl font-black text-green-600">${data?.totalRevenue?.toLocaleString()}</p>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Expenses</p>
            <p className="text-2xl font-black text-red-500">-${data?.totalExpenses?.toLocaleString()}</p>
          </div>
          <div className="bg-slate-900 p-6 rounded-3xl shadow-xl shadow-slate-200">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Taxable Income</p>
            <p className="text-2xl font-black text-white">${taxableIncome.toLocaleString()}</p>
          </div>
        </div>
        <div className="bg-linear-to-br from-indigo-600 to-violet-700 rounded-[2.5rem] p-8 text-white relative overflow-hidden mb-8">
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-4 opacity-80">
              <TrendingUp size={20} />
              <span className="text-xs font-bold uppercase tracking-widest">Est. Tax Liability (20%)</span>
            </div>
            <h3 className="text-5xl font-black mb-2">${estimatedTax.toLocaleString()}</h3>
            <p className="text-indigo-100 text-sm max-w-md">
              This is an automated estimate. Ensure all your business expenses are recorded to maximize your deductions.
            </p>
          </div>
          <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
        </div>
        <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
          <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <PieChart size={18} className="text-indigo-500" /> Expense Breakdown
          </h4>
          <div className="space-y-4">
            {data?.categoryTotals?.map((cat, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-sm text-slate-500 font-medium">{cat._id}</span>
                <div className="flex-1 mx-4 h-2 bg-slate-50 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-indigo-500 rounded-full" 
                    style={{ width: `${(cat.total / data.totalExpenses) * 100}%` }}
                  ></div>
                </div>
                <span className="text-sm font-bold text-slate-800">${cat.total.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
export default TaxSummary;