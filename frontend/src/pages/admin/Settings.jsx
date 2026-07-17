import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { updateProfile } from '../../redux/slices/authSlice';
import { setTheme } from '../../redux/slices/themeSlice';
import api from '../../services/api';

const Settings = () => {
  const { t, i18n } = useTranslation();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { mode } = useSelector((state) => state.theme);
  const [form, setForm] = useState({ name: '', phone: '', language: 'bn', theme: 'light' });

  useEffect(() => {
    if (user) {
      setForm({ name: user.name || '', phone: user.phone || '', language: user.language || 'bn', theme: user.theme || 'light' });
    }
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.put('/auth/profile', form);
      dispatch(updateProfile(data));
      i18n.changeLanguage(form.language);
      dispatch(setTheme(form.theme));
      alert('Settings saved!');
    } catch (err) {
      alert('Failed to save settings');
    }
  };

  return (
    <div className="row justify-content-center">
      <div className="col-md-6">
        <div className="glass-card p-4">
          <h5 className="mb-4">{t('nav.settings')}</h5>
          <form onSubmit={handleSubmit}>
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
            <button type="submit" className="btn btn-primary-custom">{t('common.save')}</button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Settings;