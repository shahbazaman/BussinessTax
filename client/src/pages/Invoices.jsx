import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../utils/api';
import { 
  Plus, Search, Trash2, Download, Edit2, Loader2, 
  ShoppingCart, ShoppingBag, CreditCard, CheckCircle,
  TrendingUp, PieChart, ChevronDown, FileText
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
      const sortedInvoices = invRes.data.sort((a, b) => new Date(b.invoiceDate || b.createdAt) - new Date(a.invoiceDate || a.createdAt));
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
      await api.put(`/invoices/${id}/status`, { status: newStatus });
      toast.success(`Status updated to ${newStatus}`);
      fetchData();
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

  const formatValue = (value) => {
    return `${currencySymbol}${Number(value || 0).toLocaleString('en-IN', {
      minimumFractionDigits: 2, maximumFractionDigits: 2
    })}`;
  };

  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const invDate = new Date(inv.invoiceDate || inv.createdAt).getTime();
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
      acc.total += inv.totalAmount;
      acc.tax += inv.taxAmount;
      return acc;
    }, { total: 0, tax: 0 });
  }, [filteredInvoices]);

  const handlePayNow = async (invoice) => {
    const razorpayKey = import.meta.env.VITE_RAZORPAY_KEY_ID;
    if (!razorpayKey) return toast.error("Razorpay Key missing");
    if (accounts.length === 0) return toast.error("Link a bank account first");
    setPaymentLoading(true);
    try {
      const { data: order } = await api.post('/payments/create-order', { amount: invoice.totalAmount, currency: 'INR' });
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
    if (window.confirm("Delete record? This will revert stock levels.")) {
      try { await api.delete(`/invoices/${id}`); fetchData(); toast.success("Deleted & Stock Reverted"); }
      catch { toast.error("Failed"); }
    }
  };

  const downloadPDF = (invoice) => {
    const doc = new jsPDF();
    doc.setFontSize(22); 
    doc.setTextColor(activeTab === 'Sale' ? 79 : 225, activeTab === 'Sale' ? 70 : 29, activeTab === 'Sale' ? 229 : 72);
    doc.text(`${activeTab.toUpperCase()} INVOICE`, 105, 20, { align: "center" });
    
    doc.setFontSize(10);
    doc.setTextColor(40);
    const identifier = activeTab === 'Sale' ? `Invoice No: ${invoice.invoiceNumber}` : `Ref No: ${invoice.referenceNumber || 'N/A'}`;
    doc.text(identifier, 14, 30);
    doc.text(`Date: ${new Date(invoice.invoiceDate || invoice.createdAt).toLocaleDateString()}`, 14, 35);
    doc.text(`GSTIN: ${invoice.gstNumber || 'N/A'}`, 14, 40);
    
    doc.text(`Billing Address:`, 14, 50);
    doc.setFontSize(9);
    doc.text(`${invoice.billingAddress || 'N/A'}`, 14, 55, { maxWidth: 80 });
    
    if(activeTab === 'Sale') {
        doc.setFontSize(10);
        doc.text(`Shipping Address:`, 110, 50);
        doc.setFontSize(9);
        doc.text(`${invoice.shippingAddress || 'N/A'}`, 110, 55, { maxWidth: 80 });
    }

    autoTable(doc, {
      startY: 75,
      head: [['Item Description', 'Qty', 'Unit Price', 'Tax %', 'Total']],
      body: invoice.items.map(i => [
        i.name, 
        i.quantity, 
        formatValue(i.price), 
        `${i.taxRate || 0}%`, 
        formatValue(i.quantity * i.price * (1 + (i.taxRate || 0)/100))
      ]),
      foot: [
        ['', '', '', 'Subtotal', formatValue(invoice.subtotal)],
        ['', '', '', 'Tax Amount', formatValue(invoice.taxAmount)],
        ['', '', '', 'Discount', `- ${formatValue(invoice.discount)}`],
        ['', '', '', 'Grand Total', formatValue(invoice.totalAmount)]
      ],
      headStyles: { fillColor: activeTab === 'Sale' ? [79, 70, 229] : [225, 29, 72] },
      footStyles: { fillColor: [245, 245, 245], textColor: [0, 0, 0], fontStyle: 'bold' }
    });
    
    if (invoice.notes) {
        const finalY = doc.lastAutoTable.finalY + 10;
        doc.setFontSize(10);
        doc.text("Notes/Terms:", 14, finalY);
        doc.setFontSize(8);
        doc.text(invoice.notes, 14, finalY + 5, { maxWidth: 180 });
    }

    doc.save(`${activeTab}_${invoice.invoiceNumber || invoice.referenceNumber}.pdf`);
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
            <h2 className="text-3xl font-black tracking-tighter uppercase text-slate-900">{activeTab} Ledger</h2>
            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-1">Transaction History & Inventory Control</p>
          </div>
          <button onClick={() => { setSelectedInvoice(null); setShowModal(true); }} className={`px-6 py-3 rounded-2xl flex items-center gap-2 shadow-lg font-black text-[10px] uppercase tracking-widest text-white hover:opacity-90 transition-opacity ${activeTab === 'Sale' ? 'bg-indigo-600' : 'bg-rose-600'}`}>
            <Plus size={16} /> Create {activeTab}
          </button>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
                <div>
                    <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest mb-1">Total {activeTab} Value</p>
                    <h3 className="text-3xl font-black text-slate-900">{formatValue(stats.total)}</h3>
                </div>
                <div className={`p-4 rounded-2xl ${activeTab === 'Sale' ? 'bg-indigo-50 text-indigo-500' : 'bg-rose-50 text-rose-500'}`}>
                    <TrendingUp size={24} />
                </div>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
                <div>
                    <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest mb-1">{activeTab === 'Sale' ? 'GST Collected' : 'GST Paid'}</p>
                    <h3 className="text-3xl font-black text-slate-900">{formatValue(stats.tax)}</h3>
                </div>
                <div className="p-4 bg-emerald-50 text-emerald-500 rounded-2xl">
                    <PieChart size={24} />
                </div>
            </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-5 rounded-3xl border border-slate-100 mb-6 flex flex-wrap gap-4 shadow-sm">
            <div className="flex-1 min-w-50 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input type="text" placeholder="Filter by party name..." className="w-full pl-10 pr-4 py-3 bg-slate-50 rounded-xl outline-none font-bold text-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <input type="date" className="bg-slate-50 px-4 py-3 rounded-xl outline-none font-bold text-xs uppercase" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            <input type="date" className="bg-slate-50 px-4 py-3 rounded-xl outline-none font-bold text-xs uppercase" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            <select className="px-4 py-3 bg-slate-50 rounded-xl font-black text-xs uppercase outline-none" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="All">All Status</option>
              <option value="Paid">Paid</option>
              <option value="Pending">Pending</option>
              <option value="Partially Paid">Partial</option>
            </select>
        </div>

        {/* Table Section */}
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin text-slate-300" size={40} /></div>
        ) : (
          <div className="bg-white rounded-[2.5rem] shadow-sm overflow-hidden border border-slate-100">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100">
                    <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.15em]">{activeTab === 'Sale' ? 'Invoice No.' : 'Ref No.'}</th>
                    <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.15em]">Party / Date</th>
                    <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.15em]">Grand Total</th>
                    <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.15em]">Payment Status</th>
                    <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.15em] text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredInvoices.map((inv) => (
                    <tr key={inv._id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${activeTab === 'Sale' ? 'bg-indigo-50 text-indigo-600' : 'bg-rose-50 text-rose-600'}`}>
                                <FileText size={16} />
                            </div>
                            <span className="font-black text-slate-800 text-sm tracking-tight">{activeTab === 'Sale' ? inv.invoiceNumber : (inv.referenceNumber || '---')}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="font-black text-slate-900 text-sm">{inv.client?.name || "Deleted Client"}</div>
                        <div className="text-[10px] text-slate-400 font-black uppercase mt-0.5 tracking-wider">{new Date(inv.invoiceDate || inv.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="font-black text-slate-900 text-sm">{formatValue(inv.totalAmount)}</div>
                        <div className="text-[9px] text-slate-400 font-bold uppercase italic">Incl. Tax</div>
                      </td>
                      
                      <td className="px-8 py-6 relative">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveStatusDropdown(activeStatusDropdown === inv._id ? null : inv._id);
                          }}
                          className={`flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-wider transition-all border-2 ${inv.status === 'Paid' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-amber-50 border-amber-100 text-amber-600'}`}
                        >
                          {inv.status}
                          <ChevronDown size={12} className={`transition-transform ${activeStatusDropdown === inv._id ? 'rotate-180' : ''}`} />
                        </button>

                        {activeStatusDropdown === inv._id && (
                          <div className="absolute left-8 mt-2 w-40 bg-white border border-slate-100 rounded-2xl shadow-2xl z-50 overflow-hidden py-1" onClick={(e) => e.stopPropagation()}>
                            {['Paid', 'Pending', 'Partially Paid', 'Cancelled'].map((st) => (
                                <button 
                                    key={st}
                                    onClick={() => handleUpdateStatus(inv._id, st)}
                                    className="w-full text-left px-5 py-3 text-[10px] font-black uppercase hover:bg-slate-50 transition-colors text-slate-600"
                                >
                                    Mark as {st}
                                </button>
                            ))}
                          </div>
                        )}
                      </td>

                      <td className="px-8 py-6">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          {inv.status !== 'Paid' && (
                            activeTab === 'Sale' ? (
                              <button onClick={() => handlePayNow(inv)} disabled={paymentLoading} className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm" title="Online Payment">
                                <CreditCard size={16} />
                              </button>
                            ) : (
                              <button onClick={() => handleUpdateStatus(inv._id, 'Paid')} className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm" title="Mark Paid">
                                <CheckCircle size={16} />
                              </button>
                            )
                          )}
                          <button onClick={() => { setSelectedInvoice(inv); setShowModal(true); }} className={`p-2.5 bg-slate-50 text-slate-600 rounded-xl hover:bg-slate-900 hover:text-white transition-all shadow-sm`}>
                            <Edit2 size={16} />
                          </button>
                          <button onClick={() => downloadPDF(inv)} className="p-2.5 bg-slate-50 text-slate-600 rounded-xl hover:bg-slate-900 hover:text-white transition-all shadow-sm">
                            <Download size={16} />
                          </button>
                          <button onClick={() => handleDelete(inv._id)} className="p-2.5 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-600 hover:text-white transition-all shadow-sm">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredInvoices.length === 0 && (
                    <tr>
                        <td colSpan="5" className="px-8 py-20 text-center">
                            <div className="flex flex-col items-center opacity-20">
                                <FileText size={64} />
                                <p className="font-black uppercase text-xs tracking-widest mt-4">No records found for this period</p>
                            </div>
                        </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <InvoiceModal 
        isOpen={showModal} 
        onClose={() => { setShowModal(false); setSelectedInvoice(null); fetchData(); }} 
        onRefresh={fetchData} 
        clients={clients} 
        products={products} 
        accounts={accounts} 
        editData={selectedInvoice} 
        initialType={activeTab} 
      />
    </div>
  );
};

export default Invoices;