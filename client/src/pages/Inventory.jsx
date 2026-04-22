import React, { useState, useEffect, useCallback, useMemo, useContext } from 'react';
import { Search, AlertTriangle, Clock,Plus, Loader2, Trash2, Package, Edit2, Download, Barcode } from 'lucide-react';
import api from '../utils/api';
import { toast } from 'react-toastify';
import AddProductModal from '../components/AddProductModal';
import { exportToCSV } from '../utils/exportCSV';
import { CurrencyContext } from '../context/CurrencyContext';

const Inventory = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const { symbol } = useContext(CurrencyContext);

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/products');
      setProducts(res.data);
    } catch (err) {
      toast.error("Failed to load inventory");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const handleEdit = (product) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    toast(
  ({ closeToast }) => (
    <div>
      <p className="font-bold text-sm mb-2">Delete this product?</p>
      <p className="text-xs text-slate-500 mb-3">This will remove the product and all its variants permanently.</p>
      <div className="flex gap-2">
        <button onClick={async () => {
          closeToast();
          try {
            await api.delete(`/products/${id}`);
            toast.success("Product removed");
            fetchProducts();
          } catch (err) {
            toast.error("Delete failed");
          }
        }} className="bg-rose-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg">
          Yes, Delete
        </button>
        <button onClick={closeToast} className="bg-slate-100 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-lg">
          Cancel
        </button>
      </div>
    </div>
  ),
  { autoClose: false, closeButton: false }
);
  };

// ... inside Inventory component ...

const filteredProducts = useMemo(() => {
  return products.filter(p => {
    const searchLower = searchTerm.toLowerCase();
    const matchesTitle = p.title.toLowerCase().includes(searchLower);
    const matchesCode = p.variants.some(v => 
      (v.barcode && v.barcode.toLowerCase().includes(searchLower)) ||
      (v.sku && v.sku.toLowerCase().includes(searchLower))
    );
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    const isLowStock = p.variants.some(v => v.stock <= (p.lowStockAlert || 10));
    return (matchesTitle || matchesCode) && matchesCategory && (showLowStockOnly ? isLowStock : true);
  });
}, [products, searchTerm, selectedCategory, showLowStockOnly]);

  if (loading) return (
    <div className="flex flex-col justify-center items-center h-screen gap-4">
      <Loader2 className="animate-spin text-blue-600" size={40} />
      <p className="text-slate-400 font-bold animate-pulse uppercase tracking-widest text-xs">Syncing Inventory...</p>
    </div>
  );

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Expiry Alert Banner */}
      {(() => {
        const now = new Date();
        const expired = products.filter(p => p.expiryDate && new Date(p.expiryDate) < now);
        const expiringSoon = products.filter(p => {
          if (!p.expiryDate) return false;
          const days = Math.ceil((new Date(p.expiryDate) - now) / (1000 * 60 * 60 * 24));
          return days >= 0 && days <= 30;
        });
        if (expired.length === 0 && expiringSoon.length === 0) return null;
        return (
          <div className="mb-6 space-y-2">
            {expired.length > 0 && (
              <div className="flex items-center gap-3 bg-rose-50 border border-rose-200 rounded-2xl px-5 py-3">
                <Clock size={16} className="text-rose-600 shrink-0" />
                <p className="text-sm font-black text-rose-700">
                  {expired.length} product{expired.length > 1 ? 's have' : ' has'} expired: {expired.map(p => p.title).join(', ')}
                </p>
              </div>
            )}
            {expiringSoon.length > 0 && (
              <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3">
                <Clock size={16} className="text-amber-600 shrink-0" />
                <p className="text-sm font-black text-amber-700">
                  {expiringSoon.length} product{expiringSoon.length > 1 ? 's are' : ' is'} expiring within 30 days: {expiringSoon.map(p => p.title).join(', ')}
                </p>
              </div>
            )}
          </div>
        );
      })()}
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight uppercase">Inventory</h1>
          <p className="text-slate-500 text-sm font-medium">Manage stock, units, and tax rates</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button onClick={() => setIsModalOpen(true)} className="flex-1 md:flex-none bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-black text-sm uppercase flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95">
            <Plus size={18} /> New Product
          </button>
          <button onClick={() => exportToCSV(products, 'Inventory')} className="bg-emerald-600 hover:bg-emerald-700 text-white p-3 rounded-2xl shadow-lg transition-all active:scale-95">
            <Download size={20} />
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col lg:flex-row gap-4 bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" placeholder="Search by name..." 
            className="w-full pl-12 pr-4 py-3 rounded-xl bg-slate-50 border-none outline-none font-bold text-slate-700"
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select 
          className="lg:w-48 px-4 py-3 rounded-xl bg-slate-50 border-none outline-none font-bold text-slate-600"
          value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}
        >
          <option value="All">All Categories</option>
          <option value="Groceries">Groceries</option>
          <option value="Liquids">Liquids</option>
          <option value="Electronics">Electronics</option>
          <option value="Other">Other</option>
        </select>
        <button 
          onClick={() => setShowLowStockOnly(!showLowStockOnly)}
          className={`px-6 py-3 rounded-xl text-xs font-black uppercase flex items-center gap-2 border transition-all ${showLowStockOnly ? 'bg-rose-50 border-rose-200 text-rose-600' : 'bg-white border-slate-200 text-slate-500'}`}
        >
          <AlertTriangle size={16} /> Low Stock
        </button>
      </div>

      {/* Inventory Table */}
