import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import api from '../../services/api';
import { BiSearch, BiPlus, BiStore, BiX, BiUser, BiPhone, BiEnvelope, BiMap, BiLock, BiCheck, BiShow, BiEdit, BiTrash, BiCalendar, BiBriefcase, BiDollar, BiTime } from 'react-icons/bi';
import { BUSINESS_TYPE_KEYS, BUSINESS_TYPES } from '../../config/businessTypes';

const REQUIRED_SHOP_FIELDS = ['shopName', 'ownerName', 'phone', 'email', 'password'];

const validateShopField = (t, name, value) => {
  switch (name) {
    case 'shopName':
      return String(value || '').trim() ? '' : t('manageShopsPage.shopNameRequired');
    case 'ownerName':
      return String(value || '').trim() ? '' : t('manageShopsPage.ownerNameRequired');
    case 'phone':
      return String(value || '').trim() ? '' : t('manageShopsPage.phoneRequired');
    case 'email':
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value || '') ? '' : t('auth.invalidEmail');
    case 'password':
      return value && value.length >= 6 ? '' : t('auth.passwordMinLength');
    case 'address':
      return '';
    default:
      return '';
  }
};

const AddShopDrawer = ({ open, onClose, onSuccess }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState({
    shopName: '',
    ownerName: '',
    email: '',
    phone: '',
    password: '',
    address: '',
    businessType: 'grocery',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => {
      if (!(name in prev)) return prev;
      const msg = validateShopField(t, name, value);
      const next = { ...prev };
      if (msg) next[name] = msg; else delete next[name];
      return next;
    });
    if (error) setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};
    REQUIRED_SHOP_FIELDS.forEach((field) => {
      const msg = validateShopField(t, field, form[field]);
      if (msg) newErrors[field] = msg;
    });
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await api.post('/shops', {
        name: form.shopName,
        ownerName: form.ownerName,
        email: form.email,
        phone: form.phone,
        password: form.password,
        address: form.address,
        businessType: form.businessType,
      }, { _skipLoading: true });
      setForm({ shopName: '', ownerName: '', email: '', phone: '', password: '', address: '', businessType: 'grocery' });
      setErrors({});
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || t('manageShopsPage.createShopFailed'));
    } finally {
      setLoading(false);
    }
  };

  const field = (name) => ({
    className: `form-control ${errors[name] ? 'is-invalid' : ''}`,
    name,
    value: form[name],
    onChange: handleChange,
    placeholder: getPlaceholder(name),
  });

  function getPlaceholder(name) {
    switch (name) {
      case 'shopName': return t('manageShopsPage.shopNamePlaceholder');
      case 'ownerName': return t('manageShopsPage.ownerNamePlaceholder');
      case 'phone': return t('manageShopsPage.phonePlaceholder');
      case 'email': return t('manageShopsPage.emailPlaceholder');
      case 'password': return t('manageShopsPage.setPasswordPlaceholder');
      case 'address': return t('manageShopsPage.addressPlaceholder');
      default: return '';
    }
  }

  return (
    <>
      <div className={`drawer-overlay ${open ? 'open' : ''}`} onClick={onClose} />
      <div className={`drawer ${open ? 'open' : ''}`}>
        <div className="drawer-header">
          <h5><BiStore style={{ marginRight: '8px', color: 'var(--primary)' }} />{t('manageShopsPage.addNewShop')}</h5>
          <button className="btn-close-premium" onClick={onClose}><BiX /></button>
        </div>
        <div className="drawer-body">
          {error && (
            <div style={{
              padding: '0.75rem 1rem',
              borderRadius: 'var(--border-radius-md)',
              background: 'var(--glow-danger)',
              color: 'var(--danger)',
              fontWeight: 500,
              marginBottom: '1.25rem',
              fontSize: '0.85rem',
            }}>
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} id="add-shop-form" noValidate>
            <div className="form-group">
              <label className="form-label"><BiStore style={{ marginRight: '6px' }} />{t('manageShopsPage.shopName')} <span style={{color: 'var(--danger)'}}>*</span></label>
              <input {...field('shopName')} />
              {errors.shopName && <div className="invalid-feedback-premium">{errors.shopName}</div>}
            </div>
            <div className="form-group">
              <label className="form-label"><BiBriefcase style={{ marginRight: '6px' }} />{t('manageShopsPage.businessType')} <span style={{color: 'var(--danger)'}}>*</span></label>
              <select className="form-select" name="businessType" value={form.businessType} onChange={handleChange}>
                {BUSINESS_TYPE_KEYS.map((key) => (
                  <option key={key} value={key}>{t(BUSINESS_TYPES[key].i18nKey)}</option>
                ))}
              </select>
              <small style={{ color: 'var(--text-muted)' }}>{t('manageShopsPage.businessTypeHint')}</small>
            </div>
            <div className="form-group">
              <label className="form-label"><BiUser style={{ marginRight: '6px' }} />{t('manageShopsPage.ownerName')} <span style={{color: 'var(--danger)'}}>*</span></label>
              <input {...field('ownerName')} />
              {errors.ownerName && <div className="invalid-feedback-premium">{errors.ownerName}</div>}
            </div>
            <div className="row g-3">
              <div className="col-md-6">
                <div className="form-group">
                  <label className="form-label"><BiPhone style={{ marginRight: '6px' }} />{t('auth.phone')} <span style={{color: 'var(--danger)'}}>*</span></label>
                  <input type="tel" {...field('phone')} />
                  {errors.phone && <div className="invalid-feedback-premium">{errors.phone}</div>}
                </div>
              </div>
              <div className="col-md-6">
                <div className="form-group">
                  <label className="form-label"><BiEnvelope style={{ marginRight: '6px' }} />{t('auth.email')} <span style={{color: 'var(--danger)'}}>*</span></label>
                  <input type="email" {...field('email')} />
                  {errors.email && <div className="invalid-feedback-premium">{errors.email}</div>}
                </div>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label"><BiLock style={{ marginRight: '6px' }} />{t('auth.password')} <span style={{color: 'var(--danger)'}}>*</span></label>
              <input type="password" {...field('password')} />
              {errors.password && <div className="invalid-feedback-premium">{errors.password}</div>}
            </div>
            <div className="form-group">
              <label className="form-label"><BiMap style={{ marginRight: '6px' }} />{t('manageShopsPage.address')}</label>
              <textarea className={`form-control ${errors.address ? 'is-invalid' : ''}`} name="address" value={form.address} onChange={handleChange} placeholder={t('manageShopsPage.addressPlaceholder')} rows={3} />
              {errors.address && <div className="invalid-feedback-premium">{errors.address}</div>}
            </div>
          </form>
        </div>
        <div className="drawer-footer">
          <button type="button" className="btn-premium btn-premium-secondary" onClick={onClose}>{t('common.cancel')}</button>
          <button type="submit" form="add-shop-form" className="btn-premium btn-premium-primary" disabled={loading}>
            {loading ? <><span className="spinner-border spinner-border-sm" /> {t('manageShopsPage.creating')}</> : <><BiCheck /> {t('manageShopsPage.createShop')}</>}
          </button>
        </div>
      </div>
    </>
  );
};

