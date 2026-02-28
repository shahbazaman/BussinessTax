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
  const [products, setProducts] = useState([]); // Required for Advanced Modal
  const [accounts, setAccounts] = useState([]); // Required for Advanced Modal
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
        api.get('/products') // Fetching products for the modal's search feature
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
      toast.success(`Invoice marked as ${newStatus}`);
      fetchData();
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Permanently delete this financial record?")) {
      try {
        await api.delete(`/invoices/${id}`);
        fetchData();
        toast.success("Record purged");
      } catch (err) {
        toast.error("Deletion failed");
      }
    }
  };

  const downloadPDF = (invoice) => {
    try {
      const doc = new jsPDF();
      doc.setFontSize(22);
      doc.setTextColor(15, 23, 42);
      doc.text("INVOICE", 105, 25, { align: "center" });
      
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Invoice ID: ${invoice._id.slice(-8).toUpperCase()}`, 15, 45);
      doc.text(`Issued: ${new Date(invoice.createdAt).toLocaleDateString()}`, 15, 52);
      doc.text(`Type: ${invoice.type || 'Sale'}`, 15, 59);

      doc.setFontSize(12);
      doc.setTextColor(0);
      doc.text("BILLED TO:", 15, 75);
      doc.setFont(undefined, 'bold');
      doc.text(invoice.customerName || "Valued Client", 15, 82);

      autoTable(doc, {
        startY: 95,
        head: [['Item', 'Price', 'Qty', 'Total']],
        body: invoice.items ? invoice.items.map(item => [
          item.name,
          formatValue(item.price),
          item.quantity,
          formatValue(item.price * item.quantity)
        ]) : [['Service/Product', '-', '-', formatValue(invoice.amount)]],
        theme: 'grid',
        headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255] }
      });

      const finalY = doc.lastAutoTable.finalY + 15;
      doc.setFontSize(14);
      doc.text(`Grand Total: ${formatValue(invoice.amount)}`, 140, finalY);    
      doc.save(`Invoice_${invoice.customerName || 'Record'}.pdf`);
    } catch (error) {
      toast.error("Failed to generate PDF");
    }
  };

  return (
    <div className="p-4 lg:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h2 className="text-4xl font-black text-slate-900 tracking-tighter">Invoices</h2>
            <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mt-1">Ledger Management System</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowModal(true)} 
              className="bg-slate-900 text-white px-8 py-4 rounded-3xl flex items-center gap-2 hover:bg-blue-600 transition-all shadow-xl shadow-slate-200 font-black text-xs uppercase tracking-widest"
            >
              <Plus size={18} strokeWidth={3} /> New Invoice
            </button>
            <button 
              onClick={() => exportToCSV(filteredInvoices, 'Invoices_Export')} 
              className="bg-white border border-slate-200 text-slate-700 px-6 py-4 rounded-3xl flex items-center gap-2 hover:bg-slate-50 transition-all font-bold text-xs uppercase tracking-widest"
            >
              <Download size={18} /> CSV
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-emerald-500 p-4 rounded-2xl text-white shadow-sm flex items-center gap-4">
            <div className="p-2.5 bg-white/20 rounded-xl"><DollarSign size={20} /></div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-wider opacity-80 leading-none mb-1">Realized</p>
              <h4 className="text-xl font-black">
                {formatValue(filteredInvoices.filter(i => i.status === 'Paid').reduce((sum, i) => sum + i.amount, 0))}
              </h4>
            </div>
          </div>

          <div className="bg-amber-500 p-4 rounded-2xl text-white shadow-sm flex items-center gap-4">
            <div className="p-2.5 bg-white/20 rounded-xl"><Calendar size={20} /></div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-wider opacity-80 leading-none mb-1">Pending</p>
              <h4 className="text-xl font-black">
                {formatValue(filteredInvoices.filter(i => i.status === 'Pending').reduce((sum, i) => sum + i.amount, 0))}
              </h4>
            </div>
          </div>

          <div className="bg-slate-900 p-4 rounded-2xl text-white shadow-sm flex items-center gap-4">
            <div className="p-2.5 bg-slate-800 rounded-xl"><FileText size={20} /></div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-wider opacity-80 leading-none mb-1">Invoices</p>
              <h4 className="text-xl font-black">{filteredInvoices.length} <span className="text-[10px] font-normal opacity-60">Total</span></h4>
            </div>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 mb-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
            <div className="lg:col-span-4 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
              <input 
                type="text" 
                placeholder="Search customer name..."
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20 font-bold text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="lg:col-span-2 relative">
              <select 
                className="w-full px-4 py-4 bg-slate-50 border-none rounded-2xl outline-none font-black text-[10px] uppercase tracking-widest text-slate-600 appearance-none cursor-pointer"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="All">All Status</option>
                <option value="Paid">Paid Only</option>
                <option value="Pending">Pending</option>
                <option value="Overdue">Overdue</option>
              </select>
            </div>

            <div className="lg:col-span-6 flex items-center gap-2 bg-slate-900 p-2 rounded-2xl">
              <div className="flex-1 flex items-center gap-2 px-3">
                <span className="text-[9px] font-black text-blue-400 uppercase">From</span>
                <input 
                  type="date" 
                  className="bg-transparent border-none outline-none text-[11px] font-bold text-white w-full invert brightness-0"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <ArrowRight size={14} className="text-slate-600" />
              <div className="flex-1 flex items-center gap-2 px-3">
                <span className="text-[9px] font-black text-blue-400 uppercase">To</span>
                <input 
                  type="date" 
                  className="bg-transparent border-none outline-none text-[11px] font-bold text-white w-full invert brightness-0"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              {(startDate || endDate) && (
                <button 
                  onClick={() => { setStartDate(''); setEndDate(''); }}
                  className="bg-slate-800 p-2 rounded-xl text-rose-400 hover:text-rose-300 transition-all"
                >
                  <X size={14} strokeWidth={3} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Table Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-300">
            <Loader2 className="animate-spin mb-4" size={48} />
            <p className="font-black uppercase tracking-[0.3em] text-[10px]">Syncing Records...</p>
          </div>
        ) : (
          <div className="bg-white rounded-[3rem] shadow-xl border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Type</th>
                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Client Name</th>
                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount</th>
                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredInvoices.length > 0 ? (
                    filteredInvoices.map((inv) => (
                      <tr key={inv._id} className="hover:bg-blue-50/30 transition-colors group">
                        <td className="px-8 py-6">
                           <span className={`text-[9px] font-black px-3 py-1 rounded-full ${inv.type === 'Sale' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                             {(inv.type || 'SALE').toUpperCase()}
                           </span>
                        </td>
                        <td className="px-8 py-6 font-black text-slate-800">{inv.customerName}</td>
                        <td className="px-8 py-6 font-black text-slate-900 text-lg">{formatValue(inv.amount)}</td>
                        <td className="px-8 py-6">
                          <select 
                            value={inv.status} 
                            onChange={(e) => updateStatus(inv._id, e.target.value)}
                            className={`text-[10px] font-black px-4 py-2 rounded-xl border-none outline-none cursor-pointer ${
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
                            <button onClick={() => downloadPDF(inv)} className="p-3 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all"><Download size={18} /></button>
                            <button onClick={() => handleDelete(inv._id)} className="p-3 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"><Trash2 size={18}/></button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="px-8 py-20 text-center">
                        <div className="flex flex-col items-center opacity-20">
                          <FileText size={64} className="mb-4" />
                          <p className="font-black uppercase tracking-widest text-xs">No records found</p>
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

      {/* RENDER THE ADVANCED MODAL COMPONENT */}
      <InvoiceModal 
        isOpen={showModal} 
        onClose={() => setShowModal(false)} 
        onRefresh={fetchData} 
        clients={clients} 
        products={products} 
        accounts={accounts} 
      />

      <ToastContainer position="bottom-right" theme="dark" />
    </div>
  );
};

export default Invoices;