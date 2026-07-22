import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import SAPageHeader from '../../components/common/SAPageHeader';
import { BiCog, BiGlobe, BiDollar, BiCalendar, BiSave, BiRefresh } from 'react-icons/bi';

const GlobalSettings = () => {
  const { t } = useTranslation();
  const [settings, setSettings] = useState({
    companyName: '', appName: '', currency: 'INR', timezone: 'Asia/Kolkata',
    dateFormat: 'DD/MM/YYYY', taxRate: 0, taxName: 'GST',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchSettings(); }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/super-admin/settings', { _skipLoading: true });
      if (data) setSettings(prev => ({ ...prev, ...data }));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

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

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border spinner-border-sm me-2" /> {t('common.loading')}
      </div>
    );
  }

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