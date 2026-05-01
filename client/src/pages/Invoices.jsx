import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../utils/api';
import { 
  Plus, Search, Trash2, Edit2, Loader2,Printer, 
  ShoppingCart, ShoppingBag, CreditCard, CheckCircle,
  TrendingUp, PieChart, ChevronDown, FileText
} from 'lucide-react';
import { toast } from 'react-toastify';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import InvoiceModal from '../components/InvoiceModal'; 
import HSN_CODES from '../utils/hsnCodes';
import QRCode from 'qrcode';
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
      `₹${Number(v || 0).toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;

    // ---- HSN Description Lookup ----
    const getHsnDescription = (code) => {
      if (!code) return '';
      const found = HSN_CODES.find(h => String(h.code) === String(code));
      return found ? found.description : '';
    };

    // ---- Amount in Words (fixed Indian number system) ----
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven',
      'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen',
      'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty',
      'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    const toWords = (n) => {
      n = Math.floor(Number(n));
      if (n === 0) return 'Zero';
      if (n < 20) return ones[n];
      if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
      if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + toWords(n % 100) : '');
      if (n < 100000) return toWords(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + toWords(n % 1000) : '');
      if (n < 10000000) return toWords(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + toWords(n % 100000) : '');
      return toWords(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + toWords(n % 10000000) : '');
    };

    const amountInWords = (amount) => {
      const total = Number(amount || 0);
      const rupees = Math.floor(total);
      const paise  = Math.round((total - rupees) * 100);
      let words = 'Rupees ' + toWords(rupees);
      if (paise > 0) words += ' and ' + toWords(paise) + ' Paise';
      return words + ' Only';
    };

    // ---- GST Type resolution ----
    const resolvedGstType = invoice.gstType ||
      (invoice.sellerState && invoice.buyerState
        ? (invoice.sellerState.trim().toLowerCase() === invoice.buyerState.trim().toLowerCase() ? 'intra' : 'inter')
        : 'none');

    // ---- GST GROUPING BY HSN ----
    const hsnSummary = {};
    invoice.items.forEach(item => {
      const hsn = item.hsnCode || 'N/A';
      const taxableAmt = (item.quantity || 0) * (item.price || 0);
      const taxRate = Number(item.taxRate || invoice.globalTaxRate || 0);
      const taxAmt = taxableAmt * (taxRate / 100);

      if (!hsnSummary[hsn]) {
        hsnSummary[hsn] = { taxable: 0, cgst: 0, sgst: 0, igst: 0, rate: taxRate };
      }
      hsnSummary[hsn].taxable += taxableAmt;

      if (resolvedGstType === 'intra') {
        hsnSummary[hsn].cgst += taxAmt / 2;
        hsnSummary[hsn].sgst += taxAmt / 2;
      } else if (resolvedGstType === 'inter') {
        hsnSummary[hsn].igst += taxAmt;
      } else {
        hsnSummary[hsn].cgst += taxAmt / 2;
        hsnSummary[hsn].sgst += taxAmt / 2;
      }
    });

    // ---- Totals ----
    const subtotal   = invoice.items.reduce((a, i) => a + (i.quantity || 0) * (i.price || 0), 0);
    const taxTotal   = Object.values(hsnSummary).reduce((a, v) => a + v.cgst + v.sgst + v.igst, 0);
    const grandTotal = Number(invoice.totalAmount || (subtotal + taxTotal - Number(invoice.discount || 0)));

    // ---- QR CODE ----
    const qrData = `Invoice: ${invoice.invoiceNumber || invoice.purchaseNumber || '-'}\nDate: ${formatDate(invoice.invoiceDate)}\nAmount: ${grandTotal}\nGSTIN: ${profile.gstNumber || ''}\nBuyer GST: ${invoice.gstNumber || ''}`;
    const qrCode = await QRCode.toDataURL(qrData);

    const html = `
