import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import SAPageHeader from '../../components/common/SAPageHeader';
import { BiCog, BiGlobe, BiDollar, BiCalendar, BiSave, BiRefresh } from 'react-icons/bi';

// ─── Skeleton Loader ──────────────────────────────────────────
const GlobalSettingsSkeletonLoader = () => (
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
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{
          height: 32, width: 100,
          background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
          backgroundSize: '200% 100%', borderRadius: 8,
          animation: 'shimmer 1.5s infinite',
        }} />
        <div style={{
          height: 32, width: 80,
          background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
          backgroundSize: '200% 100%', borderRadius: 8,
          animation: 'shimmer 1.5s infinite',
        }} />
      </div>
    </div>

    {/* Cards skeleton */}
    <div className="row g-3">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="col-md-6">
          <div className="premium-card">
            <div className="premium-card-header">
              <div style={{
                height: 20, width: '40%',
                background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
                backgroundSize: '200% 100%', borderRadius: 6,
                animation: 'shimmer 1.5s infinite',
              }} />
            </div>
            <div className="premium-card-body">
              {[1, 2].map((f) => (
                <div key={f} style={{ marginBottom: '1rem' }}>
                  <div style={{
                    height: 12, width: '30%', marginBottom: 8,
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
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const GlobalSettings = () => {
  const { t } = useTranslation();
  const [settings, setSettings] = useState({
    companyName: '', appName: '', currency: 'INR', timezone: 'Asia/Kolkata',
    dateFormat: 'DD/MM/YYYY', taxRate: 0, taxName: 'GST',
  });
  const [initialLoading, setInitialLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const isFirstLoad = useRef(true);

  const fetchSettings = useCallback(async () => {
    if (isFirstLoad.current) {
      setInitialLoading(true);
    }
    try {
      const { data } = await api.get('/super-admin/settings', { _skipLoading: true });
      if (data) setSettings(prev => ({ ...prev, ...data }));
    } catch (err) {
      console.error(err);
    } finally {
      setInitialLoading(false);
      if (isFirstLoad.current) isFirstLoad.current = false;
    }
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/super-admin/settings', settings, { _skipLoading: true });
      alert('Settings saved successfully');
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field, value) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const settingsSections = [
    {
      title: 'Company Information',
      icon: BiCog,
      fields: [
        { label: 'Company Name', field: 'companyName', type: 'text' },
        { label: 'App Name', field: 'appName', type: 'text' },
      ],
    },
    {
      title: 'Localization',
      icon: BiGlobe,
      fields: [
        { label: 'Currency', field: 'currency', type: 'select', options: ['INR', 'USD', 'EUR', 'GBD', 'BDT'] },
        { label: 'Timezone', field: 'timezone', type: 'select', options: ['Asia/Kolkata', 'Asia/Dhaka', 'UTC', 'America/New_York', 'Europe/London'] },
        { label: 'Date Format', field: 'dateFormat', type: 'select', options: ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'] },
      ],
    },
    {
      title: 'Tax Settings',
      icon: BiDollar,
      fields: [
        { label: 'Tax Name', field: 'taxName', type: 'text' },
        { label: 'Tax Rate (%)', field: 'taxRate', type: 'number' },
      ],
    },
  ];

  if (initialLoading) return <GlobalSettingsSkeletonLoader />;

  return (
    <div>
      <SAPageHeader
        title={t('nav.globalSettings')}
        subtitle="Configure global platform settings"
        actions={
          <div className="d-flex gap-2">
            <button className="btn-premium btn-premium-secondary btn-premium-sm" onClick={fetchSettings}>
              <BiRefresh /> {t('common.refresh')}
            </button>
            <button className="btn-premium btn-premium-primary btn-premium-sm" onClick={handleSave} disabled={saving}>
              <BiSave /> {saving ? t('common.saving') : t('common.save')}
            </button>
          </div>
        }
      />

      <div className="row g-3">
        {settingsSections.map((section, idx) => (
          <div key={idx} className="col-md-6">
            <div className="premium-card">
              <div className="premium-card-header">
                <div className="d-flex align-items-center gap-2">
                  <section.icon style={{ color: 'var(--primary)', fontSize: '1.2rem' }} />
                  <h6 className="mb-0" style={{ fontWeight: 700 }}>{section.title}</h6>
                </div>
              </div>
              <div className="premium-card-body">
                {section.fields.map((f) => (
                  <div className="form-group" key={f.field}>
                    <label className="form-label">{f.label}</label>
                    {f.type === 'select' ? (
                      <select className="form-select" value={settings[f.field]} onChange={(e) => handleChange(f.field, e.target.value)}>
                        {f.options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    ) : (
                      <input type={f.type} className="form-control" value={settings[f.field]} onChange={(e) => handleChange(f.field, e.target.value)} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
        <div className="col-md-6">
          <div className="premium-card">
            <div className="premium-card-header">
              <div className="d-flex align-items-center gap-2">
                <BiCalendar style={{ color: 'var(--primary)', fontSize: '1.2rem' }} />
                <h6 className="mb-0" style={{ fontWeight: 700 }}>Backup & Restore</h6>
              </div>
            </div>
            <div className="premium-card-body">
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Manage platform data backups</p>
              <div className="d-flex gap-2">
                <button className="btn-premium btn-premium-primary btn-premium-sm">Download Backup</button>
                <button className="btn-premium btn-premium-secondary btn-premium-sm">Restore</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GlobalSettings;