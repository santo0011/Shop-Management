import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSelector, useDispatch } from 'react-redux';
import { updateLanguage } from '../../redux/slices/authSlice';
import { toggleTheme } from '../../redux/slices/themeSlice';
import { showToast } from '../../utils/toast';
import {
  BiSun, BiMoon,
  BiMenu, BiGlobe, BiUser,
  BiLogOut
} from 'react-icons/bi';
import SuperAdminSidebar from './SuperAdminSidebar';
import '../../styles/super-admin-sidebar.css';

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

  const handleLanguageChange = async (lang) => {
    i18n.changeLanguage(lang);
    dispatch(updateLanguage(lang));
    setLangOpen(false);
    try {
      const api = (await import('../../services/api')).default;
      await api.put('/auth/profile', { language: lang }, { _skipLoading: true });
    } catch (err) {
      console.error('Failed to save language preference');
    }
  };

  const handleLogout = () => {
    showToast.success(t('toast.logoutSuccess'));
    const savedLang = localStorage.getItem('appLanguage');
    localStorage.clear();
    if (savedLang) {
      localStorage.setItem('appLanguage', savedLang);
    }
    window.location.href = '/login';
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
      {/* Super Admin Sidebar — modern collapsible SaaS design */}
      <SuperAdminSidebar
        collapsed={!sidebarOpen}
        onToggle={toggleSidebar}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

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
                  <button
                    className={`dropdown-item-premium ${i18n.language === 'bn' ? 'active' : ''}`}
                    onClick={() => handleLanguageChange('bn')}
                  >
                    <span style={{ fontSize: '1.1rem' }}>বাং</span> বাংলা
                  </button>
                  <button
                    className={`dropdown-item-premium ${i18n.language === 'en' ? 'active' : ''}`}
                    onClick={() => handleLanguageChange('en')}
                  >
                    <span style={{ fontSize: '1.1rem' }}>EN</span> English
                  </button>
                </div>
              )}
            </div>
            <button className="header-btn" onClick={() => dispatch(toggleTheme())}>
              {mode === 'light' ? <BiMoon /> : <BiSun />}
            </button>
            <div className="dropdown-premium">
              <button className="user-profile-btn" onClick={() => setProfileOpen(!profileOpen)}>
                <div className="user-avatar">
                  {user?.name?.charAt(0)?.toUpperCase() || <BiUser />}
                </div>
                <div className="d-none d-md-block text-start">
                  <div className="user-name">{user?.name || t('common.user')}</div>
                </div>
              </button>
              {profileOpen && (
                <div className="dropdown-menu-premium">
                  <div
                    className="px-3 py-2"
                    style={{ borderBottom: '1px solid var(--border-color)' }}
                  >
                    <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{user?.name}</div>
                  </div>
                  <div className="dropdown-divider-premium" />
                  <button
                    className="dropdown-item-premium"
                    onClick={handleLogout}
                    style={{ color: 'var(--danger)' }}
                  >
                    <BiLogOut /> {t('nav.logout')}
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