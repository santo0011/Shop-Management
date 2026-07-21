import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import { BiLockAlt, BiShow, BiHide, BiCheckCircle, BiError, BiArrowBack, BiGlobe } from 'react-icons/bi';

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!password || password.length < 6) {
      setError(t('auth.passwordMinLength'));
      return;
    }
    if (password !== confirmPassword) {
      setError(t('auth.passwordMismatch'));
      return;
    }

    setLoading(true);
    setError('');
    try {
      await api.post(`/auth/reset-password/${token}`, { password }, { _skipLoading: true });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError(err.response?.data?.message || t('auth.passwordResetFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* Left Brand Panel */}
      <div className="login-brand">
        <div className="login-brand-shape login-brand-shape--1" />
        <div className="login-brand-shape login-brand-shape--2" />
        <div className="login-brand-shape login-brand-shape--3" />
        <div className="login-brand-content">
          <div className="login-brand-logo">
            <div className="login-brand-logo-icon">GS</div>
          </div>
          <h1 className="login-brand-title">{t('auth.setNewPassword')}</h1>
          <p className="login-brand-subtitle">
            {t('auth.setNewPasswordSub')}
          </p>
        </div>
      </div>

      {/* Right Form Panel */}
      <div className="login-form-panel">
        <div className="login-form-card">
          <div className="login-form-logo">
            <div className="login-form-logo-icon"><BiLockAlt /></div>
            <span className="login-form-logo-text">{t('app.shortName')}</span>
          </div>

          {success ? (
            /* ─── Success State ─── */
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <div style={{
                width: 64, height: 64, borderRadius: '50%',
                background: 'var(--glow-secondary)', color: 'var(--secondary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.8rem', margin: '0 auto 1.25rem',
              }}>
                <BiCheckCircle />
              </div>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px' }}>
                {t('auth.passwordResetSuccess')}
              </h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.6, margin: '0 0 1.5rem' }}>
                {t('auth.passwordResetSuccessSub')}
              </p>
              <Link
                to="/login"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  color: 'var(--primary)', fontWeight: 600, fontSize: '0.88rem',
                  textDecoration: 'none',
                }}
              >
                <BiArrowBack /> {t('auth.goToLogin')}
              </Link>
            </div>
          ) : (
            <>
              <h2 className="login-form-heading">{t('auth.resetPassword')}</h2>
              <p className="login-form-subheading">{t('auth.enterNewPasswordBelow')}</p>

              {error && (
                <div className="login-form-error">
                  <BiError style={{ flexShrink: 0 }} />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="login-form">
                {/* New Password */}
                <div className="login-form-group">
                  <label className="login-form-label">{t('auth.newPassword')}</label>
                  <div className="login-input-wrapper">
                    <span className="login-input-icon"><BiLockAlt /></span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="login-input"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      autoComplete="new-password"
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

                {/* Confirm Password */}
                <div className="login-form-group">
                  <label className="login-form-label">{t('auth.confirmNewPassword')}</label>
                  <div className="login-input-wrapper">
                    <span className="login-input-icon"><BiLockAlt /></span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="login-input"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      autoComplete="new-password"
                    />
                  </div>
                </div>

                <button type="submit" className="login-submit-btn" disabled={loading}>
                  {loading ? (
                    <><span className="login-spinner" /> {t('auth.resetting')}...</>
                  ) : (
                    t('auth.resetPassword')
                  )}
                </button>
              </form>

              <div style={{ textAlign: 'center', marginTop: '1.25rem' }}>
                <Link
                  to="/login"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    color: 'var(--primary)', fontWeight: 600, fontSize: '0.85rem',
                    textDecoration: 'none',
                  }}
                >
                  <BiArrowBack /> {t('auth.backToLogin')}
                </Link>
              </div>

              <div className="login-lang-switcher">
                <span className="login-lang-icon" aria-hidden="true"><BiGlobe /></span>
                <div className="login-lang-toggle" role="group" aria-label={t('auth.selectLanguage')}>
                  <button type="button" className={`login-lang-btn ${i18n.language === 'en' ? 'active' : ''}`} onClick={() => i18n.changeLanguage('en')}>English</button>
                  <button type="button" className={`login-lang-btn ${i18n.language === 'bn' ? 'active' : ''}`} onClick={() => i18n.changeLanguage('bn')}>বাংলা</button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;