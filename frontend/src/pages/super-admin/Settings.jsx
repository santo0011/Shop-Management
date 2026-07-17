import React from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { setTheme } from '../../redux/slices/themeSlice';
import api from '../../services/api';
import { BiMoon, BiSun, BiGlobe, BiUser, BiShield } from 'react-icons/bi';

const SuperAdminSettings = () => {
  const { t, i18n } = useTranslation();
  const dispatch = useDispatch();
  const { mode } = useSelector((state) => state.theme);
  const { user } = useSelector((state) => state.auth);

  const handleThemeToggle = () => {
    const newTheme = mode === 'light' ? 'dark' : 'light';
    dispatch(setTheme(newTheme));
    try {
      api.put('/auth/profile', { theme: newTheme });
    } catch (err) {
      console.error('Failed to save theme preference');
    }
  };

  const handleLanguageChange = async (lang) => {
    i18n.changeLanguage(lang);
    try {
      await api.put('/auth/profile', { language: lang });
    } catch (err) {
      console.error('Failed to save language preference');
    }
  };

  return (
    <div>
      {/* Page Header */}
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h4 className="mb-1" style={{ fontWeight: 800 }}>Settings</h4>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
            Manage your account and preferences
          </p>
        </div>
      </div>

      <div className="row g-4">
        {/* Profile Section */}
        <div className="col-lg-4">
          <div className="premium-card">
            <div className="premium-card-body text-center">
              <div style={{
                width: '80px', height: '80px', borderRadius: '50%',
                background: 'var(--gradient-primary)',
                color: '#fff', display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: '2rem', fontWeight: 700,
                margin: '0 auto 1rem',
              }}>
                {user?.name?.charAt(0)?.toUpperCase() || <BiUser />}
              </div>
              <h5 className="mb-1" style={{ fontWeight: 700 }}>{user?.name || 'Super Admin'}</h5>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>{user?.email}</p>
              <span className="badge badge-primary mt-2" style={{ textTransform: 'capitalize' }}>
                <BiShield style={{ marginRight: '4px' }} />Super Admin
              </span>
            </div>
          </div>
        </div>

        {/* Settings Options */}
        <div className="col-lg-8">
          {/* Theme */}
          <div className="premium-card mb-3">
            <div className="premium-card-body d-flex align-items-center justify-content-between">
              <div className="d-flex align-items-center gap-3">
                <div style={{
                  width: '44px', height: '44px', borderRadius: '12px',
                  background: 'var(--glow-warning)', color: 'var(--warning)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem',
                }}>
                  {mode === 'light' ? <BiSun /> : <BiMoon />}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Theme</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'capitalize' }}>{mode} Mode</div>
                </div>
              </div>
              <button className="btn-premium btn-premium-secondary btn-premium-sm" onClick={handleThemeToggle}>
                {mode === 'light' ? <BiMoon /> : <BiSun />} Switch to {mode === 'light' ? 'Dark' : 'Light'}
              </button>
            </div>
          </div>

          {/* Language */}
          <div className="premium-card mb-3">
            <div className="premium-card-body d-flex align-items-center justify-content-between">
              <div className="d-flex align-items-center gap-3">
                <div style={{
                  width: '44px', height: '44px', borderRadius: '12px',
                  background: 'var(--glow-primary)', color: 'var(--primary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem',
                }}>
                  <BiGlobe />
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Language</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    {i18n.language === 'bn' ? 'বাংলা' : 'English'}
                  </div>
                </div>
              </div>
              <div className="d-flex gap-2">
                <button
                  className={`btn-premium btn-premium-sm ${i18n.language === 'bn' ? 'btn-premium-primary' : 'btn-premium-secondary'}`}
                  onClick={() => handleLanguageChange('bn')}
                >
                  🇧🇩 বাংলা
                </button>
                <button
                  className={`btn-premium btn-premium-sm ${i18n.language === 'en' ? 'btn-premium-primary' : 'btn-premium-secondary'}`}
                  onClick={() => handleLanguageChange('en')}
                >
                  🇬🇧 English
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default SuperAdminSettings;