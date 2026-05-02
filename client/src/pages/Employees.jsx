import React, { useState, useEffect, useMemo, useContext } from 'react';
import api from '../utils/api';
import { 
  Users, UserPlus, CalendarCheck, DollarSign, Trash2, Edit2, Printer,
  X, Search, Filter, Loader2, Receipt, Landmark, Phone, Briefcase, MapPin, Fingerprint, RefreshCcw, CheckCircle2,
  Calendar, Building2, Hash, Clock, AlertCircle, CreditCard, CheckCheck, BanknoteIcon
} from 'lucide-react';
import { toast } from 'react-toastify';
import { CurrencyContext } from '../context/CurrencyContext';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { AuthContext } from '../context/AuthContext';

const getCycleDays = (salaryType) => {
  if (salaryType === 'Weekly') return 7;
  if (salaryType === 'Daily') return 1;
  return 30; // Monthly
};

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
const computeSalary = (emp) => {
  const days = Number(emp.workingDays);
  const rate = Number(emp.dailyRate);
  if (emp.salaryType === 'Daily') return days * rate;
  if (emp.salaryType === 'Weekly') return Math.round((rate / 7) * days * 100) / 100;
  return Math.round((rate / 30) * days * 100) / 100; // Monthly
};
// ─── Payment Modal ──────────────────────────────────────────────────────────

const PaymentModal = ({ employee, accounts, symbol, businessName, onClose, onPaid }) => {
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
      const workedDaysSnapshot = employee.workingDays; // capture BEFORE reset
const res = await api.post(`/employees/${employee._id}/pay`, { accountId: selectedAccountId });
const chosenAccount = accounts.find(a => a._id === selectedAccountId);
toast.success(res.data.message || "Payment processed!");
onPaid(res.data.employee, res.data.payout, chosenAccount?.bankName || 'N/A', workedDaysSnapshot);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Payment failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl border border-slate-100 overflow-hidden my-auto">
        {/* Header */}
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-5 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 bg-white/20 rounded-xl hover:bg-white/30 transition-all"
          >
            <X size={16} />
          </button>
          <div className="h-10 w-10 bg-white/20 rounded-xl flex items-center justify-center mb-3">
            <BanknoteIcon size={20} />
          </div>
          <h3 className="text-lg font-black">Process Payment</h3>
          <p className="text-emerald-100 text-xs mt-0.5">{employee.name} • {employee.salaryType} Pay</p>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Amount due */}
          <div className="bg-emerald-50 rounded-2xl p-4 flex items-center justify-between border border-emerald-100">
          <div>
            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Amount Due</p>
            <p className="text-2xl font-black text-slate-900 mt-0.5">{symbol}{amount.toLocaleString()}</p>
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
          <div className="flex gap-3 pt-1">
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
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [roleFilter, setRoleFilter] = useState('All');
  const { symbol } = useContext(CurrencyContext);
  const { user } = useContext(AuthContext);
  const [lastSlip, setLastSlip] = useState(null);
  const slipRef = React.useRef();

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


  const totalPayrollAmount = useMemo(() => {
  return employees
    .filter(isPaymentDue)
    .reduce((sum, emp) => sum + computeSalary(emp), 0);
}, [employees]);

