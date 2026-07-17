import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../../services/api';
import { BiSearch, BiPlus, BiEdit, BiTrash, BiX, BiCheck, BiShow } from 'react-icons/bi';
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

const CustomerDrawer = ({ open, onClose, onSuccess, editing, t }) => {
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setSubmitError(null);
    setForm(editing ? {
      name: editing.name || '',
      nameBn: editing.nameBn || '',
      phone: editing.phone || '',
      email: editing.email || '',
      address: editing.address || '',
    } : emptyForm);
  }, [open, editing]);

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

  const field = (name) => ({
    className: `form-control ${errors[name] ? 'is-invalid' : ''}`,
    value: form[name],
    onChange: (e) => handleChange(name, e.target.value),
  });

  return (
    <>
      <div className={`drawer-overlay ${open ? 'open' : ''}`} onClick={onClose} />
      <div className={`drawer ${open ? 'open' : ''}`}>
        <div className="drawer-header">
          <h5>{editing ? 'Edit Customer' : 'Add Customer'}</h5>
          <button className="btn-close-premium" onClick={onClose}><BiX /></button>
        </div>
        <div className="drawer-body">
          {submitError && (
            <div style={{
              padding: '0.75rem 1rem',
              borderRadius: 'var(--border-radius-md)',
              background: 'var(--glow-danger)',
              color: 'var(--danger)',
              fontWeight: 500,
              marginBottom: '1.25rem',
              fontSize: '0.85rem',
            }}>
              {submitError}
            </div>
          )}
          <form onSubmit={handleSubmit} id="customer-form" noValidate>
            <div className="row g-3">
              <div className="col-md-6">
                <div className="form-group mb-0">
                  <label className="form-label">{t('auth.name')} (EN)</label>
                  <input {...field('name')} placeholder="Enter customer name" />
                  {errors.name && <div className="invalid-feedback-premium">{errors.name}</div>}
                </div>
              </div>
              <div className="col-md-6">
                <div className="form-group mb-0">
                  <label className="form-label">{t('auth.name')} (BN)</label>
                  <input {...field('nameBn')} placeholder="গ্রাহকের নাম লিখুন" />
                </div>
              </div>
              <div className="col-md-6">
                <div className="form-group mb-0">
                  <label className="form-label">{t('auth.phone')}</label>
                  <input {...field('phone')} placeholder="Enter phone number" />
                  {errors.phone && <div className="invalid-feedback-premium">{errors.phone}</div>}
                </div>
              </div>
              <div className="col-md-6">
                <div className="form-group mb-0">
                  <label className="form-label">Email</label>
                  <input type="email" {...field('email')} placeholder="Enter email address" />
                </div>
              </div>
              <div className="col-12">
                <div className="form-group mb-0">
                  <label className="form-label">{t('product.address') || 'Address'}</label>
                  <textarea className={`form-control ${errors.address ? 'is-invalid' : ''}`} rows="3" value={form.address} onChange={(e) => handleChange('address', e.target.value)} placeholder="Enter address" />
                </div>
              </div>
            </div>
          </form>
        </div>
        <div className="drawer-footer">
          <button type="button" className="btn-premium btn-premium-secondary" onClick={onClose}>{t('common.cancel')}</button>
          <button type="submit" form="customer-form" className="btn-premium btn-premium-primary" disabled={saving}>
            {saving ? <><span className="spinner-border spinner-border-sm" /> Saving...</> : <><BiCheck /> {t('common.save')}</>}
          </button>
        </div>
      </div>
    </>
  );
};

const Customers = () => {
  const { t } = useTranslation();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/customers?search=${search}`);
      setCustomers(data.customers);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => fetchCustomers(), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleEdit = (customer) => {
    setEditing(customer);
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
        <button className="btn-premium btn-premium-primary" onClick={() => { setEditing(null); setDrawerOpen(true); }}>
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

      {/* Customers Table */}
      <div className="table-container">
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
                  <td>৳{customer.totalPurchases || 0}</td>
                  <td>
                    <span style={customer.dueAmount > 0 ? { color: 'var(--danger)', fontWeight: 700 } : undefined}>
                      ৳{customer.dueAmount || 0}
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
                      <button className="btn-action btn-action-view" data-tooltip="View">
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

      {/* Add / Edit Customer Drawer */}
      <CustomerDrawer
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setEditing(null); }}
        onSuccess={fetchCustomers}
        editing={editing}
        t={t}
      />
    </div>
  );
};

export default Customers;