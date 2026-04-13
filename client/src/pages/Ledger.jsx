import React, { useState, useEffect, useCallback, useContext } from 'react';
import {
  BookOpen, ArrowUpRight, ArrowDownRight, ArrowRightLeft,
  Filter, Download, Loader2, TrendingUp, TrendingDown,
  DollarSign, RefreshCw, Search, ChevronDown, X, FileText
} from 'lucide-react';
import api from '../utils/api';
import { toast } from 'react-toastify';
import { CurrencyContext } from '../context/CurrencyContext';

// ── Helper: badge colour per source ──────────────────────────────────────────
const sourceBadge = {
  invoice:  'bg-emerald-50 text-emerald-700 border border-emerald-100',
  expense:  'bg-rose-50 text-rose-700 border border-rose-100',
  transfer: 'bg-blue-50 text-blue-700 border border-blue-100',
};

const entryIcon = (entry) => {
  if (entry.source === 'transfer')
    return <ArrowRightLeft size={16} className="text-blue-500" />;
  if (entry.entryType === 'credit')
    return <ArrowDownRight size={16} className="text-emerald-500" />;
  return <ArrowUpRight size={16} className="text-rose-500" />;
};

// ── CSV export ────────────────────────────────────────────────────────────────
const exportCSV = (entries, symbol) => {
  const header = ['Date', 'Description', 'Category', 'Reference', 'Debit Account', 'Credit Account', 'Type', 'Debit', 'Credit', 'Balance', 'Status'];
const rows = [...entries].reverse().map(e => [
  new Date(e.date).toLocaleDateString(),
  `"${e.description}"`,
  e.category,
  e.reference,
  e.debitAccount || '—',   // <-- new
  e.creditAccount || '—',  // <-- new
  e.entryType === 'credit' ? 'Credit' : 'Debit',
  e.entryType === 'debit'  ? e.amount.toFixed(2) : '',
  e.entryType === 'credit' ? e.amount.toFixed(2) : '',
  e.runningBalance.toFixed(2),
  e.status,
]);
  const csv = [header, ...rows].map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `ledger_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

// ── Main Component ────────────────────────────────────────────────────────────
const Ledger = () => {
  const { symbol } = useContext(CurrencyContext);

  // data
  const [entries, setEntries]   = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [ledgerAccounts, setLedgerAccounts] = useState([]);
  const [summary, setSummary]   = useState({ totalCredits: 0, totalDebits: 0, netBalance: 0, totalEntries: 0 });
  const [loading, setLoading]   = useState(true);

  // filters
  const [accountId,  setAccountId]  = useState('all');
  const [type,       setType]       = useState('all');
  const [startDate,  setStartDate]  = useState('');
  const [endDate,    setEndDate]    = useState('');
  const [search,     setSearch]     = useState('');
  const [showFilter, setShowFilter] = useState(false);

  // pagination
  const [page, setPage] = useState(1);
  const PER_PAGE = 20;

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchLedger = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (accountId !== 'all') params.append('accountId', accountId);
      if (type      !== 'all') params.append('type', type);
      if (startDate)           params.append('startDate', startDate);
      if (endDate)             params.append('endDate', endDate);

      const { data } = await api.get(`/ledger?${params.toString()}`);
      setEntries(data.entries || []);
      setSummary(data.summary || {});
      setAccounts(data.accounts || []);
      setLedgerAccounts(data.ledgerAccounts || []);
      setPage(1);
    } catch (err) {
      toast.error('Failed to load ledger.');
    } finally {
      setLoading(false);
    }
  }, [accountId, type, startDate, endDate]);

  useEffect(() => { fetchLedger(); }, [fetchLedger]);

  // ── Client-side search ────────────────────────────────────────────────────
  const filtered = search.trim()
    ? entries.filter(e =>
        e.description.toLowerCase().includes(search.toLowerCase()) ||
        e.category.toLowerCase().includes(search.toLowerCase()) ||
        e.account.toLowerCase().includes(search.toLowerCase()) ||
        e.reference.toLowerCase().includes(search.toLowerCase())
      )
    : entries;

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated  = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const clearFilters = () => {
    setAccountId('all');
    setType('all');
    setStartDate('');
    setEndDate('');
    setSearch('');
  };

  const hasActiveFilters = accountId !== 'all' || type !== 'all' || startDate || endDate || search;

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex flex-col justify-center items-center h-screen gap-4 bg-slate-50">
      <Loader2 className="animate-spin text-indigo-600" size={40} />
      <p className="text-slate-400 font-black animate-pulse uppercase tracking-widest text-[10px]">
        Compiling Ledger...
      </p>
    </div>
  );

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto min-h-screen bg-slate-50">

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2.5 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-200">
              <BookOpen size={22} className="text-white" />
            </div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">General Ledger</h2>
          </div>
          <p className="text-slate-500 font-medium text-sm ml-1">
            Complete double-entry record of all financial activity
          </p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <button
            onClick={() => setShowFilter(f => !f)}
            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm border transition-all
              ${hasActiveFilters
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-200'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
          >
            <Filter size={16} />
            Filters
            {hasActiveFilters && (
              <span className="bg-white/30 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">
                ON
              </span>
            )}
          </button>
          <button
            onClick={() => exportCSV(filtered, symbol)}
            className="flex-1 md:flex-none bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-600 transition-all shadow-xl text-sm"
          >
            <Download size={16} /> Export CSV
          </button>
        </div>
      </div>

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Total Credits',
            value: summary.totalCredits,
            icon: <TrendingUp size={18} />,
            color: 'text-emerald-600',
            bg: 'bg-emerald-50',
            prefix: '+',
          },
          {
            label: 'Total Debits',
            value: summary.totalDebits,
            icon: <TrendingDown size={18} />,
            color: 'text-rose-600',
            bg: 'bg-rose-50',
            prefix: '-',
          },
          {
            label: 'Net Balance',
            value: Math.abs(summary.netBalance),
            icon: <DollarSign size={18} />,
            color: summary.netBalance >= 0 ? 'text-indigo-600' : 'text-orange-600',
            bg: summary.netBalance >= 0 ? 'bg-indigo-50' : 'bg-orange-50',
            prefix: summary.netBalance >= 0 ? '+' : '-',
          },
          {
            label: 'Total Entries',
            value: summary.totalEntries,
            icon: <FileText size={18} />,
            color: 'text-slate-600',
            bg: 'bg-slate-100',
            isCount: true,
          },
        ].map((card, i) => (
          <div key={i} className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
            <div className={`inline-flex p-2 rounded-xl ${card.bg} ${card.color} mb-3`}>
              {card.icon}
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{card.label}</p>
            <p className={`text-2xl font-black ${card.color} tracking-tight`}>
              {card.isCount
                ? filtered.length
                : `${card.prefix}${symbol}${Number(card.value || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
            </p>
          </div>
        ))}
      </div>

      {/* ── Filter Panel ── */}
      {showFilter && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-black text-slate-800 text-sm uppercase tracking-wide">Filter Ledger</h3>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="flex items-center gap-1 text-xs text-rose-500 font-bold hover:text-rose-700">
                <X size={12} /> Clear All
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Account Filter */}
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Account</label>
              <div className="relative">
                <select
                  value={accountId}
                  onChange={e => setAccountId(e.target.value)}
                  className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                >
                  <option value="all">All Accounts</option>
                    {ledgerAccounts.map(a => (
                      <option key={a._id} value={a._id}>{a.name}</option>
                    ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-3.5 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Type Filter */}
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Type</label>
              <div className="relative">
                <select
                  value={type}
                  onChange={e => setType(e.target.value)}
                  className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                >
                  <option value="all">All Types</option>
                  <option value="income">Income / Sales</option>
                  <option value="expense">Expenses</option>
                  <option value="transfer">Transfers</option>
                </select>
                <ChevronDown size={14} className="absolute right-3 top-3.5 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Start Date */}
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">From Date</label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>

            {/* End Date */}
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">To Date</label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Search Bar ── */}
      <div className="relative">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search description, category, account..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-medium text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 shadow-sm"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
            <X size={14} />
          </button>
        )}
      </div>

