import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { loginStart, loginSuccess, loginFailure } from '../../redux/slices/authSlice';
import { setTheme } from '../../redux/slices/themeSlice';
import { showToast } from '../../utils/toast';
import api from '../../services/api';
import { BiShow, BiHide, BiEnvelope, BiLockAlt, BiCheck, BiCart, BiCodeAlt, BiGlobe } from 'react-icons/bi';

const Login = () => {
  const { t, i18n } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error } = useSelector((state) => state.auth);

  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    dispatch(loginStart());

    try {
      const { data } = await api.post('/auth/login', form, { _skipLoading: true });
      localStorage.setItem('token', data.token);
      localStorage.setItem('refreshToken', data.refreshToken);
      localStorage.setItem('user', JSON.stringify(data));

      // Do NOT override the user's selected language with the backend response.
      // The user's language preference is stored independently in localStorage
      // via the App.jsx languageChanged listener, and should be respected.
      if (data.theme) {
        dispatch(setTheme(data.theme));
      }

      // Sync the user's selected language back to the user object
      // so that the Redux state reflects the actual language in use
      data.language = i18n.language;

      dispatch(loginSuccess(data));
      showToast.success(t('auth.loginSuccess'));

      if (data.role === 'super_admin') {
        navigate('/super-admin');
      } else {
        // After login, check subscription status
        try {
          const subRes = await api.get('/subscription/status', { _skipLoading: true });
          const { isExpired, subscriptionStatus } = subRes.data;
          // Locked if expired, inactive, queued, or cancelled
          const isLocked = !subscriptionStatus || 
            subscriptionStatus === 'expired' || 
            subscriptionStatus === 'inactive' ||
            subscriptionStatus === 'queued' ||
            subscriptionStatus === 'cancelled' ||
            isExpired;
          
          if (isLocked) {
            navigate('/subscription', { replace: true });
          } else {
            navigate('/', { replace: true });
          }
        } catch {
          navigate('/', { replace: true });
        }
      }
    } catch (err) {
      const message = err.response?.data?.code === 'ACCOUNT_DEACTIVATED'
        ? t('auth.accountDeactivated')
        : (err.response?.data?.message || t('auth.loginFailed'));
      dispatch(loginFailure(message));
    }
  };

  const previewBars = [42, 68, 50, 85, 62, 96, 74];

  const trustStats = [
    { value: '500+', label: t('auth.trustShops') },
    { value: '50K+', label: t('auth.trustOrders') },
    { value: '24/7', label: t('auth.trustSupport') },
  ];

  const DeveloperBadge = () => (
    <div className="dev-badge">
      <div className="dev-badge-icon">
        <BiCodeAlt />
      </div>
      <div className="dev-badge-text">
        <span className="dev-badge-name">{t('auth.createdBy')}</span>
        <span className="dev-badge-role">{t('auth.softwareDeveloper')}</span>
      </div>
    </div>
  );

  return (
    <div className="login-page">
      {/* ─── Left Brand Panel ─── */}
      <div className="login-brand">
        {/* Floating decorative shapes */}
        <div className="login-brand-shape login-brand-shape--1" />
        <div className="login-brand-shape login-brand-shape--2" />
        <div className="login-brand-shape login-brand-shape--3" />
        <div className="login-brand-shape login-brand-shape--4" />
        <div className="login-brand-shape login-brand-shape--5" />

        <div className="login-brand-content">
          {/* Logo */}
          <div className="login-brand-logo-row">
            <div className="login-brand-logo">
              <div className="login-brand-logo-icon">GS</div>
            </div>
            <span className="login-brand-logo-word">{t('app.shortName')}</span>
          </div>

          {/* Welcome */}
          <h1 className="login-brand-title">{t('auth.heroTitleLine1')}<br />{t('auth.heroTitleLine2')}</h1>
          <p className="login-brand-subtitle">
            {t('auth.heroSubtitle')}
          </p>

          {/* Live-looking dashboard preview mockup */}
          <div className="login-brand-preview">
            <div className="login-brand-preview-header">
              <span className="login-brand-preview-dot login-brand-preview-dot--red" />
              <span className="login-brand-preview-dot login-brand-preview-dot--yellow" />
              <span className="login-brand-preview-dot login-brand-preview-dot--green" />
              <span className="login-brand-preview-title">{t('auth.previewOverview')}</span>
            </div>
            <div className="login-brand-preview-stats">
              <div className="login-brand-preview-stat">
                <span className="login-brand-preview-stat-label">{t('nav.sales')}</span>
                <span className="login-brand-preview-stat-value">₹48,320</span>
              </div>
              <div className="login-brand-preview-stat">
                <span className="login-brand-preview-stat-label">{t('auth.previewOrders')}</span>
                <span className="login-brand-preview-stat-value">186</span>
              </div>
              <div className="login-brand-preview-stat">
                <span className="login-brand-preview-stat-label">{t('product.profit')}</span>
                <span className="login-brand-preview-stat-value">₹12,940</span>
              </div>
            </div>
            <div className="login-brand-preview-chart">
              {previewBars.map((h, idx) => (
                <span
                  key={idx}
                  className="login-brand-preview-bar"
                  style={{ '--bar-h': `${h}%`, animationDelay: `${0.5 + idx * 0.08}s` }}
                />
              ))}
            </div>
          </div>

          {/* Trust stats */}
          <div className="login-brand-trust-row">
            {trustStats.map((stat, idx) => (
              <React.Fragment key={stat.label}>
                {idx > 0 && <span className="login-brand-trust-divider" />}
                <div className="login-brand-trust-item">
                  <span className="login-brand-trust-value">{stat.value}</span>
                  <span className="login-brand-trust-label">{stat.label}</span>
                </div>
              </React.Fragment>
            ))}
          </div>

          {/* Desktop Developer Badge */}
          <div className="login-brand-badge-wrapper">
            <DeveloperBadge />
          </div>
        </div>
      </div>

      {/* ─── Right Login Panel ─── */}
      <div className="login-form-panel">
        <div className="login-form-card">
          {/* Logo */}
          <div className="login-form-logo">
            <div className="login-form-logo-icon">
              <BiCart />
            </div>
            <span className="login-form-logo-text">{t('app.shortName')}</span>
          </div>

          {/* Heading */}
          <h2 className="login-form-heading">{t('auth.signIn')}</h2>
          <p className="login-form-subheading">{t('auth.welcomeBackSub')}</p>

          {/* Error */}
          {error && (
            <div className="login-form-error">
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="login-form">
            {/* Email */}
            <div className="login-form-group">
              <label className="login-form-label">{t('auth.emailAddress')}</label>
              <div className="login-input-wrapper">
                <span className="login-input-icon">
                  <BiEnvelope />
                </span>
                <input
                  type="email"
                  name="email"
                  className="login-input"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="admin@shop.com"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password */}
            <div className="login-form-group">
              <label className="login-form-label">{t('auth.password')}</label>
              <div className="login-input-wrapper">
                <span className="login-input-icon">
                  <BiLockAlt />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  className="login-input"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="login-input-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? <BiHide /> : <BiShow />}
                </button>
              </div>
            </div>

            {/* Remember Me + Forgot Password */}
            <div className="login-form-row">
              <label className="login-checkbox">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span className="login-checkbox-mark" />
                <span className="login-checkbox-label">{t('auth.rememberMe')}</span>
              </label>
              <Link to="/forgot-password" className="login-forgot-link">
                {t('auth.forgotPassword')}
              </Link>
            </div>

            {/* Submit */}
            <button
              type="submit"
              className={`login-submit-btn ${loading ? 'login-submit-btn--loading' : ''}`}
              disabled={loading}
            >
              {loading ? (
                <span className="login-btn-content">
                  <span className="login-spinner">
                    <span className="login-spinner__dot" />
                    <span className="login-spinner__dot" />
                    <span className="login-spinner__dot" />
                  </span>
                  <span className="login-submit-btn__text">{t('auth.signingIn')}</span>
                </span>
              ) : (
                <span className="login-btn-content">{t('auth.signIn')}</span>
              )}
            </button>
          </form>

          {/* Language Switcher */}
          <div className="login-lang-switcher">
            <span className="login-lang-icon" aria-hidden="true">
              <BiGlobe />
            </span>
            <div className="login-lang-toggle" role="group" aria-label={t('auth.selectLanguage')}>
              <button
                type="button"
                className={`login-lang-btn ${i18n.language === 'en' ? 'active' : ''}`}
                onClick={() => i18n.changeLanguage('en')}
              >
                English
              </button>
              <button
                type="button"
                className={`login-lang-btn ${i18n.language === 'bn' ? 'active' : ''}`}
                onClick={() => i18n.changeLanguage('bn')}
              >
                বাংলা
              </button>
            </div>
          </div>

          {/* Mobile Developer Badge */}
          <div className="login-mobile-badge-wrapper">
            <DeveloperBadge />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;