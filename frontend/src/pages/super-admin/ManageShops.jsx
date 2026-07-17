import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import api from '../../services/api';
import { BiSearch, BiPlus, BiStore, BiX, BiUser, BiPhone, BiEnvelope, BiMap, BiLock, BiCheck, BiShow, BiEdit, BiTrash, BiCalendar } from 'react-icons/bi';

const REQUIRED_SHOP_FIELDS = ['shopName', 'ownerName', 'phone', 'email', 'password'];

const validateShopField = (name, value) => {
  switch (name) {
    case 'shopName':
      return String(value || '').trim() ? '' : 'Shop name is required';
    case 'ownerName':
      return String(value || '').trim() ? '' : 'Owner name is required';
    case 'phone':
      return String(value || '').trim() ? '' : 'Phone number is required';
    case 'email':
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value || '') ? '' : 'Enter a valid email address';
    case 'password':
      return value && value.length >= 6 ? '' : 'Password must be at least 6 characters';
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
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => {
      if (!(name in prev)) return prev;
      const msg = validateShopField(name, value);
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
      const msg = validateShopField(field, form[field]);
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
      });
      setForm({ shopName: '', ownerName: '', email: '', phone: '', password: '', address: '' });
      setErrors({});
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create shop');
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
      case 'shopName': return 'Enter shop name';
      case 'ownerName': return 'Enter owner name';
      case 'phone': return 'Phone number';
      case 'email': return 'Email address';
      case 'password': return 'Set initial password';
      case 'address': return 'Enter shop address';
      default: return '';
    }
  }

  return (
    <>
      <div className={`drawer-overlay ${open ? 'open' : ''}`} onClick={onClose} />
      <div className={`drawer ${open ? 'open' : ''}`}>
        <div className="drawer-header">
          <h5><BiStore style={{ marginRight: '8px', color: 'var(--primary)' }} />Add New Shop</h5>
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
              <label className="form-label"><BiStore style={{ marginRight: '6px' }} />Shop Name <span style={{color: 'var(--danger)'}}>*</span></label>
              <input {...field('shopName')} />
              {errors.shopName && <div className="invalid-feedback-premium">{errors.shopName}</div>}
            </div>
            <div className="form-group">
              <label className="form-label"><BiUser style={{ marginRight: '6px' }} />Owner Name <span style={{color: 'var(--danger)'}}>*</span></label>
              <input {...field('ownerName')} />
              {errors.ownerName && <div className="invalid-feedback-premium">{errors.ownerName}</div>}
            </div>
            <div className="row g-3">
              <div className="col-md-6">
                <div className="form-group">
                  <label className="form-label"><BiPhone style={{ marginRight: '6px' }} />Phone <span style={{color: 'var(--danger)'}}>*</span></label>
                  <input type="tel" {...field('phone')} />
                  {errors.phone && <div className="invalid-feedback-premium">{errors.phone}</div>}
                </div>
              </div>
              <div className="col-md-6">
                <div className="form-group">
                  <label className="form-label"><BiEnvelope style={{ marginRight: '6px' }} />Email <span style={{color: 'var(--danger)'}}>*</span></label>
                  <input type="email" {...field('email')} />
                  {errors.email && <div className="invalid-feedback-premium">{errors.email}</div>}
                </div>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label"><BiLock style={{ marginRight: '6px' }} />Password <span style={{color: 'var(--danger)'}}>*</span></label>
              <input type="password" {...field('password')} />
              {errors.password && <div className="invalid-feedback-premium">{errors.password}</div>}
            </div>
            <div className="form-group">
              <label className="form-label"><BiMap style={{ marginRight: '6px' }} />Address</label>
              <textarea className={`form-control ${errors.address ? 'is-invalid' : ''}`} name="address" value={form.address} onChange={handleChange} placeholder="Enter shop address" rows={3} />
              {errors.address && <div className="invalid-feedback-premium">{errors.address}</div>}
            </div>
          </form>
        </div>
        <div className="drawer-footer">
          <button type="button" className="btn-premium btn-premium-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" form="add-shop-form" className="btn-premium btn-premium-primary" disabled={loading}>
            {loading ? <><span className="spinner-border spinner-border-sm" /> Creating...</> : <><BiCheck /> Create Shop</>}
          </button>
        </div>
      </div>
    </>
  );
};

