import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import { BiEnvelope, BiArrowBack, BiCheckCircle, BiMailSend } from 'react-icons/bi';

const ForgotPassword = () => {
  const { t, i18n } = useTranslation();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await api.post('/auth/forgot-password', { email }, { _skipLoading: true });
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send reset email. Please try again.');
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
          <h1 className="login-brand-title">Forgot Password?</h1>
          <p className="login-brand-subtitle">
            No worries! Enter your email and we'll send you a reset link.
          </p>
        </div>
      </div>

      {/* Right Form Panel */}
      <div className="login-form-panel">
        <div className="login-form-card">
          <div className="login-form-logo">
            <div className="login-form-logo-icon"><BiMailSend /></div>
            <span className="login-form-logo-text">{t('app.shortName')}</span>
          </div>

          {sent ? (
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
                Check Your Email
              </h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.6, margin: '0 0 1.5rem' }}>
                If an account exists for <strong>{email}</strong>, we've sent a password reset link. Please check your inbox and spam folder.
              </p>
              <Link
                to="/login"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  color: 'var(--primary)', fontWeight: 600, fontSize: '0.88rem',
                  textDecoration: 'none',
                }}
              >
                <BiArrowBack /> Back to Login
              </Link>
            </div>
          ) : (
            /* ─── Form State ─── */
            <>
              <h2 className="login-form-heading">Reset Password</h2>
              <p className="login-form-subheading">Enter your email address and we'll send you a reset link.</p>

              {error && (
                <div className="login-form-error">
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="login-form">
                <div className="login-form-group">
                  <label className="login-form-label">Email Address</label>
                  <div className="login-input-wrapper">
                    <span className="login-input-icon"><BiEnvelope /></span>
                    <input
                      type="email"
                      className="login-input"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@shop.com"
                      required
                      autoComplete="email"
                    />
                  </div>
                </div>

                <button type="submit" className="login-submit-btn" disabled={loading}>
                  {loading ? (
                    <><span className="login-spinner" /> Sending...</>
                  ) : (
                    'Send Reset Link'
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
                  <BiArrowBack /> Back to Login
                </Link>
              </div>

              <div className="login-lang-switcher">
                <button className={`login-lang-btn ${i18n.language === 'bn' ? 'active' : ''}`} onClick={() => i18n.changeLanguage('bn')}>🇧🇩 বাংলা</button>
                <button className={`login-lang-btn ${i18n.language === 'en' ? 'active' : ''}`} onClick={() => i18n.changeLanguage('en')}>🇬🇧 English</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;