import React, { useState, useEffect, useMemo } from 'react';
import api from '../utils/api';
import { Plus, Receipt, Trash2, Tag, X, Calendar, DollarSign } from 'lucide-react';
import { exportToCSV } from '../utils/exportCSV';
const Expenses = () => {
  const [expenses, setExpenses] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({ 
    title: '', 
    amount: '', 
    category: 'Software', 
    expenseDate: new Date().toISOString().split('T')[0],
    receiptUrl: '' 
  });
  const [searchTerm, setSearchTerm] = useState('');
const [startDate, setStartDate] = useState('');
const [endDate, setEndDate] = useState('');
  const fetchExpenses = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/expenses');
      setExpenses(res.data);
    } catch (err) { 
      console.error("Error fetching expenses:", err);
      setError("Failed to load expenses. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchExpenses();
  }, []);
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.amount) return alert("Please fill in title and amount");
    setLoading(true);
    try {
      const cleanedData = {
        ...formData,
        amount: Number(formData.amount),
        expenseDate: formData.expenseDate || new Date().toISOString().split('T')[0]
      };
      await api.post('/expenses', cleanedData);
      handleCloseModal(); 
      fetchExpenses();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to save");
    } finally {
      setLoading(false);
    }
  };
  const handleDelete = async (id) => {
    if (window.confirm("Delete this expense record?")) {
      try {
        await api.delete(`/expenses/${id}`);
        fetchExpenses();
      } catch (err) {
        alert("Failed to delete expense");
      }
    }
  };
  const handleCloseModal = () => {
    setShowModal(false);
    setFormData({ 
      title: '', 
      amount: '', 
      category: 'Software', 
      expenseDate: new Date().toISOString().split('T')[0],
      receiptUrl: '' 
    });
  };
  const filteredExpenses = useMemo(() => {
  return expenses.filter(exp => {
    const title = exp.title || "";
    const matchesSearch = title.toLowerCase().includes(searchTerm.toLowerCase());
    const expDate = new Date(exp.expenseDate || exp.createdAt).setHours(0, 0, 0, 0);
    const start = startDate ? new Date(startDate).setHours(0, 0, 0, 0) : null;
    const end = endDate ? new Date(endDate).setHours(0, 0, 0, 0) : null;
    return matchesSearch && (start ? expDate >= start : true) && (end ? expDate <= end : true);
  });
}, [expenses, searchTerm, startDate, endDate]);
const totalSpent = filteredExpenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
  return (
    <div className="p-4 lg:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
  <div>
    <h2 className="text-2xl font-bold text-slate-800">Business Expenses</h2>
    <p className="text-sm text-slate-500">Total spent this period: 
      <span className="font-bold text-red-600 ml-1">-${totalSpent.toLocaleString()}</span>
    </p>
  </div>
  <div className="flex items-center gap-3">
    <button 
      onClick={() => setShowModal(true)} 
      className="bg-slate-900 text-white px-6 py-2.5 rounded-xl flex items-center justify-center gap-2 hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 font-bold text-sm"
    >
      <Plus size={18} /> Record Expense
    </button>
    <button 
      onClick={() => exportToCSV(filteredExpenses, 'Expenses')}
      className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-200 transition-all font-bold text-sm"
    >
      Export CSV
    </button>
  </div>
</div>
<div className="flex flex-col md:flex-row gap-4 mb-6 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
  <input 
    type="text" placeholder="Search..." 
    className="flex-1 px-4 py-2 bg-slate-50 rounded-xl outline-none text-sm"
    value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
  />
  <div className="flex items-center gap-2">
    <input type="date" className="bg-slate-50 p-2 rounded-xl text-xs font-bold" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
    <input type="date" className="bg-slate-50 p-2 rounded-xl text-xs font-bold" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
    {(startDate || endDate || searchTerm) && (
      <button onClick={() => {setStartDate(''); setEndDate(''); setSearchTerm('');}} className="p-2 text-red-500"><X size={18} /></button>
    )}
  </div>
</div>
        <div className="grid gap-3">
          {loading ? (
            <div className="text-center py-20 text-slate-400">
               <div className="animate-spin w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full mx-auto mb-2"></div>
               Loading expenses...
            </div>
          ) : error ? (
            <div className="text-center py-20 text-red-500 bg-red-50 rounded-3xl border border-red-100">
              <p>{error}</p>
              <button onClick={fetchExpenses} className="mt-4 text-sm font-bold underline">Try Again</button>
            </div>
          ) : expenses.length > 0 ? (
            filteredExpenses.map((exp) => (
              <div key={exp._id} className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center justify-between hover:border-red-100 transition-all group">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-50 text-slate-400 group-hover:bg-red-50 group-hover:text-red-500 rounded-2xl flex items-center justify-center transition-colors">
                    <Receipt size={22} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 group-hover:text-red-600 transition-colors">{exp.title}</h3>
                    <div className="flex flex-wrap gap-2 mt-1">
                      <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md font-bold uppercase flex items-center gap-1">
                        <Tag size={10} /> {exp.category}
                      </span>
                      <span className="text-[10px] text-slate-400 flex items-center gap-1 font-medium">
                        <Calendar size={10} /> {new Date(exp.expenseDate).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4 md:gap-8">
                  <span className="font-black text-slate-900 md:text-xl">
                    -${Number(exp.amount).toLocaleString()}
                  </span>
                  <button 
                    onClick={() => handleDelete(exp._id)}
                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                  >
                    <Trash2 size={18}/>
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center">
              <Receipt size={48} className="mx-auto text-slate-200 mb-4" />
              <p className="text-slate-500 font-medium">No expenses recorded yet.</p>
            </div>
          )}
        </div>
      </div>
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200 overflow-hidden">
            <div className="p-6 border-b border-slate-50 flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-800">New Expense</h3>
              <button onClick={handleCloseModal} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Expense Title</label>
                <input 
                  type="text" placeholder="e.g. AWS Cloud Services" required 
                  className="w-full p-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-red-500 bg-slate-50 text-sm" 
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})} 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Amount ($)</label>
                  <input 
                    type="number" placeholder="0.00" required 
                    className="w-full p-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-red-500 bg-slate-50 text-sm" 
                    value={formData.amount}
                    onChange={(e) => setFormData({...formData, amount: e.target.value})} 
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Category</label>
                  <select 
                    className="w-full p-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-red-500 bg-slate-50 text-sm"
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                  >
                    <option value="Software">Software</option>
                    <option value="Rent">Rent</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Travel">Travel</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Date</label>
                <input 
                  type="date" required 
                  className="w-full p-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-red-500 bg-slate-50 text-sm" 
                  value={formData.expenseDate}
                  onChange={(e) => setFormData({...formData, expenseDate: e.target.value})} 
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Receipt URL (Optional)</label>
                <input 
                  type="text" placeholder="https://..." 
                  className="w-full p-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-red-500 bg-slate-50 text-sm" 
                  value={formData.receiptUrl}
                  onChange={(e) => setFormData({...formData, receiptUrl: e.target.value})} 
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={handleCloseModal} className="flex-1 py-3 text-slate-500 font-bold text-sm">Cancel</button>
                <button type="submit" className="flex-1 bg-red-500 text-white py-3 rounded-xl font-bold text-sm shadow-lg shadow-red-100 hover:bg-red-600 transition-all">
                  Save Expense
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