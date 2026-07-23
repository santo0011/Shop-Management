import React, { useEffect, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { updateLanguage } from './redux/slices/authSlice';
import { setTheme } from './redux/slices/themeSlice';
import { getSavedLanguage, saveLanguage } from './utils/i18n';

// Layout
import AdminLayout from './components/layout/AdminLayout';
import SuperAdminLayout from './components/layout/SuperAdminLayout';

// Auth Pages
import Login from './pages/auth/Login';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';

// Admin Pages
import Dashboard from './pages/admin/Dashboard';
import Products from './pages/admin/inventory/Products';
import Categories from './pages/admin/inventory/Categories';
import Suppliers from './pages/admin/inventory/Suppliers';
import SupplierLedgerPage from './pages/admin/SupplierLedgerPage';
import ProductLedgerPage from './pages/admin/ProductLedgerPage';
import Customers from './pages/admin/inventory/Customers';
import Purchases from './pages/admin/inventory/Purchases';
import Sales from './pages/admin/Sales';
import CustomerLedgerPage from './pages/admin/CustomerLedgerPage';
import POS from './pages/admin/POS';
import Reports from './pages/admin/Reports';
import Subscription from './pages/admin/Subscription';
import Settings from './pages/admin/Settings';

// Super Admin Pages
import SuperDashboard from './pages/super-admin/Dashboard';
import ManageShops from './pages/super-admin/ManageShops';
import ManagePlans from './pages/super-admin/ManagePlans';
import SuperAdminSettings from './pages/super-admin/Settings';
import BusinessTypes from './pages/super-admin/BusinessTypes';
import CategoriesLibrary from './pages/super-admin/CategoriesLibrary';
import ActiveSubscriptions from './pages/super-admin/ActiveSubscriptions';
import Subscriptions from './pages/super-admin/Subscriptions';
import SubscriptionHistory from './pages/super-admin/SubscriptionHistory';
import ExpiringSoon from './pages/super-admin/ExpiringSoon';
import Payments from './pages/super-admin/Payments';
import RevenueReports from './pages/super-admin/RevenueReports';
import BusinessReports from './pages/super-admin/BusinessReports';
import GlobalSettings from './pages/super-admin/GlobalSettings';
import BackupRestore from './pages/super-admin/BackupRestore';
import ActivityLogs from './pages/super-admin/ActivityLogs';
import MyProfile from './pages/super-admin/MyProfile';
import ChangePassword from './pages/super-admin/ChangePassword';

// Common
import LoadingOverlay from './components/common/LoadingOverlay';

const PrivateRoute = ({ children, role }) => {
  const { isAuthenticated, user, loading } = useSelector((state) => state.auth);

  if (loading) {
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (role && user?.role !== role) {
    const redirectPath = user?.role === 'super_admin' ? '/super-admin' : '/';
    return <Navigate to={redirectPath} replace />;
  }

  return children;
};

function App() {
  const dispatch = useDispatch();
  const { mode } = useSelector((state) => state.theme);
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const { i18n } = useTranslation();

  useEffect(() => {
    try {
      document.documentElement.setAttribute('data-theme', mode);
    } catch (err) {
      console.error('Failed to set theme:', err);
    }
  }, [mode]);

  useEffect(() => {
    const savedLang = getSavedLanguage();
    if (savedLang && savedLang !== i18n.language) {
      i18n.changeLanguage(savedLang).catch(err => {
        console.error('Failed to change language:', err);
      });
    }
  }, [i18n]);

  useEffect(() => {
    if (user?.language && !getSavedLanguage()) {
      saveLanguage(user.language);
    }
  }, [user?.language]);

  useEffect(() => {
    const handleLanguageChanged = (lng) => {
      saveLanguage(lng);
      dispatch(updateLanguage(lng));
    };
    i18n.on('languageChanged', handleLanguageChanged);
    return () => {
      i18n.off('languageChanged', handleLanguageChanged);
    };
  }, [i18n, dispatch]);

  const loginRedirect = useMemo(() => {
    if (!isAuthenticated) return null;
    return user?.role === 'super_admin' ? '/super-admin' : '/';
  }, [isAuthenticated, user]);

  const defaultRedirect = useMemo(() => {
    if (!isAuthenticated) return '/login';
    return user?.role === 'super_admin' ? '/super-admin' : '/dashboard';
  }, [isAuthenticated, user]);

  return (
    <Router>
      <LoadingOverlay />
      <Routes>
        {/* Auth Routes */}
        <Route 
          path="/login" 
          element={
            isAuthenticated && loginRedirect 
              ? <Navigate to={loginRedirect} replace /> 
              : <Login />
          } 
        />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />

        {/* Super Admin Routes */}
        <Route 
          path="/super-admin" 
          element={
            <PrivateRoute role="super_admin">
              <SuperAdminLayout />
            </PrivateRoute>
          }
        >
          <Route index element={<SuperDashboard />} />
          <Route path="shops" element={<ManageShops />} />
          <Route path="business-types" element={<BusinessTypes />} />
          <Route path="categories-library" element={<CategoriesLibrary />} />
          <Route path="plans" element={<ManagePlans />} />
          <Route path="active-subscriptions" element={<ActiveSubscriptions />} />
          <Route path="subscriptions" element={<Subscriptions />} />
          <Route path="subscription-history" element={<SubscriptionHistory />} />
          <Route path="expiring-soon" element={<ExpiringSoon />} />
          <Route path="payments" element={<Payments />} />
          <Route path="revenue-reports" element={<RevenueReports />} />
          <Route path="business-reports" element={<BusinessReports />} />
          <Route path="global-settings" element={<GlobalSettings />} />
          <Route path="backup-restore" element={<BackupRestore />} />
          <Route path="activity-logs" element={<ActivityLogs />} />
          <Route path="my-profile" element={<MyProfile />} />
          <Route path="change-password" element={<ChangePassword />} />
          <Route path="settings" element={<SuperAdminSettings />} />
        </Route>

        {/* Admin Routes */}
        <Route 
          path="/" 
          element={
            <PrivateRoute>
              <AdminLayout />
            </PrivateRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="pos" element={<POS />} />
          <Route path="products" element={<Products />} />
          <Route path="products/:productId/ledger" element={<ProductLedgerPage />} />
          <Route path="categories" element={<Categories />} />
          <Route path="suppliers" element={<Suppliers />} />
          <Route path="suppliers/:supplierId/ledger" element={<SupplierLedgerPage />} />
          <Route path="customers" element={<Customers />} />
          <Route path="customers/:customerId/ledger" element={<CustomerLedgerPage />} />
          <Route path="purchases" element={<Purchases />} />
          <Route path="sales" element={<Sales />} />
          <Route path="reports" element={<Reports />} />
          <Route path="subscription" element={<Subscription />} />
          <Route path="settings" element={<Settings />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to={defaultRedirect} replace />} />
      </Routes>
    </Router>
  );
}

export default App;