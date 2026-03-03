import React, { useState, useEffect, useMemo, useContext } from 'react';
import api from '../utils/api';
import { 
  Users, UserPlus, CalendarCheck, DollarSign, Trash2, Edit2, 
  X, Search, Filter, Loader2, Receipt, Landmark, Phone, Briefcase, MapPin, Fingerprint, RefreshCcw, CheckCircle2
} from 'lucide-react';
import { toast } from 'react-toastify';
import { CurrencyContext } from '../context/CurrencyContext';

const Employees = () => {
  const [employees, setEmployees] = useState([]);
  const [accounts, setAccounts] = useState([]); // New: For bank selection
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showPayrollModal, setShowPayrollModal] = useState(false); // New: For Payroll Review
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [selectedAccountId, setSelectedAccountId] = useState(''); // New: To track source bank

  const initialState = { 
    name: '', role: '', dailyRate: '', 
    email: '', phone: '', contactNumber: '', 
    homeAddress: '', 
    verificationIdType: 'National ID', 
    idNumber: '', 
    employmentType: 'Full-time',
    bankName: '', accountNumber: '' 
  };

  const [formData, setFormData] = useState(initialState);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const { symbol } = useContext(CurrencyContext);

  // Fetch Employees and Accounts
  const fetchData = async () => {
    try {
      setLoading(true);
      const [empRes, accRes] = await Promise.all([
        api.get('/employees'),
        api.get('/accounts')
      ]);
      setEmployees(empRes.data);
      setAccounts(accRes.data);
      if (accRes.data.length > 0) setSelectedAccountId(accRes.data[0]._id);
    } catch (err) {
      toast.error("Cloud sync failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // Calculate Total Payroll Amount
  const totalPayrollAmount = useMemo(() => {
    return employees.reduce((sum, emp) => sum + (Number(emp.workingDays) * Number(emp.dailyRate)), 0);
  }, [employees]);

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
        phone: formData.phone || formData.contactNumber, 
        contactNumber: formData.contactNumber,
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
      toast.error(err.response?.data?.message || "Operation failed");
    }
  };

  const handleCloseMonth = async () => {
    if (!selectedAccountId) {
      toast.error("Please select a payment source");
      return;
    }
    try {
      const res = await api.post('/employees/close-month', { accountId: selectedAccountId });
      toast.success(res.data.message);
      setShowPayrollModal(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Payroll reset failed");
    }
  };

  const handleMarkAttendance = async (id) => {
    try {
      await api.put(`/employees/${id}/attendance`);
      toast.success("Attendance Captured");
      fetchData(); 
    } catch (err) { 
      toast.error(err.response?.data?.message || "Attendance update failed"); 
    }
  };

  const openEditModal = (emp) => {
    setFormData({ 
      name: emp.name, 
      role: emp.role, 
      dailyRate: emp.dailyRate,
      email: emp.email || '',
      phone: emp.phone || '',
      contactNumber: emp.contactNumber || '',
      homeAddress: emp.homeAddress || '',
      verificationIdType: emp.verificationIdType || 'National ID',
      idNumber: emp.idNumber || '',
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
    setFormData(initialState);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this employee permanently?")) return;
    try {
      await api.delete(`/employees/${id}`);
      toast.success("Record Purged");
      fetchData();
    } catch (err) { toast.error("Delete failed"); }
  };

  const isAlreadyMarked = (lastDate) => {
    if (!lastDate) return false;
    const today = new Date().toDateString();
    const attendanceDate = new Date(lastDate).toDateString();
    return today === attendanceDate;
  };

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-slate-50">
      <Loader2 className="animate-spin text-blue-600" size={40}/>
    </div>
  );

  return (
    <div className="p-4 md:p-8 space-y-8 bg-slate-50 min-h-screen">
      {/* Header & Payroll Summary */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Staffing Hub</h1>
          <p className="text-slate-500 font-medium">Manage attendance, payroll, and verification</p>
        </div>
        
        {/* NEW: Interactive Payroll Card */}
        <div className="bg-emerald-50 p-4 rounded-3xl flex items-center gap-6 border border-emerald-100 shadow-sm">
           <div>
             <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Total Pending Payroll</p>
             <p className="text-2xl font-black text-slate-900">{symbol}{totalPayrollAmount.toLocaleString()}</p>
           </div>
           <button 
             onClick={() => setShowPayrollModal(true)}
             disabled={totalPayrollAmount === 0}
             className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-bold text-xs uppercase hover:bg-emerald-700 transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-emerald-100"
           >
             <RefreshCcw size={14} /> Review & Pay
           </button>
        </div>

        <button onClick={() => setShowModal(true)} className="bg-slate-900 text-white px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-blue-600 transition-all shadow-xl shadow-slate-200 active:scale-95 self-start md:self-center">
          <UserPlus size={16} /> Add Employee
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            className="w-full pl-12 pr-4 py-4 bg-white rounded-2xl border-none outline-none font-bold text-sm shadow-sm" 
            placeholder="Search personnel..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select 
          className="px-6 py-4 bg-white rounded-2xl border-none outline-none font-bold text-sm shadow-sm"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
        >
          {roles.map(role => <option key={role} value={role}>{role}</option>)}
        </select>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="text-[10px] uppercase font-black text-slate-400 bg-slate-50/50">
              <tr>
                <th className="px-8 py-5">Personnel</th>
                <th className="px-8 py-5">Worked</th>
                <th className="px-8 py-5 text-emerald-600">Pending Wage</th>
                <th className="px-8 py-5">Contact</th>
                <th className="px-8 py-5 text-right">Operations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredEmployees.map((emp) => (
                <tr key={emp._id} className="group hover:bg-slate-50/50 transition-colors">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 bg-slate-100 rounded-full flex items-center justify-center font-black text-slate-400">{emp.name.charAt(0)}</div>
                      <div>
                        <p className="font-black text-slate-800">{emp.name}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{emp.role}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5 font-bold text-slate-700">{emp.workingDays} Days</td>
                  <td className="px-8 py-5 font-black text-slate-900">{symbol}{(emp.workingDays * emp.dailyRate).toLocaleString()}</td>
                  <td className="px-8 py-5 text-sm font-bold text-slate-500">{emp.phone}</td>
                  <td className="px-8 py-5 flex justify-end gap-2">
                      <button 
                        onClick={() => handleMarkAttendance(emp._id)} 
                        disabled={isAlreadyMarked(emp.lastAttendanceDate)} 
                        title={isAlreadyMarked(emp.lastAttendanceDate) ? "Already marked today" : "Mark Attendance"}
                        className={`p-3 rounded-xl transition-all ${isAlreadyMarked(emp.lastAttendanceDate) ? 'bg-slate-50 text-slate-200' : 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100'}`}
                      >
                        <CalendarCheck size={18} />
                      </button>
                      <button onClick={() => openEditModal(emp)} className="p-3 text-slate-400 hover:bg-slate-900 hover:text-white rounded-xl transition-all"><Edit2 size={18} /></button>
                      <button onClick={() => handleDelete(emp._id)} className="p-3 text-rose-500 hover:bg-rose-50 rounded-xl transition-all"><Trash2 size={18} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* NEW: PAYROLL REVIEW MODAL */}
      {showPayrollModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-70 p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-md p-8 shadow-2xl animate-in zoom-in duration-200 border border-slate-100">
            <div className="flex justify-center mb-6">
              <div className="bg-emerald-100 p-4 rounded-full text-emerald-600">
                <Landmark size={32} />
              </div>
            </div>
            <h3 className="text-2xl font-black text-slate-900 text-center mb-2">Process Payroll</h3>
            <p className="text-sm text-slate-500 text-center mb-8">Confirm total payout of <span className="font-black text-slate-900">{symbol}{totalPayrollAmount.toLocaleString()}</span> to all staff.</p>
            
            <div className="space-y-4 mb-8">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Payment Source</label>
              <select 
                className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-emerald-200 outline-none font-bold text-sm transition-all"
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
              >
                {accounts.length === 0 ? <option>No accounts found</option> : accounts.map(acc => (
                  <option key={acc._id} value={acc._id}>
                    {acc.bankName} — Balance: {symbol}{acc.balance.toLocaleString()}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setShowPayrollModal(false)} className="flex-1 py-4 font-bold text-slate-400 hover:text-slate-600 transition-colors">Cancel</button>
              <button onClick={handleCloseMonth} className="flex-1 bg-slate-900 text-white py-4 rounded-2xl font-bold shadow-xl active:scale-95 transition-all">Confirm & Pay</button>
            </div>
          </div>
        </div>
      )}

      {/* EMPLOYEE ADD/EDIT MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-3xl shadow-2xl overflow-hidden animate-in zoom-in duration-200">
            <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">{isEditing ? 'Profile Management' : 'Global Onboarding'}</h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Enterprise HR Data</p>
              </div>
              <button onClick={closeModal} className="p-3 bg-white rounded-2xl text-slate-400 hover:text-slate-900 shadow-sm transition-all"><X size={20}/></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[75vh] overflow-y-auto no-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                  <input required className="w-full p-4 bg-slate-50 rounded-2xl border-none outline-none font-bold text-sm focus:ring-2 ring-blue-100 transition-all" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Work Email</label>
                  <input type="email" required className="w-full p-4 bg-slate-50 rounded-2xl border-none outline-none font-bold text-sm focus:ring-2 ring-blue-100 transition-all" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1"><Phone size={10}/> Primary Contact</label>
                  <input required className="w-full p-4 bg-slate-50 rounded-2xl border-none outline-none font-bold text-sm focus:ring-2 ring-blue-100 transition-all" placeholder="+1 234..." value={formData.contactNumber} onChange={e => setFormData({...formData, contactNumber: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1"><MapPin size={10}/> Home Address</label>
                  <input required className="w-full p-4 bg-slate-50 rounded-2xl border-none outline-none font-bold text-sm focus:ring-2 ring-blue-100 transition-all" placeholder="Street, City, Zip" value={formData.homeAddress} onChange={e => setFormData({...formData, homeAddress: e.target.value})} />
                </div>
              </div>

              <div className="p-6 bg-blue-50/50 rounded-4xl border border-blue-100 space-y-4">
                <div className="flex items-center gap-2 text-blue-600 mb-2">
                  <Fingerprint size={14}/>
                  <span className="text-[10px] font-black uppercase tracking-widest">Identity Verification</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <select 
                    className="w-full p-4 bg-white rounded-2xl border-none outline-none font-bold text-sm text-slate-600 appearance-none shadow-sm"
                    value={formData.verificationIdType} 
                    onChange={e => setFormData({...formData, verificationIdType: e.target.value})}
                  >
                    <option value="National ID">National ID</option>
                    <option value="Passport">Passport</option>
                    <option value="Driving License">Driving License</option>
                    <option value="Voter ID">Voter ID</option>
                    <option value="Other">Other</option>
                  </select>
                  <input required placeholder="ID Number (e.g. PASS1234)" className="w-full p-4 bg-white rounded-2xl border-none outline-none font-bold text-sm text-slate-800 shadow-sm" value={formData.idNumber} onChange={e => setFormData({...formData, idNumber: e.target.value})} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Designation</label>
                  <input required className="w-full p-4 bg-slate-50 rounded-2xl border-none outline-none font-bold text-sm focus:ring-2 ring-blue-100 transition-all" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 text-emerald-600">Daily Rate ({symbol})</label>
                  <input required type="number" className="w-full p-4 bg-emerald-50/30 rounded-2xl border-none outline-none font-bold text-sm text-emerald-700 focus:ring-2 ring-emerald-100 transition-all" value={formData.dailyRate} onChange={e => setFormData({...formData, dailyRate: e.target.value})} />
                </div>
              </div>

              <div className="p-6 bg-slate-900 rounded-4xl space-y-4 shadow-lg shadow-slate-200">
                <div className="flex items-center gap-2 text-slate-400 mb-2">
                  <Landmark size={14}/>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">Settlement (Bank Account)</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input placeholder="Bank Name" className="w-full p-4 bg-slate-800 rounded-2xl border-none outline-none font-bold text-sm text-white focus:ring-2 ring-slate-700 transition-all" value={formData.bankName} onChange={e => setFormData({...formData, bankName: e.target.value})} />
                  <input placeholder="Account Number" className="w-full p-4 bg-slate-800 rounded-2xl border-none outline-none font-bold text-sm text-white focus:ring-2 ring-slate-700 transition-all" value={formData.accountNumber} onChange={e => setFormData({...formData, accountNumber: e.target.value})} />
                </div>
              </div>

              <button type="submit" className="w-full bg-blue-600 text-white py-5 rounded-4xl font-black uppercase tracking-widest shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all active:scale-[0.98]">
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