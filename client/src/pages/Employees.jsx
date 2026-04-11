import React, { useState, useEffect, useMemo, useContext } from 'react';
import api from '../utils/api';
import { 
  Users, UserPlus, CalendarCheck, DollarSign, Trash2, Edit2, 
  X, Search, Filter, Loader2, Receipt, Landmark, Phone, Briefcase, MapPin, Fingerprint, RefreshCcw, CheckCircle2,
  Calendar, Building2, Hash, Clock, AlertCircle, CreditCard, CheckCheck, BanknoteIcon
} from 'lucide-react';
import { toast } from 'react-toastify';
import { CurrencyContext } from '../context/CurrencyContext';

// ─── Helpers ───────────────────────────────────────────────────────────────

/**
 * Returns the cycle length in days for a given salaryType.
 * Monthly ≈ 30 days,  Weekly = 7 days,  Daily = 1 day.
 */
const getCycleDays = (salaryType) => {
  if (salaryType === 'Weekly') return 7;
  if (salaryType === 'Daily') return 1;
  return 30; // Monthly
};

/**
 * Returns true if the employee's current pay cycle has completed.
 * Cycle start = lastPaymentDate ?? joiningDate
 * Cycle end   = cycleStart + getCycleDays(salaryType)
 */
const isPaymentDue = (emp) => {
  const cycleStart = emp.lastPaymentDate
    ? new Date(emp.lastPaymentDate)
    : new Date(emp.joiningDate);
  const cycleDays = getCycleDays(emp.salaryType);
  const dueDate = new Date(cycleStart);
  dueDate.setDate(dueDate.getDate() + cycleDays);
  return new Date() >= dueDate;
};

/**
 * Returns the due date for an employee's next payment.
 */
const getDueDate = (emp) => {
  const cycleStart = emp.lastPaymentDate
    ? new Date(emp.lastPaymentDate)
    : new Date(emp.joiningDate);
  const cycleDays = getCycleDays(emp.salaryType);
  const dueDate = new Date(cycleStart);
  dueDate.setDate(dueDate.getDate() + cycleDays);
  return dueDate;
};

/**
 * Compute how much is owed to an employee right now.
 */
const computeSalary = (emp) => {
  if (emp.salaryType === 'Daily') return Number(emp.workingDays) * Number(emp.dailyRate);
  return Number(emp.dailyRate); // weekly / monthly rate is stored in dailyRate field
};

// ─── Payment Modal ──────────────────────────────────────────────────────────

