import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { X, Trash2, Hash } from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../utils/api';
import Select from 'react-select';
import { searchHSN } from '../utils/hsnCodes';

const InvoiceModal = ({ isOpen, onClose, onRefresh, clients, products, accounts, invoices, editData, initialType }) => {

  // ── ALL hooks must come first — before any early returns ──────────
  const [formData, setFormData] = useState({
    type: 'Sale',
    invoiceNumber: '',
    purchaseNumber: '',
    referenceNumber: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    client: '',
    clientName: '',
    useManualClient: false,
    gstNumber: '',
    billingAddress: '',
    shippingAddress: '',
    items: [],
    globalTaxRate: 0,
    discount: 0,
    paidIntoAccount: accounts?.[0]?._id || '',
    status: 'Pending',
    partialAmount: '',
    paidDate: ''
  });

  const [loading, setLoading]         = useState(false);
  const [sellerState, setSellerState] = useState('');
  const [hsnQuery, setHsnQuery]       = useState({});
  const [hsnResults, setHsnResults]   = useState({});
  const [showHsnDrop, setShowHsnDrop] = useState({});

  // useRef MUST be here — never after a conditional return
  const hsnInputRefs = useRef({});

  useEffect(() => {
    api.get('/auth/profile').then(r => setSellerState(r.data.state || '')).catch(() => {});
  }, []);

  useEffect(() => {
    if (isOpen) {
      if (editData) {
        setFormData({
          ...editData,
          invoiceDate: new Date(editData.invoiceDate).toISOString().split('T')[0],
          paidDate: editData.paidDate ? new Date(editData.paidDate).toISOString().split('T')[0] : '',
          partialAmount: editData.partialAmount || '',
          client: editData.client?._id || editData.client,
          clientName: editData.clientName || '',
          useManualClient: !editData.client && !!editData.clientName,
        });
      } else {
        const type = initialType || 'Sale';
        setFormData({
          type,
          invoiceNumber: '',
          purchaseNumber: '',
          referenceNumber: '',
          invoiceDate: new Date().toISOString().split('T')[0],
          client: '',
          clientName: '',
          useManualClient: false,
          gstNumber: '',
          billingAddress: '',
          shippingAddress: '',
          items: [],
          globalTaxRate: 0,
          discount: 0,
          paidIntoAccount: accounts?.[0]?._id || '',
          status: 'Pending',
          partialAmount: '',
          paidDate: ''
        });
        api.get(`/invoices/next-number?type=${type}`).then(res => {
          setFormData(prev => ({
            ...prev,
            [type === 'Sale' ? 'invoiceNumber' : 'purchaseNumber']: res.data.number,
            referenceNumber: ''
          }));
        });
      }
    }
  }, [isOpen, editData, initialType, accounts]);

  // ── HSN Portal Dropdown — defined here (still before early returns) ──
  const HsnDropdown = ({ idx }) => {
    const el = hsnInputRefs.current[idx];
    if (!el || !showHsnDrop[idx] || !(hsnResults[idx] || []).length) return null;
    const rect = el.getBoundingClientRect();
    return ReactDOM.createPortal(
      <div
        style={{
          position: 'fixed',
          top: rect.bottom + 4,
          left: rect.left,
          width: Math.max(rect.width, 420),
          maxWidth: 'calc(100vw - 32px)',
          zIndex: 99999,
        }}
        className="bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden"
        onMouseDown={e => e.preventDefault()}
      >
        <div className="flex items-center px-4 py-2 bg-indigo-50 border-b border-slate-100">
          <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">
            {(hsnResults[idx] || []).length} results for &quot;{hsnQuery[idx] || ''}&quot;
          </span>
          <button
            type="button"
            onClick={() => setShowHsnDrop(p => ({ ...p, [idx]: false }))}
            className="ml-auto text-slate-400 hover:text-slate-700 text-xs font-black px-1"
          >✕</button>
        </div>
        <div className="max-h-56 overflow-y-auto divide-y divide-slate-50">
          {(hsnResults[idx] || []).map((h, i) => (
            <button
              key={i} type="button"
              onMouseDown={() => selectHsn(idx, h)}
              className="w-full text-left px-4 py-3 hover:bg-indigo-50 flex items-start gap-3 transition-colors"
            >
              <span className="text-[11px] font-black text-white bg-indigo-500 px-2 py-1 rounded-lg shrink-0 min-w-[52px] text-center leading-tight">
                {h.code}
              </span>
              <span className="text-[11px] text-slate-700 font-medium leading-snug mt-0.5">{h.description}</span>
            </button>
          ))}
        </div>
      </div>,
      document.body
    );
  };

  // ── Now safe to do early returns ──────────────────────────────────
  if (!isOpen) return null;

  if (!products || products.length === 0) {
    return (
      <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center">
        <div className="bg-white rounded-3xl p-8 text-center text-slate-400">
          <p>Loading products...</p>
        </div>
      </div>
    );
  }

  // ── Derived values ────────────────────────────────────────────────
  const now = new Date();
  const productOptions = products.flatMap(p => {
    const isExpired = p.expiryDate && new Date(p.expiryDate) < now;
    return (p.variants || []).map(v => ({
      value: `${p._id}-${v._id}`,
      label: `${isExpired ? '⚠ EXPIRED — ' : ''}${p.title || 'Unknown Product'} (${v.name || 'Default'}) | SKU: ${v.sku || 'N/A'} | Price: ₹${v.price || '0'}`,
      isDisabled: isExpired,
      data: { _id: p._id, name: p.title, variant: v, isExpired, hsnCode: p.hsnCode || '' }
    }));
  });

  const selectedClientObj = (clients || []).find(c => c._id === formData.client);
  const buyerState        = selectedClientObj?.billingAddress?.state || '';
  const subtotalVal = formData.items.reduce((a, i) => a + (i.price * i.quantity), 0);
  const taxVal      = subtotalVal * (formData.globalTaxRate / 100);
  let gstType = 'none', cgst = 0, sgst = 0, igst = 0;
  if (sellerState && buyerState) {
    if (sellerState.trim().toLowerCase() === buyerState.trim().toLowerCase()) {
      gstType = 'intra'; cgst = sgst = Number((taxVal / 2).toFixed(2));
    } else {
      gstType = 'inter'; igst = Number(taxVal.toFixed(2));
    }
  }

  // ── HSN handlers ──────────────────────────────────────────────────
  const handleHsnInput = (idx, val) => {
    const newItems = [...formData.items];
    newItems[idx] = { ...newItems[idx], hsnCode: val };
    setFormData(prev => ({ ...prev, items: newItems }));
    setHsnQuery(p => ({ ...p, [idx]: val }));
    if (val.trim().length >= 2) {
      setHsnResults(p => ({ ...p, [idx]: searchHSN(val) }));
      setShowHsnDrop(p => ({ ...p, [idx]: true }));
    } else {
      setHsnResults(p => ({ ...p, [idx]: [] }));
      setShowHsnDrop(p => ({ ...p, [idx]: false }));
    }
  };

  const selectHsn = (idx, hsn) => {
    const newItems = [...formData.items];
    newItems[idx] = { ...newItems[idx], hsnCode: hsn.code };
    setFormData(prev => ({ ...prev, items: newItems }));
    setHsnQuery(p => ({ ...p, [idx]: hsn.code }));
    setShowHsnDrop(p => ({ ...p, [idx]: false }));
  };

  // ── Product select ────────────────────────────────────────────────
  const handleProductSelect = (selectedOption) => {
    if (!selectedOption) return;
    const { _id, name, variant, isExpired, hsnCode } = selectedOption.data;
    if (isExpired) {
      toast.error(`"${name}" is expired and cannot be added.`);
      return;
    }
    if (formData.items.find(item => item.variantId === variant._id)) {
      toast.info("This variant is already added.");
      return;
    }
    if (formData.type === 'Sale' && !variant.stock) {
      toast.error(`"${name} (${variant.name})" has no stock available.`);
      return;
    }
    if (formData.type === 'Sale' && variant.stock <= (variant.lowStockAlert || 0)) {
      toast.warning(`Low stock: Only ${variant.stock} unit(s) left.`);
    }
    const newIdx = formData.items.length;
    setFormData(prev => ({
      ...prev,
      globalTaxRate: variant.taxRate || 0,
      items: [
        ...prev.items,
        {
          productId: _id,
          variantId: variant._id,
          name: `${name} (${variant.name})`,
          sku: variant.sku,
          barcode: variant.barcode,
          hsnCode: hsnCode || '',
          quantity: 1,
          price: formData.type === 'Sale' ? (variant.price || '') : ''
        }
      ]
    }));
    if (hsnCode) {
      setHsnQuery(p => ({ ...p, [newIdx]: hsnCode }));
    }
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = Number(value);
    setFormData(prev => ({ ...prev, items: newItems }));
  };

  const removeItem = (index) => {
    setFormData(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
  };

  const calculateTotals = () => {
    const subtotal = formData.items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const tax = subtotal * (formData.globalTaxRate / 100);
    return { subtotal, tax, total: subtotal + tax - formData.discount };
  };
  const totals = calculateTotals();

  // ── Submit ────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.items.length === 0) return toast.error("Add at least one item");
    const clientFields = formData.useManualClient
      ? { client: undefined, clientName: formData.clientName?.trim() || undefined }
      : { client: formData.client || undefined, clientName: undefined };
    const gstFields = { gstType, cgst, sgst, igst, sellerState, buyerState };
    setLoading(true);
    try {
      if (editData) {
        await api.put(`/invoices/${editData._id}`, {
          ...formData, ...clientFields, ...gstFields,
          invoiceNumber:   editData.invoiceNumber,
          purchaseNumber:  editData.purchaseNumber,
          referenceNumber: formData.referenceNumber?.trim() || undefined,
        });
        toast.success("Updated successfully");
      } else {
        await api.post('/invoices', {
          ...formData, ...clientFields, ...gstFields,
          invoiceNumber:   formData.type === 'Sale'     ? formData.invoiceNumber   : undefined,
          purchaseNumber:  formData.type === 'Purchase' ? formData.purchaseNumber  : undefined,
          referenceNumber: formData.referenceNumber?.trim() || undefined,
        });
        toast.success("Created successfully");
      }
      onRefresh();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Operation failed");
    } finally {
      setLoading(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex justify-center items-center p-4">
      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">
              {editData ? 'Edit Record' : `New ${formData.type}`}
            </h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Stock-Adjusting Billing Module</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-8 overflow-y-auto">
          <form id="invoice-form" onSubmit={handleSubmit} className="space-y-8">

            {/* Type Toggle */}
            {!editData && (
              <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
                {['Sale', 'Purchase'].map(t => (
                  <button key={t} type="button"
                    onClick={() => {
                      api.get(`/invoices/next-number?type=${t}`).then(res => {
                        setFormData(prev => ({
                          ...prev, type: t,
                          [t === 'Sale' ? 'invoiceNumber' : 'purchaseNumber']: res.data.number,
                          referenceNumber: ''
                        }));
                      });
                    }}
                    className={`px-8 py-2.5 rounded-lg font-black uppercase text-[10px] tracking-widest transition-all
                      ${formData.type === t ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    {t} Invoice
                  </button>
                ))}
              </div>
            )}

            {/* Top Fields */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {formData.type === 'Sale' ? (
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Invoice No.</label>
                  <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
                    <span className="px-3 py-3 text-sm font-black text-indigo-600 bg-indigo-50 border-r border-slate-200">INV-S-</span>
                    <input type="text" readOnly
                      className="flex-1 px-3 py-3 bg-transparent text-sm font-black outline-none text-slate-800 cursor-not-allowed"
                      value={formData.invoiceNumber.replace('INV-S-', '')} />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Purchase No.</label>
                  <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
                    <span className="px-3 py-3 text-sm font-black text-rose-600 bg-rose-50 border-r border-slate-200">INV-P-</span>
                    <input type="text" readOnly
                      className="flex-1 px-3 py-3 bg-transparent text-sm font-black outline-none text-slate-800 cursor-not-allowed"
                      value={formData.purchaseNumber.replace('INV-P-', '')} />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Date</label>
                <input type="date" required
                  className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl text-sm font-bold outline-none uppercase"
                  value={formData.invoiceDate}
                  onChange={e => setFormData(p => ({ ...p, invoiceDate: e.target.value }))} />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    {formData.type === 'Sale' ? 'Customer' : 'Supplier'}
                  </label>
                  <button type="button"
                    onClick={() => setFormData(prev => ({ ...prev, useManualClient: !prev.useManualClient, client: '', clientName: '' }))}
                    className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg transition-all
                      ${formData.useManualClient ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                  >
                    {formData.useManualClient ? '← Pick list' : 'Manual →'}
                  </button>
                </div>
                {formData.useManualClient ? (
                  <input type="text" placeholder="Type name..."
                    className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl text-sm font-bold outline-none"
                    value={formData.clientName}
                    onChange={e => setFormData(p => ({ ...p, clientName: e.target.value }))} />
                ) : (
                  <select className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl text-sm font-bold outline-none"
                    value={formData.client}
                    onChange={e => setFormData(p => ({ ...p, client: e.target.value }))}>
                    <option value="">Choose Party...</option>
                    {(clients || []).map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                  </select>
                )}
              </div>

              {formData.type === 'Purchase' && (
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Bill Ref No. (Optional)</label>
                  <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
                    <span className="px-3 py-3 text-sm font-black text-slate-500 bg-slate-100 border-r border-slate-200">REF-</span>
                    <input type="text" maxLength={10} placeholder="reference..."
                      className="flex-1 px-3 py-3 bg-transparent text-sm font-black outline-none"
                      value={formData.referenceNumber.replace('REF-', '')}
                      onChange={e => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                        setFormData(p => ({ ...p, referenceNumber: val ? `REF-${val}` : '' }));
                      }} />
                  </div>
                </div>
              )}
            </div>

            {/* Address / GSTIN */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/50 p-6 rounded-2xl border border-slate-100">
              <div className="md:col-span-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">GSTIN (Optional)</label>
                <input type="text"
                  className="w-full bg-white border border-slate-200 px-4 py-3 rounded-xl text-sm font-bold outline-none"
                  value={formData.gstNumber}
                  onChange={e => setFormData(p => ({ ...p, gstNumber: e.target.value }))} />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Billing Address</label>
                <textarea rows="2"
                  className="w-full bg-white border border-slate-200 px-4 py-3 rounded-xl text-sm font-bold outline-none resize-none"
                  value={formData.billingAddress}
                  onChange={e => setFormData(p => ({ ...p, billingAddress: e.target.value }))} />
              </div>
            </div>

            {/* GST State indicator */}
            {sellerState && buyerState && (
              <div className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold border
                ${gstType === 'intra' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                {gstType === 'intra'
                  ? `✓ Intra-State Supply — CGST + SGST (${sellerState})`
                  : `⚡ Inter-State Supply — IGST (${sellerState} → ${buyerState})`}
              </div>
            )}

            {/* Line Items */}
            <div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-4">Line Items</h3>
              <div className="mb-6 relative z-10">
                <Select
                  options={productOptions}
                  onChange={handleProductSelect}
                  placeholder="Search and add product..."
                  className="text-sm font-bold"
                />
              </div>
              <div className="border border-slate-200 rounded-2xl overflow-visible">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase">Item</th>
                      <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase w-44">HSN / SAC</th>
                      <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase w-24">Qty</th>
                      <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase w-32">Rate</th>
                      <th className="px-4 py-3 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {formData.items.map((item, idx) => (
                      <tr key={item.variantId || idx} className="bg-white">
                        <td className="px-4 py-3">
                          <div className="text-sm font-bold text-slate-800">{item.name}</div>
                          {item.sku && <div className="text-[10px] text-slate-400 font-mono mt-0.5">SKU: {item.sku}</div>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="relative">
                            <input
                              ref={el => { hsnInputRefs.current[idx] = el; }}
                              type="text"
                              value={hsnQuery[idx] !== undefined ? hsnQuery[idx] : (item.hsnCode || '')}
                              onChange={e => handleHsnInput(idx, e.target.value)}
                              onFocus={() => {
                                const val = hsnQuery[idx] !== undefined ? hsnQuery[idx] : (item.hsnCode || '');
                                if (val.length >= 2) {
                                  setHsnResults(p => ({ ...p, [idx]: searchHSN(val) }));
                                  setShowHsnDrop(p => ({ ...p, [idx]: true }));
                                }
                              }}
                              onBlur={() => setTimeout(() => setShowHsnDrop(p => ({ ...p, [idx]: false })), 200)}
                              placeholder="Search HSN..."
                              autoComplete="off"
                              className={`w-full px-2 py-2 border rounded-xl text-xs font-bold outline-none transition-all
                                ${item.hsnCode
                                  ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                                  : 'bg-white border-slate-200 focus:border-indigo-300'}`}
                            />
                            <HsnDropdown idx={idx} />
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <input type="number" min="1"
                            className="w-full p-2 border border-slate-200 rounded-lg text-center text-sm font-bold outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            value={item.quantity}
                            onChange={e => handleItemChange(idx, 'quantity', e.target.value)} />
                        </td>
                        <td className="px-4 py-3">
                          <input type="number" step="0.01"
                            placeholder={formData.type === 'Purchase' ? 'Enter rate...' : ''}
                            className={`w-full p-2 border rounded-lg text-sm font-bold outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none
                              ${formData.type === 'Purchase' ? 'border-amber-200 bg-amber-50' : 'border-slate-200'}`}
                            value={item.price}
                            onChange={e => handleItemChange(idx, 'price', e.target.value)}
                            onKeyDown={e => (e.key === 'ArrowUp' || e.key === 'ArrowDown') && e.preventDefault()} />
                        </td>
                        <td className="px-4 py-3">
                          <button type="button" onClick={() => removeItem(idx)} className="text-rose-400 hover:text-rose-600">
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {formData.items.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-slate-400 text-sm font-bold">
                          No items added yet. Search a product above.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totals */}
            <div className="flex justify-end pt-6 border-t border-slate-100">
              <div className="w-full md:w-1/2 space-y-3">

                {/* Tax Rate */}
                <div className="flex items-center justify-between gap-4">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tax Rate (%)</span>
                  <input type="number"
                    className="w-32 bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl text-sm font-bold outline-none text-right"
                    value={formData.globalTaxRate}
                    onChange={e => setFormData(p => ({ ...p, globalTaxRate: Number(e.target.value) }))} />
                </div>

                {/* Discount */}
                <div className="flex items-center justify-between gap-4">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Discount (₹)</span>
                  <input type="number"
                    className="w-32 bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl text-sm font-bold outline-none text-right"
                    value={formData.discount}
                    onChange={e => setFormData(p => ({ ...p, discount: Number(e.target.value) }))} />
                </div>

                {/* Subtotal */}
                <div className="flex justify-between items-center py-2 border-t border-slate-100">
                  <span className="text-xs font-bold text-slate-400">Subtotal</span>
                  <span className="text-sm font-bold text-slate-800">₹{totals.subtotal.toFixed(2)}</span>
                </div>

                {/* GST Breakdown */}
                {gstType === 'intra' && (
                  <>
                    <div className="flex justify-between items-center py-1">
                      <span className="text-xs font-bold text-emerald-600">CGST ({formData.globalTaxRate / 2}%)</span>
                      <span className="text-sm font-bold text-emerald-700">₹{cgst.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span className="text-xs font-bold text-emerald-600">SGST ({formData.globalTaxRate / 2}%)</span>
                      <span className="text-sm font-bold text-emerald-700">₹{sgst.toFixed(2)}</span>
                    </div>
                    <div className="text-[9px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-50 rounded-lg px-2 py-1">
                      Intra-State: {sellerState}
                    </div>
                  </>
                )}
                {gstType === 'inter' && (
                  <>
                    <div className="flex justify-between items-center py-1">
                      <span className="text-xs font-bold text-amber-600">IGST ({formData.globalTaxRate}%)</span>
                      <span className="text-sm font-bold text-amber-700">₹{igst.toFixed(2)}</span>
                    </div>
                    <div className="text-[9px] font-black text-amber-500 uppercase tracking-widest bg-amber-50 rounded-lg px-2 py-1">
                      Inter-State: {sellerState} → {buyerState}
                    </div>
                  </>
                )}
                {gstType === 'none' && (
                  <div className="flex justify-between items-center py-2">
                    <span className="text-xs font-bold text-slate-400">Tax Amount</span>
                    <span className="text-sm font-bold text-slate-800">₹{totals.tax.toFixed(2)}</span>
                  </div>
                )}
                {!sellerState && (
                  <div className="text-[9px] text-amber-600 font-bold bg-amber-50 rounded-lg px-2 py-1">
                    ⚠ Set your State in Settings → CGST/SGST/IGST will auto-calculate
                  </div>
                )}

                {/* Payment Status */}
                <div className="flex items-center justify-between gap-4 pt-2 border-t border-slate-100">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Payment Status</span>
                  <select
                    className="w-40 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-sm font-bold outline-none cursor-pointer"
                    value={formData.status}
                    onChange={e => setFormData(p => ({ ...p, status: e.target.value }))}>
                    <option value="Pending">Pending</option>
                    <option value="Paid">Paid</option>
                    <option value="Partially Paid">Partially Paid</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>

                {/* Partial amount */}
                {formData.status === 'Partially Paid' && (
                  <div className="pt-2 border-t border-slate-100 space-y-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">💰 Amount Paid</span>
                    <input type="number" min="0" step="0.01" placeholder="Enter amount paid..."
                      className="w-full bg-amber-50 border border-amber-200 px-3 py-2 rounded-xl text-sm font-bold outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      value={formData.partialAmount}
                      onChange={e => setFormData(p => ({ ...p, partialAmount: e.target.value }))}
                      onKeyDown={e => (e.key === 'ArrowUp' || e.key === 'ArrowDown') && e.preventDefault()} />
                    {formData.partialAmount !== '' && (
                      <div className="flex justify-between items-center bg-slate-50 border border-slate-100 rounded-xl px-4 py-2">
                        <span className="text-[10px] font-black text-slate-400 uppercase">Balance Remaining</span>
                        <span className={`text-sm font-black ${totals.total - Number(formData.partialAmount) > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                          ₹{Math.max(0, totals.total - Number(formData.partialAmount)).toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Paid Date */}
                {(formData.status === 'Paid' || formData.status === 'Partially Paid') && (
                  <div className="pt-2 border-t border-slate-100 space-y-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                      📅 {formData.status === 'Paid' ? 'Payment Received Date' : 'Partial Payment Date'}
                    </span>
                    <input type="date" max={new Date().toISOString().split('T')[0]}
                      className="w-full bg-emerald-50 border border-emerald-200 px-3 py-2.5 rounded-xl text-sm font-bold outline-none uppercase cursor-pointer"
                      value={formData.paidDate}
                      onChange={e => setFormData(p => ({ ...p, paidDate: e.target.value }))} />
                  </div>
                )}

                {/* Account */}
                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                    {formData.type === 'Sale' ? '💳 Deposit Into Account' : '🏦 Pay From Account'}
                  </span>
                  {!accounts || accounts.length === 0 ? (
                    <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold px-4 py-3 rounded-xl">
                      ⚠️ No accounts found. Add one in Accounts first.
                    </div>
                  ) : (
                    <>
                      <select
                        className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-sm font-bold outline-none cursor-pointer"
                        value={formData.paidIntoAccount}
                        onChange={e => setFormData(p => ({ ...p, paidIntoAccount: e.target.value }))}>
                        <option value="">— Select Account —</option>
                        {accounts.map(acc => (
                          <option key={acc._id} value={acc._id}>
                            {acc.bankName} · Balance: {Number(acc.balance).toLocaleString()}
                          </option>
                        ))}
                      </select>
                      {formData.paidIntoAccount && (() => {
                        const sel = accounts.find(a => a._id === formData.paidIntoAccount);
                        if (!sel) return null;
                        const isLow = formData.type === 'Purchase' && sel.balance < totals.total;
                        return isLow
                          ? <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold px-4 py-2 rounded-xl">⚠️ Insufficient balance! Available: ₹{Number(sel.balance).toLocaleString()}</div>
                          : <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-bold px-4 py-2 rounded-xl">✓ {sel.bankName} · Available: ₹{Number(sel.balance).toLocaleString()}</div>;
                      })()}
                    </>
                  )}
                </div>

                {/* Grand Total */}
                <div className="flex justify-between items-center py-4 border-t-2 border-slate-200">
                  <span className="text-lg font-black text-slate-900 uppercase tracking-widest">Grand Total</span>
                  <span className="text-2xl font-black text-indigo-600">₹{totals.total.toFixed(2)}</span>
                </div>
              </div>
            </div>

          </form>
        </div>

        {/* Footer */}
        <div className="px-8 py-5 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
          <button type="button" onClick={onClose}
            className="px-6 py-3 rounded-xl font-black text-[10px] uppercase text-slate-600 hover:bg-slate-100 transition-colors">
            Cancel
          </button>
          <button type="submit" form="invoice-form" disabled={loading}
            className="px-8 py-3 rounded-xl font-black text-[10px] uppercase text-white bg-indigo-600 hover:bg-indigo-700 transition-colors disabled:opacity-50">
            {loading ? 'Saving...' : 'Save Invoice'}
          </button>
        </div>

      </div>
    </div>
  );
};

export default InvoiceModal;
