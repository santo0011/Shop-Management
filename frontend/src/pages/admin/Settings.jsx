import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { updateProfile } from '../../redux/slices/authSlice';
import { setTheme } from '../../redux/slices/themeSlice';
import api from '../../services/api';
import { BiSave, BiDollar, BiReceipt, BiTag, BiNote, BiStore } from 'react-icons/bi';
import { showToast } from '../../utils/toast';

const Settings = () => {
  const { t, i18n } = useTranslation();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { mode } = useSelector((state) => state.theme);
  const [form, setForm] = useState({ name: '', phone: '', language: 'bn', theme: 'light' });
  const [shopSettings, setShopSettings] = useState({
    taxRate: 0,
    taxName: 'VAT',
    receiptFooter: 'Thank you for your purchase!',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setForm({ name: user.name || '', phone: user.phone || '', language: user.language || 'bn', theme: user.theme || 'light' });
    }
    loadShopSettings();
  }, [user]);

  const loadShopSettings = async () => {
    try {
      const { data } = await api.get('/shops/my');
      const shop = data.shop || data;
      if (shop?.settings) {
        setShopSettings({
          taxRate: shop.settings.taxRate ?? 0,
          taxName: shop.settings.taxName || 'VAT',
          receiptFooter: shop.settings.receiptFooter || 'Thank you for your purchase!',
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.put('/auth/profile', form);
      dispatch(updateProfile(data));
      i18n.changeLanguage(form.language);
      dispatch(setTheme(form.theme));
      showToast.success('Profile saved!');
    } catch (err) {
      showToast.error('Failed to save profile');
    }
  };

  const handleShopSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/shops/settings', shopSettings);
      showToast.success('Shop settings saved!');
    } catch (err) {
      showToast.error('Failed to save shop settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="row g-4">
      {/* Profile Settings */}
      <div className="col-lg-6">
        <div className="table-container">
          <div className="table-header">
            <h5>Profile Settings</h5>
          </div>
          <div className="p-4">
            <form onSubmit={handleProfileSubmit}>
              <div className="mb-3">
                <label className="form-label">{t('auth.name')}</label>
                <input className="form-control" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
              </div>
              <div className="mb-3">
                <label className="form-label">{t('auth.phone')}</label>
                <input className="form-control" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
              </div>
              <div className="mb-3">
                <label className="form-label">{t('settings.language')}</label>
                <select className="form-select" value={form.language} onChange={e => setForm({...form, language: e.target.value})}>
                  <option value="bn">বাংলা</option>
                  <option value="en">English</option>
                </select>
              </div>
              <div className="mb-3">
                <label className="form-label">{t('settings.theme')}</label>
                <select className="form-select" value={form.theme} onChange={e => setForm({...form, theme: e.target.value})}>
                  <option value="light">{t('settings.light')}</option>
                  <option value="dark">{t('settings.dark')}</option>
                </select>
              </div>
              <button type="submit" className="btn-premium btn-premium-primary">
                <BiSave /> {t('common.save')}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Shop Settings */}
      <div className="col-lg-6">
        <div className="table-container">
          <div className="table-header">
            <h5><BiStore /> Shop Settings</h5>
          </div>
          <div className="p-4">
            <form onSubmit={handleShopSubmit}>
              {/* Tax Rate */}
              <div className="mb-3">
                <label className="form-label">
                  <BiTag style={{ marginRight: 4 }} /> Tax Rate (%)
                </label>
                <div className="d-flex gap-2 align-items-center">
                  <input
                    type="number"
                    className="form-control"
                    style={{ maxWidth: '120px' }}
                    value={shopSettings.taxRate}
                    onChange={e => setShopSettings({...shopSettings, taxRate: Math.max(0, Math.min(100, Number(e.target.value)))})}
                    min="0"
                    max="100"
                    step="0.5"
                  />
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>%</span>
                  <div className="d-flex gap-1 ms-2">
                    {[0, 5, 10, 15].map(val => (
                      <button
                        key={val}
                        type="button"
                        className={`btn-premium btn-premium-sm ${shopSettings.taxRate === val ? 'btn-premium-primary' : 'btn-premium-secondary'}`}
                        onClick={() => setShopSettings({...shopSettings, taxRate: val})}
                      >
                        {val === 0 ? 'No Tax' : `${val}%`}
                      </button>
                    ))}
                  </div>
                </div>
                <small style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginTop: 4, display: 'block' }}>
                  Set 0% for no tax. This will be used on all POS invoices.
                </small>
              </div>

              {/* Tax Name */}
              <div className="mb-3">
                <label className="form-label">
                  <BiDollar style={{ marginRight: 4 }} /> Tax Name
                </label>
                <input
                  className="form-control"
                  style={{ maxWidth: '200px' }}
                  value={shopSettings.taxName}
                  onChange={e => setShopSettings({...shopSettings, taxName: e.target.value})}
                  placeholder="e.g. VAT, GST, Sales Tax"
                />
              </div>

              {/* Invoice Footer */}
              <div className="mb-3">
                <label className="form-label">
                  <BiNote style={{ marginRight: 4 }} /> Invoice Footer Message
                </label>
                <textarea
                  className="form-control"
                  rows="3"
                  value={shopSettings.receiptFooter}
                  onChange={e => setShopSettings({...shopSettings, receiptFooter: e.target.value})}
                  placeholder="Thank you for shopping with us."
                />
                <small style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginTop: 4, display: 'block' }}>
                  This message will appear at the bottom of every invoice.
                </small>
              </div>

              <button type="submit" className="btn-premium btn-premium-primary" disabled={saving}>
                {saving ? <><span className="spinner-border spinner-border-sm" /> Saving...</> : <><BiSave /> Save Shop Settings</>}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;