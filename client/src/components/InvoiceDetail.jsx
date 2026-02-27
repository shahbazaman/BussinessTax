import { generateInvoicePDF } from '../utils/generatePDF';
const InvoiceDetail = ({ invoice, onClose }) => {
  if (!invoice) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95">
        {/* Invoice Header */}
        <div className="p-8 border-b border-slate-100 flex justify-between items-start bg-slate-50">
          <div>
            <h2 className="text-4xl font-black text-slate-900 tracking-tighter">INVOICE</h2>
            <p className="text-slate-500 mt-1">Ref: #{invoice._id.slice(-6).toUpperCase()}</p>
          </div>
          <button 
            onClick={onClose} aria-label="Close invoice"  className="bg-white p-2 rounded-full shadow-sm hover:bg-red-50 hover:text-red-500 transition-all" > <X size={24} />
            </button>
        </div>

        {/* Invoice Body */}
        <div className="p-8 space-y-8">
          <div className="grid grid-cols-2 gap-8">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Billed To</p>
              <p className="text-xl font-bold text-slate-800 mt-1">{invoice.clientName}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Due Date</p>
              <p className="text-lg font-semibold text-slate-800 mt-1">
                {new Date(invoice.dueDate).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Table */}
          <table className="w-full text-left">
            <thead>
              <tr className="text-slate-400 text-sm border-b border-slate-100">
                <th className="pb-4 font-medium">Description</th>
                <th className="pb-4 font-medium text-center">Qty</th>
                <th className="pb-4 font-medium text-right">Price</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {invoice.items.map((item, i) => (
                <tr key={i} className="text-slate-700">
                  <td className="py-4 font-semibold">{item.description}</td>
                  <td className="py-4 text-center">{item.quantity}</td>
                  <td className="py-4 text-right">{invoice.currencySymbol}{item.price.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Final Total */}
          <div className="flex justify-end">
            <div className="w-64 space-y-3 bg-slate-50 p-6 rounded-2xl">
              <div className="flex justify-between text-slate-500">
                <span>Tax ({invoice.taxRate}%)</span>
                <span>{invoice.currencySymbol}{ (invoice.totalAmount - (invoice.totalAmount / (1 + invoice.taxRate/100))).toFixed(2) }</span>
              </div>
              <div className="flex justify-between text-2xl font-black text-slate-900 border-t border-slate-200 pt-3">
                <span>Total</span>
                <span>{invoice.currencySymbol}{invoice.totalAmount.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-4">
          <button onClick={() => generateInvoicePDF(invoice)} className="flex-1 bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-all">
            Download PDF</button>
          <button className="px-6 py-3 border border-slate-200 font-bold rounded-xl hover:bg-white transition-all">
            Print
          </button>
        </div>
      </div>
    </div>
  );
};