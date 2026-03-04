import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Users, UserCheck, FileCheck, Receipt,
  ArrowRightLeft, Landmark, Plus,
  Trash2
} from 'lucide-react';
import {
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area,
  Legend, BarChart, Bar, PieChart, Pie, Cell
} from 'recharts';
import api from '../utils/api';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import InvoiceModal from '../components/InvoiceModal';
import LowStockWidget from '../components/LowStockWidget';
import { useNavigate } from 'react-router-dom';

// ─── Stat Card ────────────────────────────────────────────────────────────────
const StatCard = ({ label, value, icon, color }) => (
  <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 flex items-center gap-4 group hover:border-blue-100 transition-all">
    <div className={`${color} p-4 rounded-2xl text-white shadow-lg transition-transform group-hover:scale-110`}>
      {icon}
    </div>
    <div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5">{label}</p>
      <p className="text-2xl font-black text-slate-800">{value || 0}</p>
    </div>
  </div>
);

// ─── Dashboard ────────────────────────────────────────────────────────────────
const Dashboard = () => {
  const [stats, setStats]               = useState(null);
  const [accounts, setAccounts]         = useState([]);
  const [loading, setLoading]           = useState(true);
  const [currency, setCurrency]         = useState('USD');
  const [userTaxRate, setUserTaxRate]   = useState(0.15);
  const [clients, setClients]           = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [products, setProducts]         = useState([]);
  const navigate                        = useNavigate();

  // FIX: spendingReport feeds the Pie chart (needs _id + totalAmount shape)
  // spendingReport is kept separate from chartData (which feeds Bar + Area)
  const [spendingReport, setSpendingReport] = useState([]);

  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showClientModal,   setShowClientModal]   = useState(false);
  const [showAccountModal,  setShowAccountModal]  = useState(false);
  const [showInvoiceModal,  setShowInvoiceModal]  = useState(false);

  const [transferData, setTransferData] = useState({ fromId: '', toId: '', amount: 0 });
  const [newClient,    setNewClient]    = useState({ name: '', email: '', phone: '' });
  const [newAccount,   setNewAccount]  = useState({
    bankName: '', balance: '', accountType: 'Checking', accountNumber: ''
  });

  const invoicePrintRef = useRef(null);

  const CURRENCY_MAP   = { USD: '$', INR: '₹', EUR: '€', GBP: '£' };
  const currencySymbol = CURRENCY_MAP[currency] || '$';

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const [
        statsRes,
        accountsRes,
        clientsRes,
        transactionsRes,
        profileRes,
        productsRes,
        reportRes,
      ] = await Promise.all([
        api.get('/dashboard/stats'),
        api.get('/dashboard/accounts'),
        api.get('/clients'),
        api.get('/accounts/transactions'),   // FIX: sort mismatch noted — ensure Transaction schema uses createdAt
        api.get('/auth/profile'),
        api.get('/products'),
        api.get('/transactions/reports/spending'), // FIX: was pointing to wrong endpoint in api.js export
      ]);

      setStats(statsRes.data);
      setCurrency(profileRes.data.currency || 'USD');
      setUserTaxRate(Number(profileRes.data.taxRate) || 20);

      // FIX: Pie chart expects { _id, totalAmount } shape from the spending report.
      // We keep spendingReport raw (for Pie) and do NOT remap income/expenses onto it,
      // since those keys don't exist on spending-by-category data.
      setSpendingReport(reportRes.data || []);

      setAccounts(accountsRes.data);
      setClients(clientsRes.data);
      setTransactions(transactionsRes.data);
      setProducts(productsRes.data);

    } catch (err) {
      console.error('Dashboard Fetch Error:', err);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // ── Derived values ─────────────────────────────────────────────────────────
  const TAX_RATE      = userTaxRate / 100;
  const estimatedTax  = stats?.netProfit > 0 ? stats.netProfit * TAX_RATE : 0;
  const finalTakeHome = (stats?.netProfit || 0) - estimatedTax;

  // Area / Bar chart uses stats.chartData which has { name, income, expenses } shape
  const chartData = (stats?.chartData || []).map(item => ({
    ...item,
    income:   parseFloat(item.income)   || 0,
    expenses: parseFloat(item.expenses) || 0,
    name:     item.month || item.name || item.date || '',
  }));

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleDownloadPDF = async () => {
    const element = invoicePrintRef.current;
    if (!element) { toast.error('Print area not found'); return; }
    try {
      const canvas    = await html2canvas(element, { scale: 2, useCORS: true, logging: false });
      const imgData   = canvas.toDataURL('image/png');
      const pdf       = new jsPDF('p', 'mm', 'a4');
      const pdfWidth  = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save('Invoice_Download.pdf');
    } catch (err) {
      console.error('PDF Generation Error:', err);
      toast.error('Failed to generate PDF');
    }
  };

  const handleTransfer = async (e) => {
    e.preventDefault();
    if (transferData.fromId === transferData.toId) {
      toast.error('Source and Destination accounts must be different.');
      return;
    }
    try {
      await api.post('/accounts/transfer', {
        ...transferData,
        amount: Number(transferData.amount),
      });
      setShowTransferModal(false);
      setTransferData({ fromId: '', toId: '', amount: 0 });
      await fetchDashboardData();
      toast.success('Transfer Successful!');
    } catch (err) {
      toast.error('Transfer failed: ' + (err.response?.data?.message || 'Server Error'));
    }
  };

  const handleAddAccount = async (e) => {
    e.preventDefault();
    try {
      await api.post('/accounts', newAccount);
      setShowAccountModal(false);
      setNewAccount({ bankName: '', balance: '', accountType: 'Checking', accountNumber: '' });
      await fetchDashboardData(); // FIX: awaited so data is fresh
    } catch (err) {
      toast.error('Failed to add account: ' + (err.response?.data?.message || 'Error'));
    }
  };

  const handleAddClient = async (e) => {
    e.preventDefault();
    try {
      await api.post('/clients', newClient);
      setShowClientModal(false);
      setNewClient({ name: '', email: '', phone: '' });
      await fetchDashboardData(); // FIX: awaited
    } catch (err) {
      toast.error('Error adding client: ' + (err.response?.data?.message || 'Error'));
    }
  };

  const handleDeleteAccount = async (accountId) => {
    if (!window.confirm('Permanently delete this account?')) return;
    const deletePromise = api.delete(`/accounts/${accountId}`);
    toast.promise(deletePromise, {
      pending: 'Deleting account...',
      success: 'Account removed successfully! 🗑️',
      error: {
        render({ data }) {
          return data?.response?.data?.message || 'Failed to delete account';
        },
      },
    });
    try {
      await deletePromise;
      await fetchDashboardData();
    } catch (err) {
      console.error(err);
    }
  };

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading)
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <div className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">
            Syncing Ledger...
          </div>
        </div>
      </div>
    );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 lg:p-8 bg-slate-50 min-h-screen relative">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* ── Header ── */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">Financial Overview</h1>
            <p className="text-slate-500 text-sm">Real-time status of your business liquidity</p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setShowClientModal(true)}
              className="bg-white text-slate-700 px-6 py-3 rounded-2xl font-bold text-sm border border-slate-200 hover:bg-slate-50 transition-all"
            >
              + New Client
            </button>
            <button
              onClick={() => setShowInvoiceModal(true)}
              className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-bold text-sm shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all"
            >
              + Create Invoice
            </button>
            <button
              onClick={() => setShowTransferModal(true)}
              className="bg-slate-900 text-white px-6 py-3 rounded-2xl flex items-center gap-2 hover:bg-slate-800 transition-all font-bold text-sm shadow-xl shadow-slate-200"
            >
              <ArrowRightLeft size={18} /> Internal Transfer
            </button>
          </div>
        </div>

        {/* ── Invoice Modal ── */}
        {/* FIX: pass currencySymbol so modal shows correct currency instead of hardcoded ₹ */}
        <InvoiceModal
          isOpen={showInvoiceModal}
          onClose={() => setShowInvoiceModal(false)}
          onRefresh={fetchDashboardData}
          clients={clients}
          products={products}
          accounts={accounts}
          currencySymbol={currencySymbol}
        />

        {/* ── Summary Stats ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard label="Customers"       value={stats?.customers}    icon={<Users size={20} />}     color="bg-blue-500"    />
          <StatCard label="Vendors"         value={stats?.vendors}      icon={<UserCheck size={20} />} color="bg-emerald-500" />
          <StatCard label="Active Invoices" value={stats?.invoiceCount} icon={<FileCheck size={20} />} color="bg-amber-500"   />
          <StatCard label="Unpaid Bills"    value={stats?.bills}        icon={<Receipt size={20} />}   color="bg-rose-500"    />
        </div>

        {/* ── Profit & Loss ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Income</p>
            <h3 className="text-2xl font-black text-slate-800 mt-1">
              {currencySymbol}{stats?.totalIncome?.toLocaleString() || '0'}
            </h3>
          </div>
          <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Expenses</p>
            <h3 className="text-2xl font-black text-rose-500 mt-1">
              -{currencySymbol}{stats?.totalExpenses?.toLocaleString() || '0'}
            </h3>
          </div>
          <div
            className={`p-6 rounded-[2.5rem] shadow-xl border ${
              (stats?.netProfit ?? 0) >= 0
                ? 'bg-emerald-600 border-emerald-500'
                : 'bg-orange-600 border-orange-500'
            }`}
          >
            <p className="text-[10px] font-black text-white/70 uppercase tracking-widest">Net Profit (Pre-tax)</p>
            <h3 className="text-3xl font-black text-white mt-1">
              {currencySymbol}{stats?.netProfit?.toLocaleString() || '0'}
            </h3>
          </div>
        </div>

        {/* ── Tax & Take-Home ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-900 p-6 rounded-[2.5rem] border border-slate-800 shadow-xl relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-all" />
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
              Projected Tax ({(TAX_RATE * 100).toFixed(0)}%)
            </p>
            <h3 className="text-3xl font-black text-white mt-1">
              {currencySymbol}
              {estimatedTax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            <p className="text-slate-400 text-[10px] mt-2 italic">*Estimated based on current net profit</p>
          </div>

          <div className="bg-white p-6 rounded-[2.5rem] border-2 border-emerald-500 shadow-sm">
            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">True Take-Home Pay</p>
            <h3 className="text-3xl font-black text-slate-800 mt-1">
              {currencySymbol}
              {finalTakeHome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            <div className="w-full bg-slate-100 h-1.5 rounded-full mt-4 overflow-hidden">
              <div
                className="bg-emerald-500 h-full transition-all duration-1000"
                style={{
                  width: `${
                    stats?.totalIncome > 0
                      ? Math.max(0, Math.min(100, (finalTakeHome / stats.totalIncome) * 100))
                      : 0
                  }%`,
                }}
              />
            </div>
          </div>
        </div>

        {/* ── Charts & Tables ── */}
        <div className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">

            {/* Liquidity Accounts */}
            {/* FIX: h-100 → h-[400px] (h-100 is not a default Tailwind class) */}
            <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden flex flex-col h-[400px]">
              <div className="p-6 border-b border-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-slate-800 uppercase text-xs tracking-wider">
                  <Landmark size={16} className="text-blue-500" /> Liquidity Accounts
                </div>
                {/* FIX: button now opens the Add Account modal instead of navigating away */}
                <button
                  onClick={() => setShowAccountModal(true)}
                  className="bg-blue-50 text-blue-600 p-1.5 rounded-lg hover:bg-blue-100 transition-all active:scale-95"
                  title="Add New Account"
                >
                  <Plus size={16} />
                </button>
              </div>

              <div className="overflow-y-auto flex-1">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400">
                    <tr>
                      <th className="px-6 py-4">Institution</th>
                      <th className="px-6 py-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {accounts.map((acc) => (
                      <tr key={acc._id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-slate-700">{acc.bankName}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] text-slate-400 font-medium uppercase tracking-tighter">
                                {acc.accountType}
                              </span>
                              <span className="text-[10px] font-black text-slate-900 font-mono">
                                {currencySymbol}{acc.balance?.toLocaleString()}
                              </span>
                            </div>
                            {acc.balance < 500 && (
                              <span className="text-[8px] w-fit mt-1 bg-rose-50 text-rose-600 px-2 py-0.5 rounded-full font-black border border-rose-100 uppercase">
                                Low Funds
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleDeleteAccount(acc._id)}
                            className="opacity-0 group-hover:opacity-100 p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                            title="Delete Account"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Recent Internal Movements */}
              <div className="mt-auto bg-slate-50/50 border-t border-slate-100 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <ArrowRightLeft size={14} className="text-slate-400" />
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Recent Internal Movements
                  </h4>
                </div>
                <div className="space-y-3">
                  {transactions && transactions.length > 0 ? (
                    transactions.slice(0, 3).map((tx) => (
                      <div
                        key={tx._id}
                        className="flex justify-between items-center bg-white p-3 rounded-2xl border border-slate-100 shadow-sm"
                      >
                        <div className="flex flex-col">
                          <p className="text-[11px] font-bold text-slate-700 leading-tight">
                            {tx.description || 'Funds Transfer'}
                          </p>
                          <p className="text-[9px] text-slate-400 font-medium truncate w-32">
                            {tx.fromAccount?.bankName || 'Unknown'} → {tx.toAccount?.bankName || 'Unknown'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-black text-blue-600">
                            {currencySymbol}{tx.amount?.toLocaleString()}
                          </p>
                          {/* FIX: fall back to createdAt if timestamp is missing */}
                          <p className="text-[9px] text-slate-400 font-bold uppercase">
                            {new Date(tx.timestamp || tx.createdAt).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-4 text-center border-2 border-dashed border-slate-200 rounded-2xl">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">
                        No Transfers Found
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Recent Activity Table */}
            {/* FIX: h-100 → h-[400px], min-w-150 → min-w-[600px] */}
            <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden h-[400px] flex flex-col">
              <div className="p-6 border-b border-slate-50 flex items-center gap-2 font-bold text-slate-800 uppercase text-xs tracking-wider shrink-0">
                <ArrowRightLeft size={16} className="text-blue-500" /> Recent Activity
              </div>

              <div className="overflow-x-auto overflow-y-auto flex-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {/* FIX: no-scrollbar replaced with inline scrollbar-hide utilities */}
                <table className="w-full text-left border-collapse min-w-[600px] lg:min-w-full">
                  <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400 sticky top-0 z-10">
                    <tr>
                      <th className="px-4 lg:px-6 py-4">Date</th>
                      <th className="px-4 lg:px-6 py-4">Description</th>
                      <th className="px-4 lg:px-6 py-4">Category</th>
                      <th className="px-4 lg:px-6 py-4">From → To</th>
                      <th className="px-4 lg:px-6 py-4 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {transactions.length > 0 ? (
                      transactions.slice(0, 5).map((tx) => (
                        <tr key={tx._id} className="hover:bg-slate-50/50 transition-colors">
                          {/* FIX: fall back to createdAt if timestamp is missing */}
                          <td className="px-4 lg:px-6 py-4 text-[10px] lg:text-xs text-slate-500 whitespace-nowrap">
                            {new Date(tx.timestamp || tx.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-4 lg:px-6 py-4">
                            {/* FIX: max-w-37.5 → max-w-[150px] */}
                            <span className="text-xs lg:text-sm font-bold text-slate-700 block truncate max-w-[150px]">
                              {tx.title || tx.description || '—'}
                            </span>
                          </td>
                          <td className="px-4 lg:px-6 py-4">
                            <span className="text-[9px] lg:text-[10px] bg-blue-50 text-blue-600 px-2.5 py-1 rounded-lg border border-blue-100 uppercase font-black tracking-tighter whitespace-nowrap">
                              {tx.category || 'General'}
                            </span>
                          </td>
                          <td className="px-4 lg:px-6 py-4 text-[10px] lg:text-xs font-medium text-slate-500 whitespace-nowrap">
                            {tx.fromAccount?.bankName || 'N/A'} → {tx.toAccount?.bankName || 'N/A'}
                          </td>
                          <td className="px-4 lg:px-6 py-4 text-xs lg:text-sm font-black text-right text-blue-600 whitespace-nowrap">
                            {currencySymbol}{tx.amount?.toLocaleString()}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" className="px-6 py-8 text-center text-slate-400 text-sm">
                          No recent transactions found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Low Stock Widget */}
            {/* FIX: h-100 → h-[400px] */}
            <div className="h-[400px] flex flex-col">
              <LowStockWidget products={products} />
            </div>
          </div>

          {/* ── Charts Row ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">

            {/* 1. Income vs Expenses Bar Chart — uses stats.chartData */}
            <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">
                Income vs Expenses
              </h3>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }}
                    />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                    <Tooltip
                      cursor={{ fill: '#f8fafc' }}
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                      formatter={(value) => `${currencySymbol}${Number(value).toLocaleString()}`}
                    />
                    <Legend
                      verticalAlign="top"
                      align="right"
                      iconType="circle"
                      wrapperStyle={{ paddingBottom: '20px', fontSize: '11px', fontWeight: '900', textTransform: 'uppercase' }}
                    />
                    <Bar dataKey="income"   fill="#10b981" radius={[6, 6, 0, 0]} name="Income"   barSize={30} />
                    <Bar dataKey="expenses" fill="#f43f5e" radius={[6, 6, 0, 0]} name="Expenses" barSize={30} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 2. Expense Distribution Pie Chart — uses spendingReport ({ _id, totalAmount }) */}
            <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">
                  Expense Distribution
                </h3>
                <Receipt size={16} className="text-slate-300" />
              </div>
              <div className="h-80 w-full">
                {spendingReport.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                      <Receipt size={24} className="opacity-20" />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-tighter">No expense data recorded</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={spendingReport}
                        dataKey="totalAmount"
                        nameKey="_id"
                        cx="50%"
                        cy="50%"
                        innerRadius={70}
                        outerRadius={90}
                        paddingAngle={8}
                      >
                        {spendingReport.map((_, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={['#3b82f6', '#10b981', '#f43f5e', '#f59e0b', '#8b5cf6'][index % 5]}
                            stroke="none"
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontWeight: 'bold', fontSize: '12px' }}
                        formatter={(value) => `${currencySymbol}${Number(value).toLocaleString()}`}
                      />
                      <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', paddingTop: '10px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* 3. Revenue Growth Trend Area Chart — always uses chartData (has income/expenses keys) */}
            {/* FIX: was falling back to spendingReport which has NO income/expenses keys → blank chart */}
            <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-8">
                Revenue Growth Trend
              </h3>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}   />
                      </linearGradient>
                      <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.1} />
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0}   />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }}
                      dy={10}
                    />
                    <YAxis hide domain={['auto', 'auto']} />
                    <Tooltip
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '12px', fontWeight: 'bold' }}
                      formatter={(value) => `${currencySymbol}${Number(value).toLocaleString()}`}
                    />
                    <Area
                      type="monotone"
                      dataKey="income"
                      stroke="#3b82f6"
                      fillOpacity={1}
                      fill="url(#colorIncome)"
                      strokeWidth={4}
                      animationDuration={1500}
                    />
                    <Area
                      type="monotone"
                      dataKey="expenses"
                      stroke="#ef4444"
                      fillOpacity={1}
                      fill="url(#colorExpenses)"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      animationDuration={1500}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Transfer Modal ── */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white p-8 rounded-[2.5rem] w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Move Funds</h3>
              <button onClick={() => setShowTransferModal(false)} className="text-slate-400 hover:text-slate-600 font-bold">
                Close
              </button>
            </div>

            <form onSubmit={handleTransfer} className="space-y-5">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Source Account
                </label>
                <select
                  required
                  className="w-full mt-2 p-4 rounded-2xl border-none bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500/20 text-sm font-bold"
                  value={transferData.fromId}
                  onChange={(e) => setTransferData({ ...transferData, fromId: e.target.value })}
                >
                  <option value="">Select account...</option>
                  {accounts.map((acc) => (
                    <option key={acc._id} value={acc._id}>
                      {acc.bankName} ({currencySymbol}{acc.balance})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Destination
                </label>
                <select
                  required
                  className="w-full mt-2 p-4 rounded-2xl border-none bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500/20 text-sm font-bold"
                  value={transferData.toId}
                  onChange={(e) => setTransferData({ ...transferData, toId: e.target.value })}
                >
                  <option value="">Select account...</option>
                  {accounts
                    .filter((a) => a._id !== transferData.fromId)
                    .map((acc) => (
                      <option key={acc._id} value={acc._id}>
                        {acc.bankName}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Amount to Transfer
                </label>
                <input
                  type="number"
                  required
                  min="0.01"
                  step="0.01"
                  placeholder="0.00"
                  className="w-full mt-2 p-4 rounded-2xl border-none bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500/20 text-sm font-bold"
                  value={transferData.amount || ''}
                  onChange={(e) => setTransferData({ ...transferData, amount: e.target.value })}
                />
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-sm hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 mt-4"
              >
                Execute Transfer
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Add Client Modal ── */}
      {showClientModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl">
            <h2 className="text-2xl font-black text-slate-800 mb-6">Add New Client</h2>
            <form onSubmit={handleAddClient} className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Name</label>
                <input
                  required
                  className="w-full bg-slate-50 border-none rounded-2xl p-4 mt-1 focus:ring-2 focus:ring-blue-500 transition-all"
                  placeholder="Acme Corp"
                  value={newClient.name}
                  onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Email</label>
                <input
                  type="email"
                  required
                  className="w-full bg-slate-50 border-none rounded-2xl p-4 mt-1 focus:ring-2 focus:ring-blue-500 transition-all"
                  placeholder="contact@acme.com"
                  value={newClient.email}
                  onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Phone</label>
                <input
                  type="tel"
                  className="w-full bg-slate-50 border-none rounded-2xl p-4 mt-1 focus:ring-2 focus:ring-blue-500 transition-all"
                  placeholder="+1 (555) 000-0000"
                  value={newClient.phone}
                  onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowClientModal(false)}
                  className="flex-1 bg-red-600 py-4 rounded-2xl font-bold text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all"
                >
                  Save Client
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Add Account Modal ── */}
      {/* FIX: was previously unreachable — now triggered by the + button in Liquidity Accounts */}
      {showAccountModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl">
            <h2 className="text-2xl font-black text-slate-800 mb-6">Link New Account</h2>

            <form onSubmit={handleAddAccount} className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                  Bank Name
                </label>
                <input
                  required
                  className="w-full bg-slate-50 border-none rounded-2xl p-4 mt-1 focus:ring-2 focus:ring-blue-500 transition-all"
                  placeholder="e.g. HDFC, Chase, Stripe"
                  value={newAccount.bankName}
                  onChange={(e) => setNewAccount({ ...newAccount, bankName: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                    Initial Balance
                  </label>
                  <input
                    type="number"
                    required
                    className="w-full bg-slate-50 border-none rounded-2xl p-4 mt-1 focus:ring-2 focus:ring-blue-500 shadow-inner"
                    placeholder="0.00"
                    value={newAccount.balance}
                    onChange={(e) => setNewAccount({ ...newAccount, balance: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Type</label>
                  <select
                    className="w-full bg-slate-50 border-none rounded-2xl p-4 mt-1 focus:ring-2 focus:ring-blue-500"
                    value={newAccount.accountType}
                    onChange={(e) => setNewAccount({ ...newAccount, accountType: e.target.value })}
                  >
                    <option>Checking</option>
                    <option>Savings</option>
                    <option>Wallet</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAccountModal(false)}
                  className="flex-1 bg-red-600 py-4 rounded-2xl font-bold text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all"
                >
                  Save Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Offscreen Invoice Print Area ── */}
      <div style={{ position: 'absolute', left: '-9999px', top: 0, zIndex: -10 }}>
        <div
          ref={invoicePrintRef}
          id="invoice-print-area"
          style={{ width: '800px', padding: '40px', backgroundColor: '#ffffff', color: '#0f172a', fontFamily: 'sans-serif' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #e2e8f0', paddingBottom: '30px' }}>
            <div>
              <h1 style={{ fontSize: '40px', fontWeight: '900', color: '#2563eb', margin: '0' }}>INVOICE</h1>
              <p style={{ color: '#64748b', marginTop: '8px' }}>BusinessTax Ledger</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <h2 style={{ fontWeight: 'bold', fontSize: '24px', margin: '0' }}>BusinessTax Ledger</h2>
              <p style={{ color: '#64748b', margin: '4px 0 0 0' }}>Official Financial Statement</p>
            </div>
          </div>
          <div style={{ marginTop: '40px', display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
            <div>
              <p style={{ fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', color: '#94a3b8', marginBottom: '8px' }}>Billed To</p>
              <h3 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0' }}>— (use InvoiceModal to populate) —</h3>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', color: '#94a3b8', marginBottom: '8px' }}>Due Date</p>
              <h3 style={{ fontSize: '20px', fontWeight: 'bold', margin: '0' }}>N/A</h3>
            </div>
          </div>
          <div style={{ marginTop: '60px', padding: '40px', borderRadius: '24px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 'bold', color: '#64748b', fontSize: '18px' }}>Total Amount Due</span>
              <span style={{ fontSize: '42px', fontWeight: '900', color: '#0f172a' }}>{currencySymbol}0.00</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;