import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import SAPageHeader from '../../components/common/SAPageHeader';
import { BiKey, BiLock, BiSave, BiShow, BiHide } from 'react-icons/bi';

const ChangePassword = () => {
  const { t } = useTranslation();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
                  <BiSave /> {saving ? t('common.saving') : t('settingsPage.updatePassword')}
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