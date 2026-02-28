import React from 'react';
import { AlertTriangle, PackagePlus, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const LowStockWidget = ({ products }) => {
  const lowStockItems = products?.flatMap(product => 
    product.variants?.filter(v => {
        return v.stock <= (product.lowStockAlert || 10);
    })
    .map(v => ({
      ...v,
      parentTitle: product.title,
      threshold: product.lowStockAlert || 10
    }))
  ) || [];
const navigate = useNavigate();
  // CHANGE: Instead of return null, show a success state
 if (lowStockItems.length === 0) {
  return (
    <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 text-center shadow-sm">
      <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
        <PackagePlus size={24} className="opacity-80" />
      </div>
      <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">Inventory Healthy</h4>
      <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 italic">All items above threshold</p>
    </div>
  );
}

  return (
    <div className="bg-white rounded-[2.5rem] border border-rose-100 shadow-sm overflow-hidden w-full h-full flex flex-col">
      <div className="p-6 bg-rose-50/50 border-b border-rose-100 flex items-center justify-between">
        <div className="flex items-center gap-3 text-rose-600">
          <AlertTriangle size={20} />
          <h4 className="font-black uppercase text-xs tracking-widest">Inventory Alerts</h4>
        </div>
        <span className="bg-rose-600 text-white text-[10px] font-black px-2 py-1 rounded-full animate-pulse">
          {lowStockItems.length} CRITICAL
        </span>
      </div>

      <div className="divide-y divide-slate-50 max-h-75 overflow-y-auto">
        {lowStockItems.map((item, idx) => (
          <div key={idx} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
            <div className="space-y-1">
              <p className="text-sm font-black text-slate-800">{item.parentTitle}</p>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
                Variant: {item.name} • SKU: {item.sku}
              </p>
            </div>
            
            <div className="text-right">
              <p className="text-sm font-black text-rose-600">{item.stock} in stock</p>
              <p className="text-[10px] text-slate-400 font-bold uppercase">Threshold: {item.threshold}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 bg-slate-50">
        <button onClick={() => navigate('/inventory')} className="w-full bg-white border border-slate-200 py-3 rounded-2xl text-xs font-black text-slate-600 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all flex items-center justify-center gap-2">
          <PackagePlus size={14} /> Create Purchase Order <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
};

export default LowStockWidget;  