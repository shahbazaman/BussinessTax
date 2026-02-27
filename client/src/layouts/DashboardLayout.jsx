import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { 
    LayoutDashboard, 
    FileText, 
    Users, 
    Settings, 
    LogOut, 
    Package,     // New for Inventory
    PieChart,    // New for Reports
    Landmark     // New for Accounts
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Sidebar = () => {
    const location = useLocation();
    const { logout } = useAuth();
    
    // Added Inventory, Reports, and Accounts to the navigation array
    const navItems = [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
        { icon: FileText, label: 'Invoices', path: '/invoices' },
        { icon: Users, label: 'Clients', path: '/clients' },
        { icon: Users, label: 'Employees', path: '/employees' },
        { icon: Package, label: 'Inventory', path: '/inventory' },
        { icon: Landmark, label: 'Accounts', path: '/accounts' },
        { icon: PieChart, label: 'Reports', path: '/reports' },
        { icon: Settings, label: 'Settings', path: '/settings' },
    ];

    return (
        <div className="w-64 h-screen bg-slate-900 text-white flex flex-col fixed shadow-2xl z-50">
            <div className="p-6 text-2xl font-black tracking-tight text-blue-400">BussinessTax</div>
            
            {/* Navigation Links */}
            <nav className="flex-1 px-4 space-y-2 mt-4 overflow-y-auto">
                {navItems.map((item) => (
                    <Link 
                        key={item.path} 
                        to={item.path}
                        className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all font-bold ${
                            location.pathname === item.path 
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' 
                            : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                        }`}
                    >
                        <item.icon size={20} strokeWidth={location.pathname === item.path ? 2.5 : 2} />
                        <span>{item.label}</span>
                    </Link>
                ))}
            </nav>

            {/* Logout Button */}
            <div className="p-4 border-t border-slate-800">
                <button 
                    onClick={logout} 
                    className="w-full flex items-center justify-center gap-3 text-rose-400 hover:bg-slate-800 hover:text-rose-300 p-3 rounded-2xl transition-all font-bold"
                >
                    <LogOut size={20} /> Logout
                </button>
            </div>
        </div>
    );
};

export default function DashboardLayout() {
    return (
        <div className="flex bg-slate-50 min-h-screen">
            <Sidebar />
            {/* Main Content Area */}
            <main className="ml-64 flex-1 p-4 lg:p-8 overflow-y-auto h-screen">
                <div className="max-w-7xl mx-auto">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}