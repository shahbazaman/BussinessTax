import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../utils/api';
import Select from 'react-select';

const InvoiceModal = ({ isOpen, onClose, onRefresh, clients, products, accounts, invoices, editData, initialType }) => {
  const [formData, setFormData] = useState({
    type: 'Sale',
    invoiceNumber: '',
    purchaseNumber: '',
    referenceNumber: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    client: '',
    gstNumber: '',
    billingAddress: '',
    shippingAddress: '',
    items: [],
    globalTaxRate: 0,
    discount: 0,
    paidIntoAccount: accounts?.[0]?._id || '',
    status: 'Pending'
  });

  const [loading, setLoading] = useState(false);
useEffect(() => {
    if (isOpen) {
      if (editData) {
      } else {
        const type = initialType || 'Sale';    
        const typeInvoices = invoices?.filter(inv => inv.type === type) || [];
        const maxNumber = typeInvoices.reduce((max, inv) => {
          const numStr = type === 'Sale' ? inv.invoiceNumber : inv.purchaseNumber;
          if (!numStr) return max;
          
          const match = numStr.match(/\d+$/); 
          const currentNum = match ? parseInt(match[0], 10) : 0;
          
          return currentNum > max ? currentNum : max;
        }, 0);
        const nextSequence = String(maxNumber + 1).padStart(3, '0');

        setFormData({
          type: type,
          invoiceNumber: type === 'Sale' ? `INV-S-${nextSequence}` : '',
          purchaseNumber: type === 'Purchase' ? `INV-P-${nextSequence}` : '',
          referenceNumber: '',
          invoiceDate: new Date().toISOString().split('T')[0],
          client: '',
          gstNumber: '',
          billingAddress: '',
          shippingAddress: '',
          items: [],
          globalTaxRate: 0,
          discount: 0,
          paidIntoAccount: accounts?.[0]?._id || '',
          status: 'Pending'
        });
      }
    }
  }, [isOpen, editData, initialType, invoices, accounts]);
  if (!products || products.length === 0) {
  return (
    <div className="p-8 text-center text-slate-400">
      <p>Loading products...</p>
    </div>
  );
}
const productOptions = products.flatMap(p => 
  (p.variants || []).map(v => ({
    value: `${p._id}-${v._id}`, // Unique ID combining product and variant
    label: `${p.title || 'Unknown Product'} (${v.name || 'Default'}) | SKU: ${v.sku || 'N/A'} | Price: ₹${v.price || '0'}`,
    data: { 
      _id: p._id, 
      name: p.title, // Map 'title' from your object to 'name'
      variant: v 
    }
  }))
);

const handleProductSelect = (selectedOption) => {
  if (!selectedOption) return;  
  const { _id, name, variant } = selectedOption.data;
  if (formData.items.find(item => item.variantId === variant._id)) {
    toast.info("This specific variant is already added.");
    return;
  }
  setFormData({
    ...formData,
    globalTaxRate: variant.taxRate || 0, 
    items: [
      ...formData.items,
      {
        productId: _id,
        variantId: variant._id,
        name: `${name} (${variant.name})`,
        sku: variant.sku,
        barcode: variant.barcode,
        quantity: 1,
        price: variant.price
      }
    ]
  });
  toast.success(`Added ${name} - Tax set to ${variant.taxRate || 0}%`);
};

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = Number(value);
    setFormData({ ...formData, items: newItems });
  };

  const removeItem = (index) => {
    setFormData({ ...formData, items: formData.items.filter((_, i) => i !== index) });
  };

  const calculateTotals = () => {
    const subtotal = formData.items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const tax = subtotal * (formData.globalTaxRate / 100);
    return { subtotal, tax, total: subtotal + tax - formData.discount };
  };

  const totals = calculateTotals();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.client) return toast.error("Please select a party");
    if (formData.items.length === 0) return toast.error("Add at least one item");