{/* ── Ledger Table ── */}
<div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
  <table className="w-full text-xs min-w-[800px]">
    <thead>
      <tr className="bg-slate-50 border-b border-slate-100">
        {['Description','Date','Category','Dr Account','Cr Account','Debit','Credit','Balance'].map(h => (
          <th key={h} className="px-3 py-2.5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
        ))}
      </tr>
    </thead>
    <tbody className="divide-y divide-slate-50">
      {paginated.length === 0 ? (
        <tr>
          <td colSpan={8} className="py-16 text-center">
            <BookOpen className="text-slate-300 mx-auto mb-2" size={24} />
            <p className="text-slate-400 font-bold text-sm">No ledger entries found.</p>
          </td>
        </tr>
      ) : paginated.map((entry, idx) => (
        <tr key={`${entry._id}-${idx}`} className="hover:bg-slate-50/60 transition-colors">
          {/* Description */}
          <td className="px-3 py-2.5 max-w-[200px]">
            <div className="flex items-center gap-2">
              <div className={`p-1.5 rounded-lg shrink-0 ${
                entry.source === 'transfer' ? 'bg-blue-50' :
                entry.entryType === 'credit' ? 'bg-emerald-50' : 'bg-rose-50'}`}>
                {entryIcon(entry)}
              </div>
              <div className="min-w-0">
                <p className="font-bold text-slate-800 truncate leading-tight text-[11px]">{entry.description}</p>
                {entry.reference && <p className="text-[9px] text-slate-400 font-mono truncate">{String(entry.reference).slice(-12)}</p>}
              </div>
            </div>
          </td>
          {/* Date */}
          <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">
            {new Date(entry.date).toLocaleDateString(undefined, { day:'2-digit', month:'short', year:'numeric' })}
          </td>
          {/* Category */}
          <td className="px-3 py-2.5">
            <span className={`inline-block text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wide ${sourceBadge[entry.source] || 'bg-slate-100 text-slate-500'}`}>
              {entry.category}
            </span>
          </td>
          {/* Dr Account */}
          <td className="px-3 py-2.5 text-slate-700 whitespace-nowrap">
            <span className="text-rose-400 font-black text-[9px] mr-1">Dr</span>
            {entry.debitAccount || '—'}
          </td>
          {/* Cr Account */}
          <td className="px-3 py-2.5 text-slate-700 whitespace-nowrap">
            <span className="text-emerald-500 font-black text-[9px] mr-1">Cr</span>
            {entry.creditAccount || '—'}
          </td>
          {/* Debit */}
          <td className="px-3 py-2.5 text-right font-black">
            {entry.entryType === 'debit'
              ? <span className="text-rose-600">{symbol}{Number(entry.amount).toLocaleString(undefined,{minimumFractionDigits:2})}</span>
              : <span className="text-slate-200">—</span>}
          </td>
          {/* Credit */}
          <td className="px-3 py-2.5 text-right font-black">
            {entry.entryType === 'credit'
              ? <span className="text-emerald-600">{symbol}{Number(entry.amount).toLocaleString(undefined,{minimumFractionDigits:2})}</span>
              : <span className="text-slate-200">—</span>}
          </td>
          {/* Balance */}
          <td className={`px-3 py-2.5 text-right font-black whitespace-nowrap ${entry.runningBalance >= 0 ? 'text-slate-800' : 'text-orange-600'}`}>
            {entry.runningBalance < 0 ? '-' : ''}{symbol}{Math.abs(entry.runningBalance).toLocaleString(undefined,{minimumFractionDigits:2})}
          </td>
        </tr>
      ))}
    </tbody>
  </table>

  {/* Pagination */}
  {totalPages > 1 && (
    <div className="p-4 border-t border-slate-100 flex items-center justify-between">
      <span className="text-xs text-slate-400 font-bold">
        Showing {(page-1)*PER_PAGE+1}–{Math.min(page*PER_PAGE, filtered.length)} of {filtered.length}
      </span>
      <div className="flex gap-2">
        <button onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1}
          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-600 disabled:opacity-40 hover:bg-slate-200">Prev</button>
        {Array.from({length: Math.min(totalPages,5)}, (_,i) => {
          const n = page<=3 ? i+1 : page-2+i;
          if(n<1||n>totalPages) return null;
          return <button key={n} onClick={()=>setPage(n)}
            className={`w-8 h-8 rounded-lg text-xs font-black ${page===n?'bg-indigo-600 text-white':'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{n}</button>;
        })}
        <button onClick={() => setPage(p => Math.min(totalPages,p+1))} disabled={page===totalPages}
          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-600 disabled:opacity-40 hover:bg-slate-200">Next</button>
      </div>
    </div>
  )}
</div>

      {/* Footer note */}
      <p className="text-center text-[10px] text-slate-300 font-bold uppercase tracking-widest pb-4">
        All entries are computed from invoices, expenses & internal transfers · Running balance is cumulative
      </p>
    </div>
  );
};

export default Ledger;