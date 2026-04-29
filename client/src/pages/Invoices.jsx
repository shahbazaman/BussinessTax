import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../utils/api';
import { 
  Plus, Search, Trash2, Download, Edit2, Loader2,Printer, 
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
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  // Tabs & Filters
  const [activeTab, setActiveTab] = useState('Sale'); 
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [currencySymbol, setCurrencySymbol] = useState('₹');

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
      
      const sortedInvoices = invRes.data.sort((a, b) => 
        new Date(b.invoiceDate || b.createdAt) - new Date(a.invoiceDate || a.createdAt)
      );
      
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

  const handleUpdateStatus = async (id, newStatus, accountId) => {
    try {
      await api.put(`/invoices/${id}/status`, { status: newStatus, accountId });
      toast.success(`Status updated to ${newStatus}`, { position: 'top-center' });
      fetchData();
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Failed to update status",
        { position: 'top-center', autoClose: 5000 }
      );
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
      const clientName = inv.client?.name || inv.clientName || "";
      
      return inv.type === activeTab && 
             clientName.toLowerCase().includes(searchTerm.toLowerCase()) && 
             (filterStatus === 'All' || inv.status === filterStatus) &&
             (!start || invDate >= start) && (!end || invDate <= end);
    });
  }, [invoices, activeTab, searchTerm, filterStatus, startDate, endDate]);

  const paginatedInvoices = useMemo(() => {
  const startIndex = (currentPage - 1) * itemsPerPage;
  return filteredInvoices.slice(startIndex, startIndex + itemsPerPage);
}, [filteredInvoices, currentPage]);
const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage);
const getPageNumbers = () => {
  const pages = [];

  if (totalPages <= 5) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    if (currentPage <= 3) {
      pages.push(1, 2, 3, 4, '...', totalPages);
    } else if (currentPage >= totalPages - 2) {
      pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
    } else {
      pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
    }
  }

  return pages;
};
useEffect(() => {
  setCurrentPage(1);
}, [searchTerm, filterStatus, startDate, endDate, activeTab]);

  const stats = useMemo(() => {
    return filteredInvoices.reduce((acc, inv) => {
      acc.total += (inv.totalAmount || 0);
      acc.tax += (inv.taxAmount || 0);
      return acc;
    }, { total: 0, tax: 0 });
  }, [filteredInvoices]);

  const handlePayNow = async (invoice) => {
    const razorpayKey = import.meta.env.VITE_RAZORPAY_KEY_ID;
    if (!razorpayKey) return toast.error("Razorpay Key missing");
    if (accounts.length === 0) return toast.error("Link a bank account first");
    
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
        order_id: order.id,
        handler: async (res) => {
          try {
            await api.post('/payments/verify', { ...res, invoiceId: invoice._id, accountId: accounts[0]._id });
            toast.success("Payment successful!"); 
            fetchData();
          } catch { 
            toast.error("Verification failed"); 
          } finally { 
            setPaymentLoading(false); 
          }
        },
        modal: { ondismiss: () => setPaymentLoading(false) },
        theme: { color: activeTab === 'Sale' ? "#4f46e5" : "#e11d48" },
      };
      new window.Razorpay(options).open();
    } catch { 
      toast.error("Razorpay initiation failed"); 
      setPaymentLoading(false); 
    }
  };