<html>
<head>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; padding: 24px; font-size: 12px; color: #1e293b; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #1e293b; padding-bottom: 14px; margin-bottom: 14px; }
  .invoice-title { font-size: 26px; font-weight: 900; color: #4f46e5; }
  .invoice-number { font-size: 13px; font-weight: 900; color: #475569; margin-top: 4px; }
  .meta-line { font-size: 11px; color: #64748b; margin-top: 2px; }
  .copy-badge { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; padding: 3px 8px; font-size: 9px; font-weight: 900; color: #475569; text-transform: uppercase; letter-spacing: 1px; display: inline-block; margin-top: 8px; }
  .parties { display: flex; gap: 16px; margin-bottom: 14px; }
  .party-box { flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; }
  .party-label { font-size: 9px; font-weight: 900; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 5px; }
  .party-name { font-size: 14px; font-weight: 900; color: #1e293b; margin-bottom: 3px; }
  .party-line { font-size: 11px; color: #475569; line-height: 1.5; }
  .gstin-badge { display: inline-block; background: #ede9fe; color: #4f46e5; font-size: 10px; font-weight: 900; padding: 2px 8px; border-radius: 4px; margin-top: 4px; }
  .supply-banner { padding: 7px 14px; border-radius: 6px; margin-bottom: 12px; font-size: 11px; font-weight: 700; }
  .supply-intra { background: #f0fdf4; border: 1px solid #bbf7d0; color: #16a34a; }
  .supply-inter { background: #fffbeb; border: 1px solid #fde68a; color: #b45309; }
  .supply-none  { background: #f8fafc; border: 1px solid #e2e8f0; color: #64748b; }
  table.items { width: 100%; border-collapse: collapse; }
  table.items th { background: #1e293b; color: #fff; padding: 7px 8px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; text-align: left; }
  table.items td { padding: 7px 8px; border-bottom: 1px solid #e2e8f0; font-size: 11px; vertical-align: top; }
  table.items tr:nth-child(even) td { background: #f8fafc; }
  .hsn-badge { display: inline-block; background: #4f46e5; color: #fff; font-size: 10px; font-weight: 900; padding: 2px 7px; border-radius: 4px; }
  .totals-wrap { display: flex; justify-content: flex-end; margin-top: 14px; }
  .totals-box { width: 300px; }
  .gst-box { border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px; margin-bottom: 8px; }
  .gst-box-title { font-size: 9px; font-weight: 900; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; }
  table.gst-table { width: 100%; border-collapse: collapse; }
  table.gst-table th { background: #1e293b; color: #fff; padding: 5px 7px; font-size: 9px; text-align: left; }
  table.gst-table td { padding: 5px 7px; border-bottom: 1px solid #f1f5f9; font-size: 11px; }
  .t-row { display: flex; justify-content: space-between; padding: 5px 8px; font-size: 12px; font-weight: 700; border-top: 1px solid #e2e8f0; }
  .grand-row { display: flex; justify-content: space-between; background: #1e293b; color: #fff; padding: 10px; border-radius: 6px; margin-top: 4px; font-size: 14px; font-weight: 900; }
  .amount-words { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px; margin-top: 12px; }
  .words-label { font-size: 9px; color: #94a3b8; font-weight: 900; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 3px; }
  .words-text { font-size: 12px; font-weight: 900; color: #1e293b; }
  .notes-box { margin-top: 14px; border-top: 1px solid #e2e8f0; padding-top: 10px; }
  .notes-label { font-size: 9px; font-weight: 900; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }
  .footer { margin-top: 20px; padding-top: 14px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: flex-end; }
  .footer-text { font-size: 10px; color: #94a3b8; line-height: 1.7; }
  .sig-area { text-align: right; }
  .sig-line { width: 120px; border-top: 1px solid #475569; margin-bottom: 4px; margin-left: auto; }
  .sig-label { font-size: 10px; font-weight: 900; color: #475569; }
  .sig-sub { font-size: 9px; color: #94a3b8; }
  @media print { body { padding: 10px; } }
</style>
</head>
<body>

<div class="header">
  <div>
    <div style="font-size:20px;font-weight:900;color:#1e293b;">${profile.businessName || 'Your Business'}</div>
    ${profile.businessAddress ? `<div class="party-line" style="margin-top:3px;">${profile.businessAddress}</div>` : ''}
    ${profile.state ? `<div class="party-line">${profile.state}</div>` : ''}
    ${profile.gstNumber ? `<div style="margin-top:4px;font-size:11px;font-weight:700;color:#4f46e5;">GSTIN: ${profile.gstNumber}</div>` : ''}
    ${profile.email ? `<div class="party-line">${profile.email}</div>` : ''}
    ${profile.phone ? `<div class="party-line">Ph: ${profile.phone}</div>` : ''}
  </div>
  <div style="text-align:right;">
    <div class="invoice-title">INVOICE</div>
    <div class="invoice-number">#${invoice.invoiceNumber || invoice.purchaseNumber || '-'}</div>
    ${invoice.poNumber ? `<div class="meta-line">PO: ${invoice.poNumber}</div>` : ''}
    <div class="meta-line" style="margin-top:5px;">Date: ${formatDate(invoice.invoiceDate)}</div>
    ${invoice.dueDate ? `<div class="meta-line">Due: ${formatDate(invoice.dueDate)}</div>` : ''}
    <div class="copy-badge">Original for Recipient</div>
  </div>
</div>

<div class="parties">
  <div class="party-box">
    <div class="party-label">Bill From</div>
    <div class="party-name">${profile.businessName || '-'}</div>
    ${profile.businessAddress ? `<div class="party-line">${profile.businessAddress}</div>` : ''}
    ${profile.state ? `<div class="party-line">${profile.state}</div>` : ''}
    ${profile.gstNumber ? `<span class="gstin-badge">GSTIN: ${profile.gstNumber}</span>` : ''}
  </div>
  <div class="party-box">
    <div class="party-label">Bill To</div>
    <div class="party-name">${invoice.client?.name || invoice.clientName || '-'}</div>
    ${invoice.client?.email ? `<div class="party-line">${invoice.client.email}</div>` : ''}
    ${invoice.client?.phone ? `<div class="party-line">Ph: ${invoice.client.phone}</div>` : ''}
    ${invoice.billingAddress ? `<div class="party-line">${invoice.billingAddress}</div>` : ''}
    ${invoice.buyerState ? `<div class="party-line">${invoice.buyerState}</div>` : ''}
    ${(invoice.client?.taxId || invoice.gstNumber) ? `<span class="gstin-badge">GSTIN: ${invoice.client?.taxId || invoice.gstNumber}</span>` : ''}
  </div>
</div>

<div class="supply-banner ${resolvedGstType === 'intra' ? 'supply-intra' : resolvedGstType === 'inter' ? 'supply-inter' : 'supply-none'}">
  ${resolvedGstType === 'intra' ? '✓ Intra-State Supply — CGST + SGST Applicable' : resolvedGstType === 'inter' ? '⚡ Inter-State Supply — IGST Applicable' : 'GST Supply Details'}
  ${invoice.sellerState && invoice.buyerState ? ` | ${invoice.sellerState} → ${invoice.buyerState}` : ''}
</div>

<table class="items">
<thead>
<tr>
  <th style="width:24px;">#</th>
  <th>Description</th>
  <th style="width:72px;">HSN/SAC</th>
  <th>HSN Description</th>
  <th style="width:36px;text-align:right;">Qty</th>
  <th style="width:80px;text-align:right;">Rate</th>
  <th style="width:46px;text-align:center;">Tax%</th>
  <th style="width:88px;text-align:right;">Amount</th>
</tr>
</thead>
<tbody>
${invoice.items.map((item, i) => {
  const hsn = item.hsnCode || '';
  const hsnDesc = getHsnDescription(hsn);
  const amt = (item.quantity || 0) * (item.price || 0);
  return `<tr>
    <td style="color:#94a3b8;">${i + 1}</td>
    <td><strong>${item.name || '-'}</strong>${item.sku ? `<br/><span style="font-size:10px;color:#94a3b8;font-family:monospace;">SKU: ${item.sku}</span>` : ''}</td>
    <td>${hsn ? `<span class="hsn-badge">${hsn}</span>` : '<span style="color:#94a3b8;">—</span>'}</td>
    <td style="font-size:10px;color:#475569;">${hsnDesc || '<span style="color:#94a3b8;">—</span>'}</td>
    <td style="text-align:right;">${item.quantity}</td>
    <td style="text-align:right;">${formatMoney(item.price)}</td>
    <td style="text-align:center;">${item.taxRate || invoice.globalTaxRate || 0}%</td>
    <td style="text-align:right;font-weight:900;">${formatMoney(amt)}</td>
  </tr>`;
}).join('')}
</tbody>
</table>

<div class="totals-wrap">
  <div class="totals-box">
    <div class="gst-box">
      <div class="gst-box-title">HSN / Tax Summary</div>
      <table class="gst-table">
      <thead>
        <tr>
          <th>HSN</th>
          <th style="text-align:right;">Taxable</th>
          ${resolvedGstType === 'intra'
            ? '<th style="text-align:right;color:#86efac;">CGST</th><th style="text-align:right;color:#86efac;">SGST</th>'
            : resolvedGstType === 'inter'
            ? '<th style="text-align:right;color:#fde68a;">IGST</th>'
            : '<th style="text-align:right;">CGST</th><th style="text-align:right;">SGST</th>'}
        </tr>
      </thead>
      <tbody>
        ${Object.entries(hsnSummary).map(([hsn, val]) => `
        <tr>
          <td>${hsn !== 'N/A' ? `<span class="hsn-badge" style="font-size:9px;">${hsn}</span>` : '<span style="color:#94a3b8;">N/A</span>'}</td>
          <td style="text-align:right;">${formatMoney(val.taxable)}</td>
          ${resolvedGstType === 'intra'
            ? `<td style="text-align:right;color:#16a34a;">${formatMoney(val.cgst)}</td><td style="text-align:right;color:#16a34a;">${formatMoney(val.sgst)}</td>`
            : resolvedGstType === 'inter'
            ? `<td style="text-align:right;color:#b45309;">${formatMoney(val.igst)}</td>`
            : `<td style="text-align:right;">${formatMoney(val.cgst)}</td><td style="text-align:right;">${formatMoney(val.sgst)}</td>`}
        </tr>`).join('')}
      </tbody>
      </table>
    </div>

    <div class="t-row"><span style="color:#64748b;">Subtotal</span><span>${formatMoney(subtotal)}</span></div>
    ${resolvedGstType === 'intra' ? `
    <div class="t-row"><span style="color:#16a34a;">CGST</span><span style="color:#16a34a;">${formatMoney(Object.values(hsnSummary).reduce((a,v)=>a+v.cgst,0))}</span></div>
    <div class="t-row"><span style="color:#16a34a;">SGST</span><span style="color:#16a34a;">${formatMoney(Object.values(hsnSummary).reduce((a,v)=>a+v.sgst,0))}</span></div>`
    : resolvedGstType === 'inter' ? `
    <div class="t-row"><span style="color:#b45309;">IGST</span><span style="color:#b45309;">${formatMoney(Object.values(hsnSummary).reduce((a,v)=>a+v.igst,0))}</span></div>`
    : `<div class="t-row"><span style="color:#64748b;">Tax</span><span>${formatMoney(taxTotal)}</span></div>`}
    ${Number(invoice.discount || 0) > 0 ? `<div class="t-row"><span style="color:#dc2626;">Discount</span><span style="color:#dc2626;">- ${formatMoney(invoice.discount)}</span></div>` : ''}
    <div class="grand-row"><span>Total Payable</span><span>${formatMoney(grandTotal)}</span></div>
  </div>
</div>

<div class="amount-words">
  <div class="words-label">Amount in Words</div>
  <div class="words-text">${amountInWords(grandTotal)}</div>
</div>

${invoice.notes ? `<div class="notes-box"><div class="notes-label">Notes / Terms</div><div style="font-size:11px;color:#475569;margin-top:4px;">${invoice.notes}</div></div>` : ''}

<div class="footer">
  <div>
    <div class="footer-text" style="font-weight:700;color:#1e293b;margin-bottom:2px;">Thank you for your business!</div>
    <div class="footer-text">${profile.email || ''}${profile.phone ? ' | Ph: ' + profile.phone : ''}</div>
    ${profile.gstNumber ? `<div class="footer-text">GSTIN: ${profile.gstNumber}</div>` : ''}
    <div class="footer-text" style="margin-top:6px;">This is a computer-generated invoice.</div>
    <div style="margin-top:12px;"><img src="${qrCode}" width="80"/></div>
  </div>
  <div class="sig-area">
    <div class="sig-line"></div>
    <div class="sig-label">Authorised Signatory</div>
    <div class="sig-sub">${profile.businessName || ''}</div>
  </div>
</div>

</body>
</html>`;

    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 500);

  } catch (err) {
    console.error(err);
    toast.error('Print failed');
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
                        <div className="text-[9px] text-slate-400 font-bold uppercase">
                          {inv.gstType === 'intra' ? 'CGST+SGST' : inv.gstType === 'inter' ? 'IGST' : ''}
                        </div>
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
                                    onClick={() => handleUpdateStatus(inv._id, st, inv.paidIntoAccount)}
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