import React, { useState, useEffect, useMemo } from 'react';
import api from '../utils/api';
import { Plus, Search, FileText, Filter, Trash2, Download, Edit2, X, Calendar, DollarSign, Loader2, CreditCard, ArrowRight } from 'lucide-react';
import { exportToCSV } from '../utils/exportCSV';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Import the advanced Modal component
import InvoiceModal from '../components/InvoiceModal'; 

const Invoices = () => {
  const [invoices, setInvoices] = useState([]);
  const [clients, setClients] = useState([]);
  const [products, setProducts] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [currency, setCurrency] = useState('USD');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const CURRENCY_MAP = { USD: '$', INR: '₹', EUR: '€', GBP: '£' };
  const currencySymbol = CURRENCY_MAP[currency] || '$';

  const fetchData = async () => {
    setLoading(true);
    try {
      const [invRes, clientRes, profileRes, accRes, prodRes] = await Promise.all([
        api.get('/invoices'),
        api.get('/clients'),
        api.get('/auth/profile'),
        api.get('/accounts'),
        api.get('/products')
      ]);
      setInvoices(invRes.data);
      setClients(clientRes.data);
      setCurrency(profileRes.data.currency || 'USD');
      setAccounts(accRes.data);
      setProducts(prodRes.data);
    } catch (err) {
      toast.error("Cloud synchronization failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Razorpay Payment Logic (Restored to Table)
  const initiatePayment = async (invoice) => {
    try {
      if (accounts.length === 0) {
        return toast.error("❌ No bank account found. Add one in Dashboard.");
      }

      const targetAccountId = accounts[0]._id;

      const { data: order } = await api.post('/payments/create-order', {
        amount: invoice.amount,
        currency: "INR" 
      });

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: "INR",
        name: "Business Ledger",
        description: `Invoice #${invoice._id.slice(-6)}`,
        order_id: order.id,
        handler: async (response) => {
          try {
            await api.post('/payments/verify', {
              ...response,
              invoiceId: invoice._id,
              accountId: targetAccountId 
            });
            toast.success("Payment verified!");
            fetchData();
          } catch (err) {
            toast.error("Verification failed");
          }
        },
        prefill: {
          name: invoice.customerName,
        },
        theme: { color: "#0f172a" },
      };
      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      toast.error("Could not initiate payment");
    }
  };

  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const invDate = new Date(inv.createdAt).getTime();
      const start = startDate ? new Date(startDate).setHours(0, 0, 0, 0) : null;
      const end = endDate ? new Date(endDate).setHours(23, 59, 59, 999) : null;
      
      const clientName = inv.customerName || "";
      const matchesSearch = clientName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === 'All' || inv.status === filterStatus;
      const matchesStart = start ? invDate >= start : true;
      const matchesEnd = end ? invDate <= end : true;

      return matchesSearch && matchesStatus && matchesStart && matchesEnd;
    });
  }, [invoices, searchTerm, filterStatus, startDate, endDate]);

  const formatValue = (value) => {
    return `${currencySymbol}${Number(value || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2, maximumFractionDigits: 2
    })}`;
  };

  const updateStatus = async (id, newStatus) => {
    try {
      await api.put(`/invoices/${id}/status`, { status: newStatus });
      toast.success(`Status updated to ${newStatus}`);
      fetchData();
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Delete record?")) {
      try {
        await api.delete(`/invoices/${id}`);
        fetchData();
        toast.success("Record deleted");
      } catch (err) {
        toast.error("Deletion failed");
      }
    }
  };

  const downloadPDF = (invoice) => {
    const doc = new jsPDF();
    doc.text("INVOICE", 105, 25, { align: "center" });
    autoTable(doc, {
      startY: 40,
      head: [['Item', 'Total']],
      body: [[invoice.customerName, formatValue(invoice.amount)]],
    });
    doc.save(`Invoice_${invoice._id}.pdf`);
  };

  return (
    <div className="p-4 lg:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-4xl font-black text-slate-900 tracking-tighter">Invoices</h2>
            <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mt-1">Ledger System</p>
          </div>
          <button onClick={() => setShowModal(true)} className="bg-slate-900 text-white px-8 py-4 rounded-3xl flex items-center gap-2 hover:bg-blue-600 transition-all shadow-xl font-black text-xs uppercase tracking-widest">
            <Plus size={18} /> New Invoice
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             <input 
                type="text" 
                placeholder="Search customer..."
                className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl outline-none font-bold text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <select 
                className="px-4 py-4 bg-slate-50 border-none rounded-2xl outline-none font-black text-[10px] uppercase cursor-pointer"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="All">All Status</option>
                <option value="Paid">Paid</option>
                <option value="Pending">Pending</option>
                <option value="Overdue">Overdue</option>
              </select>
          </div>
        </div>

        {/* Table */}
        {loading ? (
           <div className="flex justify-center py-20"><Loader2 className="animate-spin" /></div>
        ) : (
          <div className="bg-white rounded-[3rem] shadow-xl overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase">Type</th>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase">Client</th>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase">Amount</th>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase">Status</th>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredInvoices.map((inv) => (
                  <tr key={inv._id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="px-8 py-6">
                       <span className={`text-[9px] font-black px-3 py-1 rounded-full ${inv.type === 'Sale' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                         {(inv.type || 'SALE').toUpperCase()}
                       </span>
                    </td>
                    <td className="px-8 py-6 font-black text-slate-800">{inv.customerName}</td>
                    <td className="px-8 py-6 font-black text-slate-900">{formatValue(inv.amount)}</td>
                    <td className="px-8 py-6">
                      <select 
                        value={inv.status} 
                        onChange={(e) => updateStatus(inv._id, e.target.value)}
                        className={`text-[10px] font-black px-4 py-2 rounded-xl border-none outline-none ${
                          inv.status === 'Paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        <option value="Pending">PENDING</option>
                        <option value="Paid">PAID</option>
                        <option value="Overdue">OVERDUE</option>
                      </select>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex justify-end gap-2">
                        {/* PAY NOW BUTTON: Visible only for Pending/Overdue */}
                        {(inv.status === 'Pending' || inv.status === 'Overdue') && (
                           <button 
                            onClick={() => initiatePayment(inv)}
                            className="p-3 text-blue-600 bg-blue-50 rounded-xl hover:bg-blue-600 hover:text-white transition-all"
                            title="Pay with Razorpay"
                           >
                            <CreditCard size={18} />
                           </button>
                        )}
                        <button onClick={() => downloadPDF(inv)} className="p-3 text-slate-400 hover:text-slate-900"><Download size={18} /></button>
                        <button onClick={() => handleDelete(inv._id)} className="p-3 text-slate-400 hover:text-rose-600"><Trash2 size={18}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <InvoiceModal 
        isOpen={showModal} 
        onClose={() => setShowModal(false)} 
        onRefresh={fetchData} 
        clients={clients} 
        products={products} 
        accounts={accounts} 
      />

      {/* Local Toast Container - only visible in this tab */}
      {/* <ToastContainer position="bottom-right" theme="dark" /> */}
    </div>
  );
};

export default Invoices;