const PaymentModal = ({ employee, accounts, symbol, onClose, onPaid }) => {
  const [selectedAccountId, setSelectedAccountId] = useState(
    accounts.length > 0 ? accounts[0]._id : ''
  );
  const [loading, setLoading] = useState(false);

  const amount = computeSalary(employee);

  const handlePay = async () => {
    if (!selectedAccountId) {
      toast.error("Please select a payment account");
      return;
    }
    setLoading(true);
    try {
      const res = await api.post(`/employees/${employee._id}/pay`, { accountId: selectedAccountId });
      toast.success(res.data.message || "Payment processed!");
      onPaid(res.data.employee);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Payment failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="bg-linear-to-br from-emerald-500 to-teal-600 p-8 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 bg-white/20 rounded-xl hover:bg-white/30 transition-all"
          >
            <X size={16} />
          </button>
          <div className="h-14 w-14 bg-white/20 rounded-2xl flex items-center justify-center mb-4">
            <BanknoteIcon size={28} />
          </div>
          <h3 className="text-xl font-black">Process Payment</h3>
          <p className="text-emerald-100 text-sm mt-1">{employee.name} • {employee.salaryType} Pay</p>
        </div>

        {/* Body */}
        <div className="p-8 space-y-6">
          {/* Amount due */}
          <div className="bg-emerald-50 rounded-2xl p-5 flex items-center justify-between border border-emerald-100">
            <div>
              <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Amount Due</p>
              <p className="text-3xl font-black text-slate-900 mt-1">{symbol}{amount.toLocaleString()}</p>
            </div>
            <div className="text-right text-xs text-slate-400 font-medium">
              {employee.salaryType === 'Daily' 
                ? <>{employee.workingDays} days × {symbol}{employee.dailyRate}</>
                : <>{employee.salaryType} rate</>
              }
            </div>
          </div>

          {/* Employee bank info */}
          {employee.bankDetails?.bankName && (
            <div className="bg-slate-50 rounded-2xl p-4 flex items-start gap-3">
              <Landmark size={16} className="text-slate-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Employee Bank</p>
                <p className="font-bold text-slate-700 text-sm">{employee.bankDetails.bankName}</p>
                {employee.bankDetails.accountNumber && (
                  <p className="text-xs text-slate-400 font-mono">{employee.bankDetails.accountNumber}</p>
                )}
              </div>
            </div>
          )}

          {/* Source account selector */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
              Deduct From Account
            </label>
            <select
              className="w-full p-4 bg-slate-50 rounded-2xl border-none outline-none font-bold text-sm"
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
            >
              {accounts.length === 0 && (
                <option value="">No accounts available</option>
              )}
              {accounts.map(acc => (
                <option key={acc._id} value={acc._id}>
                  {acc.bankName} — {symbol}{Number(acc.balance).toLocaleString()}
                </option>
              ))}
            </select>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-4 font-bold text-slate-400 hover:text-slate-600 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handlePay}
              disabled={loading || !selectedAccountId}
              className="flex-1 bg-emerald-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all disabled:opacity-60 shadow-lg shadow-emerald-100"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : <CheckCheck size={18} />}
              Confirm Payment
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Main Page ───────────────────────────────────────────────────────────────

const Employees = () => {
  const [employees, setEmployees] = useState([]);
  const [accounts, setAccounts] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showPayrollModal, setShowPayrollModal] = useState(false); 
  const [payingEmployee, setPayingEmployee] = useState(null); // employee being individually paid
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [selectedAccountId, setSelectedAccountId] = useState(''); 

  const initialState = { 
    employeeId: '',
    joiningDate: new Date().toISOString().split('T')[0],
    department: '',
    name: '', 
    role: '', 
    dailyRate: '', 
    email: '', 
    phone: '', 
    contactNumber: '', 
    homeAddress: '', 
    verificationIdType: 'National ID', 
    idNumber: '', 
    customIdType: '',
    employmentType: 'Full Time',
    salaryType: 'Monthly',
    bankName: '', 
    accountNumber: '',
    ifscCode: ''
  };

  const [formData, setFormData] = useState(initialState);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const { symbol } = useContext(CurrencyContext);

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

  const totalPayrollAmount = useMemo(() => {
    return employees.reduce((sum, emp) => {
      if (Number(emp.workingDays) === 0 && emp.salaryType === 'Daily') return sum;
      return sum + computeSalary(emp);
    }, 0);
  }, [employees]);

  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      const matchesSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            emp.employeeId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            emp.role.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = roleFilter === 'All' || emp.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [employees, searchTerm, roleFilter]);

  const roles = ['All', ...new Set(employees.map(e => e.role))];

  const fetchNextEmployeeId = async () => {
    try {
      const res = await api.get('/employees/next-id');
      setFormData(prev => ({ ...prev, employeeId: res.data.employeeId }));
    } catch {
      // silently fail — user can still type manually
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { 
        ...formData, 
        phone: formData.phone || formData.contactNumber, 
        dailyRate: Number(formData.dailyRate),
        bankDetails: {
          bankName: formData.bankName,
          accountNumber: formData.accountNumber,
          ifscCode: formData.ifscCode
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
    const loadingToast = toast.loading("Processing payroll and resetting logs...");
    try {
      const res = await api.post('/employees/close-month', { accountId: selectedAccountId });
      toast.update(loadingToast, { 
        render: res.data.message || "Payroll Processed & Reset", 
        type: "success", 
        isLoading: false, 
        autoClose: 3000 
      });
      setShowPayrollModal(false);    
      await fetchData(); 
    } catch (err) {
      toast.update(loadingToast, { 
        render: err.response?.data?.message || "Payroll reset failed", 
        type: "error", 
        isLoading: false, 
        autoClose: 3000 
      });
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

  // Called after a successful individual payment
  const handlePaymentDone = (updatedEmployee) => {
    setEmployees(prev =>
      prev.map(e => e._id === updatedEmployee._id ? updatedEmployee : e)
    );
  };

  const openEditModal = (emp) => {
    setFormData({ 
      employeeId: emp.employeeId || '',
      joiningDate: emp.joiningDate ? new Date(emp.joiningDate).toISOString().split('T')[0] : '',
      department: emp.department || '',
      name: emp.name, 
      role: emp.role, 
      dailyRate: emp.dailyRate,
      email: emp.email || '',
      phone: emp.phone || '',
      contactNumber: emp.contactNumber || '',
      homeAddress: emp.homeAddress || '',
      verificationIdType: emp.verificationIdType || 'National ID',
      idNumber: emp.idNumber || '',
      customIdType: emp.customIdType || '',
      employmentType: emp.employmentType || 'Full Time',
      salaryType: emp.salaryType || 'Monthly',
      bankName: emp.bankDetails?.bankName || '',
      accountNumber: emp.bankDetails?.accountNumber || '',
      ifscCode: emp.bankDetails?.ifscCode || ''
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

  const handleDelete = (id) => {
    toast(
      ({ closeToast }) => (
        <div>
          <p className="font-bold text-sm mb-2">Delete this employee?</p>
          <p className="text-xs text-slate-500 mb-3">This will permanently remove the employee record.</p>
          <div className="flex gap-2">
            <button onClick={async () => {
              closeToast();
              try {
                await api.delete(`/employees/${id}`);
                toast.success("Record Purged");
                fetchData();
              } catch (err) {
                toast.error("Delete failed");
              }
            }} className="bg-rose-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg">
              Yes, Delete
            </button>
            <button onClick={closeToast} className="bg-slate-100 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-lg">
              Cancel
            </button>
          </div>
        </div>
      ),
      { autoClose: false, closeButton: false }
    );
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
        
        <div className="bg-emerald-50 p-4 rounded-3xl flex items-center gap-6 border border-emerald-100 shadow-sm">
           <div>
             <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Total Monthly Payout</p>
             <p className="text-2xl font-black text-slate-900">{symbol}{totalPayrollAmount.toLocaleString()}</p>
           </div>
           <button 
             onClick={() => setShowPayrollModal(true)}
             disabled={totalPayrollAmount === 0}
             className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-bold text-xs uppercase hover:bg-emerald-700 transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-emerald-100"
           >
             <RefreshCcw size={14} /> Review & Pay All
           </button>
        </div>

        <button onClick={() => { setShowModal(true); fetchNextEmployeeId(); }} className="bg-slate-900 text-white px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-blue-600 transition-all shadow-xl shadow-slate-200 active:scale-95 self-start md:self-center">
          <UserPlus size={16} /> Add Employee
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            className="w-full pl-12 pr-4 py-4 bg-white rounded-2xl border-none outline-none font-bold text-sm shadow-sm" 
            placeholder="Search by ID, name or role..."
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
                <th className="px-8 py-5">Dept / Type</th>
                <th className="px-8 py-5">Worked</th>
                <th className="px-8 py-5 text-emerald-600">Pending Wage</th>
                <th className="px-8 py-5">Payment Status</th>
                <th className="px-8 py-5 text-right">Operations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredEmployees.map((emp) => {
                const due = isPaymentDue(emp);
                const dueDate = getDueDate(emp);
                const salary = computeSalary(emp);
                const daysLeft = Math.ceil((dueDate - new Date()) / (1000 * 60 * 60 * 24));

                return (
                  <tr key={emp._id} className="group hover:bg-slate-50/50 transition-colors">
                    {/* Personnel */}
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center font-black text-sm ${due ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400'}`}>
                          {emp.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-black text-slate-800">{emp.name}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{emp.employeeId || 'NO-ID'} • {emp.role}</p>
                        </div>
                      </div>
                    </td>

                    {/* Dept / Type */}
                    <td className="px-8 py-5">
                      <p className="font-bold text-slate-700 text-sm">{emp.department || 'General'}</p>
                      <p className="text-[9px] font-black text-blue-500 uppercase">{emp.employmentType}</p>
                    </td>

                    {/* Worked */}
                    <td className="px-8 py-5 font-bold text-slate-700">
                      {emp.salaryType === 'Daily'
                        ? `${emp.workingDays} / 1 Day`
                        : emp.salaryType === 'Weekly'
                        ? `${emp.workingDays} / 7 Days`
                        : (() => {
                            const joined = new Date(emp.lastPaymentDate || emp.joiningDate);
                            const daysInMonth = new Date(joined.getFullYear(), joined.getMonth() + 1, 0).getDate();
                            return `${emp.workingDays} / ${daysInMonth} Days`;
                          })()
                      }
                    </td>

                    {/* Pending Wage */}
                    <td className="px-8 py-5 font-black text-slate-900">
                      {symbol}{salary.toLocaleString()}
                      <span className="text-[10px] ml-1 text-slate-400 font-normal">({emp.salaryType})</span>
                    </td>

                    {/* Payment Status — only shows when cycle is due */}
                    <td className="px-8 py-5">
                      {due ? (
                        <div className="flex flex-col gap-1">
                          <span className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-700 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl w-fit">
                            <AlertCircle size={11} /> Payment Due
                          </span>
                          <button
                            onClick={() => setPayingEmployee(emp)}
                            className="inline-flex items-center gap-1.5 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl w-fit hover:bg-emerald-700 transition-all"
                          >
                            <DollarSign size={11} /> Pay {symbol}{salary.toLocaleString()}
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-0.5">
                          <span className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-400 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl w-fit">
                            <Clock size={11} />
                            {daysLeft > 0 ? `Due in ${daysLeft}d` : 'Due today'}
                          </span>
                          <span className="text-[9px] text-slate-400 ml-1">
                            {dueDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                          </span>
                        </div>
                      )}
                    </td>

                    {/* Operations */}
                    <td className="px-8 py-5 flex justify-end gap-2">
                      <button 
                        onClick={() => handleMarkAttendance(emp._id)} 
                        disabled={isAlreadyMarked(emp.lastAttendanceDate)} 
                        title="Mark Attendance"
                        className={`p-3 rounded-xl transition-all ${isAlreadyMarked(emp.lastAttendanceDate) ? 'bg-slate-50 text-slate-200' : 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100'}`}
                      >
                        <CalendarCheck size={18} />
                      </button>
                      <button onClick={() => openEditModal(emp)} title="Edit" className="p-3 text-slate-400 hover:bg-slate-900 hover:text-white rounded-xl transition-all"><Edit2 size={18} /></button>
                      <button onClick={() => handleDelete(emp._id)} title="Delete" className="p-3 text-rose-500 hover:bg-rose-50 rounded-xl transition-all"><Trash2 size={18} /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredEmployees.length === 0 && (
            <div className="text-center py-20 text-slate-400">
              <Users size={40} className="mx-auto mb-3 opacity-30" />
              <p className="font-bold">No employees found</p>
            </div>
          )}
        </div>
      </div>

      {/* ── INDIVIDUAL PAYMENT MODAL ─────────────────────────────── */}
      {payingEmployee && (
        <PaymentModal
          employee={payingEmployee}
          accounts={accounts}
          symbol={symbol}
          onClose={() => setPayingEmployee(null)}
          onPaid={handlePaymentDone}
        />
      )}

      {/* ── PAYROLL REVIEW MODAL (Pay All) ──────────────────────── */}
      {showPayrollModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-70 p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-md p-8 shadow-2xl border border-slate-100">
            <div className="flex justify-center mb-6">
              <div className="bg-emerald-100 p-4 rounded-full text-emerald-600">
                <Landmark size={32} />
              </div>
            </div>
            <h3 className="text-2xl font-black text-slate-900 text-center mb-2">Process Full Payroll</h3>
            <p className="text-sm text-slate-500 text-center mb-8">Confirm total payout of <span className="font-black text-slate-900">{symbol}{totalPayrollAmount.toLocaleString()}</span> to all active employees</p>
            
            <div className="space-y-4 mb-8">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Payment Source</label>
              <select 
                className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm"
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
              >
                {accounts.map(acc => (
                  <option key={acc._id} value={acc._id}>{acc.bankName} ({symbol}{acc.balance})</option>
                ))}
              </select>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setShowPayrollModal(false)} className="flex-1 py-4 font-bold text-slate-400">Cancel</button>
              <button onClick={handleCloseMonth} className="flex-1 bg-slate-900 text-white py-4 rounded-2xl font-bold">Confirm & Pay All</button>
            </div>
          </div>
        </div>
      )}

      {/* ── EMPLOYEE ADD/EDIT MODAL ──────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-3xl shadow-2xl overflow-hidden animate-in zoom-in duration-200">
            <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">{isEditing ? 'Update Employee' : 'New Onboarding'}</h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Enterprise HR Data</p>
              </div>
              <button onClick={closeModal} className="p-3 bg-white rounded-2xl text-slate-400 hover:text-slate-900 shadow-sm transition-all"><X size={20}/></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[75vh] overflow-y-auto no-scrollbar">
              
              {/* Row 1: Employee ID & Joining Date */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1"><Hash size={10}/> Employee ID</label>
                  <input
                    required
                    readOnly={!isEditing}
                    placeholder="EMP-001"
                    className={`w-full p-4 rounded-2xl border-none outline-none font-bold text-sm ${isEditing ? 'bg-slate-50' : 'bg-slate-100 cursor-not-allowed'}`}
                    value={formData.employeeId}
                    onChange={e => isEditing && setFormData({...formData, employeeId: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1"><Calendar size={10}/> Joining Date</label>
                  <input type="date" required className="w-full p-4 bg-slate-50 rounded-2xl border-none outline-none font-bold text-sm" value={formData.joiningDate} onChange={e => setFormData({...formData, joiningDate: e.target.value})} />
                </div>
              </div>

              {/* Row 2: Name & Email */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                  <input required className="w-full p-4 bg-slate-50 rounded-2xl border-none outline-none font-bold text-sm" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Work Email</label>
                  <input type="email" required className="w-full p-4 bg-slate-50 rounded-2xl border-none outline-none font-bold text-sm" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                </div>
              </div>

              {/* Row 3: Department & Role */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1"><Building2 size={10}/> Department</label>
                  <input required placeholder="e.g. Engineering" className="w-full p-4 bg-slate-50 rounded-2xl border-none outline-none font-bold text-sm" value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Designation</label>
                  <input required className="w-full p-4 bg-slate-50 rounded-2xl border-none outline-none font-bold text-sm" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} />
                </div>
              </div>

              {/* Row 4: Employment Type & Salary Type */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-3xl">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Employment Type</label>
                  <select className="w-full p-3 bg-white rounded-xl border-none font-bold text-sm" value={formData.employmentType} onChange={e => setFormData({...formData, employmentType: e.target.value})}>
                    <option value="Full Time">Full Time</option>
                    <option value="Part Time">Part Time</option>
                    <option value="Contract">Contract</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Salary Type</label>
                  <select className="w-full p-3 bg-white rounded-xl border-none font-bold text-sm" value={formData.salaryType} onChange={e => setFormData({...formData, salaryType: e.target.value})}>
                    <option value="Monthly">Monthly</option>
                    <option value="Weekly">Weekly</option>
                    <option value="Daily">Daily</option>
                  </select>
                </div>
              </div>

              {/* Row 5: Rate & Contact */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">{formData.salaryType} Rate ({symbol})</label>
                  <input required type="number" className="w-full p-4 bg-emerald-50/30 rounded-2xl border-none outline-none font-bold text-sm text-emerald-700" value={formData.dailyRate} onChange={e => setFormData({...formData, dailyRate: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Contact Number</label>
                  <input placeholder="Contact Number (optional)" className="w-full p-4 bg-slate-50 rounded-2xl border-none outline-none font-bold text-sm" value={formData.contactNumber} onChange={e => setFormData({...formData, contactNumber: e.target.value})} />
                </div>
              </div>

              {/* Identity Section */}
              <div className="p-6 bg-blue-50/50 rounded-4xl border border-blue-100 space-y-4">
                <div className="flex items-center gap-2 text-blue-600 mb-2">
                  <Fingerprint size={14}/>
                  <span className="text-[10px] font-black uppercase tracking-widest">Identity & Address</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <select className="w-full p-4 bg-white rounded-2xl border-none font-bold text-sm" value={formData.verificationIdType} onChange={e => setFormData({...formData, verificationIdType: e.target.value, customIdType: ''})}>
                    <option value="National ID">National ID</option>
                    <option value="Passport">Passport</option>
                    <option value="Driving License">Driving License</option>
                    <option value="Voter ID">Voter ID</option>
                    <option value="Aadhaar Card">Aadhaar Card</option>
                    <option value="PAN Card">PAN Card</option>
                    <option value="Social Security">Social Security</option>
                    <option value="Birth Certificate">Birth Certificate</option>
                    <option value="Other">Other</option>
                  </select>
                  <input placeholder="ID Number (optional)" className="w-full p-4 bg-white rounded-2xl border-none font-bold text-sm" value={formData.idNumber} onChange={e => setFormData({...formData, idNumber: e.target.value})} />
                  {formData.verificationIdType === 'Other' && (
                    <input 
                      placeholder="Specify ID type..." 
                      className="md:col-span-2 p-4 bg-blue-50 border-2 border-blue-200 rounded-2xl outline-none font-bold text-sm text-blue-700" 
                      value={formData.customIdType} 
                      onChange={e => setFormData({...formData, customIdType: e.target.value})} 
                    />
                  )}
                </div>
                <input placeholder="Home Address (optional)" className="w-full p-4 bg-white rounded-2xl border-none font-bold text-sm" value={formData.homeAddress} onChange={e => setFormData({...formData, homeAddress: e.target.value})} />
              </div>

              {/* Bank Details */}
              <div className="p-6 bg-slate-900 rounded-4xl space-y-4 shadow-lg shadow-slate-200">
                <div className="flex items-center gap-2 text-slate-400 mb-2">
                  <Landmark size={14}/>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">Bank Settlement</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input placeholder="Bank Name" className="w-full p-4 bg-slate-800 rounded-2xl border-none font-bold text-sm text-white" value={formData.bankName} onChange={e => setFormData({...formData, bankName: e.target.value})} />
                  <input placeholder="Account Number" className="w-full p-4 bg-slate-800 rounded-2xl border-none font-bold text-sm text-white" value={formData.accountNumber} onChange={e => setFormData({...formData, accountNumber: e.target.value})} />
                  <input placeholder="IFSC Code (optional)" className="w-full p-4 bg-slate-800 rounded-2xl border-none font-bold text-sm text-white md:col-span-2" value={formData.ifscCode} onChange={e => setFormData({...formData, ifscCode: e.target.value})} />
                </div>
              </div>

              <button type="submit" className="w-full bg-blue-600 text-white py-5 rounded-4xl font-black uppercase tracking-widest shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all active:scale-[0.98]">
                {isEditing ? 'Sync Changes' : 'Finalize Onboarding'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Employees;