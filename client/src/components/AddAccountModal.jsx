import React, { useState, useContext } from 'react';
import { X, Landmark, Wallet, Banknote, ShieldCheck } from 'lucide-react';
import api from '../utils/api';
import { toast } from 'react-toastify';
import { CurrencyContext } from '../context/CurrencyContext';

const AddAccountModal = ({ isOpen, onClose, onRefresh }) => {
  const { symbol } = useContext(CurrencyContext);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    bankName: '',
    balance: '',
    accountType: 'Checking',
    accountNumber: '' // Added to match Schema index
  });

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Ensure balance is sent as a Number
      const payload = {
        ...formData,
        balance: Number(formData.balance),
      };

      // If accountNumber is empty string, remove it so the 'sparse' unique index 
      // doesn't collide with other empty strings
      if (!payload.accountNumber) delete payload.accountNumber;

      await api.post('/accounts', payload);
      
      toast.success("Financial source integrated!");
      onRefresh(); // Trigger re-fetch in parent
      handleClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to link account");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({ bankName: '', balance: '', accountType: 'Checking', accountNumber: '' });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-100 p-4">
      <div className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in duration-200">
        
        {/* Header */}
        <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Link Account</h2>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Financial Treasury Setup</p>
          </div>
          <button 
            onClick={handleClose} 
            className="p-2 hover:bg-white rounded-xl text-slate-400 hover:text-slate-900 transition-all shadow-sm"
          >
            <X size={20}/>
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          {/* Account Type Selection */}
          <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 rounded-2xl">
            {['Checking', 'Savings', 'Wallet'].map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setFormData({...formData, accountType: type})}
                className={`py-3 rounded-xl text-[10px] font-black uppercase transition-all ${
                  formData.accountType === type 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            {/* Bank Name */}
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Bank / Platform Name</label>
              <div className="relative mt-1">
                <Landmark className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input 
                  required
                  className="w-full bg-slate-50 border-none rounded-2xl p-4 pl-12 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20"
                  placeholder="e.g. Chase, HDFC, or PayPal"
                  value={formData.bankName}
                  onChange={(e) => setFormData({...formData, bankName: e.target.value})}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Balance */}
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Opening Balance</label>
                <div className="relative mt-1">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 font-black">{symbol}</span>
                  <input 
                    type="number" required min="0" step="0.01"
                    className="w-full bg-slate-50 border-none rounded-2xl p-4 pl-10 font-bold text-emerald-600 outline-none focus:ring-2 focus:ring-blue-500/20"
                    placeholder="0.00"
                    value={formData.balance}
                    onChange={(e) => setFormData({...formData, balance: e.target.value})}
                  />
                </div>
              </div>

              {/* Account Number */}
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Account # (Optional)</label>
                <input 
                  type="text"
                  className="w-full bg-slate-50 border-none rounded-2xl p-4 mt-1 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20"
                  placeholder="Last 4 digits"
                  value={formData.accountNumber}
                  onChange={(e) => setFormData({...formData, accountNumber: e.target.value})}
                />
              </div>
            </div>
          </div>

          {/* Compliance Note */}
          <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex gap-3">
            <ShieldCheck className="text-blue-500 shrink-0" size={18}/>
            <p className="text-[10px] leading-relaxed text-blue-700 font-bold">
              Connecting this account allows you to reconcile payments from Invoices and automate Payroll disbursements.
            </p>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-slate-900 text-white py-5 rounded-4xl font-black uppercase tracking-widest shadow-xl shadow-slate-200 hover:bg-blue-600 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Processing..." : "Finalize Integration"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddAccountModal;