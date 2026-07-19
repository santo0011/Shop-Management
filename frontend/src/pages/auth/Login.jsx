import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { loginStart, loginSuccess, loginFailure } from '../../redux/slices/authSlice';
import { setTheme } from '../../redux/slices/themeSlice';
import { showToast } from '../../utils/toast';
import api from '../../services/api';
import { BiShow, BiHide, BiEnvelope, BiLockAlt, BiCheck, BiCart, BiPackage, BiBarChartAlt, BiGroup, BiShield } from 'react-icons/bi';

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

      if (data.language) {
        i18n.changeLanguage(data.language);
      }
      if (data.theme) {
        dispatch(setTheme(data.theme));
      }

      dispatch(loginSuccess(data));
      showToast.success('Welcome back! Login successful.');

      if (data.role === 'super_admin') {
        navigate('/super-admin');
      } else {
        navigate('/');
      }
    } catch (err) {
      dispatch(loginFailure(err.response?.data?.message || 'Login failed'));
    }
  };

  const features = [
    { icon: BiCart, label: 'Fast Billing' },
    { icon: BiPackage, label: 'Inventory Management' },
    { icon: BiBarChartAlt, label: 'Sales & Reports' },
    { icon: BiGroup, label: 'Customer & Supplier Management' },
    { icon: BiShield, label: 'Secure & Reliable' },
  ];

  return (
    <div className="login-page">
      {/* ─── Left Brand Panel ─── */}
      <div className="login-brand">
        {/* Floating decorative shapes */}
        <div className="login-brand-shape login-brand-shape--1" />
        <div className="login-brand-shape login-brand-shape--2" />
        <div className="login-brand-shape login-brand-shape--3" />

        <div className="login-brand-content">
          {/* Logo */}
          <div className="login-brand-logo">
            <div className="login-brand-logo-icon">GS</div>
          </div>

          {/* Welcome */}
          <h1 className="login-brand-title">Welcome Back!</h1>
          <p className="login-brand-subtitle">
            Build and manage your business with a modern Grocery POS & Inventory Management System.
          </p>

          {/* Feature highlights */}
          <div className="login-brand-features">
            {features.map((feat, idx) => (
              <div key={idx} className="login-brand-feature">
                <div className="login-brand-feature-icon">
                  <feat.icon />
                </div>
                <span>{feat.label}</span>
              </div>
            ))}
          </div>

          {/* Author credit */}
          <div className="login-brand-author">
            <div className="login-brand-author-avatar">SB</div>
            <div>
              <div className="login-brand-author-name">Santo Biswas</div>
              <div className="login-brand-author-role">Software Developer</div>
            </div>
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
          <h2 className="login-form-heading">Sign In</h2>
          <p className="login-form-subheading">Welcome back! Please enter your credentials.</p>

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
              <label className="login-form-label">Email Address</label>
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
              <label className="login-form-label">Password</label>
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
                <span className="login-checkbox-label">Remember Me</span>
              </label>
              <Link to="/forgot-password" className="login-forgot-link">
                Forgot Password?
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
                  <span className="login-submit-btn__text">Signing in</span>
                </span>
              ) : (
                <span className="login-btn-content">Sign In</span>
              )}
            </button>
          </form>

          {/* Language Switcher */}
          <div className="login-lang-switcher">
            <button
              className={`login-lang-btn ${i18n.language === 'bn' ? 'active' : ''}`}
              onClick={() => i18n.changeLanguage('bn')}
            >
              🇧🇩 বাংলা
            </button>
            <button
              className={`login-lang-btn ${i18n.language === 'en' ? 'active' : ''}`}
              onClick={() => i18n.changeLanguage('en')}
            >
              🇬🇧 English
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;