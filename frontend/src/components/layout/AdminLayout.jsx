import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import Sidebar from './Sidebar';
import Header from './Header';
import api from '../../services/api';
import { setMyShop } from '../../redux/slices/shopSlice';

const SHOP_STATUS_POLL_INTERVAL_MS = 30000;

// Protected routes for when subscription is NOT expired
const PROTECTED_ROUTES = [
  '/pos',
  '/products',
  '/categories',
  '/suppliers',
  '/customers',
  '/purchases',
  '/sales',
  '/reports',
  '/settings',
];

// Routes always allowed (even when expired)
const ALLOWED_ROUTES = [
  '/dashboard',
  '/',
  '/subscription',
];

const AdminLayout = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [subscriptionExpired, setSubscriptionExpired] = useState(false);
  const dispatch = useDispatch();
  const location = useLocation();
  const navigate = useNavigate();

  // Check subscription status and protect routes
  useEffect(() => {
    const checkAccess = async () => {
      try {
        const { data } = await api.get('/subscription/status', { _skipLoading: true });
        if (data.isExpired) {
          setSubscriptionExpired(true);
          // Redirect to dashboard if trying to access protected routes
          const isProtected = PROTECTED_ROUTES.some(route => 
            location.pathname === route || location.pathname.startsWith(route + '/')
          );
          if (isProtected) {
            navigate('/dashboard', { replace: true });
          }
        } else {
          setSubscriptionExpired(false);
        }
      } catch (err) {
        // Silently fail - may be offline
      }
    };

    checkAccess();
    const interval = setInterval(checkAccess, SHOP_STATUS_POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [location.pathname, navigate]);

  // Periodically ping an authenticated endpoint so the backend's shop-status
  // check gets a chance to run even when the user isn't actively triggering requests.
  useEffect(() => {
    const fetchProfile = () => {
      api.get('/auth/profile', { _skipLoading: true })
        .then(({ data }) => { if (data?.shop) dispatch(setMyShop(data.shop)); })
        .catch(() => {});
    };
    fetchProfile();
    const interval = setInterval(fetchProfile, SHOP_STATUS_POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [dispatch]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 991.98) {
        setMobileOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSidebar = () => {
    if (window.innerWidth <= 991.98) {
      setMobileOpen(!mobileOpen);
    } else {
      setSidebarCollapsed(!sidebarCollapsed);
    }
  };

  const closeMobileSidebar = () => {
    setMobileOpen(false);
  };

  return (
    <div className="app-container">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={toggleSidebar}
        mobileOpen={mobileOpen}
        onMobileClose={closeMobileSidebar}
      />
      <div className={`main-content ${sidebarCollapsed ? 'expanded' : ''}`}>
        <Header onToggleSidebar={toggleSidebar} />
        <div className="page-content fade-in">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;