import React, { useState, useEffect, useCallback } from 'react';
import api from '../../../services/api';
import { useNavigate } from 'react-router-dom';
import {
  BiX, BiPackage, BiDollar, BiCube, BiCategory,
  BiBarcode, BiCalendar, BiTime, BiInfoCircle,
  BiCheckCircle, BiHash, BiTag, BiBook, BiTrendingUp, BiTrendingDown,
  BiPurchaseTag, BiPalette, BiBadgeCheck, BiRuler,
} from 'react-icons/bi';
import useBusinessConfig from '../../../hooks/useBusinessConfig';

// ─── Helpers ───────────────────────────────────────────────────
const formatCurrency = (val) => `₹${(val || 0).toFixed(2)}`;
const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const formatDateTime = (d) =>
  d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

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
  const [activeTab, setActiveTab] = useState('overview');
  const navigate = useNavigate();
  const { modules } = useBusinessConfig();

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
      setActiveTab('overview');
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
        return { label: t('product.inStock') || 'In Stock', color: '#2ecc71' };
      case 'low_stock':
        return { label: t('product.lowStock') || 'Low Stock', color: '#FFB545' };
      case 'out_of_stock':
        return { label: t('product.outOfStock') || 'Out of Stock', color: '#FF6B6B' };
      default:
        return { label: t('product.inStock') || 'In Stock', color: '#2ecc71' };
    }
  };

  const stockInfo = getStockStatusInfo(inventory?.stockStatus);
  const profitMarginNum = product?.purchasePrice > 0
    ? ((product.sellingPrice - product.purchasePrice) / product.purchasePrice * 100)
    : 0;
  const profitMargin = profitMarginNum.toFixed(1);
  const marginTone = profitMarginNum < 5 ? 'bad' : profitMarginNum < 20 ? 'ok' : 'good';

  const displayName = getDisplayName();
  const displayCategory = getCategoryName();
  const displayDescription = getDescription();

  // Stock-health gauge — scaled against 2x the reorder threshold (or the
  // current stock itself, if that's higher) so the fill and the reorder
  // marker both stay meaningfully positioned regardless of the product's
  // actual quantities.
  const currentStock = inventory?.currentStock || 0;
  const minStock = inventory?.minStock || 0;
  const gaugeMax = Math.max(currentStock, minStock * 2, 10);
  const gaugeFillPct = Math.min(100, (currentStock / gaugeMax) * 100);
  const gaugeMarkerPct = minStock > 0 ? Math.min(96, (minStock / gaugeMax) * 100) : null;

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
              {/* ─── Hero: identity + price + margin ─────────────── */}
              <div className="pd-hero">
                <div className="pd-hero-blob" />
                <div className="pd-hero-top">
                  <div className="pd-avatar">
                    {product.image ? (
                      <img src={product.image} alt={product.name} />
                    ) : (
                      <BiPackage size={26} />
                    )}
                  </div>
                  <span
                    className="product-status-badge"
                    style={{
                      background: product.isActive !== false ? 'rgba(46, 204, 113, 0.15)' : 'rgba(255, 107, 107, 0.15)',
                      color: product.isActive !== false ? '#2ecc71' : '#FF6B6B',
                    }}
                  >
                    {product.isActive !== false ? (t('common.active') || 'Active') : (t('common.inactive') || 'Inactive')}
                  </span>
                </div>

                <h4 className="pd-name">{displayName}</h4>

                <div className="pd-chips">
                  {product.sku && (
                    <span className="product-details-meta-chip"><BiHash size={11} /> {product.sku}</span>
                  )}
                  {product.barcode && (
                    <span className="product-details-meta-chip"><BiBarcode size={11} /> {product.barcode}</span>
                  )}
                  {displayCategory !== '-' && (
                    <span className="product-details-meta-chip"><BiCategory size={11} /> {displayCategory}</span>
                  )}
                </div>

                <div className="pd-price-row">
                  <div className="pd-price-tag">
                    <span className="pd-price-label">{t('product.sellingPrice') || 'Selling Price'}</span>
                    <span className="pd-price-value">{formatCurrency(product.sellingPrice)}</span>
                  </div>
                  <div className={`pd-margin-badge pd-margin-${marginTone}`}>
                    {profitMarginNum >= 0 ? <BiTrendingUp size={13} /> : <BiTrendingDown size={13} />}
                    {profitMargin}%
                    <span className="pd-margin-caption">{t('productsPage.profitMargin') || 'Margin'}</span>
                  </div>
                </div>

                <button className="product-ledger-btn" onClick={handleGoToLedger}>
                  <BiBook size={14} /> {t('productsPage.viewLedger') || 'Product Ledger'}
                </button>
              </div>

              {/* ─── Stock health gauge (unique to this drawer) ──── */}
              <div className="pd-gauge-card">
                <div className="pd-gauge-head">
                  <span className="pd-gauge-title"><BiCube size={14} /> {t('product.stock') || 'Stock Health'}</span>
                  <span className="pd-gauge-status" style={{ color: stockInfo.color }}>{stockInfo.label}</span>
                </div>
                <div className="pd-gauge-track">
                  <div className="pd-gauge-fill" style={{ width: `${gaugeFillPct}%`, background: stockInfo.color }} />
                  {gaugeMarkerPct !== null && (
                    <div className="pd-gauge-marker" style={{ left: `${gaugeMarkerPct}%` }} title={`${t('product.minStock') || 'Min Stock'}: ${minStock}`} />
                  )}
                </div>
                <div className="pd-gauge-foot">
                  <span><strong>{currentStock}</strong> {product.unit || ''}</span>
                  <span>{t('product.minStock') || 'Reorder at'}: {minStock}</span>
                  <span>{t('productsPage.stockValue') || 'Value'}: {formatCurrency(summary?.stockValue || 0)}</span>
                </div>
              </div>

              {/* ─── Tabs: Overview / Stock & Pricing ────────────── */}
              <div className="pd-tabs">
                <button
                  className={`pd-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
                  onClick={() => setActiveTab('overview')}
                >
                  <BiInfoCircle size={14} /> {t('common.overview') || 'Overview'}
                </button>
                <button
                  className={`pd-tab-btn ${activeTab === 'stock' ? 'active' : ''}`}
                  onClick={() => setActiveTab('stock')}
                >
                  <BiCube size={14} /> {t('productsPage.inventoryInfo') || 'Stock & Pricing'}
                </button>
              </div>

              {activeTab === 'overview' && (
                <div className="product-info-card product-info-two-col">
                  <InfoRow icon={BiPackage} label={t('product.productName') || 'Name'} value={displayName} />
                  <InfoRow icon={BiCategory} label={t('product.category') || 'Category'} value={displayCategory} />
                  {product.barcode && (
                    <InfoRow icon={BiBarcode} label={t('product.barcode') || 'Barcode'} value={product.barcode} />
                  )}
                  {product.sku && (
                    <InfoRow icon={BiHash} label={t('product.sku') || 'SKU'} value={product.sku} />
                  )}
                  <InfoRow icon={BiCategory} label={t('product.unit') || 'Unit'} value={product.unit || '-'} />
                  {product.expiryDate && (
                    <InfoRow icon={BiCalendar} label={t('product.expiryDate') || 'Expiry Date'} value={formatDate(product.expiryDate)} />
                  )}
                  {product.tax > 0 && (
                    <InfoRow icon={BiTag} label={t('sale.tax') || 'Tax / VAT'} value={`${product.tax}%`} />
                  )}
                  {modules.batch && product.batchNumber && (
                    <InfoRow icon={BiHash} label={t('product.batchNumber') || 'Batch Number'} value={product.batchNumber} />
                  )}
                  {modules.brand && product.brand && (
                    <InfoRow icon={BiPurchaseTag} label={t('product.brand') || 'Brand'} value={product.brand} />
                  )}
                  {modules.size && product.size && (
                    <InfoRow icon={BiRuler} label={t('product.size') || 'Size'} value={product.size} />
                  )}
                  {modules.color && product.color && (
                    <InfoRow icon={BiPalette} label={t('product.color') || 'Color'} value={product.color} />
                  )}
                  {modules.serialNumber && product.serialNumber && (
                    <InfoRow icon={BiHash} label={t('product.serialNumber') || 'Serial Number'} value={product.serialNumber} />
                  )}
                  {modules.modelNumber && product.modelNumber && (
                    <InfoRow icon={BiTag} label={t('product.modelNumber') || 'Model Number'} value={product.modelNumber} />
                  )}
                  {modules.warranty && product.warranty && (
                    <InfoRow icon={BiBadgeCheck} label={t('product.warranty') || 'Warranty'} value={product.warranty} />
                  )}
                  {modules.dimensions && (product.length || product.width) && (
                    <InfoRow icon={BiRuler} label={`${t('product.length') || 'Length'} / ${t('product.width') || 'Width'}`} value={`${product.length || '-'} / ${product.width || '-'}`} />
                  )}
                  {displayDescription && (
                    <InfoRow icon={BiInfoCircle} label={t('common.description') || 'Description'} value={displayDescription} />
                  )}
                  <InfoRow icon={BiCalendar} label={t('categoriesPage.created') || 'Created Date'} value={formatDate(product.createdAt)} />
                  <InfoRow icon={BiTime} label={t('categoriesPage.lastUpdated') || 'Last Updated'} value={formatDateTime(product.updatedAt)} />
                </div>
              )}

              {activeTab === 'stock' && (
                <div className="product-info-card product-info-two-col">
                  <InfoRow icon={BiDollar} label={t('product.purchasePrice') || 'Purchase Price'} value={formatCurrency(product.purchasePrice || 0)} />
                  <InfoRow icon={BiDollar} label={t('product.sellingPrice') || 'Selling Price'} value={formatCurrency(product.sellingPrice || 0)} />
                  <InfoRow icon={BiTrendingUp} label={t('productsPage.profitMargin') || 'Profit Margin'} value={`${profitMargin}%`} />
                  <InfoRow icon={BiCube} label={t('product.stock') || 'Current Stock'} value={`${currentStock} ${product.unit || ''}`} />
                  <InfoRow icon={BiCube} label={t('product.minStock') || 'Min Stock'} value={minStock} />
                  <InfoRow icon={BiCube} label={t('productsPage.stockValue') || 'Stock Value'} value={formatCurrency(summary?.stockValue || 0)} />
                  <InfoRow
                    icon={BiCheckCircle}
                    label={t('common.status') || 'Stock Status'}
                    value={<span className="product-status-badge product-status-badge-sm" style={{ background: `${stockInfo.color}22`, color: stockInfo.color }}>{stockInfo.label}</span>}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default ProductDetailsDrawer;