// Helper to safely render address regardless of format (string or object)
const safeAddress = (addr, t) => {
  if (!addr) return t('common.notAvailable');
  if (typeof addr === 'string') return addr;
  // It's an object
  if (addr.street || addr.city || addr.state || addr.zipCode || addr.country) {
    const parts = [];
    if (addr.street) parts.push(addr.street);
    if (addr.city) parts.push(addr.city);
    if (addr.state) parts.push(addr.state);
    if (addr.country) {
      if (typeof addr.country === 'string') parts.push(addr.country);
      else if (addr.country?.name) parts.push(addr.country.name);
      else if (addr.country?.label) parts.push(addr.country.label);
      else if (addr.country?.value) parts.push(addr.country.value);
    }
    if (addr.zipCode) parts.push(addr.zipCode);
    return parts.length > 0 ? parts.join(', ') : t('common.notAvailable');
  }
  // Corrupted object (e.g. from old bug where string was spread into object)
  const values = Object.values(addr).filter(v => typeof v === 'string');
  return values.length > 0 ? values.join('') : t('common.notAvailable');
};

// Format date
const formatDate = (date) => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

// Format currency
const formatCurrency = (amount) => {
  if (!amount && amount !== 0) return '₹0';
  return '₹' + Number(amount).toLocaleString('en-IN', { maximumFractionDigits: 0 });
};

// ─── Skeleton Loader ──────────────────────────────────────────
const ManageShopsSkeletonLoader = () => (
  <div>
    <style>{`@keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }`}</style>
    {/* Page Header */}
    <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
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
      <div style={{
        height: 36, width: 130,
        background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
        backgroundSize: '200% 100%', borderRadius: 8,
        animation: 'shimmer 1.5s infinite',
      }} />
    </div>

    {/* Search skeleton */}
    <div className="list-filters-card mb-3">
      <div style={{
        height: 36, width: 280,
        background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
        backgroundSize: '200% 100%', borderRadius: 8,
        animation: 'shimmer 1.5s infinite',
      }} />
    </div>

    {/* Table skeleton */}
    <div className="table-container" style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-lg)', overflow: 'hidden', background: 'var(--bg-card)' }}>
      <div style={{ display: 'flex', padding: '0.85rem 1rem', background: 'var(--bg-input)', borderBottom: '1px solid var(--border-color)', gap: '1rem' }}>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} style={{
            flex: 1, height: 12,
            background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
            backgroundSize: '200% 100%', borderRadius: 4,
            animation: 'shimmer 1.5s infinite',
          }} />
        ))}
      </div>
      {[1, 2, 3, 4, 5].map((r) => (
        <div key={r} style={{
          display: 'flex', padding: '0.75rem 1rem', gap: '1rem',
          borderTop: '1px solid var(--border-color)',
        }}>
          {[1, 2, 3, 4, 5].map((c) => (
            <div key={c} style={{
              flex: 1, height: 10,
              background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
              backgroundSize: '200% 100%', borderRadius: 4,
              animation: 'shimmer 1.5s infinite',
            }} />
          ))}
        </div>
      ))}
    </div>
  </div>
);