const handleDelete = (id) => {
  toast(
    ({ closeToast }) => (
      <div>
        <p className="font-bold text-sm mb-2">Delete this invoice?</p>
        <p className="text-xs text-slate-500 mb-3">This will permanently delete the record and revert stock levels.</p>
        <div className="flex gap-2">
          <button onClick={async () => {
            closeToast();
            try {
              await api.delete(`/invoices/${id}`);
              fetchData();
              toast.success("Deleted & Stock Reverted");
            } catch {
              toast.error("Deletion failed");
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

  const downloadPDF = (invoice) => {
    const doc = new jsPDF();
    const isSale = invoice.type === 'Sale';
    
    doc.setFontSize(22); 
    doc.setTextColor(isSale ? 79 : 225, isSale ? 70 : 29, isSale ? 229 : 72);
    doc.text(`${invoice.type.toUpperCase()} INVOICE`, 105, 20, { align: "center" });
    
    doc.setFontSize(10);
    doc.setTextColor(40);
    // Updated PDF labels for logic
    const identifier = isSale 
        ? `Invoice No: ${invoice.invoiceNumber}` 
        : `Purchase No: ${invoice.purchaseNumber} | Ref: ${invoice.referenceNumber || 'N/A'}`;
    
    doc.text(identifier, 14, 30);
    doc.text(`Date: ${new Date(invoice.invoiceDate || invoice.createdAt).toLocaleDateString()}`, 14, 35);
    doc.text(`GSTIN: ${invoice.gstNumber || 'N/A'}`, 14, 40);
    
    doc.text(`Party Details:`, 14, 50);
    doc.setFontSize(9);
    doc.text(`${invoice.client?.name || invoice.clientName || 'N/A'}`, 14, 55);
    doc.text(`${invoice.billingAddress || 'N/A'}`, 14, 60, { maxWidth: 80 });
    
    if(isSale && invoice.shippingAddress) {
        doc.setFontSize(10);
        doc.text(`Shipping Address:`, 110, 50);
        doc.setFontSize(9);
        doc.text(`${invoice.shippingAddress}`, 110, 55, { maxWidth: 80 });
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
      headStyles: { fillColor: isSale ? [79, 70, 229] : [225, 29, 72] },
      footStyles: { fillColor: [245, 245, 245], textColor: [0, 0, 0], fontStyle: 'bold' }
    });
    
    if (invoice.notes) {
        const finalY = doc.lastAutoTable.finalY + 10;
        doc.setFontSize(10);
        doc.text("Notes/Terms:", 14, finalY);
        doc.setFontSize(8);
        doc.text(invoice.notes, 14, finalY + 5, { maxWidth: 180 });
    }

    doc.save(`${invoice.type}_${invoice.invoiceNumber || invoice.purchaseNumber}.pdf`);
  };
const printPDF = async (invoice) => {
  try {
    const { data: profile } = await api.get('/auth/profile');

    const formatDate = (d) =>
      d ? new Date(d).toLocaleDateString('en-IN') : '-';

    const formatMoney = (v) =>
      `${currencySymbol}${Number(v || 0).toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;

    // ---- Amount in Words (Indian system) ----
    const toWords = (num) => {
      const a = [
        '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven',
        'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen',
        'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
      ];
      const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

      if ((num = num.toString()).length > 9) return 'Overflow';

      const n = ('000000000' + num).substr(-9).match(/(\d{2})(\d{2})(\d{2})(\d{3})/);

      let str = '';
      str += (n[1] != 0) ? (toWords(parseInt(n[1])) + ' Crore ') : '';
      str += (n[2] != 0) ? (toWords(parseInt(n[2])) + ' Lakh ') : '';
      str += (n[3] != 0) ? (toWords(parseInt(n[3])) + ' Thousand ') : '';
      str += (n[4] != 0)
        ? ((parseInt(n[4]) < 20)
            ? a[parseInt(n[4])]
            : b[n[4][0]] + ' ' + a[n[4][1]]) + ' '
        : '';

      return str.trim();
    };

    const amountInWords = (amount) => {
      const rupees = Math.floor(amount);
      const paise = Math.round((amount - rupees) * 100);

      return `Rupees ${toWords(rupees)}${paise ? ` and ${toWords(paise)} Paise` : ''} Only`;
    };

    const buyer = invoice.client || {};
    const buyerName = buyer.name || invoice.clientName || '-';

    const invoiceTitle = invoice.type === 'Sale' ? 'INVOICE' : 'PURCHASE';

    const gstBanner =
      invoice.gstType === 'intra'
        ? { color: '#10b981', text: 'Intra-State Supply — CGST + SGST Applicable' }
        : invoice.gstType === 'inter'
        ? { color: '#f59e0b', text: 'Inter-State Supply — IGST Applicable' }
        : { color: '#64748b', text: 'GST Supply Details' };

    const html = `
<html>
<head>
<title>Invoice</title>
<style>
body { font-family: 'Helvetica Neue', Arial; margin:0; padding:20px; color:#1e293b; }
.container { max-width:800px; margin:auto; }
.header { display:flex; justify-content:space-between; }
.logo { max-height:60px; }
.title { font-size:28px; font-weight:800; }
.badge { background:#e2e8f0; padding:4px 10px; font-size:10px; border-radius:20px; }
.section { margin-top:20px; }
.card { width:48%; padding:12px; border:1px solid #e2e8f0; border-radius:10px; }
.flex { display:flex; justify-content:space-between; }
.table { width:100%; border-collapse:collapse; margin-top:15px; }
.table th, .table td { padding:8px; border-bottom:1px solid #e5e7eb; font-size:12px; }
.table th { background:#f8fafc; }
.right { text-align:right; }
.total-box { margin-top:20px; width:300px; margin-left:auto; }
.total-row { display:flex; justify-content:space-between; margin:4px 0; }
.grand { background:#0f172a; color:white; padding:8px; font-weight:700; }
.watermark {
  position:fixed; top:40%; left:20%;
  font-size:80px; opacity:0.1; transform:rotate(-30deg);
}
@media print {
  body { margin:0 }
}
</style>
</head>

<body>
<div class="container">

${invoice.status === 'Paid' ? `<div class="watermark" style="color:green;">PAID</div>` : ''}
${invoice.status === 'Cancelled' ? `<div class="watermark" style="color:red;">CANCELLED</div>` : ''}

<div class="header">
  <div>
    ${profile.logo ? `<img src="${profile.logo}" class="logo"/>` : ''}
    <div style="font-size:18px;font-weight:700;">${profile.businessName}</div>
    <div>${profile.businessAddress || ''}</div>
    <div>${profile.state || ''}</div>
    <div>GSTIN: ${profile.gstNumber || '-'}</div>
    <div>${profile.phone || ''} | ${profile.email || ''}</div>
  </div>
  <div class="right">
    <div class="title">${invoiceTitle}</div>
    <div>${invoice.invoiceNumber || invoice.purchaseNumber}</div>
    <div>Date: ${formatDate(invoice.invoiceDate)}</div>
    <div>Due: ${formatDate(invoice.dueDate)}</div>
    <div class="badge">Original for Recipient</div>
  </div>
</div>

<div class="section flex">
  <div class="card">
    <strong>Bill From</strong><br/>
    ${profile.businessName}<br/>
    ${profile.businessAddress}<br/>
    ${profile.state}<br/>
    GSTIN: ${profile.gstNumber}
  </div>
  <div class="card">
    <strong>Bill To</strong><br/>
    ${buyerName}<br/>
    ${buyer.email || ''}<br/>
    ${buyer.phone || ''}<br/>
    ${buyer.billingAddress?.street || invoice.billingAddress || ''}<br/>
    ${invoice.buyerState || ''}<br/>
    GSTIN: ${buyer.taxId || invoice.gstNumber || '-'}
  </div>
</div>

<div class="section" style="background:${gstBanner.color};color:white;padding:8px;border-radius:6px;">
${gstBanner.text} | ${invoice.sellerState || ''} → ${invoice.buyerState || ''}
</div>

<table class="table">
<thead>
<tr>
<th>#</th><th>Description</th><th>HSN</th><th>Qty</th><th>Rate</th><th>Tax%</th><th class="right">Amount</th>
</tr>
</thead>
<tbody>
${invoice.items.map((item, i) => `
<tr>
<td>${i + 1}</td>
<td>${item.name}<br/><small>${item.sku || ''}</small></td>
<td>${item.hsnCode || ''}</td>
<td>${item.quantity}</td>
<td>${formatMoney(item.price)}</td>
<td>${item.taxRate || 0}%</td>
<td class="right">${formatMoney(item.quantity * item.price)}</td>
</tr>
`).join('')}
</tbody>
</table>

<div class="total-box">
<div class="total-row"><span>Subtotal</span><span>${formatMoney(invoice.subtotal)}</span></div>

${invoice.gstType === 'intra' ? `
<div class="total-row"><span>CGST</span><span>${formatMoney(invoice.cgst)}</span></div>
<div class="total-row"><span>SGST</span><span>${formatMoney(invoice.sgst)}</span></div>
` : ''}

${invoice.gstType === 'inter' ? `
<div class="total-row"><span>IGST</span><span>${formatMoney(invoice.igst)}</span></div>
` : ''}

<div class="total-row"><span>Discount</span><span>-${formatMoney(invoice.discount)}</span></div>

<div class="total-row grand"><span>Total</span><span>${formatMoney(invoice.totalAmount)}</span></div>
</div>

<div class="section">
<strong>Amount in Words:</strong><br/>
${amountInWords(invoice.totalAmount)}
</div>

${profile.bankName || profile.upiId ? `
<div class="section">
<strong>Bank Details</strong><br/>
Bank: ${profile.bankName || ''}<br/>
A/C: ${profile.bankAccount || ''}<br/>
IFSC: ${profile.bankIfsc || ''}<br/>
Branch: ${profile.bankBranch || ''}<br/>
UPI: ${profile.upiId || ''}
</div>
` : ''}

${invoice.notes ? `
<div class="section">
<strong>Notes</strong><br/>
${invoice.notes}
</div>
` : ''}

<div class="section flex">
  <div>
    Thank you for your business!<br/>
    ${profile.email} | ${profile.phone}<br/>
    <small>This is a computer-generated invoice.</small>
  </div>
  <div class="right">
    <br/><br/>
    ___________________<br/>
    Authorised Signatory<br/>
    ${profile.businessName}
  </div>
</div>

</div>
</body>
</html>
`;

    const newWin = window.open('', '_blank');
    newWin.document.write(html);
    newWin.document.close();
    newWin.print();

  } catch (err) {
    toast.error("Failed to generate print invoice");
  }
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
            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-1">Stock-Adjusting Billing Module</p>
          </div>
          <button onClick={() => { setSelectedInvoice(null); setShowModal(true); }} className={`px-6 py-3 rounded-2xl flex items-center gap-2 shadow-lg font-black text-[10px] uppercase tracking-widest text-white hover:opacity-90 transition-opacity ${activeTab === 'Sale' ? 'bg-indigo-600' : 'bg-rose-600'}`}>
            <Plus size={16} /> Create {activeTab}
          </button>
        </div>

        {/* Stats Cards */}
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
                    <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.15em]">{activeTab === 'Sale' ? 'Inv No.' : 'Purchase & Ref'}</th>
                    <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.15em]">Party / Date</th>
                    <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.15em]">Grand Total</th>
                    <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.15em]">Payment Status</th>
                    <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.15em] text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedInvoices.map((inv) => (
                    <tr key={inv._id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${activeTab === 'Sale' ? 'bg-indigo-50 text-indigo-600' : 'bg-rose-50 text-rose-600'}`}>
                                <FileText size={16} />
                            </div>
                            <div className="flex flex-col">
                                <span className="font-black text-slate-800 text-sm tracking-tight">
                                    {activeTab === 'Sale' ? inv.invoiceNumber : inv.purchaseNumber}
                                </span>
                                {activeTab === 'Purchase' && (
                                    <span className="text-[9px] font-bold text-slate-400 uppercase">REF: {inv.referenceNumber || '---'}</span>
                                )}
                            </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="font-black text-slate-900 text-sm">{inv.client?.name || inv.clientName || "—"}</div>
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
                        <div className="flex items-center justify-end gap-2">
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
                          <button onClick={() => printPDF(inv)} className="p-2.5 bg-slate-50 text-slate-600 rounded-xl hover:bg-violet-600 hover:text-white transition-all shadow-sm" title="Print Invoice">
                            <Printer size={16} />
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
{filteredInvoices.length > itemsPerPage && (
  <div className="flex justify-center items-center gap-2 py-6 flex-wrap">
    
    {/* Prev */}
    <button
      onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
      disabled={currentPage === 1}
      className={`px-3 py-1 rounded-lg text-xs font-bold ${
        currentPage === 1
          ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
          : 'bg-slate-200 hover:bg-slate-300'
      }`}
    >
      Prev
    </button>

    {/* Page Numbers */}
    {getPageNumbers().map((page, index) => (
      <button
        key={index}
        onClick={() => typeof page === 'number' && setCurrentPage(page)}
        disabled={page === '...'}
        className={`px-3 py-1 rounded-lg text-xs font-bold ${
          page === currentPage
            ? 'bg-indigo-600 text-white'
            : page === '...'
            ? 'bg-transparent cursor-default'
            : 'bg-slate-200 hover:bg-slate-300'
        }`}
      >
        {page}
      </button>
    ))}

    {/* Next */}
    <button
      onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
      disabled={currentPage === totalPages}
      className={`px-3 py-1 rounded-lg text-xs font-bold ${
        currentPage === totalPages
          ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
          : 'bg-slate-200 hover:bg-slate-300'
      }`}
    >
      Next
    </button>
  </div>
)}
      <InvoiceModal 
        isOpen={showModal} 
        onClose={() => { setShowModal(false); setSelectedInvoice(null); }} 
        onRefresh={fetchData} 
        clients={clients} 
        products={products} 
        accounts={accounts} 
        invoices={invoices} // Added this to pass full list for auto-numbering
        editData={selectedInvoice} 
        initialType={activeTab} 
      />
    </div>
  );
};

export default Invoices;