import React, { useState } from 'react';
import { X, ArrowRightLeft, Send } from 'lucide-react';
import api from '../utils/api';
import { toast } from 'react-toastify';
const TransferModal = ({ isOpen, onClose, accounts, onRefresh }) => {
  const [transferData, setTransferData] = useState({
    fromId: '',
    toId: '',
    amount: '',
    description: ''
  });
const sourceAccount = accounts.find(a => a._id === transferData.fromId);
const isInvalid = !sourceAccount || Number(transferData.amount) > sourceAccount.balance;
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
        const payload = { 
      ...transferData, 
      amount: Number(transferData.amount)};
      await api.post('/accounts/transfer', transferData);
      toast.success("Transfer Completed!");
      onRefresh();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Transfer failed");
    }
  };
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-[3rem] w-full max-w-md p-8 shadow-2xl">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
            <ArrowRightLeft className="text-blue-600" /> Internal Move
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full"><X /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[10px] font-black uppercase text-slate-400 ml-4 mb-2 block">Source Account</label>
            <select 
              className="w-full p-4 bg-slate-50 rounded-2xl border-none outline-none font-bold"
              onChange={(e) => setTransferData({...transferData, fromId: e.target.value})}
              required
            >
              <option value="">Select Source</option>
              {accounts.map(a => <option key={a._id} value={a._id}>{a.bankName} (${a.balance})</option>)}
            </select>
          </div>
          <div className="flex justify-center -my-2 relative z-10">
            <div className="bg-white p-2 rounded-full border border-slate-100 shadow-sm text-blue-600">
              <ArrowRightLeft size={20} className="rotate-90" />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-black uppercase text-slate-400 ml-4 mb-2 block">Destination Account</label>
            <select 
              className="w-full p-4 bg-slate-50 rounded-2xl border-none outline-none font-bold"
              onChange={(e) => setTransferData({...transferData, toId: e.target.value})}
              required
            >
              <option value="">Select Destination</option>
              {accounts.map(a => <option key={a._id} value={a._id}>{a.bankName}</option>)}
            </select>
          </div>
          <div className="pt-4">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-4 mb-2 block">Amount to Transfer</label>
            <input 
              type="number"
              placeholder="0.00"
              className="w-full p-5 bg-blue-50/50 rounded-2xl border-none outline-none font-black text-2xl text-blue-600"
              onChange={(e) => setTransferData({...transferData, amount: e.target.value})}
              required
            />
          </div>
<button disabled={isInvalid} className={`w-full bg-blue-600 text-white py-5 rounded-3xl font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-700 transition-all mt-4 shadow-xl shadow-blue-100 ${isInvalid ? 'bg-slate-200 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'} ...`}>
  {isInvalid ? 'Insufficient Funds' : <><Send size={20} />Execute Transfer</>}
</button>
        </form>
      </div>
    </div>
  );
};
export default TransferModal;