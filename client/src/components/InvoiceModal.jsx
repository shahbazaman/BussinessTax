import React, { useState, useEffect } from 'react';
import { X, Search, Trash2, CreditCard, Save, Loader2, Plus, ShoppingCart, ShoppingBag } from 'lucide-react';
import api from '../utils/api.js';
import { toast } from 'react-toastify';

const INITIAL_INVOICE = { 
  clientId: '', 
  dueDate: '', 
  status: 'Pending',
  gstNumber: '',
  billingAddress: '',
  shippingAddress: '',
  discount: 0
};

const InvoiceModal = ({ isOpen, onClose, onRefresh, clients, products, accounts = [], editData, initialType = 'Sale' }) => {
  const [type, setType] = useState('Sale');
  const [invoiceData, setInvoiceData] = useState(INITIAL_INVOICE);
  const [selectedItems, setSelectedItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [taxRate, setTaxRate] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [savedInvoiceId, setSavedInvoiceId] = useState(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentDone, setPaymentDone] = useState(false);

  useEffect(() => {
    if (editData && isOpen) {
      setType(editData.type || 'Sale');
      setInvoiceData({
        clientId: editData.client?._id || editData.client || '',
        dueDate: editData.dueDate ? new Date(editData.dueDate).toISOString().split('T')[0] : '',
        status: editData.status || 'Pending',
        gstNumber: editData.gstNumber || '',
        billingAddress: editData.billingAddress || '',
        shippingAddress: editData.shippingAddress || '',
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
    }
  }, [editData, isOpen, initialType]);

  if (!isOpen) return null;

  // --- Calculations ---
  const subtotal = selectedItems.reduce((sum, item) => sum + item.price * Number(item.quantity), 0);
  const taxAmount = subtotal * (Number(taxRate || 0) / 100);
  const totalAmount = (subtotal + taxAmount) - Number(invoiceData.discount || 0);

  const filteredProducts = products.filter(p => 
    p.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const addItem = (product, variant) => {
    const exists = selectedItems.find(item => item.variantId === variant._id);
    if (exists) return toast.info("Item already added.");
    
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
    setSavedInvoiceId(null);
    setIsSubmitting(false);
    setPaymentDone(false);
    setPaymentLoading(false);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (isSubmitting || (savedInvoiceId && !editData)) return;

    if (!invoiceData.clientId) return toast.warning(`Select a ${type === 'Sale' ? 'client' : 'vendor'}.`);
    if (selectedItems.length === 0) return toast.warning('Add at least one product.');

    setIsSubmitting(true);
    try {
      const payload = { 
        ...invoiceData, 
        type, 
        items: selectedItems, 
        taxRate: Number(taxRate),
        totalAmount: Number(totalAmount),
        discount: Number(invoiceData.discount)
      };

      if (editData) {
        await api.put(`/invoices/${editData._id}`, payload);
        toast.success("✅ Record updated!");
        onRefresh();
        handleClose();
      } else {
        const res = await api.post('/invoices', payload);
        setSavedInvoiceId(res.data._id);
        toast.success(`✅ ${type} saved successfully!`);
        onRefresh();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRazorpayPayment = async () => {
    const razorpayKey = import.meta.env.VITE_RAZORPAY_KEY_ID;
    if (!razorpayKey || !savedInvoiceId) return;
    if (accounts.length === 0) return toast.error("❌ No bank account found.");
    
    setPaymentLoading(true);
    try {
      const { data: order } = await api.post('/payments/create-order', { amount: totalAmount, currency: 'INR' });
      const options = {
        key: razorpayKey,
        amount: order.amount,
        currency: order.currency,
        name: 'Business Ledger',
        order_id: order.id,
        handler: async (response) => {
          try {
            await api.post('/payments/verify', { ...response, invoiceId: savedInvoiceId, accountId: accounts[0]._id });
            setPaymentDone(true);
            toast.success("Payment Successful!");
            onRefresh();
            setTimeout(() => handleClose(), 1500);
          } catch (err) { toast.error("Verification failed"); setPaymentLoading(false); }
        },
        modal: { ondismiss: () => setPaymentLoading(false) },
        theme: { color: "#0f172a" },
      };
      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) { toast.error("Could not initiate payment"); setPaymentLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[2.5rem] w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h2 className="text-xl font-black text-slate-800 uppercase">
            {editData ? `Edit ${type}` : `New ${type} Entry`}
          </h2>
          <button onClick={handleClose} className="p-2 hover:bg-slate-200 rounded-full"><X /></button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* TYPE TOGGLE */}
          {!editData && (
            <div className="flex bg-slate-100 p-1 rounded-2xl w-full border border-slate-200">
                <button type="button" onClick={() => setType('Sale')}
                className={`flex-1 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 transition-all ${type === 'Sale' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}>
                <ShoppingCart size={14}/> Sales Invoice
                </button>
                <button type="button" onClick={() => setType('Purchase')}
                className={`flex-1 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 transition-all ${type === 'Purchase' ? 'bg-white shadow-sm text-rose-600' : 'text-slate-400'}`}>
                <ShoppingBag size={14}/> Purchase Invoice
                </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1 md:col-span-1">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-2">
                {type === 'Sale' ? 'Client / Customer' : 'Vendor / Supplier'}
              </label>
              <select className="w-full p-4 bg-slate-100 rounded-2xl outline-none font-bold text-xs" value={invoiceData.clientId} onChange={(e) => setInvoiceData({ ...invoiceData, clientId: e.target.value })} required>
                <option value="">Choose...</option>
                {clients.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Due Date</label>
              <input type="date" className="w-full p-4 bg-slate-100 rounded-2xl outline-none font-bold text-xs" value={invoiceData.dueDate} onChange={(e) => setInvoiceData({ ...invoiceData, dueDate: e.target.value })} required />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-2">
                {type === 'Sale' ? 'Customer GST' : 'Vendor GST'}
              </label>
              <input type="text" placeholder="Optional" className="w-full p-4 bg-slate-100 rounded-2xl outline-none font-bold text-xs" value={invoiceData.gstNumber} onChange={(e) => setInvoiceData({ ...invoiceData, gstNumber: e.target.value })} />
            </div>
          </div>

          {/* ADDRESS SECTION - Conditionally hide Shipping for Purchase */}
          <div className={`grid grid-cols-1 ${type === 'Sale' ? 'md:grid-cols-2' : 'md:grid-cols-1'} gap-4`}>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-2">
                {type === 'Sale' ? 'Billing Address' : 'Vendor Address'}
              </label>
              <textarea placeholder="Full address..." rows="2" className="w-full p-4 bg-slate-100 rounded-2xl outline-none font-bold text-xs resize-none" value={invoiceData.billingAddress} onChange={(e) => setInvoiceData({ ...invoiceData, billingAddress: e.target.value })} />
            </div>
            {type === 'Sale' && (
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Shipping Address</label>
                <textarea placeholder="Delivery address..." rows="2" className="w-full p-4 bg-slate-100 rounded-2xl outline-none font-bold text-xs resize-none" value={invoiceData.shippingAddress} onChange={(e) => setInvoiceData({ ...invoiceData, shippingAddress: e.target.value })} />
              </div>
            )}
          </div>

          {/* PRODUCT SEARCH */}
          <div className="space-y-2 relative">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Add Items</label>
            <div className="relative">
              <Search className="absolute left-4 top-4 text-slate-400" size={20} />
              <input type="text" placeholder="Search inventory..." className="w-full p-4 pl-12 bg-slate-100 rounded-2xl outline-none font-bold text-slate-800 border-2 border-transparent focus:border-indigo-500 transition-all text-sm" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
            {searchQuery && (
              <div className="absolute z-10 w-full bg-white border border-slate-200 rounded-2xl shadow-xl max-h-60 overflow-y-auto mt-1">
                {filteredProducts.map(p => p.variants.map(v => (
                  <div key={v._id} onClick={() => addItem(p, v)} className="p-4 hover:bg-slate-50 cursor-pointer flex justify-between items-center border-b border-slate-50 last:border-0">
                    <div>
                      <p className="font-bold text-slate-800 text-sm">{p.title}</p>
                      <p className="text-[10px] text-slate-500">{v.name} • Stock: {v.stock}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-indigo-600 text-sm">₹{v.price}</p>
                      <Plus size={16} className="ml-auto text-slate-400" />
                    </div>
                  </div>
                )))}
              </div>
            )}
          </div>

          {/* Selected Items List */}
          <div className="space-y-3">
            {selectedItems.map((item, index) => (
              <div key={index} className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div className="flex-1">
                  <p className="font-bold text-slate-800 text-sm">{item.name}</p>
                  <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase">Rate: ₹{item.price}</p>
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Qty</label>
                  <input type="number" min={1} className="w-16 p-2 rounded-xl border text-center font-black text-slate-800 text-sm" value={item.quantity} onChange={(e) => {
                    const updated = [...selectedItems];
                    updated[index].quantity = Number(e.target.value);
                    setSelectedItems(updated);
                  }} />
                </div>
                <button type="button" onClick={() => setSelectedItems(selectedItems.filter((_, i) => i !== index))} className="text-rose-500 hover:bg-rose-100 p-2 rounded-xl transition-colors"><Trash2 size={18} /></button>
              </div>
            ))}
          </div>

          {/* TAX, DISCOUNT & SUBTOTAL CALCULATION */}
          <div className="p-6 bg-slate-50 border border-slate-100 grid grid-cols-1 md:grid-cols-4 gap-4 rounded-4xl">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Tax Rate (%)</label>
              <input type="number" className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none font-bold text-sm" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Discount (₹)</label>
              <input type="number" className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none font-bold text-sm" value={invoiceData.discount} onChange={(e) => setInvoiceData({...invoiceData, discount: e.target.value})} />
            </div>
            <div className="flex flex-col justify-center items-end border-r border-slate-200 pr-4">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Subtotal</p>
              <p className="text-sm font-bold text-slate-600">₹{subtotal.toLocaleString()}</p>
            </div>
            <div className="flex flex-col justify-center items-end">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tax Amt</p>
              <p className="text-sm font-black text-indigo-600">₹{taxAmount.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={`p-6 flex flex-col md:flex-row justify-between items-center gap-4 mt-auto transition-colors duration-500 ${type === 'Sale' ? 'bg-indigo-900' : 'bg-rose-900'}`}>
          <div className="text-center md:text-left">
            <p className="text-slate-300 text-[10px] font-black uppercase tracking-widest">
                {type === 'Sale' ? 'Final Amount to Collect' : 'Final Amount to Pay'}
            </p>
            <p className="text-white text-4xl font-black tracking-tight">₹{totalAmount.toLocaleString()}</p>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            <button 
                onClick={handleSubmit} 
                disabled={isSubmitting || (savedInvoiceId && !editData)} 
                className="px-8 py-4 rounded-2xl font-black uppercase flex items-center gap-2 text-xs bg-white text-slate-900 hover:bg-slate-100 shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
              {editData ? 'Update' : (savedInvoiceId ? 'Saved' : 'Save')}
            </button>

            {/* ONLY SHOW RAZORPAY FOR SALES */}
            {!editData && savedInvoiceId && !paymentDone && type === 'Sale' && (
              <button onClick={handleRazorpayPayment} disabled={paymentLoading} className="px-8 py-4 rounded-2xl font-black uppercase text-xs bg-blue-500 text-white flex items-center gap-2 shadow-lg hover:bg-blue-400">
                {paymentLoading ? <Loader2 className="animate-spin" size={18} /> : <CreditCard size={18} />}
                Pay Now
              </button>
            )}
            
            <button onClick={handleClose} className="px-8 py-4 rounded-2xl font-black uppercase text-xs bg-black/20 text-white/80 hover:bg-black/40">
              {savedInvoiceId ? 'Finish' : 'Cancel'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceModal;