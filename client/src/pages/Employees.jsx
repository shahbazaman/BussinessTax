import React, { useState, useEffect, useMemo } from 'react';
import api from '../utils/api';
import { Users, UserPlus, CalendarCheck, DollarSign, Trash2, Edit2, X, Search, Filter, Loader2, Receipt } from 'lucide-react';
import { toast } from 'react-toastify';
import { exportToCSV } from '../utils/exportCSV';
import { useContext } from 'react';
import { CurrencyContext } from '../context/CurrencyContext';
const Employees = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false); 
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [formData, setFormData] = useState({ name: '', role: '', dailyRate: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const { symbol } = useContext(CurrencyContext);
  const fetchData = async () => {
    try {
      setLoading(true);
      const empRes = await api.get('/employees');
      setEmployees(empRes.data);
    } catch (err) {
      toast.error("Sync failed");
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
      const payload = { ...formData, dailyRate: Number(formData.dailyRate) };
      
      if (isEditing) {
        await api.put(`/employees/${currentId}`, payload);
        toast.success("Employee updated!");
      } else {
        await api.post('/employees', payload);
        toast.success("Employee onboarded!");
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
    setFormData({ name: emp.name, role: emp.role, dailyRate: emp.dailyRate });
    setCurrentId(emp._id);
    setIsEditing(true);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setIsEditing(false);
    setFormData({ name: '', role: '', dailyRate: '' });
  };

  const handleMarkAttendance = async (id) => {
    try {
      await api.put(`/employees/${id}/attendance`);
      toast.success("Attendance marked");
      fetchData(); 
    } catch (err) { toast.error("Update failed"); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Remove this employee?")) return;
    try {
      await api.delete(`/employees/${id}`);
      toast.success("Employee removed");
      fetchData();
    } catch (err) { toast.error("Delete failed"); }
  };

  const handleCloseMonth = async () => {
    if (!window.confirm("This will reset all working days and record payroll in accounts. Proceed?")) return;
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

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-blue-600" size={40}/></div>;

  return (
    <div className="p-4 md:p-6 space-y-6 bg-slate-50 min-h-screen">
      
      {/* Action Buttons & Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Staff</p>
          <div className="flex items-center gap-3">
            <Users className="text-blue-500" size={20} />
            <p className="text-2xl font-black text-slate-800">{employees.length}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Payroll</p>
          <div className="flex items-center gap-3">
            <DollarSign className="text-rose-500" size={20} />
            <p className="text-xl font-black text-slate-800">{ symbol }{totalPayroll.toLocaleString()}</p>
          </div>
        </div>

        <button 
          onClick={handleCloseMonth} 
          disabled={processing}
          className="bg-white text-rose-600 border border-rose-100 py-4 rounded-3xl font-bold flex items-center justify-center gap-2 hover:bg-rose-50 transition-all shadow-sm disabled:opacity-50"
        >
          {processing ? <Loader2 className="animate-spin" size={18} /> : <CalendarCheck size={18} />} Close Month
        </button>

        <button 
          onClick={() => setShowModal(true)} 
          className="bg-slate-900 text-white py-4 rounded-3xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-all shadow-lg"
        >
          <UserPlus size={18} /> Add Employee
        </button>

        <button   
          onClick={() => exportToCSV(filteredEmployees, 'Employees')} 
          className="bg-emerald-600 text-white py-4 rounded-3xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all shadow-lg"
        >
          <Receipt size={18} /> Export CSV
        </button>
      </div>

      {/* Search & Filters Container */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center bg-white p-4 rounded-3xl shadow-sm border border-slate-100">
        <div className="relative md:col-span-3">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" placeholder="Search name or role..." 
            className="w-full pl-12 pr-4 py-3 bg-slate-50 rounded-2xl border-none outline-none font-bold text-sm"
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 bg-slate-50 px-4 py-1 rounded-2xl">
          <Filter className="text-slate-400 shrink-0" size={16} />
          <select 
            className="w-full bg-transparent py-2 border-none outline-none font-bold text-slate-600 text-sm appearance-none"
            value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}
          >
            {roles.map(role => <option key={role} value={role}>{role}</option>)}
          </select>
        </div>
      </div>

      {/* Responsive Table Wrapper */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left border-collapse min-w-200">
            <thead className="bg-slate-50/80 sticky top-0 backdrop-blur-md z-10">
              <tr className="text-[10px] uppercase font-black text-slate-400">
                <th className="px-8 py-5">Employee</th>
                <th className="px-8 py-5">Role</th>
                <th className="px-8 py-5">Daily Rate</th>
                <th className="px-8 py-5">Attendance</th>
                <th className="px-8 py-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredEmployees.map((emp) => (
                <tr key={emp._id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-8 py-5 font-bold text-slate-700 whitespace-nowrap">{emp.name}</td>
                  <td className="px-8 py-5">
                    <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-2 py-1 rounded-md uppercase">
                      {emp.role}
                    </span>
                  </td>
                  <td className="px-8 py-5 font-mono text-sm font-bold text-slate-600">{ symbol }{Number(emp.dailyRate).toLocaleString()}</td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3">
                      <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-lg text-xs font-black">{emp.workingDays} Days</span>
                      <span className="font-black text-slate-800">{ symbol }{(Number(emp.dailyRate) * emp.workingDays).toLocaleString()}</span>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                     <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => handleMarkAttendance(emp._id)} 
                        disabled={isAlreadyMarked(emp.lastAttendanceDate)} 
                        className={`p-2.5 rounded-xl transition-all ${isAlreadyMarked(emp.lastAttendanceDate) ? 'bg-slate-50 text-slate-300' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white'}`}
                      >
                        <CalendarCheck size={18} />
                      </button>
                      <button onClick={() => openEditModal(emp)} className="p-2.5 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-500 hover:text-white transition-all">
                        <Edit2 size={18} />
                      </button>
                      <button onClick={() => handleDelete(emp._id)} className="p-2.5 text-slate-300 hover:text-rose-500 transition-colors">
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

      {/* --- ADD/EDIT MODAL --- */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="p-6 md:p-8 border-b border-slate-50 flex justify-between items-center">
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">{isEditing ? 'Edit Profile' : 'New Hire'}</h3>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 p-2"><X /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-4">
              <input required type="text" placeholder="Full Name" className="w-full p-4 bg-slate-50 border-none rounded-2xl outline-none font-bold text-sm" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              <input required type="text" placeholder="Role (e.g. Sales)" className="w-full p-4 bg-slate-50 border-none rounded-2xl outline-none font-bold text-sm" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} />
              <input required type="number" placeholder={`Daily Rate (${symbol})`} className="w-full p-4 bg-slate-50 border-none rounded-2xl outline-none font-bold text-sm" value={formData.dailyRate} onChange={e => setFormData({...formData, dailyRate: e.target.value})} />
              <button type="submit" className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black shadow-lg hover:bg-blue-600 transition-all mt-4">
                {isEditing ? 'Save Changes' : 'Onboard Employee'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Employees;