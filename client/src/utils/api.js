import axios from 'axios';

const api = axios.create({
  // prioritize Vercel env var, fallback to localhost for your local coding
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
});

// Interceptor: Injects token into every request automatically
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor: Global Error Handling (Optional but helpful)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // If token expires, you could auto-logout here
      console.error("Session expired. Please login again.");
    }
    return Promise.reject(error);
  }
);

export default api;