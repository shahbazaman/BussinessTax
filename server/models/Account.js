import React, { useState, useEffect, useContext } from 'react';
import api from '../utils/api';
import { 
  Landmark, Wallet, Plus, Trash2, ArrowRightLeft, 
  ShieldCheck, Loader2, X, CreditCard, PieChart
} from 'lucide-react';
import { toast } from 'react-toastify';
import { CurrencyContext } from '../context/CurrencyContext';

const Accounts = () => {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const { symbol } = useContext(CurrencyContext);
  
  const [formData, setFormData] = useState({
    bankName: '',
    balance: '',
    accountType: 'Checking',
    accountNumber: ''
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/accounts');
      setAccounts(res.data);
    } catch (err) {
      toast.error("Financial sync failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/accounts', { ...formData, balance: Number(formData.balance) });
      toast.success("Account Linked Successfully");
      setShowModal(false);
      setFormData({ bankName: '', balance: '', accountType: 'Checking', accountNumber: '' });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Operation failed");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Disconnect this account? All linked transaction history will be archived.")) return;
    try {
      await api.delete(`/accounts/${id}`);
      toast.success("Account Removed");
      fetchData();
    } catch (err) {
      toast.error("Delete failed");
    }
  };

  const totalLiquidity = accounts.reduce((acc, curr) => acc + curr.balance, 0);

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-slate-50">
      <Loader2 className="animate-spin text-indigo-600" size={40}/>
    </div>
  );

  return (
    <div className="p-4 md:p-8 space-y-8 bg-slate-50 min-h-screen">
      
      {/* Financial Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Treasury</h1>
          <p className="text-slate-500 font-medium">Real-time cash flow and account management</p>
        </div>
        
        <div className="bg-white p-6 rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 flex items-center gap-8">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Total Liquidity</p>
            <p className="text-3xl font-black text-slate-900">{symbol}{totalLiquidity.toLocaleString()}</p>
          </div>
          <button 
            onClick={() => setShowModal(true)}
            className="bg-indigo-600 text-white p-4 rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 active:scale-95"
          >
            <Plus size={24} />
          </button>
        </div>
      </div>

      

      {/* Account Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {accounts.map((acc) => (
          <div key={acc._id} className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
            {/* Visual indicator for account type */}
            <div className={`absolute top-0 right-0 w-32 h-32 -mr-8 -mt-8 rounded-full opacity-5 ${
              acc.accountType === 'Checking' ? 'bg-blue-600' : acc.accountType === 'Savings' ? 'bg-emerald-600' : 'bg-amber-600'
            }`} />
            
            <div className="flex justify-between items-start mb-6">
              <div className={`p-4 rounded-2xl ${
                acc.accountType === 'Checking' ? 'bg-blue-50 text-blue-600' : 
                acc.accountType === 'Savings' ? 'bg-emerald-50 text-emerald-600' : 
                'bg-amber-50 text-amber-600'
              }`}>
                {acc.accountType === 'Wallet' ? <Wallet size={24}/> : <Landmark size={24}/>}
              </div>
              <button onClick={() => handleDelete(acc._id)} className="text-slate-200 hover:text-rose-500 transition-colors p-2">
                <Trash2 size={18} />
              </button>
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-black text-slate-800">{acc.bankName}</h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                {acc.accountType} • {acc.accountNumber || 'Digital Record'}
              </p>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-50 flex items-end justify-between">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Available Funds</p>
                <p className="text-2xl font-black text-slate-900">{symbol}{acc.balance.toLocaleString()}</p>
              </div>
              <div className="flex gap-2">
                <button className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:bg-slate-900 hover:text-white transition-all">
                  <ArrowRightLeft size={18} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Link Account Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[150] p-4">
          <div className="bg-white rounded-[3.5rem] w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in duration-200">
            <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Link Instrument</h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Connect New Financial Source</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-3 bg-white rounded-2xl text-slate-400 hover:text-slate-900 transition-all shadow-sm"><X size={20}/></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 rounded-2xl">
                {['Checking', 'Savings', 'Wallet'].map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setFormData({...formData, accountType: type})}
                    className={`py-3 rounded-xl text-[10px] font-black uppercase transition-all ${
                      formData.accountType === type ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Bank or Wallet Name</label>
                  <div className="relative">
                    <Landmark className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18}/>
                    <input required className="w-full pl-12 p-4 bg-slate-50 rounded-2xl border-none outline-none font-bold text-sm" placeholder="e.g. Standard Chartered" value={formData.bankName} onChange={e => setFormData({...formData, bankName: e.target.value})} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Opening Balance</label>
                    <input required type="number" min="0" className="w-full p-4 bg-slate-50 rounded-2xl border-none outline-none font-bold text-sm text-emerald-600" placeholder="0.00" value={formData.balance} onChange={e => setFormData({...formData, balance: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Account # (Unique)</label>
                    <input className="w-full p-4 bg-slate-50 rounded-2xl border-none outline-none font-bold text-sm" placeholder="Last 4 digits" value={formData.accountNumber} onChange={e => setFormData({...formData, accountNumber: e.target.value})} />
                  </div>
                </div>
              </div>

              <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 flex gap-3">
                <ShieldCheck className="text-indigo-500 shrink-0" size={18}/>
                <p className="text-[10px] leading-relaxed text-indigo-700 font-bold italic">
                  This account will be available for payroll disbursements and invoice settlements. Ensure the opening balance is accurate for reconciliation.
                </p>
              </div>

              <button type="submit" className="w-full bg-slate-900 text-white py-5 rounded-[2.5rem] font-black uppercase tracking-widest shadow-xl hover:bg-indigo-600 transition-all active:scale-95">
                Confirm Integration
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Accounts;