// ─── Inline Table Skeleton Rows ──────────────────────────────
const TableSkeletonRows = ({ columns = 5 }) => (
  <>
    {[1, 2, 3, 4].map((r) => (
      <tr key={r} style={{ opacity: 0.5 }}>
        {[1, 2, 3, 4, 5].map((c) => (
          <td key={c} style={{ padding: '0.75rem 1rem' }}>
            <div style={{
              height: 10, width: c === 1 ? 100 : c === 5 ? 120 : '35%',
              background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
              backgroundSize: '200% 100%', borderRadius: 4,
              animation: 'shimmer 1.5s infinite',
            }} />
          </td>
        ))}
      </tr>
    ))}
  </>
);

// ─── Shop Details Drawer Skeleton ────────────────────────────
const shimmerStyle = (height, width = '100%', mb = 0) => ({
  height,
  width,
  marginBottom: mb,
  background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
  backgroundSize: '200% 100%',
  borderRadius: 6,
  animation: 'shimmer 1.5s infinite',
});

const shimmerCircle = (size) => ({
  width: size,
  height: size,
  borderRadius: '50%',
  background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
  backgroundSize: '200% 100%',
  animation: 'shimmer 1.5s infinite',
});

const shimmerBadge = (width) => ({
  height: 20,
  width,
  borderRadius: 20,
  background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
  backgroundSize: '200% 100%',
  animation: 'shimmer 1.5s infinite',
});

const shimmerRow = (hasIcon = true) => (
  <div key={Math.random()} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
    {hasIcon && <div style={shimmerCircle(34)} />}
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={shimmerStyle(8, '40%', 6)} />
      <div style={shimmerStyle(12, '70%')} />
    </div>
  </div>
);

const SectionSkeleton = ({ icon = true, rows = 3 }) => (
  <div className="premium-card" style={{ border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-card)' }}>
    <div style={{
      padding: '0.75rem 1.25rem',
      borderBottom: '1px solid var(--border-color)',
      display: 'flex', alignItems: 'center', gap: '8px',
    }}>
      {icon && <div style={shimmerCircle(14)} />}
      <div style={shimmerStyle(10, '50%')} />
    </div>
    <div style={{ padding: '1rem 1.25rem' }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: i < rows - 1 ? '12px' : 0 }}>
          <div style={shimmerCircle(34)} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={shimmerStyle(8, '35%', 5)} />
            <div style={shimmerStyle(12, '65%')} />
          </div>
        </div>
      ))}
    </div>
  </div>
);

