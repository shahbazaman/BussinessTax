import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { ToastContainer } from 'react-toastify'; 
import 'react-toastify/dist/ReactToastify.css';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Invoices from './pages/Invoices';
import Expenses from './pages/Expenses';
import Clients from './pages/Clients';
import Reports from './pages/Reports';
import Settings from './pages/Settings'; 
import Login from './pages/Login';
import Register from './pages/Register';
import Inventory from './pages/Inventory'; 
import Accounts from './pages/Accounts';  
import Employees from './pages/Employees';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('token'));
  useEffect(() => {
    const checkAuth = () => {
      setIsAuthenticated(!!localStorage.getItem('token'));
    };
    window.addEventListener('storage', checkAuth);
    window.addEventListener('authChange', checkAuth);
    return () => {
      window.removeEventListener('storage', checkAuth);
      window.removeEventListener('authChange', checkAuth);
    };
  }, []);

useEffect(() => {
  const checkAuth = () => {
    const token = localStorage.getItem('token') || localStorage.getItem('userInfo');
    setIsAuthenticated(!!token);
  };
  window.addEventListener('authChange', checkAuth);
  return () => window.removeEventListener('authChange', checkAuth);
}, []);
  return (
    <Router>
      <div className="flex min-h-screen bg-slate-50">
        {isAuthenticated && <Sidebar />}        
        <main className="flex-1 overflow-x-hidden">
          <Routes>
            <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/" />} />
            <Route path="/register" element={!isAuthenticated ? <Register /> : <Navigate to="/" />} />
            <Route path="/" element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" />} />
            <Route path="/invoices" element={isAuthenticated ? <Invoices /> : <Navigate to="/login" />} />
            <Route path="/expenses" element={isAuthenticated ? <Expenses /> : <Navigate to="/login" />} />
            <Route path="/clients" element={isAuthenticated ? <Clients /> : <Navigate to="/login" />} />
            <Route path="/reports" element={isAuthenticated ? <Reports /> : <Navigate to="/login" />} /> 
            <Route path="/settings" element={isAuthenticated ? <Settings /> : <Navigate to="/login" />} />
            <Route path="/inventory" element={isAuthenticated ? <Inventory /> : <Navigate to="/login" />} />
            <Route path="/accounts" element={isAuthenticated ? <Accounts /> : <Navigate to="/login" />} />
            <Route path="/employees" element={isAuthenticated ? <Employees /> : <Navigate to="/login" />} />            
            <Route path="*" element={<Navigate to={isAuthenticated ? "/" : "/login"} />} />
          </Routes>
        </main>
      </div>
      <ToastContainer 
        position="bottom-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </Router>
  );
}

export default App;