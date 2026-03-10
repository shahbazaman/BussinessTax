import React, { useState, useEffect, useCallback, useContext } from 'react';
import { 
  Landmark, Plus, Trash2, Wallet, ArrowRightLeft, Loader2, 
  ArrowUpRight, ArrowDownRight, CreditCard 
} from 'lucide-react';
import api from '../utils/api';
import { toast } from 'react-toastify';
import AddAccountModal from "../components/AddAccountModal";
import TransferModal from '../components/TransferModal';
import { CurrencyContext } from '../context/CurrencyContext';

const Accounts = () => {
  const [accounts, setAccounts] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const { symbol } = useContext(CurrencyContext);
  
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [accRes, expRes, invRes, transRes] = await Promise.all([
        api.get('/accounts'),
        api.get('/expenses'),
        api.get('/invoices'),
        api.get('/transactions') // Internal transfers
      ]);

      setAccounts(accRes.data);

      // Create a unified activity feed
      const combinedFeed = [
        ...expRes.data.map(e => ({ 
          ...e, 
          feedType: 'expense', 
          displayTitle: e.title,
          finalAmount: e.amount,
          date: e.date 
        })),
        ...invRes.data.map(i => ({ 
          ...i, 
          feedType: 'invoice', 
          displayTitle: i.customerName,
          finalAmount: i.total,
          date: i.date 
        })),
        ...transRes.data.map(t => ({ 
          ...t, 
          feedType: 'transfer', 
          displayTitle: `Transfer: ${t.fromAccount?.bankName || 'Source'} → ${t.toAccount?.bankName || 'Dest'}`,
          finalAmount: t.amount,
          date: t.date 
        }))
      ].sort((a, b) => new Date(b.date) - new Date(a.date));

      setActivity(combinedFeed.slice(0, 8)); // Showing top 8 for a fuller list
    } catch (err) {
      toast.error("Financial sync failed. Please check your connection.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);
const getIcon = (type) => {
  switch(type) {
    case 'Cash': return <ArrowDownRight size={24} />;
    case 'Wallet/UPI': return <Wallet size={24} />;
    case 'Payment Gateway': return <CreditCard size={24} />;
    default: return <Landmark size={24} />;
  }
};
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to unlink this account? This will not delete transactions but will remove the link.")) return;
    try {
      await api.delete(`/accounts/${id}`);
      toast.success("Account unlinked successfully");
      fetchData();
    } catch (err) {
      toast.error("Delete failed: " + (err.response?.data?.message || "Server error"));
    }
  };

  if (loading) return (
    <div className="flex flex-col justify-center items-center h-screen gap-4 bg-slate-50">
      <Loader2 className="animate-spin text-blue-600" size={40} />
      <p className="text-slate-400 font-black animate-pulse uppercase tracking-widest text-[10px]">Accessing Vault...</p>
    </div>
  );

  return (
    <div className="p-4 lg:p-8 space-y-8 max-w-7xl mx-auto min-h-screen bg-slate-50">
      {/* --- Header --- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Liquidity</h2>
          <p className="text-slate-500 font-medium text-sm">Manage bank balances and global cash flow</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <button 
            onClick={() => setIsTransferModalOpen(true)}
            className="flex-1 md:flex-none bg-white text-slate-700 border border-slate-200 px-6 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-slate-50 transition-all shadow-sm text-sm"
          >
            <ArrowRightLeft size={18} /> Transfer
          </button>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="flex-1 md:flex-none bg-slate-900 text-white px-6 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-blue-600 transition-all shadow-xl text-sm"
          >
            <Plus size={20} /> Add Account
          </button>
        </div>
      </div>

      {/* --- Account Cards --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {accounts.map((acc) => (
          <div key={acc._id} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all relative group">
            <div className="flex items-start justify-between mb-8">
              <div className="p-4 rounded-2xl bg-slate-50 text-slate-600">
                {getIcon(acc.accountType)}
              </div>              
              <button 
                onClick={() => handleDelete(acc._id)} 
                className="p-2 text-slate-200 hover:text-rose-500 rounded-xl lg:opacity-0 group-hover:opacity-100 transition-all"
              >
                <Trash2 size={18} />
              </button>
            </div>            
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{acc.accountType}</p>
            <h3 className="text-xl font-black text-slate-800 mb-1">{acc.bankName}</h3>
            <h4 className="text-3xl font-black text-slate-900 tracking-tighter">
              {symbol}{Number(acc.balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </h4>            
            {acc.accountNumber && (
              <div className="mt-6 flex items-center gap-2 text-slate-300">
                <CreditCard size={14} />
                <span className="text-xs font-bold font-mono tracking-wider">
                  **** {acc.accountNumber.slice(-4)}
                </span>
              </div>
            )}
          </div>
        ))}
        
        {accounts.length === 0 && (
                <button 
                  onClick={() => setIsAddModalOpen(true)}
                  className="border-2 border-dashed border-slate-200 p-8 rounded-[2.5rem] flex flex-col items-center justify-center gap-3 text-slate-400 hover:border-blue-400 hover:text-blue-500 transition-all group"
                >
                  <div className="p-4 bg-slate-50 rounded-full group-hover:bg-blue-50">
                    <Plus size={30} />
                  </div>
                  <span className="font-bold text-sm">Link your first account</span>
                </button>
              )}
      </div>

      {/* --- Unified Activity Feed --- */}
      <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-50 bg-slate-50/30 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            <h4 className="font-black text-slate-800 uppercase text-xs tracking-[0.2em]">Global Transaction Feed</h4>
          </div>
          <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">Live Sync</span>
        </div>
        
        <div className="divide-y divide-slate-50">
          {activity.map((item, idx) => {
            const isExpense = item.feedType === 'expense';
            const isTransfer = item.feedType === 'transfer';
            const isInvoice = item.feedType === 'invoice';

            return (
              <div key={idx} className="p-6 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${
                    isExpense ? 'bg-rose-50 text-rose-500' : 
                    isTransfer ? 'bg-blue-50 text-blue-500' : 
                    'bg-emerald-50 text-emerald-500'
                  }`}>
                    {isExpense && <ArrowUpRight size={20} />}
                    {isTransfer && <ArrowRightLeft size={20} />}
                    {isInvoice && <ArrowDownRight size={20} />}
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-800 line-clamp-1">
                      {item.displayTitle || 'Business Transaction'}
                    </p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
                      {new Date(item.date).toLocaleDateString(undefined, { dateStyle: 'medium' })} • {item.feedType}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-black text-lg ${
                    isExpense ? 'text-rose-500' : 
                    isTransfer ? 'text-blue-600' : 
                    'text-emerald-600'
                  }`}>
                    {isExpense ? '-' : isInvoice ? '+' : ''}
                    {symbol}{Number(item.finalAmount).toLocaleString()}
                  </p>
                </div>
              </div>
            );
          })}
          
          {activity.length === 0 && (
            <div className="p-20 text-center">
              <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <ArrowRightLeft className="text-slate-300" size={24} />
              </div>
              <p className="text-slate-400 font-bold text-sm">No recent movement detected.</p>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <AddAccountModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        onRefresh={fetchData} 
      />
      <TransferModal 
        isOpen={isTransferModalOpen} 
        onClose={() => setIsTransferModalOpen(false)} 
        accounts={accounts} 
        onRefresh={fetchData} 
      />
    </div>
  );
};

export default Accounts;