import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { Landmark, Calculator, Download, PieChart, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const Reports = () => {
  const [stats, setStats] = useState({ totalIncome: 0, totalExpenses: 0, netProfit: 0 });
  const [taxRate, setTaxRate] = useState(15);
  const [loading, setLoading] = useState(true);
  const income = parseFloat(stats.totalIncome || 0);
  const profit = parseFloat(stats.netProfit || 0);
  const currentTaxRate = parseFloat(taxRate || 0);
  const estimatedTax = profit > 0 ? (profit * (currentTaxRate / 100)) : 0;
  const taxPercentageOfIncome = income > 0 ? (estimatedTax / income) * 100 : 0;
  const [currency, setCurrency] = useState('USD');
  const CURRENCY_MAP = { USD: '$', INR: '₹', EUR: '€', GBP: '£' };
  const currencySymbol = CURRENCY_MAP[currency] || '$';

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [statsRes, profileRes] = await Promise.all([
          api.get('/dashboard/stats'),
          api.get('/auth/profile')
        ]);
        setStats(statsRes.data);
        setCurrency(profileRes.data.currency || 'USD');
      } catch (err) {
        toast.error("Failed to fetch report data");
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const formatValue = (value) => {
    return `${currencySymbol}${Number(value || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2, maximumFractionDigits: 2
    })}`;
  };
  // Safe Frontend PDF Export
  const handleExportPDF = async () => {
    toast.info("Generating Report PDF...", { autoClose: 1500 });
    try {
      const element = document.getElementById('report-print-area-standalone');
      if (!element) return;
      
      const canvas = await html2canvas(element, { scale: 2, useCORS: true, logging: false, backgroundColor: "#ffffff" });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save('Tax-Liability-Report.pdf');
      toast.success("Report Exported!");
    } catch (err) {
      console.error(err);
      toast.error("PDF generation failed.");
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500 font-bold tracking-widest uppercase">Loading Report...</div>;
  return (
    <div className="p-4 lg:p-8 bg-slate-50 min-h-screen relative">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
              <Landmark className="text-green-500" /> Tax Liability Report
            </h2>
            <p className="text-sm text-slate-500">Real-time estimate of your business tax obligations</p>
          </div>
          <button onClick={handleExportPDF} className="hidden md:flex items-center gap-2 bg-white border border-slate-200 px-4 py-2 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all shadow-sm">
            <Download size={16} /> Export PDF
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Settings Card */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                <Calculator size={20} />
              </div>
              <h3 className="font-bold text-slate-700">Tax Settings</h3>
            </div>
            
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">
              Estimated Tax Rate (%)
            </label>
            <div className="relative">
              <input 
                type="number" 
                value={taxRate} 
                onChange={(e) => {
                const value = Number(e.target.value);
                if (!isNaN(value)) {
                  setTaxRate(value);}}}
                              onBlur={() => {
                if (!taxRate || taxRate < 0) {
                  setTaxRate(0);
                }
              }}
                className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 outline-none focus:ring-2 focus:ring-green-500 font-bold text-slate-700 transition-all"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">%</span>
            </div>
            <p className="mt-4 text-[11px] text-slate-400 leading-relaxed">
              Note: This is an estimate based on your <b>Net Profit</b>. Consult a professional for actual filings.
            </p>
          </div>

          {/* Result Card */}
          <div className="bg-slate-900 p-6 rounded-3xl shadow-xl text-white relative overflow-hidden">
            <div className="relative z-10">
              <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Estimated Tax Owed</p>
              {profit >= 0 ? (
                <h3 className="text-5xl font-black mt-2 text-green-400">
                  {formatValue(estimatedTax)}
                </h3>
              ) : (
                <div>
                  <h3 className="text-5xl font-black mt-2 text-yellow-400">
                    {formatValue(0)}
                  </h3>
                  <p className="text-xs mt-2 text-red-400 font-medium">
                    No tax due — Business currently operating at a loss.
                  </p>
                </div>
              )}
              
              <div className="mt-8 space-y-2">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-slate-400">Tax impact on Gross Income</span>
                  <span className="text-green-400">{profit > 0 ? taxPercentageOfIncome.toFixed(1) + "%" : "0%"}</span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-green-500 h-full transition-all duration-1000" 
                    style={{width: `${profit > 0 ? Math.min(taxPercentageOfIncome, 100) : 0}%`}}/>
                </div>
              </div>
            </div>
            <div className="absolute -right-4 -bottom-4 text-slate-800 opacity-20">
              <PieChart size={120} />
            </div>
          </div>
        </div>

        {/* Detailed Breakdown */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-50">
            <h3 className="font-bold text-slate-800">Income Breakdown</h3>
          </div>
          <div className="p-8">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-50 text-green-600 rounded-2xl">
                    <ArrowUpRight size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">Total Revenue</p>
                    <p className="text-xs text-slate-400">All paid invoices</p>
                  </div>
                </div>
                <span className="text-xl font-bold text-slate-800">{formatValue(stats.totalIncome)}</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-red-50 text-red-600 rounded-2xl">
                    <ArrowDownRight size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">Deductible Expenses</p>
                    <p className="text-xs text-slate-400">Operating costs</p>
                  </div>
                </div>
                <span className="text-xl font-bold text-red-500">-{formatValue(stats.totalExpenses)}</span>
              </div>

              <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <p className="text-sm font-black text-slate-800 uppercase tracking-tight">Taxable Profit</p>
                  <p className="text-xs text-slate-400">Income minus expenses</p>
                </div>
                <div className="text-right">
                   <span className="text-2xl font-black text-slate-900">{formatValue(stats.netProfit)}</span>
                   <p className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded mt-1 inline-block">
                     READY FOR ESTIMATE
                   </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ToastContainer position="bottom-right" theme="light" />

      {/* Hidden Safe Report Template */}
      <div style={{ position: 'absolute', left: '-9999px', top: '0', zIndex: -10 }}>
        <div id="report-print-area-standalone" style={{ width: '800px', padding: '40px', backgroundColor: '#ffffff', color: '#0f172a', fontFamily: 'sans-serif' }}>
          <div style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: '30px', marginBottom: '30px' }}>
            <h1 style={{ fontSize: '36px', fontWeight: '900', color: '#2563eb', margin: '0' }}>Tax Liability Report</h1>
            <p style={{ color: '#64748b', marginTop: '8px' }}>Official Estimate & Summary</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
             <div style={{ padding: '20px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <p style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' }}>Gross Revenue</p>
                <h3 style={{ fontSize: '24px', fontWeight: '900', margin: '8px 0 0 0' }}>{formatValue(stats.totalIncome)}</h3>
             </div>
             <div style={{ padding: '20px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <p style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' }}>Total Deductions</p>
                <h3 style={{ fontSize: '24px', fontWeight: '900', color: '#ef4444', margin: '8px 0 0 0' }}>-{formatValue(stats.totalExpenses)}</h3>
             </div>
          </div>

          <div style={{ padding: '20px', borderBottom: '2px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
             <span style={{ fontSize: '18px', fontWeight: 'bold' }}>Taxable Net Profit</span>
             <span style={{ fontSize: '28px', fontWeight: '900' }}>{formatValue(stats.netProfit)}</span>
          </div>

          <div style={{ marginTop: '40px', padding: '40px', borderRadius: '24px', backgroundColor: '#0f172a', color: '#ffffff' }}>
            <p style={{ fontSize: '12px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase' }}>Estimated Tax Owed (at {taxRate}%)</p>
            <h2 style={{ fontSize: '48px', fontWeight: '900', color: '#4ade80', margin: '10px 0 0 0' }}>
              {formatValue(estimatedTax)}
            </h2>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;