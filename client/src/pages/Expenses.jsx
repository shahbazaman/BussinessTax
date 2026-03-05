import React, { useState, useEffect, useMemo, useContext } from 'react';
import api from '../utils/api';
import { 
  Plus, Receipt, Trash2, Tag, X, Calendar, Edit2, 
  ChevronDown, CreditCard, FileText, Link as LinkIcon 
} from 'lucide-react';
import { exportToCSV } from '../utils/exportCSV';
import { CurrencyContext } from '../context/CurrencyContext';
import { toast } from 'react-toastify';

const Expenses = () => {
  const [expenses, setExpenses] = useState([]);
  const [accounts, setAccounts] = useState([]); // To link expenses to bank accounts
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null); 
  const { symbol } = useContext(CurrencyContext);

  const categories = ['Software', 'Rent', 'Marketing', 'Travel', 'Salaries', 'Utilities', 'Other'];
  const paymentMethods = ['Bank Transfer', 'Cash', 'Credit Card', 'Debit Card', 'Check', 'Other'];

  const [formData, setFormData] = useState({ 
    title: '', 
    amount: '', 
    category: 'Software', 
    currency: 'USD',
    expenseDate: new Date().toISOString().split('T')[0],
    receiptUrl: '',
    paymentMethod: 'Bank Transfer',
    paidFromAccount: '', 
    notes: ''
  });

  const [otherCategory, setOtherCategory] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [expRes, accRes] = await Promise.all([
        api.get('/expenses'),
        api.get('/accounts')
      ]);
      setExpenses(expRes.data);
      setAccounts(accRes.data);
    } catch (err) { 
      toast.error("Failed to load data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleEditClick = (exp) => {
    setEditingId(exp._id);
    const isStandardCategory = categories.includes(exp.category);
    
    setFormData({
      title: exp.title,
      amount: exp.amount,
      category: isStandardCategory ? exp.category : 'Other',
      currency: exp.currency || 'USD',
      expenseDate: new Date(exp.date).toISOString().split('T')[0],
      receiptUrl: exp.receiptUrl || '',
      paymentMethod: exp.paymentMethod || 'Bank Transfer',
      paidFromAccount: exp.paidFromAccount?._id || exp.paidFromAccount || '',
      notes: exp.notes || ''
    });

    if (!isStandardCategory) setOtherCategory(exp.category);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const finalCategory = formData.category === 'Other' ? otherCategory : formData.category;
    
    if (formData.category === 'Other' && !otherCategory.trim()) {
        return toast.error("Please specify the category name");
    }

    try {
      const payload = {
        ...formData,
        amount: Number(formData.amount),
        category: finalCategory,
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
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save");
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingId(null);
    setOtherCategory('');
    setFormData({ 
      title: '', amount: '', category: 'Software', currency: 'USD',
      expenseDate: new Date().toISOString().split('T')[0], receiptUrl: '',
      paymentMethod: 'Bank Transfer', paidFromAccount: '', notes: ''
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
        <div className="flex flex-col md:flex-row gap-4 mb-6 bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
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
                  <div className="flex flex-wrap gap-3 mt-1">
                    <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md font-black uppercase flex items-center gap-1">
                      <Tag size={10} /> {exp.category}
                    </span>
                    <span className="text-[10px] text-slate-400 flex items-center gap-1 font-bold">
                      <Calendar size={10} /> {new Date(exp.date).toLocaleDateString()}
                    </span>
                    {exp.paidFromAccount && (
                      <span className="text-[10px] text-blue-500 flex items-center gap-1 font-bold">
                        <CreditCard size={10} /> {exp.paidFromAccount.bankName || 'Account'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <span className="font-black text-slate-900 text-lg">
                    -{symbol}{Number(exp.amount).toLocaleString()}
                  </span>
                  {exp.receiptUrl && (
                    <a href={exp.receiptUrl} target="_blank" rel="noreferrer" className="text-[10px] text-indigo-500 hover:underline flex items-center justify-end gap-1">
                      <LinkIcon size={10}/> View Receipt
                    </a>
                  )}
                </div>
                <div className="flex gap-1">
                  <button onClick={() => handleEditClick(exp)} className="p-2 text-slate-300 hover:text-blue-500 transition-colors"><Edit2 size={16}/></button>
                  <button onClick={() => api.delete(`/expenses/${exp._id}`).then(fetchData)} className="p-2 text-slate-300 hover:text-rose-500 transition-colors"><Trash2 size={16}/></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CREATE/EDIT MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl my-auto border border-white">
            <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-xl font-black text-slate-900">
                {editingId ? 'Edit Record' : 'New Expense'}
              </h3>
              <button onClick={handleCloseModal} className="bg-white p-2 rounded-full shadow-sm text-slate-400 hover:text-slate-600"><X size={20}/></button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Title</label>
                  <input 
                    type="text" placeholder="e.g. Office Stationery" required 
                    className="w-full p-4 rounded-2xl bg-slate-50 border-none outline-none focus:ring-2 focus:ring-rose-500/20 font-bold text-sm" 
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})} 
                  />
                </div>

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

              {formData.category === 'Other' && (
                <input 
                  type="text" placeholder="Specify category name..." required 
                  className="w-full p-4 rounded-2xl bg-rose-50/30 border border-rose-100 outline-none font-bold text-sm text-rose-700" 
                  value={otherCategory}
                  onChange={(e) => setOtherCategory(e.target.value)} 
                />
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Paid From</label>
                  <select 
                    className="w-full p-4 rounded-2xl bg-slate-50 border-none outline-none font-bold text-sm"
                    value={formData.paidFromAccount}
                    onChange={(e) => setFormData({...formData, paidFromAccount: e.target.value})}
                  >
                    <option value="">Select Account</option>
                    {accounts.map(acc => (
                      <option key={acc._id} value={acc._id}>{acc.bankName} ({symbol}{acc.balance})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Payment Method</label>
                  <select 
                    className="w-full p-4 rounded-2xl bg-slate-50 border-none outline-none font-bold text-sm"
                    value={formData.paymentMethod}
                    onChange={(e) => setFormData({...formData, paymentMethod: e.target.value})}
                  >
                    {paymentMethods.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Date</label>
                  <input 
                    type="date" required 
                    className="w-full p-4 rounded-2xl bg-slate-50 border-none outline-none font-bold text-sm" 
                    value={formData.expenseDate}
                    onChange={(e) => setFormData({...formData, expenseDate: e.target.value})} 
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Receipt Link</label>
                  <input 
                    type="text" placeholder="https://..." 
                    className="w-full p-4 rounded-2xl bg-slate-50 border-none outline-none font-bold text-sm" 
                    value={formData.receiptUrl}
                    onChange={(e) => setFormData({...formData, receiptUrl: e.target.value})} 
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Notes</label>
                <textarea 
                  rows="2"
                  placeholder="Additional details..."
                  className="w-full p-4 rounded-2xl bg-slate-50 border-none outline-none font-bold text-sm resize-none" 
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                ></textarea>
              </div>

              <button type="submit" className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-slate-200 hover:bg-rose-600 transition-all">
                {editingId ? 'Update Record' : 'Confirm Expense'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Expenses;