import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  BiArrowBack, BiCart, BiDollar, BiWallet,
  BiPhone, BiCalendar, BiReceipt, BiBuilding,
  BiCheckCircle, BiErrorCircle,
} from 'react-icons/bi';
import api from '../../services/api';
import ExpandableCard from '../../components/common/ExpandableCard';

// ─── Helpers ───────────────────────────────────────────────────
const formatCurrency = (val) => `₹${(val || 0).toFixed(2)}`;
const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const statusMeta = {
  paid: { bg: 'rgba(46, 204, 113, 0.12)', color: '#2ecc71', label: 'Paid' },
  partial: { bg: 'rgba(255, 181, 69, 0.12)', color: '#F39C12', label: 'Partial' },
  unpaid: { bg: 'rgba(255, 107, 107, 0.12)', color: '#FF6B6B', label: 'Unpaid' },
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

// ─── Inline Table Skeleton Rows ──────────────────────────────────
const TableSkeletonRows = ({ columns = 6 }) => (
  <>
    {[1, 2, 3, 4].map((r) => (
      <tr key={r} style={{ opacity: 0.5 }}>
        {[1, 2, 3, 4, 5, 6].map((c) => (
          <td key={c} style={{ padding: '0.75rem 1rem' }}>
            <div style={{
              height: 10, width: c === 1 ? 60 : c === 6 ? 50 : '35%',
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

// ─── Supplier Ledger Page ─────────────────────────────────────
const SupplierLedgerPage = () => {
  const { t } = useTranslation();
  const { supplierId } = useParams();
  const navigate = useNavigate();
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [supplier, setSupplier] = useState(null);
  const [purchases, setPurchases] = useState([]);
  const isFirstLoad = useRef(true);

  const fetchData = useCallback(async () => {
    if (!supplierId) return;
    if (isFirstLoad.current) {
      setInitialLoading(true);
    } else {
      setRefreshing(true);
    }
    try {
      const [supplierRes, purchasesRes] = await Promise.all([
        api.get(`/suppliers/${supplierId}`, { _skipLoading: true }),
        api.get(`/purchases?supplier=${supplierId}&limit=500`, { _skipLoading: true }),
      ]);
      setSupplier(supplierRes.data);
      setPurchases(purchasesRes.data.purchases || []);
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

  const totalPurchaseAmount = purchases.reduce((sum, p) => sum + (p.totalAmount || 0), 0);
  const totalPaid = purchases.reduce((sum, p) => sum + (p.paidAmount || 0), 0);
  const currentDue = supplier?.dueAmount || 0;
  const totalPurchases = purchases.length;

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

      {purchases.length === 0 && !refreshing ? (
        <div className="ledger-empty-state">
          <div className="ledger-empty-icon"><BiCart /></div>
          <div className="ledger-empty-title">{t('purchasesPage.noPurchasesFound') || 'No purchases found'}</div>
          <div className="ledger-empty-hint">{t('empty.noPurchases')}</div>
        </div>
      ) : (
        <>
          {/* ─── Desktop Table ──────────────────────────────────── */}
          <div className={`table-container desktop-table ${refreshing ? 'is-refreshing' : 'content-visible'}`}>
            <div className="table-responsive">
              <table className="table-custom mb-0">
                <thead>
                  <tr>
                    <th>{t('purchasesPage.purchaseNo') || 'Purchase No'}</th>
                    <th>{t('purchasesPage.purchaseDate') || 'Date'}</th>
                    <th>{t('common.total')}</th>
                    <th>{t('sale.paidAmount') || 'Paid'}</th>
                    <th>{t('purchasesPage.dueAmount') || 'Due'}</th>
                    <th>{t('purchasesPage.paymentStatus') || 'Status'}</th>
                  </tr>
                </thead>
                <tbody>
                  {refreshing ? (
                    <TableSkeletonRows columns={6} />
                  ) : (
                    purchases.map((p) => {
                      const st = statusMeta[p.paymentStatus] || statusMeta.unpaid;
                      return (
                        <tr key={p._id}>
                          <td>
                            <span className="sales-invoice-badge">{p.purchaseNo}</span>
                          </td>
                          <td>
                            <div className="sales-date-cell">
                              <span className="sales-date-text">{formatDate(p.purchaseDate || p.createdAt)}</span>
                            </div>
                          </td>
                          <td><span className="sales-amount">{formatCurrency(p.totalAmount)}</span></td>
                          <td><span className="sales-amount" style={{ color: 'var(--secondary)' }}>{formatCurrency(p.paidAmount)}</span></td>
                          <td>
                            <span className="sales-amount" style={{ color: p.dueAmount > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>
                              {formatCurrency(p.dueAmount)}
                            </span>
                          </td>
                          <td>
                            <span className="sales-status-badge" style={{ background: st.bg, color: st.color }}>
                              {st.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ─── Mobile Cards ───────────────────────────────────── */}
          <div className={`mobile-cards ${refreshing ? 'is-refreshing' : ''}`}>
            {refreshing ? (
              <div className="text-center py-5" style={{ color: 'var(--text-muted)' }}>
                <div className="spinner-border spinner-border-sm me-2" /> {t('common.loading')}
              </div>
            ) : (
              purchases.map((p) => {
                const st = statusMeta[p.paymentStatus] || statusMeta.unpaid;
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
                          <span className="expandable-card__row-value">{formatCurrency(p.totalAmount)}</span>
                        </div>
                        <div className="expandable-card__row">
                          <span className="expandable-card__row-label">{t('sale.paidAmount') || 'Paid'}</span>
                          <span className="expandable-card__row-dots" />
                          <span className="expandable-card__row-value" style={{ color: 'var(--secondary)' }}>{formatCurrency(p.paidAmount)}</span>
                        </div>
                        <div className="expandable-card__row">
                          <span className="expandable-card__row-label">{t('purchasesPage.dueAmount') || 'Due'}</span>
                          <span className="expandable-card__row-dots" />
                          <span className="expandable-card__row-value" style={{ color: p.dueAmount > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>
                            {formatCurrency(p.dueAmount)}
                          </span>
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
    </div>
  );
};

export default SupplierLedgerPage;