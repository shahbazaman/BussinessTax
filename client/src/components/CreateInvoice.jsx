import React, { useState, useEffect, useContext } from 'react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import InvoicePDF from './InvoicePDF';
import api from '../utils/api'; // Ensure this is imported
import { toast } from 'react-toastify';
import { 
  FileDown, Plus, Trash2, Receipt, Truck, Percent, 
  Calendar, User, Hash, Info, Package 
} from 'lucide-react';
import { CurrencyContext } from '../context/CurrencyContext';

const CreateInvoice = () => {
  const { symbol } = useContext(CurrencyContext);
  
  // State for dropdowns
  const [dbClients, setDbClients] = useState([]);
  const [dbProducts, setDbProducts] = useState([]);

  const [invoice, setInvoice] = useState({
    invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
    poNumber: '',
    date: new Date().toISOString().split('T')[0],
    dueDate: '',
    client: '', 
    items: [{ productId: '', variantId: '', name: '', quantity: 1, price: 0, taxRate: 0 }],
    discount: 0,
    shipping: 0,
    notes: ''
  });

  const [totals, setTotals] = useState({ subtotal: 0, taxAmount: 0, totalAmount: 0 });

  // 1. Fetch Data for Selectors
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [clientRes, productRes] = await Promise.all([
          api.get('/clients'),
          api.get('/products')
        ]);
        setDbClients(clientRes.data);
        setDbProducts(productRes.data);
      } catch (err) {
        toast.error("Failed to load clients/products");
      }
    };
    fetchData();
  }, []);

  // 2. Real-time Calculations
  useEffect(() => {
    const subtotal = invoice.items.reduce((acc, item) => acc + (item.quantity * item.price), 0);
    const taxAmount = invoice.items.reduce((acc, item) => {
      return acc + (item.quantity * item.price * (item.taxRate / 100));
    }, 0);
    const totalAmount = (subtotal + taxAmount + Number(invoice.shipping)) - Number(invoice.discount);
    setTotals({ subtotal, taxAmount, totalAmount });
  }, [invoice]);

  // 3. Item Handlers
  const addItem = () => {
    setInvoice({ 
      ...invoice, 
      items: [...invoice.items, { productId: '', variantId: '', name: '', quantity: 1, price: 0, taxRate: 0 }] 
    });
  };

  const updateItem = (index, field, value) => {
    const newItems = [...invoice.items];
    
    // Special logic when selecting a product
    if (field === 'productId') {
      const selectedProd = dbProducts.find(p => p._id === value);
      newItems[index].productId = value;
      newItems[index].name = selectedProd?.title || '';
      // Default to first variant if exists
      if (selectedProd?.variants?.length > 0) {
        newItems[index].variantId = selectedProd.variants[0]._id;
        newItems[index].price = selectedProd.variants[0].price;
      }
    } else {
      newItems[index][field] = value;
    }
    
    setInvoice({ ...invoice, items: newItems });
  };

  // 4. Save to Cloud
  const handleSave = async () => {
    try {
      if (!invoice.client) return toast.error("Please select a client");
      if (!invoice.dueDate) return toast.error("Please select a due date");

      const payload = {
        ...invoice,
        clientId: invoice.client, // Matching controller expectation
        items: invoice.items.map(item => ({
          ...item,
          productId: item.productId,
          variantId: item.variantId
        }))
      };
      
      await api.post('/invoices', payload);
      toast.success("🚀 Invoice created & Stock updated!");
    } catch (err) {
      toast.error(err.response?.data?.message || "Creation Failed");
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Billing Terminal</h2>
          <p className="text-slate-500 font-medium">Enterprise-grade cloud ledger</p>
        </div>
        
        <div className="flex gap-3">
          <button onClick={handleSave} className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-900 transition-all shadow-xl">
            Save to Cloud
          </button>
          <PDFDownloadLink
            document={<InvoicePDF data={{ ...invoice, ...totals, symbol }} />}
            fileName={`${invoice.invoiceNumber}.pdf`}
            className="bg-white text-slate-900 px-6 py-4 rounded-2xl font-black text-xs uppercase border border-slate-200 flex items-center gap-2 hover:bg-slate-50 transition-all"
          >
            <FileDown size={18} />
          </PDFDownloadLink>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100">
            {/* Client & Date Selector */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1 flex items-center gap-1"><User size={12}/> Select Client</label>
                <select 
                  className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-bold text-sm"
                  value={invoice.client}
                  onChange={(e) => setInvoice({...invoice, client: e.target.value})}
                >
                  <option value="">Select a client...</option>
                  {dbClients.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1 flex items-center gap-1"><Calendar size={12}/> Due Date</label>
                <input 
                  type="date" 
                  className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-bold text-sm"
                  onChange={(e) => setInvoice({...invoice, dueDate: e.target.value})}
                />
              </div>
            </div>

            {/* Line Items */}
            <div className="space-y-4">
              {invoice.items.map((item, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-3 p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
                  <div className="col-span-4">
                    <label className="text-[9px] font-bold text-slate-400 uppercase mb-1 block">Product</label>
                    <select 
                      className="w-full p-2 bg-white rounded-xl text-sm font-bold outline-none"
                      onChange={(e) => updateItem(index, 'productId', e.target.value)}
                    >
                      <option value="">Choose Product</option>
                      {dbProducts.map(p => <option key={p._id} value={p._id}>{p.title}</option>)}
                    </select>
                  </div>
                  
                  <div className="col-span-3">
                    <label className="text-[9px] font-bold text-slate-400 uppercase mb-1 block">Variant</label>
                    <select 
                      className="w-full p-2 bg-white rounded-xl text-sm font-bold outline-none"
                      value={item.variantId}
                      onChange={(e) => updateItem(index, 'variantId', e.target.value)}
                    >
                      {dbProducts.find(p => p._id === item.productId)?.variants.map(v => (
                        <option key={v._id} value={v._id}>{v.name} (Stock: {v.stock})</option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase mb-1 block">Qty</label>
                    <input 
                      type="number" 
                      className="w-full p-2 bg-white rounded-xl text-sm font-bold outline-none" 
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))}
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="text-[9px] font-bold text-slate-400 uppercase mb-1 block">Price</label>
                    <input 
                      type="number" 
                      className="w-full p-2 bg-white rounded-xl text-sm font-bold outline-none" 
                      value={item.price}
                      onChange={(e) => updateItem(index, 'price', Number(e.target.value))}
                    />
                  </div>

                  <div className="col-span-2 flex items-end justify-center pb-2">
                    <button onClick={() => setInvoice({ ...invoice, items: invoice.items.filter((_, i) => i !== index) })} className="text-rose-500 hover:bg-rose-50 p-2 rounded-lg transition-colors">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
              
              <button onClick={addItem} className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center gap-2 text-slate-400 font-black text-xs uppercase hover:border-blue-400 hover:text-blue-500 transition-all">
                <Plus size={16} /> Add Product
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar Summary */}
        <div className="space-y-6">
          <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-xl">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-6">Financial Summary</h3>
            <div className="space-y-4 mb-8">
              <div className="flex justify-between text-sm font-bold">
                <span className="text-slate-400">Subtotal</span>
                <span>{symbol}{totals.subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm font-bold">
                <span className="text-slate-400">Tax</span>
                <span>{symbol}{totals.taxAmount.toLocaleString()}</span>
              </div>
            </div>
            <div className="pt-6 border-t-4 border-double border-slate-800">
              <p className="text-[10px] font-black uppercase text-blue-400 mb-1">Total Payable</p>
              <p className="text-4xl font-black">{symbol}{totals.totalAmount.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateInvoice;