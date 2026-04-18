import React, { useState, useEffect, useCallback } from 'react';
import {BookMarked, Plus, Trash2, RefreshCw, Loader2,ShieldCheck, ChevronDown, X, Info, Search,Eye, Pencil} from 'lucide-react';
import api from '../utils/api';
import { toast } from 'react-toastify';

// ── Account type config ───────────────────────────────────────────────────────
const TYPE_CONFIG = {
  Asset:     { color: 'bg-blue-50 text-blue-700 border border-blue-100',   dot: 'bg-blue-500'   },
  Liability: { color: 'bg-orange-50 text-orange-700 border border-orange-100', dot: 'bg-orange-500' },
  Equity:    { color: 'bg-purple-50 text-purple-700 border border-purple-100', dot: 'bg-purple-500' },
  Revenue:   { color: 'bg-emerald-50 text-emerald-700 border border-emerald-100', dot: 'bg-emerald-500' },
  Expense:   { color: 'bg-rose-50 text-rose-700 border border-rose-100',   dot: 'bg-rose-500'   },
};

const TYPE_ORDER = ['Asset', 'Revenue', 'Expense', 'Liability', 'Equity'];

const ACCOUNT_TYPES = ['Asset', 'Liability', 'Equity', 'Revenue', 'Expense'];

// ── Empty form state ──────────────────────────────────────────────────────────
const EMPTY_FORM = { name: '', type: 'Asset', code: '', description: '' };

