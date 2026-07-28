import axios from 'axios';
import { store } from '../redux/store';
import { showLoading, hideLoading } from '../redux/slices/loadingSlice';
import { logout } from '../redux/slices/authSlice';
import { showToast } from '../utils/toast';
import i18n from '../utils/i18n';

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

// Guards against showing the forced-logout dialog more than once when
// several in-flight requests all come back with SHOP_DEACTIVATED at the
// same time (e.g. the idle-session poll and a user-triggered request
// landing together).
let forcedLogoutInProgress = false;

const forceLogout = (message) => {
  if (forcedLogoutInProgress) return;
  forcedLogoutInProgress = true;

  // The `logout` reducer clears token/refreshToken/user from localStorage
  // as part of its own state update — see redux/slices/authSlice.js.
  store.dispatch(logout());

  // Top-right toast (same style as every other notification in the app,
  // via utils/toast.js) — hovering pauses its timer so it won't get missed.
  // Redirect only once it actually closes, so the user has a chance to read it.
  showToast.error(message).finally(() => {
    window.location.href = '/login';
  });
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

    if (error.response?.status === 403 && error.response?.data?.code === 'SHOP_DEACTIVATED') {
      forceLogout(i18n.t('toast.shopDeactivatedMessage'));
      return Promise.reject(error);
    }

    // Handle subscription expired - redirect to /subscription
    if (error.response?.status === 403 && (error.response?.data?.code === 'SUBSCRIPTION_EXPIRED' || error.response?.data?.subscriptionExpired)) {
      const currentPath = window.location.pathname;
      if (currentPath !== '/subscription' && currentPath !== '/login') {
        window.location.href = '/subscription';
      }
      return Promise.reject(error);
    }

    // Skip forced-logout handling for the login request itself: a login
    // attempt against a deactivated account never had a session to begin
    // with, so it's just a form error — Login.jsx already shows it inline.
    // This branch is only for a session that was active and just got
    // invalidated mid-use.
    const isLoginRequest = originalRequest?.url?.includes('/auth/login');

    if (!isLoginRequest && error.response?.status === 401 && error.response?.data?.code === 'ACCOUNT_DEACTIVATED') {
      forceLogout(i18n.t('auth.accountDeactivated'));
      return Promise.reject(error);
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