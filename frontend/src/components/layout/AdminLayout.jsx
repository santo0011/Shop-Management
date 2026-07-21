import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import api from '../../services/api';

// How often to check that this shop is still active while the user sits
// idle on a page (no other API calls firing). Keeps deactivation-by-
// Super-Admin effective without requiring a manual page refresh.
const SHOP_STATUS_POLL_INTERVAL_MS = 30000;

const AdminLayout = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Periodically ping an authenticated endpoint so the backend's shop-status
  // check (in the `protect` middleware) gets a chance to run even when the
  // user isn't actively triggering requests. If the shop was deactivated,
  // the response interceptor in services/api.js handles the forced logout.
  useEffect(() => {
    const interval = setInterval(() => {
      api.get('/auth/profile', { _skipLoading: true }).catch(() => {});
    }, SHOP_STATUS_POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  // Close mobile sidebar on route change
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
