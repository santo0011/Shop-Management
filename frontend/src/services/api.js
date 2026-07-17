import axios from 'axios';
import { store } from '../redux/store';
import { showLoading, hideLoading } from '../redux/slices/loadingSlice';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Track pending requests count to avoid flickering
let pendingRequests = 0;

// Request interceptor to add token and show loading
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Don't show loading for token refresh requests
    if (!config._skipLoading) {
      pendingRequests++;
      if (pendingRequests === 1) {
        store.dispatch(showLoading());
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for token refresh and loading management
api.interceptors.response.use(
  (response) => {
    // Don't hide loading for token refresh requests
    if (!response.config._skipLoading) {
      pendingRequests = Math.max(0, pendingRequests - 1);
      if (pendingRequests === 0) {
        store.dispatch(hideLoading());
      }
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Hide loading for failed requests
    if (originalRequest && !originalRequest._skipLoading) {
      pendingRequests = Math.max(0, pendingRequests - 1);
      if (pendingRequests === 0) {
        store.dispatch(hideLoading());
      }
    }

    if (error.response?.status === 401 && error.response?.data?.expired && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        const { data } = await axios.post(`${API_URL}/auth/refresh-token`, { refreshToken });
        localStorage.setItem('token', data.token);
        localStorage.setItem('refreshToken', data.refreshToken);
        originalRequest.headers.Authorization = `Bearer ${data.token}`;
        return api(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export default api;