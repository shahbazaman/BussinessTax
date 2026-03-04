import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../utils/api';
import { 
  Plus, Search, Trash2, Download, Edit2, Loader2, 
  Calendar, Eye, ShoppingCart, ShoppingBag, CreditCard, CheckCircle,
  TrendingUp, PieChart, ChevronDown
} from 'lucide-react';
import { toast } from 'react-toastify';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import InvoiceModal from '../components/InvoiceModal'; 

const Invoices = () => {
  const location = useLocation();
  
  // States
  const [invoices, setInvoices] = useState([]);
  const [clients, setClients] = useState([]);
  const [products, setProducts] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [paymentLoading, setPaymentLoading] = useState(false); 
  const [activeStatusDropdown, setActiveStatusDropdown] = useState(null); 
  
  // Tabs & Filters
  const [activeTab, setActiveTab] = useState('Sale'); 
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [currencySymbol, setCurrencySymbol] = useState('₹');

  const themeColor = activeTab === 'Sale' ? 'indigo' : 'rose';

  useEffect(() => {
    const handleClickOutside = () => setActiveStatusDropdown(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const type = params.get('type');
    if (type === 'Sale' || type === 'Purchase') {
      setActiveTab(type);
    }
  }, [location]);

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
      const sortedInvoices = invRes.data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setInvoices(sortedInvoices);
      setClients(clientRes.data);
      setCurrencySymbol(profileRes.data.currency === 'USD' ? '$' : '₹');
      setAccounts(accRes.data);
      setProducts(prodRes.data);
    } catch (err) {
      toast.error("Cloud synchronization failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      await api.put(`/invoices/${id}`, { status: newStatus });
      toast.success(`Status updated to ${newStatus}`);
      fetchData();
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

  const calculateGrandTotal = (invoice) => {
    const subtotal = invoice.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const taxAmount = subtotal * (Number(invoice.taxRate || 0) / 100);
    return subtotal + taxAmount;
  };

  const formatValue = (value) => {
    return `${currencySymbol}${Number(value || 0).toLocaleString('en-IN', {
      minimumFractionDigits: 2, maximumFractionDigits: 2
    })}`;
  };

  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const invDate = new Date(inv.createdAt).getTime();
      const start = startDate ? new Date(startDate).setHours(0, 0, 0, 0) : null;
      const end = endDate ? new Date(endDate).setHours(23, 59, 59, 999) : null;
      const clientName = inv.client?.name || "";
      return inv.type === activeTab && 
             clientName.toLowerCase().includes(searchTerm.toLowerCase()) && 
             (filterStatus === 'All' || inv.status === filterStatus) &&
             (!start || invDate >= start) && (!end || invDate <= end);
    });
  }, [invoices, activeTab, searchTerm, filterStatus, startDate, endDate]);

  const stats = useMemo(() => {
    return filteredInvoices.reduce((acc, inv) => {
      acc.total += calculateGrandTotal(inv);
      const sub = inv.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      acc.tax += sub * (Number(inv.taxRate || 0) / 100);
      return acc;
    }, { total: 0, tax: 0 });
  }, [filteredInvoices]);

  const handlePayNow = async (invoice) => {
    const razorpayKey = import.meta.env.VITE_RAZORPAY_KEY_ID;
    if (!razorpayKey) return toast.error("Razorpay Key missing");
    if (accounts.length === 0) return toast.error("Link a bank account first");
    setPaymentLoading(true);
    try {
      const { data: order } = await api.post('/payments/create-order', { amount: calculateGrandTotal(invoice), currency: 'INR' });
      const options = {
        key: razorpayKey, amount: order.amount, currency: order.currency, name: 'Business Ledger',
        order_id: order.id,
        handler: async (res) => {
          try {
            await api.post('/payments/verify', { ...res, invoiceId: invoice._id, accountId: accounts[0]._id });
            toast.success("Paid!"); fetchData();
          } catch { toast.error("Verification failed"); } finally { setPaymentLoading(false); }
        },
        modal: { ondismiss: () => setPaymentLoading(false) },
        theme: { color: activeTab === 'Sale' ? "#4f46e5" : "#e11d48" },
      };
      new window.Razorpay(options).open();
    } catch { toast.error("Razorpay failed"); setPaymentLoading(false); }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Delete record?")) {
      try { await api.delete(`/invoices/${id}`); fetchData(); toast.success("Deleted"); }
      catch { toast.error("Failed"); }
    }
  };

  const downloadPDF = (invoice) => {
    const doc = new jsPDF();
    doc.setFontSize(20); 
    doc.text(`${activeTab.toUpperCase()} INVOICE`, 105, 20, { align: "center" });
    doc.setFontSize(10);
    doc.text(`GST: ${invoice.gstNumber || 'N/A'}`, 14, 30);
    doc.text(`Billing: ${invoice.billingAddress || 'N/A'}`, 14, 40);
    doc.text(`Shipping: ${invoice.shippingAddress || 'N/A'}`, 14, 50);

    autoTable(doc, {
      startY: 60,
      head: [['Item Name', 'Qty', 'Rate', 'Total']],
      body: invoice.items.map(i => [i.name, i.quantity, formatValue(i.price), formatValue(i.quantity * i.price)]),
      foot: [
        ['', '', 'Subtotal', formatValue(invoice.subtotal)],
        ['', '', 'Tax', formatValue(invoice.taxAmount)],
        ['', '', 'Discount', `- ${formatValue(invoice.discount)}`],
        ['', '', 'Grand Total', formatValue(invoice.totalAmount)]
      ],
      headStyles: { fillColor: activeTab === 'Sale' ? [79, 70, 229] : [225, 29, 72] }
    });
    doc.save(`${activeTab}_${invoice.invoiceNumber}.pdf`);
  };

  return (
    <div className="p-4 lg:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        
        {/* Navigation Tabs */}
        <div className="flex bg-slate-200/60 p-1.5 rounded-2xl w-full md:w-fit mb-8 shadow-inner border border-slate-200">
          <button 
            onClick={() => setActiveTab('Sale')}
            className={`flex-1 md:flex-none px-10 py-4 rounded-xl font-black uppercase text-xs tracking-widest transition-all flex items-center justify-center gap-3 ${activeTab === 'Sale' ? 'bg-indigo-600 text-white shadow-lg scale-105' : 'text-slate-500 hover:bg-slate-300/50'}`}
          >
            <ShoppingCart size={18} /> Sales
          </button>
          <button 
            onClick={() => setActiveTab('Purchase')}
            className={`flex-1 md:flex-none px-10 py-4 rounded-xl font-black uppercase text-xs tracking-widest transition-all flex items-center justify-center gap-3 ${activeTab === 'Purchase' ? 'bg-rose-600 text-white shadow-lg scale-105' : 'text-slate-500 hover:bg-slate-300/50'}`}
          >
            <ShoppingBag size={18} /> Purchases
          </button>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h2 className="text-3xl font-black tracking-tighter uppercase text-slate-900">Register</h2>
            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-1">Transaction Ledger</p>
          </div>
          <button onClick={() => { setSelectedInvoice(null); setShowModal(true); }} className={`px-6 py-3 rounded-2xl flex items-center gap-2 shadow-lg font-black text-[10px] uppercase tracking-widest text-white ${activeTab === 'Sale' ? 'bg-indigo-600' : 'bg-rose-600'}`}>
            <Plus size={16} /> New {activeTab}
          </button>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
                <div>
                    <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest mb-1">Gross Volume</p>
                    <h3 className="text-3xl font-black text-slate-900">{formatValue(stats.total)}</h3>
                </div>
                <div className={`p-4 rounded-2xl ${activeTab === 'Sale' ? 'bg-indigo-50 text-indigo-500' : 'bg-rose-50 text-rose-500'}`}>
                    <TrendingUp size={24} />
                </div>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
                <div>
                    <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest mb-1">{activeTab === 'Sale' ? 'Tax Collected' : 'Tax Paid'}</p>
                    <h3 className="text-3xl font-black text-slate-900">{formatValue(stats.tax)}</h3>
                </div>
                <div className="p-4 bg-emerald-50 text-emerald-500 rounded-2xl">
                    <PieChart size={24} />
                </div>
            </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-5 rounded-3xl border border-slate-100 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <input type="text" placeholder="Search party..." className="px-4 py-3 bg-slate-50 rounded-xl outline-none font-bold text-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            <input type="date" className="bg-slate-50 px-4 py-3 rounded-xl outline-none font-bold text-xs uppercase" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            <input type="date" className="bg-slate-50 px-4 py-3 rounded-xl outline-none font-bold text-xs uppercase" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            <select className="px-4 py-3 bg-slate-50 rounded-xl font-black text-xs uppercase" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="All">All Status</option><option value="Paid">Paid</option><option value="Pending">Pending</option>
            </select>
          </div>
        </div>

        {/* Table Section */}
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin text-slate-300" size={40} /></div>
        ) : (
          <div className="bg-white rounded-[2.5rem] shadow-sm overflow-hidden border border-slate-100">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/80">
                    <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.15em]">Inv No.</th>
                    <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.15em]">Party Details</th>
                    <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.15em]">Total Amount</th>
                    <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.15em]">Status</th>
                    <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.15em] text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredInvoices.map((inv) => (
                    <tr key={inv._id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-8 py-6 font-bold text-slate-800 text-sm">#{inv.invoiceNumber?.slice(-6) || inv._id.slice(-6)}</td>
                      <td className="px-8 py-6">
                        <div className="font-black text-slate-900 text-sm">{inv.client?.name || "N/A"}</div>
                        <div className="text-xs text-slate-400 font-bold uppercase mt-0.5">{new Date(inv.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="font-black text-slate-900 text-sm">{formatValue(calculateGrandTotal(inv))}</div>
                      </td>
                      
                      <td className="px-8 py-6 relative">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveStatusDropdown(activeStatusDropdown === inv._id ? null : inv._id);
                          }}
                          className={`group flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-wider transition-all hover:ring-2 hover:ring-offset-1 ${inv.status === 'Paid' ? 'bg-emerald-100 text-emerald-600 hover:ring-emerald-200' : 'bg-amber-100 text-amber-600 hover:ring-amber-200'}`}
                        >
                          {inv.status}
                          <ChevronDown size={12} className={`transition-transform ${activeStatusDropdown === inv._id ? 'rotate-180' : ''}`} />
                        </button>

                        {activeStatusDropdown === inv._id && (
                          <div className="absolute left-8 mt-2 w-32 bg-white border border-slate-100 rounded-2xl shadow-2xl z-50 overflow-hidden py-1" onClick={(e) => e.stopPropagation()}>
                            <button 
                              onClick={() => handleUpdateStatus(inv._id, 'Paid')}
                              className="w-full text-left px-5 py-3 text-[10px] font-black uppercase text-emerald-600 hover:bg-emerald-50 transition-colors"
                            >
                              Set Paid
                            </button>
                            <button 
                              onClick={() => handleUpdateStatus(inv._id, 'Pending')}
                              className="w-full text-left px-5 py-3 text-[10px] font-black uppercase text-amber-600 hover:bg-amber-50 transition-colors"
                            >
                              Set Pending
                            </button>
                          </div>
                        )}
                      </td>

                      <td className="px-8 py-6">
                        <div className="flex items-center justify-end gap-2">
                          {inv.status === 'Pending' && (
                            activeTab === 'Sale' ? (
                              <button onClick={() => handlePayNow(inv)} disabled={paymentLoading} className="p-2.5 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm">
                                <CreditCard size={16} />
                              </button>
                            ) : (
                              <button onClick={() => handleUpdateStatus(inv._id, 'Paid')} className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm">
                                <CheckCircle size={16} />
                              </button>
                            )
                          )}
                          <button onClick={() => { setSelectedInvoice(inv); setShowModal(true); }} className={`p-2.5 bg-${themeColor}-50 text-${themeColor}-600 rounded-xl hover:bg-${themeColor}-600 hover:text-white transition-all shadow-sm`}>
                            <Edit2 size={16} />
                          </button>
                          <button onClick={() => downloadPDF(inv)} className="p-2.5 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-800 hover:text-white transition-all shadow-sm">
                            <Download size={16} />
                          </button>
                          <button onClick={() => handleDelete(inv._id)} className="p-2.5 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-600 hover:text-white transition-all shadow-sm">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <InvoiceModal isOpen={showModal} onClose={() => { setShowModal(false); setSelectedInvoice(null); }} onRefresh={fetchData} clients={clients} products={products} accounts={accounts} editData={selectedInvoice} initialType={activeTab} />
    </div>
  );
};

export default Invoices;