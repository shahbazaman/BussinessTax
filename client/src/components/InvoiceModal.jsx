import React, { useState, useEffect } from 'react';
import { X, Search, Trash2, Save, Loader2, ShoppingCart, ShoppingBag, Hash, Calendar, FileText } from 'lucide-react';
import api from '../utils/api.js';
import { toast } from 'react-toastify';

const INITIAL_INVOICE = { 
  clientId: '', 
  invoiceNumber: '',
  invoiceDate: new Date().toISOString().split('T')[0],
  dueDate: '', 
  status: 'Pending',
  gstNumber: '',
  billingAddress: '',
  shippingAddress: '',
  paymentTerms: '',
  paymentMethod: 'Cash',
  referenceNumber: '', 
  discount: 0
};

const InvoiceModal = ({ isOpen, onClose, onRefresh, clients, products, editData, initialType = 'Sale' }) => {
  const [type, setType] = useState('Sale');
  const [invoiceData, setInvoiceData] = useState(INITIAL_INVOICE);
  const [selectedItems, setSelectedItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [taxRate, setTaxRate] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (editData && isOpen) {
      setType(editData.type || 'Sale');
      setInvoiceData({
        clientId: editData.client?._id || editData.client || '',
        invoiceNumber: editData.invoiceNumber || '',
        invoiceDate: editData.invoiceDate ? new Date(editData.invoiceDate).toISOString().split('T')[0] : '',
        dueDate: editData.dueDate ? new Date(editData.dueDate).toISOString().split('T')[0] : '',
        status: editData.status || 'Pending',
        gstNumber: editData.gstNumber || '',
        billingAddress: editData.billingAddress || '',
        shippingAddress: editData.shippingAddress || '',
        paymentTerms: editData.paymentTerms || '',
        paymentMethod: editData.paymentMethod || 'Cash',
        referenceNumber: editData.referenceNumber || '',
        discount: editData.discount || 0
      });
      setSelectedItems(editData.items.map(item => ({
        productId: item.productId?._id || item.productId,
        variantId: item.variantId,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
      })));
      setTaxRate(editData.taxRate || 0);
    } else if (isOpen) {
      handleReset();
      setType(initialType);
      if (initialType === 'Sale') {
        setInvoiceData(prev => ({ ...prev, invoiceNumber: `INV-${Date.now().toString().slice(-6)}` }));
      }
    }
  }, [editData, isOpen, initialType]);

  if (!isOpen) return null;

  // Real-time Calculations for UI feedback
  const subtotal = selectedItems.reduce((sum, item) => sum + (Number(item.price) * Number(item.quantity)), 0);
  const taxAmount = subtotal * (Number(taxRate || 0) / 100);
  const totalAmount = (subtotal + taxAmount) - Number(invoiceData.discount || 0);

  const filteredProducts = products.filter(p => p.title.toLowerCase().includes(searchQuery.toLowerCase()));

  const addItem = (product, variant) => {
    if (selectedItems.find(item => item.variantId === variant._id)) return toast.info("Item already added.");
    setSelectedItems([...selectedItems, {
      productId: product._id,
      variantId: variant._id,
      name: `${product.title} (${variant.name})`,
      price: variant.price,
      quantity: 1
    }]);
    setSearchQuery('');
  };

  const handleReset = () => {
    setInvoiceData(INITIAL_INVOICE);
    setSelectedItems([]);
    setSearchQuery('');
    setTaxRate(0);
    setIsSubmitting(false);
  };

  const handleClose = () => { handleReset(); onClose(); };

  const handleSubmit = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    if (isSubmitting) return;
    if (!invoiceData.clientId) return toast.warning("Select a party.");
    if (type === 'Sale' && !invoiceData.invoiceNumber) return toast.warning("Invoice number is required.");
    if (selectedItems.length === 0) return toast.warning('Add at least one product.');

    setIsSubmitting(true);
    try {
      // CLEANING DATA: Ensure IDs are strings and rates are numbers
      const cleanedItems = selectedItems.map(item => ({
        productId: item.productId?._id || item.productId,
        variantId: item.variantId,
        name: item.name,
        price: Number(item.price),
        quantity: Number(item.quantity),
        taxRate: Number(taxRate) // Apply the modal's global tax rate to each item
      }));

      const payload = { 
        ...invoiceData, 
        type, 
        items: cleanedItems, 
        taxRate: Number(taxRate),
        totalAmount: Number(totalAmount) 
      };

      if (editData) {
        await api.put(`/invoices/${editData._id}`, payload);
        toast.success("Transaction Updated!");
      } else {
        await api.post('/invoices', payload);
        toast.success(`${type} Invoice Created!`);
      }
      onRefresh();
      handleClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[2.5rem] w-full max-w-4xl max-h-[95vh] overflow-hidden flex flex-col shadow-2xl">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h2 className="text-xl font-black text-slate-800 uppercase">{editData ? `Edit ${type}` : `New ${type}`}</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Stock-Adjusting Billing Module</p>
          </div>
          <button onClick={handleClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X /></button>
        </div>

        <div className="p-8 overflow-y-auto space-y-8 flex-1">
          {/* TYPE TOGGLE */}
          {!editData && (
            <div className="flex bg-slate-100 p-1.5 rounded-2xl w-full border border-slate-200">
              <button onClick={() => setType('Sale')} className={`flex-1 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 transition-all ${type === 'Sale' ? 'bg-white shadow-md text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}><ShoppingCart size={14}/> Sales Invoice</button>
              <button onClick={() => setType('Purchase')} className={`flex-1 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 transition-all ${type === 'Purchase' ? 'bg-white shadow-md text-rose-600' : 'text-slate-400 hover:text-slate-600'}`}><ShoppingBag size={14}/> Purchase Invoice</button>
            </div>
          )}

          {/* DOCUMENT DETAILS SECTION */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="space-y-1 md:col-span-1">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-2 flex items-center gap-1"><Hash size={10}/> {type === 'Sale' ? 'Inv No.' : 'Bill Ref No.'}</label>
              <input type="text" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-xs focus:ring-2 focus:ring-indigo-500/20" value={type === 'Sale' ? invoiceData.invoiceNumber : invoiceData.referenceNumber} onChange={(e) => setInvoiceData({ ...invoiceData, [type === 'Sale' ? 'invoiceNumber' : 'referenceNumber']: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-2 flex items-center gap-1"><Calendar size={10}/> Date</label>
              <input type="date" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-xs" value={invoiceData.invoiceDate} onChange={(e) => setInvoiceData({ ...invoiceData, invoiceDate: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-2 flex items-center gap-1"><Calendar size={10}/> Due Date</label>
              <input type="date" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-xs" value={invoiceData.dueDate} onChange={(e) => setInvoiceData({ ...invoiceData, dueDate: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-2 flex items-center gap-1"><FileText size={10}/> Terms</label>
              <select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-xs" value={invoiceData.paymentTerms} onChange={(e) => setInvoiceData({ ...invoiceData, paymentTerms: e.target.value })}>
                <option value="">Immediate</option>
                <option value="Net 15">Net 15</option>
                <option value="Net 30">Net 30</option>
                <option value="Net 60">Net 60</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-2">{type === 'Sale' ? 'Customer Name' : 'Supplier Name'}</label>
              <select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-xs" value={invoiceData.clientId} onChange={(e) => setInvoiceData({ ...invoiceData, clientId: e.target.value })}>
                <option value="">Choose Party...</option>
                {clients.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-2">GSTIN (Optional)</label>
              <input type="text" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-xs uppercase" value={invoiceData.gstNumber} onChange={(e) => setInvoiceData({ ...invoiceData, gstNumber: e.target.value })} />
            </div>
          </div>

          {/* Address Fields */}
          <div className={`grid grid-cols-1 ${type === 'Sale' ? 'md:grid-cols-2' : 'md:grid-cols-1'} gap-6`}>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Billing Address</label>
              <textarea placeholder="Address details..." rows="2" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-xs resize-none" value={invoiceData.billingAddress} onChange={(e) => setInvoiceData({ ...invoiceData, billingAddress: e.target.value })} />
            </div>
            {type === 'Sale' && (
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Shipping Address</label>
                <textarea placeholder="Delivery address..." rows="2" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-xs resize-none" value={invoiceData.shippingAddress} onChange={(e) => setInvoiceData({ ...invoiceData, shippingAddress: e.target.value })} />
              </div>
            )}
          </div>

          {/* Search & Items List */}
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input type="text" placeholder="Search products by title..." className="w-full p-4 pl-12 bg-white border-2 border-slate-100 rounded-2xl outline-none font-bold text-sm focus:border-indigo-500 transition-all shadow-sm" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              {searchQuery && (
                <div className="absolute z-10 w-full bg-white border border-slate-200 rounded-2xl shadow-2xl max-h-60 overflow-y-auto mt-2">
                  {filteredProducts.map(p => p.variants.map(v => (
                    <div key={v._id} onClick={() => addItem(p, v)} className="p-4 hover:bg-slate-50 cursor-pointer flex justify-between items-center border-b last:border-0 transition-colors">
                      <div>
                        <p className="font-bold text-slate-800 text-sm">{p.title}</p>
                        <p className="text-[10px] text-slate-500 font-bold uppercase">{v.name} • <span className={v.stock <= 5 ? 'text-rose-500' : 'text-emerald-500'}>Stock: {v.stock}</span></p>
                      </div>
                      <p className="font-black text-indigo-600 text-sm">₹{v.price}</p>
                    </div>
                  )))}
                </div>
              )}
            </div>

            <div className="space-y-3">
              {selectedItems.map((item, index) => (
                <div key={index} className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm animate-in fade-in slide-in-from-bottom-2">
                  <div className="flex-1">
                    <p className="font-bold text-slate-800 text-sm">{item.name}</p>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-tight">Rate: ₹{item.price.toLocaleString()}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center bg-slate-50 rounded-xl px-2">
                        <span className="text-[10px] font-black text-slate-400 mr-2">QTY</span>
                        <input type="number" min={1} className="w-16 p-2 bg-transparent text-center font-black text-sm outline-none" value={item.quantity} onChange={(e) => {
                        const updated = [...selectedItems];
                        updated[index].quantity = Math.max(1, Number(e.target.value));
                        setSelectedItems(updated);
                        }} />
                    </div>
                    <button onClick={() => setSelectedItems(selectedItems.filter((_, i) => i !== index))} className="text-rose-500 hover:bg-rose-50 p-2.5 rounded-xl transition-colors"><Trash2 size={18} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer Totals */}
          <div className="p-8 bg-slate-900 rounded-4xl text-white flex flex-col md:flex-row justify-between items-center gap-8 shadow-xl">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 w-full md:w-auto">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tax Rate (%)</p>
                <input type="number" className="bg-white/10 border border-white/20 rounded-xl p-2 w-20 text-white font-black text-sm outline-none focus:ring-1 focus:ring-white/40" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Discount (₹)</p>
                <input type="number" className="bg-white/10 border border-white/20 rounded-xl p-2 w-24 text-white font-black text-sm outline-none focus:ring-1 focus:ring-white/40" value={invoiceData.discount} onChange={(e) => setInvoiceData({...invoiceData, discount: e.target.value})} />
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tax Total</p>
                <p className="text-lg font-bold">₹{taxAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="text-right">
                <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${type === 'Sale' ? 'text-indigo-400' : 'text-rose-400'}`}>Grand Total</p>
                <p className="text-3xl font-black">₹{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
            
            <div className="flex gap-3 w-full md:w-auto">
              <button onClick={handleSubmit} disabled={isSubmitting} className={`flex-1 md:flex-none px-10 py-4 rounded-2xl font-black uppercase text-xs flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95 ${isSubmitting ? 'bg-slate-700 text-slate-400' : 'bg-white text-slate-900 hover:bg-slate-100'}`}>
                {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                {editData ? 'Update Record' : 'Save Invoice'}
              </button>
              <button onClick={handleClose} className="px-6 py-4 bg-white/10 text-white rounded-2xl font-black uppercase text-xs hover:bg-white/20 transition-colors">Cancel</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceModal;