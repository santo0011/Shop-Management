import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { BiX, BiCheck } from 'react-icons/bi';
import useBusinessConfig from '../../hooks/useBusinessConfig';

const emptyForm = {
  name: '', nameBn: '', sku: '', barcode: '', category: '',
  unit: 'piece', purchasePrice: '', sellingPrice: '', wholesalePrice: '',
  stock: '', minStock: '10', trackStock: true, discount: '', tax: '',
  batchNumber: '', expiryDate: '', size: '', color: '', brand: '',
  serialNumber: '', warranty: '', modelNumber: '', length: '', width: '',
};

const REQUIRED_FIELDS = ['name', 'category', 'purchasePrice', 'sellingPrice', 'stock'];

const validateField = (name, value, t) => {
  switch (name) {
    case 'name': return String(value || '').trim() ? '' : t('validation.nameRequired');
    case 'category': return value ? '' : t('validation.categoryRequired');
    case 'purchasePrice': return value !== '' && value !== null && Number(value) >= 0 ? '' : t('validation.invalidPurchasePrice');
    case 'sellingPrice': return value !== '' && value !== null && Number(value) >= 0 ? '' : t('validation.invalidSellingPrice');
    case 'stock': return value !== '' && value !== null && Number(value) >= 0 ? '' : t('validation.invalidStockQuantity');
    default: return '';
  }
};

const ProductDrawer = ({ open, onClose, onSuccess, editing, categories, t, initialName = '' }) => {
  const { modules, units } = useBusinessConfig();
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
      batchNumber: editing.batchNumber || '',
      expiryDate: editing.expiryDate ? String(editing.expiryDate).slice(0, 10) : '',
      size: editing.size || '',
      color: editing.color || '',
      brand: editing.brand || '',
      serialNumber: editing.serialNumber || '',
      warranty: editing.warranty || '',
      modelNumber: editing.modelNumber || '',
      length: editing.length ?? '',
      width: editing.width ?? '',
    } : { ...emptyForm, name: initialName });
  }, [open, editing, initialName]);

  const handleChange = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => {
      if (!(name in prev)) return prev;
      const msg = validateField(name, value, t);
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
      const msg = validateField(field, form[field], t);
      if (msg) newErrors[field] = msg;
    });
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setSaving(true);
    setSubmitError(null);
    try {
      // Blank optional fields (fields hidden for this business type, or left
      // empty) must be omitted rather than sent as '' — an empty string is
      // not a valid Date/Number and would fail schema casting.
      const payload = { ...form };
      ['expiryDate', 'length', 'width'].forEach((key) => {
        if (payload[key] === '' || payload[key] === null) delete payload[key];
      });

      let product;
      if (editing) {
        ({ data: product } = await api.put(`/products/${editing._id}`, payload));
      } else {
        ({ data: product } = await api.post('/products', payload));
      }
      onSuccess(product);
      onClose();
    } catch (err) {
      setSubmitError(err.response?.data?.message || t('product.saveFailed'));
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
                    <option value="">{t('common.select')}</option>
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
                  <label className="form-label" style={labelStyle}>{t('product.sku')}</label>
                  <input {...field('sku')} />
                </div>
              </div>

              {/* Business-type-driven optional fields — only the ones this
                  shop's business type (or its own Settings overrides) uses. */}
              {(modules.batch || modules.expiryDate) && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  {modules.batch && (
                    <div>
                      <label className="form-label" style={labelStyle}>{t('product.batchNumber')}</label>
                      <input {...field('batchNumber')} />
                    </div>
                  )}
                  {modules.expiryDate && (
                    <div>
                      <label className="form-label" style={labelStyle}>{t('product.expiryDate')}</label>
                      <input type="date" {...field('expiryDate')} />
                    </div>
                  )}
                </div>
              )}
              {(modules.size || modules.color) && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  {modules.size && (
                    <div>
                      <label className="form-label" style={labelStyle}>{t('product.size')}</label>
                      <input {...field('size')} />
                    </div>
                  )}
                  {modules.color && (
                    <div>
                      <label className="form-label" style={labelStyle}>{t('product.color')}</label>
                      <input {...field('color')} />
                    </div>
                  )}
                </div>
              )}
              {modules.brand && (
                <div>
                  <label className="form-label" style={labelStyle}>{t('product.brand')}</label>
                  <input {...field('brand')} />
                </div>
              )}
              {(modules.serialNumber || modules.modelNumber) && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  {modules.serialNumber && (
                    <div>
                      <label className="form-label" style={labelStyle}>{t('product.serialNumber')}</label>
                      <input {...field('serialNumber')} />
                    </div>
                  )}
                  {modules.modelNumber && (
                    <div>
                      <label className="form-label" style={labelStyle}>{t('product.modelNumber')}</label>
                      <input {...field('modelNumber')} />
                    </div>
                  )}
                </div>
              )}
              {modules.warranty && (
                <div>
                  <label className="form-label" style={labelStyle}>{t('product.warranty')}</label>
                  <input {...field('warranty')} placeholder={t('product.warrantyPlaceholder')} />
                </div>
              )}
              {modules.dimensions && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <div>
                    <label className="form-label" style={labelStyle}>{t('product.length')}</label>
                    <input type="number" {...field('length')} />
                  </div>
                  <div>
                    <label className="form-label" style={labelStyle}>{t('product.width')}</label>
                    <input type="number" {...field('width')} />
                  </div>
                </div>
              )}
            </div>
          </form>
        </div>
        <div className="drawer-footer product-drawer-footer" style={{ padding: '0.7rem 1rem', gap: '0.5rem' }}>
          <button type="button" className="btn-premium btn-premium-secondary" onClick={onClose} style={{ padding: '0.5rem 1.25rem', fontSize: '0.82rem', flex: 1, justifyContent: 'center' }}>{t('common.cancel')}</button>
          <button type="submit" form="product-form" className="btn-premium btn-premium-primary" disabled={saving} style={{ padding: '0.5rem 1.25rem', fontSize: '0.82rem', flex: 1, justifyContent: 'center' }}>
            {saving ? <><span className="spinner-border spinner-border-sm" /> {t('common.saving')}</> : <><BiCheck /> {t('common.save')}</>}
          </button>
        </div>
      </div>
    </>
  );
};

export default ProductDrawer;