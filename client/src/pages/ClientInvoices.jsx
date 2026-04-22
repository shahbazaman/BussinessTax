import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import {
  ArrowLeft, Loader2, FileText, ChevronDown,Printer,
  Download, Trash2, Edit2, Search, TrendingUp, PieChart
} from 'lucide-react';
import { toast } from 'react-toastify';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import InvoiceModal from '../components/InvoiceModal';

const ClientInvoices = () => {
  const { clientId } = useParams();
  const navigate = useNavigate();

  const [invoices, setInvoices] = useState([]);
  const [client, setClient] = useState(null);
  const [clients, setClients] = useState([]);
  const [products, setProducts] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [activeTab, setActiveTab] = useState('Sale');
  const [activeStatusDropdown, setActiveStatusDropdown] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [currencySymbol, setCurrencySymbol] = useState('₹');

  useEffect(() => {
    const handleClickOutside = () => setActiveStatusDropdown(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

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
      const all = invRes.data.filter(inv =>
        inv.client?._id === clientId || inv.client === clientId
      );
      setInvoices(all);
      setClients(clientRes.data);
      setClient(clientRes.data.find(c => c._id === clientId) || null);
      setCurrencySymbol(profileRes.data.currency === 'USD' ? '$' : '₹');
      setAccounts(accRes.data);
      setProducts(prodRes.data);
    } catch {
      toast.error('Failed to load client invoices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [clientId]);

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      await api.put(`/invoices/${id}/status`, { status: newStatus });
      toast.success(`Status updated to ${newStatus}`);
      fetchData();
    } catch {
      toast.error('Failed to update status');
    }
  };

  const handleDelete = (id) => {
    toast(({ closeToast }) => (
      <div>
        <p className="font-bold text-sm mb-2">Delete this invoice?</p>
        <p className="text-xs text-slate-500 mb-3">This cannot be undone.</p>
        <div className="flex gap-2">
          <button onClick={async () => {
            closeToast();
            try { await api.delete(`/invoices/${id}`); fetchData(); toast.success('Deleted'); }
            catch { toast.error('Deletion failed'); }
          }} className="bg-rose-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg">Yes, Delete</button>
          <button onClick={closeToast} className="bg-slate-100 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-lg">Cancel</button>
        </div>
      </div>
    ), { autoClose: false, closeButton: false });
  };

  const formatValue = (value) =>
    `${currencySymbol}${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

  const downloadPDF = (invoice) => {
    const doc = new jsPDF();
    const isSale = invoice.type === 'Sale';
    doc.setFontSize(22);
    doc.setTextColor(isSale ? 79 : 225, isSale ? 70 : 29, isSale ? 229 : 72);
    doc.text(`${invoice.type.toUpperCase()} INVOICE`, 105, 20, { align: 'center' });
    doc.setFontSize(10); doc.setTextColor(40);
    doc.text(`Invoice No: ${invoice.invoiceNumber || invoice.purchaseNumber}`, 14, 30);
    doc.text(`Date: ${new Date(invoice.invoiceDate || invoice.createdAt).toLocaleDateString()}`, 14, 35);
    autoTable(doc, {
      startY: 50,
      head: [['Item', 'Qty', 'Price', 'Tax %', 'Total']],
      body: invoice.items.map(i => [i.name, i.quantity, formatValue(i.price), `${i.taxRate || 0}%`, formatValue(i.quantity * i.price)]),
      foot: [['', '', '', 'Grand Total', formatValue(invoice.totalAmount)]],
      headStyles: { fillColor: isSale ? [79, 70, 229] : [225, 29, 72] },
    });
    doc.save(`${invoice.type}_${invoice.invoiceNumber || invoice.purchaseNumber}.pdf`);
  };
const printPDF = (invoice) => {
    const doc = new jsPDF();
    const isSale = invoice.type === 'Sale';
    doc.setFontSize(22);
    doc.setTextColor(isSale ? 79 : 225, isSale ? 70 : 29, isSale ? 229 : 72);
    doc.text(`${invoice.type.toUpperCase()} INVOICE`, 105, 20, { align: 'center' });
    doc.setFontSize(10);
    doc.setTextColor(40);
    doc.text(`Invoice No: ${invoice.invoiceNumber || invoice.purchaseNumber}`, 14, 30);
    doc.text(`Date: ${new Date(invoice.invoiceDate || invoice.createdAt).toLocaleDateString()}`, 14, 35);
    autoTable(doc, {
      startY: 50,
      head: [['Item Description', 'Qty', 'Unit Price', 'Total']],
      body: invoice.items.map(i => [
        i.name, i.quantity,
        formatValue(i.price),
        formatValue(i.quantity * i.price)
      ]),
      foot: [
        ['', '', 'Subtotal', formatValue(invoice.subtotal)],
        ['', '', 'Tax', formatValue(invoice.taxAmount)],
        ['', '', 'Grand Total', formatValue(invoice.totalAmount)]
      ],
      headStyles: { fillColor: isSale ? [79, 70, 229] : [225, 29, 72] },
      footStyles: { fillColor: [245, 245, 245], textColor: [0, 0, 0], fontStyle: 'bold' }
    });
    doc.autoPrint();
    window.open(doc.output('bloburl'), '_blank');
  };
  const filtered = useMemo(() => invoices.filter(inv =>
    inv.type === activeTab &&
    (filterStatus === 'All' || inv.status === filterStatus) &&
    (inv.invoiceNumber || '').toLowerCase().includes(searchTerm.toLowerCase())
  ), [invoices, activeTab, filterStatus, searchTerm]);

  const stats = useMemo(() => filtered.reduce((acc, inv) => {
    acc.total += inv.totalAmount || 0;
    acc.tax += inv.taxAmount || 0;
    return acc;
  }, { total: 0, tax: 0 }), [filtered]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="animate-spin text-slate-400" size={40} />
    </div>
  );

  return (
    <div className="p-4 lg:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => navigate('/clients')}
            className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all">
            <ArrowLeft size={20} className="text-slate-600" />
          </button>
          <div>
            <h2 className="text-3xl font-black text-slate-800 tracking-tight">
              {client?.name || 'Client'} — Invoice History
            </h2>
            <p className="text-slate-500 text-sm">{client?.email} · {client?.businessName || 'Individual'}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex bg-slate-200/60 p-1.5 rounded-2xl w-full md:w-fit mb-8 shadow-inner border border-slate-200">
          {['Sale', 'Purchase'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`flex-1 md:flex-none px-10 py-4 rounded-xl font-black uppercase text-xs tracking-widest transition-all ${activeTab === tab ? (tab === 'Sale' ? 'bg-indigo-600 text-white shadow-lg scale-105' : 'bg-rose-600 text-white shadow-lg scale-105') : 'text-slate-500 hover:bg-slate-300/50'}`}>
              {tab}s
            </button>
          ))}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest mb-1">Total Value</p>
              <h3 className="text-3xl font-black text-slate-900">{formatValue(stats.total)}</h3>
            </div>
            <div className={`p-4 rounded-2xl ${activeTab === 'Sale' ? 'bg-indigo-50 text-indigo-500' : 'bg-rose-50 text-rose-500'}`}>
              <TrendingUp size={24} />
            </div>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest mb-1">Tax Amount</p>
              <h3 className="text-3xl font-black text-slate-900">{formatValue(stats.tax)}</h3>
            </div>
            <div className="p-4 bg-emerald-50 text-emerald-500 rounded-2xl"><PieChart size={24} /></div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-5 rounded-3xl border border-slate-100 mb-6 flex flex-wrap gap-4 shadow-sm">
          <div className="flex-1 min-w-50 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input type="text" placeholder="Search by invoice number..."
              className="w-full pl-10 pr-4 py-3 bg-slate-50 rounded-xl outline-none font-bold text-sm"
              value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <select className="px-4 py-3 bg-slate-50 rounded-xl font-black text-xs uppercase outline-none"
            value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="All">All Status</option>
            <option value="Paid">Paid</option>
            <option value="Pending">Pending</option>
            <option value="Partially Paid">Partial</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>

        {/* Table */}
        <div className="bg-white rounded-[2.5rem] shadow-sm overflow-hidden border border-slate-100">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100">
                  <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.15em]">Invoice No.</th>
                  <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.15em]">Date</th>
                  <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.15em]">Grand Total</th>
                  <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.15em]">Status</th>
                  <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.15em] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.length === 0 ? (
                  <tr><td colSpan="5" className="px-8 py-16 text-center text-slate-400 font-bold">No invoices found for this client.</td></tr>
                ) : filtered.map((inv) => (
                  <tr key={inv._id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${activeTab === 'Sale' ? 'bg-indigo-50 text-indigo-600' : 'bg-rose-50 text-rose-600'}`}>
                          <FileText size={16} />
                        </div>
                        <span className="font-black text-slate-800 text-sm">
                          {inv.invoiceNumber || inv.purchaseNumber}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-sm font-bold text-slate-600">
                      {new Date(inv.invoiceDate || inv.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-8 py-6">
                      <div className="font-black text-slate-900 text-sm">{formatValue(inv.totalAmount)}</div>
                      <div className="text-[9px] text-slate-400 font-bold uppercase italic">Incl. Tax</div>
                    </td>
                    <td className="px-8 py-6 relative">
                      <button
                        onClick={(e) => { e.stopPropagation(); setActiveStatusDropdown(activeStatusDropdown === inv._id ? null : inv._id); }}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-wider border-2 ${inv.status === 'Paid' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-amber-50 border-amber-100 text-amber-600'}`}>
                        {inv.status}
                        <ChevronDown size={12} className={`transition-transform ${activeStatusDropdown === inv._id ? 'rotate-180' : ''}`} />
                      </button>
                      {activeStatusDropdown === inv._id && (
                        <div className="absolute left-8 mt-2 w-40 bg-white border border-slate-100 rounded-2xl shadow-2xl z-50 overflow-hidden py-1" onClick={(e) => e.stopPropagation()}>
                          {['Paid', 'Pending', 'Partially Paid', 'Cancelled'].map(st => (
                            <button key={st} onClick={() => handleUpdateStatus(inv._id, st)}
                              className="w-full text-left px-5 py-3 text-[10px] font-black uppercase hover:bg-slate-50 text-slate-600">
                              Mark as {st}
                            </button>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { setSelectedInvoice(inv); setShowModal(true); }}
                          className="p-2.5 bg-slate-50 text-slate-600 rounded-xl hover:bg-slate-900 hover:text-white transition-all">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => downloadPDF(inv)}
                          className="p-2.5 bg-slate-50 text-slate-600 rounded-xl hover:bg-slate-900 hover:text-white transition-all">
                          <Download size={16} />
                        </button>
                        <button onClick={() => printPDF(inv)} className="p-2 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-xl transition-all" title="Print Invoice">
                          <Printer size={15} />
                        </button>
                        <button onClick={() => handleDelete(inv._id)}
                          className="p-2.5 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-600 hover:text-white transition-all">
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
      </div>

      <InvoiceModal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setSelectedInvoice(null); }}
        onRefresh={fetchData}
        clients={clients}
        products={products}
        accounts={accounts}
        invoices={invoices}
        editData={selectedInvoice}
        initialType={activeTab}
      />
    </div>
  );
};

export default ClientInvoices;