import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import { X, Search, Trash2, ShoppingCart, CreditCard, Landmark, CheckCircle, Download, Save } from 'lucide-react';
import api from '../utils/api.js';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

const INITIAL_INVOICE = { clientId: '', dueDate: '', status: 'Pending' };

const InvoiceModal = ({ isOpen, onClose, onRefresh, clients, products, accounts = [], editData }) => {
  const [type, setType] = useState('Sale');
  const [invoiceData, setInvoiceData] = useState(INITIAL_INVOICE);
  const [selectedItems, setSelectedItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [savedInvoiceId, setSavedInvoiceId] = useState(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentDone, setPaymentDone] = useState(false);

  // ── NEW: Populate form when editing ──────────────────────────────────────
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
      setSavedInvoiceId(editData._id); // Mark as saved so update logic triggers
    } else if (isOpen) {
      handleReset(); // Reset if opening for a new invoice
    }
  }, [editData, isOpen]);

  if (!isOpen) return null;

  const totalAmount = selectedItems.reduce(
    (sum, item) => sum + item.price * Number(item.quantity), 0
  );

  const searchResults = products
    .flatMap((p) =>
      p.variants.map((v) => ({
        ...v,
        productId: p._id,
        productTitle: p.title,
        displayLabel: `${p.title} (${v.weight}${v.unit})`,
      }))
    )
    .filter((item) =>
      item.displayLabel.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const handleReset = () => {
    setType('Sale');
    setInvoiceData(INITIAL_INVOICE);
    setSelectedItems([]);
    setSearchQuery('');
    setSelectedAccountId('');
    setSavedInvoiceId(null);
    setPaymentLoading(false);
    setPaymentDone(false);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleAddItem = (variant) => {
    if (selectedItems.find((i) => i.variantId === variant._id))
      return toast.info('Item already added.');

    setSelectedItems([
      ...selectedItems,
      {
        productId: variant.productId,
        variantId: variant._id,
        name: variant.displayLabel,
        price: variant.price,
        quantity: 1,
      },
    ]);
    setSearchQuery('');
  };

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    if (!invoiceData.clientId) return toast.warning('Select a client/vendor.');
    if (selectedItems.length === 0) return toast.warning('Add at least one product.');

    try {
      const payload = {
        ...invoiceData,
        type,
        items: selectedItems,
      };

      if (editData) {
        // UPDATE EXISTING (Uses your controller's updateInvoice)
        await api.put(`/invoices/${editData._id}`, payload);
        toast.success("✅ Invoice updated successfully!");
      } else {
        // CREATE NEW
        const res = await api.post('/invoices', payload);
        const createdId = res.data._id || res.data.invoice?._id;
        setSavedInvoiceId(createdId);
        toast.success(`✅ ${type} invoice saved!`);
      }
      onRefresh();
      if(editData) handleClose(); // Auto-close only if editing
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save.');
    }
  };

  const downloadReceipt = () => {
    const doc = new jsPDF();
    doc.setFont("helvetica", "bold");
    doc.text("PAYMENT RECEIPT", 105, 20, { align: "center" });
    doc.text(`Invoice ID: #${savedInvoiceId.slice(-6).toUpperCase()}`, 20, 40);
    doc.text(`Total Amount: ${totalAmount}`, 20, 60);
    doc.save(`Receipt_${savedInvoiceId.slice(-6)}.pdf`);
  };

  const handleRazorpayPayment = async () => {
    const razorpayKey = import.meta.env.VITE_RAZORPAY_KEY_ID;
    if (!razorpayKey || !savedInvoiceId || !selectedAccountId) return toast.warning("Missing payment info");
    
    setPaymentLoading(true);
    try {
      const { data: order } = await api.post('/payments/order', { amount: totalAmount, currency: 'INR' });
      const options = {
        key: razorpayKey,
        amount: order.amount,
        currency: order.currency,
        name: 'BusinessTax Ledger',
        order_id: order.id,
        handler: async (response) => {
          await api.post('/payments/verify', { ...response, invoiceId: savedInvoiceId, accountId: selectedAccountId });
          setPaymentDone(true);
          setPaymentLoading(false);
          onRefresh();
        },
        modal: { ondismiss: () => setPaymentLoading(false) },
      };
      new window.Razorpay(options).open();
    } catch { setPaymentLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[2.5rem] w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h2 className="text-xl font-black text-slate-800 uppercase">
              {editData ? 'Edit Invoice' : 'Create Invoice'}
            </h2>
            <div className="flex gap-2 mt-2">
              <button type="button" onClick={() => setType('Sale')} className={`px-4 py-1 rounded-full text-[10px] font-bold ${type === 'Sale' ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500'}`}>SALES</button>
              <button type="button" onClick={() => setType('Purchase')} className={`px-4 py-1 rounded-full text-[10px] font-bold ${type === 'Purchase' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'}`}>PURCHASE</button>
            </div>
          </div>
          <button onClick={handleClose} className="p-2 hover:bg-slate-200 rounded-full"><X /></button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Client/Vendor</label>
              <select className="w-full p-4 bg-slate-100 rounded-2xl outline-none" value={invoiceData.clientId} onChange={(e) => setInvoiceData({ ...invoiceData, clientId: e.target.value })} required>
                <option value="">Choose...</option>
                {clients.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Due Date</label>
              <input type="date" className="w-full p-4 bg-slate-100 rounded-2xl outline-none" value={invoiceData.dueDate} onChange={(e) => setInvoiceData({ ...invoiceData, dueDate: e.target.value })} required />
            </div>
          </div>

          {/* Search & Items */}
          <div className="relative">
            <div className="flex items-center bg-slate-100 rounded-2xl px-4">
              <Search size={18} className="text-slate-400" />
              <input type="text" placeholder="Search products..." className="w-full p-4 bg-transparent outline-none" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
            {searchQuery && (
              <div className="absolute w-full mt-2 bg-white border rounded-2xl shadow-xl z-10 max-h-40 overflow-y-auto">
                {searchResults.map((v) => (
                  <div key={v._id} onClick={() => handleAddItem(v)} className="p-4 hover:bg-blue-50 cursor-pointer flex justify-between">
                    <span className="font-bold text-slate-700">{v.displayLabel}</span>
                    <span className="text-xs text-slate-400">Stock: {v.stock}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3">
            {selectedItems.map((item, index) => (
              <div key={index} className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div className="flex-1">
                  <p className="font-bold text-slate-800 text-sm">{item.name}</p>
                  <p className="text-[10px] text-slate-400">${item.price}</p>
                </div>
                <input type="number" min={1} className="w-20 p-2 rounded-xl border text-center font-bold text-sm" value={item.quantity} onChange={(e) => {
                  const updated = [...selectedItems];
                  updated[index].quantity = Number(e.target.value);
                  setSelectedItems(updated);
                }} />
                <button type="button" onClick={() => setSelectedItems(selectedItems.filter((_, i) => i !== index))} className="text-rose-500"><Trash2 size={18} /></button>
              </div>
            ))}
          </div>

          {/* Payment Section (Hidden during initial edit if not needed) */}
          {type === 'Sale' && accounts.length > 0 && (
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Receiving Account</label>
              <select className="w-full p-4 bg-slate-100 rounded-2xl outline-none" value={selectedAccountId} onChange={(e) => setSelectedAccountId(e.target.value)}>
                <option value="">Select account...</option>
                {accounts.map((acc) => <option key={acc._id} value={acc._id}>{acc.bankName}</option>)}
              </select>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="p-6 bg-slate-900 flex justify-between items-center gap-4">
          <div>
            <p className="text-slate-400 text-[10px] font-black uppercase">Grand Total</p>
            <p className="text-white text-2xl font-black">${totalAmount.toLocaleString()}</p>
          </div>
          <div className="flex gap-3">
            <button onClick={handleSubmit} className="px-6 py-4 rounded-2xl font-black uppercase bg-emerald-500 text-white flex items-center gap-2 text-sm">
              <Save size={18} /> {editData ? 'Update Invoice' : 'Confirm Sale'}
            </button>
            {savedInvoiceId && type === 'Sale' && !paymentDone && (
              <button onClick={handleRazorpayPayment} className="px-6 py-4 rounded-2xl font-black uppercase bg-blue-600 text-white flex items-center gap-2 text-sm">
                <CreditCard size={18} /> Pay
              </button>
            )}
            <button onClick={handleClose} className="px-6 py-4 rounded-2xl font-black uppercase text-sm bg-slate-700 text-slate-300">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceModal;