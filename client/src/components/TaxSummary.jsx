import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { Download, PieChart, TrendingUp, AlertCircle, FileSpreadsheet } from 'lucide-react';

const TaxSummary = () => {
  const [data, setData] = useState({
    totalIncome: 0,
    totalExpenses: 0,
    netProfit: 0,
    categoryTotals: [] // Backend will group by 'description' into here
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        // Points to your analytics controller
        const res = await api.get('/analytics/monthly-report');
        setData(res.data);
      } catch (err) {
        console.error("Summary fetch failed", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSummary();
  }, []);

  if (loading) return (
    <div className="flex justify-center items-center h-64">
       <div className="animate-pulse text-slate-400 font-bold uppercase tracking-tighter">Calculating your tax outlook...</div>
    </div>
  );

  // LOGIC: Using fields available in your specific Transaction model
const revenue = Number(data?.totalIncome || 0);
const expenses = Number(data?.totalExpenses || 0);
const taxableIncome = revenue - expenses;
const taxRateValue = data?.taxRate || 15;
const estimatedTax = taxableIncome > 0 ? (taxableIncome * (taxRateValue / 100)) : 0;
  return (
    <div className="p-4 lg:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="text-3xl font-black text-slate-800">Tax Overview</h2>
            <p className="text-slate-500">Estimated based on current fiscal year data</p>
          </div>
          <button className="flex items-center gap-2 bg-white border border-slate-200 px-4 py-2 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all shadow-sm active:scale-95">
            <Download size={16} /> Export Report
          </button>
        </div>

        {/* The Math Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Revenue</p>
            <p className="text-2xl font-black text-green-600">${revenue.toLocaleString()}</p>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Expenses</p>
            <p className="text-2xl font-black text-red-500">-${expenses.toLocaleString()}</p>
          </div>
          <div className="bg-slate-900 p-6 rounded-3xl shadow-xl shadow-slate-200">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Taxable Income</p>
            <p className="text-2xl font-black text-white">${taxableIncome.toLocaleString()}</p>
          </div>
        </div>

        {/* Estimated Tax Liability */}
        <div className="bg-linear-to-br from-indigo-600 to-violet-700 rounded-[2.5rem] p-8 text-white relative overflow-hidden mb-8 shadow-2xl shadow-indigo-200">
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-4 opacity-80">
              <TrendingUp size={20} />
              <span className="text-xs font-bold uppercase tracking-widest">Est. Tax Liability ({taxPercentage}%)</span>
            </div>
            <h3 className="text-5xl font-black mb-2">${estimatedTax.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
            <p className="text-indigo-100 text-sm max-w-md">
              This is an automated estimate. Ensure all your business expenses are recorded to maximize your deductions.
            </p>
          </div>
          <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
        </div>

        {/* Breakdown List - Maps over descriptions since you have no category field */}
        {data?.categoryTotals?.length > 0 && (
          <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
            <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <PieChart size={18} className="text-indigo-500" /> Transaction Breakdown
            </h4>
            <div className="space-y-4">
              {data.categoryTotals.map((cat, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-sm text-slate-500 font-medium capitalize truncate max-w-35">
                    {cat._id || "Internal Transfer"} 
                  </span>
                  <div className="flex-1 mx-4 h-2 bg-slate-50 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-indigo-500 rounded-full" 
                      style={{ width: `${expenses > 0 ? (cat.total / expenses) * 100 : 0}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-bold text-slate-800">${cat.total.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TaxSummary;