// ── Main Component ────────────────────────────────────────────────────────────
const LedgerAccounts = () => {
    const [accounts, setAccounts]       = useState([]);
    const [loading, setLoading]         = useState(true);
    const [seeding, setSeeding]         = useState(false);
    const [showForm, setShowForm]       = useState(false);
    const [form, setForm]               = useState(EMPTY_FORM);
    const [saving, setSaving]           = useState(false);
    const [search, setSearch]           = useState('');
    const [filterType, setFilterType]   = useState('all');
    const [deletingId, setDeletingId]   = useState(null);
    const [editAccount, setEditAccount] = useState(null); 
    const [editForm,    setEditForm]    = useState({ name: '', code: '', description: '' });
    const [editSaving,  setEditSaving]  = useState(false);
    const [viewAccount,    setViewAccount]    = useState(null); 
    const [viewEntries,    setViewEntries]    = useState([]);
    const [viewSummary,    setViewSummary]    = useState(null);
    const [viewLoading,    setViewLoading]    = useState(false);
    const [viewDateFrom,   setViewDateFrom]   = useState('');
    const [viewDateTo,     setViewDateTo]     = useState('');
    // Filtered entries based on date range
const filteredViewEntries = viewEntries.filter(e => {
  const d = new Date(e.date);
  if (viewDateFrom && d < new Date(viewDateFrom)) return false;
  if (viewDateTo   && d > new Date(viewDateTo + 'T23:59:59')) return false;
  return true;
});

const filteredSummary = filteredViewEntries.length > 0 ? {
  totalDebit:     Number(filteredViewEntries.reduce((s, e) => s + (e.debit  || 0), 0).toFixed(2)),
  totalCredit:    Number(filteredViewEntries.reduce((s, e) => s + (e.credit || 0), 0).toFixed(2)),
  closingBalance: Number(filteredViewEntries.reduce((s, e) => s + (e.debit  || 0) - (e.credit || 0), 0).toFixed(2)),
} : viewSummary;
  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/ledger-accounts');
      setAccounts(data || []);
    } catch {
      toast.error('Failed to load chart of accounts.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAccounts(); }, [fetchAccounts]);

  // ── Seed defaults ─────────────────────────────────────────────────────────
  const handleSeed = async () => {
    setSeeding(true);
    try {
      await api.post('/ledger-accounts/seed');
      toast.success('System accounts seeded successfully.');
      fetchAccounts();
    } catch {
      toast.error('Failed to seed system accounts.');
    } finally {
      setSeeding(false);
    }
  };

  // ── Create ────────────────────────────────────────────────────────────────
  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Account name is required.');
    setSaving(true);
    try {
      await api.post('/ledger-accounts', form);
      toast.success('Account created.');
      setForm(EMPTY_FORM);
      setShowForm(false);
      fetchAccounts();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to create account.');
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!window.confirm('Delete this account? Historical journal entries will still reference it.')) return;
    setDeletingId(id);
    try {
      await api.delete(`/ledger-accounts/${id}`);
      toast.success('Account deleted.');
      setAccounts(prev => prev.filter(a => String(a._id) !== String(id)));
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to delete.');
    } finally {
      setDeletingId(null);
    }
  };
  // ── Edit ─────────────────────────────────────────────────────────────────
const handleEditOpen = (account) => {
  setEditAccount(account);
  setEditForm({ name: account.name, code: account.code || '', description: account.description || '' });
};

const handleEditSave = async () => {
  if (!editForm.name.trim()) return toast.error('Account name is required.');
  setEditSaving(true);
  try {
    const { data } = await api.put(`/ledger-accounts/${editAccount._id}`, editForm);
    setAccounts(prev => prev.map(a => String(a._id) === String(editAccount._id) ? { ...a, ...data } : a));
    toast.success('Account updated.');
    setEditAccount(null);
  } catch (err) {
    toast.error(err?.response?.data?.message || 'Failed to update account.');
  } finally {
    setEditSaving(false);
  }
};
const handleView = async (account) => {
  setViewAccount(account);
  setViewEntries([]);
  setViewSummary(null);
  setViewLoading(true);
  try {
    const { data } = await api.get(`/ledger-accounts/${account._id}/entries`);
    setViewEntries(data.entries || []);
    setViewSummary({ totalDebit: data.totalDebit, totalCredit: data.totalCredit, closingBalance: data.closingBalance });
  } catch {
    toast.error('Failed to load account entries.');
  } finally {
    setViewLoading(false);
  }
};
  // ── Filter + search ───────────────────────────────────────────────────────
  const filtered = accounts.filter(a => {
    const matchType   = filterType === 'all' || a.type === filterType;
    const matchSearch = !search.trim() ||
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      (a.code || '').toLowerCase().includes(search.toLowerCase()) ||
      (a.description || '').toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  // Group by type in correct order
  const grouped = TYPE_ORDER.reduce((acc, type) => {
    const items = filtered.filter(a => a.type === type);
    if (items.length) acc[type] = items;
    return acc;
  }, {});

  // Summary counts
  const counts = ACCOUNT_TYPES.reduce((acc, t) => {
    acc[t] = accounts.filter(a => a.type === t).length;
    return acc;
  }, {});

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex flex-col justify-center items-center h-screen gap-4 bg-slate-50">
      <Loader2 className="animate-spin text-indigo-600" size={40} />
      <p className="text-slate-400 font-black animate-pulse uppercase tracking-widest text-[10px]">
        Loading Chart of Accounts...
      </p>
    </div>
  );

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-5xl mx-auto min-h-screen bg-slate-50">

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2.5 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-200">
              <BookMarked size={22} className="text-white" />
            </div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Chart of Accounts</h2>
          </div>
          <p className="text-slate-500 font-medium text-sm ml-1">
            Ledger master — all accounts used in double-entry journal entries
          </p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <button
            onClick={handleSeed}
            disabled={seeding}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all shadow-sm disabled:opacity-60"
          >
            {seeding ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
            Seed Defaults
          </button>
          <button
            onClick={() => setShowForm(f => !f)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
          >
            <Plus size={16} />
            New Account
          </button>
        </div>
      </div>

      {/* ── Info banner ── */}
      <div className="flex items-start gap-3 bg-indigo-50 border border-indigo-100 rounded-2xl px-5 py-4">
        <Info size={16} className="text-indigo-500 mt-0.5 shrink-0" />
        <p className="text-indigo-700 text-sm font-medium">
          System accounts (marked with a shield) are created automatically and cannot be deleted. 
          Bank accounts sync here automatically when you add them in the Accounts page.
          Click <strong>Seed Defaults</strong> to create the standard set if missing.
        </p>
      </div>

      {/* ── Summary pills ── */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => setFilterType('all')}
          className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wide transition-all border ${
            filterType === 'all'
              ? 'bg-slate-900 text-white border-slate-900'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          All · {accounts.length}
        </button>
        {ACCOUNT_TYPES.map(t => (
          <button
            key={t}
            onClick={() => setFilterType(filterType === t ? 'all' : t)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wide transition-all border ${
              filterType === t
                ? `${TYPE_CONFIG[t].color} border-current`
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${TYPE_CONFIG[t].dot}`} />
            {t} · {counts[t] || 0}
          </button>
        ))}
      </div>

      {/* ── New Account Form ── */}
      {showForm && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-black text-slate-800 text-sm uppercase tracking-wide">Add New Account</h3>
            <button onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }} className="text-slate-400 hover:text-slate-700">
              <X size={16} />
            </button>
          </div>
          <form onSubmit={handleCreate}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              {/* Name */}
              <div className="sm:col-span-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                  Account Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Office Supplies, Petty Cash..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>

              {/* Type */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                  Account Type <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={form.type}
                    onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                    className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  >
                    {ACCOUNT_TYPES.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-3.5 text-slate-400 pointer-events-none" />
                </div>
                <p className="text-[10px] text-slate-400 mt-1 ml-1">
                  {form.type === 'Asset'     && 'Things you own (bank, cash, receivables)'}
                  {form.type === 'Liability' && 'Things you owe (loans, payables)'}
                  {form.type === 'Equity'    && "Owner's stake in the business"}
                  {form.type === 'Revenue'   && 'Income earned (sales, services)'}
                  {form.type === 'Expense'   && 'Money spent (rent, salaries, supplies)'}
                </p>
              </div>

              {/* Code */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                  Account Code <span className="text-slate-300">(optional)</span>
                </label>
                <input
                  type="text"
                  value={form.code}
                  onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
                  placeholder="e.g. 1100, 4000..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>

              {/* Description */}
              <div className="sm:col-span-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                  Description <span className="text-slate-300">(optional)</span>
                </label>
                <input
                  type="text"
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Brief description of this account..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-5">
              <button
                type="button"
                onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }}
                className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors disabled:opacity-60"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                Create Account
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Search ── */}
      <div className="relative">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search by name, code or description..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-medium text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 shadow-sm"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
            <X size={14} />
          </button>
        )}
      </div>

      {/* ── Accounts grouped by type ── */}
      {Object.keys(grouped).length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-100 py-20 text-center shadow-sm">
          <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <BookMarked className="text-slate-300" size={28} />
          </div>
          <p className="text-slate-400 font-bold text-sm">No accounts found.</p>
          <p className="text-slate-300 text-xs mt-1">Click "Seed Defaults" to add system accounts, or create a custom one.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {Object.entries(grouped).map(([type, items]) => (
            <div key={type} className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">

              {/* Group header */}
              <div className={`px-6 py-3 flex items-center justify-between border-b border-slate-50`}>
                <div className="flex items-center gap-2.5">
                  <span className={`w-2.5 h-2.5 rounded-full ${TYPE_CONFIG[type]?.dot}`} />
                  <span className="text-xs font-black text-slate-700 uppercase tracking-widest">{type}</span>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${TYPE_CONFIG[type]?.color}`}>
                    {items.length} account{items.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 font-medium hidden sm:block">
                  {type === 'Asset'     && 'Debit to increase · Credit to decrease'}
                  {type === 'Liability' && 'Credit to increase · Debit to decrease'}
                  {type === 'Equity'    && 'Credit to increase · Debit to decrease'}
                  {type === 'Revenue'   && 'Credit to increase · Debit to decrease'}
                  {type === 'Expense'   && 'Debit to increase · Credit to decrease'}
                </p>
              </div>

              {/* Account rows */}
              <div className="divide-y divide-slate-50">
                {items.map(account => (
                  <div
                    key={account._id}
                    className="px-6 py-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors gap-4"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      {/* Code */}
                      {account.code && (
                        <span className="text-[10px] font-black text-slate-400 font-mono bg-slate-50 px-2 py-1 rounded-lg shrink-0">
                          {account.code}
                        </span>
                      )}

                      {/* Name + description */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-slate-800 truncate">{account.name}</p>
                          {account.isSystem && (
                            <span title="System account — cannot be deleted" className="shrink-0">
                              <ShieldCheck size={13} className="text-indigo-400" />
                            </span>
                          )}
                        </div>
                        {account.description && (
                          <p className="text-xs text-slate-400 truncate mt-0.5">{account.description}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {/* Type badge */}
                      <span className={`hidden sm:inline-block text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wide ${TYPE_CONFIG[type]?.color}`}>
                        {type}
                      </span>
                            <button
                                onClick={() => handleView(account)}
                                className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                                title="View entries"
                                >
                                <Eye size={14} />
                                </button>
                                {!account.isSystem && (
                                  <button
                                    onClick={() => handleEditOpen(account)}
                                    className="p-2 rounded-xl text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                                    title="Edit account"
                                  >
                                    <Pencil size={14} />
                                  </button>
                                )}
                      {/* Delete button — only for non-system accounts */}
                      {!account.isSystem ? (
                        <button
                          onClick={() => handleDelete(account._id)}
                          disabled={deletingId === account._id}
                          className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-40"
                          title="Delete account"
                        >
                          {deletingId === account._id
                            ? <Loader2 size={14} className="animate-spin" />
                            : <Trash2 size={14} />
                          }
                        </button>
                      ) : (
                        <div className="w-8" /> // spacer to keep alignment
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <p className="text-center text-[10px] text-slate-300 font-bold uppercase tracking-widest pb-4">
        Chart of accounts · Used in all journal entries and the general ledger
      </p>
      {/* ── Edit Account Modal ── */}
{editAccount && (
  <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
        <div>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Edit Account</p>
          <h3 className="text-lg font-black text-slate-800">{editAccount.name}</h3>
        </div>
        <button onClick={() => setEditAccount(null)} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400">
          <X size={18} />
        </button>
      </div>
      <div className="px-6 py-5 space-y-4">
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
            Account Name <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={editForm.name}
            onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
            Account Code <span className="text-slate-300">(optional)</span>
          </label>
          <input
            type="text"
            value={editForm.code}
            onChange={e => setEditForm(f => ({ ...f, code: e.target.value }))}
            placeholder="e.g. 1100"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
            Description <span className="text-slate-300">(optional)</span>
          </label>
          <input
            type="text"
            value={editForm.description}
            onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Brief description..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>
      </div>
      <div className="flex justify-end gap-3 px-6 pb-5">
        <button
          onClick={() => setEditAccount(null)}
          className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleEditSave}
          disabled={editSaving}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors disabled:opacity-60"
        >
          {editSaving ? <Loader2 size={14} className="animate-spin" /> : <Pencil size={14} />}
          Save Changes
        </button>
      </div>
    </div>
  </div>
)}
      {/* ── View Account Modal ── */}
{viewAccount && (
  <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col">
      
      {/* Modal Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
        <div>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">{viewAccount.type} Account</p>
          <h3 className="text-lg font-black text-slate-800">{viewAccount.name}</h3>
        </div>
        <div className="flex items-center gap-3">
  <div className="flex items-center gap-2">
    <input
      type="date"
      value={viewDateFrom}
      onChange={e => setViewDateFrom(e.target.value)}
      className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-slate-50"
    />
    <span className="text-slate-300 text-xs font-bold">to</span>
    <input
      type="date"
      value={viewDateTo}
      onChange={e => setViewDateTo(e.target.value)}
      className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-slate-50"
    />
    {(viewDateFrom || viewDateTo) && (
      <button
        onClick={() => { setViewDateFrom(''); setViewDateTo(''); }}
        className="text-xs text-slate-400 hover:text-rose-500 font-bold"
        title="Clear filter"
      >
        <X size={13} />
      </button>
    )}
  </div>
  <button onClick={() => { setViewAccount(null); setViewDateFrom(''); setViewDateTo(''); }} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400">
    <X size={18} />
  </button>
</div>
      </div>

      {/* Summary Bar */}
      {filteredSummary && (
        <div className="grid grid-cols-3 gap-4 px-6 py-3 bg-slate-50 border-b border-slate-100">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Debit</p>
            <p className="text-base font-black text-rose-600">₹{filteredSummary.totalDebit.toLocaleString(undefined,{minimumFractionDigits:2})}</p>
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Credit</p>
            <p className="text-base font-black text-emerald-600">₹{filteredSummary.totalCredit.toLocaleString(undefined,{minimumFractionDigits:2})}</p>
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Closing Balance</p>
            <p className={`text-base font-black ${filteredSummary.closingBalance >= 0 ? 'text-indigo-600' : 'text-orange-600'}`}>
              ₹{Math.abs(viewSummary.closingBalance).toLocaleString(undefined,{minimumFractionDigits:2})}
            </p>
          </div>
        </div>
      )}

      {/* Entries Table */}
      <div className="overflow-y-auto flex-1">
        {viewLoading ? (
          <div className="flex justify-center items-center py-16">
            <Loader2 className="animate-spin text-indigo-500" size={28} />
          </div>
        ) : filteredViewEntries.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-slate-400 font-bold text-sm">No journal entries for this account yet.</p>
            <p className="text-slate-300 text-xs mt-1">Entries appear automatically when invoices or expenses are created.</p>
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-slate-50 border-b border-slate-100">
              <tr>
                {['Date','Description','Dr Account','Cr Account','Debit','Credit','Balance','Status'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredViewEntries.map((e, i) => (
                <tr key={i} className={`hover:bg-slate-50 ${e.isReversed ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-2.5 whitespace-nowrap text-slate-500">
                    {new Date(e.date).toLocaleDateString(undefined,{day:'2-digit',month:'short',year:'numeric'})}
                  </td>
                  <td className="px-4 py-2.5 max-w-45 truncate text-slate-700 font-medium">{e.description}</td>
                  <td className="px-4 py-2.5 text-slate-600 whitespace-nowrap">
                    <span className="text-rose-400 font-black text-[9px] mr-1">Dr</span>{e.debitAccount || '—'}
                  </td>
                  <td className="px-4 py-2.5 text-slate-600 whitespace-nowrap">
                    <span className="text-emerald-500 font-black text-[9px] mr-1">Cr</span>{e.creditAccount || '—'}
                  </td>
                  <td className="px-4 py-2.5 text-right font-black text-rose-600">
                    {e.debit ? `₹${e.debit.toLocaleString(undefined,{minimumFractionDigits:2})}` : <span className="text-slate-200">—</span>}
                  </td>
                  <td className="px-4 py-2.5 text-right font-black text-emerald-600">
                    {e.credit ? `₹${e.credit.toLocaleString(undefined,{minimumFractionDigits:2})}` : <span className="text-slate-200">—</span>}
                  </td>
                  <td className={`px-4 py-2.5 text-right font-black whitespace-nowrap ${e.balance >= 0 ? 'text-slate-800' : 'text-orange-600'}`}>
                    ₹{Math.abs(e.balance).toLocaleString(undefined,{minimumFractionDigits:2})}
                  </td>
                  <td className="px-4 py-2.5">
                    {e.isReversed
                      ? <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-slate-100 text-slate-400 uppercase">Reversed</span>
                      : <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 uppercase">Active</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

    </div>
  </div>
)}
    </div>
  );
};

export default LedgerAccounts;