// Helper to safely render address regardless of format (string or object)
const safeAddress = (addr) => {
  if (!addr) return 'N/A';
  if (typeof addr === 'string') return addr;
  // It's an object
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
  return parts.length > 0 ? parts.join(', ') : 'N/A';
};

const ManageShops = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const [shops, setShops] = useState([]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
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
    const silent = !isFirstLoad.current;
    if (silent) setSearching(true); else setLoading(true);
    try {
      const { data } = await api.get(`/shops?search=${debouncedSearch}`, { _skipLoading: silent });
      setShops(data.shops || []);
    } catch (err) {
      console.error(err);
    } finally {
      if (silent) setSearching(false); else setLoading(false);
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
  const [editShop, setEditShop] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const handleViewShop = async (shop) => {
    setViewShop(shop);
    setViewShopLoading(true);
    setViewShopData(null);
    setViewShopError(null);
    try {
      const { data } = await api.get(`/shops/${shop._id}`);
      setViewShopData(data);
    } catch (err) {
      setViewShopError(err.response?.data?.message || 'Failed to load shop details');
    } finally {
      setViewShopLoading(false);
    }
  };

  const toggleStatus = async (id) => {
    try {
      await api.put(`/shops/${id}/toggle-status`);
      fetchShops();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/shops/${id}`);
      setDeleteConfirm(null);
      fetchShops();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div>
      {/* Page Header */}
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h4 className="mb-1" style={{ fontWeight: 800 }}>{t('nav.shops')}</h4>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
            Manage all registered shops
          </p>
        </div>
        <button className="btn-premium btn-premium-primary" onClick={() => setDrawerOpen(true)}>
          <BiPlus /> Add Shop
        </button>
      </div>

      {/* Search */}
      <div className="mb-3" style={{ maxWidth: '400px' }}>
        <div className="search-box">
          <BiSearch className="search-icon" />
          <input
            className="form-control"
            placeholder="Search shops..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {searching && <span className="search-box-spinner" aria-hidden="true" />}
        </div>
      </div>

      {/* Shops Table */}
      <div className={`table-container ${searching ? 'is-refreshing' : ''}`}>
        <div className="table-responsive">
          <table className="table-custom mb-0">
            <thead>
              <tr>
                <th>Shop</th>
                <th>Owner</th>
                <th>Contact</th>
                <th>Status</th>
                <th style={{ width: '180px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-5" style={{ color: 'var(--text-muted)' }}>
                    <div className="spinner-border spinner-border-sm me-2" /> Loading...
                  </td>
                </tr>
              ) : shops.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-5" style={{ color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem', opacity: 0.5 }}>🏪</div>
                    No shops found
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
                      {shop.ownerName || 'N/A'}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontSize: '0.85rem' }}>{shop.email}</div>
                    <small style={{ color: 'var(--text-muted)' }}>{shop.phone}</small>
                  </td>
                  <td>
                    <span className={`badge ${shop.isActive ? 'badge-success' : 'badge-danger'}`}>
                      {shop.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <div className="d-flex gap-1">
                      <button className="btn-action btn-action-view" data-tooltip="View Details" onClick={() => handleViewShop(shop)}>
                        <BiShow />
                      </button>
                      <button className="btn-action btn-action-edit" data-tooltip="Edit" onClick={() => setEditShop(shop)}>
                        <BiEdit />
                      </button>
                      <button
                        className={`btn-action ${shop.isActive ? 'btn-action-toggle active' : 'btn-action-toggle'}`}
                        data-tooltip={shop.isActive ? 'Deactivate' : 'Activate'}
                        onClick={() => toggleStatus(shop._id)}
                      >
                        <BiLock />
                      </button>
                      <button className="btn-action btn-action-delete" data-tooltip="Delete" onClick={() => setDeleteConfirm(shop._id)}>
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
      <div className={`drawer-overlay ${viewShop ? 'open' : ''}`} onClick={() => { setViewShop(null); setViewShopData(null); }} />
      <div className={`drawer ${viewShop ? 'open' : ''}`}>
        <div className="drawer-header">
          <h5 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BiStore style={{ color: 'var(--primary)' }} />
            Shop Details
          </h5>
          <button className="btn-close-premium" onClick={() => { setViewShop(null); setViewShopData(null); }}><BiX /></button>
        </div>
        <div className="drawer-body">
          {viewShopLoading ? (
            <div className="d-flex flex-column align-items-center justify-content-center py-5">
              <div className="spinner-border mb-3" style={{ color: 'var(--primary)', width: '2.5rem', height: '2.5rem' }} role="status" />
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>Loading shop details...</p>
            </div>
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
                    {viewShopData.isActive ? '● Active' : '● Inactive'}
                  </span>
                  <span className={`badge ${viewShopData.subscriptionStatus === 'active' ? 'badge-success' : viewShopData.subscriptionStatus === 'trial' ? 'badge-warning' : 'badge-danger'}`}>
                    {viewShopData.subscriptionStatus === 'active' ? '◉ Subscribed' : viewShopData.subscriptionStatus === 'trial' ? '◉ Trial' : '◉ Expired'}
                  </span>
                </div>
              </div>

              {/* ========== INFORMATION SECTIONS (single column, no overflow) ========== */}
              {[
                { icon: BiStore, color: 'var(--primary)', glow: 'var(--glow-primary)', title: 'Shop Information', rows: [
                  { icon: BiStore, label: 'Shop Name', value: viewShopData.name },
                  { icon: BiPhone, label: 'Phone', value: viewShopData.phone || 'N/A' },
                  { icon: BiEnvelope, label: 'Email', value: viewShopData.email || 'N/A' },
                ]},
                { icon: BiUser, color: 'var(--secondary)', glow: 'var(--glow-secondary)', title: 'Owner Information', rows: [
                  { icon: BiUser, label: 'Name', value: viewShopData.owner?.name || 'N/A' },
                  { icon: BiEnvelope, label: 'Email', value: viewShopData.owner?.email || 'N/A' },
                ]},
                { icon: BiMap, color: 'var(--info)', glow: 'var(--glow-info)', title: 'Address Information', rows: [
                  { icon: BiMap, label: 'Address', value: safeAddress(viewShopData.address) },
                ]},
                { icon: BiCalendar, color: 'var(--text-muted)', glow: 'var(--bg-input)', title: 'System Information', rows: [
                  { icon: BiCalendar, label: 'Created', value: new Date(viewShopData.createdAt).toLocaleDateString() },
                  { icon: BiCalendar, label: 'Updated', value: new Date(viewShopData.updatedAt).toLocaleDateString() },
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
                    {section.title === 'Address Information' && viewShopData.subscriptionStatus && (
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
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: '1px' }}>Subscription</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span className={`badge ${viewShopData.subscriptionStatus === 'active' ? 'badge-success' : viewShopData.subscriptionStatus === 'trial' ? 'badge-warning' : 'badge-danger'}`} style={{ fontSize: '0.75rem', textTransform: 'capitalize' }}>
                              {viewShopData.subscriptionStatus || 'trial'}
                            </span>
                            {viewShopData.trialEndsAt && (
                              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                Trial ends: {new Date(viewShopData.trialEndsAt).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
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
              <h5>Delete Shop</h5>
              <button className="btn-close-premium" onClick={() => setDeleteConfirm(null)}><BiX /></button>
            </div>
            <div className="modal-premium-body text-center">
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--glow-danger)', color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', margin: '0 auto 1.25rem' }}><BiTrash /></div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>Are you sure you want to delete this shop? This action cannot be undone.</p>
            </div>
            <div className="modal-premium-footer" style={{ justifyContent: 'center' }}>
              <button className="btn-premium btn-premium-secondary" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="btn-premium btn-premium-danger" onClick={() => handleDelete(deleteConfirm)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const EditShopDrawer = ({ open, shop, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState({
    shopName: '',
    ownerName: '',
    email: '',
    phone: '',
    address: '',
  });

  useEffect(() => {
    if (shop) {
      setForm({
        shopName: shop.name || '',
        ownerName: shop.ownerName || '',
        email: shop.email || '',
        phone: shop.phone || '',
        address: shop.address || '',
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
        ? (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value || '') ? '' : 'Enter a valid email address')
        : (String(value || '').trim() ? '' : `${name === 'shopName' ? 'Shop name' : name === 'ownerName' ? 'Owner name' : 'This field'} is required`);
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
        ? (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form[field] || '') ? '' : 'Enter a valid email address')
        : (String(form[field] || '').trim() ? '' : `${field === 'shopName' ? 'Shop name' : field === 'ownerName' ? 'Owner name' : 'This field'} is required`);
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
      });
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update shop');
    } finally {
      setLoading(false);
    }
  };

  const field = (name) => ({
    className: `form-control ${errors[name] ? 'is-invalid' : ''}`,
    name,
    value: form[name],
    onChange: handleChange,
    placeholder: name === 'shopName' ? 'Enter shop name' : name === 'ownerName' ? 'Enter owner name' : name === 'phone' ? 'Phone number' : name === 'email' ? 'Email address' : '',
  });

  return (
    <>
      <div className={`drawer-overlay ${open ? 'open' : ''}`} onClick={onClose} />
      <div className={`drawer ${open ? 'open' : ''}`}>
        <div className="drawer-header">
          <h5><BiStore style={{ marginRight: '8px', color: 'var(--primary)' }} />Edit Shop</h5>
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
              <label className="form-label"><BiStore style={{ marginRight: '6px' }} />Shop Name <span style={{color: 'var(--danger)'}}>*</span></label>
              <input {...field('shopName')} />
              {errors.shopName && <div className="invalid-feedback-premium">{errors.shopName}</div>}
            </div>
            <div className="form-group">
              <label className="form-label"><BiUser style={{ marginRight: '6px' }} />Owner Name <span style={{color: 'var(--danger)'}}>*</span></label>
              <input {...field('ownerName')} />
              {errors.ownerName && <div className="invalid-feedback-premium">{errors.ownerName}</div>}
            </div>
            <div className="row g-3">
              <div className="col-md-6">
                <div className="form-group">
                  <label className="form-label"><BiPhone style={{ marginRight: '6px' }} />Phone <span style={{color: 'var(--danger)'}}>*</span></label>
                  <input type="tel" {...field('phone')} />
                  {errors.phone && <div className="invalid-feedback-premium">{errors.phone}</div>}
                </div>
              </div>
              <div className="col-md-6">
                <div className="form-group">
                  <label className="form-label"><BiEnvelope style={{ marginRight: '6px' }} />Email <span style={{color: 'var(--danger)'}}>*</span></label>
                  <input type="email" {...field('email')} />
                  {errors.email && <div className="invalid-feedback-premium">{errors.email}</div>}
                </div>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label"><BiMap style={{ marginRight: '6px' }} />Address</label>
              <textarea className={`form-control ${errors.address ? 'is-invalid' : ''}`} name="address" value={form.address} onChange={handleChange} placeholder="Enter shop address" rows={3} />
              {errors.address && <div className="invalid-feedback-premium">{errors.address}</div>}
            </div>
          </form>
        </div>
        <div className="drawer-footer">
          <button type="button" className="btn-premium btn-premium-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" form="edit-shop-form" className="btn-premium btn-premium-primary" disabled={loading}>
            {loading ? <><span className="spinner-border spinner-border-sm" /> Saving...</> : <><BiCheck /> Update Shop</>}
          </button>
        </div>
      </div>
    </>
  );
};

export default ManageShops;