// import { X, Trash2, Printer } from 'lucide-react';
// import { generateInvoicePDF } from '../utils/generatePDF';
// import jsPDF from 'jspdf';
// import autoTable from 'jspdf-autotable';
// const InvoiceDetail = ({ invoice, onClose }) => {
//   if (!invoice) return null;
// const printInvoice = () => {
//     const doc = new jsPDF();
//     const isSale = invoice.type === 'Sale';
//     doc.setFontSize(22);
//     doc.setTextColor(isSale ? 79 : 225, isSale ? 70 : 29, isSale ? 229 : 72);
//     doc.text(`${invoice.type.toUpperCase()} INVOICE`, 105, 20, { align: 'center' });
//     doc.setFontSize(10);
//     doc.setTextColor(40);
//     doc.text(`Invoice No: ${invoice.invoiceNumber || invoice.purchaseNumber || 'N/A'}`, 14, 30);
//     doc.text(`Date: ${new Date(invoice.invoiceDate || invoice.createdAt).toLocaleDateString()}`, 14, 35);
//     doc.text(`GSTIN: ${invoice.gstNumber || 'N/A'}`, 14, 40);
//     doc.text(`Party: ${invoice.client?.name || invoice.clientName || 'N/A'}`, 14, 45);
//     doc.text(`Billing Address: ${invoice.billingAddress || 'N/A'}`, 14, 50, { maxWidth: 80 });
//     autoTable(doc, {
//       startY: 65,
//       head: [['Item', 'Qty', 'Price', 'Total']],
//       body: (invoice.items || []).map(i => [
//         i.name, i.quantity,
//         `${symbol}${Number(i.price).toFixed(2)}`,
//         `${symbol}${(i.quantity * i.price).toFixed(2)}`
//       ]),
//       foot: [
//         ['', '', 'Subtotal', `${symbol}${Number(invoice.subtotal || 0).toFixed(2)}`],
//         ['', '', 'Tax', `${symbol}${Number(invoice.taxAmount || 0).toFixed(2)}`],
//         ['', '', 'Grand Total', `${symbol}${Number(invoice.totalAmount || 0).toFixed(2)}`]
//       ],
//       headStyles: { fillColor: isSale ? [79, 70, 229] : [225, 29, 72] },
//       footStyles: { fillColor: [245, 245, 245], textColor: [0, 0, 0], fontStyle: 'bold' }
//     });
//     doc.autoPrint();
//     window.open(doc.output('bloburl'), '_blank');
//   };
//   return (
//     <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
//       <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95">
//         {/* Invoice Header */}
//         <div className="p-8 border-b border-slate-100 flex justify-between items-start bg-slate-50">
//           <div>
//             <h2 className="text-4xl font-black text-slate-900 tracking-tighter">INVOICE</h2>
//             <p className="text-slate-500 mt-1">Ref: #{invoice._id.slice(-6).toUpperCase()}</p>
//           </div>
//           <button 
//             onClick={onClose} aria-label="Close invoice"  className="bg-white p-2 rounded-full shadow-sm hover:bg-red-50 hover:text-red-500 transition-all" > <X size={24} />
//             </button>
//         </div>

//         {/* Invoice Body */}
//         <div className="p-8 space-y-8">
//           <div className="grid grid-cols-2 gap-8">
//             <div>
//               <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Billed To</p>
//               <p className="text-xl font-bold text-slate-800 mt-1">{invoice.clientName}</p>
//             </div>
//             <div className="text-right">
//               <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Due Date</p>
//               <p className="text-lg font-semibold text-slate-800 mt-1">
//                 {new Date(invoice.dueDate).toLocaleDateString()}
//               </p>
//             </div>
//           </div>

//           {/* Table */}
//           <table className="w-full text-left">
//             <thead>
//               <tr className="text-slate-400 text-sm border-b border-slate-100">
//                 <th className="pb-4 font-medium">Description</th>
//                 <th className="pb-4 font-medium text-center">Qty</th>
//                 <th className="pb-4 font-medium text-right">Price</th>
//               </tr>
//             </thead>
//             <tbody className="divide-y divide-slate-50">
//               {invoice.items.map((item, i) => (
//                 <tr key={i} className="text-slate-700">
//                   <td className="py-4 font-semibold">{item.description}</td>
//                   <td className="py-4 text-center">{item.quantity}</td>
//                   <td className="py-4 text-right">{invoice.currencySymbol}{item.price.toLocaleString()}</td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>

//           {/* Final Total */}
//           <div className="flex justify-end">
//             <div className="w-64 space-y-3 bg-slate-50 p-6 rounded-2xl">
//               <div className="flex justify-between text-slate-500">
//                 <span>Tax ({invoice.taxRate}%)</span>
//                 <span>{invoice.currencySymbol}{ (invoice.totalAmount - (invoice.totalAmount / (1 + invoice.taxRate/100))).toFixed(2) }</span>
//               </div>
//               <div className="flex justify-between text-2xl font-black text-slate-900 border-t border-slate-200 pt-3">
//                 <span>Total</span>
//                 <span>{invoice.currencySymbol}{invoice.totalAmount.toLocaleString()}</span>
//               </div>
//             </div>
//           </div>
//         </div>

//         {/* Footer Actions */}
//         <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-4">
//           <button onClick={() => generateInvoicePDF(invoice)} className="flex-1 bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-all">
//             Download PDF</button>
//           <button onClick={printInvoice} className="px-6 py-3 border border-slate-200 font-bold rounded-xl hover:bg-white transition-all flex items-center gap-2">
//             <Printer size={16} /> Print
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// };
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

          {/* Notes */}
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
