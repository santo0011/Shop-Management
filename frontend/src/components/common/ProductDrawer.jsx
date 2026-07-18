import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { BiX, BiCheck } from 'react-icons/bi';

const emptyForm = {
  name: '', nameBn: '', sku: '', barcode: '', category: '',
  unit: 'piece', purchasePrice: '', sellingPrice: '', wholesalePrice: '',
  stock: '', minStock: '10', trackStock: true, discount: '', tax: '',
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
      discount: editing.discount || '',
      tax: editing.tax || '',
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

  const inputStyle = { padding: '0.45rem 0.75rem', fontSize: '0.82rem', minHeight: '40px', height: '40px' };
  const labelStyle = { fontSize: '0.72rem', marginBottom: '0.2rem' };
  const errorStyle = { fontSize: '0.7rem', marginTop: '0.1rem' };

  const field = (name) => ({
    className: `form-control ${errors[name] ? 'is-invalid' : ''}`,
    value: form[name],
    onChange: (e) => handleChange(name, e.target.value),
    style: inputStyle,
  });

  return (
    <>
      <div className={`drawer-overlay ${open ? 'open' : ''}`} onClick={onClose} />
      <div className={`drawer ${open ? 'open' : ''}`}>
        <div className="drawer-header" style={{ padding: '0.85rem 1.25rem', minHeight: 'auto' }}>
          <h5 style={{ fontSize: '1rem', margin: 0 }}>{editing ? t('product.editProduct') : t('product.addProduct')}</h5>
          <button className="btn-close-premium" onClick={onClose} style={{ width: '32px', height: '32px' }}><BiX /></button>
        </div>
        <div className="drawer-body product-drawer-body" style={{ padding: '0.85rem 1rem 0.4rem 1rem' }}>
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
          <form onSubmit={handleSubmit} id="product-form" noValidate>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {/* Product Name - full width */}
              <div>
                <label className="form-label" style={labelStyle}>{t('product.productName')} (EN) <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input {...field('name')} />
                {errors.name && <div className="invalid-feedback-premium" style={errorStyle}>{errors.name}</div>}
              </div>
              {/* 2-col row: Name (BN) + Category */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div>
                  <label className="form-label" style={labelStyle}>{t('product.productName')} (BN)</label>
                  <input {...field('nameBn')} />
                </div>
                <div>
                  <label className="form-label" style={labelStyle}>{t('product.category')} <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <select
                    className={`form-select ${errors.category ? 'is-invalid' : ''}`}
                    value={form.category}
                    onChange={(e) => handleChange('category', e.target.value)}
                    style={inputStyle}
                  >
                    <option value="">Select</option>
                    {categories.map((cat) => <option key={cat._id} value={cat._id}>{cat.name}</option>)}
                  </select>
                  {errors.category && <div className="invalid-feedback-premium" style={errorStyle}>{errors.category}</div>}
                </div>
              </div>
              {/* 2-col row: Unit + Barcode */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div>
                  <label className="form-label" style={labelStyle}>{t('product.unit')}</label>
                  <select className="form-select" value={form.unit} onChange={(e) => handleChange('unit', e.target.value)} style={inputStyle}>
                    {units.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label" style={labelStyle}>{t('product.barcode')}</label>
                  <input {...field('barcode')} />
                </div>
              </div>
              {/* 2-col row: Purchase Price + Selling Price */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div>
                  <label className="form-label" style={labelStyle}>{t('product.purchasePrice')} <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input type="number" {...field('purchasePrice')} />
                  {errors.purchasePrice && <div className="invalid-feedback-premium" style={errorStyle}>{errors.purchasePrice}</div>}
                </div>
                <div>
                  <label className="form-label" style={labelStyle}>{t('product.sellingPrice')} <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input type="number" {...field('sellingPrice')} />
                  {errors.sellingPrice && <div className="invalid-feedback-premium" style={errorStyle}>{errors.sellingPrice}</div>}
                </div>
              </div>
              {/* 2-col row: Wholesale Price + Stock */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div>
                  <label className="form-label" style={labelStyle}>{t('product.wholesalePrice')}</label>
                  <input type="number" {...field('wholesalePrice')} />
                </div>
                <div>
                  <label className="form-label" style={labelStyle}>{t('product.stock')} <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input type="number" {...field('stock')} />
                  {errors.stock && <div className="invalid-feedback-premium" style={errorStyle}>{errors.stock}</div>}
                </div>
              </div>
              {/* 2-col row: Min Stock + Discount */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div>
                  <label className="form-label" style={labelStyle}>{t('product.minStock')}</label>
                  <input type="number" {...field('minStock')} />
                </div>
                <div>
                  <label className="form-label" style={labelStyle}>{t('sale.discount')} (%)</label>
                  <input type="number" {...field('discount')} />
                </div>
              </div>
              {/* 2-col row: Tax + SKU */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div>
                  <label className="form-label" style={labelStyle}>{t('sale.tax')} (%)</label>
                  <input type="number" {...field('tax')} />
                </div>
                <div>
                  <label className="form-label" style={labelStyle}>SKU</label>
                  <input {...field('sku')} />
                </div>
              </div>
            </div>
          </form>
        </div>
        <div className="drawer-footer product-drawer-footer" style={{ padding: '0.7rem 1rem', gap: '0.5rem' }}>
          <button type="button" className="btn-premium btn-premium-secondary" onClick={onClose} style={{ padding: '0.5rem 1.25rem', fontSize: '0.82rem', flex: 1, justifyContent: 'center' }}>{t('common.cancel')}</button>
          <button type="submit" form="product-form" className="btn-premium btn-premium-primary" disabled={saving} style={{ padding: '0.5rem 1.25rem', fontSize: '0.82rem', flex: 1, justifyContent: 'center' }}>
            {saving ? <><span className="spinner-border spinner-border-sm" /> Saving...</> : <><BiCheck /> {t('common.save')}</>}
          </button>
        </div>
      </div>
    </>
  );
};

export default ProductDrawer;