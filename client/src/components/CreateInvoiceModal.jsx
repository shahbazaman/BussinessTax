import React, { useState, useEffect, useContext, useRef } from 'react';
import ReactDOM from 'react-dom';
import { X, Plus, Trash2, Hash, Building2, MapPin } from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../utils/api';
import { CurrencyContext } from '../context/CurrencyContext';
import { searchHSN } from '../utils/hsnCodes';

const CreateInvoiceModal = ({ isOpen, onClose, onRefresh }) => {
  const { symbol } = useContext(CurrencyContext);
  const [clients, setClients]     = useState([]);
  const [products, setProducts]   = useState([]);
  const [sellerState, setSellerState] = useState('');
  const [profile, setProfile]     = useState({});
  const [loading, setLoading]     = useState(false);

  const [hsnQuery, setHsnQuery]       = useState({});
  const [hsnResults, setHsnResults]   = useState({});
  const [showHsnDrop, setShowHsnDrop] = useState({});

  const [form, setForm] = useState({
    invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
    date:     new Date().toISOString().split('T')[0],
    dueDate:  '',
    client:   '',
    notes:    '',
    discount: 0,
    shipping: 0,
    items: [{ productId: '', name: '', hsnCode: '', quantity: 1, price: 0, taxRate: 0 }],
  });

  useEffect(() => {
    if (!isOpen) return;
    Promise.all([
      api.get('/clients'),
      api.get('/products'),
      api.get('/auth/profile'),
    ]).then(([cr, pr, prof]) => {
      setClients(cr.data);
      setProducts(pr.data);
      setProfile(prof.data);
      setSellerState(prof.data.state || '');
    }).catch(() => {});
  }, [isOpen]);

  // ── Totals ──────────────────────────────────────────────────────────
  const subtotal   = form.items.reduce((a, i) => a + i.quantity * i.price, 0);
  const taxAmount  = form.items.reduce((a, i) => a + (i.quantity * i.price * (i.taxRate / 100)), 0);
  const totalAmount = (subtotal + taxAmount + Number(form.shipping || 0)) - Number(form.discount || 0);

  const selectedClient = clients.find(c => c._id === form.client);
  const buyerState     = selectedClient?.billingAddress?.state || '';

  let gstType = 'none', cgst = 0, sgst = 0, igst = 0;
  if (sellerState && buyerState) {
    if (sellerState.trim().toLowerCase() === buyerState.trim().toLowerCase()) {
      gstType = 'intra'; cgst = sgst = Number((taxAmount / 2).toFixed(2));
    } else {
      gstType = 'inter'; igst = Number(taxAmount.toFixed(2));
    }
  }
  const fmt = n => `${symbol}${Number(n || 0).toFixed(2)}`;
  const hsnInputRefs = useRef({});

  const HsnDropdown = ({ idx }) => {
    const el = hsnInputRefs.current[idx];
    if (!el || !showHsnDrop[idx] || !(hsnResults[idx] || []).length) return null;
    const rect = el.getBoundingClientRect();
    return ReactDOM.createPortal(
      <div
        style={{ position: 'fixed', top: rect.bottom + 4, left: rect.left, width: Math.max(rect.width, 440), maxWidth: 'calc(100vw - 32px)', zIndex: 99999 }}
        className="bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden"
        onMouseDown={e => e.preventDefault()}
      >
        <div className="flex items-center px-4 py-2 bg-indigo-50 border-b border-slate-100">
          <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">
            {(hsnResults[idx] || []).length} matches for &quot;{hsnQuery[idx] || ''}&quot;
          </span>
          <button type="button" onClick={() => setShowHsnDrop(p => ({...p, [idx]: false}))}
            className="ml-auto text-slate-400 hover:text-slate-700 text-xs font-black px-1">✕</button>
        </div>
        <div className="max-h-56 overflow-y-auto divide-y divide-slate-50">
          {(hsnResults[idx] || []).map((h, i) => (
            <button key={i} type="button" onMouseDown={() => selectHsn(idx, h)}
              className="w-full text-left px-4 py-3 hover:bg-indigo-50 flex items-start gap-3 transition-colors">
              <span className="text-[11px] font-black text-white bg-indigo-500 px-2 py-1 rounded-lg shrink-0 min-w-14 text-center">{h.code}</span>
              <span className="text-[11px] text-slate-700 font-medium leading-snug mt-0.5">{h.description}</span>
            </button>
          ))}
        </div>
      </div>,
      document.body
    );
  };

  // ── Item helpers ────────────────────────────────────────────────────
  const updateItem = (idx, field, val) => {
    const items = [...form.items];
    if (field === 'productId') {
      const prod = products.find(p => p._id === val);
      items[idx] = {
        ...items[idx],
        productId: val,
        name:      prod?.title || '',
        hsnCode:   prod?.hsnCode || '',
        taxRate:   prod?.variants?.[0]?.taxRate || 0,
        price:     prod?.variants?.[0]?.price || 0,
      };
      if (prod?.hsnCode) setHsnQuery(p => ({ ...p, [idx]: prod.hsnCode }));
    } else {
      items[idx][field] = val;
    }
    setForm(p => ({ ...p, items }));
  };

  const addItem = () =>
    setForm(p => ({ ...p, items: [...p.items, { productId: '', name: '', hsnCode: '', quantity: 1, price: 0, taxRate: 0 }] }));

  const removeItem = idx =>
    setForm(p => ({ ...p, items: p.items.filter((_, i) => i !== idx) }));

  // ── HSN ─────────────────────────────────────────────────────────────
  const handleHsnInput = (idx, val) => {
    updateItem(idx, 'hsnCode', val);
    setHsnQuery(p => ({ ...p, [idx]: val }));
    if (val.trim().length >= 2) {
      setHsnResults(p => ({ ...p, [idx]: searchHSN(val) }));
      setShowHsnDrop(p => ({ ...p, [idx]: true }));
    } else {
      setShowHsnDrop(p => ({ ...p, [idx]: false }));
    }
  };
  const selectHsn = (idx, h) => {
    updateItem(idx, 'hsnCode', h.code);
    setHsnQuery(p => ({ ...p, [idx]: h.code }));
    setShowHsnDrop(p => ({ ...p, [idx]: false }));
  };

  // ── Submit ───────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.client)  return toast.error('Select a client');
    if (!form.dueDate) return toast.error('Set a due date');
    setLoading(true);
    try {
      await api.post('/invoices', {
        ...form,
        clientId: form.client,
        gstType, cgst, sgst, igst,
        sellerState, buyerState,
      });
      toast.success('Invoice created!');
      onRefresh();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl flex flex-col max-h-[92vh]">

        {/* Header */}
        <div className="flex justify-between items-center px-8 py-6 border-b border-slate-100 shrink-0">
          <div>
            <h2 className="text-2xl font-black text-slate-900">New Invoice</h2>
            <p className="text-xs text-slate-400 font-medium mt-0.5">Auto CGST / SGST / IGST based on state</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={20}/></button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto p-8 space-y-6">

          {/* Meta Row */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase mb-1 block">Invoice No.</label>
              <input className="w-full p-3 bg-slate-50 rounded-xl text-sm font-black outline-none"
                value={form.invoiceNumber}
                onChange={e => setForm(p => ({...p, invoiceNumber: e.target.value}))} />
            </div>
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase mb-1 block">Date</label>
              <input type="date" className="w-full p-3 bg-slate-50 rounded-xl text-sm font-bold outline-none"
                value={form.date}
                onChange={e => setForm(p => ({...p, date: e.target.value}))} />
            </div>
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase mb-1 block">Due Date *</label>
              <input type="date" className="w-full p-3 bg-slate-50 rounded-xl text-sm font-bold outline-none"
                onChange={e => setForm(p => ({...p, dueDate: e.target.value}))} />
            </div>
          </div>

          {/* Client */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase mb-1 block">Client *</label>
              <select className="w-full p-3 bg-slate-50 rounded-xl text-sm font-bold outline-none cursor-pointer"
                value={form.client}
                onChange={e => setForm(p => ({...p, client: e.target.value}))}>
                <option value="">Choose client...</option>
                {clients.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>
            </div>
            {selectedClient && (
              <div className="bg-slate-50 rounded-2xl p-3 text-xs space-y-0.5">
                <p className="font-black text-slate-800">{selectedClient.name}</p>
                {selectedClient.email && <p className="text-slate-500">{selectedClient.email}</p>}
                {selectedClient.billingAddress?.city && (
                  <p className="text-slate-500 flex items-center gap-1">
                    <MapPin size={9}/>
                    {[selectedClient.billingAddress.city, selectedClient.billingAddress.state].filter(Boolean).join(', ')}
                  </p>
                )}
                {selectedClient.taxId && <p className="text-indigo-600 font-bold">GSTIN: {selectedClient.taxId}</p>}
                {!buyerState && (
                  <p className="text-amber-600 font-bold">⚠ No billing state — add in Clients page</p>
                )}
              </div>
            )}
          </div>

          {/* GST banner */}
          {sellerState && buyerState && (
            <div className={`flex items-center gap-2 rounded-2xl px-4 py-3 text-xs font-bold
              ${gstType === 'intra' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
              <Building2 size={13}/>
              {gstType === 'intra'
                ? `Intra-State Supply — CGST + SGST (${sellerState})`
                : `Inter-State Supply — IGST (${sellerState} → ${buyerState})`}
            </div>
          )}

          {/* Items */}
          <div>
            <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Line Items</h4>
            <div className="space-y-3">
              {form.items.map((item, idx) => {
                const lineTotal = item.quantity * item.price;
                const lineTax   = lineTotal * (item.taxRate / 100);
                const halfTax   = lineTax / 2;
                return (
                  <div key={idx} className="border border-slate-100 rounded-2xl p-4 space-y-3 bg-slate-50/30">

                    {/* Product select + name */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase mb-1 block">Product</label>
                        <select className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none"
                          value={item.productId}
                          onChange={e => updateItem(idx, 'productId', e.target.value)}>
                          <option value="">Select product...</option>
                          {products.map(p => <option key={p._id} value={p._id}>{p.title}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase mb-1 block">Custom Name (optional)</label>
                        <input className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none"
                          placeholder="Override item name..."
                          value={item.name}
                          onChange={e => updateItem(idx, 'name', e.target.value)} />
                      </div>
                    </div>

                    {/* HSN */}
                    <div className="relative">
                      <label className="text-[9px] font-black text-slate-400 uppercase mb-1 flex items-center gap-1">
                        <Hash size={9}/> HSN / SAC
                        {!item.hsnCode && <span className="text-amber-500 normal-case font-bold">— type to search or enter manually</span>}
                      </label>
                      <div className="flex gap-2">
                        <input type="text"
                          ref={el => hsnInputRefs.current[idx] = el}
                          value={hsnQuery[idx] ?? (item.hsnCode || '')}
                          onChange={e => handleHsnInput(idx, e.target.value)}
                          onFocus={() => { if ((hsnQuery[idx] || item.hsnCode || '').length >= 2) setShowHsnDrop(p => ({...p, [idx]: true})); }}
                          onBlur={() => setTimeout(() => setShowHsnDrop(p => ({...p, [idx]: false})), 200)}
                          placeholder="Search: 8471, cotton, mobile, software..."
                          autoComplete="off"
                          className={`flex-1 p-2.5 border rounded-xl text-xs font-bold outline-none transition-all
                            ${item.hsnCode ? 'bg-indigo-50 border-indigo-200 text-indigo-800' : 'bg-white border-slate-200'}`}
                        />
                        {item.hsnCode && (
                          <span className="flex items-center bg-indigo-500 text-white text-[10px] font-black px-3 rounded-xl whitespace-nowrap">
                            {item.hsnCode}
                          </span>
                        )}
                      </div>
                      <HsnDropdown idx={idx} />
                    </div>

                    {/* Qty / Price / Tax */}
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase mb-1 block">Qty</label>
                        <input type="number" min="1"
                          className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none text-center"
                          value={item.quantity}
                          onChange={e => updateItem(idx, 'quantity', Number(e.target.value))} />
                      </div>
                      <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase mb-1 block">Rate</label>
                        <input type="number" min="0" step="0.01"
                          className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none"
                          value={item.price}
                          onChange={e => updateItem(idx, 'price', Number(e.target.value))} />
                      </div>
                      <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase mb-1 block">Tax %</label>
                        <input type="number" min="0" max="100"
                          className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none"
                          value={item.taxRate}
                          onChange={e => updateItem(idx, 'taxRate', Number(e.target.value))} />
                      </div>
                    </div>

                    {/* Per-line GST tags */}
                    {lineTotal > 0 && (
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <span className="text-[10px] text-slate-400 font-bold">
                          Taxable: <span className="text-slate-700">{fmt(lineTotal)}</span>
                        </span>
                        {gstType === 'intra' ? (
                          <>
                            <span className="text-[10px] bg-emerald-50 text-emerald-700 font-black px-2 py-0.5 rounded-lg">
                              CGST {item.taxRate/2}% = {fmt(halfTax)}
                            </span>
                            <span className="text-[10px] bg-emerald-50 text-emerald-700 font-black px-2 py-0.5 rounded-lg">
                              SGST {item.taxRate/2}% = {fmt(halfTax)}
                            </span>
                          </>
                        ) : gstType === 'inter' ? (
                          <span className="text-[10px] bg-amber-50 text-amber-700 font-black px-2 py-0.5 rounded-lg">
                            IGST {item.taxRate}% = {fmt(lineTax)}
                          </span>
                        ) : (
                          <span className="text-[10px] bg-slate-100 text-slate-600 font-black px-2 py-0.5 rounded-lg">
                            Tax {item.taxRate}% = {fmt(lineTax)}
                          </span>
                        )}
                        <span className="ml-auto text-sm font-black text-slate-800">{fmt(lineTotal + lineTax)}</span>
                        <button type="button" onClick={() => removeItem(idx)}
                          className="text-rose-400 hover:bg-rose-50 p-1 rounded-lg">
                          <Trash2 size={13}/>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
              <button type="button" onClick={addItem}
                className="w-full py-3 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 font-black text-xs uppercase hover:border-indigo-400 hover:text-indigo-500 transition-all flex items-center justify-center gap-2">
                <Plus size={13}/> Add Item
              </button>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-[9px] font-black text-slate-400 uppercase mb-1 block">Notes / Terms</label>
            <textarea rows={2}
              className="w-full p-3 bg-slate-50 rounded-xl text-sm font-medium outline-none resize-none"
              placeholder="Payment terms, bank details, thank you note..."
              value={form.notes}
              onChange={e => setForm(p => ({...p, notes: e.target.value}))} />
          </div>

          {/* Totals */}
          <div className="bg-slate-900 rounded-3xl p-6 text-white space-y-3">
            <div className="flex justify-between text-sm font-bold">
              <span className="text-slate-400">Subtotal</span><span>{fmt(subtotal)}</span>
            </div>
            {gstType === 'intra' && (
              <>
                <div className="flex justify-between text-sm font-bold">
                  <span className="text-emerald-400">CGST</span>
                  <span className="text-emerald-300">{fmt(cgst)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold">
                  <span className="text-emerald-400">SGST</span>
                  <span className="text-emerald-300">{fmt(sgst)}</span>
                </div>
              </>
            )}
            {gstType === 'inter' && (
              <div className="flex justify-between text-sm font-bold">
                <span className="text-amber-400">IGST</span>
                <span className="text-amber-300">{fmt(igst)}</span>
              </div>
            )}
            {gstType === 'none' && (
              <div className="flex justify-between text-sm font-bold">
                <span className="text-slate-400">Tax</span><span>{fmt(taxAmount)}</span>
              </div>
            )}
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="text-[9px] font-black text-slate-400 uppercase mb-1 block">Discount</label>
                <input type="number" min="0"
                  className="w-full p-2 bg-slate-800 rounded-xl text-white text-sm font-bold outline-none"
                  value={form.discount}
                  onChange={e => setForm(p => ({...p, discount: Number(e.target.value)}))} />
              </div>
              <div className="flex-1">
                <label className="text-[9px] font-black text-slate-400 uppercase mb-1 block">Shipping</label>
                <input type="number" min="0"
                  className="w-full p-2 bg-slate-800 rounded-xl text-white text-sm font-bold outline-none"
                  value={form.shipping}
                  onChange={e => setForm(p => ({...p, shipping: Number(e.target.value)}))} />
              </div>
            </div>
            <div className="pt-4 border-t-2 border-slate-800 flex justify-between items-end">
              <span className="text-[10px] font-black text-indigo-400 uppercase">Total Payable</span>
              <span className="text-3xl font-black">{fmt(totalAmount)}</span>
            </div>
          </div>

        </form>

        {/* Footer */}
        <div className="px-8 py-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 shrink-0">
          <button type="button" onClick={onClose}
            className="px-6 py-3 rounded-xl font-black text-xs uppercase text-slate-600 hover:bg-slate-100 transition-colors">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={loading}
            className="px-8 py-3 rounded-xl font-black text-xs uppercase text-white bg-indigo-600 hover:bg-indigo-700 transition-colors disabled:opacity-50">
            {loading ? 'Saving...' : 'Save Invoice'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateInvoiceModal;
