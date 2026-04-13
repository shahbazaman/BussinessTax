import React, { useState, useEffect, useContext } from 'react';
import api from '../utils/api';
import { Landmark, Calculator, Download, PieChart, ArrowUpRight, ArrowDownRight, Scale, DollarSign, TrendingUp, TrendingDown, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { CurrencyContext } from '../context/CurrencyContext';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const Reports = () => {
  // 1. Move all States to the very top
  const [stats, setStats] = useState({ totalIncome: 0, totalExpenses: 0, netProfit: 0 });
  const [taxRate, setTaxRate] = useState(15);
  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState('USD');
  const [invoices, setInvoices] = useState([]);
  // 2. Define constants and derived values AFTER state
  const [activeTab, setActiveTab] = useState('overview');
const [tbData, setTbData]       = useState(null);
const [plData, setPlData]       = useState(null);
const [tbLoading, setTbLoading] = useState(false);
const { symbol } = useContext(CurrencyContext);
const fmt = (n) => `${symbol}${Number(n||0).toLocaleString(undefined,{minimumFractionDigits:2})}`;
  const CURRENCY_MAP = { USD: '$', INR: '₹', EUR: '€', GBP: '£' };
  const currencySymbol = CURRENCY_MAP[currency] || '$';

  const income = Number(stats.totalIncome || 0);
  const expenses = Number(stats.totalExpenses || 0);
  const profit = Number(stats.netProfit || 0);
  const currentTaxRate = Number(taxRate || 0);

  // The formula for your estimated tax
  const estimatedTax = profit > 0 ? (profit * (currentTaxRate / 100)) : 0;

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
       const [statsRes, profileRes, invoicesRes] = await Promise.all([
        api.get('/analytics/monthly-report'), 
        api.get('/auth/profile'),
        api.get('/invoices')
      ]);

        if (statsRes.data) {
          // Robust mapping to catch backend variations
          const rawData = statsRes.data.summary || statsRes.data;
          
          const incomeVal = Number(rawData.totalIncome || rawData.totalRevenue || 0);
          const expenseVal = Number(rawData.totalExpenses || 0);
          const profitVal = rawData.netProfit !== undefined 
            ? Number(rawData.netProfit) 
            : (incomeVal - expenseVal);

          setStats({
            totalIncome: incomeVal,
            totalExpenses: expenseVal,
            netProfit: profitVal
          });
        }

        if (profileRes.data?.currency) {
          setCurrency(profileRes.data.currency);
        }
setInvoices(invoicesRes.data || []);

      } catch (err) {
        console.error("Report Fetch Error:", err);
        toast.error("Failed to sync fiscal data");
      } finally {
        setLoading(false);
      }

      // Fetch TB/PL separately so it doesn't block main load
      try {
        setTbLoading(true);
        const tbRes = await api.get('/ledger-accounts/reports/trial-balance');
        const rows = tbRes.data.rows || [];
        setTbData(tbRes.data);
        const rev  = rows.filter(r => r.type === 'Revenue');
        const exp  = rows.filter(r => r.type === 'Expense');
        const totalRevenue  = rev.reduce((s,r) => s + r.totalCredit, 0);
        const totalExpenses = exp.reduce((s,r) => s + r.totalDebit,  0);
        setPlData({ revenue: rev, expenses: exp, totalRevenue, totalExpenses, netProfit: totalRevenue - totalExpenses });
      } catch { /* silent — TB is non-critical */ } 
      finally { setTbLoading(false); }
    };
    fetchStats();
  }, []);

  const formatValue = (value, usePlain = false) => {
    const symbol = usePlain && currency === 'INR' ? 'Rs.' : currencySymbol;
    return `${symbol}${Number(value || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2
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
      console.error("PDF Export Error:", err);
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
        {/* Header */}
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
        {/* ── Tabs ── */}
<div className="flex gap-2 mb-8 bg-white border border-slate-100 rounded-2xl p-1.5 shadow-sm w-fit">
  {[
    { id: 'overview',       label: 'Overview',       icon: <Landmark size={14}/> },
    { id: 'trial-balance',  label: 'Trial Balance',  icon: <Scale size={14}/> },
    { id: 'profit-loss',    label: 'Profit & Loss',  icon: <DollarSign size={14}/> },
  ].map(tab => (
    <button
      key={tab.id}
      onClick={() => setActiveTab(tab.id)}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wide transition-all
        ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
    >
      {tab.icon}{tab.label}
    </button>
  ))}
</div>
        {/* Top Cards */}
        {activeTab === 'overview' && (
<>
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
                <span className="text-[10px] bg-white/10 px-2 py-1 rounded-md font-bold text-slate-300 uppercase">FY 2026</span>
              </div>
            </div>
            <PieChart className="absolute -right-6 -bottom-6 text-white/5" size={160} />
          </div>
        </div></> 
)}
{/* ── Trial Balance Tab ── */}
{activeTab === 'trial-balance' && (
  tbLoading ? (
    <div className="flex justify-center py-20"><Loader2 className="animate-spin text-indigo-500" size={32}/></div>
  ) : (
    <div className="space-y-5">
      {/* Balanced indicator */}
      <div className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-black text-sm w-fit
        ${tbData?.grandDebit === tbData?.grandCredit ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
        {tbData?.grandDebit === tbData?.grandCredit ? <CheckCircle size={16}/> : <XCircle size={16}/>}
        {tbData?.grandDebit === tbData?.grandCredit ? 'Balanced ✓' : 'Not Balanced — check entries'}
      </div>
      {/* Summary */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Debits</p>
          <p className="text-2xl font-black text-rose-600">{fmt(tbData?.grandDebit)}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Credits</p>
          <p className="text-2xl font-black text-emerald-600">{fmt(tbData?.grandCredit)}</p>
        </div>
      </div>
      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              {['Account','Type','Debit','Credit','Balance'].map(h => (
                <th key={h} className="px-5 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {(tbData?.rows||[]).map(row => (
              <tr key={row._id} className="hover:bg-slate-50">
                <td className="px-5 py-3 font-bold text-slate-700">{row.name}</td>
                <td className="px-5 py-3">
                  <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 uppercase">{row.type}</span>
                </td>
                <td className="px-5 py-3 font-black text-rose-600">
                  {row.totalDebit > 0 ? fmt(row.totalDebit) : <span className="text-slate-200">—</span>}
                </td>
                <td className="px-5 py-3 font-black text-emerald-600">
                  {row.totalCredit > 0 ? fmt(row.totalCredit) : <span className="text-slate-200">—</span>}
                </td>
                <td className={`px-5 py-3 font-black ${row.balance >= 0 ? 'text-slate-800' : 'text-orange-600'}`}>
                  {row.balance < 0 ? '-' : ''}{fmt(Math.abs(row.balance))}
                </td>
              </tr>
            ))}
            <tr className="border-t-2 border-slate-200 bg-slate-50">
              <td className="px-5 py-3 font-black text-slate-900" colSpan={2}>TOTAL</td>
              <td className="px-5 py-3 font-black text-rose-700">{fmt(tbData?.grandDebit)}</td>
              <td className="px-5 py-3 font-black text-emerald-700">{fmt(tbData?.grandCredit)}</td>
              <td className="px-5 py-3 font-black text-slate-500">{fmt(Math.abs((tbData?.grandDebit||0)-(tbData?.grandCredit||0)))}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
)}
{/* ── P&L Tab ── */}
{activeTab === 'profit-loss' && (
  tbLoading ? (
    <div className="flex justify-center py-20"><Loader2 className="animate-spin text-indigo-500" size={32}/></div>
  ) : (
    <div className="space-y-5">
      {/* Net Profit card */}
      <div className={`rounded-2xl p-6 border ${(plData?.netProfit||0) >= 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
        <p className="text-[10px] font-black uppercase tracking-widest mb-1 text-slate-500">Net {(plData?.netProfit||0) >= 0 ? 'Profit' : 'Loss'}</p>
        <p className={`text-4xl font-black ${(plData?.netProfit||0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
          {(plData?.netProfit||0) >= 0 ? '+' : '-'}{fmt(Math.abs(plData?.netProfit||0))}
        </p>
        <p className="text-xs text-slate-400 mt-2 font-medium">
          {fmt(plData?.totalRevenue)} revenue − {fmt(plData?.totalExpenses)} expenses
        </p>
      </div>
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <div className="flex items-center gap-2 mb-2"><TrendingUp size={16} className="text-emerald-500"/>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Revenue</p>
          </div>
          <p className="text-2xl font-black text-emerald-600">{fmt(plData?.totalRevenue)}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <div className="flex items-center gap-2 mb-2"><TrendingDown size={16} className="text-rose-500"/>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Expenses</p>
          </div>
          <p className="text-2xl font-black text-rose-600">{fmt(plData?.totalExpenses)}</p>
        </div>
      </div>
      {/* Revenue table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3 bg-emerald-50 border-b border-emerald-100 flex justify-between">
          <span className="text-xs font-black text-emerald-700 uppercase tracking-widest">Revenue</span>
          <span className="text-sm font-black text-emerald-700">{fmt(plData?.totalRevenue)}</span>
        </div>
        <table className="w-full text-xs">
          <tbody className="divide-y divide-slate-50">
            {(plData?.revenue||[]).length === 0
              ? <tr><td colSpan={2} className="px-5 py-6 text-center text-slate-400 font-bold">No revenue entries yet</td></tr>
              : (plData?.revenue||[]).map(r => (
                <tr key={r._id} className="hover:bg-slate-50">
                  <td className="px-5 py-3 font-bold text-slate-700">{r.name}</td>
                  <td className="px-5 py-3 text-right font-black text-emerald-600">{fmt(r.totalCredit)}</td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>
      {/* Expenses table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3 bg-rose-50 border-b border-rose-100 flex justify-between">
          <span className="text-xs font-black text-rose-700 uppercase tracking-widest">Expenses</span>
          <span className="text-sm font-black text-rose-700">{fmt(plData?.totalExpenses)}</span>
        </div>
        <table className="w-full text-xs">
          <tbody className="divide-y divide-slate-50">
            {(plData?.expenses||[]).length === 0
              ? <tr><td colSpan={2} className="px-5 py-6 text-center text-slate-400 font-bold">No expense entries yet</td></tr>
              : (plData?.expenses||[]).map(r => (
                <tr key={r._id} className="hover:bg-slate-50">
                  <td className="px-5 py-3 font-bold text-slate-700">{r.name}</td>
                  <td className="px-5 py-3 text-right font-black text-rose-600">{fmt(r.totalDebit)}</td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>
    </div>
  )
)}

        {/* Breakdown Section */}
        {activeTab === 'overview' && <>
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
               <span className="text-2xl font-black text-slate-800">{formatValue(income)}</span>
             </div>

             <div className="flex items-center justify-between">
               <div className="flex items-center gap-4">
                 <div className="p-4 bg-rose-50 text-rose-600 rounded-2xl"><ArrowDownRight size={24} /></div>
                 <div>
                   <p className="text-sm font-black text-slate-800">Total Expenses</p>
                   <p className="text-xs text-slate-400 font-medium">Operating deductions</p>
                 </div>
               </div>
               <span className="text-2xl font-black text-rose-500">-{formatValue(expenses)}</span>
             </div>

             <div className="pt-8 border-t border-dashed border-slate-200 flex items-center justify-between">
               <p className="font-black text-slate-800 uppercase text-sm">Net Taxable Profit</p>
               <span className="text-3xl font-black text-slate-900 tracking-tighter">{formatValue(profit)}</span>
             </div>
           </div>
        </div>
        </>}
{/* Invoice Aging Report */}
{activeTab === 'overview' && <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden mt-6">
  <div className="p-8 border-b border-slate-50 flex justify-between items-center">
    <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest">Invoice Aging</h3>
    <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-3 py-1 rounded-full uppercase">Overdue Tracker</span>
  </div>
  <div className="p-8 grid grid-cols-2 md:grid-cols-4 gap-4">
    {(() => {
      const today = new Date();
      const aging = { '0–30 days': 0, '31–60 days': 0, '61–90 days': 0, '90+ days': 0 };
      invoices.filter(i => i.status !== 'Paid').forEach(inv => {
        const days = Math.floor((today - new Date(inv.dueDate)) / 86400000);
        if (days <= 30) aging['0–30 days'] += inv.totalAmount || 0;
        else if (days <= 60) aging['31–60 days'] += inv.totalAmount || 0;
        else if (days <= 90) aging['61–90 days'] += inv.totalAmount || 0;
        else aging['90+ days'] += inv.totalAmount || 0;
      });
      const colors = ['text-emerald-600', 'text-yellow-600', 'text-orange-500', 'text-rose-600'];
      const bg = ['bg-emerald-50', 'bg-yellow-50', 'bg-orange-50', 'bg-rose-50'];
      return Object.entries(aging).map(([label, val], i) => (
        <div key={label} className={`${bg[i]} p-5 rounded-2xl`}>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{label}</p>
          <p className={`text-xl font-black ${colors[i]}`}>{formatValue(val)}</p>
        </div>
      ));
    })()}
  </div>
</div>}
      </div>

      {/* Hidden Print Template */}
      <div style={{ position: 'absolute', left: '-9999px', top: '0' }}>
        <div id="report-print-area-standalone" style={{ width: '800px', padding: '60px', backgroundColor: '#ffffff', color: '#0f172a', fontFamily: 'Helvetica, Arial, sans-serif' }}>
          <div style={{ borderBottom: '8px solid #10b981', paddingBottom: '30px', marginBottom: '40px' }}>
            <h1 style={{ fontSize: '42px', fontWeight: '900', margin: '0', color: '#0f172a', letterSpacing: '-1px' }}>Tax Liability Report</h1>
            <p style={{ color: '#64748b', fontSize: '16px', fontWeight: '600', marginTop: '10px' }}>Report Generated: {new Date().toLocaleDateString()}</p>
          </div>
          {/* Internal Print UI content... */}
          <div style={{ padding: '40px', backgroundColor: '#0f172a', borderRadius: '32px', color: '#ffffff', textAlign: 'center' }}>
            <p style={{ fontSize: '14px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '900' }}>Estimated Tax Liability ({taxRate}%)</p>
            <h1 style={{ fontSize: '72px', color: '#4ade80', margin: '20px 0', fontWeight: '900' }}>{formatValue(estimatedTax, true)}</h1>
            <p style={{ fontSize: '18px', color: '#94a3b8' }}>Net Taxable Profit: {formatValue(profit, true)}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;