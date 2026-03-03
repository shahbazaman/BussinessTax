import axios from 'axios';

// 1. Sanitize the Base URL (Removes accidental double slashes)
const getBaseURL = () => {
  let url = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  // If the user added a trailing slash in Vercel settings, remove it to prevent //api/auth
  return url.endsWith('/') ? url.slice(0, -1) : url;
};

const api = axios.create({
  baseURL: getBaseURL(),
  headers: {
    'Content-Type': 'application/json'
  }
});

// 2. Interceptor: Request (Inject Token)
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 3. Interceptor: Response (Global Error & Auto-Logout)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const originalRequest = error.config;

    // Handle 401 Unauthorized (Expired or Invalid Token)
    if (error.response?.status === 401 && !originalRequest._retry) {
      console.warn("Unauthorized/Expired session. Redirecting to login...");
      
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Prevent infinite redirect loops
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    // Handle 403 Forbidden (Useful if you add Admin roles later)
    if (error.response?.status === 403) {
      console.error("Access denied. You do not have permission.");
    }

    return Promise.reject(error);
  }
);
export const getSpendingReport = () => api.get('/accounts/reports/spending');
export default api;