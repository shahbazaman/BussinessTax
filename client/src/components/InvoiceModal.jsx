import React, { useState } from 'react';
import { jsPDF } from 'jspdf';
import { X, Search, Trash2, ShoppingCart, CreditCard, Landmark, CheckCircle, Download } from 'lucide-react';
import { X, Search, Trash2, ShoppingCart, CreditCard, Landmark, CheckCircle } from 'lucide-react';
import api from '../utils/api';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom'; // Add this
// ─── Helper: resets all form state back to initial values ───────────────────
const INITIAL_INVOICE = { clientId: '', dueDate: '', status: 'Pending' };

const InvoiceModal = ({ isOpen, onClose, onRefresh, clients, products, accounts = [] }) => {
  const [type, setType]                   = useState('Sale');
  const [invoiceData, setInvoiceData]     = useState(INITIAL_INVOICE);
  const [selectedItems, setSelectedItems] = useState([]);
  const [searchQuery, setSearchQuery]     = useState('');
  const navigate = useNavigate();
  // ── Razorpay / save state ─────────────────────────────────────────────────
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [savedInvoiceId, setSavedInvoiceId]       = useState(null);   // null = not saved yet
  const [paymentLoading, setPaymentLoading]       = useState(false);
  const [paymentDone, setPaymentDone]             = useState(false);   // true after Razorpay success

  if (!isOpen) return null;

  // ── Derived ───────────────────────────────────────────────────────────────
  const totalAmount = selectedItems.reduce(
    (sum, item) => sum + item.price * Number(item.quantity), 0
  );

  const searchResults = products
    .flatMap((p) =>
      p.variants.map((v) => ({
        ...v,
        productId:    p._id,
        productTitle: p.title,
        displayLabel: `${p.title} (${v.weight}${v.unit})`,
      }))
    )
    .filter((item) =>
      item.displayLabel.toLowerCase().includes(searchQuery.toLowerCase())
    );

  // ── Full reset + close ────────────────────────────────────────────────────
  const handleClose = () => {
    setType('Sale');
    setInvoiceData(INITIAL_INVOICE);
    setSelectedItems([]);
    setSearchQuery('');
    setSelectedAccountId('');
    setSavedInvoiceId(null);
    setPaymentLoading(false);
    setPaymentDone(false);
    onClose();
  };

  // ── Add item ──────────────────────────────────────────────────────────────
  const handleAddItem = (variant) => {
    if (selectedItems.find((i) => i.variantId === variant._id))
      return toast.info('Item already added to invoice.');

    setSelectedItems([
      ...selectedItems,
      {
        productId: variant.productId,
        variantId: variant._id,
        name:      variant.displayLabel,
        price:     variant.price,
        quantity:  1,
      },
    ]);
    setSearchQuery('');
  };
const downloadReceipt = () => {
    const doc = new jsPDF();
    doc.setFont("helvetica", "bold");
    doc.text("PAYMENT RECEIPT", 105, 20, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.text(`Invoice ID: #${savedInvoiceId.slice(-6).toUpperCase()}`, 20, 40);
  doc.text(`Status: PAID`, 20, 50);
  doc.text(`Total Amount: ${totalAmount}`, 20, 60);
  doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, 70);
  doc.savedoc.save(`Receipt_${savedInvoiceId.slice(-6)}.pdf`);
};
  // ── Confirm Purchase / Save Invoice ──────────────────────────────────────
  // After saving: shows success toast, refreshes dashboard, auto-closes modal
  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    // Basic validation
    if (!invoiceData.clientId)      return toast.warning('Please select a client / vendor.');
    if (!invoiceData.dueDate)       return toast.warning('Please select a due date.');
    if (selectedItems.length === 0) return toast.warning('Add at least one product to the invoice.');

    const selectedClient = clients.find((c) => c._id === invoiceData.clientId);

    try {
      const payload = {
        ...invoiceData,
        customerName: selectedClient?.name || 'Walk-in Customer',
        type,
        items: selectedItems,
        amount: totalAmount,
      };

      const res = await api.post('/invoices', payload);

      // Store invoice _id for Razorpay (needed if user wants to pay after saving)
      const createdId = res.data._id || res.data.invoice?._id || null;
      setSavedInvoiceId(createdId);

      // Toast for successful save
      toast.success(`✅ ${type} invoice saved successfully!`);
      onRefresh();
    } catch (err) {
      console.error(err);
      toast.error(
        err.response?.data?.message || 'Failed to save invoice. Please try again.'
      );
    }
  };

  // ── Razorpay payment flow ─────────────────────────────────────────────────
  const handleRazorpayPayment = async () => {
    // Guard 1: Keys not yet configured (pre-hosting)
    const razorpayKey = import.meta.env.VITE_RAZORPAY_KEY_ID;
    // Inside handleRazorpayPayment function
const { data: order } = await api.post('/payments/order', { 
  amount: totalAmount,
  currency: 'INR' // Change to 'USD' if your Razorpay account is international
});
    if (!razorpayKey) {
      toast.info(
        '💳 Razorpay keys not configured yet. Add VITE_RAZORPAY_KEY_ID to your .env after hosting.',
        { autoClose: 5000 }
      );
      return;
    }

    // Guard 2: Invoice must be saved first
    if (!savedInvoiceId) {
      toast.warning('⚠️ Please confirm & save the invoice first before initiating payment.');
      return;
    }

    // Guard 3: Account must be selected
    if (!selectedAccountId) {
      toast.warning('⚠️ Please select a receiving account before paying.');
      return;
    }

    // Guard 4: Razorpay SDK must be loaded in index.html
    if (!window.Razorpay) {
      toast.error(
        '❌ Razorpay SDK not loaded. Add this to index.html: <script src="https://checkout.razorpay.com/v1/checkout.js"></script>'
      );
      return;
    }

    setPaymentLoading(true);
    try {
      // Step 1: Create backend order
      const { data: order } = await api.post('/create-order', { amount: totalAmount ,currency: 'INR'});

      // Step 2: Open Razorpay checkout
      const selectedClient = clients.find((c) => c._id === invoiceData.clientId);

      const options = {
        key:         razorpayKey,
        amount:      order.amount,
        currency:    order.currency,
        name:        'BusinessTax Ledger',
        description: `Invoice #${savedInvoiceId.slice(-6).toUpperCase()}`,
        order_id:    order.id,

        handler: async function (response) {
          try {
            // Step 3: Verify on backend
            await api.post('/payments/verify', {
              razorpay_order_id:   response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature:  response.razorpay_signature,
              invoiceId:           savedInvoiceId,
              accountId:           selectedAccountId,
            });

            setPaymentDone(true);
            setPaymentLoading(false);

            // Toast for successful payment
            toast.success('✅ Payment verified & financial records updated!', { autoClose: 3000 });
            onRefresh();

            // Auto-close modal after payment success
            setTimeout(() => handleClose(), 3100);

          } catch {
            setPaymentLoading(false);
            toast.error(
              '⚠️ Payment received but verification failed. Contact support with payment ID: ' +
              response.razorpay_payment_id
            );
          }
        },

        prefill: {
          name:  selectedClient?.name  || '',
          email: selectedClient?.email || '',
        },

        theme: { color: '#2563eb' },

        modal: {
          ondismiss: () => {
            setPaymentLoading(false);
            toast.info('Payment window closed. Invoice is saved — you can pay later.');
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();

    } catch (err) {
      console.error(err);
      setPaymentLoading(false);
      toast.error('❌ Could not connect to payment gateway. Please try again.');
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[2.5rem] w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">

        {/* ── Header ── */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h2 className="text-xl font-black text-slate-800 uppercase">Create Invoice</h2>
            <div className="flex gap-2 mt-2">
              <button
                type="button"
                onClick={() => setType('Sale')}
                className={`px-4 py-1 rounded-full text-xs font-bold transition-all ${
                  type === 'Sale' ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500'
                }`}
              >
                SALES (INCOME)
              </button>
              <button
                type="button"
                onClick={() => setType('Purchase')}
                className={`px-4 py-1 rounded-full text-xs font-bold transition-all ${
                  type === 'Purchase' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'
                }`}
              >
                PURCHASE (EXPENSE)
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-2 hover:bg-slate-200 rounded-full transition-all"
          >
            <X />
          </button>
        </div>

        {/* ── Body ── */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6">

          {/* Client & Date */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-2">
                Select {type === 'Sale' ? 'Client' : 'Vendor'}
              </label>
              <select
                className="w-full p-4 bg-slate-100 rounded-2xl border-none outline-none focus:ring-2 focus:ring-blue-500"
                value={invoiceData.clientId}
                onChange={(e) => setInvoiceData({ ...invoiceData, clientId: e.target.value })}
                required
              >
                <option value="">Choose...</option>
                {clients.map((c) => (
                  <option key={c._id} value={c._id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Due Date</label>
              <input
                type="date"
                className="w-full p-4 bg-slate-100 rounded-2xl border-none outline-none"
                value={invoiceData.dueDate}
                onChange={(e) => setInvoiceData({ ...invoiceData, dueDate: e.target.value })}
                required
              />
            </div>
          </div>

          {/* Product Search */}
          <div className="relative">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-2">
              Search Products / Variants
            </label>
            <div className="flex items-center bg-slate-100 rounded-2xl px-4 mt-1">
              <Search size={18} className="text-slate-400" />
              <input
                type="text"
                placeholder="Type product name (e.g. Rice)..."
                className="w-full p-4 bg-transparent border-none outline-none"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            {searchQuery && (
              <div className="absolute w-full mt-2 bg-white border border-slate-100 rounded-2xl shadow-xl z-10 max-h-48 overflow-y-auto">
                {searchResults.length > 0 ? (
                  searchResults.map((v) => (
                    <div
                      key={v._id}
                      onClick={() => handleAddItem(v)}
                      className="p-4 hover:bg-blue-50 cursor-pointer flex justify-between items-center border-b border-slate-50"
                    >
                      <span className="font-bold text-slate-700">{v.displayLabel}</span>
                      <span className={`text-xs font-black ${v.stock <= 5 ? 'text-rose-500' : 'text-slate-400'}`}>
                        Stock: {v.stock}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-slate-400 text-sm">No products found.</div>
                )}
              </div>
            )}
          </div>

          {/* Selected Items Table */}
          <div className="space-y-3">
            <h3 className="text-[10px] font-black text-slate-400 uppercase ml-2">Invoice Items</h3>
            {selectedItems.length === 0 && (
              <p className="text-[11px] text-slate-400 ml-2 italic">No items added yet. Search above.</p>
            )}
            {selectedItems.map((item, index) => (
              <div
                key={index}
                className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100"
              >
                <div className="flex-1">
                  <p className="font-bold text-slate-800 text-sm">{item.name}</p>
                  <p className="text-[10px] text-slate-400">${item.price} per unit</p>
                </div>
                <input
                  type="number"
                  min={1}
                  className="w-20 p-2 rounded-xl border border-slate-200 text-center font-bold text-sm"
                  value={item.quantity}
                  onChange={(e) => {
                    const updated = [...selectedItems];
                    updated[index] = { ...updated[index], quantity: Number(e.target.value) };
                    setSelectedItems(updated);
                  }}
                />
                <span className="text-xs font-black text-slate-600 w-20 text-right">
                  ${(item.price * item.quantity).toLocaleString()}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedItems(selectedItems.filter((_, i) => i !== index))}
                  className="text-rose-500 p-2 hover:bg-rose-50 rounded-lg"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>

          {/* ── Receiving Account — only shown for Sale type ── */}
          {type === 'Sale' && (
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-2 flex items-center gap-1">
                <Landmark size={12} />
                Receiving Account
                <span className="text-slate-300 normal-case font-medium ml-1">(for Razorpay payment)</span>
              </label>
              <select
                className="w-full p-4 bg-slate-100 rounded-2xl border-none outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm"
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
              >
                <option value="">Select account to receive funds...</option>
                {accounts.map((acc) => (
                  <option key={acc._id} value={acc._id}>
                    {acc.bankName} — {acc.accountType}
                  </option>
                ))}
              </select>
              {accounts.length === 0 && (
                <p className="text-[10px] text-rose-400 ml-2 mt-1">
                  No accounts linked. Add one from the dashboard first.
                </p>
              )}
            </div>
          )}

          {/* ── Invoice saved indicator ── */}
          {savedInvoiceId && (
            <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-3">
              <CheckCircle size={18} className="text-emerald-500 shrink-0" />
              <div>
                <p className="text-emerald-700 text-xs font-black">Invoice Saved Successfully</p>
                <p className="text-slate-400 text-[10px] font-mono mt-0.5">
                  ID: #{savedInvoiceId.slice(-10).toUpperCase()}
                </p>
              </div>
              <span className="ml-auto text-[10px] text-slate-400 font-bold">
                {type === 'Sale' ? 'Click Razorpay to collect payment →' : 'Purchase recorded ✓'}
              </span>
            </div>
          )}

          {/* ── Payment success indicator ── */}
          {paymentDone && (
  <div className="flex flex-col gap-3 bg-blue-50 border border-blue-200 rounded-2xl px-5 py-4">
    <div className="flex items-center gap-3">
       <CheckCircle size={18} className="text-blue-500 shrink-0" />
       <p className="text-blue-700 text-xs font-black">Payment Verified!</p>
    </div>
    <button 
      onClick={downloadReceipt}
      className="bg-blue-600 text-white text-[10px] font-bold py-2 px-4 rounded-xl flex items-center justify-center gap-2 hover:bg-blue-700 transition-all"
    >
      <Download size={14} /> DOWNLOAD RECEIPT
    </button>
  </div>
)}

        </form>

        {/* ── Footer ── */}
        <div className="p-6 bg-slate-900 flex flex-col sm:flex-row justify-between items-center gap-4 mt-auto">
          <div>
            <p className="text-slate-400 text-[10px] font-black uppercase">Grand Total</p>
            <p className="text-white text-2xl font-black">${totalAmount.toLocaleString()}</p>
          </div>

          <div className="flex gap-3 w-full sm:w-auto">

            {/* Confirm Purchase / Save — HIDDEN once invoice is saved */}
            {!savedInvoiceId && (
              <button
                type="button"
                onClick={handleSubmit}
                className="flex-1 sm:flex-none px-6 py-4 rounded-2xl font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 text-sm bg-emerald-500 text-white hover:bg-emerald-400 active:scale-95"
              >
                <ShoppingCart size={18} />
                Confirm {type}
              </button>
            )}

            {/* Pay via Razorpay — SHOWN only after invoice saved, only for Sale, only before payment done */}
            {savedInvoiceId && !paymentDone && type === 'Sale' && (
              <button
                type="button"
                onClick={handleRazorpayPayment}
                disabled={paymentLoading}
                className={`flex-1 sm:flex-none px-6 py-4 rounded-2xl font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 text-sm ${
                  paymentLoading
                    ? 'bg-blue-400 cursor-wait text-white'
                    : 'bg-blue-600 hover:bg-blue-500 text-white active:scale-95'
                }`}
              >
                <CreditCard size={18} />
                {paymentLoading ? 'Processing...' : 'Pay via Razorpay'}
              </button>
            )}

            {/* Cancel / Done — always visible */}
            <button
              type="button"
              onClick={handleClose}
              className="px-6 py-4 rounded-2xl font-black uppercase tracking-widest transition-all text-sm bg-slate-700 text-slate-300 hover:bg-slate-600 active:scale-95"
            >
              {savedInvoiceId ? 'Done' : 'Cancel'}
            </button>

          </div>
        </div>

      </div>
    </div>
  );
};

export default InvoiceModal;