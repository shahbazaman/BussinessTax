import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, AlertTriangle, Plus, Loader2, Trash2, Package, Edit2, ChevronDown, ChevronRight, Download } from 'lucide-react';
import api from '../utils/api';
import { toast } from 'react-toastify';
import AddProductModal from '../components/AddProductModal';
import { exportToCSV } from '../utils/exportCSV';

const Inventory = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [expandedRows, setExpandedRows] = useState({}); // Track which product's variants are shown

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

  const toggleRow = (id) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this product and all its variants?")) return;
    try {
      await api.delete(`/products/${id}`);
      toast.success("Product removed");
      fetchProducts();
    } catch (err) { toast.error("Delete failed"); }
  };

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
      const isLowStock = p.variants.some(v => v.stock <= (p.lowStockAlert || 10));
      return matchesSearch && matchesCategory && (showLowStockOnly ? isLowStock : true);
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
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Inventory</h1>
          <p className="text-slate-500 text-sm font-medium">Manage products and variant stock levels</p>
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
            type="text" placeholder="Search product name..." 
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
              <tr className="bg-slate-50/50 text-slate-400 text-[10px] uppercase font-black tracking-widest border-b border-slate-50">
                <th className="px-6 py-4 w-10"></th>
                <th className="px-6 py-4">Product</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Total Stock</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredProducts.map(product => {
                const totalStock = product.variants.reduce((sum, v) => sum + v.stock, 0);
                const hasLowStock = product.variants.some(v => v.stock <= (product.lowStockAlert || 10));
                const isExpanded = expandedRows[product._id];

                return (
                  <React.Fragment key={product._id}>
                    {/* Main Row */}
                    <tr 
                      onClick={() => toggleRow(product._id)}
                      className={`group cursor-pointer hover:bg-slate-50 transition-colors ${isExpanded ? 'bg-blue-50/20' : ''}`}
                    >
                      <td className="px-6 py-5">
                        {isExpanded ? <ChevronDown size={18} className="text-blue-500" /> : <ChevronRight size={18} className="text-slate-300" />}
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-slate-800">{product.title}</span>
                          {hasLowStock && <AlertTriangle size={14} className="text-rose-500" />}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span className="text-[10px] font-black bg-slate-100 px-2 py-1 rounded text-slate-500 uppercase">{product.category}</span>
                      </td>
                      <td className="px-6 py-5">
                        <span className={`font-black ${hasLowStock ? 'text-rose-600' : 'text-slate-700'}`}>
                          {totalStock} <span className="text-[10px] opacity-50 uppercase">Units</span>
                        </span>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => handleEdit(product)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all">
                            <Edit2 size={16} />
                          </button>
                          <button onClick={() => handleDelete(product._id)} className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Expandable Variant Details */}
                    {isExpanded && (
                      <tr className="bg-slate-50/30">
                        <td colSpan="5" className="px-12 py-4">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {product.variants.map((v, idx) => {
                              const isVariantLow = v.stock <= (product.lowStockAlert || 10);
                              return (
                                <div key={idx} className={`p-4 rounded-2xl border ${isVariantLow ? 'bg-white border-rose-200' : 'bg-white border-slate-100'} shadow-sm flex justify-between items-center`}>
                                  <div>
                                    <p className="text-xs font-black text-slate-800">{v.weight} {v.unit}</p>
                                    <p className="text-[10px] font-bold text-slate-400 mt-1">${Number(v.price).toFixed(2)}</p>
                                  </div>
                                  <div className="text-right">
                                    <p className={`text-sm font-black ${isVariantLow ? 'text-rose-600' : 'text-emerald-600'}`}>
                                      {v.stock} <span className="text-[10px] opacity-60">QTY</span>
                                    </p>
                                    {isVariantLow && <p className="text-[8px] font-black text-rose-400 uppercase tracking-tighter">Low Stock</p>}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
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