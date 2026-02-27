import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { signInWithGoogle } from '../utils/firebase';
import api from '../utils/api';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useContext(AuthContext); 
  const navigate = useNavigate();

  // 1. REDIRECTION CHECK: Look for both 'token' or 'userInfo'
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userInfo = localStorage.getItem('userInfo');
    if (token || userInfo) {
      navigate('/'); 
    }
  }, [navigate]);

  // Handle Manual Email/Password Login
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await login(email, password);
      
      // Dispatch event so App.jsx hears the change instantly
      window.dispatchEvent(new Event('authChange')); 
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  // Handle Google Login
  const handleGoogleAuth = async (e) => {
    // Prevent any accidental form triggers
    if (e) e.preventDefault();
    setError('');

    try {
      const result = await signInWithGoogle();
      if (!result) return;

      const user = result.user;
      
      // Call your backend route (ensure this matches ./routes/accountRoutes.js setup)
      const { data } = await api.post('/auth/google', {
        name: user.displayName,
        email: user.email,
        googleId: user.uid
      });

      // 2. CONSISTENT STORAGE: Set both so all guards work
      localStorage.setItem('token', data.token);
      localStorage.setItem('userInfo', JSON.stringify(data));

      // 3. NAVIGATION: Use event + navigate instead of location.href
      window.dispatchEvent(new Event('authChange')); 
      navigate('/'); 
    } catch (error) {
      console.error("Google Login Error:", error);
      if (error.code === 'auth/popup-blocked') {
        setError("Popup blocked! Please allow popups for this site in your browser settings.");
      } else if (error.code === 'auth/cancelled-popup-request') {
        setError("Login request was cancelled. Please try again.");
      } else {
        setError("Google authentication failed. Please try again.");
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-slate-100">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-slate-800">Welcome Back</h2>
          <p className="text-slate-500 mt-2">Log in to manage your business</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-6 text-sm border border-red-100 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Email Address</label>
            <input
              type="email"
              required
              className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Password</label>
            <input
              type="password"
              required
              className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition disabled:opacity-70 shadow-lg shadow-blue-100"
          >
            {loading ? 'Logging in...' : 'Sign In'}
          </button>

          {/* 4. TYPE="BUTTON" IS THE FIX FOR POPUP ERRORS */}
          <button 
            type="button" 
            onClick={handleGoogleAuth}
            className="w-full flex items-center justify-center gap-3 bg-white border border-slate-200 p-4 rounded-2xl font-bold hover:bg-slate-50 transition-all mt-4"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5" alt="google" />
            Continue with Google
          </button>
        </form>

        <div className="mt-8 text-center text-sm text-slate-600">
          Don't have an account?{' '}
          <Link to="/register" className="text-blue-600 font-semibold hover:underline">
            Register here
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;