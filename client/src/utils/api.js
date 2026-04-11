import axios from 'axios';

const getBaseURL = () => {
  let url = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  return url.endsWith('/') ? url.slice(0, -1) : url;
};

const api = axios.create({
  baseURL: getBaseURL(),
  headers: {
    'Content-Type': 'application/json'
  }
});

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
const SKIP_AUTO_LOGOUT_URLS = ['/auth/update-password'];

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const originalRequest = error.config;

    // Handle 401 Unauthorized (Expired or Invalid Token)
    if (error.response?.status === 401 && !originalRequest._retry) {
      
      // Check if this 401 came from a route that uses 401 for its own logic
      const isSkippedUrl = SKIP_AUTO_LOGOUT_URLS.some(url =>
        originalRequest.url?.includes(url)
      );

      if (isSkippedUrl) {
        // Let the calling component handle this error normally (e.g. "wrong password")
        return Promise.reject(error);
      }

      console.warn("Unauthorized/Expired session. Redirecting to login...");
      
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('userInfo');
      
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