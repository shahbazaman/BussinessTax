import React, { useState, useEffect, useContext } from 'react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import InvoicePDF from './InvoicePDF';
import { 
  FileDown, Plus, Trash2, Receipt, Truck, Percent, 
  Calendar, User, Hash, Info 
} from 'lucide-react';
import { CurrencyContext } from '../context/CurrencyContext';

const CreateInvoice = () => {
  const { symbol } = useContext(CurrencyContext);
  
  const [invoice, setInvoice] = useState({
    invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
    poNumber: '',
    date: new Date().toISOString().split('T')[0],
    dueDate: '',
    client: '', // This should ideally be a Client ID from your dropdown
    items: [{ name: '', quantity: 1, price: 0, taxRate: 0 }],
    discount: 0,
    shipping: 0,
    notes: ''
  });

  const [totals, setTotals] = useState({
    subtotal: 0,
    taxAmount: 0,
    totalAmount: 0
  });

  // Calculate Finances in real-time
  useEffect(() => {
    const subtotal = invoice.items.reduce((acc, item) => acc + (item.quantity * item.price), 0);
    
    const taxAmount = invoice.items.reduce((acc, item) => {
      const itemTotal = item.quantity * item.price;
      return acc + (itemTotal * (item.taxRate / 100));
    }, 0);

    const totalAmount = (subtotal + taxAmount + Number(invoice.shipping)) - Number(invoice.discount);

    setTotals({ subtotal, taxAmount, totalAmount });
  }, [invoice]);

  const addItem = () => {
    setInvoice({ 
      ...invoice, 
      items: [...invoice.items, { name: '', quantity: 1, price: 0, taxRate: 0 }] 
    });
  };

  const removeItem = (index) => {
    const newItems = invoice.items.filter((_, i) => i !== index);
    setInvoice({ ...invoice, items: newItems });
  };

  const updateItem = (index, field, value) => {
    const newItems = [...invoice.items];
    newItems[index][field] = value;
    setInvoice({ ...invoice, items: newItems });
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Billing Terminal</h2>
          <p className="text-slate-500 font-medium">Create and distribute enterprise-grade invoices</p>
        </div>
        
        <PDFDownloadLink
          document={<InvoicePDF data={{ ...invoice, ...totals, symbol }} />}
          fileName={`${invoice.invoiceNumber}.pdf`}
          className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-blue-600 transition-all shadow-xl shadow-slate-200"
        >
          {({ loading }) => (loading ? 'Generating...' : <><FileDown size={18} /> Export PDF</>)}
        </PDFDownloadLink>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100">
            {/* Metadata Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1"><User size={12}/> Client Reference</label>
                <input 
                  placeholder="Client Name or ID" 
                  className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-bold text-sm"
                  onChange={(e) => setInvoice({...invoice, client: e.target.value})}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1"><Calendar size={12}/> Due Date</label>
                <input 
                  type="date" 
                  required
                  className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-bold text-sm"
                  onChange={(e) => setInvoice({...invoice, dueDate: e.target.value})}
                />
              </div>
            </div>

            {/* Line Items */}
            <div className="space-y-4">
              <div className="hidden md:grid grid-cols-12 gap-4 px-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <div className="col-span-5">Item Description</div>
                <div className="col-span-2">Qty</div>
                <div className="col-span-2">Price</div>
                <div className="col-span-2">Tax %</div>
                <div className="col-span-1"></div>
              </div>
              
              {invoice.items.map((item, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center bg-slate-50/50 p-2 rounded-2xl border border-transparent hover:border-slate-200 transition-all">
                  <div className="col-span-5">
                    <input 
                      placeholder="Service/Product Name" 
                      className="w-full p-3 bg-white rounded-xl text-sm font-bold outline-none"
                      value={item.name}
                      onChange={(e) => updateItem(index, 'name', e.target.value)}
                    />
                  </div>
                  <div className="col-span-2">
                    <input 
                      type="number" 
                      className="w-full p-3 bg-white rounded-xl text-sm font-bold outline-none" 
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))}
                    />
                  </div>
                  <div className="col-span-2">
                    <input 
                      type="number" 
                      className="w-full p-3 bg-white rounded-xl text-sm font-bold outline-none" 
                      value={item.price}
                      onChange={(e) => updateItem(index, 'price', Number(e.target.value))}
                    />
                  </div>
                  <div className="col-span-2">
                    <input 
                      type="number" 
                      placeholder="%"
                      className="w-full p-3 bg-white rounded-xl text-sm font-bold outline-none" 
                      value={item.taxRate}
                      onChange={(e) => updateItem(index, 'taxRate', Number(e.target.value))}
                    />
                  </div>
                  <div className="col-span-1 flex justify-center">
                    <button onClick={() => removeItem(index)} className="text-slate-300 hover:text-rose-500 transition-colors">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
              
              <button onClick={addItem} className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center gap-2 text-slate-400 font-black text-xs uppercase tracking-widest hover:border-blue-400 hover:text-blue-500 transition-all mt-4">
                <Plus size={16} /> Add Line Item
              </button>
            </div>
          </div>

          <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100">
             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1 mb-2"><Info size={12}/> Terms & Notes</label>
             <textarea 
               className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-medium text-sm min-h-25"
               placeholder="Payment instructions, bank details, or thank you message..."
               onChange={(e) => setInvoice({...invoice, notes: e.target.value})}
             />
          </div>
        </div>

        {/* Sidebar: Financial Summary */}
        <div className="space-y-6">
          <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-xl shadow-slate-200">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-6">Financial Summary</h3>
            
            <div className="space-y-4 mb-8">
              <div className="flex justify-between text-sm font-bold">
                <span className="text-slate-400">Subtotal</span>
                <span>{symbol}{totals.subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm font-bold">
                <span className="text-slate-400">Tax Accrued</span>
                <span>{symbol}{totals.taxAmount.toLocaleString()}</span>
              </div>
              
              <div className="pt-4 space-y-3 border-t border-slate-800">
                <div className="flex items-center gap-2">
                  <Truck size={14} className="text-slate-500"/>
                  <input 
                    type="number" 
                    placeholder="Shipping" 
                    className="bg-transparent border-b border-slate-700 w-full text-xs font-bold outline-none pb-1"
                    onChange={(e) => setInvoice({...invoice, shipping: e.target.value})}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Percent size={14} className="text-slate-500"/>
                  <input 
                    type="number" 
                    placeholder="Global Discount" 
                    className="bg-transparent border-b border-slate-700 w-full text-xs font-bold outline-none pb-1"
                    onChange={(e) => setInvoice({...invoice, discount: e.target.value})}
                  />
                </div>
              </div>
            </div>

            <div className="pt-6 border-t-4 border-double border-slate-800">
              <p className="text-[10px] font-black uppercase text-blue-400 mb-1">Total Payable</p>
              <p className="text-4xl font-black">{symbol}{totals.totalAmount.toLocaleString()}</p>
            </div>
          </div>

          <div className="bg-white rounded-4xl p-6 border border-slate-100">
             <div className="flex items-center gap-3 text-slate-400">
               <Hash size={18}/>
               <div>
                 <p className="text-[10px] font-black uppercase tracking-widest">Invoice ID</p>
                 <p className="text-sm font-black text-slate-800">{invoice.invoiceNumber}</p>
               </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateInvoice;