import React, { useState, useEffect, useContext, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { PDFDownloadLink } from '@react-pdf/renderer';
import InvoicePDF from './InvoicePDF';
import api from '../utils/api';
import { toast } from 'react-toastify';
import {
  FileDown, Plus, Trash2, Calendar, User, Printer,
  Hash, Info, ChevronDown, ChevronUp, MapPin, Building2
} from 'lucide-react';
import { CurrencyContext } from '../context/CurrencyContext';
import { searchHSN } from '../utils/hsnCodes';

const CreateInvoice = () => {
  const { symbol } = useContext(CurrencyContext);

  const [dbClients, setDbClients]   = useState([]);
  const [dbProducts, setDbProducts] = useState([]);
  const [sellerState, setSellerState] = useState('');
  const [profile, setProfile]         = useState({});

  // HSN dropdown state per item index
  const [hsnQuery, setHsnQuery]           = useState({});
  const [hsnResults, setHsnResults]       = useState({});
  const [showHsnDrop, setShowHsnDrop]     = useState({});

  const [invoice, setInvoice] = useState({
    invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
    poNumber: '',
    date: new Date().toISOString().split('T')[0],
    dueDate: '',
    paymentTerms: 'Due on Receipt',
    client: '',
    notes: '',
    discount: 0,
    shipping: 0,
    items: [{
      productId: '', variantId: '', name: '',
      hsnCode: '', quantity: 1, price: 0, taxRate: 0
    }],
  });

  const [totals, setTotals] = useState({
    subtotal: 0, taxAmount: 0, totalAmount: 0,
    cgst: 0, sgst: 0, igst: 0, gstType: 'none'
  });

  // ── Fetch data ────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const [cr, pr, prof] = await Promise.all([
          api.get('/clients'),
          api.get('/products'),
          api.get('/auth/profile'),
        ]);
        setDbClients(cr.data);
        setDbProducts(pr.data);
        setProfile(prof.data);
        setSellerState(prof.data.state || '');
      } catch {
        toast.error('Failed to load data');
      }
    };
    load();
  }, []);

  // ── Calculate totals ──────────────────────────────────────────────
  useEffect(() => {
    const subtotal   = invoice.items.reduce((a, i) => a + i.quantity * i.price, 0);
    const taxAmount  = invoice.items.reduce((a, i) => a + (i.quantity * i.price * (i.taxRate / 100)), 0);
    const totalAmount = (subtotal + taxAmount + Number(invoice.shipping || 0)) - Number(invoice.discount || 0);

    const client    = dbClients.find(c => c._id === invoice.client);
    const buyerState = client?.billingAddress?.state || '';

    let gstType = 'none', cgst = 0, sgst = 0, igst = 0;
    if (sellerState && buyerState) {
      if (sellerState.trim().toLowerCase() === buyerState.trim().toLowerCase()) {
        gstType = 'intra';
        cgst = sgst = Number((taxAmount / 2).toFixed(2));
      } else {
        gstType = 'inter';
        igst = Number(taxAmount.toFixed(2));
      }
    }
    setTotals({ subtotal, taxAmount, totalAmount, cgst, sgst, igst, gstType });
  }, [invoice, sellerState, dbClients]);

  // ── Item helpers ──────────────────────────────────────────────────
  const addItem = () => setInvoice(prev => ({
    ...prev,
    items: [...prev.items, { productId: '', variantId: '', name: '', hsnCode: '', quantity: 1, price: 0, taxRate: 0 }]
  }));

  const removeItem = (idx) => setInvoice(prev => ({
    ...prev, items: prev.items.filter((_, i) => i !== idx)
  }));

  const updateItem = (idx, field, value) => {
    const items = [...invoice.items];
    if (field === 'productId') {
      const prod = dbProducts.find(p => p._id === value);
      items[idx] = {
        ...items[idx],
        productId: value,
        name: prod?.title || '',
        hsnCode: prod?.hsnCode || '',
        taxRate: prod?.variants?.[0]?.taxRate || 0,
        price: prod?.variants?.[0]?.price || 0,
        variantId: prod?.variants?.[0]?._id || '',
      };
      // Sync HSN query display
      if (prod?.hsnCode) {
        setHsnQuery(prev => ({ ...prev, [idx]: prod.hsnCode }));
      }
    } else if (field === 'variantId') {
      const prod = dbProducts.find(p => p._id === items[idx].productId);
      const v    = prod?.variants?.find(v => v._id === value);
      items[idx] = { ...items[idx], variantId: value, price: v?.price || 0, taxRate: v?.taxRate || items[idx].taxRate };
    } else {
      items[idx][field] = value;
    }
    setInvoice(prev => ({ ...prev, items }));
  };

  // ── HSN search handlers ───────────────────────────────────────────
  const handleHsnInput = (idx, val) => {
    setHsnQuery(prev => ({ ...prev, [idx]: val }));
    updateItem(idx, 'hsnCode', val);
    if (val.trim().length >= 2) {
      setHsnResults(prev => ({ ...prev, [idx]: searchHSN(val) }));
      setShowHsnDrop(prev => ({ ...prev, [idx]: true }));
    } else {
      setShowHsnDrop(prev => ({ ...prev, [idx]: false }));
    }
  };

  const selectHsn = (idx, item) => {
    setHsnQuery(prev => ({ ...prev, [idx]: `${item.code}` }));
    updateItem(idx, 'hsnCode', item.code);
    setShowHsnDrop(prev => ({ ...prev, [idx]: false }));
  };

  // ── Save ──────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!invoice.client)  return toast.error('Please select a client');
    if (!invoice.dueDate) return toast.error('Please select a due date');
    try {
      const client    = dbClients.find(c => c._id === invoice.client);
      const buyerState = client?.billingAddress?.state || '';
      await api.post('/invoices', {
        ...invoice,
        clientId: invoice.client,
        gstType: totals.gstType,
        sellerState, buyerState,
      });
      toast.success('🚀 Invoice saved!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    }
  };

  // ── PDF data builder ──────────────────────────────────────────────
  const buildPdfData = () => {
    const client     = dbClients.find(c => c._id === invoice.client);
    const addr       = client?.billingAddress || {};
    return {
      ...invoice, ...totals, symbol,
      businessName:    profile.businessName    || '',
      businessAddress: profile.businessAddress || '',
      state:           profile.state           || '',
      gstNumber:       profile.gstNumber       || '',
      senderEmail:     profile.email           || '',
      phone:           profile.phone           || '',
      logo:            profile.logo            || null,
      sellerState,
      buyerState:      addr.state              || '',
      clientName:      client?.name            || '',
      clientEmail:     client?.email           || '',
      clientPhone:     client?.phone           || '',
      clientAddress:   [addr.street, addr.city, addr.zip].filter(Boolean).join(', '),
      clientGstin:     client?.taxId           || '',
      dbProducts,
    };
  };

  const handlePrint = async () => {
    try {
      const { pdf } = await import('@react-pdf/renderer');
      const blob = await pdf(<InvoicePDF data={buildPdfData()} />).toBlob();
      const url  = URL.createObjectURL(blob);
      const win  = window.open(url, '_blank');
      if (win) win.addEventListener('load', () => { win.focus(); win.print(); });
    } catch (err) {
      toast.error('Print failed: ' + err.message);
    }
  };

  const selectedClient = dbClients.find(c => c._id === invoice.client);
  const buyerState     = selectedClient?.billingAddress?.state || '';
  const fmt = (n) => `${symbol}${Number(n || 0).toFixed(2)}`;

  const hsnInputRefs = useRef({});

  // Portal dropdown — renders at exact screen coords of the triggering input
  const HsnDropdown = ({ idx }) => {
    const inputEl = hsnInputRefs.current[idx];
    if (!inputEl || !showHsnDrop[idx] || !(hsnResults[idx] || []).length) return null;
    const rect = inputEl.getBoundingClientRect();
    return ReactDOM.createPortal(
      <div
        style={{
          position: 'fixed',
          top: rect.bottom + 4,
          left: rect.left,
          width: Math.max(rect.width, 440),
          maxWidth: 'calc(100vw - 32px)',
          zIndex: 99999,
        }}
        className="bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden"
        onMouseDown={e => e.preventDefault()}
      >
        <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-100 bg-indigo-50">
          <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">
            {(hsnResults[idx] || []).length} matches for &quot;{hsnQuery[idx] || ''}&quot;
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
              key={i}
              type="button"
              onMouseDown={() => selectHsn(idx, h)}
              className="w-full text-left px-4 py-3 hover:bg-indigo-50 active:bg-indigo-100 flex items-start gap-3 transition-colors"
            >
              <span className="text-[11px] font-black text-white bg-indigo-500 px-2 py-1 rounded-lg shrink-0 min-w-14 text-center leading-tight">
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

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto bg-slate-50 min-h-screen">
      {/* ── Page Header ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Create Invoice</h2>
          <p className="text-slate-500 font-medium text-sm mt-1">GST-compliant billing with auto CGST / SGST / IGST</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={handleSave}
            className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-xl">
            Save Invoice
          </button>
          <PDFDownloadLink
            document={<InvoicePDF data={buildPdfData()} />}
            fileName={`${invoice.invoiceNumber}.pdf`}
            className="bg-white text-slate-900 px-5 py-3 rounded-2xl font-black text-xs uppercase border border-slate-200 flex items-center gap-2 hover:bg-slate-50 transition-all"
          >
            <FileDown size={16} /> Export PDF
          </PDFDownloadLink>
          <button onClick={handlePrint}
            className="bg-white text-slate-700 px-5 py-3 rounded-2xl font-black text-xs uppercase border border-slate-200 flex items-center gap-2 hover:bg-slate-50 transition-all">
            <Printer size={16} /> Print
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Left: main form ── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Invoice Meta */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-5">Invoice Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Invoice No.</label>
                <input
                  className="w-full p-3 bg-slate-50 rounded-xl outline-none font-black text-sm text-slate-700"
                  value={invoice.invoiceNumber}
                  onChange={e => setInvoice(p => ({ ...p, invoiceNumber: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block flex items-center gap-1"><Calendar size={10}/> Date</label>
                <input type="date"
                  className="w-full p-3 bg-slate-50 rounded-xl outline-none font-bold text-sm"
                  value={invoice.date}
                  onChange={e => setInvoice(p => ({ ...p, date: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Due Date</label>
                <input type="date"
                  className="w-full p-3 bg-slate-50 rounded-xl outline-none font-bold text-sm"
                  onChange={e => setInvoice(p => ({ ...p, dueDate: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">PO Number (optional)</label>
                <input
                  className="w-full p-3 bg-slate-50 rounded-xl outline-none font-bold text-sm"
                  placeholder="PO-XXXXX"
                  value={invoice.poNumber}
                  onChange={e => setInvoice(p => ({ ...p, poNumber: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Payment Terms</label>
                <select
                  className="w-full p-3 bg-slate-50 rounded-xl outline-none font-bold text-sm cursor-pointer"
                  value={invoice.paymentTerms}
                  onChange={e => setInvoice(p => ({ ...p, paymentTerms: e.target.value }))}
                >
                  <option>Due on Receipt</option>
                  <option>Net 7</option>
                  <option>Net 15</option>
                  <option>Net 30</option>
                  <option>Net 45</option>
                  <option>Net 60</option>
                </select>
              </div>
            </div>
          </div>

          {/* Client + GST Info */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-5 flex items-center gap-2">
              <User size={11}/> Bill To
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Select Client</label>
                <select
                  className="w-full p-3 bg-slate-50 rounded-xl outline-none font-bold text-sm cursor-pointer"
                  value={invoice.client}
                  onChange={e => setInvoice(p => ({ ...p, client: e.target.value }))}
                >
                  <option value="">Choose a client...</option>
                  {dbClients.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
              </div>

              {/* Show client details + state when selected */}
              {selectedClient && (
                <div className="bg-slate-50 rounded-2xl p-4 text-sm space-y-1">
                  <p className="font-black text-slate-800">{selectedClient.name}</p>
                  {selectedClient.email && <p className="text-slate-500 text-xs">{selectedClient.email}</p>}
                  {selectedClient.billingAddress?.city && (
                    <p className="text-slate-500 text-xs flex items-center gap-1">
                      <MapPin size={10}/>
                      {[selectedClient.billingAddress.city, selectedClient.billingAddress.state].filter(Boolean).join(', ')}
                    </p>
                  )}
                  {selectedClient.taxId && (
                    <p className="text-xs font-black text-indigo-600 mt-1">GSTIN: {selectedClient.taxId}</p>
                  )}
                  {!buyerState && (
                    <p className="text-[10px] text-amber-600 font-bold mt-1">
                      ⚠ No state set — GST type cannot be determined. Edit client to add billing state.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* GST Type indicator */}
            {sellerState && buyerState && (
              <div className={`mt-4 flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold
                ${totals.gstType === 'intra' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                <Building2 size={14}/>
                {totals.gstType === 'intra'
                  ? `Intra-State Supply — CGST + SGST applies (${sellerState})`
                  : `Inter-State Supply — IGST applies (${sellerState} → ${buyerState})`}
              </div>
            )}
          </div>

          {/* Line Items */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-5">Line Items</h3>

            <div className="space-y-4">
              {invoice.items.map((item, idx) => {
                const prod = dbProducts.find(p => p._id === item.productId);
                const lineTotal = item.quantity * item.price;
                const lineTax   = lineTotal * (item.taxRate / 100);
                const halfTax   = lineTax / 2;

                return (
                  <div key={idx} className="border border-slate-100 rounded-2xl p-4 space-y-3 bg-slate-50/30" style={{overflow: 'visible'}}>

                    {/* Row 1: Product + Variant */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase mb-1 block">Product</label>
                        <select
                          className="w-full p-2.5 bg-white rounded-xl text-sm font-bold outline-none border border-slate-200"
                          value={item.productId}
                          onChange={e => updateItem(idx, 'productId', e.target.value)}
                        >
                          <option value="">Choose product...</option>
                          {dbProducts.map(p => <option key={p._id} value={p._id}>{p.title}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase mb-1 block">Variant</label>
                        <select
                          className="w-full p-2.5 bg-white rounded-xl text-sm font-bold outline-none border border-slate-200"
                          value={item.variantId}
                          onChange={e => updateItem(idx, 'variantId', e.target.value)}
                          disabled={!item.productId}
                        >
                          {(prod?.variants || []).map(v => (
                            <option key={v._id} value={v._id}>{v.name} (Stock: {v.stock})</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* HSN search */}
                    <div className="relative" style={{zIndex: 10}}>
                      <label className="text-[9px] font-black text-slate-400 uppercase mb-1 flex items-center gap-1">
                        <Hash size={9}/> HSN / SAC Code
                        {!item.hsnCode && (
                          <span className="text-amber-500 font-bold normal-case ml-1">— not set, type to search or enter manually</span>
                        )}
                      </label>
                      <div className="flex gap-2">
                        <input
                          ref={el => hsnInputRefs.current[idx] = el}
                          type="text"
                          value={hsnQuery[idx] ?? item.hsnCode}
                          onChange={e => handleHsnInput(idx, e.target.value)}
                          onFocus={() => {
                            if ((hsnQuery[idx] || item.hsnCode || '').length >= 2)
                              setShowHsnDrop(p => ({...p, [idx]: true}));
                          }}
                          onBlur={() => setTimeout(() => setShowHsnDrop(p => ({...p, [idx]: false})), 200)}
                          placeholder="Search by code (8471) or product name (mobile, cotton)..."
                          className={`flex-1 p-2.5 border rounded-xl text-xs font-bold outline-none transition-all
                            ${item.hsnCode
                              ? 'bg-indigo-50 border-indigo-200 text-indigo-800 focus:ring-2 focus:ring-indigo-300'
                              : 'bg-white border-slate-200 focus:ring-2 focus:ring-amber-200 focus:border-amber-300'
                            }`}
                          autoComplete="off"
                        />
                        {item.hsnCode && (
                          <span className="flex items-center bg-indigo-500 text-white text-[10px] font-black px-3 rounded-xl whitespace-nowrap shadow-sm">
                            {item.hsnCode}
                          </span>
                        )}
                      </div>
                      {/* Portal dropdown */}
                      <HsnDropdown idx={idx} />
                    </div>

                    {/* Row 3: Qty, Price, Tax */}
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase mb-1 block">Qty</label>
                        <input type="number" min="1"
                          className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none text-center"
                          value={item.quantity}
                          onChange={e => updateItem(idx, 'quantity', Number(e.target.value))}
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase mb-1 block">Rate ({symbol})</label>
                        <input type="number" min="0" step="0.01"
                          className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none"
                          value={item.price}
                          onChange={e => updateItem(idx, 'price', Number(e.target.value))}
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase mb-1 block">Tax %</label>
                        <input type="number" min="0" max="100" step="0.1"
                          className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none"
                          value={item.taxRate}
                          onChange={e => updateItem(idx, 'taxRate', Number(e.target.value))}
                        />
                      </div>
                    </div>

                    {/* Row 4: GST breakdown per line */}
                    {lineTotal > 0 && (
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <span className="text-[10px] text-slate-400 font-bold">
                          Taxable: <span className="text-slate-700">{fmt(lineTotal)}</span>
                        </span>
                        {totals.gstType === 'intra' ? (
                          <>
                            <span className="text-[10px] bg-emerald-50 text-emerald-700 font-black px-2 py-0.5 rounded-lg">
                              CGST {item.taxRate/2}% = {fmt(halfTax)}
                            </span>
                            <span className="text-[10px] bg-emerald-50 text-emerald-700 font-black px-2 py-0.5 rounded-lg">
                              SGST {item.taxRate/2}% = {fmt(halfTax)}
                            </span>
                          </>
                        ) : totals.gstType === 'inter' ? (
                          <span className="text-[10px] bg-amber-50 text-amber-700 font-black px-2 py-0.5 rounded-lg">
                            IGST {item.taxRate}% = {fmt(lineTax)}
                          </span>
                        ) : (
                          <span className="text-[10px] bg-slate-100 text-slate-600 font-black px-2 py-0.5 rounded-lg">
                            Tax {item.taxRate}% = {fmt(lineTax)}
                          </span>
                        )}
                        <span className="ml-auto text-sm font-black text-slate-800">
                          {fmt(lineTotal + lineTax)}
                        </span>
                        <button type="button" onClick={() => removeItem(idx)}
                          className="text-rose-400 hover:bg-rose-50 p-1 rounded-lg transition-colors ml-1">
                          <Trash2 size={14}/>
                        </button>
                      </div>
                    )}
                    {lineTotal === 0 && (
                      <div className="flex justify-end">
                        <button type="button" onClick={() => removeItem(idx)}
                          className="text-rose-400 hover:bg-rose-50 p-1 rounded-lg transition-colors">
                          <Trash2 size={14}/>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}

              <button onClick={addItem}
                className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center gap-2 text-slate-400 font-black text-xs uppercase hover:border-indigo-400 hover:text-indigo-500 transition-all">
                <Plus size={14}/> Add Line Item
              </button>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Notes / Terms & Conditions</label>
            <textarea rows={3}
              className="w-full p-3 bg-slate-50 rounded-xl outline-none text-sm font-medium text-slate-700 resize-none"
              placeholder="Payment instructions, terms, thank you note..."
              value={invoice.notes}
              onChange={e => setInvoice(p => ({ ...p, notes: e.target.value }))}
            />
          </div>
        </div>

        {/* ── Right: Summary sidebar ── */}
        <div className="space-y-5">

          {/* Financial Summary */}
          <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-xl">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-5">Summary</h3>

            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-sm font-bold">
                <span className="text-slate-400">Subtotal</span>
                <span>{fmt(totals.subtotal)}</span>
              </div>

              {/* GST breakdown */}
              {totals.gstType === 'intra' && (
                <>
                  <div className="flex justify-between text-sm font-bold">
                    <span className="text-emerald-400">CGST</span>
                    <span className="text-emerald-300">{fmt(totals.cgst)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold">
                    <span className="text-emerald-400">SGST</span>
                    <span className="text-emerald-300">{fmt(totals.sgst)}</span>
                  </div>
                  <div className="text-[9px] font-black text-emerald-600/60 uppercase tracking-widest">Intra-State Supply</div>
                </>
              )}
              {totals.gstType === 'inter' && (
                <>
                  <div className="flex justify-between text-sm font-bold">
                    <span className="text-amber-400">IGST</span>
                    <span className="text-amber-300">{fmt(totals.igst)}</span>
                  </div>
                  <div className="text-[9px] font-black text-amber-600/60 uppercase tracking-widest">Inter-State Supply</div>
                </>
              )}
              {totals.gstType === 'none' && totals.taxAmount > 0 && (
                <div className="flex justify-between text-sm font-bold">
                  <span className="text-slate-400">Tax</span>
                  <span>{fmt(totals.taxAmount)}</span>
                </div>
              )}

              {/* States */}
              {(sellerState || buyerState) && (
                <div className="bg-slate-800 rounded-xl p-3 space-y-1.5 text-[10px] font-bold">
                  <div className="flex justify-between text-slate-400">
                    <span>Seller State</span>
                    <span className="text-slate-300">{sellerState || '—'}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Buyer State</span>
                    <span className="text-slate-300">{buyerState || '—'}</span>
                  </div>
                </div>
              )}

              {/* Discount & Shipping */}
              <div className="flex justify-between text-sm font-bold">
                <span className="text-slate-400">Discount</span>
                <div className="flex items-center gap-1">
                  <span className="text-slate-500 text-xs">{symbol}</span>
                  <input type="number" min="0"
                    className="w-20 bg-slate-800 rounded-lg px-2 py-1 text-right text-xs font-black outline-none"
                    value={invoice.discount}
                    onChange={e => setInvoice(p => ({ ...p, discount: Number(e.target.value) }))}
                  />
                </div>
              </div>
              <div className="flex justify-between text-sm font-bold">
                <span className="text-slate-400">Shipping</span>
                <div className="flex items-center gap-1">
                  <span className="text-slate-500 text-xs">{symbol}</span>
                  <input type="number" min="0"
                    className="w-20 bg-slate-800 rounded-lg px-2 py-1 text-right text-xs font-black outline-none"
                    value={invoice.shipping}
                    onChange={e => setInvoice(p => ({ ...p, shipping: Number(e.target.value) }))}
                  />
                </div>
              </div>
            </div>

            <div className="pt-5 border-t-2 border-slate-800">
              <p className="text-[10px] font-black uppercase text-indigo-400 mb-1">Total Payable</p>
              <p className="text-4xl font-black">{fmt(totals.totalAmount)}</p>
            </div>
          </div>

          {/* Items HSN summary */}
          {invoice.items.some(i => i.name) && (
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">HSN Summary</h4>
              <div className="space-y-2">
                {invoice.items.filter(i => i.name).map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <span className="text-slate-600 font-bold truncate max-w-35">{item.name}</span>
                    {item.hsnCode
                      ? <span className="text-[10px] font-black bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-lg">{item.hsnCode}</span>
                      : <span className="text-[10px] text-amber-500 font-bold">No HSN</span>
                    }
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Seller info */}
          {profile.businessName && (
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 text-xs space-y-1">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">From</h4>
              <p className="font-black text-slate-800">{profile.businessName}</p>
              {profile.businessAddress && <p className="text-slate-500">{profile.businessAddress}</p>}
              {profile.state && <p className="text-slate-500">{profile.state}</p>}
              {profile.gstNumber && <p className="text-indigo-600 font-bold">GSTIN: {profile.gstNumber}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateInvoice;
