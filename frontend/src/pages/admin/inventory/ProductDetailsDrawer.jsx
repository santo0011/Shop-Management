import React, { useState, useEffect, useCallback } from 'react';
import api from '../../../services/api';
import { useNavigate } from 'react-router-dom';
import {
  BiX, BiPackage, BiDollar, BiCube, BiCategory,
  BiBarcode, BiCalendar, BiTime, BiInfoCircle,
  BiCheckCircle, BiHash, BiUser, BiTag, BiBook,
} from 'react-icons/bi';

// ─── Helpers ───────────────────────────────────────────────────
const formatCurrency = (val) => `₹${(val || 0).toFixed(2)}`;
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
    <div className="product-summary-card">
      <div className="product-summary-info">
        <span className="product-summary-value" style={{ color: colors.text }}>{value}</span>
        <span className="product-summary-label">{label}</span>
      </div>
    </div>
  );
};

// ─── Info Row ──────────────────────────────────────────────────
const InfoRow = ({ icon: Icon, label, value }) => (
  <div className="product-info-row">
    <div className="product-info-icon"><Icon size={14} /></div>
    <div className="product-info-content">
      <span className="product-info-label">{label}</span>
      <span className="product-info-value">{value || '—'}</span>
    </div>
  </div>
);

// ─── Product Details Drawer ────────────────────────────────────
const ProductDetailsDrawer = ({ open, productId, onClose, t, i18n }) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const navigate = useNavigate();

  const isBn = i18n?.language === 'bn';

  const fetchDetails = useCallback(async () => {
    if (!productId) return;
    setLoading(true);
    try {
      const { data: res } = await api.get(`/products/${productId}/details`, { _skipLoading: true });
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    if (open && productId) {
      fetchDetails();
    }
  }, [open, productId, fetchDetails]);

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

  const handleGoToLedger = () => {
    navigate(`/products/${productId}/ledger`);
    onClose();
  };

  const product = data?.product;
  const summary = data?.summary;
  const inventory = data?.inventory;

  // Language-aware display values
  const getDisplayName = () => {
    if (!product) return '';
    if (isBn && product.nameBn) return product.nameBn;
    return product.name;
  };

  const getCategoryName = () => {
    if (!product?.category) return '-';
    if (isBn && product.category.nameBn) return product.category.nameBn;
    return product.category.name;
  };

  const getDescription = () => {
    if (!product?.description) return null;
    if (isBn && product.descriptionBn) return product.descriptionBn;
    return product.description;
  };

  // Stock status helpers
  const getStockStatusInfo = (status) => {
    switch (status) {
      case 'in_stock':
        return { label: t('product.inStock') || 'In Stock', color: '#2ecc71', bg: 'rgba(46, 204, 113, 0.12)' };
      case 'low_stock':
        return { label: t('product.lowStock') || 'Low Stock', color: '#FFB545', bg: 'rgba(255, 181, 69, 0.12)' };
      case 'out_of_stock':
        return { label: t('product.outOfStock') || 'Out of Stock', color: '#FF6B6B', bg: 'rgba(255, 107, 107, 0.12)' };
      default:
        return { label: t('product.inStock') || 'In Stock', color: '#2ecc71', bg: 'rgba(46, 204, 113, 0.12)' };
    }
  };

  const stockInfo = getStockStatusInfo(inventory?.stockStatus);
  const profitMargin = product?.purchasePrice > 0
    ? ((product.sellingPrice - product.purchasePrice) / product.purchasePrice * 100).toFixed(1)
    : 0;

  const displayName = getDisplayName();
  const displayCategory = getCategoryName();
  const displayDescription = getDescription();

  return (
    <>
      <div className={`drawer-overlay ${open ? 'open' : ''}`} onClick={onClose} />
      <div className={`drawer product-details-drawer ${open ? 'open' : ''}`}>
        <div className="drawer-header">
          <h5 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BiPackage size={18} />
            {t('productsPage.detailsTitle') || 'Product Details'}
          </h5>
          <button className="btn-close-premium" onClick={onClose}><BiX /></button>
        </div>
        <div className="drawer-body" style={{ overflowX: 'hidden' }}>
          {!open ? null : loading || !product ? (
            <div className="text-center py-5" style={{ color: 'var(--text-muted)' }}>
              <div className="spinner-border spinner-border-sm me-2" /> {t('common.loading')}
            </div>
          ) : (
            <>
              {/* ─── Profile Header ───────────────────────────── */}
              <div className="product-details-hero">
                <div className="product-details-avatar">
                  {product.image ? (
                    <img src={product.image} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '14px' }} />
                  ) : (
                    <BiPackage size={22} />
                  )}
                </div>
                <div className="product-details-hero-info">
                  <h4>{displayName}</h4>
                  <div className="product-details-hero-meta">
                    {product.sku && (
                      <span className="product-details-meta-chip">
                        <BiHash size={11} /> SKU: {product.sku}
                      </span>
                    )}
                    {product.barcode && (
                      <span className="product-details-meta-chip">
                        <BiBarcode size={11} /> {product.barcode}
                      </span>
                    )}
                  </div>
                  {/* ─── Product Ledger Button ──────────────────── */}
                  <button className="product-ledger-btn" onClick={handleGoToLedger}>
                    <BiBook size={14} /> {t('productsPage.viewLedger') || 'Product Ledger'}
                  </button>
                </div>
                <div className="product-details-hero-status">
                  <span
                    className="product-status-badge"
                    style={{
                      background: product.isActive !== false
                        ? 'rgba(46, 204, 113, 0.12)'
                        : 'rgba(255, 107, 107, 0.12)',
                      color: product.isActive !== false ? '#2ecc71' : '#FF6B6B',
                    }}
                  >
                    {product.isActive !== false ? (t('common.active') || 'Active') : (t('common.inactive') || 'Inactive')}
                  </span>
                </div>
              </div>

              {/* ─── Summary Cards ────────────────────────────── */}
              <div className="product-summary-grid">
                <SummaryCard
                  label={t('product.stock') || 'Current Stock'}
                  value={summary?.currentStock || 0}
                  color="primary"
                />
                <SummaryCard
                  label={t('product.sellingPrice') || 'Selling Price'}
                  value={formatCurrency(summary?.sellingPrice || 0)}
                  color="success"
                />
                <SummaryCard
                  label={t('productsPage.stockValue') || 'Stock Value'}
                  value={formatCurrency(summary?.stockValue || 0)}
                  color="warning"
                />
              </div>

              {/* ─── Product Information Card ────────────────── */}
              <div className="product-details-section">
                <h6 className="product-details-section-title">
                  <BiInfoCircle size={15} /> {t('productsPage.productInfo') || 'Product Information'}
                </h6>
                <div className="product-info-card product-info-two-col">
                  <InfoRow icon={BiPackage} label={t('product.productName') || 'Name'} value={displayName} />
                  <InfoRow icon={BiCategory} label={t('product.category') || 'Category'} value={displayCategory} />
                  {product.barcode && (
                    <InfoRow icon={BiBarcode} label={t('product.barcode') || 'Barcode'} value={product.barcode} />
                  )}
                  {product.sku && (
                    <InfoRow icon={BiHash} label={t('product.sku') || 'SKU'} value={product.sku} />
                  )}
                  <InfoRow icon={BiDollar} label={t('product.purchasePrice') || 'Purchase Price'} value={formatCurrency(product.purchasePrice || 0)} />
                  <InfoRow icon={BiDollar} label={t('product.sellingPrice') || 'Selling Price'} value={formatCurrency(product.sellingPrice || 0)} />
                  <InfoRow icon={BiCube} label={t('productsPage.profitMargin') || 'Profit Margin'} value={`${profitMargin}%`} />
                  <InfoRow icon={BiCube} label={t('product.stock') || 'Stock'} value={`${product.stock || 0} ${product.unit || ''}`} />
                  <InfoRow icon={BiCube} label={t('product.minStock') || 'Min Stock'} value={product.minStock || 0} />
                  <InfoRow icon={BiCategory} label={t('product.unit') || 'Unit'} value={product.unit || '-'} />
                  {product.expiryDate && (
                    <InfoRow icon={BiCalendar} label={t('product.expiryDate') || 'Expiry Date'} value={formatDate(product.expiryDate)} />
                  )}
                  {product.tax > 0 && (
                    <InfoRow icon={BiTag} label={t('sale.tax') || 'Tax / VAT'} value={`${product.tax}%`} />
                  )}
                  {displayDescription && (
                    <InfoRow icon={BiInfoCircle} label={t('common.description') || 'Description'} value={displayDescription} />
                  )}
                  <InfoRow
                    icon={BiCheckCircle}
                    label={t('common.status') || 'Status'}
                    value={
                      <span
                        className="product-status-badge product-status-badge-sm"
                        style={{
                          background: product.isActive !== false
                            ? 'rgba(46, 204, 113, 0.12)'
                            : 'rgba(255, 107, 107, 0.12)',
                          color: product.isActive !== false ? '#2ecc71' : '#FF6B6B',
                        }}
                      >
                        {product.isActive !== false ? 'Active' : 'Inactive'}
                      </span>
                    }
                  />
                  <InfoRow icon={BiCalendar} label={t('categoriesPage.created') || 'Created Date'} value={formatDate(product.createdAt)} />
                  <InfoRow icon={BiTime} label={t('categoriesPage.lastUpdated') || 'Last Updated'} value={formatDateTime(product.updatedAt)} />
                </div>
              </div>

              {/* ─── Inventory Information ────────────────────── */}
              <div className="product-details-section">
                <h6 className="product-details-section-title">
                  <BiCube size={15} /> {t('productsPage.inventoryInfo') || 'Inventory Information'}
                </h6>
                <div className="product-inventory-card">
                  <div className="product-inventory-row">
                    <span className="product-inventory-label">{t('product.stock') || 'Current Stock'}</span>
                    <span className="product-inventory-value">{inventory?.currentStock || 0} {product?.unit || ''}</span>
                  </div>
                  <div className="product-inventory-row">
                    <span className="product-inventory-label">{t('productsPage.totalStockValue') || 'Total Stock Value'}</span>
                    <span className="product-inventory-value">{formatCurrency(inventory?.totalStockValue || 0)}</span>
                  </div>
                  <div className="product-inventory-row">
                    <span className="product-inventory-label">{t('product.minStock') || 'Minimum Stock'}</span>
                    <span className="product-inventory-value">{inventory?.minStock || 0}</span>
                  </div>
                  <div className="product-inventory-row">
                    <span className="product-inventory-label">{t('common.status') || 'Stock Status'}</span>
                    <span className="product-inventory-value">
                      <span
                        className="product-status-badge product-status-badge-sm"
                        style={{ background: stockInfo.bg, color: stockInfo.color }}
                      >
                        {stockInfo.label}
                      </span>
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default ProductDetailsDrawer;