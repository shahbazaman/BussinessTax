import React, { useState } from 'react';
import { X } from 'lucide-react';
import api from '../utils/api';
import { toast } from 'react-toastify';

const AddAccountModal = ({ isOpen, onClose, onRefresh }) => {
  const [formData, setFormData] = useState({
    bankName: '',
    balance: '',
    accountType: 'Checking'
  });

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/accounts', {
        ...formData,
        balance: Number(formData.balance)
      });
      toast.success("Account linked successfully!");
      onRefresh(); // Refresh the list in Accounts.jsx
      onClose();   // Close the modal
      setFormData({ bankName: '', balance: '', accountType: 'Checking' }); // Reset
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to add account");
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl animate-in zoom-in duration-200">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-black text-slate-800">Link Account</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X /></button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Bank Name</label>
            <input 
              required
              className="w-full bg-slate-50 border-none rounded-2xl p-4 mt-1 focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. HDFC or Stripe"
              value={formData.bankName}
              onChange={(e) => setFormData({...formData, bankName: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Balance</label>
              <input 
                type="number" required
                className="w-full bg-slate-50 border-none rounded-2xl p-4 mt-1 focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
                value={formData.balance}
                onChange={(e) => setFormData({...formData, balance: e.target.value})}
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Type</label>
              <select 
                className="w-full bg-slate-50 border-none rounded-2xl p-4 mt-1 focus:ring-2 focus:ring-blue-500 font-bold"
                value={formData.accountType}
                onChange={(e) => setFormData({...formData, accountType: e.target.value})}
              >
                <option>Checking</option>
                <option>Savings</option>
                <option>Wallet</option>
              </select>
            </div>
          </div>

          <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all mt-4">
            Save Account
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddAccountModal;