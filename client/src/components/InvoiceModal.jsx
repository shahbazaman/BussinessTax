import React, { useState, useEffect } from 'react';
import { X, Search, Trash2, Save, Loader2, ShoppingCart, ShoppingBag, Hash, Calendar } from 'lucide-react';
import api from '../utils/api.js';
import { toast } from 'react-toastify';

const INITIAL_INVOICE = { 
  clientId: '', 
  invoiceNumber: '', // For Sales
  referenceNumber: '', // For Purchases
  invoiceDate: new Date().toISOString().split('T')[0],
  status: 'Pending',
  gstNumber: '',
  billingAddress: '',
  discount: 0
};

const InvoiceModal = ({ isOpen, onClose, onRefresh, clients, products, editData, initialType = 'Sale' }) => {
  const [type, setType] = useState('Sale');
  const [invoiceData, setInvoiceData] = useState(INITIAL_INVOICE);
  const [selectedItems, setSelectedItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [globalTaxRate, setGlobalTaxRate] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // BARCODE/SKU QUICK-ADD LISTENER
  useEffect(() => {
    if (searchQuery.length > 2) {
      const found = products.flatMap(p => 
        p.variants.map(v => ({ ...v, parentTitle: p.title, parentId: p._id }))
      ).find(v => v.barcode === searchQuery || v.sku === searchQuery);

      if (found) {
        addItem({ _id: found.parentId, title: found.parentTitle }, found);
        setSearchQuery('');
        toast.success(`Quick added: ${found.parentTitle}`);
      }
    }
  }, [searchQuery, products]);

  useEffect(() => {
    if (editData && isOpen) {
      setType(editData.type || 'Sale');
      setInvoiceData({
        clientId: editData.client?._id || editData.client || '',
        invoiceNumber: editData.invoiceNumber || '',
        referenceNumber: editData.referenceNumber || '',
        invoiceDate: editData.invoiceDate ? new Date(editData.invoiceDate).toISOString().split('T')[0] : '',
        status: editData.status || 'Pending',
        gstNumber: editData.gstNumber || '',
        billingAddress: editData.billingAddress || '',
        discount: editData.discount || 0
      });
      setSelectedItems(editData.items.map(item => ({
        productId: item.productId?._id || item.productId,
        variantId: item.variantId,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
      })));
      setGlobalTaxRate(editData.globalTaxRate || 0);
    } else if (isOpen) {
      handleReset();
      setType(initialType);
    }
  }, [editData, isOpen, initialType]);

  if (!isOpen) return null;

  // Global Tax Calculation: (Subtotal - Discount) * (TaxRate / 100)
  const subtotal = selectedItems.reduce((sum, item) => sum + (Number(item.price) * Number(item.quantity)), 0);
  const netAfterDiscount = subtotal - Number(invoiceData.discount || 0);
  const taxAmount = netAfterDiscount * (Number(globalTaxRate || 0) / 100);
  const totalAmount = netAfterDiscount + taxAmount;

  const addItem = (product, variant) => {
    if (selectedItems.find(item => item.variantId === variant._id)) return toast.info("Item already added.");
    setSelectedItems([...selectedItems, {
      productId: product._id,
      variantId: variant._id,
      name: `${product.title} (${variant.name})`,
      price: variant.price,
      quantity: 1
    }]);
  };

  const handleReset = () => {
    setInvoiceData(INITIAL_INVOICE);
    setSelectedItems([]);
    setSearchQuery('');
    setGlobalTaxRate(0);
    setIsSubmitting(false);
  };

  const handleClose = () => { handleReset(); onClose(); };

  const handleSubmit = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    if (isSubmitting) return;
    if (!invoiceData.clientId) return toast.warning("Select a party.");
    if (selectedItems.length === 0) return toast.warning('Add at least one product.');

    setIsSubmitting(true);
    try {
      const payload = { 
        ...invoiceData, 
        type, 
        items: selectedItems, 
        globalTaxRate: Number(globalTaxRate)
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
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h2 className="text-xl font-black text-slate-800 uppercase">{editData ? `Edit ${type}` : `New ${type}`}</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Auto-Pilot Billing & Inventory Sync</p>
          </div>
          <button onClick={handleClose} className="p-2 hover:bg-slate-200 rounded-full"><X /></button>
        </div>

        <div className="p-8 overflow-y-auto space-y-8 flex-1">
          {!editData && (
            <div className="flex bg-slate-100 p-1.5 rounded-2xl w-full">
              <button onClick={() => setType('Sale')} className={`flex-1 py-3 rounded-xl font-black uppercase text-[10px] ${type === 'Sale' ? 'bg-white shadow-md text-indigo-600' : 'text-slate-400'}`}><ShoppingCart size={14}/> Sales</button>
              <button onClick={() => setType('Purchase')} className={`flex-1 py-3 rounded-xl font-black uppercase text-[10px] ${type === 'Purchase' ? 'bg-white shadow-md text-rose-600' : 'text-slate-400'}`}><ShoppingBag size={14}/> Purchase</button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Party</label>
              <select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-xs" value={invoiceData.clientId} onChange={(e) => setInvoiceData({...invoiceData, clientId: e.target.value})}>
                <option value="">Select...</option>
                {clients.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Date</label>
              <input type="date" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-xs" value={invoiceData.invoiceDate} onChange={(e) => setInvoiceData({...invoiceData, invoiceDate: e.target.value})} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-2">GSTIN</label>
              <input type="text" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-xs uppercase" value={invoiceData.gstNumber} onChange={(e) => setInvoiceData({...invoiceData, gstNumber: e.target.value})} />
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input type="text" placeholder="Scan Barcode / Search Product Name..." className="w-full p-4 pl-12 bg-white border-2 border-slate-100 rounded-2xl font-bold text-sm" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>

          <div className="space-y-3">
            {selectedItems.map((item, index) => (
              <div key={index} className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl">
                <p className="flex-1 font-bold text-sm text-slate-800">{item.name}</p>
                <input type="number" className="w-16 p-2 rounded-xl text-center font-bold" value={item.quantity} onChange={(e) => {
                  const updated = [...selectedItems];
                  updated[index].quantity = Math.max(1, Number(e.target.value));
                  setSelectedItems(updated);
                }} />
                <button onClick={() => setSelectedItems(selectedItems.filter((_, i) => i !== index))} className="text-rose-500"><Trash2 size={18}/></button>
              </div>
            ))}
          </div>
        </div>

        <div className="p-8 bg-slate-900 rounded-4xl text-white flex flex-col md:flex-row justify-between items-center gap-8 shadow-xl">
          <div className="flex gap-8">
            <div>
              <p className="text-[10px] text-slate-400 uppercase mb-1">Global Tax %</p>
              <input type="number" className="bg-white/10 rounded-xl p-2 w-20 font-bold" value={globalTaxRate} onChange={(e) => setGlobalTaxRate(e.target.value)} />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase mb-1">Total</p>
              <p className="text-2xl font-black">₹{totalAmount.toLocaleString()}</p>
            </div>
          </div>
          <button onClick={handleSubmit} className="px-10 py-4 bg-white text-slate-900 rounded-2xl font-black uppercase text-xs flex gap-2">
            {isSubmitting ? <Loader2 className="animate-spin"/> : <Save size={18}/>} Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

export default InvoiceModal;