import React, { useState } from 'react';
import api from '../utils/api';
import { Landmark, Receipt, Calendar } from 'lucide-react';

const ExpenseForm = ({ onRefresh }) => {
  const [expense, setExpense] = useState({
    title: '',
    amount: '',
    category: 'Software',
    currency: 'USD',
    date: new Date().toISOString().split('T')[0]
  });
  const [otherCategory, setOtherCategory] = useState('');

  const categories = ['Software', 'Rent', 'Marketing', 'Travel', 'Salaries', 'Utilities', 'Other'];

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Logic: If category is 'Other', use the custom input value
      const finalCategory = expense.category === 'Other' ? otherCategory : expense.category;
      
      const payload = { ...expense, category: finalCategory };
      
      await api.post('/expenses', payload);
      alert('Expense logged!');
      onRefresh(); 
      setExpense({ title: '', amount: '', category: 'Software', currency: 'USD', date: new Date().toISOString().split('T')[0] });
      setOtherCategory(''); // Reset custom input
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl shadow-soft border border-slate-100 space-y-4">
      <h3 className="font-bold text-slate-800 flex items-center gap-2">
        <Receipt size={18} className="text-red-500" /> Log Business Expense
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <input 
          placeholder="Expense Title"
          className="w-full p-3 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-red-500/20"
          value={expense.title}
          onChange={(e) => setExpense({...expense, title: e.target.value})}
          required
        />
        <input 
          type="number"
          placeholder="Amount"
          className="w-full p-3 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-red-500/20"
          value={expense.amount}
          onChange={(e) => setExpense({...expense, amount: e.target.value})}
          required
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <select 
          className="w-full p-3 bg-slate-50 border-none rounded-xl outline-none"
          value={expense.category}
          onChange={(e) => setExpense({...expense, category: e.target.value})}
        >
          {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
        </select>

        <select 
          className="w-full p-3 bg-slate-50 border-none rounded-xl outline-none"
          value={expense.currency}
          onChange={(e) => setExpense({...expense, currency: e.target.value})}
        >
          <option value="USD">USD ($)</option>
          <option value="INR">INR (₹)</option>
          <option value="EUR">EUR (€)</option>
        </select>

        <input 
          type="date"
          className="w-full p-3 bg-slate-50 border-none rounded-xl outline-none"
          value={expense.date}
          onChange={(e) => setExpense({...expense, date: e.target.value})}
        />
      </div>

      {/* Conditional "Other" Input */}
      {expense.category === 'Other' && (
        <div className="animate-in slide-in-from-top-2 duration-200">
          <input 
            placeholder="Specify Category Name"
            className="w-full p-3 bg-red-50/50 border border-red-100 rounded-xl outline-none focus:ring-2 focus:ring-red-500/20 font-semibold"
            value={otherCategory}
            onChange={(e) => setOtherCategory(e.target.value)}
            required
          />
        </div>
      )}

      <button className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl hover:bg-slate-800 transition-all">
        Log Expense
      </button>
    </form>
  );
};

export default ExpenseForm;