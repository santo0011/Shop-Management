import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import api from '../../services/api';
import { showToast } from '../../utils/toast';
import SAPageHeader from '../../components/common/SAPageHeader';
import { BiUserCircle, BiUser, BiEnvelope, BiPhone, BiSave } from 'react-icons/bi';

// ─── Skeleton Loader ──────────────────────────────────────────
const ProfileSkeletonLoader = () => (
  <div>
    <style>{`@keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }`}</style>
    {/* Page Header */}
    <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
      <div style={{ flex: 1 }}>
        <div style={{
          height: 28, width: '25%', marginBottom: 8,
          background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
          backgroundSize: '200% 100%', borderRadius: 8,
          animation: 'shimmer 1.5s infinite',
        }} />
        <div style={{
          height: 14, width: '18%',
          background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
          backgroundSize: '200% 100%', borderRadius: 6,
          animation: 'shimmer 1.5s infinite',
        }} />
      </div>
    </div>

    {/* Profile Card Row */}
    <div className="row g-3">
      <div className="col-md-4">
        <div className="premium-card text-center">
          <div className="premium-card-body py-4">
            {/* Avatar circle */}
            <div style={{
              width: 80, height: 80, borderRadius: '50%', margin: '0 auto 1rem',
              background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
              backgroundSize: '200% 100%',
              animation: 'shimmer 1.5s infinite',
            }} />
            {/* Name */}
            <div style={{
              height: 20, width: '60%', margin: '0 auto 12px',
              background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
              backgroundSize: '200% 100%', borderRadius: 6,
              animation: 'shimmer 1.5s infinite',
            }} />
            {/* Email */}
            <div style={{
              height: 14, width: '45%', margin: '0 auto 12px',
              background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
              backgroundSize: '200% 100%', borderRadius: 4,
              animation: 'shimmer 1.5s infinite',
            }} />
            {/* Badge */}
            <div style={{
              height: 24, width: '30%', margin: '0 auto',
              background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
              backgroundSize: '200% 100%', borderRadius: 20,
              animation: 'shimmer 1.5s infinite',
            }} />
          </div>
        </div>
      </div>
      <div className="col-md-8">
        <div className="premium-card">
          <div className="premium-card-header">
            <div style={{
              height: 20, width: '30%',
              background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
              backgroundSize: '200% 100%', borderRadius: 6,
              animation: 'shimmer 1.5s infinite',
            }} />
            <div style={{
              height: 32, width: 100,
              background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
              backgroundSize: '200% 100%', borderRadius: 8,
              animation: 'shimmer 1.5s infinite',
            }} />
          </div>
          <div className="premium-card-body">
            <div className="row g-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="col-md-6">
                  <div>
                    <div style={{
                      height: 12, width: '40%', marginBottom: 8,
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
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const MyProfile = () => {
  const { t } = useTranslation();
  const { user } = useSelector((state) => state.auth);
  const [form, setForm] = useState({ name: '', email: '', phone: '' });
  const [initialLoading, setInitialLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user) {
      setForm({ name: user.name || '', email: user.email || '', phone: user.phone || '' });
      setInitialLoading(false);
    }
  }, [user]);

  const handleSave = async () => {
    if (!form.name.trim()) {
      setError('Name is required');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await api.put('/auth/profile', form, { _skipLoading: true });
      showToast.success('Profile updated successfully');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update profile';
      setError(msg);
      showToast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (initialLoading) return <ProfileSkeletonLoader />;

  return (
    <div>
      <SAPageHeader
        title={t('nav.myProfile')}
        subtitle="Manage your profile information"
      />

      {error && (
        <div className="d-flex align-items-center gap-2 mb-3 p-3" style={{ background: 'var(--glow-danger)', borderRadius: 'var(--border-radius-md)', color: 'var(--danger)', fontSize: '0.85rem' }}>
          {error}
        </div>
      )}

      <div className="row g-3">
        <div className="col-md-4">
          <div className="premium-card text-center">
            <div className="premium-card-body py-4">
              <div
                style={{
                  width: '80px', height: '80px', borderRadius: '50%',
                  background: 'var(--gradient-primary)', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontSize: '2rem', fontWeight: 700,
                  margin: '0 auto 1rem', boxShadow: '0 4px 15px rgba(108,99,255,0.3)',
                }}
              >
                {user?.name?.charAt(0)?.toUpperCase() || <BiUser />}
              </div>
              <h5 style={{ fontWeight: 700 }}>{user?.name || 'N/A'}</h5>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{user?.email || 'N/A'}</p>
              <span className="badge badge-primary">{user?.role || 'N/A'}</span>
            </div>
          </div>
        </div>
        <div className="col-md-8">
          <div className="premium-card">
            <div className="premium-card-header">
              <div className="d-flex align-items-center gap-2">
                <BiUserCircle style={{ color: 'var(--primary)', fontSize: '1.2rem' }} />
                <h6 className="mb-0" style={{ fontWeight: 700 }}>{t('common.profile')}</h6>
              </div>
              <button className="btn-premium btn-premium-primary btn-premium-sm" onClick={handleSave} disabled={saving}>
                {saving ? <><span className="spinner-border spinner-border-sm me-1" /> {t('common.saving')}</> : <><BiSave /> {t('common.save')}</>}
              </button>
            </div>
            <div className="premium-card-body">
              <div className="row g-3">
                <div className="col-md-6">
                  <div className="form-group">
                    <label className="form-label"><BiUser style={{ marginRight: 4 }} />{t('auth.name')} <span style={{color: 'var(--danger)'}}>*</span></label>
                    <input className="form-control" value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} />
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="form-group">
                    <label className="form-label"><BiEnvelope style={{ marginRight: 4 }} />{t('auth.email')}</label>
                    <input className="form-control" type="email" value={form.email} onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))} />
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="form-group">
                    <label className="form-label"><BiPhone style={{ marginRight: 4 }} />{t('auth.phone')}</label>
                    <input className="form-control" value={form.phone} onChange={(e) => setForm(p => ({ ...p, phone: e.target.value }))} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyProfile;