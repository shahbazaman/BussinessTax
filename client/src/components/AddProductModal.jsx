import React, { useState, useEffect, useContext } from 'react';
import { X, Plus, Trash2, Save, Package, AlertCircle, Edit3, TrendingUp, Warehouse } from 'lucide-react';
import api from '../utils/api';
import { toast } from 'react-toastify';
import { CurrencyContext } from '../context/CurrencyContext';

const AddProductModal = ({ isOpen, onClose, onRefresh, editingProduct }) => {
  const { symbol } = useContext(CurrencyContext);
  
  const initialState = {
    title: '',
    category: '',
    customCategory: '', // Track manual input
    supplier: '',
    lowStockAlert: 10,
    reorderQuantity: 50,
    variants: [{ 
      name: '', weight: '', unit: 'kg', costPrice: '', salePrice: '', stock: '', sku: '', barcode: '' 
    }]
  };

  const [productData, setProductData] = useState(initialState);
  const [isOtherCategory, setIsOtherCategory] = useState(false);
  const isEditing = !!editingProduct;

  useEffect(() => {
    if (isOpen) {
      if (editingProduct) {
        // Check if existing category is in our standard list
        const standardCategories = ["Groceries", "Electronics", "Home & Kitchen"];
        const isCustom = editingProduct.category && !standardCategories.includes(editingProduct.category);
        
        setProductData({
          ...editingProduct,
          customCategory: isCustom ? editingProduct.category : ''
        });
        setIsOtherCategory(isCustom);
      } else {
        setProductData(initialState);
        setIsOtherCategory(false);
      }
    }
  }, [isOpen, editingProduct]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "category") {
      setIsOtherCategory(value === "Other");
    }
    setProductData({ ...productData, [name]: value });
  };

  const handleVariantChange = (index, e) => {
    const newVariants = [...productData.variants];
    newVariants[index][e.target.name] = e.target.value;
    setProductData({ ...productData, variants: newVariants });
  };

  const addVariantField = () => {
    setProductData({
      ...productData,
      variants: [...productData.variants, { ...initialState.variants[0] }]
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

    const finalCategory = isOtherCategory ? productData.customCategory : productData.category;
    if (!finalCategory) return toast.error("Please specify a category");

    // FIX: Map salePrice to price so the backend validation passes
    const validVariants = productData.variants
      .filter(v => v.name.trim() !== '') 
      .map(v => ({
        ...v,
        weight: Number(v.weight) || 0,
        costPrice: Number(v.costPrice) || 0,
        salePrice: Number(v.salePrice) || 0,
        price: Number(v.salePrice) || 0, // MAP TO SCHEMA REQUIREMENT
        stock: Number(v.stock) || 0,
        sku: v.sku?.trim() === "" ? `SKU-${Date.now()}-${Math.floor(Math.random() * 1000)}` : v.sku
      }));

    if (validVariants.length === 0) {
      return toast.error("Please add at least one variant with a label");
    }

    const sanitizedData = {
      ...productData,
      category: finalCategory,
      lowStockAlert: Number(productData.lowStockAlert) || 0,
      reorderQuantity: Number(productData.reorderQuantity) || 0,
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
      toast.error(err.response?.data?.message || "Validation Failed");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-[3rem] w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-white/20">
        
        {/* Header */}
        <div className="p-8 pb-4 flex justify-between items-center border-b border-slate-50">
          <div className="flex items-center gap-3">
            <div className={`p-3 ${isEditing ? 'bg-amber-500' : 'bg-blue-600'} rounded-2xl text-white shadow-lg`}>
              {isEditing ? <Edit3 size={24} /> : <Package size={24} />}
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">
                {isEditing ? 'Update Inventory' : 'Product Warehouse'}
              </h2>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Master Product Management</p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-slate-100 text-slate-400 rounded-2xl transition-all">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-8 no-scrollbar">
          <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 block">General Information</label>
              <input
                name="title"
                value={productData.title}
                placeholder="Product Name (e.g. Organic Quinoa)"
                className="w-full p-5 bg-slate-50 rounded-3xl border-2 border-transparent focus:border-blue-500/20 focus:bg-white outline-none font-bold text-slate-700 shadow-inner"
                onChange={handleChange}
                required
              />
            </div>
            
            <div className="space-y-4">
                <select
                name="category"
                value={isOtherCategory ? "Other" : productData.category}
                className="w-full p-5 bg-slate-50 rounded-3xl border-none outline-none font-bold text-slate-600 shadow-inner"
                onChange={handleChange}
                required
                >
                <option value="">Select Category</option>
                <option value="Groceries">Groceries</option>
                <option value="Electronics">Electronics</option>
                <option value="Home & Kitchen">Home & Kitchen</option>
                <option value="Other">Other (Type manually)</option>
                </select>

                {isOtherCategory && (
                    <input
                        name="customCategory"
                        value={productData.customCategory}
                        placeholder="Type new category..."
                        className="w-full p-5 bg-blue-50/50 rounded-3xl border-2 border-blue-200 outline-none font-bold text-blue-700 animate-in slide-in-from-top-2"
                        onChange={handleChange}
                        required
                    />
                )}
            </div>

            <input
              name="supplier"
              value={productData.supplier}
              placeholder="Supplier/Manufacturer Name"
              className="p-5 bg-slate-50 rounded-3xl border-none outline-none font-bold text-slate-700 shadow-inner h-17"
              onChange={handleChange}
            />
          </section>

          {/* ... Rest of your variant section stays the same ... */}
          {/* Section 2: Reorder Rules */}
          <section className="bg-slate-50 p-6 rounded-[2.5rem] border border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-amber-600 uppercase tracking-widest flex items-center gap-1">
                <AlertCircle size={12} /> Low Stock Alert Threshold
              </label>
              <input
                name="lowStockAlert"
                type="number"
                value={productData.lowStockAlert}
                className="w-full p-4 bg-white rounded-2xl outline-none font-bold text-slate-700"
                onChange={handleChange}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-1">
                <Warehouse size={12} /> Auto-Reorder Quantity
              </label>
              <input
                name="reorderQuantity"
                type="number"
                value={productData.reorderQuantity}
                className="w-full p-4 bg-white rounded-2xl outline-none font-bold text-slate-700"
                onChange={handleChange}
              />
            </div>
          </section>

          {/* Section 3: Variants */}
          <section className="space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2 text-slate-400">
                <TrendingUp size={16} />
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Valuation & SKUs</span>
              </div>
              <button type="button" onClick={addVariantField} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-black uppercase flex items-center gap-2 hover:scale-105 transition-all">
                <Plus size={14} /> Add Variant
              </button>
            </div>

            <div className="space-y-4">
              {productData.variants.map((variant, index) => (
                <div key={index} className="p-6 bg-white rounded-4xl border border-slate-100 shadow-sm space-y-4">
                  <div className="grid grid-cols-12 gap-3">
                    <input 
                      name="name" value={variant.name} placeholder="Label (Small / 1kg)" 
                      className="col-span-12 md:col-span-4 p-3 rounded-xl bg-slate-50 text-sm font-bold outline-none" 
                      onChange={(e) => handleVariantChange(index, e)} required
                    />
                    <input 
                      name="weight" type="number" value={variant.weight} placeholder="Weight" 
                      className="col-span-4 md:col-span-2 p-3 rounded-xl bg-slate-50 text-sm font-bold outline-none" 
                      onChange={(e) => handleVariantChange(index, e)}
                    />
                    <select 
                      name="unit" value={variant.unit} 
                      className="col-span-4 md:col-span-2 p-3 rounded-xl bg-slate-50 text-sm font-bold outline-none" 
                      onChange={(e) => handleVariantChange(index, e)}
                    >
                      <option value="kg">kg</option><option value="g">g</option><option value="pcs">pcs</option>
                    </select>
                    <div className="col-span-4 md:col-span-4 relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">{symbol}</span>
                      <input 
                        name="costPrice" type="number" value={variant.costPrice} placeholder="Cost Price" 
                        className="w-full pl-7 p-3 rounded-xl bg-rose-50/50 text-sm font-black text-rose-600 outline-none border border-rose-100" 
                        onChange={(e) => handleVariantChange(index, e)} required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-12 gap-3 items-center">
                    <div className="col-span-6 md:col-span-3 relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">{symbol}</span>
                      <input 
                        name="salePrice" type="number" value={variant.salePrice} placeholder="Sale Price" 
                        className="w-full pl-7 p-3 rounded-xl bg-emerald-50/50 text-sm font-black text-emerald-600 outline-none border border-emerald-100" 
                        onChange={(e) => handleVariantChange(index, e)} required
                      />
                    </div>
                    <input 
                      name="stock" type="number" value={variant.stock} placeholder="Initial Stock" 
                      className="col-span-6 md:col-span-3 p-3 rounded-xl bg-slate-50 text-sm font-bold outline-none" 
                      onChange={(e) => handleVariantChange(index, e)} required
                    />
                    <input 
                      name="sku" value={variant.sku} placeholder="SKU ID" 
                      className="col-span-10 md:col-span-5 p-3 rounded-xl bg-slate-50 text-sm font-bold outline-none" 
                      onChange={(e) => handleVariantChange(index, e)} 
                    />
                    <button type="button" onClick={() => removeVariantField(index)} className="col-span-2 md:col-span-1 p-3 text-rose-400 hover:bg-rose-50 rounded-xl transition-all">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </form>

        <div className="p-8 bg-slate-50 border-t border-slate-100">
          <button 
            type="submit" 
            onClick={handleSubmit}
            className={`w-full ${isEditing ? 'bg-amber-600 shadow-amber-100' : 'bg-slate-900 shadow-slate-200'} text-white py-5 rounded-3xl font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:opacity-90 shadow-xl transition-all active:scale-95`}
          >
            <Save size={22} /> {isEditing ? 'Sync Warehouse' : 'Commit to Inventory'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddProductModal;