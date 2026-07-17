import React from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import {
  BiGridAlt, BiCart, BiPackage, BiCategory, BiCar, BiGroup,
  BiReceipt, BiDollar, BiLineChart, BiCog,
  BiCreditCard, BiLogOut, BiStore, BiX
} from 'react-icons/bi';

const Sidebar = ({ collapsed, onToggle, mobileOpen, onMobileClose }) => {
  const { t } = useTranslation();
  const { user } = useSelector((state) => state.auth);

  const mainMenu = [
    { path: '/', icon: BiGridAlt, label: t('nav.dashboard') },
    { path: '/pos', icon: BiCart, label: t('nav.pos') },
  ];

  const inventoryMenu = [
    { path: '/products', icon: BiPackage, label: t('nav.products') },
    { path: '/categories', icon: BiCategory, label: t('nav.categories') },
    { path: '/suppliers', icon: BiCar, label: t('nav.suppliers') },
    { path: '/customers', icon: BiGroup, label: t('nav.customers') },
    { path: '/purchases', icon: BiReceipt, label: t('nav.purchases') },
  ];

  const financeMenu = [
    { path: '/sales', icon: BiDollar, label: t('nav.sales') },
    { path: '/reports', icon: BiLineChart, label: t('nav.reports') },
  ];

  const settingsMenu = [
    { path: '/subscription', icon: BiCreditCard, label: t('nav.subscription') },
    { path: '/settings', icon: BiCog, label: t('nav.settings') },
  ];

  const renderNavItem = (item) => (
    <NavLink
      key={item.path}
      to={item.path}
      className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
      onClick={() => {
        if (window.innerWidth <= 991.98 && onMobileClose) {
          onMobileClose();
        }
      }}
    >
      <item.icon className="nav-icon" />
      <span className="nav-label">{item.label}</span>
    </NavLink>
  );

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = '/login';
  };

  return (
    <>
      {/* Mobile Overlay */}
      <div
        className={`sidebar-overlay ${mobileOpen ? 'open' : ''}`}
        onClick={onMobileClose}
        style={{ display: mobileOpen ? 'block' : 'none' }}
      />

      {/* Sidebar */}
      <div className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'open' : ''}`}>
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="logo-icon">GS</div>
          <span className="logo-text">{t('app.shortName')}</span>
          {mobileOpen && (
            <button
              className="btn-close-premium ms-auto d-lg-none"
              onClick={onMobileClose}
            >
              <BiX />
            </button>
          )}
        </div>

        {/* Navigation */}
        <div className="sidebar-content">
          {/* Main */}
          <div className="sidebar-section-title">{t('nav.dashboard')}</div>
          {mainMenu.map(renderNavItem)}

          {/* Inventory */}
          <div className="sidebar-section-title mt-3">{t('nav.products')}</div>
          {inventoryMenu.map(renderNavItem)}

          {/* Finance */}
          <div className="sidebar-section-title mt-3">{t('nav.sales')}</div>
          {financeMenu.map(renderNavItem)}

          {/* Settings */}
          <div className="sidebar-section-title mt-3">{t('nav.settings')}</div>
          {settingsMenu.map(renderNavItem)}
        </div>

        {/* Footer */}
        <div className="sidebar-footer">
          <div className="nav-item" onClick={handleLogout}>
            <BiLogOut className="nav-icon" />
            <span className="nav-label">{t('nav.logout')}</span>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
