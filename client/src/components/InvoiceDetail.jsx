import React, { useContext } from 'react';
import { X, Download, Printer } from 'lucide-react';
import { generateInvoicePDF, printInvoicePDF } from '../utils/generatePDF';
import { CurrencyContext } from '../context/CurrencyContext';

const InvoiceDetail = ({ invoice, onClose }) => {
  if (!invoice) return null;
  const { symbol } = useContext(CurrencyContext);
  const fmt = (n) => `${symbol}${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const gstType = invoice.gstType || 'none';

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="p-8 border-b border-slate-100 flex justify-between items-start bg-slate-50 shrink-0">
          <div>
            <h2 className="text-4xl font-black text-slate-900 tracking-tighter">INVOICE</h2>
            <p className="text-slate-500 mt-1 font-bold">#{invoice.invoiceNumber || invoice._id?.slice(-6).toUpperCase()}</p>
            {invoice.date && (
              <p className="text-xs text-slate-400 mt-1">Date: {new Date(invoice.date).toLocaleDateString('en-IN')}</p>
            )}
            {invoice.dueDate && (
              <p className="text-xs text-slate-400">Due: {new Date(invoice.dueDate).toLocaleDateString('en-IN')}</p>
            )}
          </div>
          <button onClick={onClose} className="bg-white p-2 rounded-full shadow-sm hover:bg-red-50 hover:text-red-500 transition-all">
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="p-8 space-y-6 overflow-y-auto">

          {/* Parties */}
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-slate-50 rounded-2xl p-4">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Billed To</p>
              <p className="text-lg font-black text-slate-800">{invoice.clientName || invoice.clientId?.name || '—'}</p>
              {invoice.buyerState && <p className="text-xs text-slate-500 mt-1">{invoice.buyerState}</p>}
            </div>
            <div className="bg-slate-50 rounded-2xl p-4 text-right">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">GST Type</p>
              {gstType === 'intra' && (
                <span className="inline-block bg-green-100 text-green-700 text-xs font-black px-3 py-1 rounded-full">Intra-State (CGST+SGST)</span>
              )}
              {gstType === 'inter' && (
                <span className="inline-block bg-amber-100 text-amber-700 text-xs font-black px-3 py-1 rounded-full">Inter-State (IGST)</span>
              )}
              {gstType === 'none' && (
                <span className="inline-block bg-slate-100 text-slate-500 text-xs font-black px-3 py-1 rounded-full">Standard Tax</span>
              )}
              {invoice.sellerState && invoice.buyerState && (
                <p className="text-[10px] text-slate-400 mt-2">{invoice.sellerState} → {invoice.buyerState}</p>
              )}
            </div>
          </div>

          {/* Items Table */}
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-900 text-white text-xs">
                <th className="px-4 py-3 rounded-tl-xl font-black">#</th>
                <th className="px-4 py-3 font-black">Description</th>
                <th className="px-4 py-3 font-black">HSN</th>
                <th className="px-4 py-3 text-center font-black">Qty</th>
                <th className="px-4 py-3 text-right font-black">Rate</th>
                <th className="px-4 py-3 text-center font-black">Tax%</th>
                <th className="px-4 py-3 text-right rounded-tr-xl font-black">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {(invoice.items || []).map((item, i) => (
                <tr key={i} className={i % 2 === 1 ? 'bg-slate-50' : ''}>
                  <td className="px-4 py-3 text-slate-400 text-xs">{i + 1}</td>
                  <td className="px-4 py-3 font-bold text-slate-800">{item.name || item.description}</td>
                  <td className="px-4 py-3">
                    {item.hsnCode ? (
                      <span className="text-[10px] font-black bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-lg">{item.hsnCode}</span>
                    ) : <span className="text-slate-300 text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3 text-center text-slate-600">{item.quantity}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{fmt(item.price)}</td>
                  <td className="px-4 py-3 text-center text-slate-500">{item.taxRate || 0}%</td>
                  <td className="px-4 py-3 text-right font-black text-slate-800">{fmt(item.quantity * item.price)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-72 space-y-2">
              <div className="flex justify-between text-sm font-bold text-slate-500 px-4">
                <span>Subtotal</span>
                <span>{fmt(invoice.subtotal)}</span>
              </div>

              {/* GST breakdown */}
              {gstType === 'intra' && (
                <>
                  <div className="flex justify-between text-sm font-bold text-green-600 px-4">
                    <span>CGST</span>
                    <span>{fmt(invoice.cgst)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-green-600 px-4">
                    <span>SGST</span>
                    <span>{fmt(invoice.sgst)}</span>
                  </div>
                </>
              )}
              {gstType === 'inter' && (
                <div className="flex justify-between text-sm font-bold text-amber-600 px-4">
                  <span>IGST</span>
                  <span>{fmt(invoice.igst)}</span>
                </div>
              )}
              {gstType === 'none' && (
                <div className="flex justify-between text-sm font-bold text-slate-500 px-4">
                  <span>Tax</span>
                  <span>{fmt(invoice.taxAmount)}</span>
                </div>
              )}

              {Number(invoice.discount) > 0 && (
                <div className="flex justify-between text-sm font-bold text-red-500 px-4">
                  <span>Discount</span>
                  <span>- {fmt(invoice.discount)}</span>
                </div>
              )}

              <div className="flex justify-between bg-slate-900 text-white font-black text-lg rounded-2xl px-4 py-3 mt-2">
                <span>Total</span>
                <span>{fmt(invoice.totalAmount)}</span>
              </div>
            </div>
          </div>

          {/* Payment Status */}
          <div className="bg-slate-50 rounded-2xl p-4">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Payment Status</p>
            <div className="flex flex-wrap gap-2 mb-3">
              {['Pending', 'Partially Paid', 'Paid', 'Cancelled'].map(s => (
                <button key={s}
                  onClick={async () => {
                    try {
                      await import('../utils/api').then(m => m.default.put(`/invoices/${invoice._id}/status`, { status: s }));
                      invoice.status = s;
                      window.location.reload();
                    } catch { }
                  }}
                  className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all border-2
                    ${invoice.status === s
                      ? s === 'Paid' ? 'bg-emerald-500 text-white border-emerald-500'
                        : s === 'Pending' ? 'bg-amber-500 text-white border-amber-500'
                        : s === 'Cancelled' ? 'bg-red-500 text-white border-red-500'
                        : 'bg-blue-500 text-white border-blue-500'
                      : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'
                    }`}>
                  {s}
                </button>
              ))}
            </div>
            {invoice.paidDate && (
              <p className="text-xs text-slate-500 font-bold">
                Paid on: {new Date(invoice.paidDate).toLocaleDateString('en-IN')}
              </p>
            )}
            {invoice.paymentMethod && (
              <p className="text-xs text-slate-500 font-bold">Method: {invoice.paymentMethod}</p>
            )}
          </div>
          {invoice.notes && (
            <div className="bg-slate-50 rounded-2xl p-4">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Notes</p>
              <p className="text-sm text-slate-600">{invoice.notes}</p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3 shrink-0">
          <button
            onClick={() => generateInvoicePDF(invoice, { symbol })}
            className="flex-1 bg-slate-900 text-white font-bold py-3 rounded-xl hover:bg-indigo-600 transition-all flex items-center justify-center gap-2"
          >
            <Download size={16} /> Download PDF
          </button>
          <button
            onClick={() => printInvoicePDF(invoice, { symbol })}
            className="px-6 py-3 border border-slate-200 font-bold rounded-xl hover:bg-white transition-all flex items-center gap-2 text-slate-700"
          >
            <Printer size={16} /> Print
          </button>
        </div>
      </div>
    </div>
  );
};

export default InvoiceDetail;
