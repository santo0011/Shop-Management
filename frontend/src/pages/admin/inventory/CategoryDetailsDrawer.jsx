import React, { useState, useEffect, useCallback } from 'react';
import api from '../../../services/api';
import {
  BiX, BiCategory, BiPackage, BiCheckCircle, BiCalendar,
  BiTime, BiInfoCircle, BiDollar, BiCube,
} from 'react-icons/bi';
import { useNavigate } from 'react-router-dom';

// ─── Helpers ───────────────────────────────────────────────────
const formatCurrency = (val) => `₹${Number(val || 0).toFixed(2)}`;
const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const formatDateTime = (d) =>
  d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

// ─── Summary Card (no icon) ────────────────────────────────────
const SummaryCard = ({ label, value, color }) => {
  const colorMap = {
    primary: { text: 'var(--primary)' },
    success: { text: '#00D9A6' },
    warning: { text: 'var(--warning)' },
    danger: { text: 'var(--danger)' },
  };
  const colors = colorMap[color] || colorMap.primary;

  return (
    <div className="category-summary-card">
      <div className="category-summary-info">
        <span className="category-summary-value" style={{ color: colors.text }}>{value}</span>
        <span className="category-summary-label">{label}</span>
      </div>
    </div>
  );
};

// ─── Info Row ──────────────────────────────────────────────────
const InfoRow = ({ icon: Icon, label, value }) => (
  <div className="category-info-row">
    <div className="category-info-icon"><Icon size={14} /></div>
    <div className="category-info-content">
      <span className="category-info-label">{label}</span>
      <span className="category-info-value">{value || '—'}</span>
    </div>
  </div>
);

