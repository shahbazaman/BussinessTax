import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Save, Package, AlertCircle, Edit3 } from 'lucide-react';
import api from '../utils/api';
import { toast } from 'react-toastify';

const AddProductModal = ({ isOpen, onClose, onRefresh, editingProduct }) => {
  const initialState = {
    title: '',
    category: '',
    lowStockAlert: 10,
    variants: [{ name: '', weight: '', unit: 'kg', price: '', stock: '', sku: '' }]
  };

  const [productData, setProductData] = useState(initialState);
  
  // Determine mode based on whether editingProduct exists
  const isEditing = !!editingProduct;

  // Sync form data when modal opens or editingProduct changes
  useEffect(() => {
    if (isOpen) {
      if (editingProduct) {
        setProductData(editingProduct);
      } else {
        setProductData(initialState);
      }
    }
  }, [isOpen, editingProduct]);

  const handleChange = (e) => {
    setProductData({ ...productData, [e.target.name]: e.target.value });
  };

  const handleVariantChange = (index, e) => {
    const newVariants = [...productData.variants];
    newVariants[index][e.target.name] = e.target.value;
    setProductData({ ...productData, variants: newVariants });
  };

  const addVariantField = () => {
    setProductData({
      ...productData,
      variants: [...productData.variants, { name: '', weight: '', unit: 'kg', price: '', stock: '', sku: '' }]
    });
  };

  const removeVariantField = (index) => {
    if (productData.variants.length > 1) {
      const newVariants = productData.variants.filter((_, i) => i !== index);
      setProductData({ ...productData, variants: newVariants });
    } else {
      toast.warning("At least one variant is required");
    }
  };

const handleSubmit = async (e) => {
  e.preventDefault();

  // 1. Filter out variants that don't have a name or price
  // 2. Convert strings to numbers
  const validVariants = productData.variants
    .filter(v => v.name.trim() !== '' && v.price !== '') 
    .map(v => ({
      ...v,
      weight: Number(v.weight) || 0,
      price: Number(v.price),
      stock: Number(v.stock) || 0,
      sku: v.sku?.trim() === "" ? undefined : v.sku
    }));

  if (validVariants.length === 0) {
    return toast.error("At least one complete variant is required.");
  }

  const sanitizedData = {
    ...productData,
    lowStockAlert: Number(productData.lowStockAlert) || 10,
    variants: validVariants
  };

  try {
    if (isEditing) {
      await api.put(`/products/${editingProduct._id}`, sanitizedData);
      toast.success("Inventory Synchronized");
    } else {
      await api.post('/products', sanitizedData);
      toast.success("Product Cataloged Successfully");
    }
    onRefresh();
    onClose();
  } catch (err) {
    console.error("Payload Error:", err.response?.data);
    toast.error(err.response?.data?.message || "Validation Failed");
  }
};

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-[3rem] w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-white/20">
        
        {/* --- Header: Dynamic Title and Icon --- */}
        <div className="p-8 pb-4 flex justify-between items-center border-b border-slate-50">
          <div className="flex items-center gap-3">
            <div className={`p-3 ${isEditing ? 'bg-amber-500' : 'bg-blue-600'} rounded-2xl text-white shadow-lg shadow-blue-200`}>
              {isEditing ? <Edit3 size={24} /> : <Package size={24} />}
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">
                {isEditing ? 'Update Product' : 'Product Hub'}
              </h2>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">
                {isEditing ? 'Modify existing inventory' : 'Add New Inventory Item'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-slate-100 text-slate-400 hover:text-slate-900 rounded-2xl transition-all">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-8 no-scrollbar">
          
          {/* --- Basic Information Section --- */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-slate-400 mb-2">
              <AlertCircle size={16} />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">Core Details</span>
            </div>
            
            <input
              name="title"
              value={productData.title}
              placeholder="Product Name (e.g. Premium Basmati Rice)"
              className="w-full p-5 bg-slate-50 rounded-3xl border-2 border-transparent focus:border-blue-500/20 focus:bg-white outline-none transition-all font-bold text-slate-700 shadow-inner"
              onChange={handleChange}
              required
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <select
                name="category"
                value={productData.category}
                className="p-5 bg-slate-50 rounded-3xl border-2 border-transparent focus:border-blue-500/20 outline-none font-bold text-slate-600 appearance-none shadow-inner"
                onChange={handleChange}
                required
              >
                <option value="">Select Category</option>
                <option value="Groceries">Groceries</option>
                <option value="Liquids">Liquids</option>
                <option value="Electronics">Electronics</option>
                <option value="Clothing">Clothing</option>
                <option value="Home & Kitchen">Home & Kitchen</option>
                <option value="Office Supplies">Office Supplies</option>
                <option value="Other">Other</option>
              </select>

              <div className="relative">
                <input
                  name="lowStockAlert"
                  type="number"
                  value={productData.lowStockAlert}
                  placeholder="Low Stock Alert (e.g. 10)"
                  className="w-full p-5 bg-slate-50 rounded-3xl border-2 border-transparent focus:border-blue-500/20 outline-none font-bold text-slate-700 shadow-inner"
                  onChange={handleChange}
                />
                <span className="absolute right-5 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300 uppercase pointer-events-none">Threshold</span>
              </div>
            </div>
          </section>

          {/* --- Variants Management Section --- */}
          <section className="space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2 text-slate-400">
                <Plus size={16} />
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Sizing & Pricing</span>
              </div>
              <button 
                type="button" 
                onClick={addVariantField} 
                className="bg-blue-50 text-blue-600 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-blue-600 hover:text-white transition-all flex items-center gap-2"
              >
                <Plus size={14} strokeWidth={3} /> Add Variant
              </button>
            </div>

            <div className="space-y-3">
              {productData.variants.map((variant, index) => (
                <div key={index} className="group relative p-6 bg-slate-50/50 rounded-4xl border border-slate-100 hover:border-blue-100 transition-all">
                  <div className="grid grid-cols-12 gap-3 items-center">
                    <div className="col-span-12 md:col-span-4">
                      <input 
                        name="name" 
                        value={variant.name}
                        placeholder="Label (e.g. Small / 1kg)" 
                        className="w-full p-3 rounded-xl border-none bg-white text-sm font-bold shadow-sm" 
                        onChange={(e) => handleVariantChange(index, e)} 
                        required
                      />
                    </div>
                    <div className="col-span-4 md:col-span-2">
                      <input 
                        name="weight" 
                        type="number" 
                        value={variant.weight}
                        placeholder="Value" 
                        className="w-full p-3 rounded-xl border-none bg-white text-sm font-bold shadow-sm" 
                        onChange={(e) => handleVariantChange(index, e)} 
                        required
                      />
                    </div>
                    <div className="col-span-4 md:col-span-2">
                      <select 
                        name="unit" 
                        value={variant.unit}
                        className="w-full p-3 rounded-xl border-none bg-white text-sm font-bold shadow-sm" 
                        onChange={(e) => handleVariantChange(index, e)}
                      >
                        <option value="kg">kg</option>
                        <option value="g">g</option>
                        <option value="L">L</option>
                        <option value="ml">ml</option>
                        <option value="pcs">pcs</option>
                      </select>
                    </div>
                    <div className="col-span-4 md:col-span-3">
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                        <input 
                          name="price" 
                          type="number" 
                          value={variant.price}
                          placeholder="Price" 
                          className="w-full pl-7 pr-3 py-3 rounded-xl border-none bg-white text-sm font-bold shadow-sm" 
                          onChange={(e) => handleVariantChange(index, e)} 
                          required
                        />
                      </div>
                    </div>
                    <div className="col-span-6 md:col-span-4">
                      <input 
                        name="stock" 
                        type="number" 
                        value={variant.stock}
                        placeholder="Current Stock" 
                        className="w-full p-3 rounded-xl border-none bg-white text-sm font-bold shadow-sm" 
                        onChange={(e) => handleVariantChange(index, e)} 
                        required
                      />
                    </div>
                    <div className="col-span-6 md:col-span-7">
                      <input 
                        name="sku" 
                        value={variant.sku}
                        placeholder="SKU (Unique ID)" 
                        className="w-full p-3 rounded-xl border-none bg-white text-sm font-bold shadow-sm" 
                        onChange={(e) => handleVariantChange(index, e)} 
                      />
                    </div>
                    <div className="col-span-12 md:col-span-1 flex justify-end">
                      <button 
                        type="button" 
                        onClick={() => removeVariantField(index)} 
                        className="p-3 text-rose-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </form>

        {/* --- Footer: Dynamic Button Label --- */}
        <div className="p-8 bg-slate-50 border-t border-slate-100">
          <button 
            type="submit" 
            onClick={handleSubmit}
            className={`w-full ${isEditing ? 'bg-amber-600' : 'bg-slate-900'} text-white py-5 rounded-3xl font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:opacity-90 shadow-xl shadow-slate-200 transition-all active:scale-95`}
          >
            <Save size={22} /> {isEditing ? 'Update Full Inventory' : 'Save Full Inventory'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddProductModal;