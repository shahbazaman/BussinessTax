import React, { useState, useEffect, useContext } from 'react';
import api from '../utils/api';
import { Landmark, Calculator, Download, PieChart, ArrowUpRight, ArrowDownRight, Scale, DollarSign, TrendingUp, TrendingDown, CheckCircle, XCircle, Loader2, Receipt,Droplets, Activity, ArrowRight, BookCopy, FileText } from 'lucide-react';
import { CurrencyContext } from '../context/CurrencyContext';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas-pro';
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
const [tbData, setTbData] = useState(null);
const [plData, setPlData] = useState(null);
const [taxData, setTaxData] = useState({ collected: 0, deductible: 0, netOwed: 0, invoices: [] });
const [tbLoading, setTbLoading] = useState(false);
const { symbol } = useContext(CurrencyContext);
const fmt = (n) => `${symbol}${Number(n||0).toLocaleString(undefined,{minimumFractionDigits:2})}`;

// ── Invoice derived metrics (computed from existing `invoices` state) ─────
const salesInvoices    = invoices.filter(i => i.type === 'Sale');
const purchaseInvoices = invoices.filter(i => i.type === 'Purchase');

const salesMetrics = {
  total:     salesInvoices.length,
  paid:      salesInvoices.filter(i => i.status === 'Paid').length,
  pending:   salesInvoices.filter(i => i.status === 'Pending').length,
  cancelled: salesInvoices.filter(i => i.status === 'Cancelled').length,
  totalValue: salesInvoices.reduce((s, i) => s + (i.totalAmount || 0), 0),
  paidValue:  salesInvoices.filter(i => i.status === 'Paid').reduce((s, i) => s + (i.totalAmount || 0), 0),
  pendingValue: salesInvoices.filter(i => i.status !== 'Paid' && i.status !== 'Cancelled').reduce((s, i) => s + (i.totalAmount || 0), 0),
  totalTax:  salesInvoices.reduce((s, i) => s + (i.taxAmount || 0), 0),
};

const purchaseMetrics = {
  total:     purchaseInvoices.length,
  paid:      purchaseInvoices.filter(i => i.status === 'Paid').length,
  pending:   purchaseInvoices.filter(i => i.status === 'Pending').length,
  cancelled: purchaseInvoices.filter(i => i.status === 'Cancelled').length,
  totalValue: purchaseInvoices.reduce((s, i) => s + (i.totalAmount || 0), 0),
  paidValue:  purchaseInvoices.filter(i => i.status === 'Paid').reduce((s, i) => s + (i.totalAmount || 0), 0),
  pendingValue: purchaseInvoices.filter(i => i.status !== 'Paid' && i.status !== 'Cancelled').reduce((s, i) => s + (i.totalAmount || 0), 0),
  totalTax:  purchaseInvoices.reduce((s, i) => s + (i.taxAmount || 0), 0),
};
  const CURRENCY_MAP = { USD: '$', INR: '₹', EUR: '€', GBP: '£' };
  const currencySymbol = CURRENCY_MAP[currency] || '$';

  const income = Number(stats.totalIncome || 0);
  const expenses = Number(stats.totalExpenses || 0);
  const profit = Number(stats.netProfit || 0);
  const currentTaxRate = Number(taxRate || 0);

  // The formula for your estimated tax
  const estimatedTax = profit > 0 ? (profit * (currentTaxRate / 100)) : 0;
  const [cfData, setCfData] = useState(null);
  const [arAging, setArAging] = useState([]);
  const [bsData, setBsData] = useState(null);
  const [gstData, setGstData] = useState(null);
const [gstFrom, setGstFrom] = useState('');
const [gstTo,   setGstTo]   = useState('');
const [gstLoading, setGstLoading] = useState(false);
const [gstPreset, setGstPreset] = useState(''); // 'monthly' | 'yearly' | ''
const [gstExportType, setGstExportType] = useState('pdf'); // 'pdf' | 'csv'
const [gstExportDropdownOpen, setGstExportDropdownOpen] = useState(false);
const fetchGst = async () => {
  setGstLoading(true);
  try {
    const params = new URLSearchParams();
    if (gstFrom) params.append('from', gstFrom);
    if (gstTo)   params.append('to', gstTo);
    const res = await api.get(`/ledger-accounts/reports/gst?${params}`);
    setGstData(res.data);
  } catch { toast.error('Failed to load GST data'); }
  finally { setGstLoading(false); }
};

useEffect(() => { if (activeTab === 'gst') fetchGst(); }, [activeTab, gstFrom, gstTo]);
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
const arRes = await api.get('/clients/ar-aging');
setArAging(arRes.data || []);
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
        // Fetch tax data
const [invRes, expRes] = await Promise.all([api.get('/invoices'), api.get('/expenses')]);
const taxCollected = (invRes.data || [])
  .filter(i => i.type === 'Sale')
  .reduce((s, i) => s + Number(i.taxAmount || 0), 0);
const taxDeductible = (expRes.data || [])
  .reduce((s, e) => s + (Number(e.amount || 0) * 0.15), 0);
