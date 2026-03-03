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
  
  // Loading state to prevent duplicate submissions
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
    } else if (isOpen) {
      handleReset();
    }
  }, [editData, isOpen]);

  if (!isOpen) return null;

  const totalAmount = selectedItems.reduce(
    (sum, item) => sum + item.price * Number(item.quantity), 0
  );

  const handleReset = () => {
    setType('Sale');
    setInvoiceData(INITIAL_INVOICE);
    setSelectedItems([]);
    setSearchQuery('');
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
    if (isSubmitting) return; // Prevent duplicate clicks

    if (!invoiceData.clientId) return toast.warning('Select a client/vendor.');
    if (selectedItems.length === 0) return toast.warning('Add at least one product.');

    setIsSubmitting(true);
    try {
      const payload = {
        ...invoiceData,
        type,
        items: selectedItems,
      };

      if (editData) {
        // UPDATE MODE
        await api.put(`/invoices/${editData._id}`, payload);
        toast.success("✅ Invoice updated!");
        onRefresh();
        handleClose(); // Auto-close on edit success
      } else {
        // CREATE MODE
        const res = await api.post('/invoices', payload);
        const createdId = res.data._id || res.data.invoice?._id;
        setSavedInvoiceId(createdId);
        toast.success(`✅ ${type} saved!`);
        onRefresh();
        // We DON'T auto-close on Create so they can use the Pay button if they want
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Razorpay Payment Logic (Only for New Sales) ---
  const handleRazorpayPayment = async () => {
    const razorpayKey = import.meta.env.VITE_RAZORPAY_KEY_ID;
    if (!razorpayKey || !savedInvoiceId) return;
    
    // Safety check for bank accounts
    if (accounts.length === 0) {
      return toast.error("❌ No bank account found to receive payment.");
    }
    const targetAccountId = accounts[0]._id;

    setPaymentLoading(true);
    try {
      // FIXED: Endpoint changed to /create-order to match your backend exactly
      const { data: order } = await api.post('/payments/create-order', { 
        amount: totalAmount, 
        currency: 'INR' 
      });

      const options = {
        key: razorpayKey,
        amount: order.amount,
        currency: order.currency,
        name: 'Business Ledger',
        description: `Payment for Invoice #${savedInvoiceId.slice(-6)}`,
        order_id: order.id,
        handler: async (response) => {
          try {
            // Include accountId so the backend knows where to add the funds
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
        
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h2 className="text-xl font-black text-slate-800 uppercase">
              {editData ? 'Edit Invoice' : 'Create Invoice'}
            </h2>
          </div>
          <button onClick={handleClose} className="p-2 hover:bg-slate-200 rounded-full"><X /></button>
        </div>

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

          <div className="space-y-3">
            {selectedItems.map((item, index) => (
              <div key={index} className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div className="flex-1">
                  <p className="font-bold text-slate-800 text-sm">{item.name}</p>
                  <p className="text-[10px] text-slate-400">Rate: {item.price}</p>
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Qty</label>
                  <input type="number" min={1} className="w-20 p-2 rounded-xl border text-center font-bold text-sm" value={item.quantity} onChange={(e) => {
                    const updated = [...selectedItems];
                    updated[index].quantity = Number(e.target.value);
                    setSelectedItems(updated);
                  }} />
                </div>
                <button type="button" onClick={() => setSelectedItems(selectedItems.filter((_, i) => i !== index))} className="text-rose-500 hover:bg-rose-50 p-2 rounded-lg transition-colors"><Trash2 size={18} /></button>
              </div>
            ))}
            {selectedItems.length === 0 && (
              <div className="text-center py-10 border-2 border-dashed border-slate-100 rounded-3xl">
                <p className="text-slate-400 font-bold text-sm">No items added to invoice</p>
              </div>
            )}
          </div>
        </form>

        <div className="p-6 bg-slate-900 flex flex-col md:flex-row justify-between items-center gap-4 mt-auto">
          <div className="text-center md:text-left">
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Grand Total</p>
            <p className="text-white text-3xl font-black">₹{totalAmount.toLocaleString()}</p>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            {/* Update / Confirm Button */}
            <button 
              onClick={handleSubmit} 
              disabled={isSubmitting}
              className={`px-6 py-4 rounded-2xl font-black uppercase flex items-center gap-2 text-xs tracking-widest text-white transition-all ${isSubmitting ? 'bg-slate-600 cursor-not-allowed' : 'bg-emerald-500 hover:bg-emerald-400 shadow-lg shadow-emerald-500/20'}`}
            >
              {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
              {editData ? 'Update and Close' : 'Confirm & Save'}
            </button>

            {/* Pay Button: Hidden in Edit mode or if payment is already done */}
            {!editData && savedInvoiceId && !paymentDone && (
              <button 
                onClick={handleRazorpayPayment} 
                disabled={paymentLoading} 
                className={`px-6 py-4 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center gap-2 text-white transition-all ${paymentLoading ? 'bg-blue-800' : 'bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-500/20'}`}
              >
                {paymentLoading ? <Loader2 className="animate-spin" size={18} /> : <CreditCard size={18} />}
                {paymentLoading ? 'Opening Razorpay...' : 'Pay Now'}
              </button>
            )}

            <button onClick={handleClose} className="px-6 py-4 rounded-2xl font-black uppercase text-xs tracking-widest bg-slate-700 text-slate-300 hover:bg-slate-600 transition-all">
              {editData ? 'Cancel' : (savedInvoiceId ? 'Close' : 'Cancel')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceModal;