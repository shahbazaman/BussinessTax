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
  const [currency, setCurrency] = useState('USD');
  const income = parseFloat(stats.totalIncome || 0);
  const profit = parseFloat(stats.netProfit || 0);
  const currentTaxRate = parseFloat(taxRate || 0);
  const estimatedTax = profit > 0 ? (profit * (currentTaxRate / 100)) : 0;
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
  const formatValue = (value, usePlain = false) => {
    const symbol = usePlain && currency === 'INR' ? 'Rs.' : currencySymbol;
    return `${symbol}${Number(value || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2, maximumFractionDigits: 2
    })}`;
  };
const handleExportPDF = async () => {
    const loadingToast = toast.loading("Generating High-Resolution PDF...");
    try {
      const element = document.getElementById('report-print-area-standalone');
      if (!element) throw new Error("Template not found");
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '850px';
      iframe.style.height = '1100px';
      iframe.style.border = '0';
      iframe.style.visibility = 'hidden';
      document.body.appendChild(iframe);
      const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;      
      iframeDoc.write(`
        <html>
          <body style="margin:0; padding:0;">
            ${element.innerHTML}
          </body>
        </html>
      `);
      iframeDoc.close();
      const canvas = await html2canvas(iframeDoc.body, { 
        scale: 2, 
        useCORS: true, 
        backgroundColor: "#ffffff",
        width: 800,
        height: 1000,
        logging: false
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Tax-Report-${new Date().toISOString().split('T')[0]}.pdf`);
      document.body.removeChild(iframe);      
      toast.update(loadingToast, { render: "Report Exported!", type: "success", isLoading: false, autoClose: 3000 });
    } catch (err) {
      console.error("PDF Sandbox Error:", err);
      toast.update(loadingToast, { render: "Export failed: " + err.message, type: "error", isLoading: false, autoClose: 3000 });
    }
  };
  if (loading) return (
    <div className="flex justify-center items-center h-screen bg-slate-50">
      <div className="animate-pulse text-slate-400 font-black tracking-widest uppercase">Syncing Fiscal Data...</div>
    </div>
  );
  return (
    <div className="p-4 lg:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
              <div className="p-2 bg-green-500 rounded-lg text-white"><Landmark size={20} /></div>
              Tax Liability Report
            </h2>
            <p className="text-sm text-slate-500 font-medium mt-1">Real-time estimate of your business tax obligations</p>
          </div>
          <button onClick={handleExportPDF} className="hidden md:flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-2xl text-sm font-bold hover:bg-blue-600 transition-all shadow-lg active:scale-95">
            <Download size={16} /> Export PDF
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white p-6 rounded-4xl shadow-sm border border-slate-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-xl"><Calculator size={20} /></div>
              <h3 className="font-bold text-slate-700">Tax Settings</h3>
            </div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] block mb-2">Estimated Tax Rate</label>
            <div className="relative">
              <input 
                type="number" 
                value={taxRate} 
                onChange={(e) => setTaxRate(Number(e.target.value))}
                className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-blue-500 focus:bg-white outline-none font-black text-slate-700 transition-all text-xl"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-slate-300 text-xl">%</span>
            </div>
          </div>
          <div className="bg-slate-900 rounded-2xl p-8 shadow-xl text-white relative overflow-hidden flex flex-col justify-center">
            <div className="relative z-10">
              <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mb-1">Estimated Tax Owed</p>
              <h3 className="text-5xl font-black text-green-400 tracking-tighter">
                {formatValue(estimatedTax)}
              </h3>
              <div className="mt-4 flex items-center gap-2">
                <span className="text-[10px] bg-white/10 px-2 py-1 rounded-md font-bold text-slate-300 uppercase">FY 2025-26</span>
              </div>
            </div>
            <PieChart className="absolute -right-6 -bottom-6 text-white/5" size={160} />
          </div>
        </div>
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-8 border-b border-slate-50 flex justify-between items-center">
            <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest">Financial Breakdown</h3>
            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase">Live Audit</span>
          </div>
          <div className="p-8 space-y-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl"><ArrowUpRight size={24} /></div>
                <div>
                  <p className="text-sm font-black text-slate-800">Total Revenue</p>
                  <p className="text-xs text-slate-400 font-medium">All settled invoices</p>
                </div>
              </div>
              <span className="text-2xl font-black text-slate-800">{formatValue(stats.totalIncome)}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-rose-50 text-rose-600 rounded-2xl"><ArrowDownRight size={24} /></div>
                <div>
                  <p className="text-sm font-black text-slate-800">Total Expenses</p>
                  <p className="text-xs text-slate-400 font-medium">Operating deductions</p>
                </div>
              </div>
              <span className="text-2xl font-black text-rose-500">-{formatValue(stats.totalExpenses)}</span>
            </div>
            <div className="pt-8 border-t border-dashed border-slate-200 flex items-center justify-between">
              <p className="font-black text-slate-800 uppercase text-sm">Net Taxable Profit</p>
              <span className="text-3xl font-black text-slate-900 tracking-tighter">{formatValue(stats.netProfit)}</span>
            </div>
          </div>
        </div>
      </div>
      <ToastContainer position="bottom-right" theme="colored" />
      <div style={{ position: 'absolute', left: '-9999px', top: '0' }}>
        <div id="report-print-area-standalone" style={{ 
          width: '800px', 
          padding: '60px', 
          backgroundColor: '#ffffff', 
          color: '#0f172a', 
          fontFamily: 'Helvetica, Arial, sans-serif' 
        }}>
          <div style={{ borderBottom: '8px solid #10b981', paddingBottom: '30px', marginBottom: '40px' }}>
            <h1 style={{ fontSize: '42px', fontWeight: '900', margin: '0', color: '#0f172a', letterSpacing: '-1px' }}>Tax Liability Report</h1>
            <p style={{ color: '#64748b', fontSize: '16px', fontWeight: '600', marginTop: '10px' }}>
              Report Generated: {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', marginBottom: '50px' }}>
            <div style={{ padding: '30px', backgroundColor: '#f8fafc', borderRadius: '24px', border: '1px solid #e2e8f0' }}>
              <p style={{ fontSize: '14px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginBottom: '10px' }}>Gross Revenue</p>
              <h2 style={{ fontSize: '32px', fontWeight: '900', margin: '0' }}>{formatValue(stats.totalIncome, true)}</h2>
            </div>
            <div style={{ padding: '30px', backgroundColor: '#f8fafc', borderRadius: '24px', border: '1px solid #e2e8f0' }}>
              <p style={{ fontSize: '14px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginBottom: '10px' }}>Total Expenses</p>
              <h2 style={{ fontSize: '32px', fontWeight: '900', color: '#ef4444', margin: '0' }}>-{formatValue(stats.totalExpenses, true)}</h2>
            </div>
          </div>
          <div style={{ padding: '40px', backgroundColor: '#0f172a', borderRadius: '32px', color: '#ffffff', textAlign: 'center' }}>
            <p style={{ fontSize: '14px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '900', letterSpacing: '2px' }}>
              Estimated Tax Liability ({taxRate}%)
            </p>
            <h1 style={{ fontSize: '72px', color: '#4ade80', margin: '20px 0', fontWeight: '900' }}>
              {formatValue(estimatedTax, true)}
            </h1>
            <div style={{ height: '1px', backgroundColor: 'rgba(255,255,255,0.1)', margin: '20px auto', width: '200px' }}></div>
            <p style={{ fontSize: '18px', color: '#94a3b8', fontWeight: '600' }}>
              Net Taxable Profit: {formatValue(stats.netProfit, true)}
            </p>
          </div>
          <div style={{ marginTop: '60px', borderTop: '2px solid #f1f5f9', paddingTop: '30px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: '900', color: '#0f172a', marginBottom: '10px' }}>Disclaimer</h4>
            <p style={{ fontSize: '12px', color: '#94a3b8', lineHeight: '1.6' }}>
              This report is a computer-generated estimate based on the data provided in the BusinessTax Ledger. 
              Actual tax liabilities may vary based on local laws, tax brackets, and specific exemptions. 
              Please consult with a certified tax professional before making official filings.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
export default Reports;