const ShopDetailsSkeleton = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
    {/* Hero banner skeleton */}
    <div style={{
      background: 'linear-gradient(135deg, rgba(108, 99, 255, 0.06), rgba(0, 217, 166, 0.04))',
      borderRadius: 'var(--border-radius-lg)',
      padding: '1.5rem',
      textAlign: 'center',
      border: '1px solid var(--border-color)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
        <div style={shimmerCircle(72)} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.75rem' }}>
        <div style={shimmerStyle(20, '160px')} />
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
        <div style={shimmerBadge('80px')} />
        <div style={shimmerBadge('100px')} />
      </div>
    </div>

    {/* Info section skeletons */}
    <SectionSkeleton rows={4} />
    <SectionSkeleton rows={2} />
    <SectionSkeleton rows={1} />
    <SectionSkeleton rows={2} />

    {/* Subscription history skeleton */}
    <div className="premium-card" style={{ border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-card)' }}>
      <div style={{
        padding: '0.75rem 1.25rem',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex', alignItems: 'center', gap: '8px',
      }}>
        <div style={shimmerCircle(14)} />
        <div style={shimmerStyle(10, '45%')} />
      </div>
      <div style={{ padding: '1rem 1.25rem' }}>
        {[1, 2, 3].map((r) => (
          <div key={r} style={{
            display: 'flex', alignItems: 'flex-start', gap: '12px',
            padding: '0.75rem',
            borderRadius: 'var(--border-radius-md)',
            background: 'var(--bg-primary)',
            border: '1px solid var(--border-light)',
            marginBottom: r < 3 ? '0.75rem' : 0,
          }}>
            <div style={shimmerCircle(8)} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <div style={shimmerStyle(12, '50%')} />
                <div style={shimmerBadge('60px')} />
              </div>
              <div style={shimmerStyle(8, '80%', 4)} />
              <div style={shimmerStyle(8, '60%')} />
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const ManageShops = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const [shops, setShops] = useState([]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const isFirstLoad = useRef(true);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Auto-open drawer when navigated from "Add Shop" sidebar link
  useEffect(() => {
    if (location.state?.openAddShopDrawer) {
      setDrawerOpen(true);
      // Clear the state so it doesn't re-open on re-render
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const fetchShops = useCallback(async () => {
    if (isFirstLoad.current) {
      setInitialLoading(true);
    } else {
      setSearching(true);
    }
    try {
      const { data } = await api.get(`/shops?search=${debouncedSearch}`, { _skipLoading: true });
      setShops(data.shops || []);
    } catch (err) {
      console.error(err);
    } finally {
      if (isFirstLoad.current) setInitialLoading(false);
      else setSearching(false);
      isFirstLoad.current = false;
    }
  }, [debouncedSearch]);

  useEffect(() => {
    fetchShops();
  }, [fetchShops]);

  const [viewShop, setViewShop] = useState(null);
  const [viewShopLoading, setViewShopLoading] = useState(false);
  const [viewShopData, setViewShopData] = useState(null);
  const [viewShopError, setViewShopError] = useState(null);
  const [subscriptionHistory, setSubscriptionHistory] = useState([]);
  const [editShop, setEditShop] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const handleViewShop = async (shop) => {
    setViewShop(shop);
    setViewShopLoading(true);
    setViewShopData(null);
    setViewShopError(null);
    setSubscriptionHistory([]);
    try {
      const { data } = await api.get(`/shops/${shop._id}`, { _skipLoading: true });
      setViewShopData(data);
      // Fetch subscription history in parallel
      api.get(`/subscription/history?shopId=${shop._id}&limit=50`, { _skipLoading: true })
        .then((res) => setSubscriptionHistory(res.data.subscriptions || []))
        .catch(() => setSubscriptionHistory([]));
    } catch (err) {
      setViewShopError(err.response?.data?.message || t('manageShopsPage.loadShopDetailsFailed'));
    } finally {
      setViewShopLoading(false);
    }
  };

  const toggleStatus = async (id) => {
    try {
      await api.put(`/shops/${id}/toggle-status`, {}, { _skipLoading: true });
      fetchShops();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/shops/${id}`, { _skipLoading: true });
      setDeleteConfirm(null);
      fetchShops();
    } catch (err) {
      console.error(err);
    }
  };

  if (initialLoading) return <ManageShopsSkeletonLoader />;

  return (
    <div>
      {/* Page Header */}
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h4 className="mb-1" style={{ fontWeight: 800 }}>{t('nav.shops')}</h4>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
            {t('manageShopsPage.subtitle')}
          </p>
        </div>
        <button className="btn-premium btn-premium-primary" onClick={() => setDrawerOpen(true)}>
          <BiPlus /> {t('manageShopsPage.addShop')}
        </button>
      </div>

      {/* Search — consistent filter card style */}
      <div className="list-filters-card mb-3">
        <div className="list-filter-field list-search-field">
          <div className="search-box">
            <BiSearch className="search-icon" />
            <input
              className="form-control list-filter-input"
              placeholder={t('manageShopsPage.searchShopsPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Shops Table */}
      <div className={`table-container ${searching ? 'is-refreshing' : 'content-visible'}`}>
        <div className="table-responsive">
          <table className="table-custom mb-0">
            <thead>
              <tr>
                <th>{t('manageShopsPage.shop')}</th>
                <th>{t('manageShopsPage.owner')}</th>
                <th>{t('manageShopsPage.contact')}</th>
                <th>{t('common.status')}</th>
                <th style={{ width: '180px' }}>{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {searching ? (
                <TableSkeletonRows columns={5} />
              ) : shops.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-5" style={{ color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem', opacity: 0.5 }}>🏪</div>
                    {t('manageShopsPage.noShopsFound')}
                  </td>
                </tr>
              ) : shops.map((shop) => (
                <tr key={shop._id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{shop.name}</div>
                    <small style={{ color: 'var(--text-muted)' }}>{shop.nameBn || ''}</small>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <BiUser style={{ color: 'var(--text-muted)' }} />
                      {shop.owner?.name || shop.ownerName || t('common.notAvailable')}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontSize: '0.85rem' }}>{shop.email}</div>
                    <small style={{ color: 'var(--text-muted)' }}>{shop.phone}</small>
                  </td>
                  <td>
                    <span className={`badge ${shop.isActive ? 'badge-success' : 'badge-danger'}`}>
                      {shop.isActive ? t('common.active') : t('common.inactive')}
                    </span>
                  </td>
                  <td>
                    <div className="d-flex gap-1">
                      <button className="btn-action btn-action-view" data-tooltip={t('manageShopsPage.viewDetails')} onClick={() => handleViewShop(shop)}>
                        <BiShow />
                      </button>
                      <button className="btn-action btn-action-edit" data-tooltip={t('common.edit')} onClick={() => setEditShop(shop)}>
                        <BiEdit />
                      </button>
                      <button
                        className={`btn-action ${shop.isActive ? 'btn-action-toggle active' : 'btn-action-toggle'}`}
                        data-tooltip={shop.isActive ? t('manageShopsPage.deactivate') : t('manageShopsPage.activate')}
                        onClick={() => toggleStatus(shop._id)}
                      >
                        <BiLock />
                      </button>
                      <button className="btn-action btn-action-delete" data-tooltip={t('common.delete')} onClick={() => setDeleteConfirm(shop._id)}>
                        <BiTrash />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Shop Drawer */}
      <AddShopDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSuccess={fetchShops}
      />

      {/* View Shop Details Drawer - Premium Redesign */}
      <div className={`drawer-overlay ${viewShop ? 'open' : ''}`} onClick={() => { setViewShop(null); setViewShopData(null); setSubscriptionHistory([]); }} />
      <div className={`drawer ${viewShop ? 'open' : ''}`}>
        <div className="drawer-header">
          <h5 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BiStore style={{ color: 'var(--primary)' }} />
            {t('manageShopsPage.shopDetails')}
          </h5>
          <button className="btn-close-premium" onClick={() => { setViewShop(null); setViewShopData(null); setSubscriptionHistory([]); }}><BiX /></button>
        </div>
        <div className="drawer-body">
          {viewShopLoading ? (
            <ShopDetailsSkeleton />
          ) : viewShopError ? (
            <div style={{
              padding: '1rem',
              borderRadius: 'var(--border-radius-md)',
              background: 'var(--glow-danger)',
              color: 'var(--danger)',
              fontWeight: 500,
              fontSize: '0.85rem',
              textAlign: 'center',
            }}>
              {viewShopError}
            </div>
          ) : viewShopData ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* ========== HERO BANNER ========== */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(108, 99, 255, 0.12), rgba(0, 217, 166, 0.08))',
                borderRadius: 'var(--border-radius-lg)',
                padding: '1.5rem',
                textAlign: 'center',
                border: '1px solid var(--border-color)',
                position: 'relative',
                overflow: 'hidden',
              }}>
                <div style={{
                  position: 'absolute', top: '-30%', right: '-20%',
                  width: '140px', height: '140px',
                  borderRadius: '50%',
                  background: 'rgba(108, 99, 255, 0.08)',
                  pointerEvents: 'none',
                }} />
                <div style={{
                  width: '72px', height: '72px', borderRadius: '18px',
                  background: 'var(--gradient-primary)',
                  color: '#fff', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: '1.8rem', fontWeight: 700,
                  margin: '0 auto 1rem', boxShadow: '0 4px 15px rgba(108, 99, 255, 0.3)',
                }}>
                  {(viewShopData.name || 'S').charAt(0).toUpperCase()}
                </div>
                <h5 style={{ fontWeight: 700, margin: '0 0 0.5rem' }}>{viewShopData.name}</h5>
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                  <span className={`badge ${viewShopData.isActive ? 'badge-success' : 'badge-danger'}`}>
                    {viewShopData.isActive ? `● ${t('common.active')}` : `● ${t('common.inactive')}`}
                  </span>
                  <span className={`badge ${viewShopData.subscriptionStatus === 'active' ? 'badge-success' : viewShopData.subscriptionStatus === 'trial' ? 'badge-warning' : 'badge-danger'}`}>
                    {viewShopData.subscriptionStatus === 'active' ? `◉ ${t('manageShopsPage.subscribed')}` : viewShopData.subscriptionStatus === 'trial' ? `◉ ${t('subscription.trial')}` : `◉ ${t('manageShopsPage.expired')}`}
                  </span>
                </div>
              </div>

              {/* ========== INFORMATION SECTIONS (single column, no overflow) ========== */}
              {[
                { key: 'shop', icon: BiStore, color: 'var(--primary)', glow: 'var(--glow-primary)', title: t('manageShopsPage.shopInformation'), rows: [
                  { icon: BiStore, label: t('manageShopsPage.shopName'), value: viewShopData.name },
                  { icon: BiBriefcase, label: t('manageShopsPage.businessType'), value: t(BUSINESS_TYPES[viewShopData.businessType]?.i18nKey || BUSINESS_TYPES.grocery.i18nKey) },
                  { icon: BiPhone, label: t('auth.phone'), value: viewShopData.phone || t('common.notAvailable') },
                  { icon: BiEnvelope, label: t('auth.email'), value: viewShopData.email || t('common.notAvailable') },
                ]},
                { key: 'owner', icon: BiUser, color: 'var(--secondary)', glow: 'var(--glow-secondary)', title: t('manageShopsPage.ownerInformation'), rows: [
                  { icon: BiUser, label: t('common.name'), value: viewShopData.owner?.name || t('common.notAvailable') },
                  { icon: BiEnvelope, label: t('auth.email'), value: viewShopData.owner?.email || t('common.notAvailable') },
                ]},
                { key: 'address', icon: BiMap, color: 'var(--info)', glow: 'var(--glow-info)', title: t('manageShopsPage.addressInformation'), rows: [
                  { icon: BiMap, label: t('manageShopsPage.address'), value: safeAddress(viewShopData.address, t) },
                ]},
                { key: 'system', icon: BiCalendar, color: 'var(--text-muted)', glow: 'var(--bg-input)', title: t('manageShopsPage.systemInformation'), rows: [
                  { icon: BiCalendar, label: t('manageShopsPage.created'), value: new Date(viewShopData.createdAt).toLocaleDateString() },
                  { icon: BiCalendar, label: t('manageShopsPage.updated'), value: new Date(viewShopData.updatedAt).toLocaleDateString() },
                ]},
              ].map((section, si) => (
                <div key={si} className="premium-card" style={{ border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-card)' }}>
                  <div style={{
                    padding: '0.75rem 1.25rem',
                    borderBottom: '1px solid var(--border-color)',
                    display: 'flex', alignItems: 'center', gap: '8px',
                    fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)',
                    textTransform: 'uppercase', letterSpacing: '0.5px',
                  }}>
                    <section.icon style={{ color: section.color, flexShrink: 0 }} /> {section.title}
                  </div>
                  <div style={{ padding: '1rem 1.25rem' }}>
                    {section.rows.map((row, ri) => (
                      <div key={ri} style={{
                        display: 'flex', alignItems: 'center', gap: '12px',
                        marginBottom: ri < section.rows.length - 1 ? '12px' : 0,
                      }}>
                        <div style={{
                          width: '34px', height: '34px', borderRadius: '10px',
                          background: section.glow, color: section.color,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '0.95rem', flexShrink: 0, flex: '0 0 34px',
                        }}>
                          <row.icon />
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: '1px' }}>{row.label}</div>
                          <div style={{ fontWeight: 600, fontSize: '0.88rem', wordBreak: 'break-word', overflowWrap: 'break-word' }}>{row.value}</div>
                        </div>
                      </div>
                    ))}
                    {section.key === 'address' && viewShopData.subscriptionStatus && (
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: '12px',
                        marginTop: '12px', paddingTop: '12px',
                        borderTop: '1px solid var(--border-light)',
                      }}>
                        <div style={{
                          width: '34px', height: '34px', borderRadius: '10px',
                          background: 'var(--glow-warning)', color: 'var(--warning)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '0.95rem', flexShrink: 0, flex: '0 0 34px',
                        }}>
                          <BiLock />
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: '1px' }}>{t('manageShopsPage.subscription')}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span className={`badge ${viewShopData.subscriptionStatus === 'active' ? 'badge-success' : viewShopData.subscriptionStatus === 'trial' ? 'badge-warning' : 'badge-danger'}`} style={{ fontSize: '0.75rem' }}>
                              {viewShopData.subscriptionStatus === 'active' ? t('manageShopsPage.subscribed') : viewShopData.subscriptionStatus === 'trial' ? t('subscription.trial') : t('manageShopsPage.expired')}
                            </span>
                            {viewShopData.trialEndsAt && (
                              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                {t('manageShopsPage.trialEndsPrefix', { date: new Date(viewShopData.trialEndsAt).toLocaleDateString() })}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* ========== SUBSCRIPTION HISTORY SECTION ========== */}
              <div className="premium-card" style={{ border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-card)' }}>
                <div style={{
                  padding: '0.75rem 1.25rem',
                  borderBottom: '1px solid var(--border-color)',
                  display: 'flex', alignItems: 'center', gap: '8px',
                  fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)',
                  textTransform: 'uppercase', letterSpacing: '0.5px',
                }}>
                  <BiTime style={{ color: 'var(--primary)', flexShrink: 0 }} /> {t('manageShopsPage.subscriptionHistory')}
                  {subscriptionHistory.length > 0 && (
                    <span style={{ marginLeft: 'auto', fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                      {subscriptionHistory.length} records
                    </span>
                  )}
                </div>
                <div style={{ padding: '1rem 1.25rem' }}>
                  {subscriptionHistory.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '1.5rem 0', color: 'var(--text-muted)' }}>
                      <div style={{ fontSize: '2rem', marginBottom: '0.5rem', opacity: 0.4 }}>📋</div>
                      <div style={{ fontSize: '0.82rem' }}>{t('manageShopsPage.noSubscriptionHistory')}</div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {subscriptionHistory.map((sub, idx) => (
                        <div key={sub._id || idx} style={{
                          display: 'flex', alignItems: 'flex-start', gap: '12px',
                          padding: '0.75rem',
                          borderRadius: 'var(--border-radius-md)',
                          background: 'var(--bg-primary)',
                          border: '1px solid var(--border-light)',
                        }}>
                          <div style={{
                            width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0, marginTop: '6px',
                            background: sub.status === 'active' ? 'var(--secondary)' :
                                        sub.status === 'queued' ? 'var(--primary)' :
                                        sub.status === 'cancelled' ? 'var(--danger)' : 'var(--text-muted)',
                          }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '4px' }}>
                              <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{sub.plan?.name || 'Unknown Plan'}</div>
                              <span className={`badge ${
                                sub.status === 'active' ? 'badge-success' :
                                sub.status === 'queued' ? 'badge-primary' :
                                sub.status === 'cancelled' ? 'badge-danger' : 'badge-danger'
                              }`} style={{ fontSize: '0.68rem', flexShrink: 0 }}>
                                {sub.status.charAt(0).toUpperCase() + sub.status.slice(1)}
                              </span>
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem 1rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                              <span><BiDollar style={{ verticalAlign: 'middle', marginRight: 2 }} />{formatCurrency(sub.totalAmount || sub.amount)}</span>
                              <span><BiCalendar style={{ verticalAlign: 'middle', marginRight: 2 }} />{formatDate(sub.startDate)} - {formatDate(sub.endDate)}</span>
                              {sub.duration && <span><BiTime style={{ verticalAlign: 'middle', marginRight: 2 }} />{sub.duration}</span>}
                              {sub.assignedBy?.name && (
                                <span><BiUser style={{ verticalAlign: 'middle', marginRight: 2 }} />{sub.assignedBy.name}</span>
                              )}
                              {sub.createdAt && (
                                <span><BiCalendar style={{ verticalAlign: 'middle', marginRight: 2 }} />{t('manageShopsPage.assignedOn')} {formatDate(sub.createdAt)}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Edit Shop Details Modal */}
      <EditShopDrawer
        open={!!editShop}
        shop={editShop}
        onClose={() => setEditShop(null)}
        onSuccess={() => { fetchShops(); setEditShop(null); }}
      />

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="modal-premium" onClick={() => setDeleteConfirm(null)}>
          <div className="modal-premium-content" style={{ maxWidth: '420px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-premium-header">
              <h5>{t('manageShopsPage.deleteShopTitle')}</h5>
              <button className="btn-close-premium" onClick={() => setDeleteConfirm(null)}><BiX /></button>
            </div>
            <div className="modal-premium-body text-center">
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--glow-danger)', color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', margin: '0 auto 1.25rem' }}><BiTrash /></div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>{t('manageShopsPage.deleteShopMessage')}</p>
            </div>
            <div className="modal-premium-footer" style={{ justifyContent: 'center' }}>
              <button className="btn-premium btn-premium-secondary" onClick={() => setDeleteConfirm(null)}>{t('common.cancel')}</button>
              <button className="btn-premium btn-premium-danger" onClick={() => handleDelete(deleteConfirm)}>{t('common.delete')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const EditShopDrawer = ({ open, shop, onClose, onSuccess }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [errors, setErrors] = useState({});
  const [businessTypeLocked, setBusinessTypeLocked] = useState(false);
  const [form, setForm] = useState({
    shopName: '',
    ownerName: '',
    email: '',
    phone: '',
    address: '',
    businessType: 'grocery',
  });

  // The shop row passed in from the list doesn't include productCount —
  // fetch the live detail on open so the Business Type picker can be locked
  // upfront instead of only failing after a submit attempt.
  useEffect(() => {
    if (!open || !shop?._id) return;
    setBusinessTypeLocked(false);
    api.get(`/shops/${shop._id}`, { _skipLoading: true })
      .then(({ data }) => setBusinessTypeLocked((data.productCount || 0) > 0))
      .catch(() => {});
  }, [open, shop?._id]);

  // Convert address object to a comma-separated string for the textarea
  const formatAddress = (addr) => {
    if (!addr) return '';
    if (typeof addr === 'string') return addr;
    // Handle address object
    if (typeof addr === 'object') {
      // Check if it has expected address fields
      if (addr.street || addr.city || addr.state || addr.zipCode || addr.country) {
        const parts = [];
        if (addr.street) parts.push(addr.street);
        if (addr.city) parts.push(addr.city);
        if (addr.state) parts.push(addr.state);
        if (addr.zipCode) parts.push(addr.zipCode);
        if (addr.country) {
          if (typeof addr.country === 'string') parts.push(addr.country);
          else if (addr.country?.name) parts.push(addr.country.name);
          else if (addr.country?.label) parts.push(addr.country.label);
        }
        return parts.join(', ');
      }
      // Corrupted object (from old bug where string was spread into object, 
      // e.g. { ...shop.address, ..."Dhaka" } -> { '0': 'D', '1': 'h', ... })
      // Collect all string values and join them to reconstruct the original string
      const strValues = Object.values(addr).filter(v => typeof v === 'string');
      if (strValues.length > 0) {
        // Try joining - if it was a spread string, they'll form the original text
        const joined = strValues.join('');
        if (joined.length > 0) return joined;
      }
    }
    return '';
  };

  // Convert comma-separated string back to address object for the API
  const parseAddress = (str) => {
    if (!str || typeof str !== 'string') return str;
    const parts = str.split(',').map(s => s.trim()).filter(Boolean);
    return {
      street: parts[0] || '',
      city: parts[1] || '',
      state: parts[2] || '',
      zipCode: parts[3] || '',
      country: parts[4] || 'India',
    };
  };

  useEffect(() => {
    if (shop) {
      setForm({
        shopName: shop.name || '',
        // shop.ownerName from list, or shop.owner?.name from populated detail
        ownerName: shop.ownerName || shop.owner?.name || '',
        email: shop.email || '',
        phone: shop.phone || '',
        address: formatAddress(shop.address),
        businessType: shop.businessType || 'grocery',
      });
      setErrors({});
      setError(null);
    }
  }, [shop]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => {
      if (!(name in prev)) return prev;
      const msg = name === 'email'
        ? (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value || '') ? '' : t('auth.invalidEmail'))
        : (String(value || '').trim() ? '' : (name === 'shopName' ? t('manageShopsPage.shopNameRequired') : name === 'ownerName' ? t('manageShopsPage.ownerNameRequired') : t('validation.fieldRequired')));
      const next = { ...prev };
      if (msg) next[name] = msg; else delete next[name];
      return next;
    });
    if (error) setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const fields = ['shopName', 'ownerName', 'email', 'phone'];
    const newErrors = {};
    fields.forEach((field) => {
      const msg = field === 'email'
        ? (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form[field] || '') ? '' : t('auth.invalidEmail'))
        : (String(form[field] || '').trim() ? '' : (field === 'shopName' ? t('manageShopsPage.shopNameRequired') : field === 'ownerName' ? t('manageShopsPage.ownerNameRequired') : t('validation.fieldRequired')));
      if (msg) newErrors[field] = msg;
    });
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await api.put(`/shops/${shop._id}`, {
        name: form.shopName,
        ownerName: form.ownerName,
        email: form.email,
        phone: form.phone,
        address: form.address,
        businessType: form.businessType,
      }, { _skipLoading: true });
      onSuccess();
    } catch (err) {
      if (err.response?.data?.code === 'BUSINESS_TYPE_LOCKED') {
        // Defensive: keeps the UI in sync even if it hadn't already disabled
        // the picker (e.g. a product was added moments before this submit).
        setBusinessTypeLocked(true);
        setError(t('manageShopsPage.businessTypeLocked'));
      } else {
        setError(err.response?.data?.message || t('manageShopsPage.updateShopFailed'));
      }
    } finally {
      setLoading(false);
    }
  };

  const field = (name) => ({
    className: `form-control ${errors[name] ? 'is-invalid' : ''}`,
    name,
    value: form[name],
    onChange: handleChange,
    placeholder: name === 'shopName' ? t('manageShopsPage.shopNamePlaceholder') : name === 'ownerName' ? t('manageShopsPage.ownerNamePlaceholder') : name === 'phone' ? t('manageShopsPage.phonePlaceholder') : name === 'email' ? t('manageShopsPage.emailPlaceholder') : '',
  });

  return (
    <>
      <div className={`drawer-overlay ${open ? 'open' : ''}`} onClick={onClose} />
      <div className={`drawer ${open ? 'open' : ''}`}>
        <div className="drawer-header">
          <h5><BiStore style={{ marginRight: '8px', color: 'var(--primary)' }} />{t('manageShopsPage.editShopTitle')}</h5>
          <button className="btn-close-premium" onClick={onClose}><BiX /></button>
        </div>
        <div className="drawer-body">
          {error && (
            <div style={{
              padding: '0.75rem 1rem',
              borderRadius: 'var(--border-radius-md)',
              background: 'var(--glow-danger)',
              color: 'var(--danger)',
              fontWeight: 500,
              marginBottom: '1.25rem',
              fontSize: '0.85rem',
            }}>
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} id="edit-shop-form" noValidate>
            <div className="form-group">
              <label className="form-label"><BiStore style={{ marginRight: '6px' }} />{t('manageShopsPage.shopName')} <span style={{color: 'var(--danger)'}}>*</span></label>
              <input {...field('shopName')} />
              {errors.shopName && <div className="invalid-feedback-premium">{errors.shopName}</div>}
            </div>
            <div className="form-group">
              <label className="form-label"><BiBriefcase style={{ marginRight: '6px' }} />{t('manageShopsPage.businessType')} <span style={{color: 'var(--danger)'}}>*</span></label>
              <select className="form-select" name="businessType" value={form.businessType} onChange={handleChange} disabled={businessTypeLocked}>
                {BUSINESS_TYPE_KEYS.map((key) => (
                  <option key={key} value={key}>{t(BUSINESS_TYPES[key].i18nKey)}</option>
                ))}
              </select>
              {businessTypeLocked && (
                <div style={{
                  display: 'flex', alignItems: 'flex-start', gap: '6px',
                  padding: '0.5rem 0.7rem', marginTop: '0.4rem',
                  borderRadius: 'var(--border-radius-sm)',
                  background: 'var(--glow-danger)', color: 'var(--danger)',
                  fontSize: '0.75rem', fontWeight: 500,
                }}>
                  <BiLock style={{ flexShrink: 0, marginTop: '2px' }} /> {t('manageShopsPage.businessTypeLocked')}
                </div>
              )}
            </div>
            <div className="form-group">
              <label className="form-label"><BiUser style={{ marginRight: '6px' }} />{t('manageShopsPage.ownerName')} <span style={{color: 'var(--danger)'}}>*</span></label>
              <input {...field('ownerName')} />
              {errors.ownerName && <div className="invalid-feedback-premium">{errors.ownerName}</div>}
            </div>
            <div className="row g-3">
              <div className="col-md-6">
                <div className="form-group">
                  <label className="form-label"><BiPhone style={{ marginRight: '6px' }} />{t('auth.phone')} <span style={{color: 'var(--danger)'}}>*</span></label>
                  <input type="tel" {...field('phone')} />
                  {errors.phone && <div className="invalid-feedback-premium">{errors.phone}</div>}
                </div>
              </div>
              <div className="col-md-6">
                <div className="form-group">
                  <label className="form-label"><BiEnvelope style={{ marginRight: '6px' }} />{t('auth.email')} <span style={{color: 'var(--danger)'}}>*</span></label>
                  <input type="email" {...field('email')} />
                  {errors.email && <div className="invalid-feedback-premium">{errors.email}</div>}
                </div>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label"><BiMap style={{ marginRight: '6px' }} />{t('manageShopsPage.address')}</label>
              <textarea className={`form-control ${errors.address ? 'is-invalid' : ''}`} name="address" value={form.address} onChange={handleChange} placeholder={t('manageShopsPage.addressPlaceholder')} rows={3} />
              {errors.address && <div className="invalid-feedback-premium">{errors.address}</div>}
            </div>
          </form>
        </div>
        <div className="drawer-footer">
          <button type="button" className="btn-premium btn-premium-secondary" onClick={onClose}>{t('common.cancel')}</button>
          <button type="submit" form="edit-shop-form" className="btn-premium btn-premium-primary" disabled={loading}>
            {loading ? <><span className="spinner-border spinner-border-sm" /> {t('common.saving')}</> : <><BiCheck /> {t('manageShopsPage.updateShop')}</>}
          </button>
        </div>
      </div>
    </>
  );
};

export default ManageShops;