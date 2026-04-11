import { createContext, useState, useEffect } from 'react';
import api from '../utils/api'; // Use only this

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('userInfo');
    if (savedUser) {
      const parsed = JSON.parse(savedUser);
      setUser({ ...parsed, profilePhoto: parsed.profilePhoto || '' });
    }
    setLoading(false);
  }, []);

  const register = async (userData) => {
    const { data } = await api.post('/auth/register', userData);
    setUser(data);
    localStorage.setItem('userInfo', JSON.stringify(data));
    localStorage.setItem('token', data.token); // Keep token in sync
    return data;
  };

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    setUser(data);
    localStorage.setItem('userInfo', JSON.stringify(data));
    localStorage.setItem('token', data.token);
    window.dispatchEvent(new Event('authChange')); 
    return data;
  };
const updateUser = (updatedFields) => {
    setUser(prev => {
      const merged = { ...prev, ...updatedFields };
      localStorage.setItem('userInfo', JSON.stringify(merged));
      return merged;
    });
  };
  const logout = () => {
    localStorage.removeItem('userInfo');
    localStorage.removeItem('token'); 
    setUser(null);
    window.dispatchEvent(new Event('authChange'));
  };

  return (
    <AuthContext.Provider value={{ user, setUser, updateUser, register, login, logout, loading }}>
      {!loading && children} 
    </AuthContext.Provider>
  );
};