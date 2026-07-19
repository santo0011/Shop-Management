import React, { useState, useRef, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { toggleTheme } from '../../redux/slices/themeSlice';
import { updateLanguage } from '../../redux/slices/authSlice';
import api from '../../services/api';
import { BiMenu, BiSun, BiMoon, BiUser, BiGlobe, BiLogOut, BiBell } from 'react-icons/bi';
import GlobalSearch from '../common/GlobalSearch';
import { showToast } from '../../utils/toast';

const Header = ({ onToggleSidebar }) => {
  const { t, i18n } = useTranslation();
  const dispatch = useDispatch();
  const { mode } = useSelector((state) => state.theme);
  const { user } = useSelector((state) => state.auth);
  const [langOpen, setLangOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const langRef = useRef(null);
  const profileRef = useRef(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (langRef.current && !langRef.current.contains(e.target)) setLangOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLanguageChange = async (lang) => {
    i18n.changeLanguage(lang);
    dispatch(updateLanguage(lang));
    setLangOpen(false);
    try {
      await api.put('/auth/profile', { language: lang });
    } catch (err) {
      console.error('Failed to save language preference');
    }
  };

  const handleLogout = () => {
    showToast.success('Logged out successfully.');
    localStorage.clear();
    window.location.href = '/login';
  };

  return (
    <header className="header">
      <div className="header-left">
        <button
          className="header-btn"
          onClick={onToggleSidebar}
          aria-label="Toggle sidebar"
        >
          <BiMenu />
        </button>
      </div>

      {!isMobile && <GlobalSearch />}

      <div className="header-right">
        {/* Language Switcher */}
        <div className="dropdown-premium" ref={langRef}>
          <button
            className="header-btn"
            onClick={() => setLangOpen(!langOpen)}
            aria-label="Switch language"
          >
            <BiGlobe />
          </button>
          {langOpen && (
            <div className="dropdown-menu-premium">
              <button
                className={`dropdown-item-premium ${i18n.language === 'bn' ? 'active' : ''}`}
                onClick={() => handleLanguageChange('bn')}
              >
                <span style={{ fontSize: '1.1rem' }}>🇧🇩</span> বাংলা
              </button>
              <button
                className={`dropdown-item-premium ${i18n.language === 'en' ? 'active' : ''}`}
                onClick={() => handleLanguageChange('en')}
              >
                <span style={{ fontSize: '1.1rem' }}>🇬🇧</span> English
              </button>
            </div>
          )}
        </div>

        {/* Theme Toggle */}
        <button
          className="header-btn"
          onClick={() => dispatch(toggleTheme())}
          aria-label="Toggle theme"
        >
          {mode === 'light' ? <BiMoon /> : <BiSun />}
        </button>

        {/* User Profile */}
        <div className="dropdown-premium" ref={profileRef}>
          <button
            className="user-profile-btn"
            onClick={() => setProfileOpen(!profileOpen)}
            aria-label="User menu"
          >
            <div className="user-avatar">
              {user?.name?.charAt(0)?.toUpperCase() || <BiUser />}
            </div>
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
              <button className="dropdown-item-premium" onClick={handleLogout}>
                <BiLogOut /> {t('nav.logout')}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
