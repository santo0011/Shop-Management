import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { BiX, BiCheck } from 'react-icons/bi';

const emptyForm = {
  name: '', nameBn: '', sku: '', barcode: '', category: '',
  unit: 'piece', purchasePrice: '', sellingPrice: '', wholesalePrice: '',
  stock: '', minStock: '10', trackStock: true, discount: 0, tax: 0,
};

const REQUIRED_FIELDS = ['name', 'category', 'purchasePrice', 'sellingPrice', 'stock'];

const validateField = (name, value) => {
  switch (name) {
    case 'name': return String(value || '').trim() ? '' : 'Product name is required';
    case 'category': return value ? '' : 'Category is required';
    case 'purchasePrice': return value !== '' && value !== null && Number(value) >= 0 ? '' : 'Enter a valid purchase price';
    case 'sellingPrice': return value !== '' && value !== null && Number(value) >= 0 ? '' : 'Enter a valid selling price';
    case 'stock': return value !== '' && value !== null && Number(value) >= 0 ? '' : 'Enter a valid stock quantity';
    default: return '';
  }
};

// Shared Add/Edit Product drawer — used by the Products page and, for
// on-the-fly product creation, by the Purchase entry drawer. `onSuccess`
// is called with the created/updated product so callers that need it
// (e.g. auto-selecting a freshly created product into a purchase row)
// can use it; callers that just need to refresh a list can ignore the arg.
const ProductDrawer = ({ open, onClose, onSuccess, editing, categories, units, t, initialName = '' }) => {
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
      sku: editing.sku || '',
      barcode: editing.barcode || '',
      category: editing.category?._id || editing.category || '',
      unit: editing.unit || 'piece',
      purchasePrice: editing.purchasePrice,
      sellingPrice: editing.sellingPrice,
      wholesalePrice: editing.wholesalePrice || '',
      stock: editing.stock,
      minStock: editing.minStock,
      trackStock: editing.trackStock,
      discount: editing.discount || 0,
      tax: editing.tax || 0,
    } : { ...emptyForm, name: initialName });
  }, [open, editing, initialName]);

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
      let product;
      if (editing) {
        ({ data: product } = await api.put(`/products/${editing._id}`, form));
      } else {
        ({ data: product } = await api.post('/products', form));
      }
      onSuccess(product);
      onClose();
    } catch (err) {
      setSubmitError(err.response?.data?.message || 'Failed to save product');
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
          <h5>{editing ? t('product.editProduct') : t('product.addProduct')}</h5>
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
          <form onSubmit={handleSubmit} id="product-form" noValidate>
            <div className="row g-3">
              <div className="col-md-6">
                <div className="form-group mb-0">
                  <label className="form-label">{t('product.productName')} (EN) <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input {...field('name')} />
                  {errors.name && <div className="invalid-feedback-premium">{errors.name}</div>}
                </div>
              </div>
              <div className="col-md-6">
                <div className="form-group mb-0">
                  <label className="form-label">{t('product.productName')} (BN)</label>
                  <input {...field('nameBn')} />
                </div>
              </div>
              <div className="col-md-4">
                <div className="form-group mb-0">
                  <label className="form-label">{t('product.category')} <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <select
                    className={`form-select ${errors.category ? 'is-invalid' : ''}`}
                    value={form.category}
                    onChange={(e) => handleChange('category', e.target.value)}
                  >
                    <option value="">Select</option>
                    {categories.map((cat) => <option key={cat._id} value={cat._id}>{cat.name}</option>)}
                  </select>
                  {errors.category && <div className="invalid-feedback-premium">{errors.category}</div>}
                </div>
              </div>
              <div className="col-md-4">
                <div className="form-group mb-0">
                  <label className="form-label">{t('product.unit')}</label>
                  <select className="form-select" value={form.unit} onChange={(e) => handleChange('unit', e.target.value)}>
                    {units.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="col-md-4">
                <div className="form-group mb-0">
                  <label className="form-label">{t('product.barcode')}</label>
                  <input {...field('barcode')} />
                </div>
              </div>
              <div className="col-md-4">
                <div className="form-group mb-0">
                  <label className="form-label">{t('product.purchasePrice')} <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input type="number" {...field('purchasePrice')} />
                  {errors.purchasePrice && <div className="invalid-feedback-premium">{errors.purchasePrice}</div>}
                </div>
              </div>
              <div className="col-md-4">
                <div className="form-group mb-0">
                  <label className="form-label">{t('product.sellingPrice')} <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input type="number" {...field('sellingPrice')} />
                  {errors.sellingPrice && <div className="invalid-feedback-premium">{errors.sellingPrice}</div>}
                </div>
              </div>
              <div className="col-md-4">
                <div className="form-group mb-0">
                  <label className="form-label">{t('product.wholesalePrice')}</label>
                  <input type="number" {...field('wholesalePrice')} />
                </div>
              </div>
              <div className="col-md-4">
                <div className="form-group mb-0">
                  <label className="form-label">{t('product.stock')} <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input type="number" {...field('stock')} />
                  {errors.stock && <div className="invalid-feedback-premium">{errors.stock}</div>}
                </div>
              </div>
              <div className="col-md-4">
                <div className="form-group mb-0">
                  <label className="form-label">{t('product.minStock')}</label>
                  <input type="number" {...field('minStock')} />
                </div>
              </div>
              <div className="col-md-4">
                <div className="form-group mb-0">
                  <label className="form-label">{t('sale.discount')} (%)</label>
                  <input type="number" {...field('discount')} />
                </div>
              </div>
              <div className="col-md-4">
                <div className="form-group mb-0">
                  <label className="form-label">{t('sale.tax')} (%)</label>
                  <input type="number" {...field('tax')} />
                </div>
              </div>
            </div>
          </form>
        </div>
        <div className="drawer-footer">
          <button type="button" className="btn-premium btn-premium-secondary" onClick={onClose}>{t('common.cancel')}</button>
          <button type="submit" form="product-form" className="btn-premium btn-premium-primary" disabled={saving}>
            {saving ? <><span className="spinner-border spinner-border-sm" /> Saving...</> : <><BiCheck /> {t('common.save')}</>}
          </button>
        </div>
      </div>
    </>
  );
};

export default ProductDrawer;
