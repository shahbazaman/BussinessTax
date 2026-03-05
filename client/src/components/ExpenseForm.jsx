import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { Landmark, Receipt, Calendar, FileText, Link as LinkIcon } from 'lucide-react';
import { toast } from 'react-toastify';

const ExpenseForm = ({ onRefresh }) => {
  const [accounts, setAccounts] = useState([]);
  const [expense, setExpense] = useState({
    title: '',
    amount: '',
    category: 'Software',
    currency: 'USD',
    date: new Date().toISOString().split('T')[0],
    paidFromAccount: '',
    notes: '',
    receiptUrl: ''
  });
  
  const [otherCategory, setOtherCategory] = useState('');
  const categories = ['Software', 'Rent', 'Marketing', 'Travel', 'Salaries', 'Utilities', 'Other'];

  // Fetch accounts to populate the "Paid From" dropdown
  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const res = await api.get('/accounts');
        setAccounts(res.data);
      } catch (err) {
        console.error("Failed to load accounts", err);
      }
    };
    fetchAccounts();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const finalCategory = expense.category === 'Other' ? otherCategory : expense.category;
      
      const payload = { 
        ...expense, 
        category: finalCategory,
        amount: Number(expense.amount)
      };
      
      await api.post('/expenses', payload);
      toast.success('Expense logged successfully!');
      
      // Reset form
      setExpense({ 
        title: '', 
        amount: '', 
        category: 'Software', 
        currency: 'USD', 
        date: new Date().toISOString().split('T')[0],
        paidFromAccount: '',
        notes: '',
        receiptUrl: ''
      });
      setOtherCategory('');
      
      if (onRefresh) onRefresh(); 
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to log expense');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl shadow-soft border border-slate-100 space-y-4">
      <h3 className="font-bold text-slate-800 flex items-center gap-2">
        <Receipt size={18} className="text-rose-500" /> Quick Log Expense
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <input 
          placeholder="Expense Title"
          className="w-full p-3 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-rose-500/20 text-sm font-medium"
          value={expense.title}
          onChange={(e) => setExpense({...expense, title: e.target.value})}
          required
        />
        <input 
          type="number"
          placeholder="Amount"
          className="w-full p-3 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-rose-500/20 text-sm font-medium"
          value={expense.amount}
          onChange={(e) => setExpense({...expense, amount: e.target.value})}
          required
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative">
          <select 
            className="w-full p-3 bg-slate-50 border-none rounded-xl outline-none text-sm font-medium appearance-none"
            value={expense.category}
            onChange={(e) => setExpense({...expense, category: e.target.value})}
          >
            {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>

        <select 
          className="w-full p-3 bg-slate-50 border-none rounded-xl outline-none text-sm font-medium"
          value={expense.paidFromAccount}
          onChange={(e) => setExpense({...expense, paidFromAccount: e.target.value})}
          required
        >
          <option value="">Paid From...</option>
          {accounts.map(acc => (
            <option key={acc._id} value={acc._id}>{acc.bankName}</option>
          ))}
        </select>

        <input 
          type="date"
          className="w-full p-3 bg-slate-50 border-none rounded-xl outline-none text-sm font-medium"
          value={expense.date}
          onChange={(e) => setExpense({...expense, date: e.target.value})}
        />
      </div>

      {/* Conditional "Other" Input */}
      {expense.category === 'Other' && (
        <input 
          placeholder="Specify Category Name"
          className="w-full p-3 bg-rose-50/50 border border-rose-100 rounded-xl outline-none font-semibold text-sm text-rose-700 animate-in fade-in slide-in-from-top-1"
          value={otherCategory}
          onChange={(e) => setOtherCategory(e.target.value)}
          required
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="relative flex items-center">
          <LinkIcon size={14} className="absolute left-3 text-slate-400" />
          <input 
            placeholder="Receipt URL (Optional)"
            className="w-full p-3 pl-9 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-rose-500/20 text-sm font-medium"
            value={expense.receiptUrl}
            onChange={(e) => setExpense({...expense, receiptUrl: e.target.value})}
          />
        </div>
        <div className="relative flex items-center">
          <FileText size={14} className="absolute left-3 text-slate-400" />
          <input 
            placeholder="Notes..."
            className="w-full p-3 pl-9 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-rose-500/20 text-sm font-medium"
            value={expense.notes}
            onChange={(e) => setExpense({...expense, notes: e.target.value})}
          />
        </div>
      </div>

      <button className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 uppercase text-xs tracking-widest">
        Log Expense
      </button>
    </form>
  );
};

export default ExpenseForm;