<div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
  <div className="overflow-x-auto">
    <table className="w-full text-left border-collapse">
      <thead>
        <tr className="bg-slate-50/50 text-slate-400 text-[10px] uppercase font-black tracking-widest border-b border-slate-100">
          <th className="px-6 py-4">Product</th>
          <th className="px-6 py-4">Category</th>
          <th className="px-6 py-4">Supplier</th>
          <th className="px-6 py-4">Variants</th>
          <th className="px-6 py-4">Total Stock</th>
          <th className="px-6 py-4">Expiry</th>
          <th className="px-6 py-4 text-right">Actions</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-50">
        {filteredProducts.map(product => {
          const totalStock = product.variants.reduce((sum, v) => sum + v.stock, 0);
          const hasLowStock = product.variants.some(v => v.stock <= (product.lowStockAlert || 10));

          return (
            <tr key={product._id} className="hover:bg-slate-50/50 transition-colors align-top">

              {/* Product Name */}
              <td className="px-6 py-5">
                <div className="flex items-center gap-2">
                  <span className="font-black text-slate-800 text-sm">{product.title}</span>
                  {hasLowStock && <AlertTriangle size={13} className="text-rose-500" />}
                </div>
              </td>

              {/* Category */}
              <td className="px-6 py-5">
                <span className="text-[9px] font-black bg-slate-100 px-2 py-1 rounded-lg text-slate-500 uppercase">
                  {product.category}
                </span>
              </td>

              {/* Supplier */}
              <td className="px-6 py-5">
                <span className="text-xs font-bold text-blue-500">
                  {product.supplier || <span className="text-slate-300">—</span>}
                </span>
              </td>

              {/* Variants inline */}
              <td className="px-6 py-5">
                <div className="space-y-1.5">
                  {product.variants.map((v, idx) => {
                    const isVariantLow = v.stock <= (product.lowStockAlert || 10);
                    return (
                      <div key={idx} className={`flex items-center gap-3 px-3 py-2 rounded-xl border text-[10px] font-bold ${isVariantLow ? 'bg-rose-50 border-rose-100 text-rose-600' : 'bg-slate-50 border-slate-100 text-slate-600'}`}>
                        <span className="uppercase font-black">{v.name}</span>
                        {v.weight ? <span className="text-slate-400">{v.weight}{v.unit}</span> : null}
                        <span className="text-slate-400">{symbol}{Number(v.price).toFixed(2)}</span>
                        <span className="text-indigo-400">GST {v.taxRate || 0}%</span>
                        {v.sku && <span className="text-slate-300 flex items-center gap-1"><Barcode size={10}/>{v.sku}</span>}
                        {isVariantLow && <span className="text-rose-400 uppercase text-[8px] font-black">Low</span>}
                      </div>
                    );
                  })}
                </div>
              </td>

              {/* Total Stock */}
              <td className="px-6 py-5">
                <span className={`font-black text-sm ${hasLowStock ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {totalStock}
                  <span className="text-[10px] opacity-50 ml-1 uppercase">units</span>
                </span>
              </td>

              {/* Expiry Date */}
              <td className="px-6 py-5">
                {product.expiryDate ? (() => {
                  const exp = new Date(product.expiryDate);
                  const now = new Date();
                  const daysLeft = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
                  const isExpired = daysLeft < 0;
                  const isSoon = daysLeft >= 0 && daysLeft <= 30;
                  return (
                    <div className="space-y-1">
                      <span className="text-xs font-bold text-slate-600">
                        {exp.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                      <div>
                        {isExpired && (
                          <span className="text-[9px] font-black bg-rose-100 text-rose-600 px-2 py-0.5 rounded-full uppercase">Expired</span>
                        )}
                        {isSoon && (
                          <span className="text-[9px] font-black bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full uppercase">Expires in {daysLeft}d</span>
                        )}
                        {!isExpired && !isSoon && (
                          <span className="text-[9px] font-black bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full uppercase">{daysLeft}d left</span>
                        )}
                      </div>
                    </div>
                  );
                })() : <span className="text-slate-300 text-xs">—</span>}
              </td>

              {/* Actions */}
              <td className="px-6 py-5 text-right">
                <div className="flex justify-end gap-2">
                  <button onClick={() => handleEdit(product)} className="p-2 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all">
                    <Edit2 size={15} />
                  </button>
                  <button onClick={() => handleDelete(product._id)} className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all">
                    <Trash2 size={15} />
                  </button>
                </div>
              </td>

            </tr>
          );
        })}
      </tbody>
    </table>

    {filteredProducts.length === 0 && (
      <div className="py-20 text-center">
        <Package size={40} className="mx-auto text-slate-200 mb-2" />
        <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">No Products Found</p>
      </div>
    )}
  </div>
</div>
      <AddProductModal 
        isOpen={isModalOpen} 
        onClose={() => { setIsModalOpen(false); setEditingProduct(null); }} 
        onRefresh={fetchProducts}
        editingProduct={editingProduct} 
      />
    </div>
  );
};

export default Inventory;