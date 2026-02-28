import React, { useState } from 'react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import InvoicePDF from './InvoicePDF';
import { FileDown, Plus, Trash2 } from 'lucide-react';

const CreateInvoice = () => {
  const [invoice, setInvoice] = useState({
    invoiceNumber: 'INV-001',
    date: new Date().toLocaleDateString(),
    dueDate: '',
    clientName: '',
    items: [{ description: '', quantity: 1, price: 0 }]
  });

  const addItem = () => {
    setInvoice({ ...invoice, items: [...invoice.items, { description: '', quantity: 1, price: 0 }] });
  };

  const calculateTotal = () => {
    return invoice.items.reduce((acc, item) => acc + (item.quantity * item.price), 0);
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-black text-slate-800">New Invoice</h2>
        
        {/* PDF Download Button */}
        <PDFDownloadLink
          document={<InvoicePDF data={{ ...invoice, total: calculateTotal(), subtotal: calculateTotal() }} />}
          fileName={`${invoice.invoiceNumber}.pdf`}
          className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-700 transition-all"
        >
          {({ loading }) => (loading ? 'Preparing...' : <><FileDown size={18} /> Download PDF</>)}
        </PDFDownloadLink>
      </div>

      <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
        <div className="grid grid-cols-2 gap-8 mb-8">
          <input 
            placeholder="Client Name" 
            className="p-4 bg-slate-50 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20"
            onChange={(e) => setInvoice({...invoice, clientName: e.target.value})}
          />
          <input 
            type="date" 
            className="p-4 bg-slate-50 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20"
            onChange={(e) => setInvoice({...invoice, dueDate: e.target.value})}
          />
        </div>

        {/* Dynamic Items Table */}
        <div className="space-y-4">
          {invoice.items.map((item, index) => (
            <div key={index} className="flex gap-4 items-center">
              <input 
                placeholder="Description" 
                className="flex-1 p-3 bg-slate-50 rounded-xl"
                value={item.description}
                onChange={(e) => {
                  const newItems = [...invoice.items];
                  newItems[index].description = e.target.value;
                  setInvoice({...invoice, items: newItems});
                }}
              />
              <input 
                type="number" 
                className="w-20 p-3 bg-slate-50 rounded-xl" 
                value={item.quantity}
                onChange={(e) => {
                   const newItems = [...invoice.items];
                   newItems[index].quantity = e.target.value;
                   setInvoice({...invoice, items: newItems});
                }}
              />
              <input 
                type="number" 
                className="w-32 p-3 bg-slate-50 rounded-xl" 
                value={item.price}
                onChange={(e) => {
                   const newItems = [...invoice.items];
                   newItems[index].price = e.target.value;
                   setInvoice({...invoice, items: newItems});
                }}
              />
            </div>
          ))}
          <button onClick={addItem} className="flex items-center gap-2 text-blue-600 font-bold text-sm mt-4">
            <Plus size={16} /> Add Line Item
          </button>
        </div>

        <div className="mt-8 pt-8 border-t border-slate-100 flex justify-end">
          <div className="text-right">
            <p className="text-slate-400 text-xs uppercase font-black">Total Amount</p>
            <p className="text-4xl font-black text-slate-800">${calculateTotal().toLocaleString()}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateInvoice;