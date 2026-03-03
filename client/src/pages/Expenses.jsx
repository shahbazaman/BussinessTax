import React, { useState, useEffect, useMemo, useContext } from 'react';
import api from '../utils/api';
import { Plus, Receipt, Trash2, Tag, X, Calendar, Edit2, ChevronDown } from 'lucide-react';
import { exportToCSV } from '../utils/exportCSV';
import { CurrencyContext } from '../context/CurrencyContext';
import { toast } from 'react-toastify';

const Expenses = () => {
  const [expenses, setExpenses] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null); 
  const { symbol } = useContext(CurrencyContext);

  // Standard categories
  const categories = ['Software', 'Rent', 'Marketing', 'Travel', 'Salaries', 'Utilities', 'Other'];

  const [formData, setFormData] = useState({ 
    title: '', 
    amount: '', 
    category: 'Software', 
    currency: 'USD',
    expenseDate: new Date().toISOString().split('T')[0],
    receiptUrl: '' 
  });

  // State for the manual "Other" input
  const [otherCategory, setOtherCategory] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const res = await api.get('/expenses');
      setExpenses(res.data);
    } catch (err) { 
      setError("Failed to load expenses.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const handleEditClick = (exp) => {
    setEditingId(exp._id);
    
    // Check if the expense category is in our standard list
    const isStandardCategory = categories.includes(exp.category);
    
    setFormData({
      title: exp.title,
      amount: exp.amount,
      category: isStandardCategory ? exp.category : 'Other',
      currency: exp.currency || 'USD',
      expenseDate: new Date(exp.date).toISOString().split('T')[0],
      receiptUrl: exp.receiptUrl || ''
    });

    // If it's a custom category, populate the "Other" field
    if (!isStandardCategory) {
      setOtherCategory(exp.category);
    } else if (exp.category === 'Other') {
        setOtherCategory('');
    }

    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate custom category
    const finalCategory = formData.category === 'Other' ? otherCategory : formData.category;
    if (formData.category === 'Other' && !otherCategory.trim()) {
        return toast.error("Please specify the category name");
    }

    try {
      const payload = {
        ...formData,
        amount: Number(formData.amount),
        category: finalCategory, // Use the custom name if "Other" was picked
        date: formData.expenseDate 
      };

      if (editingId) {
        await api.put(`/expenses/${editingId}`, payload);
        toast.success("Expense updated");
      } else {
        await api.post('/expenses', payload);
        toast.success("Expense recorded");
      }

      handleCloseModal(); 
      fetchExpenses();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Delete this expense record?")) {
      try {
        await api.delete(`/expenses/${id}`);
        fetchExpenses();
        toast.success("Expense deleted");
      } catch (err) {
        toast.error("Failed to delete");
      }
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingId(null);
    setOtherCategory('');
    setFormData({ 
      title: '', amount: '', category: 'Software', currency: 'USD',
      expenseDate: new Date().toISOString().split('T')[0], receiptUrl: '' 
    });
  };

  const filteredExpenses = useMemo(() => {
    return expenses.filter(exp => {
      const title = exp.title || "";
      const matchesSearch = title.toLowerCase().includes(searchTerm.toLowerCase());
      const expDate = new Date(exp.date).setHours(0, 0, 0, 0);
      const start = startDate ? new Date(startDate).setHours(0, 0, 0, 0) : null;
      const end = endDate ? new Date(endDate).setHours(0, 0, 0, 0) : null;
      return matchesSearch && (start ? expDate >= start : true) && (end ? expDate <= end : true);
    });
  }, [expenses, searchTerm, startDate, endDate]);

  const totalSpent = filteredExpenses.reduce((sum, exp) => sum + Number(exp.amount), 0);

  return (
    <div className="p-4 lg:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-5xl mx-auto">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Expenses</h2>
            <p className="text-sm font-medium text-slate-500">
              Outflow: <span className="font-bold text-rose-600">-{symbol}{totalSpent.toLocaleString()}</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowModal(true)} 
              className="bg-slate-900 text-white px-6 py-3 rounded-2xl flex items-center gap-2 hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 font-bold text-sm"
            >
              <Plus size={18} /> Record Expense
            </button>
            <button 
              onClick={() => exportToCSV(filteredExpenses, 'Expenses')}
              className="bg-white border border-slate-200 text-slate-700 px-6 py-3 rounded-2xl flex items-center gap-2 hover:bg-slate-50 transition-all font-bold text-sm"
            >
              Export CSV
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col md:flex-row gap-4 mb-6 bg-white p-4 rounded-4xl border border-slate-100 shadow-sm">
          <input 
            type="text" placeholder="Search expenses..." 
            className="flex-1 px-4 py-2 bg-slate-50 rounded-xl outline-none text-sm font-medium"
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div className="flex items-center gap-2">
            <input type="date" className="bg-slate-50 p-2 rounded-xl text-xs font-bold outline-none" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            <input type="date" className="bg-slate-50 p-2 rounded-xl text-xs font-bold outline-none" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </div>

        {/* Expense List */}
        <div className="grid gap-3">
          {loading ? (
             <div className="text-center py-20 animate-pulse text-slate-400 font-medium">Fetching ledger...</div>
          ) : filteredExpenses.map((exp) => (
            <div key={exp._id} className="bg-white p-5 rounded-3xl border border-slate-100 flex items-center justify-between hover:shadow-md transition-all group">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-50 text-slate-400 group-hover:bg-rose-50 group-hover:text-rose-500 rounded-2xl flex items-center justify-center transition-colors">
                  <Receipt size={22} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800">{exp.title}</h3>
                  <div className="flex gap-3 mt-1">
                    <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md font-black uppercase flex items-center gap-1">
                      <Tag size={10} /> {exp.category}
                    </span>
                    <span className="text-[10px] text-slate-400 flex items-center gap-1 font-bold">
                      <Calendar size={10} /> {new Date(exp.date).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <span className="font-black text-slate-900 text-lg">
                  -{symbol}{Number(exp.amount).toLocaleString()}
                </span>
                <div className="flex gap-1">
                  <button onClick={() => handleEditClick(exp)} className="p-2 text-slate-300 hover:text-blue-500 transition-colors"><Edit2 size={16}/></button>
                  <button onClick={() => handleDelete(exp._id)} className="p-2 text-slate-300 hover:text-rose-500 transition-colors"><Trash2 size={16}/></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CREATE/EDIT MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden border border-white">
            <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-xl font-black text-slate-900">
                {editingId ? 'Edit Record' : 'New Expense'}
              </h3>
              <button onClick={handleCloseModal} className="bg-white p-2 rounded-full shadow-sm text-slate-400 hover:text-slate-600"><X size={20}/></button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-5">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Title</label>
                <input 
                  type="text" placeholder="e.g. Office Stationery" required 
                  className="w-full p-4 rounded-2xl bg-slate-50 border-none outline-none focus:ring-2 focus:ring-rose-500/20 font-bold text-sm" 
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})} 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Amount</label>
                  <input 
                    type="number" placeholder="0.00" required 
                    className="w-full p-4 rounded-2xl bg-slate-50 border-none outline-none focus:ring-2 focus:ring-rose-500/20 font-bold text-sm" 
                    value={formData.amount}
                    onChange={(e) => setFormData({...formData, amount: e.target.value})} 
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Category</label>
                  <div className="relative">
                    <select 
                      className="w-full p-4 rounded-2xl bg-slate-50 border-none outline-none focus:ring-2 focus:ring-rose-500/20 font-bold text-sm appearance-none"
                      value={formData.category}
                      onChange={(e) => setFormData({...formData, category: e.target.value})}
                    >
                      {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                    <ChevronDown size={14} className="absolute right-4 top-5 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* CONDITIONAL "OTHER" INPUT */}
              {formData.category === 'Other' && (
                <div className="animate-in slide-in-from-top-2 duration-300">
                  <label className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-2 block ml-1">Specify Category Name</label>
                  <input 
                    type="text" placeholder="Enter custom category..." required 
                    className="w-full p-4 rounded-2xl bg-rose-50/30 border border-rose-100 outline-none focus:ring-2 focus:ring-rose-500/20 font-bold text-sm text-rose-700" 
                    value={otherCategory}
                    onChange={(e) => setOtherCategory(e.target.value)} 
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                 <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Currency</label>
                  <select 
                    className="w-full p-4 rounded-2xl bg-slate-50 border-none outline-none font-bold text-sm"
                    value={formData.currency}
                    onChange={(e) => setFormData({...formData, currency: e.target.value})}
                  >
                    <option value="USD">USD ($)</option>
                    <option value="INR">INR (₹)</option>
                    <option value="EUR">EUR (€)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Date</label>
                  <input 
                    type="date" required 
                    className="w-full p-4 rounded-2xl bg-slate-50 border-none outline-none font-bold text-sm" 
                    value={formData.expenseDate}
                    onChange={(e) => setFormData({...formData, expenseDate: e.target.value})} 
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button type="submit" className="flex-1 bg-slate-900 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-slate-200 hover:bg-rose-600 transition-all">
                  {editingId ? 'Update Record' : 'Confirm Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Expenses;