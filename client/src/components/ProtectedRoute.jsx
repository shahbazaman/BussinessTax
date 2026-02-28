import { useContext } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
const ProtectedRoute = () => {
  const { user, loading } = useContext(AuthContext);
  if (loading) return <div className="h-screen flex items-center justify-center">Loading...</div>;
  return user ? <Outlet /> : <Navigate to="/register" />;
};
export default ProtectedRoute;