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

/**
 * Track pending requests with a counter so the global overlay only
 * disappears when ALL requests have completed (avoids flickering when
 * multiple endpoints are called in parallel).
 *
 * The LoadingOverlay component handles its own show-delay to prevent
 * flashing for fast operations — no artificial delay is needed here.
 */
let pendingRequests = 0;

// Request interceptor to add token and show loading
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Don't show loading for token refresh requests or skip-marked ones
    if (!config._skipLoading) {
      if (pendingRequests === 0) {
        store.dispatch(showLoading());
      }
      pendingRequests++;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

const safeHideLoading = () => {
  pendingRequests = Math.max(0, pendingRequests - 1);
  if (pendingRequests === 0) {
    store.dispatch(hideLoading());
  }
};

// Response interceptor for token refresh and loading management
api.interceptors.response.use(
  (response) => {
    if (!response.config._skipLoading) {
      safeHideLoading();
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Hide loading for failed requests
    if (originalRequest && !originalRequest._skipLoading) {
      safeHideLoading();
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