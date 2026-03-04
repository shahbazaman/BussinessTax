import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import { X, Search, Trash2, ShoppingCart, CreditCard, Landmark, CheckCircle, Download, Save, Loader2 } from 'lucide-react';
import api from '../utils/api.js';
import { toast } from 'react-toastify';

const INITIAL_INVOICE = { clientId: '', dueDate: '', status: 'Pending' };

const InvoiceModal = ({ isOpen, onClose, onRefresh, clients, products, accounts = [], editData }) => {
  const [type, setType] = useState('Sale');
  const [invoiceData, setInvoiceData] = useState(INITIAL_INVOICE);
  const [selectedItems, setSelectedItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [taxRate, setTaxRate] = useState(0); // Defined state
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
        status: editData.status || 'Pending'
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
    }
  }, [editData, isOpen]);

  // Handle Modal Closing early if not open
  if (!isOpen) return null;

  // --- CALCULATIONS (Fixed: Defined before use in JSX) ---
  const subtotal = selectedItems.reduce(
    (sum, item) => sum + item.price * Number(item.quantity), 0
  );
  const taxAmount = subtotal * (Number(taxRate || 0) / 100);
  const totalAmount = subtotal + taxAmount;

  const handleReset = () => {
    setType('Sale');
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
    if (isSubmitting) return;

    if (!invoiceData.clientId) return toast.warning('Select a client/vendor.');
    if (selectedItems.length === 0) return toast.warning('Add at least one product.');

    setIsSubmitting(true);
    try {
      const payload = {
        ...invoiceData,
        type,
        items: selectedItems,
        taxRate: Number(taxRate), // Send to backend
      };

      if (editData) {
        await api.put(`/invoices/${editData._id}`, payload);
        toast.success("✅ Invoice updated!");
        onRefresh();
        handleClose();
      } else {
        const res = await api.post('/invoices', payload);
        const createdId = res.data._id || res.data.invoice?._id;
        setSavedInvoiceId(createdId);
        toast.success(`✅ ${type} saved!`);
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
    
    const targetAccountId = accounts[0]._id;
    setPaymentLoading(true);
    try {
      const { data: order } = await api.post('/payments/create-order', { 
        amount: totalAmount, 
        currency: 'INR' 
      });

      const options = {
        key: razorpayKey,
        amount: order.amount,
        currency: order.currency,
        name: 'Business Ledger',
        description: `Invoice #${savedInvoiceId.slice(-6)}`,
        order_id: order.id,
        handler: async (response) => {
          try {
            await api.post('/payments/verify', { 
              ...response, 
              invoiceId: savedInvoiceId,
              accountId: targetAccountId 
            });
            setPaymentDone(true);
            toast.success("Payment Successful!");
            onRefresh();
            setTimeout(() => handleClose(), 1500);
          } catch (err) {
            toast.error("Verification failed");
            setPaymentLoading(false);
          }
        },
        modal: { ondismiss: () => setPaymentLoading(false) },
        theme: { color: "#0f172a" },
      };
      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) { 
      toast.error("Could not initiate payment");
      setPaymentLoading(false); 
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[2.5rem] w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h2 className="text-xl font-black text-slate-800 uppercase">
            {editData ? 'Edit Invoice' : 'Create Invoice'}
          </h2>
          <button onClick={handleClose} className="p-2 hover:bg-slate-200 rounded-full"><X /></button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Client/Vendor</label>
              <select className="w-full p-4 bg-slate-100 rounded-2xl outline-none font-bold" value={invoiceData.clientId} onChange={(e) => setInvoiceData({ ...invoiceData, clientId: e.target.value })} required>
                <option value="">Choose...</option>
                {clients.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Due Date</label>
              <input type="date" className="w-full p-4 bg-slate-100 rounded-2xl outline-none font-bold" value={invoiceData.dueDate} onChange={(e) => setInvoiceData({ ...invoiceData, dueDate: e.target.value })} required />
            </div>
          </div>

          {/* Items List */}
          <div className="space-y-3">
            {selectedItems.map((item, index) => (
              <div key={index} className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div className="flex-1">
                  <p className="font-bold text-slate-800 text-sm">{item.name}</p>
                  <p className="text-[10px] text-slate-400">Rate: ₹{item.price}</p>
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Qty</label>
                  <input type="number" min={1} className="w-20 p-2 rounded-xl border text-center font-bold text-sm" value={item.quantity} onChange={(e) => {
                    const updated = [...selectedItems];
                    updated[index].quantity = Number(e.target.value);
                    setSelectedItems(updated);
                  }} />
                </div>
                <button type="button" onClick={() => setSelectedItems(selectedItems.filter((_, i) => i !== index))} className="text-rose-500 hover:bg-rose-50 p-2 rounded-lg"><Trash2 size={18} /></button>
              </div>
            ))}
          </div>

          {/* Tax Section (The fix you requested) */}
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 grid grid-cols-2 gap-6 rounded-3xl">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Custom Tax (%)</label>
              <div className="relative">
                <input 
                  type="number" 
                  className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none font-bold text-slate-800"
                  placeholder="0"
                  value={taxRate}
                  onChange={(e) => setTaxRate(e.target.value)}
                />
                <span className="absolute right-4 top-4 font-bold text-slate-400">%</span>
              </div>
            </div>
            <div className="flex flex-col justify-center items-end pr-4">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Calculated Tax</p>
              <p className="text-lg font-black text-slate-800">₹{taxAmount.toLocaleString()}</p>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="p-6 bg-slate-900 flex flex-col md:flex-row justify-between items-center gap-4 mt-auto">
          <div className="text-center md:text-left">
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Grand Total</p>
            <p className="text-white text-3xl font-black">₹{totalAmount.toLocaleString()}</p>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            <button 
              onClick={handleSubmit} 
              disabled={isSubmitting}
              className={`px-6 py-4 rounded-2xl font-black uppercase flex items-center gap-2 text-xs tracking-widest text-white transition-all ${isSubmitting ? 'bg-slate-600' : 'bg-emerald-500 hover:bg-emerald-400 shadow-lg shadow-emerald-500/20'}`}
            >
              {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
              {editData ? 'Update and Close' : 'Confirm & Save'}
            </button>

            {!editData && savedInvoiceId && !paymentDone && (
              <button 
                onClick={handleRazorpayPayment} 
                disabled={paymentLoading} 
                className="px-6 py-4 rounded-2xl font-black uppercase text-xs bg-blue-600 text-white flex items-center gap-2 shadow-lg"
              >
                {paymentLoading ? <Loader2 className="animate-spin" size={18} /> : <CreditCard size={18} />}
                Pay Now
              </button>
            )}

            <button onClick={handleClose} className="px-6 py-4 rounded-2xl font-black uppercase text-xs bg-slate-700 text-slate-300">
              {savedInvoiceId ? 'Close' : 'Cancel'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceModal;