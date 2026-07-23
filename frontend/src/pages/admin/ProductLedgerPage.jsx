import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  BiArrowBack, BiPackage, BiDollar, BiCube,
  BiCart, BiCalendar, BiInfoCircle, BiCategory,
  BiBarcode, BiHash, BiCheckCircle, BiErrorCircle,
} from 'react-icons/bi';
import api from '../../services/api';
import ExpandableCard from '../../components/common/ExpandableCard';

// ─── Helpers ───────────────────────────────────────────────────
const formatCurrency = (val) => `₹${(val || 0).toFixed(2)}`;
const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

// ─── KPI Card ─────────────────────────────────────────────────
const KpiCard = ({ icon: Icon, label, value, accent, glow }) => (
  <div className="ledger-kpi-card" style={{ '--kpi-accent': accent, '--kpi-glow': glow }}>
    <div className="ledger-kpi-icon"><Icon /></div>
    <div style={{ minWidth: 0 }}>
      <div className="ledger-kpi-value">{typeof value === 'number' ? formatCurrency(value) : value}</div>
      <div className="ledger-kpi-label">{label}</div>
    </div>
  </div>
);

// ─── Skeleton Loading ────────────────────────────────────────────
const ProductLedgerSkeletonLoader = () => (
  <div>
    <style>{`@keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }`}</style>
    {/* Titlebar */}
    <div className="ledger-titlebar">
      <div style={{
        height: 36, width: 100,
        background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
        backgroundSize: '200% 100%', borderRadius: 8,
        animation: 'shimmer 1.5s infinite',
      }} />
      <div style={{
        height: 24, width: 180, marginLeft: 16,
        background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
        backgroundSize: '200% 100%', borderRadius: 8,
        animation: 'shimmer 1.5s infinite',
      }} />
    </div>

    {/* Header banner skeleton */}
    <div className="ledger-header-banner" style={{ padding: '1.25rem' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
        <div style={{
          width: 48, height: 48, borderRadius: 12,
          background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
          backgroundSize: '200% 100%', borderRadius: 12,
          animation: 'shimmer 1.5s infinite',
        }} />
        <div style={{ flex: 1 }}>
          <div style={{
            height: 20, width: '40%', marginBottom: 8,
            background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
            backgroundSize: '200% 100%', borderRadius: 6,
            animation: 'shimmer 1.5s infinite',
          }} />
          <div style={{
            height: 14, width: '25%', marginBottom: 6,
            background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
            backgroundSize: '200% 100%', borderRadius: 6,
            animation: 'shimmer 1.5s infinite',
          }} />
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} style={{
                height: 24, width: 80,
                background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
                backgroundSize: '200% 100%', borderRadius: 20,
                animation: 'shimmer 1.5s infinite',
              }} />
            ))}
          </div>
        </div>
      </div>
    </div>

    {/* KPI grid skeleton */}
    <div className="ledger-kpi-grid">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="ledger-kpi-card" style={{ padding: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
              backgroundSize: '200% 100%',
              animation: 'shimmer 1.5s infinite',
            }} />
            <div style={{ flex: 1 }}>
              <div style={{
                height: 18, width: '60%', marginBottom: 6,
                background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
                backgroundSize: '200% 100%', borderRadius: 4,
                animation: 'shimmer 1.5s infinite',
              }} />
              <div style={{
                height: 12, width: '40%',
                background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
                backgroundSize: '200% 100%', borderRadius: 4,
                animation: 'shimmer 1.5s infinite',
              }} />
            </div>
          </div>
        </div>
      ))}
    </div>

    {/* Section header skeleton */}
    <div style={{
      height: 20, width: 200, marginBottom: '1rem',
      background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
      backgroundSize: '200% 100%', borderRadius: 6,
      animation: 'shimmer 1.5s infinite',
    }} />

    {/* Table skeleton */}
    <div className="table-container desktop-table" style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-lg)', overflow: 'hidden', background: 'var(--bg-card)' }}>
      <div style={{ display: 'flex', padding: '0.85rem 1rem', background: 'var(--bg-input)', borderBottom: '1px solid var(--border-color)', gap: '1rem' }}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} style={{
            flex: 1, height: 12,
            background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
            backgroundSize: '200% 100%', borderRadius: 4,
            animation: 'shimmer 1.5s infinite',
          }} />
        ))}
      </div>
      {[1, 2, 3, 4].map((r) => (
        <div key={r} style={{
          display: 'flex', padding: '0.75rem 1rem', gap: '1rem',
          borderTop: '1px solid var(--border-color)',
        }}>
          {[1, 2, 3, 4].map((c) => (
            <div key={c} style={{
              flex: 1, height: 10,
              background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
              backgroundSize: '200% 100%', borderRadius: 4,
              animation: 'shimmer 1.5s infinite',
            }} />
          ))}
        </div>
      ))}
    </div>

    {/* Second section header skeleton */}
    <div style={{
      height: 20, width: 180, marginTop: '2rem', marginBottom: '1rem',
      background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
      backgroundSize: '200% 100%', borderRadius: 6,
      animation: 'shimmer 1.5s infinite',
    }} />

    {/* Second table skeleton */}
    <div className="table-container desktop-table" style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-lg)', overflow: 'hidden', background: 'var(--bg-card)' }}>
      <div style={{ display: 'flex', padding: '0.85rem 1rem', background: 'var(--bg-input)', borderBottom: '1px solid var(--border-color)', gap: '1rem' }}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} style={{
            flex: 1, height: 12,
            background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
            backgroundSize: '200% 100%', borderRadius: 4,
            animation: 'shimmer 1.5s infinite',
          }} />
        ))}
      </div>
      {[1, 2, 3, 4].map((r) => (
        <div key={r} style={{
          display: 'flex', padding: '0.75rem 1rem', gap: '1rem',
          borderTop: '1px solid var(--border-color)',
        }}>
          {[1, 2, 3, 4].map((c) => (
            <div key={c} style={{
              flex: 1, height: 10,
              background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
              backgroundSize: '200% 100%', borderRadius: 4,
              animation: 'shimmer 1.5s infinite',
            }} />
          ))}
        </div>
      ))}
    </div>
  </div>
);

