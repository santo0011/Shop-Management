import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../../services/api';
import { BiSearch, BiPlus, BiEdit, BiTrash, BiX, BiCheck, BiShow } from 'react-icons/bi';
import Swal from 'sweetalert2';

const emptyForm = {
  supplier: '', invoiceNo: '', items: [{ product: '', quantity: 1, purchasePrice: 0 }],
  totalAmount: 0, paidAmount: 0, dueAmount: 0, paymentStatus: 'unpaid', notes: '',
};

const REQUIRED_FIELDS = ['supplier', 'invoiceNo'];

const validateField = (name, value) => {
  switch (name) {
    case 'supplier':
      return value ? '' : 'Supplier is required';
    case 'invoiceNo':
      return String(value || '').trim() ? '' : 'Invoice number is required';
    default:
      return '';
  }
};

const PurchaseDrawer = ({ open, onClose, onSuccess, editing, t }) => {
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [suppliers, setSuppliers] = useState([]);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setSubmitError(null);
    fetchSuppliers();
    setForm(editing ? {
      supplier: editing.supplier?._id || editing.supplier || '',
      invoiceNo: editing.invoiceNo || '',
      items: editing.items?.length ? editing.items.map(i => ({
        product: i.product?._id || i.product || '',
        quantity: i.quantity || 1,
        purchasePrice: i.purchasePrice || 0,
      })) : [{ product: '', quantity: 1, purchasePrice: 0 }],
      totalAmount: editing.totalAmount || 0,
      paidAmount: editing.paidAmount || 0,
      dueAmount: editing.dueAmount || 0,
      paymentStatus: editing.paymentStatus || 'unpaid',
      notes: editing.notes || '',
    } : emptyForm);
  }, [open, editing]);

  const fetchSuppliers = async () => {
    try {
      const { data } = await api.get('/suppliers');
      setSuppliers(Array.isArray(data) ? data : data.suppliers || []);
    } catch (err) {
      console.error(err);
    }
  };

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

  const handleItemChange = (index, field, value) => {
    const items = [...form.items];
    items[index] = { ...items[index], [field]: value };
    setForm((prev) => ({ ...prev, items }));
  };

  const addItem = () => {
    setForm((prev) => ({ ...prev, items: [...prev.items, { product: '', quantity: 1, purchasePrice: 0 }] }));
  };

  const removeItem = (index) => {
    if (form.items.length <= 1) return;
    setForm((prev) => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
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
        await api.put(`/purchases/${editing._id}`, form);
      } else {
        await api.post('/purchases', form);
      }
      onSuccess();
      onClose();
    } catch (err) {
      setSubmitError(err.response?.data?.message || 'Failed to save purchase');
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
          <h5>{editing ? 'Edit Purchase' : 'Add Purchase'}</h5>
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
          <form onSubmit={handleSubmit} id="purchase-form" noValidate>
            <div className="row g-3">
              <div className="col-md-6">
                <div className="form-group mb-0">
                  <label className="form-label">{t('purchase.supplier')}</label>
                  <select
                    className={`form-select ${errors.supplier ? 'is-invalid' : ''}`}
                    value={form.supplier}
                    onChange={(e) => handleChange('supplier', e.target.value)}
                  >
                    <option value="">Select Supplier</option>
                    {suppliers.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
                  </select>
                  {errors.supplier && <div className="invalid-feedback-premium">{errors.supplier}</div>}
                </div>
              </div>
              <div className="col-md-6">
                <div className="form-group mb-0">
                  <label className="form-label">{t('purchase.invoiceNo')}</label>
                  <input {...field('invoiceNo')} placeholder="Enter invoice number" />
                  {errors.invoiceNo && <div className="invalid-feedback-premium">{errors.invoiceNo}</div>}
                </div>
              </div>
            </div>

            <div className="mt-3 mb-2 d-flex align-items-center justify-content-between">
              <label className="form-label mb-0" style={{ fontWeight: 600 }}>Purchase Items</label>
              <button type="button" className="btn-premium btn-premium-sm" style={{ background: 'rgba(108, 99, 255, 0.12)', color: 'var(--primary)', border: 'none', padding: '0.3rem 0.75rem', borderRadius: 'var(--border-radius-md)', fontSize: '0.8rem' }} onClick={addItem}>
                <BiPlus /> Add Item
              </button>
            </div>

            {form.items.map((item, idx) => (
              <div key={idx} className="row g-2 mb-2 p-2" style={{ background: 'rgba(108, 99, 255, 0.04)', borderRadius: 'var(--border-radius-md)' }}>
                <div className="col-5">
                  <input className="form-control form-control-sm" placeholder="Product ID" value={item.product} onChange={(e) => handleItemChange(idx, 'product', e.target.value)} />
                </div>
                <div className="col-3">
                  <input type="number" className="form-control form-control-sm" placeholder="Qty" value={item.quantity} onChange={(e) => handleItemChange(idx, 'quantity', Number(e.target.value))} min="1" />
                </div>
                <div className="col-3">
                  <input type="number" className="form-control form-control-sm" placeholder="Price" value={item.purchasePrice} onChange={(e) => handleItemChange(idx, 'purchasePrice', Number(e.target.value))} min="0" />
                </div>
                <div className="col-1 d-flex align-items-center">
                  {form.items.length > 1 && (
                    <button type="button" className="btn btn-sm p-0" style={{ color: 'var(--danger)' }} onClick={() => removeItem(idx)}>
                      <BiX size={18} />
                    </button>
                  )}
                </div>
              </div>
            ))}

            <div className="row g-3 mt-2">
              <div className="col-md-4">
                <div className="form-group mb-0">
                  <label className="form-label">{t('sale.total')}</label>
                  <input type="number" className="form-control" value={form.totalAmount} onChange={(e) => handleChange('totalAmount', Number(e.target.value))} />
                </div>
              </div>
              <div className="col-md-4">
                <div className="form-group mb-0">
                  <label className="form-label">{t('common.paid')}</label>
                  <input type="number" className="form-control" value={form.paidAmount} onChange={(e) => handleChange('paidAmount', Number(e.target.value))} />
                </div>
              </div>
              <div className="col-md-4">
                <div className="form-group mb-0">
                  <label className="form-label">{t('common.status')}</label>
                  <select className="form-select" value={form.paymentStatus} onChange={(e) => handleChange('paymentStatus', e.target.value)}>
                    <option value="unpaid">Unpaid</option>
                    <option value="partial">Partial</option>
                    <option value="paid">Paid</option>
                  </select>
                </div>
              </div>
              <div className="col-12">
                <div className="form-group mb-0">
                  <label className="form-label">Notes</label>
                  <textarea className="form-control" rows="2" value={form.notes} onChange={(e) => handleChange('notes', e.target.value)} placeholder="Optional notes" />
                </div>
              </div>
            </div>
          </form>
        </div>
        <div className="drawer-footer">
          <button type="button" className="btn-premium btn-premium-secondary" onClick={onClose}>{t('common.cancel')}</button>
          <button type="submit" form="purchase-form" className="btn-premium btn-premium-primary" disabled={saving}>
            {saving ? <><span className="spinner-border spinner-border-sm" /> Saving...</> : <><BiCheck /> {t('common.save')}</>}
          </button>
        </div>
      </div>
    </>
  );
};

