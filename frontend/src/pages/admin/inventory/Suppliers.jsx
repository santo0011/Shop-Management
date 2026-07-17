import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../../services/api';
import { BiSearch, BiPlus, BiEdit, BiTrash, BiX, BiCheck } from 'react-icons/bi';

const emptyForm = { name: '', nameBn: '', company: '', email: '', phone: '', address: '' };

const REQUIRED_FIELDS = ['name', 'phone'];

const validateField = (name, value) => {
  switch (name) {
    case 'name':
      return String(value || '').trim() ? '' : 'Supplier name is required';
    case 'phone':
      return String(value || '').trim() ? '' : 'Phone number is required';
    default:
      return '';
  }
};

const SupplierDrawer = ({ open, onClose, onSuccess, editing, t }) => {
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
      company: editing.company || '',
      email: editing.email || '',
      phone: editing.phone || '',
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
        await api.put(`/suppliers/${editing._id}`, form);
      } else {
        await api.post('/suppliers', form);
      }
      onSuccess();
      onClose();
    } catch (err) {
      setSubmitError(err.response?.data?.message || 'Failed to save supplier');
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
          <h5>{editing ? 'Edit Supplier' : 'Add Supplier'}</h5>
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
          <form onSubmit={handleSubmit} id="supplier-form" noValidate>
            <div className="row g-3">
              <div className="col-md-6">
                <div className="form-group mb-0">
                  <label className="form-label">{t('auth.name')} (EN)</label>
                  <input {...field('name')} placeholder="Enter supplier name" />
                  {errors.name && <div className="invalid-feedback-premium">{errors.name}</div>}
                </div>
              </div>
              <div className="col-md-6">
                <div className="form-group mb-0">
                  <label className="form-label">{t('auth.name')} (BN)</label>
                  <input {...field('nameBn')} placeholder="সাপ্লায়ারের নাম লিখুন" />
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
              <div className="col-md-6">
                <div className="form-group mb-0">
                  <label className="form-label">Company</label>
                  <input {...field('company')} placeholder="Enter company name" />
                </div>
              </div>
              <div className="col-md-6">
                <div className="form-group mb-0">
                  <label className="form-label">{t('product.address') || 'Address'}</label>
                  <input {...field('address')} placeholder="Enter address" />
                </div>
              </div>
            </div>
          </form>
        </div>
        <div className="drawer-footer">
          <button type="button" className="btn-premium btn-premium-secondary" onClick={onClose}>{t('common.cancel')}</button>
          <button type="submit" form="supplier-form" className="btn-premium btn-premium-primary" disabled={saving}>
            {saving ? <><span className="spinner-border spinner-border-sm" /> Saving...</> : <><BiCheck /> {t('common.save')}</>}
          </button>
        </div>
      </div>
    </>
  );
};

const Suppliers = () => {
  const { t } = useTranslation();
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/suppliers?search=${search}`);
      setSuppliers(data.suppliers);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => fetchSuppliers(), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleEdit = (supplier) => {
    setEditing(supplier);
    setDrawerOpen(true);
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/suppliers/${id}`);
      setDeleteConfirm(null);
      fetchSuppliers();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div>
      {/* Page Header */}
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h4 className="mb-1" style={{ fontWeight: 800 }}>{t('nav.suppliers')}</h4>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
            Manage your suppliers
          </p>
        </div>
        <button className="btn-premium btn-premium-primary" onClick={() => { setEditing(null); setDrawerOpen(true); }}>
          <BiPlus /> Add Supplier
        </button>
      </div>

      {/* Search */}
      <div className="mb-3" style={{ maxWidth: '400px' }}>
        <div className="search-box">
          <BiSearch className="search-icon" />
          <input
            className="form-control"
            placeholder={`${t('common.search')} suppliers...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Suppliers Table */}
      <div className="table-container">
        <div className="table-responsive">
          <table className="table-custom mb-0">
            <thead>
              <tr>
                <th>{t('auth.name')}</th>
                <th>{t('auth.phone')}</th>
                <th>Email</th>
                <th>{t('purchase.supplier')} Due</th>
                <th style={{ width: '120px' }}>{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-5" style={{ color: 'var(--text-muted)' }}>
                    <div className="spinner-border spinner-border-sm me-2" /> Loading...
                  </td>
                </tr>
              ) : suppliers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-5" style={{ color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem', opacity: 0.5 }}>🤝</div>
                    No suppliers found
                  </td>
                </tr>
              ) : suppliers.map((supplier) => (
                <tr key={supplier._id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{supplier.name}</div>
                    {supplier.nameBn && <small style={{ color: 'var(--text-muted)' }}>{supplier.nameBn}</small>}
                  </td>
                  <td>{supplier.phone}</td>
                  <td>{supplier.email || '-'}</td>
                  <td>
                    <span style={supplier.dueAmount > 0 ? { color: 'var(--danger)', fontWeight: 700 } : undefined}>
                      ৳{supplier.dueAmount || 0}
                    </span>
                  </td>
                  <td>
                    <div className="d-flex gap-1">
                      <button className="btn-action btn-action-edit" data-tooltip="Edit" onClick={() => handleEdit(supplier)}>
                        <BiEdit />
                      </button>
                      <button className="btn-action btn-action-delete" data-tooltip="Delete" onClick={() => setDeleteConfirm(supplier._id)}>
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

      {/* Add / Edit Supplier Drawer */}
      <SupplierDrawer
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setEditing(null); }}
        onSuccess={fetchSuppliers}
        editing={editing}
        t={t}
      />

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="modal-premium" onClick={() => setDeleteConfirm(null)}>
          <div className="modal-premium-content" style={{ maxWidth: '420px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-premium-header">
              <h5>Delete Supplier</h5>
              <button className="btn-close-premium" onClick={() => setDeleteConfirm(null)}><BiX /></button>
            </div>
            <div className="modal-premium-body text-center">
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--glow-danger)', color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', margin: '0 auto 1.25rem' }}><BiTrash /></div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>Are you sure you want to delete this supplier? This action cannot be undone.</p>
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

export default Suppliers;