import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSelector, useDispatch } from 'react-redux';
import { toggleTheme } from '../../redux/slices/themeSlice';
import { logout } from '../../redux/slices/authSlice';
import Swal from 'sweetalert2';
import {
  BiGridAlt, BiStore, BiSun, BiMoon,
  BiMenu, BiGlobe, BiUser, BiX,
  BiCog, BiTrendingUp, BiDollar, BiLogOut
} from 'react-icons/bi';

const SuperAdminLayout = () => {
  const { t, i18n } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { mode } = useSelector((state) => state.theme);
  const { user } = useSelector((state) => state.auth);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 991.98) setMobileOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleClick = (e) => {
      if (!e.target.closest('.dropdown-premium')) {
        setLangOpen(false);
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const menuSections = [
    {
      title: 'Main Menu',
      items: [
        { path: '/super-admin', icon: BiGridAlt, label: t('nav.dashboard'), end: true },
        { path: '/super-admin/shops', icon: BiStore, label: 'Shops', end: false },
      ],
    },
    {
      title: 'Management',
      items: [
        { path: '/super-admin/plans', icon: BiTrendingUp, label: t('nav.plans'), end: false },
        { path: '/super-admin/transactions', icon: BiDollar, label: t('nav.transactions'), end: false },
      ],
    },
    {
      title: 'System',
      items: [
        { path: '/super-admin/settings', icon: BiCog, label: t('nav.settings'), end: false },
      ],
    },
  ];

  const handleNavClick = () => {
    if (window.innerWidth <= 991.98) setMobileOpen(false);
  };

  const handleLanguageChange = async (lang) => {
    i18n.changeLanguage(lang);
    setLangOpen(false);
    try {
      const api = (await import('../../services/api')).default;
      await api.put('/auth/profile', { language: lang });
    } catch (err) {
      console.error('Failed to save language preference');
    }
  };

  const handleLogout = () => {
    Swal.fire({
      title: 'Are you sure?',
      text: 'You will be logged out from the system.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#FF6B6B',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Yes, logout!',
      cancelButtonText: 'Cancel',
      background: 'var(--bg-card)',
      color: 'var(--text-primary)',
      reverseButtons: true,
      iconColor: '#FF6B6B',
    }).then((result) => {
      if (result.isConfirmed) {
        dispatch(logout());
        localStorage.clear();
        navigate('/login', { replace: true });
      }
    });
  };

  const toggleSidebar = () => {
    if (window.innerWidth <= 991.98) {
      setMobileOpen(!mobileOpen);
    } else {
      setSidebarOpen(!sidebarOpen);
    }
  };

  return (
    <div className="app-container">
      {/* Mobile Overlay */}
      <div
        className={`sidebar-overlay ${mobileOpen ? 'open' : ''}`}
        onClick={() => setMobileOpen(false)}
        style={{ display: mobileOpen ? 'block' : 'none' }}
      />

      {/* Sidebar */}
      <div className={`sidebar ${sidebarOpen ? '' : 'collapsed'} ${mobileOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <div className="logo-icon">SA</div>
          <span className="logo-text">Super Admin</span>
          {mobileOpen && (
            <button className="btn-close-premium ms-auto d-lg-none" onClick={() => setMobileOpen(false)}>
              <BiX />
            </button>
          )}
        </div>

        <div className="sidebar-content">
          {menuSections.map((section, sIdx) => (
            <div key={sIdx}>
              <div className="sidebar-section-title">{section.title}</div>
              {section.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.end}
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                  onClick={handleNavClick}
                >
                  <item.icon className="nav-icon" />
                  <span className="nav-label">{item.label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className={`main-content ${!sidebarOpen ? 'expanded' : ''}`}>
        <header className="header">
          <div className="header-left">
            <button className="header-btn" onClick={toggleSidebar}>
              <BiMenu />
            </button>
          </div>
          <div className="header-right">
            <div className="dropdown-premium">
              <button className="header-btn" onClick={() => setLangOpen(!langOpen)}>
                <BiGlobe />
              </button>
              {langOpen && (
                <div className="dropdown-menu-premium">
                  <button className={`dropdown-item-premium ${i18n.language === 'bn' ? 'active' : ''}`} onClick={() => handleLanguageChange('bn')}>
                    <span style={{ fontSize: '1.1rem' }}>🇧🇩</span> বাংলা
                  </button>
                  <button className={`dropdown-item-premium ${i18n.language === 'en' ? 'active' : ''}`} onClick={() => handleLanguageChange('en')}>
                    <span style={{ fontSize: '1.1rem' }}>🇬🇧</span> English
                  </button>
                </div>
              )}
            </div>
            <button className="header-btn" onClick={() => dispatch(toggleTheme())}>
              {mode === 'light' ? <BiMoon /> : <BiSun />}
            </button>
            <div className="dropdown-premium">
              <button className="user-profile-btn" onClick={() => setProfileOpen(!profileOpen)}>
                <div className="user-avatar">{user?.name?.charAt(0)?.toUpperCase() || <BiUser />}</div>
                <div className="d-none d-md-block text-start">
                  <div className="user-name">{user?.name || 'User'}</div>
                  <div className="user-email">{user?.email || ''}</div>
                </div>
              </button>
              {profileOpen && (
                <div className="dropdown-menu-premium">
                  <div className="px-3 py-2" style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{user?.name}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{user?.email}</div>
                  </div>
                  <div className="dropdown-divider-premium" />
                  <button className="dropdown-item-premium" onClick={handleLogout} style={{ color: 'var(--danger)' }}>
                    <BiLogOut /> Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="page-content fade-in">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default SuperAdminLayout;