import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import SAPageHeader from '../../components/common/SAPageHeader';
import { BiKey, BiLock, BiSave, BiShow, BiHide } from 'react-icons/bi';

// ─── Skeleton Loader ──────────────────────────────────────────
const ChangePasswordSkeletonLoader = () => (
  <div>
    <style>{`@keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }`}</style>
    {/* Page Header */}
    <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
      <div style={{ flex: 1 }}>
        <div style={{
          height: 28, width: '30%', marginBottom: 8,
          background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
          backgroundSize: '200% 100%', borderRadius: 8,
          animation: 'shimmer 1.5s infinite',
        }} />
        <div style={{
          height: 14, width: '22%',
          background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
          backgroundSize: '200% 100%', borderRadius: 6,
          animation: 'shimmer 1.5s infinite',
        }} />
      </div>
    </div>

    {/* Card skeleton */}
    <div className="row justify-content-center">
      <div className="col-md-6">
        <div className="premium-card">
          <div className="premium-card-header">
            <div style={{
              height: 20, width: '35%',
              background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
              backgroundSize: '200% 100%', borderRadius: 6,
              animation: 'shimmer 1.5s infinite',
            }} />
          </div>
          <div className="premium-card-body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {[1, 2, 3].map((i) => (
                <div key={i}>
                  <div style={{
                    height: 12, width: '45%', marginBottom: 8,
                    background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
                    backgroundSize: '200% 100%', borderRadius: 4,
                    animation: 'shimmer 1.5s infinite',
                  }} />
                  <div style={{
                    height: 38,
                    background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
                    backgroundSize: '200% 100%', borderRadius: 8,
                    animation: 'shimmer 1.5s infinite',
                  }} />
                </div>
              ))}
              {/* Checkbox skeleton */}
              <div style={{
                height: 16, width: '30%',
                background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
                backgroundSize: '200% 100%', borderRadius: 4,
                animation: 'shimmer 1.5s infinite',
              }} />
              {/* Button skeleton */}
              <div style={{
                height: 40,
                background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
                backgroundSize: '200% 100%', borderRadius: 8,
                animation: 'shimmer 1.5s infinite',
              }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const ChangePassword = () => {
  const { t } = useTranslation();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    // Brief initial loading to match Sales page pattern
    const timer = setTimeout(() => setInitialLoading(false), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    if (form.newPassword !== form.confirmPassword) {
      alert(t('auth.passwordMismatch'));
      return;
    }
    if (form.newPassword.length < 6) {
      alert(t('auth.passwordMinLength'));
      return;
    }
    setSaving(true);
    try {
      await api.put('/auth/change-password', form, { _skipLoading: true });
      alert(t('settingsPage.profileSaved'));
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update password');
    } finally {
      setSaving(false);
    }
  };

  if (initialLoading) return <ChangePasswordSkeletonLoader />;

  return (
    <div>
      <SAPageHeader
        title={t('nav.changePassword')}
        subtitle={t('settingsPage.changePasswordDesc')}
      />

      <div className="row justify-content-center">
        <div className="col-md-6">
          <div className="premium-card">
            <div className="premium-card-header">
              <div className="d-flex align-items-center gap-2">
                <BiKey style={{ color: 'var(--primary)', fontSize: '1.2rem' }} />
                <h6 className="mb-0" style={{ fontWeight: 700 }}>{t('nav.changePassword')}</h6>
              </div>
            </div>
            <div className="premium-card-body">
              <form onSubmit={handleSave}>
                {['currentPassword', 'newPassword', 'confirmPassword'].map((field) => (
                  <div className="form-group" key={field}>
                    <label className="form-label">
                      {field === 'currentPassword' ? t('settingsPage.currentPassword') :
                       field === 'newPassword' ? t('settingsPage.enterNewPassword') :
                       t('settingsPage.confirmNewPasswordPlaceholder')}
                    </label>
                    <div className="password-input-wrapper d-flex align-items-center" style={{ border: '1.5px solid var(--border-color)', borderRadius: 'var(--border-radius-sm)', overflow: 'hidden' }}>
                      <BiLock style={{ marginLeft: '10px', color: 'var(--text-muted)' }} />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        className="form-control"
                        style={{ border: 'none', background: 'transparent' }}
                        value={form[field]}
                        onChange={(e) => setForm(p => ({ ...p, [field]: e.target.value }))}
                        required
                      />
                    </div>
                  </div>
                ))}
                <div className="form-check mb-3">
                  <input type="checkbox" className="form-check-input" id="showPass" checked={showPassword} onChange={() => setShowPassword(!showPassword)} />
                  <label className="form-check-label" htmlFor="showPass" style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    {showPassword ? <BiHide /> : <BiShow />} {showPassword ? 'Hide' : 'Show'} Password
                  </label>
                </div>
                <button type="submit" className="btn-premium btn-premium-primary w-100" disabled={saving}>
                  {saving ? <><span className="spinner-border spinner-border-sm me-1" /> {t('common.saving')}</> : <><BiSave /> {t('settingsPage.updatePassword')}</>}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChangePassword;