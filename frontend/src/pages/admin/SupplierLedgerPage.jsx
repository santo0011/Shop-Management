import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  BiArrowBack, BiCart, BiDollar, BiWallet,
  BiPhone, BiCalendar, BiReceipt, BiBuilding,
  BiCheckCircle, BiErrorCircle, BiShow, BiChevronUp,
} from 'react-icons/bi';
import api from '../../services/api';
import ExpandableCard from '../../components/common/ExpandableCard';

// ─── Helpers ───────────────────────────────────────────────────
const formatCurrency = (val) => `₹${Number(val || 0).toFixed(2)}`;
const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const statusMeta = {
  paid: { bg: 'rgba(46, 204, 113, 0.12)', color: '#2ecc71', label: 'Paid' },
  partial: { bg: 'rgba(255, 181, 69, 0.12)', color: '#F39C12', label: 'Partial' },
  unpaid: { bg: 'rgba(255, 107, 107, 0.12)', color: '#FF6B6B', label: 'Unpaid' },
};

// GST type isn't a stored enum on Purchase — derived purely for display from
// whichever tax amounts are actually present (no calculation, just a label).
const gstTypeLabel = (data, t) => {
  if ((data.cgst || 0) > 0 || (data.sgst || 0) > 0) return t('suppliersPage.gstTypeIntra');
  if ((data.igst || 0) > 0) return t('suppliersPage.gstTypeInter');
  return t('suppliersPage.gstTypeNone');
};