console.log("Sending Payload to Server:", JSON.stringify(formData, null, 2));
    setLoading(true);
    try {
      if (editData) {
        await api.put(`/invoices/${editData._id}`, formData);
        toast.success("Updated successfully");
      } else {
        await api.post('/invoices', formData);
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex justify-center items-center p-4">
      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header Section */}
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

        {/* Form Body */}
        <div className="p-8 overflow-y-auto custom-scrollbar">
          <form id="invoice-form" onSubmit={handleSubmit} className="space-y-8">
            
            {/* Toggle Switch */}
            {!editData && (
              <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
                {['Sale', 'Purchase'].map(t => (
                  <button
                    key={t} type="button"
                    onClick={() => setFormData({ ...formData, type: t })}
                    className={`px-8 py-2.5 rounded-lg font-black uppercase text-[10px] tracking-widest transition-all ${formData.type === t ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    {t} Invoice
                  </button>
                ))}
              </div>
            )}

            {/* Top Grid Fields */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {formData.type === 'Sale' ? (
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Inv No.</label>
                  <input type="text" className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl text-sm font-bold outline-none" value={formData.invoiceNumber} onChange={e => setFormData({...formData, invoiceNumber: e.target.value})} required />
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Purchase No.</label>
                    <input type="text" className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl text-sm font-bold outline-none" value={formData.purchaseNumber} onChange={e => setFormData({...formData, purchaseNumber: e.target.value})} required />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Bill Ref No.</label>
                    <input type="text" className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl text-sm font-bold outline-none" value={formData.referenceNumber} onChange={e => setFormData({...formData, referenceNumber: e.target.value})} />
                  </div>
                </>
              )}
              
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Date</label>
                <input type="date" className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl text-sm font-bold outline-none uppercase" value={formData.invoiceDate} onChange={e => setFormData({...formData, invoiceDate: e.target.value})} required />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{formData.type === 'Sale' ? 'Customer Name' : 'Supplier Name'}</label>
                <select className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl text-sm font-bold outline-none" value={formData.client} onChange={e => setFormData({...formData, client: e.target.value})} required>
                  <option value="">Choose Party...</option>
                  {clients.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
              </div>
            </div>

            {/* Address Logic */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/50 p-6 rounded-2xl border border-slate-100">
              <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">GSTIN (Optional)</label>
                  <input type="text" className="w-full bg-white border border-slate-200 px-4 py-3 rounded-xl text-sm font-bold outline-none" value={formData.gstNumber} onChange={e => setFormData({...formData, gstNumber: e.target.value})} />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Billing Address</label>
                <textarea rows="2" className="w-full bg-white border border-slate-200 px-4 py-3 rounded-xl text-sm font-bold outline-none resize-none" value={formData.billingAddress} onChange={e => setFormData({...formData, billingAddress: e.target.value})} />
              </div>
              {/* {formData.type === 'Sale' && (
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Shipping Address</label>
                  <textarea rows="2" className="w-full bg-white border border-slate-200 px-4 py-3 rounded-xl text-sm font-bold outline-none resize-none" value={formData.shippingAddress} onChange={e => setFormData({...formData, shippingAddress: e.target.value})} />
                </div>
              )} */}
            </div>

            {/* Item Management */}
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

              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Item</th>
                      <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest w-24">Qty</th>
                      <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest w-32">Rate</th>
                      <th className="px-4 py-3 w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {formData.items.map((item, idx) => (
                      <tr key={item.variantId} className="bg-white">
                        <td className="px-4 py-3"><div className="text-sm font-bold">{item.name}</div></td>
                        <td className="px-4 py-3"><input type="number" min="1" className="w-full p-2 border rounded-lg text-center" value={item.quantity} onChange={e => handleItemChange(idx, 'quantity', e.target.value)} /></td>
                        <td className="px-4 py-3"><input type="number" step="0.01" className="w-full p-2 border rounded-lg" value={item.price} onChange={e => handleItemChange(idx, 'price', e.target.value)} /></td>
                        <td className="px-4 py-3"><button type="button" onClick={() => removeItem(idx)} className="text-rose-400"><Trash2 size={16} /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            {/* Totals Calculation Section */}
<div className="flex justify-end pt-6 border-t border-slate-100">
  <div className="w-full md:w-1/2 space-y-4">
    <div className="flex items-center justify-between gap-4">
      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tax Rate (%)</span>
      <input 
        type="number" 
        className="w-32 bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl text-sm font-bold outline-none text-right" 
        value={formData.globalTaxRate} 
        onChange={e => setFormData({...formData, globalTaxRate: Number(e.target.value)})} 
      />
    </div>
    <div className="flex items-center justify-between gap-4">
      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Discount (₹)</span>
      <input 
        type="number" 
        className="w-32 bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl text-sm font-bold outline-none text-right" 
        value={formData.discount} 
        onChange={e => setFormData({...formData, discount: Number(e.target.value)})} 
      />
    </div>
    <div className="flex justify-between items-center py-2 border-t border-slate-100">
      <span className="text-xs font-bold text-slate-400">Subtotal</span>
      <span className="text-sm font-bold text-slate-800">₹{totals.subtotal.toFixed(2)}</span>
    </div>    
    <div className="flex justify-between items-center py-2">
      <span className="text-xs font-bold text-slate-400">Tax Amount</span>
      <span className="text-sm font-bold text-slate-800">₹{totals.tax.toFixed(2)}</span>
    </div>
    <div className="flex justify-between items-center py-4 border-t border-slate-200">
      <span className="text-lg font-black text-slate-900 uppercase tracking-widest">Grand Total</span>
      <span className="text-2xl font-black text-indigo-600">₹{totals.total.toFixed(2)}</span>
    </div>
  </div>
</div>
          </form>
        </div>

        {/* Footer Actions */}
        <div className="px-8 py-5 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-6 py-3 rounded-xl font-black text-[10px] uppercase">Cancel</button>
          <button type="submit" form="invoice-form" disabled={loading} className="px-8 py-3 rounded-xl font-black text-[10px] uppercase text-white bg-indigo-600">
            {loading ? 'Saving...' : 'Save Invoice'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default InvoiceModal;