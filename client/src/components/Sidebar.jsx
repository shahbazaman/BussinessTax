import React, { useState, useContext, useEffect } from 'react';
import api from '../utils/api';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { 
  LayoutDashboard, FileText, Receipt, Users, 
  Settings, Landmark, ChevronLeft, ChevronRight, LogOut, Menu, X,
  Package, PieChart 
} from 'lucide-react';
import { Bell } from 'lucide-react';
const Sidebar = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { user, logout } = useContext(AuthContext);
  const location = useLocation();
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState([]);
  const [showAlerts, setShowAlerts] = useState(false);
    useEffect(() => {
  const fetchAlerts = async () => {
    try {
      const [products, invoices] = await Promise.all([
        api.get('/products'), api.get('/invoices')
      ]);
      const lowStock = products.data.filter(p => p.stock <= (p.reorderLevel ?? p.minStock ?? 5));
      const overdue = invoices.data.filter(i => i.status !== 'Paid' && i.dueDate && new Date(i.dueDate) < new Date());
      setAlerts([
        ...lowStock.map(p => `🔴 Low stock: ${p.name} (${p.stock} left)`),
        ...overdue.map(i => `⚠️ Overdue: Invoice #${i.invoiceNumber || i._id?.slice(-5)}`)
      ]);
    } catch (err) {
      console.error('Alert fetch failed:', err);
    }
  };
  fetchAlerts();
}, []);
useEffect(() => {
  const handleClickOutside = (e) => {
    if (!e.target.closest('.bell-wrapper')) setShowAlerts(false);
  };
  document.addEventListener('click', handleClickOutside);
  return () => document.removeEventListener('click', handleClickOutside);
}, []);
  const menuItems = [
    { icon: <LayoutDashboard />, label: 'Dashboard', path: '/' },
    { icon: <FileText />, label: 'Invoices', path: '/invoices' },
    { icon: <Receipt />, label: 'Expenses', path: '/expenses' },
    { icon: <Package />, label: 'Inventory', path: '/inventory' }, 
    { icon: <Landmark />, label: 'Accounts', path: '/accounts' }, 
    { icon: <PieChart />, label: 'Reports', path: '/reports' }, 
    { icon: <Users />, label: 'Clients', path: '/clients' },
    { icon: <Users />, label: 'Employees', path: '/employees' },
    { icon: <Settings />, label: 'Settings', path: '/settings' },
  ];

  const handleLogout = () => {
    logout();
    localStorage.removeItem('token');
    window.dispatchEvent(new Event('authChange'));
    navigate('/login');
  };

  return (
    <>
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-slate-200 px-4 flex items-center justify-between z-50">
        <h1 className="font-bold italic text-lg text-slate-900 uppercase">
          BUSSINESS<span className="text-green-500">TAX</span>
        </h1>
        <button 
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
        >
          {isMobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      <aside className={`
        fixed lg:static inset-y-0 left-0 z-40 bg-white border-r border-slate-200 transition-all duration-300 ease-in-out
        ${isCollapsed ? 'w-24' : 'w-64'}
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        flex flex-col h-screen
      `}>
        
        <div className={`h-20 flex items-center border-b border-slate-50 px-4 shrink-0 overflow-hidden
          ${isCollapsed ? 'justify-center' : 'justify-between'}
          ${isMobileOpen ? 'flex' : 'hidden lg:flex'}`}>
          
          {!isCollapsed && (
            <span className="text-lg md:text-xl font-bold italic tracking-tight text-slate-800 uppercase truncate max-w-45">
              BUSSINESS<span className="text-green-500">TAX</span>
            </span>
          )}
          {!isCollapsed && (
<div className="relative bell-wrapper">
    <button
      onClick={(e) => { e.stopPropagation(); setShowAlerts(!showAlerts); }}
      className="p-1.5 rounded-md hover:bg-slate-100 text-slate-400 relative"
    >
      <Bell size={18} />
      {alerts.length > 0 && (
        <span className="absolute top-0 right-0 w-2 h-2 bg-rose-500 rounded-full" />
      )}
    </button>
    {showAlerts && alerts.length > 0 && (
      <div className="absolute left-0 top-10 w-72 bg-white rounded-2xl shadow-xl border border-slate-100 z-50 overflow-hidden">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-4 pt-4 pb-2">Alerts</p>
        {alerts.map((alert, i) => (
          <div key={i} className="px-4 py-2.5 text-xs font-medium text-slate-700 border-t border-slate-50 hover:bg-slate-50">
            {alert}
          </div>
        ))}
      </div>
    )}
  </div>
)}
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)} 
            className="hidden lg:block p-1.5 rounded-md hover:bg-slate-100 text-slate-400 shrink-0"
          >
            {isCollapsed ? <ChevronRight size={18}/> : <ChevronLeft size={18}/>}
          </button>
        </div>

        <nav className="flex-1 py-4 space-y-1 overflow-y-auto no-scrollbar">
          {menuItems.map((item, idx) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={idx}
                to={item.path}
                onClick={() => setIsMobileOpen(false)}
                className={`
                  flex transition-all duration-200 group
                  ${isCollapsed ? 'flex-col items-center justify-center gap-1.5 py-3 mx-2 text-center' : 'flex-row items-center gap-4 px-6 py-3 mx-3'}
                  ${isActive ? 'bg-green-600 text-white rounded-xl shadow-lg shadow-green-100' : 'text-slate-500 hover:bg-slate-50 rounded-xl'}
                `}
              >
                <div className={`${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-900'}`}>
                  {React.cloneElement(item.icon, { size: isCollapsed ? 22 : 20 })}
                </div>

                <span className={`font-bold transition-colors
                  ${isCollapsed ? 'text-[9px] uppercase mt-1' : 'text-sm'} 
                  ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-900'}`}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-100 bg-slate-50/30 shrink-0">
          <div className={`flex items-center gap-3 mb-3 ${isCollapsed ? 'justify-center' : ''}`}>
            <div
              onClick={() => navigate('/profile')}
              className="w-9 h-9 rounded-full bg-green-500 flex items-center justify-center font-bold text-white shrink-0 text-xs shadow-sm cursor-pointer hover:ring-2 hover:ring-green-400 transition-all overflow-hidden"
            >
              {user?.profilePhoto
                ? <img src={user.profilePhoto} alt="avatar" className="w-full h-full object-cover" />
                : (user?.name?.charAt(0) || 'T')
              }
            </div>
            {!isCollapsed && (
              <div className="min-w-0 leading-tight">
                <p className="text-xs font-bold text-slate-900 truncate">{user?.name || 'USER'}</p>
                <p className="text-[9px] text-slate-400 uppercase tracking-tighter">Premium Account</p>
              </div>
            )}
          </div>

          <button 
            onClick={handleLogout}
            className={`flex items-center justify-center group w-full gap-2 transition-all ${isCollapsed ? 'flex-col' : 'py-2.5 hover:bg-red-50 rounded-lg'}`}
          >
            <LogOut size={18} className="text-slate-400 group-hover:text-red-500 transition-colors" />
            <span className={`font-bold text-red-500 ${isCollapsed ? 'text-[8px] uppercase' : 'text-xs'}`}>
              Logout
            </span>
          </button>
        </div>
      </aside>

      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-30 lg:hidden" 
          onClick={() => setIsMobileOpen(false)} 
        />
      )}
    </>
  );
};

export default Sidebar;