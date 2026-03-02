import React, { useState, useEffect, useMemo, useContext } from 'react';
import api from '../utils/api';
import { 
  Users, UserPlus, CalendarCheck, DollarSign, Trash2, Edit2, 
  X, Search, Filter, Loader2, Receipt, Landmark, Phone, Briefcase 
} from 'lucide-react';
import { toast } from 'react-toastify';
import { exportToCSV } from '../utils/exportCSV';
import { CurrencyContext } from '../context/CurrencyContext';

const Employees = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false); 
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  
  // Enhanced state to match your Enterprise Schema
  const [formData, setFormData] = useState({ 
    name: '', role: '', dailyRate: '', 
    email: '', phone: '', employmentType: 'Full-time',
    bankName: '', accountNumber: '' 
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const { symbol } = useContext(CurrencyContext);

  const fetchData = async () => {
    try {
      setLoading(true);
      const empRes = await api.get('/employees');
      setEmployees(empRes.data);
    } catch (err) {
      toast.error("Cloud sync failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      const matchesSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            emp.role.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = roleFilter === 'All' || emp.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [employees, searchTerm, roleFilter]);

  const roles = ['All', ...new Set(employees.map(e => e.role))];

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { 
        ...formData, 
        dailyRate: Number(formData.dailyRate),
        bankDetails: {
          bankName: formData.bankName,
          accountNumber: formData.accountNumber
        }
      };
      
      if (isEditing) {
        await api.put(`/employees/${currentId}`, payload);
        toast.success("Profile Synchronized");
      } else {
        await api.post('/employees', payload);
        toast.success("New Member Onboarded");
      }
      closeModal();
      fetchData();
    } catch (err) {
      toast.error("Operation failed");
    }
  };

  const isAlreadyMarked = (lastDate) => {
    if (!lastDate) return false;
    const today = new Date().toDateString();
    const attendanceDate = new Date(lastDate).toDateString();
    return today === attendanceDate;
  };

  const openEditModal = (emp) => {
    setFormData({ 
      name: emp.name, 
      role: emp.role, 
      dailyRate: emp.dailyRate,
      email: emp.email || '',
      phone: emp.phone || '',
      employmentType: emp.employmentType || 'Full-time',
      bankName: emp.bankDetails?.bankName || '',
      accountNumber: emp.bankDetails?.accountNumber || ''
    });
    setCurrentId(emp._id);
    setIsEditing(true);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setIsEditing(false);
    setFormData({ name: '', role: '', dailyRate: '', email: '', phone: '', employmentType: 'Full-time', bankName: '', accountNumber: '' });
  };

  const handleMarkAttendance = async (id) => {
    try {
      await api.put(`/employees/${id}/attendance`);
      toast.success("Attendance Captured");
      fetchData(); 
    } catch (err) { toast.error("Attendance update failed"); }
  };

  const handleCloseMonth = async () => {
    if (!window.confirm("This will reset working days and record the payout as a Business Expense. Proceed?")) return;
    try {
      setProcessing(true);
      const { data } = await api.post('/employees/close-month'); 
      toast.success(data.message);
      fetchData(); 
    } catch (err) {
      toast.error(err.response?.data?.message || "Error closing month");
    } finally {
      setProcessing(false);
    }
  };

  const totalPayroll = employees.reduce((acc, emp) => acc + (Number(emp.dailyRate) * Number(emp.workingDays)), 0);

  if (loading) return <div className="flex h-screen items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-blue-600" size={40}/></div>;

  return (
    <div className="p-4 md:p-8 space-y-8 bg-slate-50 min-h-screen">
      
      {/* Header & Global Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Staffing Hub</h1>
          <p className="text-slate-500 font-medium">Manage attendance, payroll, and banking details</p>
        </div>
        <div className="flex flex-wrap gap-3">
            <button 
              onClick={handleCloseMonth} 
              disabled={processing}
              className="bg-rose-50 text-rose-600 border border-rose-100 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-rose-600 hover:text-white transition-all disabled:opacity-50"
            >
              {processing ? <Loader2 className="animate-spin" size={16} /> : <CalendarCheck size={16} />} Close Month
            </button>
            <button 
              onClick={() => setShowModal(true)} 
              className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-blue-600 transition-all shadow-xl shadow-slate-200"
            >
              <UserPlus size={16} /> Add Employee
            </button>
        </div>
      </div>

      {/* Stats Dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-4xl border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Active Workforce</p>
          <div className="flex items-center justify-between">
            <p className="text-3xl font-black text-slate-800">{employees.length}</p>
            <div className="p-3 bg-blue-50 rounded-2xl text-blue-600"><Users size={24}/></div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-4xl border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Monthly Accrual</p>
          <div className="flex items-center justify-between">
            <p className="text-3xl font-black text-slate-800">{symbol}{totalPayroll.toLocaleString()}</p>
            <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600"><DollarSign size={24}/></div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-4xl border border-slate-100 shadow-sm flex items-center justify-center">
            <button 
              onClick={() => exportToCSV(filteredEmployees, 'Employees')}
              className="w-full h-full border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 font-bold hover:border-emerald-500 hover:text-emerald-500 transition-all flex items-center justify-center gap-2"
            >
                <Receipt size={18}/> Export Ledger
            </button>
        </div>
      </div>

      {/* Table & Filtering */}
      <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-50 flex flex-col md:flex-row gap-4">
           <div className="relative flex-1">
             <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
             <input 
               type="text" placeholder="Search by name, role or email..." 
               className="w-full pl-12 pr-4 py-4 bg-slate-50 rounded-2xl border-none outline-none font-bold text-sm"
               value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
             />
           </div>
           <select 
             className="bg-slate-50 px-6 py-4 rounded-2xl border-none outline-none font-bold text-slate-600 text-sm appearance-none"
             value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}
           >
             {roles.map(role => <option key={role} value={role}>{role}</option>)}
           </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] uppercase font-black text-slate-400 bg-slate-50/50">
                <th className="px-8 py-5">Personnel</th>
                <th className="px-8 py-5">Daily Rate</th>
                <th className="px-8 py-5">Current Session</th>
                <th className="px-8 py-5 text-right">Operations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredEmployees.map((emp) => (
                <tr key={emp._id} className="group hover:bg-slate-50/50 transition-colors">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 bg-slate-100 rounded-full flex items-center justify-center font-black text-slate-400">
                        {emp.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-black text-slate-800">{emp.name}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{emp.role}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5 font-mono font-bold text-slate-600">{symbol}{emp.dailyRate}</td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      <div className="px-3 py-1 bg-blue-50 rounded-lg text-blue-600 text-xs font-black">
                        {emp.workingDays} Units
                      </div>
                      <p className="font-black text-slate-900">{symbol}{(emp.dailyRate * emp.workingDays).toLocaleString()}</p>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => handleMarkAttendance(emp._id)} 
                        disabled={isAlreadyMarked(emp.lastAttendanceDate)} 
                        title="Mark Attendance"
                        className={`p-3 rounded-xl transition-all ${isAlreadyMarked(emp.lastAttendanceDate) ? 'bg-slate-50 text-slate-200 cursor-not-allowed' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white'}`}
                      >
                        <CalendarCheck size={18} />
                      </button>
                      <button onClick={() => openEditModal(emp)} className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:bg-slate-900 hover:text-white transition-all">
                        <Edit2 size={18} />
                      </button>
                      <button onClick={() => handleDelete(emp._id)} className="p-3 text-slate-200 hover:text-rose-500 transition-colors">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Employee Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-[100 p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in duration-200">
            <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">{isEditing ? 'Profile Management' : 'Global Onboarding'}</h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">HR Data Collection</p>
              </div>
              <button onClick={closeModal} className="p-3 bg-white rounded-2xl text-slate-400 hover:text-slate-900 transition-all shadow-sm"><X size={20}/></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto no-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                  <input required className="w-full p-4 bg-slate-50 rounded-2xl border-none outline-none font-bold text-sm" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                  <input type="email" required className="w-full p-4 bg-slate-50 rounded-2xl border-none outline-none font-bold text-sm" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Designation</label>
                  <div className="relative">
                    <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16}/>
                    <input required className="w-full pl-12 p-4 bg-slate-50 rounded-2xl border-none outline-none font-bold text-sm" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Daily Payout</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 font-black">{symbol}</span>
                    <input required type="number" className="w-full pl-12 p-4 bg-slate-50 rounded-2xl border-none outline-none font-bold text-sm" value={formData.dailyRate} onChange={e => setFormData({...formData, dailyRate: e.target.value})} />
                  </div>
                </div>
              </div>

              <div className="p-6 bg-slate-900 rounded-4xl space-y-4">
                <div className="flex items-center gap-2 text-slate-400 mb-2">
                  <Landmark size={14}/>
                  <span className="text-[10px] font-black uppercase tracking-widest">Bank Settlement Details</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input placeholder="Bank Name" className="w-full p-4 bg-slate-800 rounded-2xl border-none outline-none font-bold text-sm text-white" value={formData.bankName} onChange={e => setFormData({...formData, bankName: e.target.value})} />
                  <input placeholder="Account Number" className="w-full p-4 bg-slate-800 rounded-2xl border-none outline-none font-bold text-sm text-white" value={formData.accountNumber} onChange={e => setFormData({...formData, accountNumber: e.target.value})} />
                </div>
              </div>

              <button type="submit" className="w-full bg-blue-600 text-white py-5 rounded-4xl font-black uppercase tracking-widest shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all">
                {isEditing ? 'Sync Profile Changes' : 'Finalize Onboarding'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Employees;