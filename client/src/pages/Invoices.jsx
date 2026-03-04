import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../utils/api';
import { 
  Plus, Search, Trash2, Download, Edit2, Loader2, 
  Calendar, Eye, ShoppingCart, ShoppingBag, CreditCard 
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
  
  // Tabs & Filters
  const [activeTab, setActiveTab] = useState('Sale'); 
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [currencySymbol, setCurrencySymbol] = useState('₹');

  // Derived Values
  const themeColor = activeTab === 'Sale' ? 'indigo' : 'rose';
  // Fixed ReferenceError: Defined safely here
  const lastInvoice = invoices.length > 0 ? invoices[0] : null;

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
      // Sort invoices by date descending to make 'lastInvoice' the newest one
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

  useEffect(() => {
    fetchData();
  }, []);

  const handlePayNow = async (invoice) => {
    const razorpayKey = import.meta.env.VITE_RAZORPAY_KEY_ID;
    if (!razorpayKey) return toast.error("Razorpay Key missing in .env");
    if (accounts.length === 0) return toast.error("Please link a bank account first");

    setPaymentLoading(true);
    try {
      const { data: order } = await api.post('/payments/create-order', { 
        amount: invoice.totalAmount, 
        currency: 'INR' 
      });

      const options = {
        key: razorpayKey,
        amount: order.amount,
        currency: order.currency,
        name: 'Business Ledger',
        description: `Payment for Inv #${invoice.invoiceNumber}`,
        order_id: order.id,
        handler: async (response) => {
          try {
            await api.post('/payments/verify', { 
              ...response, 
              invoiceId: invoice._id, 
              accountId: accounts[0]._id 
            });
            toast.success("Payment Successful!");
            fetchData();
          } catch (err) { 
            toast.error("Payment verification failed"); 
          } finally {
            setPaymentLoading(false);
          }
        },
        modal: { ondismiss: () => setPaymentLoading(false) },
        theme: { color: activeTab === 'Sale' ? "#4f46e5" : "#e11d48" },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      toast.error("Could not initiate Razorpay");
      setPaymentLoading(false);
    }
  };

  const handleEdit = (invoice) => {
    setSelectedInvoice(invoice);
    setShowModal(true);
  };

  const handleNewInvoice = () => {
    setSelectedInvoice(null);
    setShowModal(true);
  };

  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const invDate = new Date(inv.createdAt).getTime();
      const start = startDate ? new Date(startDate).setHours(0, 0, 0, 0) : null;
      const end = endDate ? new Date(endDate).setHours(23, 59, 59, 999) : null;
      
      const clientName = inv.client?.name || "";
      const matchesTab = inv.type === activeTab;
      const matchesSearch = clientName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === 'All' || inv.status === filterStatus;
      const matchesStart = start ? invDate >= start : true;
      const matchesEnd = end ? invDate <= end : true;

      return matchesTab && matchesSearch && matchesStatus && matchesStart && matchesEnd;
    });
  }, [invoices, activeTab, searchTerm, filterStatus, startDate, endDate]);

  const formatValue = (value) => {
    return `${currencySymbol}${Number(value || 0).toLocaleString('en-IN', {
      minimumFractionDigits: 2, maximumFractionDigits: 2
    })}`;
  };

  const handleDelete = async (id) => {
    if (window.confirm("Delete this record? Inventory stock will be adjusted back.")) {
      try {
        await api.delete(`/invoices/${id}`);
        fetchData();
        toast.success("Record deleted successfully.");
      } catch (err) {
        toast.error("Deletion failed");
      }
    }
  };

  const downloadPDF = (invoice) => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text(`${activeTab.toUpperCase()} INVOICE`, 105, 20, { align: "center" });
    doc.setFontSize(10);
    doc.text(`Inv No: #${invoice.invoiceNumber || invoice._id.slice(-6)}`, 20, 40);
    doc.text(`Party: ${invoice.client?.name || "N/A"}`, 20, 46);
    doc.text(`Date: ${new Date(invoice.createdAt).toLocaleDateString()}`, 20, 52);

    autoTable(doc, {
      startY: 60,
      head: [['Item Name', 'Qty', 'Rate', 'Total']],
      body: invoice.items.map(item => [
        item.name,
        item.quantity,
        formatValue(item.price),
        formatValue(item.quantity * item.price)
      ]),
      theme: 'grid',
      headStyles: { fillColor: activeTab === 'Sale' ? [79, 70, 229] : [225, 29, 72] }
    });
    doc.save(`${activeTab}_${invoice.invoiceNumber || invoice._id.slice(-6)}.pdf`);
  };

  return (
    <div className="p-4 lg:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h2 className={`text-4xl font-black tracking-tighter uppercase transition-colors duration-500 ${activeTab === 'Sale' ? 'text-indigo-900' : 'text-rose-900'}`}>
              {activeTab}s
            </h2>
            <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mt-1">Transaction History</p>
          </div>
          <button 
            onClick={handleNewInvoice} 
            className={`px-8 py-4 rounded-3xl flex items-center gap-2 transition-all shadow-xl font-black text-xs uppercase tracking-widest text-white ${activeTab === 'Sale' ? 'bg-indigo-600 hover:bg-indigo-500' : 'bg-rose-600 hover:bg-rose-500'}`}
          >
            <Plus size={18} /> Create {activeTab}
          </button>
        </div>

        {/* Sub-Tab Navigation */}
        <div className="flex bg-slate-200/50 p-1.5 rounded-4xl w-fit border border-slate-200 mb-8">
          <button 
            onClick={() => setActiveTab('Sale')}
            className={`px-8 py-3 rounded-3xl font-black uppercase text-[10px] tracking-widest transition-all flex items-center gap-2 ${activeTab === 'Sale' ? 'bg-white shadow-md text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <ShoppingCart size={14} /> Sales Register
          </button>
          <button 
            onClick={() => setActiveTab('Purchase')}
            className={`px-8 py-3 rounded-3xl font-black uppercase text-[10px] tracking-widest transition-all flex items-center gap-2 ${activeTab === 'Purchase' ? 'bg-white shadow-md text-rose-600' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <ShoppingBag size={14} /> Purchase Register
          </button>
        </div>

        {/* Filters Panel */}
        <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <input 
              type="text" 
              placeholder={`Search ${activeTab === 'Sale' ? 'Customer' : 'Vendor'}...`}
              className="px-6 py-4 bg-slate-50 rounded-2xl outline-none font-bold text-sm border-2 border-transparent focus:border-slate-200 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div className="flex items-center bg-slate-50 rounded-2xl px-4">
              <Calendar size={16} className="text-slate-400 mr-2" />
              <input type="date" className="bg-transparent border-none outline-none font-bold text-[10px] uppercase w-full py-4" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="flex items-center bg-slate-50 rounded-2xl px-4">
              <Calendar size={16} className="text-slate-400 mr-2" />
              <input type="date" className="bg-transparent border-none outline-none font-bold text-[10px] uppercase w-full py-4" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
            <select 
              className="px-4 py-4 bg-slate-50 rounded-2xl outline-none font-black text-[10px] uppercase cursor-pointer"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="All">All Status</option>
              <option value="Paid">Paid</option>
              <option value="Pending">Pending</option>
            </select>
          </div>
        </div>

        {/* Table Section */}
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin text-slate-300" size={48} /></div>
        ) : (
          <div className="bg-white rounded-[3rem] shadow-xl overflow-hidden border border-slate-100">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Inv No.</th>
                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">{activeTab === 'Sale' ? 'Customer' : 'Vendor'}</th>
                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount</th>
                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredInvoices.map((inv) => (
                    <tr key={inv._id} className="hover:bg-slate-50/30 transition-colors group">
                      <td className="px-8 py-6 font-bold text-slate-800">#{inv.invoiceNumber?.slice(-6) || inv._id.slice(-6)}</td>
                      <td className="px-8 py-6">
                        <div className="font-black text-slate-800 text-sm">{inv.client?.name || "N/A"}</div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase">{new Date(inv.createdAt).toLocaleDateString()}</div>
                      </td>
                      <td className="px-8 py-6 font-black text-slate-900">{formatValue(inv.totalAmount)}</td>
                      <td className="px-8 py-6">
                        <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-tighter ${inv.status === 'Paid' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex justify-center gap-2">
                          {/* Razorpay Button: Only for Sales that are Pending */}
                          {activeTab === 'Sale' && inv.status === 'Pending' && (
                            <button 
                              onClick={() => handlePayNow(inv)} 
                              disabled={paymentLoading}
                              title="Pay Now with Razorpay"
                              className="p-3 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm disabled:opacity-50"
                            >
                              <CreditCard size={16} />
                            </button>
                          )}
                          
                          <button onClick={() => handleEdit(inv)} className={`p-3 bg-${themeColor}-50 text-${themeColor}-600 rounded-xl hover:bg-${themeColor}-600 hover:text-white transition-all`}>
                            <Edit2 size={16} />
                          </button>
                          <button onClick={() => downloadPDF(inv)} className="p-3 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-800 hover:text-white transition-all">
                            <Download size={16} />
                          </button>
                          <button onClick={() => handleDelete(inv._id)} className="p-3 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-600 hover:text-white transition-all">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredInvoices.length === 0 && (
                <div className="py-20 text-center text-slate-400 font-black uppercase text-xs tracking-widest">No Records Found</div>
              )}
            </div>
          </div>
        )}
      </div>

      <InvoiceModal 
        isOpen={showModal} 
        onClose={() => { setShowModal(false); setSelectedInvoice(null); }} 
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