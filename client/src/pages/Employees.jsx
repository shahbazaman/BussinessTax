import React, { useState, useEffect, useMemo } from 'react';
import api from '../utils/api';
import { Users, UserPlus, CalendarCheck, DollarSign, Trash2, Edit2, X, Search, Filter, Loader2, TrendingUp, Receipt } from 'lucide-react';
import { toast } from 'react-toastify';
import { exportToCSV } from '../utils/exportCSV';
const Employees = () => {
  const [employees, setEmployees] = useState([]);
  const [revenue, setRevenue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [formData, setFormData] = useState({ name: '', role: '', dailyRate: '' });

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [empRes, invRes] = await Promise.all([api.get('/employees'), api.get('/invoices')]);
      setEmployees(empRes.data);
      const currentMonth = new Date().getMonth();
      const monthlyRev = invRes.data
        .filter(inv => new Date(inv.createdAt).getMonth() === currentMonth)
        .reduce((sum, inv) => sum + (inv.amount || 0), 0);
      setRevenue(monthlyRev);
    } catch (err) {
      toast.error("Sync failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // Filter Logic
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
      if (isEditing) {
        await api.put(`/employees/${currentId}`, formData);
        toast.success("Employee updated!");
      } else {
        await api.post('/employees', formData);
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
  if (!window.confirm("Reset all working days to zero?")) return;
  try {
    const { data } = await api.post('/employees/close-month'); 
    toast.success(data.message);
    fetchData(); 
  } catch (err) {
    toast.error(err.response?.data?.message || "Error closing month");
  }
};

  const totalPayroll = employees.reduce((acc, emp) => acc + (emp.dailyRate * emp.workingDays), 0);

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-blue-600" size={40}/></div>;

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      {/* Stats Header */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
  {/* Stat 1: Total Staff */}
  <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Staff</p>
    <div className="flex items-center gap-3">
      <Users className="text-blue-500" size={20} />
      <p className="text-2xl font-black text-slate-800">{employees.length}</p>
    </div>
  </div>

  {/* Stat 2: Payroll */}
  <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Payroll</p>
    <div className="flex items-center gap-3">
      <DollarSign className="text-rose-500" size={20} />
      <p className="text-2xl font-black text-slate-800">${totalPayroll.toLocaleString()}</p>
    </div>
  </div>

  {/* Button 1: Close Month */}
  <button 
    onClick={handleCloseMonth} 
    className="bg-white text-rose-600 border border-rose-100 px-6 py-3 rounded-3xl font-bold flex items-center justify-center gap-2 hover:bg-rose-50 transition-all shadow-sm"
  >
    <CalendarCheck size={20} /> Close Month
  </button>

  {/* Button 2: Add Employee */}
  <button 
    onClick={() => setShowModal(true)} 
    className="bg-slate-900 text-white rounded-3xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
  >
    <UserPlus size={20} /> Add Employee
  </button>

  {/* Button 3: Export CSV */}
  <button  
    onClick={() => exportToCSV(filteredEmployees, 'Employees')} 
    className="bg-emerald-600 text-white rounded-3xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200"
  >
    <Receipt size={20} /> Export CSV
  </button>
</div>

      {/* Search & Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" placeholder="Search by name or role..." 
            className="w-full pl-12 pr-4 py-3 bg-slate-50 rounded-xl border-none outline-none font-medium"
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="text-slate-400" size={18} />
          <select 
            className="bg-slate-50 px-4 py-3 rounded-xl border-none outline-none font-bold text-slate-600"
            value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}
          >
            {roles.map(role => <option key={role} value={role}>{role}</option>)}
          </select>
        </div>
      </div>

      {/* Scrollable Table Section */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="max-h-125 overflow-y-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
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
                  <td className="px-8 py-5 font-bold text-slate-700">{emp.name}</td>
                  <td className="px-8 py-5 text-xs font-bold text-slate-400 uppercase">{emp.role}</td>
                  <td className="px-8 py-5 font-mono text-sm">${emp.dailyRate}</td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3">
                      <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-lg text-xs font-black">{emp.workingDays} Days</span>
                      <span className="font-black text-slate-800">${(emp.dailyRate * emp.workingDays).toLocaleString()}</span>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                     <div className="flex justify-end gap-2">
                      <button onClick={() => handleMarkAttendance(emp._id)} disabled={isAlreadyMarked(emp.lastAttendanceDate)} className={`p-2 rounded-xl transition-all ${isAlreadyMarked(emp.lastAttendanceDate) ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white'}`} title={isAlreadyMarked(emp.lastAttendanceDate) ? "Already marked today" : "Mark Attendance"}><CalendarCheck size={18} /></button>
                      <button onClick={() => openEditModal(emp)} className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-500 hover:text-white transition-all"><Edit2 size={18} /></button>
                      <button onClick={() => handleDelete(emp._id)} className="p-2 text-slate-200 hover:text-rose-500 transition-colors"><Trash2 size={18} /></button>
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
          <div className="bg-white rounded-[3rem] w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="p-8 border-b border-slate-50 flex justify-between items-center">
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">{isEditing ? 'Edit Profile' : 'New Hire'}</h3>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600"><X /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-5">
              <input required type="text" placeholder="Full Name" className="w-full p-4 bg-slate-50 border-none rounded-2xl outline-none font-bold" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              <input required type="text" placeholder="Role (e.g. Sales)" className="w-full p-4 bg-slate-50 border-none rounded-2xl outline-none font-bold" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} />
              <input required type="number" placeholder="Daily Rate ($)" className="w-full p-4 bg-slate-50 border-none rounded-2xl outline-none font-bold" value={formData.dailyRate} onChange={e => setFormData({...formData, dailyRate: e.target.value})} />
              <button type="submit" className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black shadow-lg hover:bg-blue-600 transition-all">
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