// ─── Expandable Purchase Details (Sections 1–5) ──────────────────
// Renders from the full purchase doc (GET /purchases/:id) — every figure
// here is either a direct field or a simple derived display value, exactly
// mirroring the same math already used in the Add Purchase drawer. No
// backend calculation is touched.
const PurchaseExpandDetails = ({ data, loading, t, previousDueUsed, runningBalance }) => {
  if (loading) {
    return (
      <div className="ledger-expand-loading">
        <span className="spinner-border spinner-border-sm" /> {t('common.loading')}
      </div>
    );
  }
  if (!data) return null;

  const st = statusMeta[data.paymentStatus] || statusMeta.unpaid;

  return (
    <div className="ledger-expand-panel">
      {/* Section 1 — Purchase Information */}
      <div className="ledger-expand-section">
        <div className="ledger-expand-section__title">{t('suppliersPage.purchaseInfo')}</div>
        <div className="ledger-expand-info-grid">
          <div className="ledger-expand-info-item">
            <span className="ledger-expand-info-item__label">{t('purchasesPage.supplierInvoiceNo')}</span>
            <span className="ledger-expand-info-item__value">{data.supplierInvoiceNo || '-'}</span>
          </div>
          <div className="ledger-expand-info-item">
            <span className="ledger-expand-info-item__label">{t('purchasesPage.purchaseDate')}</span>
            <span className="ledger-expand-info-item__value">{formatDate(data.purchaseDate)}</span>
          </div>
          <div className="ledger-expand-info-item">
            <span className="ledger-expand-info-item__label">{t('purchase.supplier')}</span>
            <span className="ledger-expand-info-item__value">{data.supplier?.name || '-'}</span>
          </div>
          <div className="ledger-expand-info-item">
            <span className="ledger-expand-info-item__label">{t('suppliersPage.gstType')}</span>
            <span className="ledger-expand-info-item__value">{gstTypeLabel(data, t)}</span>
          </div>
          <div className="ledger-expand-info-item">
            <span className="ledger-expand-info-item__label">{t('common.status')}</span>
            <span className="sales-status-badge" style={{ background: st.bg, color: st.color }}>{st.label}</span>
          </div>
          {previousDueUsed > 0 && (
            <div className="ledger-expand-info-item">
              <span className="ledger-expand-info-item__label">{t('suppliersPage.previousDueUsed')}</span>
              <span className="ledger-expand-info-item__value">{formatCurrency(previousDueUsed)}</span>
            </div>
          )}
          {runningBalance !== undefined && (
            <div className="ledger-expand-info-item">
              <span className="ledger-expand-info-item__label">{t('suppliersPage.runningBalance')}</span>
              <span className="ledger-expand-info-item__value">{formatCurrency(runningBalance)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Section 2 — Product Details */}
      <div className="ledger-expand-section">
        <div className="ledger-expand-section__title">{t('purchasesPage.products')}</div>
        <div className="ledger-expand-table-scroll">
          <table className="purchase-items-table">
            <thead>
              <tr>
                <th>{t('purchasesPage.product')}</th>
                <th>{t('product.sku')}</th>
                <th>{t('purchasesPage.qty')}</th>
                <th>{t('product.unit')}</th>
                <th>{t('product.purchasePrice')}</th>
                <th>{t('sale.discount')}</th>
                <th>{t('sale.tax')}</th>
                <th>{t('purchasesPage.lineTotal')}</th>
              </tr>
            </thead>
            <tbody>
              {(data.items || []).map((item, idx) => (
                <tr key={item.product?._id || idx}>
                  <td>{item.product?.name || t('purchasesPage.unknownProduct')}</td>
                  <td>{item.product?.sku || '-'}</td>
                  <td>{item.quantity}</td>
                  <td>{item.unit}</td>
                  <td>{formatCurrency(item.purchasePrice)}</td>
                  <td>{item.discount ? `${item.discount}%` : '-'}</td>
                  <td>{formatCurrency(item.gstAmount)}</td>
                  <td style={{ fontWeight: 700 }}>{formatCurrency(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 3 — Payment Summary (kept short: just paid & due) */}
      <div className="ledger-expand-section">
        <div className="ledger-expand-section__title">{t('purchasesPage.paymentSummary')}</div>
        <div className="ledger-mini-card-grid">
          <div className="ledger-mini-card ledger-mini-card--success">
            <span className="ledger-mini-card__label">{t('sale.paidAmount')}</span>
            <span className="ledger-mini-card__value">{formatCurrency(data.paidAmount)}</span>
          </div>
          <div className="ledger-mini-card ledger-mini-card--danger">
            <span className="ledger-mini-card__label">{t('purchasesPage.dueAmount')}</span>
            <span className="ledger-mini-card__value">{formatCurrency(data.dueAmount)}</span>
          </div>
        </div>
      </div>

      {/* Section 4 — GST Summary */}
      <div className="ledger-expand-section">
        <div className="ledger-expand-section__title">{t('suppliersPage.gstSummary')}</div>
        <div className="ledger-mini-card-grid">
          <div className="ledger-mini-card ledger-mini-card--info">
            <span className="ledger-mini-card__label">{t('purchasesPage.taxableAmount')}</span>
            <span className="ledger-mini-card__value">{formatCurrency(data.taxableAmount)}</span>
          </div>
          {(data.cgst > 0 || data.sgst > 0) && (
            <>
              <div className="ledger-mini-card ledger-mini-card--primary">
                <span className="ledger-mini-card__label">CGST</span>
                <span className="ledger-mini-card__value">{formatCurrency(data.cgst)}</span>
              </div>
              <div className="ledger-mini-card ledger-mini-card--primary">
                <span className="ledger-mini-card__label">SGST</span>
                <span className="ledger-mini-card__value">{formatCurrency(data.sgst)}</span>
              </div>
            </>
          )}
          {data.igst > 0 && (
            <div className="ledger-mini-card ledger-mini-card--primary">
              <span className="ledger-mini-card__label">IGST</span>
              <span className="ledger-mini-card__value">{formatCurrency(data.igst)}</span>
            </div>
          )}
          <div className="ledger-mini-card ledger-mini-card--success">
            <span className="ledger-mini-card__label">{t('purchasesPage.grandTotal')}</span>
            <span className="ledger-mini-card__value">{formatCurrency(data.totalAmount)}</span>
          </div>
        </div>
      </div>

      {/* Section 5 — Payment History (if available) */}
      {data.paidAmount > 0 && (
        <div className="ledger-expand-section">
          <div className="ledger-expand-section__title">{t('suppliersPage.paymentHistory')}</div>
          <div className="ledger-expand-table-scroll">
            <table className="purchase-items-table">
              <thead>
                <tr>
                  <th>{t('suppliersPage.paymentDate')}</th>
                  <th>{t('suppliersPage.paymentAmount')}</th>
                  <th>{t('sale.paymentMethod')}</th>
                  <th>{t('common.notes')}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{formatDate(data.purchaseDate || data.createdAt)}</td>
                  <td>{formatCurrency(data.paidAmount)}</td>
                  <td style={{ textTransform: 'capitalize' }}>{(data.paymentMethod || '-').replace(/_/g, ' ')}</td>
                  <td>{data.notes || '-'}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── KPI Card ─────────────────────────────────────────────────
const KpiCard = ({ icon: Icon, label, value, accent, glow }) => (
  <div className="ledger-kpi-card" style={{ '--kpi-accent': accent, '--kpi-glow': glow }}>
    <div className="ledger-kpi-icon"><Icon /></div>
    <div style={{ minWidth: 0 }}>
      <div className="ledger-kpi-value">{formatCurrency(value)}</div>
      <div className="ledger-kpi-label">{label}</div>
    </div>
  </div>
);

// ─── Skeleton Loading ────────────────────────────────────────────
const SupplierLedgerSkeletonLoader = () => (
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
          backgroundSize: '200% 100%',
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
        {[1, 2, 3, 4, 5, 6].map((i) => (
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
          {[1, 2, 3, 4, 5, 6].map((c) => (
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

// ─── Inline Grid Skeleton Rows ────────────────────────────────────
const GridSkeletonRows = () => (
  <>
    {[1, 2, 3, 4].map((r) => (
      <div key={r} className="ledger-grid-row" style={{ opacity: 0.5 }}>
        {[1, 2, 3, 4, 5, 6, 7].map((c) => (
          <div key={c} className="ledger-grid-cell">
            <div style={{
              height: 10, width: c === 7 ? 24 : c === 1 ? '70%' : '55%',
              background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
              backgroundSize: '200% 100%', borderRadius: 4,
              animation: 'shimmer 1.5s infinite',
            }} />
          </div>
        ))}
      </div>
    ))}
  </>
);

// ─── Supplier Ledger Page ─────────────────────────────────────
const SupplierLedgerPage = () => {
  const { t } = useTranslation();
  const { supplierId } = useParams();
  const navigate = useNavigate();
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [supplier, setSupplier] = useState(null);
  const [ledgerEntries, setLedgerEntries] = useState([]);
  const [ledgerSummary, setLedgerSummary] = useState(null);
  const isFirstLoad = useRef(true);

  // Accordion state for the "View" details row — only one purchase expanded
  // at a time. Fetched lazily from the existing GET /purchases/:id endpoint
  // (no backend changes) and cached per-id so re-toggling doesn't re-fetch.
  const [expandedPurchaseId, setExpandedPurchaseId] = useState(null);
  const [expandedPurchaseCache, setExpandedPurchaseCache] = useState({});
  const [loadingExpandedId, setLoadingExpandedId] = useState(null);

  const toggleExpand = async (purchaseId) => {
    if (expandedPurchaseId === purchaseId) {
      setExpandedPurchaseId(null);
      return;
    }
    setExpandedPurchaseId(purchaseId);
    if (expandedPurchaseCache[purchaseId]) return;
    setLoadingExpandedId(purchaseId);
    try {
      const { data } = await api.get(`/purchases/${purchaseId}`, { _skipLoading: true });
      setExpandedPurchaseCache((prev) => ({ ...prev, [purchaseId]: data }));
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingExpandedId(null);
    }
  };

  const fetchData = useCallback(async () => {
    if (!supplierId) return;
    if (isFirstLoad.current) {
      setInitialLoading(true);
    } else {
      setRefreshing(true);
    }
    try {
      const [supplierRes, ledgerRes] = await Promise.all([
        api.get(`/suppliers/${supplierId}`, { _skipLoading: true }),
        api.get(`/suppliers/${supplierId}/ledger`, { _skipLoading: true }),
      ]);
      setSupplier(supplierRes.data);
      // Ledger endpoint returns entries oldest-first (for correct running-balance
      // math) — reverse for the newest-first display this page already used.
      setLedgerEntries([...(ledgerRes.data.entries || [])].reverse());
      setLedgerSummary(ledgerRes.data.summary || null);
    } catch (err) {
      console.error(err);
    } finally {
      setInitialLoading(false);
      setRefreshing(false);
      if (isFirstLoad.current) isFirstLoad.current = false;
    }
  }, [supplierId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleBack = () => {
    navigate('/suppliers');
  };

  if (initialLoading) return <SupplierLedgerSkeletonLoader />;

  const totalPurchaseAmount = ledgerSummary?.totalPurchaseAmount || 0;
  const totalPaid = ledgerSummary?.totalPaid || 0;
  const currentDue = ledgerSummary?.currentDue ?? (supplier?.dueAmount || 0);
  const totalPurchases = ledgerSummary?.totalPurchases || 0;

  return (
    <div className="supplier-ledger-page">
      {/* ─── Page titlebar with Back button ────────────────────── */}
      <div className="ledger-titlebar">
        <button className="btn-premium btn-premium-secondary" onClick={handleBack}>
          <BiArrowBack /> {t('common.back')}
        </button>
        <h4 className="ledger-titlebar-heading">{t('suppliersPage.viewLedger') || 'Supplier Ledger'}</h4>
      </div>

      {/* ─── Premium header banner ─────────────────────────────── */}
      <div className="ledger-header-banner">
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', flexWrap: 'wrap', flex: '1 1 320px' }}>
          <div className="ledger-avatar">{(supplier?.name || '?').charAt(0).toUpperCase()}</div>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h2 style={{ margin: '0 0 2px', fontWeight: 800, fontSize: '1.2rem', color: 'var(--text-primary)' }}>
                {supplier?.name}
              </h2>
              <span className={`ledger-status-badge ledger-mobile-status ${supplier?.isActive !== false ? 'is-active' : 'is-inactive'}`}>
                {supplier?.isActive !== false ? <BiCheckCircle size={12} /> : <BiErrorCircle size={12} />}
                {supplier?.isActive !== false ? t('common.active') : t('common.inactive')}
              </span>
            </div>
            {supplier?.company && (
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                <BiBuilding size={13} /> {supplier.company}
              </p>
            )}
            <p className="ledger-header-subtitle" style={{ margin: '2px 0 0', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
              {t('suppliersPage.ledgerSubtitle') || 'Complete purchase history & running balance'}
            </p>

            {/* Desktop pill row — hidden on mobile in favor of the stat tiles below */}
            <div className="ledger-header-meta">
              {supplier?.phone && (
                <span className="ledger-meta-chip"><BiPhone size={13} /> {supplier.phone}</span>
              )}
              {supplier?.createdAt && (
                <span className="ledger-meta-chip"><BiCalendar size={13} /> {t('suppliersPage.created')}: {formatDate(supplier.createdAt)}</span>
              )}
              <span className="ledger-meta-chip"><BiCart size={13} /> {t('suppliersPage.totalPurchases') || 'Total Purchases'}: {totalPurchases}</span>
              <span className={`ledger-meta-chip is-due-highlight ${currentDue > 0 ? '' : 'is-clear'}`}>
                <BiDollar size={13} /> {t('suppliersPage.currentDue') || 'Current Due'}: {formatCurrency(currentDue)}
              </span>
              <span className={`ledger-status-badge ${supplier?.isActive !== false ? 'is-active' : 'is-inactive'}`}>
                {supplier?.isActive !== false ? <BiCheckCircle size={12} /> : <BiErrorCircle size={12} />}
                {supplier?.isActive !== false ? t('common.active') : t('common.inactive')}
              </span>
            </div>

            {/* Mobile-only stat tiles — same style as the Supplier Details drawer's summary cards */}
            <div className="ledger-mobile-stats">
              {supplier?.phone && (
                <div className="ledger-mobile-stat" style={{ '--stat-accent': '#6C63FF' }}>
                  <span className="ledger-mobile-stat__label">{t('auth.phone')}</span>
                  <span className="ledger-mobile-stat__value">{supplier.phone}</span>
                </div>
              )}
              {supplier?.createdAt && (
                <div className="ledger-mobile-stat" style={{ '--stat-accent': 'var(--text-muted)' }}>
                  <span className="ledger-mobile-stat__label">{t('suppliersPage.created')}</span>
                  <span className="ledger-mobile-stat__value">{formatDate(supplier.createdAt)}</span>
                </div>
              )}
              <div className="ledger-mobile-stat" style={{ '--stat-accent': '#00D9A6' }}>
                <span className="ledger-mobile-stat__label">{t('suppliersPage.totalPurchases') || 'Total Purchases'}</span>
                <span className="ledger-mobile-stat__value">{totalPurchases}</span>
              </div>
              <div className="ledger-mobile-stat" style={{ '--stat-accent': currentDue > 0 ? 'var(--danger)' : 'var(--secondary)' }}>
                <span className="ledger-mobile-stat__label">{t('suppliersPage.currentDue') || 'Current Due'}</span>
                <span className="ledger-mobile-stat__value" style={{ color: currentDue > 0 ? 'var(--danger)' : 'var(--text-primary)' }}>{formatCurrency(currentDue)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── KPI grid ───────────────────────────────────────────── */}
      <div className="ledger-kpi-grid">
        <KpiCard icon={BiCart} label={t('suppliersPage.totalPurchases') || 'Total Purchases'} value={totalPurchases} accent="#6C63FF" glow="rgba(108,99,255,0.12)" />
        <KpiCard icon={BiDollar} label={t('suppliersPage.totalPurchaseAmount') || 'Total Purchase Amount'} value={totalPurchaseAmount} accent="#00D9A6" glow="rgba(0,217,166,0.12)" />
        <KpiCard icon={BiWallet} label={t('customersPage.totalPaid') || 'Total Paid'} value={totalPaid} accent="#FFB545" glow="rgba(255,181,69,0.12)" />
        <KpiCard icon={BiReceipt} label={t('suppliersPage.currentDue') || 'Current Due'} value={currentDue} accent="#FF6B6B" glow="rgba(255,107,107,0.12)" />
      </div>

      {/* ─── Purchase History Table ─────────────────────────────── */}
      <div className="ledger-empty-state" style={{ marginBottom: '1rem', padding: '1rem 1.25rem', flexDirection: 'row', justifyContent: 'space-between', textAlign: 'left', borderRadius: 'var(--border-radius-md)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <BiReceipt size={18} style={{ color: 'var(--primary)' }} />
          <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
            {t('customersPage.purchases') || 'Purchases'} ({totalPurchases})
          </span>
        </div>
      </div>

      {ledgerEntries.length === 0 && !refreshing ? (
        <div className="ledger-empty-state">
          <div className="ledger-empty-icon"><BiCart /></div>
          <div className="ledger-empty-title">{t('purchasesPage.noPurchasesFound') || 'No purchases found'}</div>
          <div className="ledger-empty-hint">{t('empty.noPurchases')}</div>
        </div>
      ) : (
        <>
          {/* ─── Desktop List ───────────────────────────────────────
              A CSS Grid, not an HTML <table> — deliberately. A real
              <table> lets a wide nested element (the accordion's product
              table) inflate the whole table's auto-layout column widths,
              which forces a page-wide horizontal scrollbar. Grid cells
              truncate with ellipsis instead of forcing width, so this
              structurally cannot overflow horizontally. */}
          <div className="ledger-grid-table desktop-table">
            <div className="ledger-grid-header">
              <div className="ledger-grid-cell">{t('purchasesPage.purchaseNo') || 'Purchase No'}</div>
              <div className="ledger-grid-cell">{t('purchasesPage.purchaseDate') || 'Date'}</div>
              <div className="ledger-grid-cell">{t('common.total')}</div>
              <div className="ledger-grid-cell">{t('sale.paidAmount') || 'Paid'}</div>
              <div className="ledger-grid-cell">{t('purchasesPage.dueAmount') || 'Due'}</div>
              <div className="ledger-grid-cell">{t('purchasesPage.paymentStatus') || 'Status'}</div>
              <div className="ledger-grid-cell ledger-grid-cell--actions">{t('common.actions')}</div>
            </div>
            {refreshing ? (
              <GridSkeletonRows />
            ) : (
              ledgerEntries.map((e) => {
                const st = statusMeta[e.status] || statusMeta.unpaid;
                const isExpanded = expandedPurchaseId === e.purchaseId;
                return (
                  <React.Fragment key={e.purchaseId}>
                    <div className={`ledger-grid-row ${isExpanded ? 'ledger-row--expanded' : ''}`}>
                      <div className="ledger-grid-cell">
                        <span className="sales-invoice-badge">{e.purchaseNo}</span>
                        {e.previousDueIncluded && (
                          <span className="ledger-fifo-chip" title={t('purchasesPage.previousDueIncludedLabel')}>{t('suppliersPage.previousDueChip')}</span>
                        )}
                      </div>
                      <div className="ledger-grid-cell">{formatDate(e.date)}</div>
                      <div className="ledger-grid-cell"><span className="sales-amount">{formatCurrency(e.purchaseAmount)}</span></div>
                      <div className="ledger-grid-cell"><span className="sales-amount" style={{ color: 'var(--secondary)' }}>{formatCurrency(e.paymentReceived)}</span></div>
                      <div className="ledger-grid-cell">
                        <span className="sales-amount" style={{ color: e.remainingInvoiceDue > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>
                          {formatCurrency(e.remainingInvoiceDue)}
                        </span>
                      </div>
                      <div className="ledger-grid-cell">
                        <span className="sales-status-badge" style={{ background: st.bg, color: st.color }}>
                          {st.label}
                        </span>
                      </div>
                      <div className="ledger-grid-cell ledger-grid-cell--actions">
                        <button
                          type="button"
                          className={`btn-action btn-action-view ${isExpanded ? 'is-active' : ''}`}
                          data-tooltip={t('common.view')}
                          onClick={() => toggleExpand(e.purchaseId)}
                        >
                          {isExpanded ? <BiChevronUp /> : <BiShow />}
                        </button>
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="ledger-expand-wrap">
                        <PurchaseExpandDetails
                          data={expandedPurchaseCache[e.purchaseId]}
                          loading={loadingExpandedId === e.purchaseId}
                          t={t}
                          previousDueUsed={e.previousDueUsed}
                          runningBalance={e.runningBalance}
                        />
                      </div>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </div>

          {/* ─── Mobile Cards ───────────────────────────────────── */}
          <div className={`mobile-cards ${refreshing ? 'is-refreshing' : ''}`}>
            {refreshing ? (
              <div className="text-center py-5" style={{ color: 'var(--text-muted)' }}>
                <div className="spinner-border spinner-border-sm me-2" /> {t('common.loading')}
              </div>
            ) : (
              ledgerEntries.map((e) => {
                const st = statusMeta[e.status] || statusMeta.unpaid;
                const isExpanded = expandedPurchaseId === e.purchaseId;
                return (
                  <ExpandableCard
                    key={e.purchaseId}
                    compact={
                      <>
                        <div className="expandable-card__compact-row">
                          <span className="expandable-card__name">{e.purchaseNo}</span>
                          <span className="expandable-card__price">{formatCurrency(e.purchaseAmount)}</span>
                        </div>
                        <div className="expandable-card__meta">
                          <span className="expandable-card__meta-item">
                            <BiCalendar />
                            <span>{formatDate(e.date)}</span>
                          </span>
                          <span className="expandable-card__stock" style={{ color: st.color }}>
                            {st.label}
                          </span>
                        </div>
                      </>
                    }
                    expanded={
                      <div className="expandable-card__rows">
                        <div className="expandable-card__row">
                          <span className="expandable-card__row-label">{t('common.total')}</span>
                          <span className="expandable-card__row-dots" />
                          <span className="expandable-card__row-value">{formatCurrency(e.purchaseAmount)}</span>
                        </div>
                        {e.previousDueUsed > 0 && (
                          <div className="expandable-card__row">
                            <span className="expandable-card__row-label">{t('suppliersPage.previousDueUsed')}</span>
                            <span className="expandable-card__row-dots" />
                            <span className="expandable-card__row-value" style={{ color: 'var(--secondary)' }}>{formatCurrency(e.previousDueUsed)}</span>
                          </div>
                        )}
                        <div className="expandable-card__row">
                          <span className="expandable-card__row-label">{t('sale.paidAmount') || 'Paid'}</span>
                          <span className="expandable-card__row-dots" />
                          <span className="expandable-card__row-value" style={{ color: 'var(--secondary)' }}>{formatCurrency(e.paymentReceived)}</span>
                        </div>
                        <div className="expandable-card__row">
                          <span className="expandable-card__row-label">{t('purchasesPage.dueAmount') || 'Due'}</span>
                          <span className="expandable-card__row-dots" />
                          <span className="expandable-card__row-value" style={{ color: e.remainingInvoiceDue > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>
                            {formatCurrency(e.remainingInvoiceDue)}
                          </span>
                        </div>
                        <div className="expandable-card__row">
                          <span className="expandable-card__row-label">{t('suppliersPage.runningBalance')}</span>
                          <span className="expandable-card__row-dots" />
                          <span className="expandable-card__row-value" style={{ color: e.runningBalance > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>
                            {formatCurrency(e.runningBalance)}
                          </span>
                        </div>
                        <div className="expandable-card__row">
                          <span className="expandable-card__row-label">{t('purchasesPage.purchaseDate') || 'Date'}</span>
                          <span className="expandable-card__row-dots" />
                          <span className="expandable-card__row-value">{formatDate(e.date)}</span>
                        </div>
                        <button
                          type="button"
                          className={`btn-premium btn-premium-secondary ledger-mobile-view-btn ${isExpanded ? 'is-active' : ''}`}
                          onClick={(ev) => { ev.stopPropagation(); toggleExpand(e.purchaseId); }}
                        >
                          {isExpanded ? <><BiChevronUp /> {t('common.close')}</> : <><BiShow /> {t('common.view')}</>}
                        </button>
                        {isExpanded && (
                          <PurchaseExpandDetails
                            data={expandedPurchaseCache[e.purchaseId]}
                            loading={loadingExpandedId === e.purchaseId}
                            t={t}
                            previousDueUsed={e.previousDueUsed}
                            runningBalance={e.runningBalance}
                          />
                        )}
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

export default SupplierLedgerPage;