// ─── Inline Table Skeleton Rows ──────────────────────────────────
const TableSkeletonRows = ({ columns = 4 }) => (
  <>
    {[1, 2, 3, 4].map((r) => (
      <tr key={r} style={{ opacity: 0.5 }}>
        {[1, 2, 3, 4].map((c) => (
          <td key={c} style={{ padding: '0.75rem 1rem' }}>
            <div style={{
              height: 10, width: c === 1 ? 60 : c === 2 ? '40%' : '30%',
              background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
              backgroundSize: '200% 100%', borderRadius: 4,
              animation: 'shimmer 1.5s infinite',
            }} />
          </td>
        ))}
      </tr>
    ))}
  </>
);

// ─── Product Ledger Page ─────────────────────────────────────
const ProductLedgerPage = () => {
  const { t, i18n } = useTranslation();
  const { productId } = useParams();
  const navigate = useNavigate();
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [product, setProduct] = useState(null);
  const [purchases, setPurchases] = useState([]);
  const [sales, setSales] = useState([]);
  const isFirstLoad = useRef(true);

  const isBn = i18n?.language === 'bn';

  const fetchData = useCallback(async () => {
    if (!productId) return;
    if (isFirstLoad.current) {
      setInitialLoading(true);
    } else {
      setRefreshing(true);
    }
    try {
      const [prodRes, purchasesRes, salesRes] = await Promise.all([
        api.get(`/products/${productId}`, { _skipLoading: true }),
        api.get(`/purchases?product=${productId}&limit=500`, { _skipLoading: true }),
        api.get(`/sales?product=${productId}&limit=500`, { _skipLoading: true }),
      ]);
      setProduct(prodRes.data);
      setPurchases(purchasesRes.data.purchases || []);
      setSales(salesRes.data.sales || []);
    } catch (err) {
      console.error(err);
    } finally {
      setInitialLoading(false);
      setRefreshing(false);
      if (isFirstLoad.current) isFirstLoad.current = false;
    }
  }, [productId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleBack = () => {
    navigate('/products');
  };

  if (initialLoading) return <ProductLedgerSkeletonLoader />;

  const displayName = isBn && product?.nameBn ? product.nameBn : product?.name;
  const displayCategory = product?.category?.name
    ? (isBn && product.category.nameBn ? product.category.nameBn : product.category.name)
    : '-';

  const totalPurchased = purchases.reduce((sum, p) => {
    const items = p.items || [];
    return sum + items.filter(i => String(i.product) === String(productId) || i.product?._id === productId)
      .reduce((s, i) => s + (i.quantity || 0), 0);
  }, 0);

  const soldQuantity = sales.reduce((sum, s) => {
    const items = s.items || [];
    return sum + items.filter(i => String(i.product) === String(productId) || i.product?._id === productId)
      .reduce((s, i) => s + (i.quantity || 0), 0);
  }, 0);

  const currentStock = product?.stock || 0;
  const stockValue = currentStock * (product?.purchasePrice || 0);

  return (
    <div>
      {/* ─── Page titlebar with Back button ────────────────────── */}
      <div className="ledger-titlebar">
        <button className="btn-premium btn-premium-secondary" onClick={handleBack}>
          <BiArrowBack /> {t('common.back')}
        </button>
        <h4 className="ledger-titlebar-heading">{t('productsPage.viewLedger') || 'Product Ledger'}</h4>
      </div>

      {/* ─── Premium header banner ─────────────────────────────── */}
      <div className="ledger-header-banner">
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', flexWrap: 'wrap', flex: '1 1 320px' }}>
          <div className="ledger-avatar" style={{ background: 'var(--gradient-primary)' }}>
            <BiPackage />
          </div>
          <div style={{ minWidth: 0 }}>
            <h2 style={{ margin: '0 0 2px', fontWeight: 800, fontSize: '1.2rem', color: 'var(--text-primary)' }}>
              {displayName}
            </h2>
            {product?.nameBn && isBn && (
              <p style={{ margin: '0 0 4px', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                {product.name}
              </p>
            )}
            <p style={{ margin: '2px 0 0', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
              {t('productsPage.subtitle')}
            </p>

            <div className="ledger-header-meta">
              {product?.sku && (
                <span className="ledger-meta-chip"><BiHash size={13} /> SKU: {product.sku}</span>
              )}
              {product?.barcode && (
                <span className="ledger-meta-chip"><BiBarcode size={13} /> {product.barcode}</span>
              )}
              <span className="ledger-meta-chip"><BiCategory size={13} /> {displayCategory}</span>
              <span className="ledger-meta-chip"><BiCube size={13} /> {t('product.stock') || 'Stock'}: {currentStock}</span>
              <span className={`ledger-status-badge ${product?.isActive !== false ? 'is-active' : 'is-inactive'}`}>
                {product?.isActive !== false ? <BiCheckCircle size={12} /> : <BiErrorCircle size={12} />}
                {product?.isActive !== false ? (t('common.active') || 'Active') : (t('common.inactive') || 'Inactive')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── KPI grid ───────────────────────────────────────────── */}
      <div className="ledger-kpi-grid">
        <KpiCard icon={BiCube} label={t('product.stock') || 'Current Stock'} value={currentStock} accent="#6C63FF" glow="rgba(108,99,255,0.12)" />
        <KpiCard icon={BiCart} label={t('productsPage.totalPurchased') || 'Total Purchased'} value={totalPurchased} accent="#00D9A6" glow="rgba(0,217,166,0.12)" />
        <KpiCard icon={BiPackage} label={t('productsPage.totalSold') || 'Total Sold'} value={soldQuantity} accent="#FFB545" glow="rgba(255,181,69,0.12)" />
        <KpiCard icon={BiDollar} label={t('productsPage.stockValue') || 'Stock Value'} value={stockValue} accent="#FF6B6B" glow="rgba(255,107,107,0.12)" />
      </div>

      {/* ─── Purchase History Section ──────────────────────────── */}
      <div className="ledger-empty-state" style={{ marginBottom: '1rem', padding: '1rem 1.25rem', flexDirection: 'row', justifyContent: 'space-between', textAlign: 'left', borderRadius: 'var(--border-radius-md)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <BiCart size={18} style={{ color: 'var(--primary)' }} />
          <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
            {t('productsPage.purchaseHistory') || 'Purchase History'} ({purchases.length})
          </span>
        </div>
      </div>

      {purchases.length === 0 && !refreshing ? (
        <div className="ledger-empty-state" style={{ marginBottom: '1.5rem' }}>
          <div className="ledger-empty-icon"><BiCart /></div>
          <div className="ledger-empty-title">{t('empty.noPurchases') || 'No purchases found'}</div>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className={`table-container desktop-table ${refreshing ? 'is-refreshing' : 'content-visible'}`} style={{ marginBottom: '1.5rem' }}>
            <div className="table-responsive">
              <table className="table-custom mb-0">
                <thead>
                  <tr>
                    <th>{t('purchasesPage.purchaseNo') || 'Purchase No'}</th>
                    <th>{t('purchasesPage.purchaseDate') || 'Date'}</th>
                    <th>{t('common.quantity') || 'Qty'}</th>
                    <th>{t('common.total')}</th>
                  </tr>
                </thead>
                <tbody>
                  {refreshing ? (
                    <TableSkeletonRows columns={4} />
                  ) : (
                    purchases.map((p) => {
                      const productItems = (p.items || []).filter(
                        i => String(i.product) === String(productId) || i.product?._id === productId
                      );
                      const qty = productItems.reduce((s, i) => s + (i.quantity || 0), 0);
                      return (
                        <tr key={p._id}>
                          <td><span className="sales-invoice-badge">{p.purchaseNo}</span></td>
                          <td>
                            <div className="sales-date-cell">
                              <span className="sales-date-text">{formatDate(p.purchaseDate || p.createdAt)}</span>
                            </div>
                          </td>
                          <td><span className="sales-amount">{qty}</span></td>
                          <td><span className="sales-amount">{formatCurrency(p.totalAmount)}</span></td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile cards */}
          <div className={`mobile-cards ${refreshing ? 'is-refreshing' : ''}`} style={{ marginBottom: '1.5rem' }}>
            {refreshing ? (
              <div className="text-center py-5" style={{ color: 'var(--text-muted)' }}>
                <div className="spinner-border spinner-border-sm me-2" /> {t('common.loading')}
              </div>
            ) : (
              purchases.map((p) => {
                const productItems = (p.items || []).filter(
                  i => String(i.product) === String(productId) || i.product?._id === productId
                );
                const qty = productItems.reduce((s, i) => s + (i.quantity || 0), 0);
                return (
                  <ExpandableCard
                    key={p._id}
                    compact={
                      <>
                        <div className="expandable-card__compact-row">
                          <span className="expandable-card__name">{p.purchaseNo}</span>
                          <span className="expandable-card__price">{formatCurrency(p.totalAmount)}</span>
                        </div>
                        <div className="expandable-card__meta">
                          <span className="expandable-card__meta-item">
                            <BiCalendar />
                            <span>{formatDate(p.purchaseDate || p.createdAt)}</span>
                          </span>
                          <span className="expandable-card__meta-item">
                            <BiCube />
                            <strong>{qty}</strong>
                          </span>
                        </div>
                      </>
                    }
                    expanded={
                      <div className="expandable-card__rows">
                        <div className="expandable-card__row">
                          <span className="expandable-card__row-label">{t('common.quantity') || 'Qty'}</span>
                          <span className="expandable-card__row-dots" />
                          <span className="expandable-card__row-value">{qty}</span>
                        </div>
                        <div className="expandable-card__row">
                          <span className="expandable-card__row-label">{t('common.total')}</span>
                          <span className="expandable-card__row-dots" />
                          <span className="expandable-card__row-value">{formatCurrency(p.totalAmount)}</span>
                        </div>
                        <div className="expandable-card__row">
                          <span className="expandable-card__row-label">{t('purchasesPage.purchaseDate') || 'Date'}</span>
                          <span className="expandable-card__row-dots" />
                          <span className="expandable-card__row-value">{formatDate(p.purchaseDate || p.createdAt)}</span>
                        </div>
                      </div>
                    }
                  />
                );
              })
            )}
          </div>
        </>
      )}

      {/* ─── Sales History Section ─────────────────────────────── */}
      <div className="ledger-empty-state" style={{ marginBottom: '1rem', padding: '1rem 1.25rem', flexDirection: 'row', justifyContent: 'space-between', textAlign: 'left', borderRadius: 'var(--border-radius-md)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <BiPackage size={18} style={{ color: 'var(--secondary)' }} />
          <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
            {t('productsPage.salesHistory') || 'Sales History'} ({sales.length})
          </span>
        </div>
      </div>

      {sales.length === 0 && !refreshing ? (
        <div className="ledger-empty-state">
          <div className="ledger-empty-icon"><BiPackage /></div>
          <div className="ledger-empty-title">{t('empty.noSales') || 'No sales found'}</div>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className={`table-container desktop-table ${refreshing ? 'is-refreshing' : 'content-visible'}`}>
            <div className="table-responsive">
              <table className="table-custom mb-0">
                <thead>
                  <tr>
                    <th>{t('sale.invoice') || 'Invoice'}</th>
                    <th>{t('common.date')}</th>
                    <th>{t('common.quantity') || 'Qty'}</th>
                    <th>{t('sale.total')}</th>
                  </tr>
                </thead>
                <tbody>
                  {refreshing ? (
                    <TableSkeletonRows columns={4} />
                  ) : (
                    sales.map((s) => {
                      const productItems = (s.items || []).filter(
                        i => String(i.product) === String(productId) || i.product?._id === productId
                      );
                      const qty = productItems.reduce((si, i) => si + (i.quantity || 0), 0);
                      return (
                        <tr key={s._id}>
                          <td><span className="sales-invoice-badge">{s.invoiceNo}</span></td>
                          <td>
                            <div className="sales-date-cell">
                              <span className="sales-date-text">{formatDate(s.createdAt)}</span>
                            </div>
                          </td>
                          <td><span className="sales-amount">{qty}</span></td>
                          <td><span className="sales-amount">{formatCurrency(s.totalAmount)}</span></td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile cards */}
          <div className={`mobile-cards ${refreshing ? 'is-refreshing' : ''}`}>
            {refreshing ? (
              <div className="text-center py-5" style={{ color: 'var(--text-muted)' }}>
                <div className="spinner-border spinner-border-sm me-2" /> {t('common.loading')}
              </div>
            ) : (
              sales.map((s) => {
                const productItems = (s.items || []).filter(
                  i => String(i.product) === String(productId) || i.product?._id === productId
                );
                const qty = productItems.reduce((si, i) => si + (i.quantity || 0), 0);
                return (
                  <ExpandableCard
                    key={s._id}
                    compact={
                      <>
                        <div className="expandable-card__compact-row">
                          <span className="expandable-card__name">{s.invoiceNo}</span>
                          <span className="expandable-card__price">{formatCurrency(s.totalAmount)}</span>
                        </div>
                        <div className="expandable-card__meta">
                          <span className="expandable-card__meta-item">
                            <BiCalendar />
                            <span>{formatDate(s.createdAt)}</span>
                          </span>
                          <span className="expandable-card__meta-item">
                            <BiCube />
                            <strong>{qty}</strong>
                          </span>
                        </div>
                      </>
                    }
                    expanded={
                      <div className="expandable-card__rows">
                        <div className="expandable-card__row">
                          <span className="expandable-card__row-label">{t('common.quantity') || 'Qty'}</span>
                          <span className="expandable-card__row-dots" />
                          <span className="expandable-card__row-value">{qty}</span>
                        </div>
                        <div className="expandable-card__row">
                          <span className="expandable-card__row-label">{t('sale.total')}</span>
                          <span className="expandable-card__row-dots" />
                          <span className="expandable-card__row-value">{formatCurrency(s.totalAmount)}</span>
                        </div>
                        <div className="expandable-card__row">
                          <span className="expandable-card__row-label">{t('common.date')}</span>
                          <span className="expandable-card__row-dots" />
                          <span className="expandable-card__row-value">{formatDate(s.createdAt)}</span>
                        </div>
                      </div>
                    }
                  />
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default ProductLedgerPage;