setTaxData({
  collected: taxCollected,
  deductible: taxDeductible,
  netOwed: taxCollected - taxDeductible,
  invoices: (invRes.data || []).filter(i => i.type === 'Sale')
});
const cfRes = await api.get('/ledger-accounts/reports/cash-flow');
setCfData(cfRes.data);
const bsRes = await api.get('/ledger-accounts/reports/balance-sheet');
setBsData(bsRes.data);
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
const exportTabPDF = async (containerId, filename) => {
  const loadingToast = toast.loading('Generating PDF...');
  
  // Polyfill oklch colors for html2canvas compatibility (Tailwind v4 uses oklch)
  const allElements = document.querySelectorAll('*');
  const originalStyles = [];
  allElements.forEach((el) => {
    const computed = window.getComputedStyle(el);
    const props = ['color', 'backgroundColor', 'borderColor', 'borderTopColor', 'borderBottomColor', 'borderLeftColor', 'borderRightColor'];
    const overrides = {};
    props.forEach((prop) => {
      const val = computed.getPropertyValue(prop);
      if (val && val.includes('oklch')) {
        // Convert oklch to a safe fallback by re-reading as RGB via a temp element
        const tmp = document.createElement('div');
        tmp.style.color = val;
        tmp.style.display = 'none';
        document.body.appendChild(tmp);
        const rgb = window.getComputedStyle(tmp).color;
        document.body.removeChild(tmp);
        overrides[prop] = rgb;
      }
    });
    if (Object.keys(overrides).length > 0) {
      originalStyles.push({ el, overrides: {} });
      Object.entries(overrides).forEach(([prop, val]) => {
        originalStyles[originalStyles.length - 1].overrides[prop] = el.style[prop];
        el.style[prop] = val;
      });
    }
  });

  try {
    const element = document.getElementById(containerId);
    if (!element) throw new Error('Content not found');
    // Show PDF-only header if present
    const pdfHeader = element.querySelector('#gst-pdf-header');
    if (pdfHeader) pdfHeader.classList.remove('hidden');
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
      onclone: (clonedDoc) => {
        // Strip any oklch from the cloned document's stylesheets
        Array.from(clonedDoc.styleSheets).forEach((sheet) => {
          try {
            Array.from(sheet.cssRules || []).forEach((rule) => {
              if (rule.style) {
                Array.from(rule.style).forEach((prop) => {
                  const val = rule.style.getPropertyValue(prop);
                  if (val.includes('oklch')) {
                    rule.style.setProperty(prop, '#6b7280'); // safe gray fallback
                  }
                });
              }
            });
          } catch (_) { /* cross-origin sheets — skip */ }
        });
      },
    });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    // Handle multi-page if content is taller than A4
    const pageHeight = pdf.internal.pageSize.getHeight();
    if (pdfHeight <= pageHeight) {
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    } else {
      let yOffset = 0;
      while (yOffset < pdfHeight) {
        pdf.addImage(imgData, 'PNG', 0, -yOffset, pdfWidth, pdfHeight);
        yOffset += pageHeight;
        if (yOffset < pdfHeight) pdf.addPage();
      }
    }
    // Footer on every page
    const totalPages = pdf.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i);
      pdf.setFontSize(8);
      pdf.setTextColor(150);
      pdf.text(
        `Generated: ${new Date().toLocaleString()}`,
        10,
        pdf.internal.pageSize.getHeight() - 5
      );
      pdf.text(
        `Page ${i} of ${totalPages}`,
        pdf.internal.pageSize.getWidth() - 30,
        pdf.internal.pageSize.getHeight() - 5
      );
    }
    pdf.save(`${filename}-${new Date().toISOString().split('T')[0]}.pdf`);
    toast.update(loadingToast, { render: 'Exported!', type: 'success', isLoading: false, autoClose: 2500 });
  } catch (err) {
    toast.update(loadingToast, { render: 'Export failed: ' + err.message, type: 'error', isLoading: false, autoClose: 3000 });
  } finally {
    // Always hide the PDF header again
    if (pdfHeader) pdfHeader.classList.add('hidden');
    // Restore original inline styles
    originalStyles.forEach(({ el, overrides }) => {
      Object.entries(overrides).forEach(([prop, val]) => {
        el.style[prop] = val;
      });
    });
  }
};
const exportGstCSV = () => {
  if (!gstData) return toast.error('No GST data to export');
  const periodLabel = gstFrom && gstTo
    ? `${gstFrom}_to_${gstTo}`
    : gstPreset === 'monthly'
    ? `monthly_${new Date().toISOString().slice(0, 7)}`
    : gstPreset === 'yearly'
    ? `yearly_${new Date().getFullYear()}`
    : 'all';

  // Summary section
  const summaryRows = [
    ['GST REPORT SUMMARY'],
    ['Period', periodLabel],
    [''],
    ['Output GST (Sales)', gstData.outputTax],
    ['Input GST (Purchases)', gstData.totalInputTax],
    ['Net GST Payable', gstData.netGst],
    ['From Purchase Invoices', gstData.inputTaxPurchases],
    ['From Expenses', gstData.inputTaxExpenses],
    [''],
    ['GSTR-1 — Rate-wise Outward Supplies'],
    ['Tax Rate', 'No. of Invoices', 'Taxable Value', 'Tax Amount'],
    ...gstData.rateWise.map(r => [r.rate, r.count, r.taxableValue, r.taxAmount]),
    [''],
    ['GSTR-1 — Sales Invoices'],
    ['Invoice #', 'Client', 'Date', 'GST No.', 'Taxable Amt', 'Tax Rate', 'Tax Amt', 'Total'],
    ...gstData.salesInvoices.map(inv => [
      inv.invoiceNumber || '', inv.clientName || '',
      new Date(inv.invoiceDate).toLocaleDateString(),
      inv.gstNumber || '', inv.subtotal, `${inv.globalTaxRate}%`, inv.taxAmount, inv.totalAmount
    ]),
    [''],
    ['GSTR-3B — Purchase Invoices'],
    ['Purchase #', 'Vendor', 'Date', 'Taxable Amt', 'Tax Rate', 'Input Tax'],
    ...gstData.purchaseInvoices.map(inv => [
      inv.purchaseNumber || inv.referenceNumber || '', inv.clientName || '',
      new Date(inv.invoiceDate).toLocaleDateString(),
      inv.subtotal, `${inv.globalTaxRate}%`, inv.taxAmount
    ]),
  ];

  const csvContent = summaryRows
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `GST-Report-${periodLabel}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast.success('GST CSV exported!');
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
          
        </div>
        {/* ── Tabs ── */}
<div className="flex gap-2 mb-8 bg-white border border-slate-100 rounded-2xl p-1.5 shadow-sm w-fit">
  {[
  { id: 'overview',       label: 'Overview',       icon: <Landmark size={14}/> },
  { id: 'trial-balance',  label: 'Trial Balance',  icon: <Scale size={14}/> },
  { id: 'profit-loss',    label: 'Profit & Loss',  icon: <DollarSign size={14}/> },
  { id: 'tax-summary',    label: 'Tax Summary',    icon: <Receipt size={14}/> },
  { id: 'cash-flow', label: 'Cash Flow', icon: <Activity size={14}/> },
  { id: 'balance-sheet', label: 'Balance Sheet', icon: <BookCopy size={14}/> },
  { id: 'invoices', label: 'Invoices', icon: <FileText size={14}/> },
  { id: 'gst', label: 'GST Report', icon: <Receipt size={14}/> },
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
  <div className="flex justify-end mb-4">
    <button onClick={() => exportTabPDF('tab-overview', 'Overview-Report')}
      className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-indigo-600 transition-all shadow active:scale-95">
      <Download size={14}/> Export PDF
    </button>
  </div>
  <div id="tab-overview" className="space-y-6">
    {/* Tax Settings + Estimated Tax cards */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
    </div>

    {/* Financial Breakdown */}
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

    {/* AR Aging */}
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100">
        <h3 className="text-sm font-black text-slate-700">AR Aging by Customer</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-slate-50">
            <tr>
              {['Client', '0-30 days', '31-60 days', '61-90 days', '90+ days', 'Total'].map(h => (
                <th key={h} className="px-4 py-3 text-left font-bold text-slate-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {arAging.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-400">No outstanding receivables</td></tr>
            ) : arAging.map(row => (
              <tr key={row.client} className="border-t border-slate-50 hover:bg-slate-50">
                <td className="px-4 py-3 font-semibold text-slate-700">{row.client}</td>
                {['0-30','31-60','61-90','90+'].map(b => (
                  <td key={b} className={`px-4 py-3 ${row[b] > 0 ? (b === '90+' ? 'text-rose-600 font-bold' : 'text-amber-600') : 'text-slate-300'}`}>
                    {row[b] > 0 ? fmt(row[b]) : '—'}
                  </td>
                ))}
                <td className="px-4 py-3 font-black text-slate-800">{fmt(row.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </div>
</> 
)}
{/* ── Trial Balance Tab ── */}
  {activeTab === 'trial-balance' && (
  tbLoading ? (
    <div className="flex justify-center py-20"><Loader2 className="animate-spin text-indigo-500" size={32}/></div>
  ) : (
    <>
      <div className="flex justify-end mb-4">
        <button onClick={() => exportTabPDF('tab-trial-balance', 'Trial-Balance')}
          className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-indigo-600 transition-all shadow active:scale-95">
          <Download size={14}/> Export PDF
        </button>
      </div>
      <div id="tab-trial-balance" className="space-y-5">
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
  </>
  )
)}
{/* ── P&L Tab ── */}
{activeTab === 'profit-loss' && (
  tbLoading ? (
    <div className="flex justify-center py-20"><Loader2 className="animate-spin text-indigo-500" size={32}/></div>
  ) : (
    <>
      <div className="flex justify-end mb-4">
        <button onClick={() => exportTabPDF('tab-profit-loss', 'Profit-Loss')}
          className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-indigo-600 transition-all shadow active:scale-95">
          <Download size={14}/> Export PDF
        </button>
      </div>
      <div id="tab-profit-loss" className="space-y-5">
        <div className={`rounded-2xl p-6 border ${(plData?.netProfit||0) >= 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
          <p className="text-[10px] font-black uppercase tracking-widest mb-1 text-slate-500">Net {(plData?.netProfit||0) >= 0 ? 'Profit' : 'Loss'}</p>
          <p className={`text-4xl font-black ${(plData?.netProfit||0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {(plData?.netProfit||0) >= 0 ? '+' : '-'}{fmt(Math.abs(plData?.netProfit||0))}
          </p>
          <p className="text-xs text-slate-400 mt-2 font-medium">
            {fmt(plData?.totalRevenue)} revenue − {fmt(plData?.totalExpenses)} expenses
          </p>
        </div>
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
    </>
  )
)}
{activeTab === 'tax-summary' && (
  tbLoading ? (
    <div className="flex justify-center py-20"><Loader2 className="animate-spin text-indigo-500" size={32}/></div>
  ) : (
    <>
      <div className="flex justify-end mb-4">
        <button onClick={() => exportTabPDF('tab-tax-summary', 'Tax-Summary')}
          className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-indigo-600 transition-all shadow active:scale-95">
          <Download size={14}/> Export PDF
        </button>
      </div>
      <div id="tab-tax-summary" className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <div className="p-2 bg-blue-50 text-blue-600 w-fit rounded-xl mb-3"><ArrowUpRight size={18}/></div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tax Collected</p>
            <p className="text-2xl font-black text-slate-900">{fmt(taxData.collected)}</p>
            <p className="text-xs text-slate-400 mt-1">From GST/tax on sales</p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <div className="p-2 bg-amber-50 text-amber-600 w-fit rounded-xl mb-3"><ArrowDownRight size={18}/></div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tax Deductible</p>
            <p className="text-2xl font-black text-slate-900">{fmt(taxData.deductible)}</p>
            <p className="text-xs text-slate-400 mt-1">15% on expenses</p>
          </div>
          <div className={`p-6 rounded-2xl border shadow-lg ${taxData.netOwed > 0 ? 'bg-rose-50 border-rose-100' : 'bg-emerald-50 border-emerald-100'}`}>
            <div className={`p-2 w-fit rounded-xl mb-3 ${taxData.netOwed > 0 ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-white'}`}>
              <Landmark size={18}/>
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Net Tax Owed</p>
            <p className={`text-2xl font-black ${taxData.netOwed > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
              {fmt(Math.abs(taxData.netOwed))}
            </p>
            <p className="text-xs text-slate-400 mt-1">{taxData.netOwed <= 0 ? 'Credit/Overpaid' : 'Payable'}</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 bg-slate-50 border-b border-slate-100">
            <span className="text-xs font-black text-slate-700 uppercase tracking-widest">Invoice Tax Breakdown</span>
          </div>
          <table className="w-full text-xs">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                {['Client','Invoice #','Subtotal','Tax Rate','Tax Amount'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {taxData.invoices.length === 0 ? (
                <tr><td colSpan={5} className="px-5 py-8 text-center text-slate-400 font-bold">No sale invoices found</td></tr>
              ) : taxData.invoices.map(inv => (
                <tr key={inv._id} className="hover:bg-slate-50">
                  <td className="px-5 py-3 font-bold text-slate-700">{inv.clientName || inv.client?.name || 'N/A'}</td>
                  <td className="px-5 py-3 text-slate-500 font-mono text-[10px]">{inv.invoiceNumber || '—'}</td>
                  <td className="px-5 py-3 text-slate-600">{fmt(inv.subtotal)}</td>
                  <td className="px-5 py-3 text-slate-600">{inv.globalTaxRate || 0}%</td>
                  <td className="px-5 py-3 font-black text-rose-600">+{fmt(inv.taxAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
)}
{/* ── Cash Flow Tab ── */}
{activeTab === 'cash-flow' && (
  <>
    <div className="flex justify-end mb-4">
      <button onClick={() => exportTabPDF('tab-cash-flow', 'Cash-Flow')}
        className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-indigo-600 transition-all shadow active:scale-95">
        <Download size={14}/> Export PDF
      </button>
    </div>
    <div id="tab-cash-flow" className="space-y-6">
      <h2 className="text-lg font-black text-slate-800">Cash Flow Statement</h2>
      {!cfData ? (
        <div className="text-slate-400 text-sm">Loading...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: 'Operating Activities', value: cfData.operating, desc: 'Revenue minus Expenses', color: 'emerald' },
              { label: 'Investing Activities', value: cfData.investing, desc: 'Asset purchases/sales', color: 'blue' },
              { label: 'Financing Activities', value: cfData.financing, desc: 'Loans & equity', color: 'violet' },
            ].map(card => (
              <div key={card.label} className={`bg-white rounded-2xl p-5 border shadow-sm border-${card.color}-100`}>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">{card.label}</p>
                <p className={`text-2xl font-black ${card.value >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {fmt(card.value)}
                </p>
                <p className="text-xs text-slate-400 mt-1">{card.desc}</p>
              </div>
            ))}
          </div>
          <div className={`rounded-2xl p-6 border shadow-sm ${cfData.netCash >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
            <p className="text-sm font-bold text-slate-600 mb-1">Net Cash Change</p>
            <p className={`text-4xl font-black ${cfData.netCash >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
              {fmt(cfData.netCash)}
            </p>
            <p className="text-xs text-slate-500 mt-2">Operating + Investing + Financing</p>
          </div>
        </>
      )}
    </div>
  </>
)}
{activeTab === 'balance-sheet' && (
  <>
    <div className="flex justify-end mb-4">
      <button onClick={() => exportTabPDF('tab-balance-sheet', 'Balance-Sheet')}
        className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-indigo-600 transition-all shadow active:scale-95">
        <Download size={14}/> Export PDF
      </button>
    </div>
    <div id="tab-balance-sheet" className="space-y-4">
      <h2 className="text-lg font-black text-slate-800">Balance Sheet</h2>
      {!bsData ? <div className="text-slate-400 text-sm">Loading...</div> : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-5 py-3 bg-blue-50 border-b border-blue-100">
              <h3 className="text-sm font-black text-blue-700 uppercase tracking-wide">Assets</h3>
            </div>
            <table className="w-full text-xs">
              <tbody>
                {bsData.assets.map(a => (
                  <tr key={a.name} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-600">{a.name}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-800">{fmt(a.balance)}</td>
                  </tr>
                ))}
                <tr className="bg-blue-50">
                  <td className="px-4 py-3 font-black text-blue-700">Total Assets</td>
                  <td className="px-4 py-3 text-right font-black text-blue-700">{fmt(bsData.totalAssets)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-5 py-3 bg-rose-50 border-b border-rose-100">
                <h3 className="text-sm font-black text-rose-700 uppercase tracking-wide">Liabilities</h3>
              </div>
              <table className="w-full text-xs">
                <tbody>
                  {bsData.liabilities.length === 0
                    ? <tr><td colSpan={2} className="px-4 py-4 text-slate-400 text-center">No liabilities recorded</td></tr>
                    : bsData.liabilities.map(a => (
                      <tr key={a.name} className="border-b border-slate-50 hover:bg-slate-50">
                        <td className="px-4 py-3 text-slate-600">{a.name}</td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-800">{fmt(a.balance)}</td>
                      </tr>
                    ))}
                  <tr className="bg-rose-50">
                    <td className="px-4 py-3 font-black text-rose-700">Total Liabilities</td>
                    <td className="px-4 py-3 text-right font-black text-rose-700">{fmt(bsData.totalLiabilities)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-5 py-3 bg-violet-50 border-b border-violet-100">
                <h3 className="text-sm font-black text-violet-700 uppercase tracking-wide">Equity</h3>
              </div>
              <table className="w-full text-xs">
                <tbody>
                  {bsData.equity.length === 0
                    ? <tr><td colSpan={2} className="px-4 py-4 text-slate-400 text-center">No equity accounts recorded</td></tr>
                    : bsData.equity.map(a => (
                      <tr key={a.name} className="border-b border-slate-50 hover:bg-slate-50">
                        <td className="px-4 py-3 text-slate-600">{a.name}</td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-800">{fmt(a.balance)}</td>
                      </tr>
                    ))}
                  <tr className="bg-violet-50">
                    <td className="px-4 py-3 font-black text-violet-700">Total Equity</td>
                    <td className="px-4 py-3 text-right font-black text-violet-700">{fmt(bsData.totalEquity)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className={`rounded-2xl p-4 text-center border ${Math.abs(bsData.totalAssets - (bsData.totalLiabilities + bsData.totalEquity)) < 1 ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
              <p className="text-xs font-bold text-slate-500">Assets = Liabilities + Equity</p>
              <p className={`text-lg font-black mt-1 ${Math.abs(bsData.totalAssets - (bsData.totalLiabilities + bsData.totalEquity)) < 1 ? 'text-emerald-600' : 'text-amber-600'}`}>
                {fmt(bsData.totalAssets)} = {fmt(bsData.totalLiabilities + bsData.totalEquity)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  </>
)}
{activeTab === 'invoices' && (
  <>
    <div className="flex justify-end mb-4">
      <button onClick={() => exportTabPDF('tab-invoices', 'Invoices-Report')}
        className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-indigo-600 transition-all shadow active:scale-95">
        <Download size={14}/> Export PDF
      </button>
    </div>
    <div id="tab-invoices" className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl border border-emerald-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 bg-emerald-50 border-b border-emerald-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ArrowUpRight size={16} className="text-emerald-600" />
              <h3 className="text-sm font-black text-emerald-700 uppercase tracking-wide">Sales Invoices</h3>
            </div>
            <span className="text-xs font-black bg-emerald-600 text-white px-2.5 py-1 rounded-full">{salesMetrics.total} total</span>
          </div>
          <div className="p-5 grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Value</p>
              <p className="text-xl font-black text-slate-800">{fmt(salesMetrics.totalValue)}</p>
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Collected</p>
              <p className="text-xl font-black text-emerald-600">{fmt(salesMetrics.paidValue)}</p>
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Outstanding</p>
              <p className="text-xl font-black text-amber-600">{fmt(salesMetrics.pendingValue)}</p>
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tax Collected</p>
              <p className="text-xl font-black text-blue-600">{fmt(salesMetrics.totalTax)}</p>
            </div>
          </div>
          <div className="px-5 pb-4 flex gap-3">
            {[
              { label: 'Paid',      val: salesMetrics.paid,      color: 'bg-emerald-100 text-emerald-700' },
              { label: 'Pending',   val: salesMetrics.pending,   color: 'bg-amber-100 text-amber-700' },
              { label: 'Cancelled', val: salesMetrics.cancelled, color: 'bg-slate-100 text-slate-500' },
            ].map(s => (
              <span key={s.label} className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase ${s.color}`}>
                {s.label} · {s.val}
              </span>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-rose-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 bg-rose-50 border-b border-rose-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ArrowDownRight size={16} className="text-rose-600" />
              <h3 className="text-sm font-black text-rose-700 uppercase tracking-wide">Purchase Invoices</h3>
            </div>
            <span className="text-xs font-black bg-rose-600 text-white px-2.5 py-1 rounded-full">{purchaseMetrics.total} total</span>
          </div>
          <div className="p-5 grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Value</p>
              <p className="text-xl font-black text-slate-800">{fmt(purchaseMetrics.totalValue)}</p>
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Paid</p>
              <p className="text-xl font-black text-rose-600">{fmt(purchaseMetrics.paidValue)}</p>
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Outstanding</p>
              <p className="text-xl font-black text-amber-600">{fmt(purchaseMetrics.pendingValue)}</p>
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Input Tax</p>
              <p className="text-xl font-black text-violet-600">{fmt(purchaseMetrics.totalTax)}</p>
            </div>
          </div>
          <div className="px-5 pb-4 flex gap-3">
            {[
              { label: 'Paid',      val: purchaseMetrics.paid,      color: 'bg-emerald-100 text-emerald-700' },
              { label: 'Pending',   val: purchaseMetrics.pending,   color: 'bg-amber-100 text-amber-700' },
              { label: 'Cancelled', val: purchaseMetrics.cancelled, color: 'bg-slate-100 text-slate-500' },
            ].map(s => (
              <span key={s.label} className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase ${s.color}`}>
                {s.label} · {s.val}
              </span>
            ))}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Net Revenue (Sales − Purchases)</p>
          <p className={`text-2xl font-black ${salesMetrics.totalValue - purchaseMetrics.totalValue >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {fmt(salesMetrics.totalValue - purchaseMetrics.totalValue)}
          </p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Outstanding (Both)</p>
          <p className="text-2xl font-black text-amber-600">{fmt(salesMetrics.pendingValue + purchaseMetrics.pendingValue)}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Net Tax Position</p>
          <p className={`text-2xl font-black ${salesMetrics.totalTax - purchaseMetrics.totalTax >= 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
            {fmt(Math.abs(salesMetrics.totalTax - purchaseMetrics.totalTax))}
            <span className="text-xs font-bold text-slate-400 ml-2">
              {salesMetrics.totalTax - purchaseMetrics.totalTax >= 0 ? 'payable' : 'credit'}
            </span>
          </p>
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-black text-slate-700 uppercase tracking-wide">Sales Invoice Detail</h3>
          <span className="text-xs text-slate-400 font-bold">{salesInvoices.length} records</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                {['Invoice #','Client','Date','Subtotal','Tax','Total','Status'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {salesInvoices.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">No sales invoices yet</td></tr>
              ) : salesInvoices.map(inv => (
                <tr key={inv._id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-[10px] text-slate-500">{inv.invoiceNumber || '—'}</td>
                  <td className="px-4 py-3 font-semibold text-slate-700">{inv.clientName || inv.client?.name || 'N/A'}</td>
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                    {new Date(inv.invoiceDate).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{fmt(inv.subtotal)}</td>
                  <td className="px-4 py-3 text-blue-600 font-semibold">{fmt(inv.taxAmount)}</td>
                  <td className="px-4 py-3 font-black text-slate-800">{fmt(inv.totalAmount)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${
                      inv.status === 'Paid'      ? 'bg-emerald-50 text-emerald-600' :
                      inv.status === 'Pending'   ? 'bg-amber-50 text-amber-600' :
                      inv.status === 'Cancelled' ? 'bg-slate-100 text-slate-400' :
                      'bg-blue-50 text-blue-600'
                    }`}>{inv.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
            {salesInvoices.length > 0 && (
              <tfoot className="bg-emerald-50 border-t-2 border-emerald-100">
                <tr>
                  <td colSpan={3} className="px-4 py-3 font-black text-emerald-700 text-xs uppercase tracking-wide">Total</td>
                  <td className="px-4 py-3 font-black text-slate-700">{fmt(salesMetrics.totalValue - salesMetrics.totalTax)}</td>
                  <td className="px-4 py-3 font-black text-blue-700">{fmt(salesMetrics.totalTax)}</td>
                  <td className="px-4 py-3 font-black text-emerald-700">{fmt(salesMetrics.totalValue)}</td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-black text-slate-700 uppercase tracking-wide">Purchase Invoice Detail</h3>
          <span className="text-xs text-slate-400 font-bold">{purchaseInvoices.length} records</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                {['Purchase #','Vendor/Ref','Date','Subtotal','Tax','Total','Status'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {purchaseInvoices.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">No purchase invoices yet</td></tr>
              ) : purchaseInvoices.map(inv => (
                <tr key={inv._id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-[10px] text-slate-500">{inv.purchaseNumber || inv.referenceNumber || '—'}</td>
                  <td className="px-4 py-3 font-semibold text-slate-700">{inv.clientName || inv.client?.name || 'N/A'}</td>
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                    {new Date(inv.invoiceDate).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{fmt(inv.subtotal)}</td>
                  <td className="px-4 py-3 text-violet-600 font-semibold">{fmt(inv.taxAmount)}</td>
                  <td className="px-4 py-3 font-black text-slate-800">{fmt(inv.totalAmount)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${
                      inv.status === 'Paid'      ? 'bg-emerald-50 text-emerald-600' :
                      inv.status === 'Pending'   ? 'bg-amber-50 text-amber-600' :
                      inv.status === 'Cancelled' ? 'bg-slate-100 text-slate-400' :
                      'bg-blue-50 text-blue-600'
                    }`}>{inv.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
            {purchaseInvoices.length > 0 && (
              <tfoot className="bg-rose-50 border-t-2 border-rose-100">
                <tr>
                  <td colSpan={3} className="px-4 py-3 font-black text-rose-700 text-xs uppercase tracking-wide">Total</td>
                  <td className="px-4 py-3 font-black text-slate-700">{fmt(purchaseMetrics.totalValue - purchaseMetrics.totalTax)}</td>
                  <td className="px-4 py-3 font-black text-violet-700">{fmt(purchaseMetrics.totalTax)}</td>
                  <td className="px-4 py-3 font-black text-rose-700">{fmt(purchaseMetrics.totalValue)}</td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  </>
)}
{activeTab === 'gst' && (
  <>
    <div id="tab-gst" className="space-y-6">
  {/* PDF-only header — hidden in UI, visible in export */}
  <div id="gst-pdf-header" className="hidden print:block bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
    <div className="flex justify-between items-start">
      <div>
        <h1 className="text-2xl font-black text-slate-800">GST Report</h1>
        <p className="text-xs text-slate-400 mt-1 font-medium">
          Period: {gstFrom && gstTo ? `${gstFrom} to ${gstTo}` : gstPreset === 'monthly' ? 'This Month' : gstPreset === 'yearly' ? 'This Year' : 'All Time'}
        </p>
      </div>
      <div className="text-right">
        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Generated</p>
        <p className="text-xs text-slate-600 font-bold">{new Date().toLocaleString()}</p>
      </div>
    </div>
  </div>
  {/* Period Filter + Export Bar */}
  <div className="flex flex-wrap items-center justify-between gap-3 bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-black text-slate-500 uppercase tracking-wide">Period</span>
          {/* Quick presets */}
          {[
            { label: 'This Month', value: 'monthly' },
            { label: 'This Year',  value: 'yearly'  },
          ].map(p => (
            <button key={p.value}
              onClick={() => {
                const now = new Date();
                if (p.value === 'monthly') {
                  setGstFrom(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]);
                  setGstTo(new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]);
                } else {
                  setGstFrom(`${now.getFullYear()}-01-01`);
                  setGstTo(`${now.getFullYear()}-12-31`);
                }
                setGstPreset(p.value);
              }}
              className={`text-[10px] font-black px-3 py-1.5 rounded-lg uppercase tracking-wide transition-all ${
                gstPreset === p.value ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}>
              {p.label}
            </button>
          ))}
          <span className="text-slate-300 text-xs font-bold">or custom:</span>
          <input type="date" value={gstFrom} onChange={e => { setGstFrom(e.target.value); setGstPreset(''); }}
            className="text-xs border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-slate-50" />
          <span className="text-slate-300 text-xs font-bold">to</span>
          <input type="date" value={gstTo} onChange={e => { setGstTo(e.target.value); setGstPreset(''); }}
            className="text-xs border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-slate-50" />
          {(gstFrom || gstTo) && (
            <button onClick={() => { setGstFrom(''); setGstTo(''); setGstPreset(''); }}
              className="text-xs text-slate-400 hover:text-rose-500 font-bold px-2 py-1 rounded-lg bg-slate-100">
              Clear
            </button>
          )}
        </div>

        {/* Export Dropdown */}
        <div className="relative">
          <button
            onClick={() => setGstExportDropdownOpen(o => !o)}
            className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-indigo-600 transition-all shadow active:scale-95">
            <Download size={14}/> Export ▾
          </button>
          {gstExportDropdownOpen && (
            <div className="absolute right-0 mt-2 w-44 bg-white border border-slate-100 rounded-xl shadow-lg z-50 overflow-hidden">
              <button
                onClick={() => { setGstExportDropdownOpen(false); exportTabPDF('tab-gst', `GST-Report`); }}
                className="w-full text-left px-4 py-3 text-xs font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 flex items-center gap-2">
                <Download size={12}/> Export as PDF
              </button>
              <button
                onClick={() => { setGstExportDropdownOpen(false); exportGstCSV(); }}
                className="w-full text-left px-4 py-3 text-xs font-bold text-slate-700 hover:bg-emerald-50 hover:text-emerald-600 flex items-center gap-2">
                <Download size={12}/> Export as CSV
              </button>
            </div>
          )}
        </div>
      </div>
      {gstLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-indigo-500" size={32}/></div>
      ) : !gstData ? null : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl p-5 border border-emerald-100 shadow-sm">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Output GST (Sales)</p>
              <p className="text-2xl font-black text-emerald-600">{fmt(gstData.outputTax)}</p>
              <p className="text-xs text-slate-400 mt-1">Tax collected from customers</p>
            </div>
            <div className="bg-white rounded-2xl p-5 border border-blue-100 shadow-sm">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Input GST (Purchases)</p>
              <p className="text-2xl font-black text-blue-600">{fmt(gstData.totalInputTax)}</p>
              <p className="text-xs text-slate-400 mt-1">Tax paid on purchases & expenses</p>
            </div>
            <div className={`rounded-2xl p-5 border shadow-sm ${gstData.netGst > 0 ? 'bg-rose-50 border-rose-100' : 'bg-emerald-50 border-emerald-100'}`}>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Net GST Payable</p>
              <p className={`text-2xl font-black ${gstData.netGst > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                {fmt(Math.abs(gstData.netGst))}
              </p>
              <p className="text-xs text-slate-400 mt-1">{gstData.netGst > 0 ? 'Payable to government' : 'Input credit available'}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">From Purchase Invoices</p>
              <p className="text-xl font-black text-slate-700">{fmt(gstData.inputTaxPurchases)}</p>
            </div>
            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">From Expenses</p>
              <p className="text-xl font-black text-slate-700">{fmt(gstData.inputTaxExpenses)}</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-700 uppercase tracking-wide">GSTR-1 — Rate-wise Outward Supplies</h3>
            </div>
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {['Tax Rate','No. of Invoices','Taxable Value','Tax Amount'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {gstData.rateWise.length === 0 ? (
                  <tr><td colSpan={4} className="px-5 py-8 text-center text-slate-400">No taxable sales found</td></tr>
                ) : gstData.rateWise.map(row => (
                  <tr key={row.rate} className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-black text-indigo-600">{row.rate}</td>
                    <td className="px-5 py-3 text-slate-600">{row.count}</td>
                    <td className="px-5 py-3 text-slate-700 font-semibold">{fmt(row.taxableValue)}</td>
                    <td className="px-5 py-3 font-black text-emerald-600">{fmt(row.taxAmount)}</td>
                  </tr>
                ))}
                {gstData.rateWise.length > 0 && (
                  <tr className="bg-slate-50 border-t-2 border-slate-200">
                    <td className="px-5 py-3 font-black text-slate-800" colSpan={2}>Total</td>
                    <td className="px-5 py-3 font-black text-slate-800">{fmt(gstData.rateWise.reduce((s,r)=>s+r.taxableValue,0))}</td>
                    <td className="px-5 py-3 font-black text-emerald-700">{fmt(gstData.outputTax)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-700 uppercase tracking-wide">GSTR-1 — Invoice Detail (Outward)</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-emerald-50 border-b border-emerald-100">
                  <tr>
                    {['Invoice #','Client','Date','GST No.','Taxable Amt','Tax Rate','Tax Amt','Total'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] font-black text-slate-400 uppercase whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {gstData.salesInvoices.length === 0 ? (
                    <tr><td colSpan={8} className="px-5 py-6 text-center text-slate-400">No taxable sales in this period</td></tr>
                  ) : gstData.salesInvoices.map(inv => (
                    <tr key={inv._id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono text-[10px] text-slate-500">{inv.invoiceNumber || '—'}</td>
                     <td className="px-4 py-3 font-semibold text-slate-700">{inv.clientName || inv.client?.name || inv.customerName || '—'}</td>
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{new Date(inv.invoiceDate).toLocaleDateString(undefined,{day:'2-digit',month:'short',year:'numeric'})}</td>
                     <td className="px-4 py-3 font-mono text-[10px] text-slate-400">{inv.gstNumber || inv.gstin || inv.taxNumber || '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{fmt(inv.subtotal)}</td>
                      <td className="px-4 py-3 text-indigo-600 font-bold">{inv.globalTaxRate}%</td>
                      <td className="px-4 py-3 font-black text-emerald-600">{fmt(inv.taxAmount)}</td>
                      <td className="px-4 py-3 font-black text-slate-800">{fmt(inv.totalAmount)}</td>
                    </tr>
                  ))}
                </tbody>
                {gstData.salesInvoices.length > 0 && (
                  <tfoot className="bg-emerald-50 border-t-2 border-emerald-100">
                    <tr>
                      <td colSpan={4} className="px-4 py-3 font-black text-emerald-700 text-xs uppercase tracking-wide">Total</td>
                      <td className="px-4 py-3 font-black text-slate-700">
                        {fmt(gstData.salesInvoices.reduce((s, i) => s + (i.subtotal || 0), 0))}
                      </td>
                      <td />
                      <td className="px-4 py-3 font-black text-emerald-700">
                        {fmt(gstData.salesInvoices.reduce((s, i) => s + (i.taxAmount || 0), 0))}
                      </td>
                      <td className="px-4 py-3 font-black text-slate-800">
                        {fmt(gstData.salesInvoices.reduce((s, i) => s + (i.totalAmount || 0), 0))}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-700 uppercase tracking-wide">GSTR-3B — Input Tax Credit (Purchases)</h3>
               </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-blue-50 border-b border-blue-100">
                  <tr>
                    {['Purchase #','Vendor','Date','Taxable Amt','Tax Rate','Input Tax'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] font-black text-slate-400 uppercase whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {gstData.purchaseInvoices.length === 0 ? (
                    <tr><td colSpan={6} className="px-5 py-6 text-center text-slate-400">No taxable purchases in this period</td></tr>
                  ) : gstData.purchaseInvoices.map(inv => (
                    <tr key={inv._id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono text-[10px] text-slate-500">{inv.purchaseNumber || inv.referenceNumber || '—'}</td>
                     <td className="px-4 py-3 font-semibold text-slate-700">{inv.clientName || inv.client?.name || inv.vendorName || '—'}</td>
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{new Date(inv.invoiceDate).toLocaleDateString(undefined,{day:'2-digit',month:'short',year:'numeric'})}</td>
                      <td className="px-4 py-3 text-slate-600">{fmt(inv.subtotal)}</td>
                      <td className="px-4 py-3 text-indigo-600 font-bold">{inv.globalTaxRate}%</td>
                      <td className="px-4 py-3 font-black text-blue-600">{fmt(inv.taxAmount)}</td>
                    </tr>
                  ))}
                </tbody>
                {gstData.purchaseInvoices.length > 0 && (
                  <tfoot className="bg-blue-50 border-t-2 border-blue-100">
                    <tr>
                      <td colSpan={3} className="px-4 py-3 font-black text-blue-700 text-xs uppercase tracking-wide">Total</td>
                      <td className="px-4 py-3 font-black text-slate-700">
                        {fmt(gstData.purchaseInvoices.reduce((s, i) => s + (i.subtotal || 0), 0))}
                      </td>
                      <td />
                      <td className="px-4 py-3 font-black text-blue-700">
                        {fmt(gstData.purchaseInvoices.reduce((s, i) => s + (i.taxAmount || 0), 0))}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  </>
)}
        {/* Breakdown Section */}

</div>
    </div>
  );
};

export default Reports;