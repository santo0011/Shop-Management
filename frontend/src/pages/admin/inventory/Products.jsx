import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../../services/api';
import { BiSearch, BiPlus, BiEdit, BiTrash, BiX, BiCheck } from 'react-icons/bi';

const emptyForm = {
  name: '', nameBn: '', sku: '', barcode: '', category: '',
  unit: 'piece', purchasePrice: '', sellingPrice: '', wholesalePrice: '',
  stock: '', minStock: '10', trackStock: true, discount: 0, tax: 0,
};

const REQUIRED_FIELDS = ['name', 'category', 'purchasePrice', 'sellingPrice', 'stock'];

const validateField = (name, value) => {
  switch (name) {
    case 'name':
      return String(value || '').trim() ? '' : 'Product name is required';
    case 'category':
      return value ? '' : 'Category is required';
    case 'purchasePrice':
      return value !== '' && value !== null && Number(value) >= 0 ? '' : 'Enter a valid purchase price';
    case 'sellingPrice':
      return value !== '' && value !== null && Number(value) >= 0 ? '' : 'Enter a valid selling price';
    case 'stock':
      return value !== '' && value !== null && Number(value) >= 0 ? '' : 'Enter a valid stock quantity';
    default:
      return '';
  }
};

const ProductDrawer = ({ open, onClose, onSuccess, editing, categories, units, t }) => {
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
        await api.put(`/products/${editing._id}`, form);
      } else {
        await api.post('/products', form);
      }
      onSuccess();
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
                  <label className="form-label">{t('product.productName')} (EN)</label>
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
                  <label className="form-label">{t('product.category')}</label>
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
                  <label className="form-label">{t('product.purchasePrice')}</label>
                  <input type="number" {...field('purchasePrice')} />
                  {errors.purchasePrice && <div className="invalid-feedback-premium">{errors.purchasePrice}</div>}
                </div>
              </div>
              <div className="col-md-4">
                <div className="form-group mb-0">
                  <label className="form-label">{t('product.sellingPrice')}</label>
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
                  <label className="form-label">{t('product.stock')}</label>
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

const Products = () => {
  const { t } = useTranslation();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/products?search=${search}`);
      setProducts(data.products);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data } = await api.get('/categories');
      setCategories(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => fetchProducts(), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleEdit = (product) => {
    setEditing(product);
    setDrawerOpen(true);
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/products/${id}`);
      setDeleteConfirm(null);
      fetchProducts();
    } catch (err) {
      console.error(err);
    }
  };

  const units = [
    { value: 'kg', label: t('units.kg') },
    { value: 'gram', label: t('units.gram') },
    { value: 'liter', label: t('units.liter') },
    { value: 'ml', label: t('units.ml') },
    { value: 'piece', label: t('units.piece') },
    { value: 'packet', label: t('units.packet') },
    { value: 'box', label: t('units.box') },
    { value: 'carton', label: t('units.carton') },
  ];

  return (
    <div>
      {/* Page Header */}
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h4 className="mb-1" style={{ fontWeight: 800 }}>{t('nav.products')}</h4>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
            Manage your product inventory
          </p>
        </div>
        <button className="btn-premium btn-premium-primary" onClick={() => { setEditing(null); setDrawerOpen(true); }}>
          <BiPlus /> {t('product.addProduct')}
        </button>
      </div>

      {/* Search */}
      <div className="mb-3" style={{ maxWidth: '400px' }}>
        <div className="search-box">
          <BiSearch className="search-icon" />
          <input
            className="form-control"
            placeholder={`${t('common.search')} products...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Products Table */}
      <div className="table-container">
        <div className="table-responsive">
          <table className="table-custom mb-0">
            <thead>
              <tr>
                <th>{t('product.productName')}</th>
                <th>{t('product.category')}</th>
                <th>{t('product.sellingPrice')}</th>
                <th>{t('product.stock')}</th>
                <th>{t('common.status')}</th>
                <th style={{ width: '120px' }}>{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-5" style={{ color: 'var(--text-muted)' }}>
                    <div className="spinner-border spinner-border-sm me-2" /> Loading...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-5" style={{ color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem', opacity: 0.5 }}>📦</div>
                    No products found
                  </td>
                </tr>
              ) : products.map((product) => (
                <tr key={product._id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{product.name}</div>
                    {product.nameBn && <small style={{ color: 'var(--text-muted)' }}>{product.nameBn}</small>}
                  </td>
                  <td>{product.category?.name || '-'}</td>
                  <td>৳{product.sellingPrice}</td>
                  <td>
                    <span style={product.stock <= product.minStock ? { color: 'var(--danger)', fontWeight: 700 } : undefined}>
                      {product.stock} {product.unit}
                    </span>
                  </td>
                  <td>
                    {product.stock <= product.minStock ? (
                      <span className="badge badge-danger">{t('common.lowStock') || 'Low'}</span>
                    ) : (
                      <span className="badge badge-success">{t('common.active')}</span>
                    )}
                  </td>
                  <td>
                    <div className="d-flex gap-1">
                      <button className="btn-action btn-action-edit" data-tooltip="Edit" onClick={() => handleEdit(product)}>
                        <BiEdit />
                      </button>
                      <button className="btn-action btn-action-delete" data-tooltip="Delete" onClick={() => setDeleteConfirm(product._id)}>
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

      {/* Add / Edit Product Drawer */}
      <ProductDrawer
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setEditing(null); }}
        onSuccess={fetchProducts}
        editing={editing}
        categories={categories}
        units={units}
        t={t}
      />

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="modal-premium" onClick={() => setDeleteConfirm(null)}>
          <div className="modal-premium-content" style={{ maxWidth: '420px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-premium-header">
              <h5>Delete Product</h5>
              <button className="btn-close-premium" onClick={() => setDeleteConfirm(null)}><BiX /></button>
            </div>
            <div className="modal-premium-body text-center">
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--glow-danger)', color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', margin: '0 auto 1.25rem' }}><BiTrash /></div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>Are you sure you want to delete this product? This action cannot be undone.</p>
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

export default Products;