// ─── Category Details Drawer ───────────────────────────────────
const CategoryDetailsDrawer = ({ open, categoryId, onClose, t }) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const navigate = useNavigate();

  const fetchDetails = useCallback(async () => {
    if (!categoryId) return;
    setLoading(true);
    try {
      const { data: res } = await api.get(`/categories/${categoryId}/details`, { _skipLoading: true });
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [categoryId]);

  useEffect(() => {
    if (open && categoryId) {
      fetchDetails();
    }
  }, [open, categoryId, fetchDetails]);

  // Esc key to close
  useEffect(() => {
    if (!open) return;
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [open, onClose]);

  // Lock background scroll
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const handleViewAllProducts = () => {
    navigate(`/products?category=${categoryId}`);
    onClose();
  };

  const category = data?.category;
  const summary = data?.summary;
  const products = data?.products || [];

  return (
    <>
      <div className={`drawer-overlay ${open ? 'open' : ''}`} onClick={onClose} />
      <div className={`drawer category-details-drawer ${open ? 'open' : ''}`}>
        <div className="drawer-header">
          <h5 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BiCategory size={18} />
            {t('categoriesPage.detailsTitle') || 'Category Details'}
          </h5>
          <button className="btn-close-premium" onClick={onClose}><BiX /></button>
        </div>
        <div className="drawer-body" style={{ overflowX: 'hidden' }}>
          {!open ? null : loading || !category ? (
            <div className="text-center py-5" style={{ color: 'var(--text-muted)' }}>
              <div className="spinner-border spinner-border-sm me-2" /> {t('common.loading')}
            </div>
          ) : (
            <>
              {/* ─── Profile Header ───────────────────────────── */}
              <div className="category-details-hero">
                <div className="category-details-avatar">
                  <BiCategory size={22} />
                </div>
                <div className="category-details-hero-info">
                  <h4>{category.name}</h4>
                  {category.nameBn && (
                    <span className="category-details-name-bn">{category.nameBn}</span>
                  )}
                </div>
                <div className="category-details-hero-status">
                  <span
                    className="category-status-badge"
                    style={{
                      background: category.isActive !== false
                        ? 'rgba(46, 204, 113, 0.12)'
                        : 'rgba(255, 107, 107, 0.12)',
                      color: category.isActive !== false ? '#2ecc71' : '#FF6B6B',
                    }}
                  >
                    {category.isActive !== false ? (t('common.active') || 'Active') : (t('common.inactive') || 'Inactive')}
                  </span>
                </div>
              </div>

              {/* ─── Summary Cards ────────────────────────────── */}
              <div className="category-summary-grid">
                <SummaryCard
                  label={t('categoriesPage.totalProducts') || 'Total Products'}
                  value={summary?.totalProducts || 0}
                  color="primary"
                />
                <SummaryCard
                  label={t('categoriesPage.activeProducts') || 'Active Products'}
                  value={summary?.activeProducts || 0}
                  color="success"
                />
                <SummaryCard
                  label={t('categoriesPage.totalStock') || 'Total Stock'}
                  value={summary?.totalStock || 0}
                  color="warning"
                />
              </div>

              {/* ─── Category Information Card ────────────────── */}
              <div className="category-details-section">
                <h6 className="category-details-section-title">
                  <BiInfoCircle size={15} /> {t('categoriesPage.categoryInfo') || 'Category Information'}
                </h6>
                <div className="category-info-card">
                  <InfoRow icon={BiCategory} label={t('product.productName') + ' (EN)' || 'Name (EN)'} value={category.name} />
                  {category.nameBn && (
                    <InfoRow icon={BiCategory} label={t('product.productName') + ' (BN)' || 'Name (BN)'} value={category.nameBn} />
                  )}
                  {category.description && (
                    <InfoRow icon={BiInfoCircle} label={t('common.description') || 'Description'} value={category.description} />
                  )}
                  <InfoRow
                    icon={BiCheckCircle}
                    label={t('common.status') || 'Status'}
                    value={
                      <span
                        className="category-status-badge category-status-badge-sm"
                        style={{
                          background: category.isActive !== false
                            ? 'rgba(46, 204, 113, 0.12)'
                            : 'rgba(255, 107, 107, 0.12)',
                          color: category.isActive !== false ? '#2ecc71' : '#FF6B6B',
                        }}
                      >
                        {category.isActive !== false ? 'Active' : 'Inactive'}
                      </span>
                    }
                  />
                  <InfoRow icon={BiCalendar} label={t('categoriesPage.created') || 'Created Date'} value={formatDate(category.createdAt)} />
                  <InfoRow icon={BiTime} label={t('categoriesPage.lastUpdated') || 'Last Updated'} value={formatDateTime(category.updatedAt)} />
                </div>
              </div>

              {/* ─── Products Using This Category ─────────────── */}
              {products.length > 0 && (
                <div className="category-details-section">
                  <h6 className="category-details-section-title">
                    <BiPackage size={15} /> {t('categoriesPage.productsUsingCategory') || 'Products Using This Category'}
                  </h6>
                  <div className="category-products-list">
                    {products.map((product) => (
                      <div key={product._id} className="category-product-item">
                        <div className="category-product-info">
                          <span className="category-product-name">{product.name}</span>
                          <div className="category-product-meta">
                            <span className="category-product-meta-item">
                              <BiCube size={12} />
                              {t('common.stock') || 'Stock'}: {product.stock || 0}
                            </span>
                            <span className="category-product-meta-item">
                              <BiDollar size={12} />
                              {formatCurrency(product.sellingPrice)}
                            </span>
                          </div>
                        </div>
                        <div className="category-product-status">
                          <span
                            className="category-status-badge category-status-badge-sm"
                            style={{
                              background: product.isActive !== false
                                ? 'rgba(46, 204, 113, 0.12)'
                                : 'rgba(255, 107, 107, 0.12)',
                              color: product.isActive !== false ? '#2ecc71' : '#FF6B6B',
                            }}
                          >
                            {product.isActive !== false ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button className="category-view-all-btn" onClick={handleViewAllProducts}>
                    <BiPackage size={14} /> {t('categoriesPage.viewAllProducts') || 'View All Products'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default CategoryDetailsDrawer;