import React, { useEffect, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { setTheme } from './redux/slices/themeSlice';

// Layout
import AdminLayout from './components/layout/AdminLayout';
import SuperAdminLayout from './components/layout/SuperAdminLayout';

// Auth Pages
import Login from './pages/auth/Login';

// Admin Pages
import Dashboard from './pages/admin/Dashboard';
import Products from './pages/admin/inventory/Products';
import Categories from './pages/admin/inventory/Categories';
import Suppliers from './pages/admin/inventory/Suppliers';
import Customers from './pages/admin/inventory/Customers';
import Purchases from './pages/admin/inventory/Purchases';
import Sales from './pages/admin/Sales';
import POS from './pages/admin/POS';
import Reports from './pages/admin/Reports';
import Subscription from './pages/admin/Subscription';
import Settings from './pages/admin/Settings';

// Super Admin Pages
import SuperDashboard from './pages/super-admin/Dashboard';
import ManageShops from './pages/super-admin/ManageShops';
import ManagePlans from './pages/super-admin/ManagePlans';
import Transactions from './pages/super-admin/Transactions';
import SuperAdminSettings from './pages/super-admin/Settings';

// Common
import LoadingOverlay from './components/common/LoadingOverlay';

const PrivateRoute = ({ children, role }) => {
  const { isAuthenticated, user, loading } = useSelector((state) => state.auth);

  if (loading) {
    return null; // LoadingOverlay handles this globally via API calls
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
    if (user?.language) {
      i18n.changeLanguage(user.language).catch(err => {
        console.error('Failed to change language:', err);
      });
    }
  }, [user?.language, i18n]);

  // Compute redirect paths based on auth state
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
          <Route path="plans" element={<ManagePlans />} />
          <Route path="transactions" element={<Transactions />} />
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
          <Route path="categories" element={<Categories />} />
          <Route path="suppliers" element={<Suppliers />} />
          <Route path="customers" element={<Customers />} />
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