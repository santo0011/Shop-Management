import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import api from '../../../services/api';
import ExpandableCard from '../../../components/common/ExpandableCard';
import { BiSearch, BiPlus, BiEdit, BiTrash, BiX, BiCheck, BiShow, BiPhone, BiEnvelope, BiMapPin, BiDollar, BiCalendar, BiUser, BiWallet, BiAward } from 'react-icons/bi';
import Swal from 'sweetalert2';

const emptyForm = { name: '', nameBn: '', phone: '', email: '', address: '' };

const REQUIRED_FIELDS = ['name', 'phone'];

const validateField = (name, value) => {
  switch (name) {
    case 'name':
      return String(value || '').trim() ? '' : 'Customer name is required';
    case 'phone':
      return String(value || '').trim() ? '' : 'Phone number is required';
    default:
      return '';
  }
};

const CustomerDrawer = ({ open, onClose, onSuccess, editing, viewing, onEditFromView, t }) => {
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setSubmitError(null);
    const data = viewing || editing;
    setForm(data ? {
      name: data.name || '',
      nameBn: data.nameBn || '',
      phone: data.phone || '',
      email: data.email || '',
      address: typeof data.address === 'object' ? Object.values(data.address).filter(Boolean).join(', ') : (data.address || ''),
    } : emptyForm);
  }, [open, editing, viewing]);

  const handleChange = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => {
      if (!(name in prev)) return prev;
      const msg = validateField(name, value);
      const next = { ...prev };
      if (msg) next[name] = msg; else delete next[name];
      return next;
    });
    if (submitError) setSubmitError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};
    REQUIRED_FIELDS.forEach((field) => {
      const msg = validateField(field, form[field]);
      if (msg) newErrors[field] = msg;
    });
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setSaving(true);
    setSubmitError(null);
    try {
      if (editing) {
        await api.put(`/customers/${editing._id}`, form);
      } else {
        await api.post('/customers', form);
      }
      onSuccess();
      onClose();
    } catch (err) {
      setSubmitError(err.response?.data?.message || 'Failed to save customer');
    } finally {
      setSaving(false);
    }
  };

  const isViewing = !!viewing;

  const inputStyle = { padding: '0.45rem 0.75rem', fontSize: '0.82rem', minHeight: '40px', height: '40px' };
  const labelStyle = { fontSize: '0.72rem', marginBottom: '0.2rem' };
  const errorStyle = { fontSize: '0.7rem', marginTop: '0.1rem' };

  const field = (name) => ({
    className: `form-control ${errors[name] ? 'is-invalid' : ''}`,
    value: form[name],
    onChange: (e) => handleChange(name, e.target.value),
    readOnly: isViewing,
    disabled: isViewing,
    style: isViewing ? { background: 'var(--bg-input)', cursor: 'default', opacity: 0.8 } : inputStyle,
  });

  if (isViewing) {
    const data = viewing;
    return (
      <>
        <div className={`drawer-overlay ${open ? 'open' : ''}`} onClick={onClose} />
        <div className={`drawer ${open ? 'open' : ''}`}>
          <div className="drawer-header">
            <h5>Customer Details</h5>
            <button className="btn-close-premium" onClick={onClose}><BiX /></button>
          </div>
          <div className="drawer-body">
            {/* Profile Card */}
            <div style={{
              textAlign: 'center',
              marginBottom: '1.5rem',
              padding: '1.5rem',
              background: 'linear-gradient(135deg, rgba(108, 99, 255, 0.06), rgba(0, 217, 166, 0.06))',
              borderRadius: 'var(--border-radius-lg)',
              border: '1px solid rgba(108, 99, 255, 0.12)',
            }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'var(--gradient-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: '1.5rem',
                fontWeight: 700,
                margin: '0 auto 12px',
                boxShadow: '0 4px 15px rgba(108, 99, 255, 0.3)',
              }}>
                {(data.name || '?').charAt(0).toUpperCase()}
              </div>
              <h4 style={{ margin: '0 0 4px', fontWeight: 700, color: 'var(--text-primary)' }}>{data.name}</h4>
              {data.nameBn && <p style={{ margin: '0 0 8px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>{data.nameBn}</p>}
              {data.phone && (
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '3px 12px',
                  background: 'rgba(0, 217, 166, 0.1)',
                  borderRadius: '20px',
                  color: 'var(--secondary)',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                }}>
                  📞 {data.phone}
                </div>
              )}
            </div>

            {/* Info Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 14px',
                borderRadius: 'var(--border-radius-md)',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-light)',
              }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 500 }}>Email</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{data.email || '—'}</span>
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 14px',
                borderRadius: 'var(--border-radius-md)',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-light)',
              }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 500 }}>Address</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', textAlign: 'right', maxWidth: '60%' }}>
                  {typeof data.address === 'object' ? Object.values(data.address).filter(Boolean).join(', ') : (data.address || '—')}
                </span>
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 14px',
                borderRadius: 'var(--border-radius-md)',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-light)',
              }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 500 }}>Total Purchases</span>
                <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--primary)' }}>₹{data.totalPurchases || 0}</span>
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 14px',
                borderRadius: 'var(--border-radius-md)',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-light)',
              }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 500 }}>Due Amount</span>
                <span style={{
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  color: data.dueAmount > 0 ? 'var(--danger)' : 'var(--secondary)',
                }}>
                  ₹{data.dueAmount || 0}
                </span>
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 14px',
                borderRadius: 'var(--border-radius-md)',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-light)',
              }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 500 }}>Loyalty Points</span>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  color: 'var(--primary)',
                  padding: '2px 10px',
                  borderRadius: '20px',
                  background: 'rgba(108, 99, 255, 0.1)',
                }}>
                  ⭐ {data.loyaltyPoints || 0} pts
                </span>
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 14px',
                borderRadius: 'var(--border-radius-md)',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-light)',
              }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 500 }}>Customer Since</span>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  {data.createdAt ? new Date(data.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                </span>
              </div>
            </div>
          </div>
          <div className="drawer-footer">
            <button type="button" className="btn-premium btn-premium-primary" onClick={onClose}>
              <BiCheck /> Close
            </button>
            <button type="button" className="btn-premium btn-premium-secondary" onClick={() => onEditFromView?.(data)}>
              <BiEdit /> Edit
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className={`drawer-overlay ${open ? 'open' : ''}`} onClick={onClose} />
      <div className={`drawer ${open ? 'open' : ''}`}>
        <div className="drawer-header" style={{ padding: '0.85rem 1.25rem', minHeight: 'auto' }}>
          <h5 style={{ fontSize: '1rem', margin: 0 }}>{editing ? 'Edit Customer' : 'Add Customer'}</h5>
          <button className="btn-close-premium" onClick={onClose} style={{ width: '32px', height: '32px' }}><BiX /></button>
        </div>
        <div className="drawer-body customer-drawer-body" style={{ padding: '0.85rem 1rem 0.4rem 1rem' }}>
          {submitError && (
            <div style={{
              padding: '0.5rem 0.75rem',
              borderRadius: 'var(--border-radius-sm)',
              background: 'var(--glow-danger)',
              color: 'var(--danger)',
              fontWeight: 500,
              marginBottom: '0.6rem',
              fontSize: '0.78rem',
            }}>
              {submitError}
            </div>
          )}
          <form onSubmit={handleSubmit} id="customer-form" noValidate>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {/* Customer Name - full width */}
              <div>
                <label className="form-label" style={labelStyle}>{t('auth.name')} (EN) <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input {...field('name')} placeholder="Enter customer name" />
                {errors.name && <div className="invalid-feedback-premium" style={errorStyle}>{errors.name}</div>}
              </div>
              {/* 2-col row: Name (BN) + Phone */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div>
                  <label className="form-label" style={labelStyle}>{t('auth.name')} (BN)</label>
                  <input {...field('nameBn')} placeholder="গ্রাহকের নাম লিখুন" />
                </div>
                <div>
                  <label className="form-label" style={labelStyle}>{t('auth.phone')} <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input {...field('phone')} placeholder="Enter phone number" />
                  {errors.phone && <div className="invalid-feedback-premium" style={errorStyle}>{errors.phone}</div>}
                </div>
              </div>
              {/* 2-col row: Email + Address */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div>
                  <label className="form-label" style={labelStyle}>Email</label>
                  <input type="email" {...field('email')} placeholder="Enter email address" />
                </div>
                <div>
                  <label className="form-label" style={labelStyle}>Address</label>
                  <input {...field('address')} placeholder="Enter address" />
                </div>
              </div>
            </div>
          </form>
        </div>
        <div className="drawer-footer customer-drawer-footer" style={{ padding: '0.7rem 1rem', gap: '0.5rem' }}>
          <button type="button" className="btn-premium btn-premium-secondary" onClick={onClose} style={{ padding: '0.5rem 1.25rem', fontSize: '0.82rem', flex: 1, justifyContent: 'center' }}>{t('common.cancel')}</button>
          <button type="submit" form="customer-form" className="btn-premium btn-premium-primary" disabled={saving} style={{ padding: '0.5rem 1.25rem', fontSize: '0.82rem', flex: 1, justifyContent: 'center' }}>
            {saving ? <><span className="spinner-border spinner-border-sm" /> Saving...</> : <><BiCheck /> {t('common.save')}</>}
          </button>
        </div>
      </div>
    </>
  );
};

const Customers = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [search, setSearch] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const isFirstLoad = useRef(true);

  useEffect(() => {
    fetchCustomers();
  }, []);

  // Deep-link: open a specific customer's drawer when navigated here from Global Search.
  useEffect(() => {
    const openId = location.state?.openCustomerId;
    if (!openId) return;
    window.history.replaceState({}, document.title);
    api.get(`/customers/${openId}`, { _skipLoading: true })
      .then(({ data }) => { setViewing(data); setEditing(null); setDrawerOpen(true); })
      .catch((err) => console.error(err));
  }, [location.state]);

  const fetchCustomers = async () => {
    const silent = !isFirstLoad.current;
    if (silent) setSearching(true); else setLoading(true);
    try {
      const { data } = await api.get(`/customers?search=${search}`, { _skipLoading: silent });
      setCustomers(data.customers);
    } catch (err) {
      console.error(err);
    } finally {
      if (silent) setSearching(false); else setLoading(false);
      isFirstLoad.current = false;
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => fetchCustomers(), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleView = (customer) => {
    setViewing(customer);
    setEditing(null);
    setDrawerOpen(true);
  };

  const handleEdit = (customer) => {
    setEditing(customer);
    setViewing(null);
    setDrawerOpen(true);
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/customers/${id}`);
      fetchCustomers();
    } catch (err) {
      console.error(err);
    }
  };

  const confirmDelete = (customer) => {
    Swal.fire({
      title: 'Delete Customer?',
      text: `Are you sure you want to delete "${customer.name}"? This action cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#FF6B6B',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel',
      background: 'var(--bg-card)',
      color: 'var(--text-primary)',
      reverseButtons: true,
    }).then((result) => {
      if (result.isConfirmed) {
        handleDelete(customer._id);
        Swal.fire({
          title: 'Deleted!',
          text: 'Customer has been deleted.',
          icon: 'success',
          timer: 1500,
          showConfirmButton: false,
          background: 'var(--bg-card)',
          color: 'var(--text-primary)',
        });
      }
    });
  };

  return (
    <div>
      {/* Page Header */}
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h4 className="mb-1" style={{ fontWeight: 800 }}>{t('nav.customers')}</h4>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
            Manage your customers
          </p>
        </div>
        <button className="btn-premium btn-premium-primary" onClick={() => { setEditing(null); setViewing(null); setDrawerOpen(true); }}>
          <BiPlus /> Add Customer
        </button>
      </div>

      {/* Search */}
      <div className="mb-3" style={{ maxWidth: '400px' }}>
        <div className="search-box">
          <BiSearch className="search-icon" />
          <input
            className="form-control"
            placeholder={`${t('common.search')} customers...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* ─── Desktop Table ─────────────────────────────────────────────── */}
      <div className={`table-container desktop-table ${searching ? 'is-refreshing' : ''}`}>
        <div className="table-responsive">
          <table className="table-custom mb-0">
            <thead>
              <tr>
                <th>{t('auth.name')}</th>
                <th>{t('auth.phone')}</th>
                <th>{t('sale.total')} Purchase</th>
                <th>{t('common.due')}</th>
                <th>Loyalty</th>
                <th style={{ width: '140px' }}>{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-5" style={{ color: 'var(--text-muted)' }}>
                    <div className="spinner-border spinner-border-sm me-2" /> Loading...
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-5" style={{ color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem', opacity: 0.5 }}>👥</div>
                    No customers found
                  </td>
                </tr>
              ) : customers.map((customer) => (
                <tr key={customer._id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{customer.name}</div>
                    {customer.nameBn && <small style={{ color: 'var(--text-muted)' }}>{customer.nameBn}</small>}
                  </td>
                  <td>{customer.phone}</td>
                  <td>₹{customer.totalPurchases || 0}</td>
                  <td>
                    <span style={customer.dueAmount > 0 ? { color: 'var(--danger)', fontWeight: 700 } : undefined}>
                      ₹{customer.dueAmount || 0}
                    </span>
                  </td>
                  <td>
                    <span className="badge badge-primary" style={{
                      background: 'rgba(108, 99, 255, 0.12)',
                      color: 'var(--primary)',
                      padding: '0.3rem 0.75rem',
                      borderRadius: 'var(--border-radius-pill)',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                    }}>
                      {customer.loyaltyPoints || 0} pts
                    </span>
                  </td>
                  <td>
                    <div className="d-flex gap-1">
                      <button className="btn-action btn-action-view" data-tooltip="View" onClick={() => handleView(customer)}>
                        <BiShow />
                      </button>
                      <button className="btn-action btn-action-edit" data-tooltip="Edit" onClick={() => handleEdit(customer)}>
                        <BiEdit />
                      </button>
                      <button className="btn-action btn-action-delete" data-tooltip="Delete" onClick={() => confirmDelete(customer)}>
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

      {/* ─── Mobile Cards ──────────────────────────────────────────────── */}
      <div className={`mobile-cards ${searching ? 'is-refreshing' : ''}`}>
        {loading ? (
          <div className="text-center py-5" style={{ color: 'var(--text-muted)' }}>
            <div className="spinner-border spinner-border-sm me-2" /> Loading...
          </div>
        ) : customers.length === 0 ? (
          <div className="text-center py-5" style={{ color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem', opacity: 0.5 }}>👥</div>
            No customers found
          </div>
        ) : customers.map((customer) => (
          <ExpandableCard
            key={customer._id}
            compact={
              <>
                <div className="expandable-card__compact-row">
                  <span className="expandable-card__name">{customer.name}</span>
                  <span className="expandable-card__price">₹{customer.dueAmount || 0}</span>
                </div>
                <div className="expandable-card__meta">
                  <span className="expandable-card__meta-item">
                    <BiPhone />
                    <strong>{customer.phone}</strong>
                  </span>
                  <span className="expandable-card__meta-item">
                    <BiWallet />
                    <span>₹{customer.totalPurchases || 0}</span>
                  </span>
                </div>
              </>
            }
            expanded={
              <div className="expandable-card__rows">
                <div className="expandable-card__row">
                  <span className="expandable-card__row-label">Phone</span>
                  <span className="expandable-card__row-dots" />
                  <span className="expandable-card__row-value">{customer.phone}</span>
                </div>
                <div className="expandable-card__row">
                  <span className="expandable-card__row-label">Email</span>
                  <span className="expandable-card__row-dots" />
                  <span className="expandable-card__row-value">{customer.email || '-'}</span>
                </div>
                <div className="expandable-card__row">
                  <span className="expandable-card__row-label">Address</span>
                  <span className="expandable-card__row-dots" />
                  <span className="expandable-card__row-value">{typeof customer.address === 'object' ? Object.values(customer.address).filter(Boolean).join(', ') : (customer.address || '-')}</span>
                </div>
                <div className="expandable-card__row">
                  <span className="expandable-card__row-label">Total Purchases</span>
                  <span className="expandable-card__row-dots" />
                  <span className="expandable-card__row-value">₹{customer.totalPurchases || 0}</span>
                </div>
                <div className="expandable-card__row">
                  <span className="expandable-card__row-label">Due Amount</span>
                  <span className="expandable-card__row-dots" />
                  <span className="expandable-card__row-value" style={customer.dueAmount > 0 ? { color: 'var(--danger)' } : undefined}>₹{customer.dueAmount || 0}</span>
                </div>
                <div className="expandable-card__row">
                  <span className="expandable-card__row-label">Loyalty Points</span>
                  <span className="expandable-card__row-dots" />
                  <span className="expandable-card__row-value">{customer.loyaltyPoints || 0} pts</span>
                </div>
                <div className="expandable-card__row">
                  <span className="expandable-card__row-label">Created</span>
                  <span className="expandable-card__row-dots" />
                  <span className="expandable-card__row-value">{new Date(customer.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            }
            actions={
              <>
                <button className="btn-action btn-action-view" data-tooltip="View" onClick={() => handleView(customer)}>
                  <BiShow />
                </button>
                <button className="btn-action btn-action-edit" data-tooltip="Edit" onClick={() => handleEdit(customer)}>
                  <BiEdit />
                </button>
                <button className="btn-action btn-action-delete" data-tooltip="Delete" onClick={() => confirmDelete(customer)}>
                  <BiTrash />
                </button>
              </>
            }
          />
        ))}
      </div>

      {/* Add / Edit Customer Drawer */}
      <CustomerDrawer
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setEditing(null); setViewing(null); }}
        onSuccess={fetchCustomers}
        editing={editing}
        viewing={viewing}
        onEditFromView={(customer) => { setDrawerOpen(false); setViewing(null); setTimeout(() => { setEditing(customer); setDrawerOpen(true); }, 200); }}
        t={t}
      />
    </div>
  );
};

export default Customers;