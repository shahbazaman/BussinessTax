import React, { useState, useEffect, useCallback } from 'react';
import { Search, AlertTriangle, Plus, Loader2, Trash2, Package, Filter, Edit2 } from 'lucide-react';
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

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);
const [editingProduct, setEditingProduct] = useState(null);

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
    } catch (err) {
      toast.error("Delete failed");
    }
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    
    // Check if any variant in the product is low on stock
    const isLowStock = p.variants.some(v => v.stock <= (p.lowStockAlert || 10));
    const matchesStockFilter = showLowStockOnly ? isLowStock : true;

    return matchesSearch && matchesCategory && matchesStockFilter;
  });

  if (loading) return (
    <div className="flex flex-col justify-center items-center h-screen gap-4">
      <Loader2 className="animate-spin text-blue-600" size={40} />
      <p className="text-slate-400 font-bold animate-pulse uppercase tracking-widest text-xs">Syncing Inventory...</p>
    </div>
  );

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-400 mx-auto">
      {/* --- Header Section --- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
  <div>
    <h1 className="text-3xl font-black text-slate-800 tracking-tight">Inventory</h1>
    <p className="text-slate-500 text-sm font-medium">Monitor stock levels and manage product variants</p>
  </div>

  {/* Wrap buttons in this div to keep them together */}
  <div className="flex items-center gap-3">
    <button 
      onClick={() => setIsModalOpen(true)}
      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-black text-sm uppercase flex items-center gap-2 shadow-xl shadow-blue-200 transition-all active:scale-95"
    >
      <Plus size={20} strokeWidth={3}/> New Product
    </button>
    
    <button 
      onClick={() => exportToCSV(products, 'Inventory')}
      className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-2xl font-black text-sm uppercase flex items-center gap-2 shadow-xl shadow-emerald-200 transition-all active:scale-95"
    >
      Export CSV
    </button>
  </div>
</div>

      {/* --- Filters & Search Bar --- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 bg-white p-4 rounded-4xl border border-slate-100 shadow-sm">
        <div className="lg:col-span-5 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search by product name..." 
            className="w-full pl-12 pr-4 py-3 rounded-xl bg-slate-50 border-none focus:ring-2 focus:ring-blue-500/20 outline-none font-bold text-slate-700 transition-all"
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="lg:col-span-3">
          <select 
            className="w-full px-4 py-3 rounded-xl bg-slate-50 border-none outline-none font-bold text-slate-600 cursor-pointer"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="All">All Categories</option>
            <option value="Groceries">Groceries</option>
            <option value="Liquids">Liquids</option>
            <option value="Electronics">Electronics</option>
            <option value="Clothing">Clothing</option>
            <option value="Home & Kitchen">Home & Kitchen</option>
            <option value="Office Supplies">Office Supplies</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div className="lg:col-span-4 flex gap-2">
          <button 
            onClick={() => setShowLowStockOnly(!showLowStockOnly)}
            className={`flex-1 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-tighter transition-all flex items-center justify-center gap-2 border ${
              showLowStockOnly 
              ? 'bg-rose-50 border-rose-200 text-rose-600 shadow-inner' 
              : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
            }`}
          >
            <AlertTriangle size={16} /> Low Stock
          </button>
        </div>
      </div>

      {/* --- Product Grid --- */}
      {filteredProducts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredProducts.map(product => (
            <div key={product._id} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:border-blue-200 transition-all group relative flex flex-col">
              <button 
            onClick={() => handleEdit(product)}
            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
          >
            <Edit2 size={18} />
          </button>
              <button 
                onClick={() => handleDelete(product._id)}
                className="absolute top-6 right-6 p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl lg:opacity-0 group-hover:opacity-100 transition-all"
              >
                <Trash2 size={18} />
              </button>

              <div className="mb-6">
                <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest bg-blue-50/50 px-3 py-1.5 rounded-lg border border-blue-100">
                  {product.category}
                </span>
                <h3 className="font-black text-slate-800 text-xl mt-3 line-clamp-1">{product.title}</h3>
              </div>

              <div className="space-y-3 flex-1">
                {product.variants.map((v, idx) => {
                  const isLow = v.stock <= (product.lowStockAlert || 10);
                  return (
                    <div key={idx} className={`flex items-center justify-between p-4 rounded-2xl border transition-colors ${isLow ? 'bg-rose-50/30 border-rose-100' : 'bg-slate-50 border-transparent'}`}>
                      <div>
                        <p className="text-xs font-black text-slate-700">{v.weight} {v.unit}</p>
                        <p className="text-[11px] font-bold text-slate-400 mt-0.5">${Number(v.price).toFixed(2)}</p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {isLow && <AlertTriangle size={14} className="text-rose-500 animate-bounce" />}
                          <p className={`text-sm font-black ${isLow ? 'text-rose-600' : 'text-emerald-600'}`}>
                            {v.stock} <span className="text-[10px] uppercase opacity-70">Units</span>
                          </p>
                        </div>
                        {isLow && <p className="text-[8px] font-black text-rose-400 uppercase mt-0.5 tracking-tighter">Needs Restock</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-24 bg-white rounded-[3rem] border-2 border-dashed border-slate-100">
          <div className="bg-slate-50 p-6 rounded-full mb-4">
            <Package size={48} className="text-slate-200" />
          </div>
          <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">No items match your search</p>
        </div>
      )}

      {/* Modal */}
      <AddProductModal 
  isOpen={isModalOpen} 
  onClose={() => {
    setIsModalOpen(false);
    setEditingProduct(null); // Clear the edit state when closing
  }} 
  onRefresh={fetchProducts}
  editingProduct={editingProduct} // Pass the state here
/>
    </div>
  );
};

export default Inventory;