const Purchases = () => {
  const { t } = useTranslation();
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => {
    fetchPurchases();
  }, []);

  const fetchPurchases = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/purchases?search=${search}`);
      setPurchases(data.purchases);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => fetchPurchases(), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleEdit = (purchase) => {
    setEditing(purchase);
    setDrawerOpen(true);
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/purchases/${id}`);
      setDeleteConfirm(null);
      fetchPurchases();
    } catch (err) {
      console.error(err);
    }
  };

  const confirmDelete = (purchase) => {
    Swal.fire({
      title: 'Delete Purchase?',
      text: `Are you sure you want to delete purchase "${purchase.invoiceNo}"? This action cannot be undone.`,
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
        handleDelete(purchase._id);
        Swal.fire({
          title: 'Deleted!',
          text: 'Purchase has been deleted.',
          icon: 'success',
          timer: 1500,
          showConfirmButton: false,
          background: 'var(--bg-card)',
          color: 'var(--text-primary)',
        });
      }
    });
  };

  const getStatusBadge = (status) => {
    const map = {
      paid: { cls: 'badge-success', label: 'Paid' },
      partial: { cls: 'badge-warning', label: 'Partial' },
      unpaid: { cls: 'badge-danger', label: 'Unpaid' },
    };
    const s = map[status] || map.unpaid;
    return <span className={`badge ${s.cls}`}>{s.label}</span>;
  };

  return (
    <div>
      {/* Page Header */}
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h4 className="mb-1" style={{ fontWeight: 800 }}>{t('nav.purchases')}</h4>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
            Manage your purchase orders
          </p>
        </div>
        <button className="btn-premium btn-premium-primary" onClick={() => { setEditing(null); setDrawerOpen(true); }}>
          <BiPlus /> Add Purchase
        </button>
      </div>

      {/* Search */}
      <div className="mb-3" style={{ maxWidth: '400px' }}>
        <div className="search-box">
          <BiSearch className="search-icon" />
          <input
            className="form-control"
            placeholder={`${t('common.search')} purchases...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Purchases Table */}
      <div className="table-container">
        <div className="table-responsive">
          <table className="table-custom mb-0">
            <thead>
              <tr>
                <th>{t('purchase.invoiceNo')}</th>
                <th>{t('purchase.supplier')}</th>
                <th>{t('sale.total')}</th>
                <th>{t('common.paid')}</th>
                <th>{t('common.due')}</th>
                <th>{t('common.status')}</th>
                <th style={{ width: '140px' }}>{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-5" style={{ color: 'var(--text-muted)' }}>
                    <div className="spinner-border spinner-border-sm me-2" /> Loading...
                  </td>
                </tr>
              ) : purchases.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-5" style={{ color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem', opacity: 0.5 }}>📄</div>
                    No purchases found
                  </td>
                </tr>
              ) : purchases.map((purchase) => (
                <tr key={purchase._id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{purchase.invoiceNo}</div>
                  </td>
                  <td>{purchase.supplier?.name || '-'}</td>
                  <td>৳{purchase.totalAmount}</td>
                  <td>৳{purchase.paidAmount}</td>
                  <td>
                    <span style={purchase.dueAmount > 0 ? { color: 'var(--danger)', fontWeight: 700 } : undefined}>
                      ৳{purchase.dueAmount}
                    </span>
                  </td>
                  <td>{getStatusBadge(purchase.paymentStatus)}</td>
                  <td>
                    <div className="d-flex gap-1">
                      <button className="btn-action btn-action-view" data-tooltip="View">
                        <BiShow />
                      </button>
                      <button className="btn-action btn-action-edit" data-tooltip="Edit" onClick={() => handleEdit(purchase)}>
                        <BiEdit />
                      </button>
                      <button className="btn-action btn-action-delete" data-tooltip="Delete" onClick={() => confirmDelete(purchase)}>
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

      {/* Add / Edit Purchase Drawer */}
      <PurchaseDrawer
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setEditing(null); }}
        onSuccess={fetchPurchases}
        editing={editing}
        t={t}
      />

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="modal-premium" onClick={() => setDeleteConfirm(null)}>
          <div className="modal-premium-content" style={{ maxWidth: '420px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-premium-header">
              <h5>Delete Purchase</h5>
              <button className="btn-close-premium" onClick={() => setDeleteConfirm(null)}><BiX /></button>
            </div>
            <div className="modal-premium-body text-center">
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--glow-danger)', color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', margin: '0 auto 1.25rem' }}><BiTrash /></div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>Are you sure you want to delete this purchase? This action cannot be undone.</p>
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

export default Purchases;