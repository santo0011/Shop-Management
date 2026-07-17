import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { loginStart, loginSuccess, loginFailure } from '../../redux/slices/authSlice';
import { setTheme } from '../../redux/slices/themeSlice';
import api from '../../services/api';

const Login = () => {
  const { t, i18n } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error } = useSelector((state) => state.auth);

  const [form, setForm] = useState({ email: '', password: '' });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    dispatch(loginStart());

    try {
      const { data } = await api.post('/auth/login', form);
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

      if (data.role === 'super_admin') {
        navigate('/super-admin');
      } else {
        navigate('/');
      }
    } catch (err) {
      dispatch(loginFailure(err.response?.data?.message || 'Login failed'));
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="text-center mb-4">
          <h2 style={{ background: 'linear-gradient(135deg, #6C63FF, #00D9A6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {t('app.shortName')}
          </h2>
          <p className="auth-subtitle">{t('app.tagline')}</p>
        </div>

        <h4 className="text-center mb-1">{t('auth.login')}</h4>
        <p className="auth-subtitle">{t('auth.loginNow')}</p>

        {error && (
          <div className="alert alert-danger py-2">{error}</div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label">{t('auth.email')}</label>
            <input
              type="email"
              name="email"
              className="form-control"
              value={form.email}
              onChange={handleChange}
              placeholder="admin@shop.com"
              required
            />
          </div>

          <div className="mb-4">
            <label className="form-label">{t('auth.password')}</label>
            <input
              type="password"
              name="password"
              className="form-control"
              value={form.password}
              onChange={handleChange}
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary-custom w-100"
            disabled={loading}
          >
            {loading ? (
              <span className="spinner-border spinner-border-sm me-2" />
            ) : null}
            {t('auth.login')}
          </button>
        </form>

        <div className="text-center mt-3">
          <button
            className="btn btn-sm btn-outline-secondary me-2"
            onClick={() => i18n.changeLanguage('bn')}
          >
            বাংলা
          </button>
          <button
            className="btn btn-sm btn-outline-secondary"
            onClick={() => i18n.changeLanguage('en')}
          >
            English
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;