import React, { useState, useEffect, useContext } from 'react';
import { Landmark, Receipt, ArrowUpRight, ArrowDownRight, Calculator, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import api from '../utils/api';
import { CurrencyContext } from '../context/CurrencyContext';
import { toast } from 'react-toastify';

const TaxReports = () => {
  const [invoices, setInvoices]   = useState([]);
  const [expenses, setExpenses]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const { symbol }                = useContext(CurrencyContext);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [invRes, expRes] = await Promise.all([
          api.get('/invoices'),
          api.get('/expenses')
        ]);
        setInvoices(invRes.data);
        setExpenses(expRes.data);
      } catch (err) {
        toast.error('Failed to load tax data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Tax collected = sum of taxAmount field on all Sale invoices
  // Uses the correct model field: inv.taxAmount (set by Invoice pre-save hook)
  const taxCollected = invoices
    .filter(inv => inv.type === 'Sale')
    .reduce((acc, inv) => acc + Number(inv.taxAmount || 0), 0);

  // Tax deductible on expenses (15% assumption)
  const taxDeductible = expenses
    .reduce((acc, exp) => acc + (Number(exp.amount || 0) * 0.15), 0);

  const netTaxOwed = taxCollected - taxDeductible;

  const fmt = (val) =>
    `${symbol}${Number(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const handleExportPDF = () => {
    const doc = new jsPDF();
    const today = new Date().toLocaleDateString();

    // Header
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Tax Report', 14, 20);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text(`Generated: ${today}`, 14, 28);

    // Summary boxes
    doc.setFontSize(11);
    doc.setTextColor(0);
    doc.setFont('helvetica', 'bold');
    doc.text('Summary', 14, 42);
    autoTable(doc, {
      startY: 46,
      head: [['Item', 'Amount']],
      body: [
        ['Tax Collected (from Sales)', fmt(taxCollected)],
        ['Tax Deductible (15% on Expenses)', fmt(taxDeductible)],
        ['Net Tax Owed', fmt(Math.abs(netTaxOwed))],
      ],
      styles: { fontSize: 10, fontStyle: 'bold' },
      headStyles: { fillColor: [15, 23, 42] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });

    // Invoice breakdown table
    const invoiceSales = invoices.filter(inv => inv.type === 'Sale');
    if (invoiceSales.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.text('Invoice Tax Breakdown', 14, doc.lastAutoTable.finalY + 14);
      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 18,
        head: [['Invoice No.', 'Client', 'Subtotal', 'Tax Rate', 'Tax Amount']],
        body: invoiceSales.map(inv => [
          inv.invoiceNumber || '—',
          inv.clientName || inv.client?.name || 'N/A',
          fmt(inv.subtotal),
          `${inv.globalTaxRate || 0}%`,
          fmt(inv.taxAmount),
        ]),
        styles: { fontSize: 9 },
        headStyles: { fillColor: [79, 70, 229] },
        alternateRowStyles: { fillColor: [248, 250, 252] },
      });
    }

    doc.save(`Tax-Report-${today.replace(/\//g, '-')}.pdf`);
    toast.success('Tax report exported!', { position: 'top-center' });
  };

  if (loading) return (
    <div className="flex justify-center items-center h-screen bg-slate-50">
      <div className="animate-pulse text-slate-400 font-black tracking-widest uppercase text-sm">
        Calculating Tax Liability...
      </div>
    </div>
  );

  return (
    <div className="p-4 lg:p-8 max-w-6xl mx-auto space-y-8 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900">Tax Reports</h1>
          <p className="text-slate-500 font-medium text-sm">Quarterly breakdown of your tax position.</p>
        </div>
        <button
        onClick={handleExportPDF}
        className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-800 transition-all text-sm"
      >
        <Download size={18} /> Export for Accountant
      </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div className="p-3 bg-blue-50 text-blue-600 w-fit rounded-2xl mb-4"><ArrowUpRight /></div>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Tax Collected</p>
          <h2 className="text-3xl font-black text-slate-900 mt-1">{fmt(taxCollected)}</h2>
          <p className="text-xs text-slate-400 mt-1">From GST/tax on sales invoices</p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div className="p-3 bg-amber-50 text-amber-600 w-fit rounded-2xl mb-4"><ArrowDownRight /></div>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Tax Deductible</p>
          <h2 className="text-3xl font-black text-slate-900 mt-1">{fmt(taxDeductible)}</h2>
          <p className="text-xs text-slate-400 mt-1">15% estimated deductible on expenses</p>
        </div>

        <div className={`p-6 rounded-3xl border shadow-lg ${netTaxOwed > 0 ? 'bg-red-50 border-red-100' : 'bg-emerald-50 border-emerald-100'}`}>
          <div className={`p-3 w-fit rounded-2xl mb-4 ${netTaxOwed > 0 ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'}`}>
            <Landmark />
          </div>
          <p className="text-slate-600 text-xs font-bold uppercase tracking-wider">Net Tax Owed</p>
          <h2 className={`text-3xl font-black mt-1 ${netTaxOwed > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
            {fmt(Math.abs(netTaxOwed))}
          </h2>
          <p className="text-xs text-slate-400 mt-1">{netTaxOwed <= 0 ? 'Credit / Overpaid' : 'Amount payable'}</p>
        </div>
      </div>

      {/* Tax Breakdown Table */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-50 font-black text-slate-800 uppercase text-xs tracking-widest">
          Detailed Invoice Tax Log
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest">
              <tr>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Client / Reference</th>
                <th className="px-6 py-4">Subtotal</th>
                <th className="px-6 py-4">Tax Rate</th>
                <th className="px-6 py-4 text-right">Tax Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {invoices.filter(inv => inv.type === 'Sale').length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-10 text-center text-slate-400 text-sm font-medium">
                    No sale invoices found.
                  </td>
                </tr>
              ) : invoices.filter(inv => inv.type === 'Sale').map(inv => (
                <tr key={inv._id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <span className="text-[10px] font-black bg-blue-50 text-blue-600 px-2 py-1 rounded-full uppercase">
                      Invoice
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-700 font-bold text-sm">
                    {inv.clientName || inv.client?.name || 'N/A'}
                    {inv.invoiceNumber && (
                      <span className="ml-2 text-[10px] text-slate-400 font-mono">#{inv.invoiceNumber}</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-slate-500 text-sm">{fmt(inv.subtotal)}</td>
                  <td className="px-6 py-4 text-slate-500 text-sm">{inv.globalTaxRate || 0}%</td>
                  <td className="px-6 py-4 text-right font-black text-rose-500 text-sm">
                    +{fmt(inv.taxAmount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TaxReports;