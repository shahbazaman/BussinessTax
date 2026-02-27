import { useContext } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const ProtectedRoute = () => {
  const { user, loading } = useContext(AuthContext);

  // Show nothing (or a spinner) while checking if the user is logged in
  if (loading) return <div className="h-screen flex items-center justify-center">Loading...</div>;

  // If no user is found in Context/LocalStorage, redirect to Register
  return user ? <Outlet /> : <Navigate to="/register" />;
};

export default ProtectedRoute;