const totalAllEmployees = useMemo(() => {
  return employees.reduce((sum, emp) => sum + computeSalary(emp), 0);
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

const paginatedEmployees = useMemo(() => {
  const startIndex = (currentPage - 1) * itemsPerPage;
  return filteredEmployees.slice(startIndex, startIndex + itemsPerPage);
}, [filteredEmployees, currentPage]);

const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage);
  useEffect(() => {
  if (currentPage > totalPages && totalPages > 0) {
    setCurrentPage(totalPages);
  }
}, [filteredEmployees, currentPage, itemsPerPage]);

  useEffect(() => { fetchData(); }, []);
  useEffect(() => {
  setCurrentPage(1);
}, [searchTerm, roleFilter]);
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
  const handlePaymentDone = (updatedEmployee, paidAmount, accountName, workedDays) => {
  setEmployees(prev =>
    prev.map(e => e._id === updatedEmployee._id ? updatedEmployee : e)
  );
  setLastSlip({
    employee: { ...updatedEmployee, workingDays: workedDays }, // restore snapshot
    amount: paidAmount,
    accountName,
    paidDate: new Date(),
  });
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
const downloadSlip = async () => {
  const element = slipRef.current;
  if (!element) return;
  element.style.display = 'block';
  const canvas = await html2canvas(element, { scale: 2, useCORS: true });
  element.style.display = 'none';
  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = (canvas.height * pageWidth) / canvas.width;
  pdf.addImage(imgData, 'PNG', 0, 0, pageWidth, pageHeight);
  const empName = lastSlip.employee.name.replace(/\s+/g, '_');
  const month = lastSlip.paidDate.toLocaleString('default', { month: 'long', year: 'numeric' }).replace(' ', '_');
  pdf.save(`SalarySlip_${empName}_${month}.pdf`);
};
const printSlip = async () => {
    const element = slipRef.current;
    if (!element) return;
    element.style.display = 'block';
    const canvas = await html2canvas(element, { scale: 2, useCORS: true });
    element.style.display = 'none';
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = (canvas.height * pageWidth) / canvas.width;
    pdf.addImage(imgData, 'PNG', 0, 0, pageWidth, pageHeight);
    pdf.autoPrint();
    window.open(pdf.output('bloburl'), '_blank');
  };
  return (
    <div className="p-4 md:p-8 space-y-8 bg-slate-50 min-h-screen">
      {/* Header & Payroll Summary */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Staffing Hub</h1>
          <p className="text-slate-500 font-medium">Manage attendance, payroll, and verification</p>
        </div>
        
        <div className="bg-emerald-50 p-4 rounded-3xl flex items-center gap-6 border border-emerald-100 shadow-sm">
   <div className="flex gap-6">
     <div>
       <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Due Now</p>
       <p className="text-2xl font-black text-slate-900">{symbol}{totalPayrollAmount.toLocaleString()}</p>
     </div>
     <div className="border-l border-emerald-200 pl-6">
       <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Total Payroll</p>
       <p className="text-2xl font-black text-slate-400">{symbol}{totalAllEmployees.toLocaleString()}</p>
     </div>
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
              {paginatedEmployees.map((emp) => {
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
                    <td className="px-8 py-5">
                        {(() => {
                          let worked = emp.workingDays;
                          let total, color;

                          if (emp.salaryType === 'Daily') {
                            total = 1;
                            color = 'bg-orange-50 text-orange-600';
                          } else if (emp.salaryType === 'Weekly') {
                            total = 7;
                            color = 'bg-purple-50 text-purple-600';
                          } else {
                            const joined = new Date(emp.lastPaymentDate || emp.joiningDate);
                            total = new Date(joined.getFullYear(), joined.getMonth() + 1, 0).getDate();
                            color = 'bg-blue-50 text-blue-600';
                          }

                          return (
                            <div className={`inline-flex items-baseline gap-1 px-3 py-1.5 rounded-xl ${color}`}>
                              <span className="text-base font-black">{worked}</span>
                              <span className="text-[10px] font-black uppercase tracking-widest opacity-60">/ {total} days</span>
                            </div>
                          );
                        })()}
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
          {filteredEmployees.length > itemsPerPage && filteredEmployees.length !== 0 && (
            <div className="text-center py-20 text-slate-400">
              <Users size={40} className="mx-auto mb-3 opacity-30" />
              <p className="font-bold">No employees found</p>
            </div>
          )}
          {filteredEmployees.length > itemsPerPage && (
  <div className="flex justify-center items-center gap-2 py-6 flex-wrap">

    {/* Prev */}
    <button
      onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
      disabled={currentPage === 1}
      className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
        currentPage === 1
          ? 'bg-slate-100 text-slate-300 cursor-not-allowed'
          : 'bg-slate-200 hover:bg-slate-300'
      }`}
    >
      Prev
    </button>

    {/* Page Numbers */}
    {[...Array(totalPages)].map((_, i) => {
      const page = i + 1;
      return (
        <button
          key={page}
          onClick={() => setCurrentPage(page)}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
            currentPage === page
              ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md'
              : 'bg-slate-200 hover:bg-slate-300'
          }`}
        >
          {page}
        </button>
      );
    })}

    {/* Next */}
    <button
      onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
      disabled={currentPage === totalPages}
      className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
        currentPage === totalPages
          ? 'bg-slate-100 text-slate-300 cursor-not-allowed'
          : 'bg-slate-200 hover:bg-slate-300'
      }`}
    >
      Next
    </button>

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
        businessName={user?.businessName || user?.name || 'Your Business'}
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
    {/* ── SALARY SLIP DOWNLOAD BUTTON ── */}
      {lastSlip && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2">
          <button
            onClick={downloadSlip}
            className="flex items-center gap-2 bg-slate-900 text-white px-5 py-3 rounded-2xl font-bold text-xs uppercase tracking-widest shadow-2xl hover:bg-blue-600 transition-all"
          >
            <Receipt size={16} /> Download Salary Slip — {lastSlip.employee.name}
          </button>
          <button
            onClick={printSlip}
            className="flex items-center gap-2 bg-white text-slate-900 px-5 py-3 rounded-2xl font-bold text-xs uppercase tracking-widest shadow-2xl hover:bg-violet-600 hover:text-white transition-all border border-slate-200"
            title="Print Salary Slip"
          >
            <Printer size={16} /> Print Slip
          </button>
          <button
            onClick={() => setLastSlip(null)}
            className="p-3 bg-white text-slate-400 rounded-2xl shadow-2xl hover:text-rose-500 transition-all border border-slate-100"
          >
            <X size={14} />
          </button>
        </div>    
      )}

      {/* ── HIDDEN SALARY SLIP TEMPLATE ── */}
      <div ref={slipRef} style={{ display: 'none', width: '794px', fontFamily: 'Arial, sans-serif', backgroundColor: '#fff', padding: '0' }}>
        {lastSlip && (() => {
          const { employee: emp, amount, accountName, paidDate } = lastSlip;
          const monthLabel = paidDate.toLocaleString('default', { month: 'long', year: 'numeric' });
          const slipId = `SLIP-${emp.employeeId}-${paidDate.getFullYear()}${String(paidDate.getMonth()+1).padStart(2,'0')}`;
          return (
            <div style={{ padding: '48px', backgroundColor: '#fff' }}>

              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px', paddingBottom: '24px', borderBottom: '3px solid #0f172a' }}>
                <div>
                  <div style={{ fontSize: '24px', fontWeight: '900', color: '#0f172a', letterSpacing: '-0.5px' }}>
                    SALARY SLIP
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', fontWeight: '600' }}>
                    {monthLabel}
                  </div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                    Ref: {slipId}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '20px', fontWeight: '900', color: '#0f172a' }}>
                    {user?.businessName || user?.name || 'Your Business'}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                    Salary processed on {paidDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </div>
                </div>
              </div>

              {/* Employee Info */}
              <div style={{ backgroundColor: '#f8fafc', borderRadius: '16px', padding: '24px', marginBottom: '24px' }}>
                <div style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '16px' }}>
                  Employee Details
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                  {[
                    ['Full Name', emp.name],
                    ['Employee ID', emp.employeeId || '—'],
                    ['Department', emp.department || '—'],
                    ['Designation', emp.role || '—'],
                    ['Employment Type', emp.employmentType || '—'],
                    ['Joining Date', new Date(emp.joiningDate).toLocaleDateString('en-IN')],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <div style={{ fontSize: '9px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>{label}</div>
                      <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a', marginTop: '2px' }}>{value}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Earnings Table */}
              <div style={{ marginBottom: '24px' }}>
                <div style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '12px' }}>
                  Earnings Breakdown
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#0f172a' }}>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '10px', fontWeight: '700', color: '#fff', letterSpacing: '1px', textTransform: 'uppercase', borderRadius: '8px 0 0 8px' }}>Description</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '10px', fontWeight: '700', color: '#fff', letterSpacing: '1px', textTransform: 'uppercase' }}>Type</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '10px', fontWeight: '700', color: '#fff', letterSpacing: '1px', textTransform: 'uppercase' }}>Days / Cycle</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '10px', fontWeight: '700', color: '#fff', letterSpacing: '1px', textTransform: 'uppercase', borderRadius: '0 8px 8px 0' }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '14px 16px', fontSize: '13px', fontWeight: '600', color: '#0f172a' }}>Base Salary</td>
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <span style={{ backgroundColor: '#eff6ff', color: '#3b82f6', fontSize: '10px', fontWeight: '700', padding: '3px 10px', borderRadius: '20px', textTransform: 'uppercase' }}>
                          {emp.salaryType}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'center', fontSize: '13px', color: '#64748b' }}>
                        {emp.salaryType === 'Daily' ? `${emp.workingDays} days worked` : emp.salaryType === 'Weekly' ? '7-day cycle' : '30-day cycle'}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right', fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>
                        {symbol}{Number(emp.dailyRate).toLocaleString()}
                      </td>
                    </tr>
                    {emp.salaryType === 'Daily' && (
                      <tr style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: '#fafafa' }}>
                        <td style={{ padding: '14px 16px', fontSize: '13px', color: '#64748b' }}>Daily Rate × Working Days</td>
                        <td style={{ padding: '14px 16px' }}></td>
                        <td style={{ padding: '14px 16px', textAlign: 'center', fontSize: '13px', color: '#64748b' }}>
                          {symbol}{emp.dailyRate} × {emp.workingDays}
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'right', fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>
                          {symbol}{(emp.dailyRate * emp.workingDays).toLocaleString()}
                        </td>
                      </tr>
                    )}
                    {/* Gross total row */}
                    <tr style={{ backgroundColor: '#f0fdf4' }}>
                      <td colSpan={3} style={{ padding: '14px 16px', fontSize: '14px', fontWeight: '900', color: '#15803d' }}>Gross Pay</td>
                      <td style={{ padding: '14px 16px', textAlign: 'right', fontSize: '18px', fontWeight: '900', color: '#15803d' }}>
                        {symbol}{Number(amount).toLocaleString()}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Payment Info */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '32px' }}>
                <div style={{ backgroundColor: '#f0fdf4', borderRadius: '12px', padding: '20px', border: '1px solid #bbf7d0' }}>
                  <div style={{ fontSize: '9px', fontWeight: '700', color: '#16a34a', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Payment Status</div>
                  <div style={{ fontSize: '16px', fontWeight: '900', color: '#15803d' }}>✓ PAID</div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                    {paidDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </div>
                </div>
                <div style={{ backgroundColor: '#f8fafc', borderRadius: '12px', padding: '20px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '9px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Paid From Account</div>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>{accountName}</div>
                  {emp.bankDetails?.accountNumber && (
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px', fontFamily: 'monospace' }}>
                      To: {emp.bankDetails.accountNumber}
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div style={{ fontSize: '10px', color: '#94a3b8', lineHeight: '1.6' }}>
                  This is a computer-generated salary slip and does not require a physical signature.<br />
                  Generated on {new Date().toLocaleString('en-IN')}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ width: '120px', borderTop: '1px solid #0f172a', paddingTop: '6px', fontSize: '10px', color: '#64748b', textAlign: 'center' }}>
                    Authorized Signature
                  </div>
                </div>
              </div>

            </div>
          );
        })()}
      </div>

    </div>
  );
};

export default Employees;