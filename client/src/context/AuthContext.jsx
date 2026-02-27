import { createContext, useState, useEffect } from 'react';
import axios from 'axios';

export const AuthContext = createContext();
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('userInfo');
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      setUser(parsedUser);
      axios.defaults.headers.common['Authorization'] = `Bearer ${parsedUser.token}`;
    }
    setLoading(false);
  }, []);

  const register = async (userData) => {
    const { data } = await axios.post('http://localhost:5000/api/auth/register', userData);
    setUser(data);
    localStorage.setItem('userInfo', JSON.stringify(data));
    axios.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
    return data;
  };
const login = async (email, password) => {
    const { data } = await axios.post('http://localhost:5000/api/auth/login', { email, password });
    setUser(data);
    localStorage.setItem('userInfo', JSON.stringify(data));
    localStorage.setItem('token', data.token); // Add this for App.jsx sync!
    axios.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
    window.dispatchEvent(new Event('authChange')); 
    return data;
  };

  const logout = () => {
    localStorage.removeItem('userInfo');
    localStorage.removeItem('token'); // Clear standalone token
    setUser(null);
    delete axios.defaults.headers.common['Authorization'];
    window.dispatchEvent(new Event('authChange'));
  };

  return (
    <AuthContext.Provider value={{ user, register, login, logout, loading }}>
      {!loading && children} 
    </AuthContext.Provider>
  );
};