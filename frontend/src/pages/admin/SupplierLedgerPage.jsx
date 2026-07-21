import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  BiArrowBack, BiCart, BiDollar, BiWallet,
  BiPhone, BiCalendar, BiReceipt, BiBuilding,
  BiCheckCircle, BiErrorCircle,
} from 'react-icons/bi';
import api from '../../services/api';

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

// ─── Supplier Ledger Page ─────────────────────────────────────
const SupplierLedgerPage = () => {
  const { t } = useTranslation();
  const { supplierId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [supplier, setSupplier] = useState(null);
  const [purchases, setPurchases] = useState([]);

  const fetchData = useCallback(async () => {
    if (!supplierId) return;
    setLoading(true);
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
      setLoading(false);
    }
  }, [supplierId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleBack = () => {
    navigate('/suppliers');
  };

  if (loading || !supplier) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        <div className="spinner-border spinner-border-sm me-2" /> {t('common.loading')}
      </div>
    );
  }

  const totalPurchaseAmount = purchases.reduce((sum, p) => sum + (p.totalAmount || 0), 0);
  const totalPaid = purchases.reduce((sum, p) => sum + (p.paidAmount || 0), 0);
  const currentDue = supplier.dueAmount || 0;
  const totalPurchases = purchases.length;

  return (
    <div>
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
          <div className="ledger-avatar">{(supplier.name || '?').charAt(0).toUpperCase()}</div>
          <div style={{ minWidth: 0 }}>
            <h2 style={{ margin: '0 0 2px', fontWeight: 800, fontSize: '1.2rem', color: 'var(--text-primary)' }}>
              {supplier.name}
            </h2>
            {supplier.company && (
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                <BiBuilding size={13} /> {supplier.company}
              </p>
            )}
            <p style={{ margin: '2px 0 0', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
              {t('suppliersPage.subtitle')}
            </p>

            <div className="ledger-header-meta">
              {supplier.phone && (
                <span className="ledger-meta-chip"><BiPhone size={13} /> {supplier.phone}</span>
              )}
              {supplier.createdAt && (
                <span className="ledger-meta-chip"><BiCalendar size={13} /> Created: {formatDate(supplier.createdAt)}</span>
              )}
              <span className="ledger-meta-chip"><BiCart size={13} /> {t('suppliersPage.totalPurchases') || 'Total Purchases'}: {totalPurchases}</span>
              <span className={`ledger-meta-chip is-due-highlight ${currentDue > 0 ? '' : 'is-clear'}`}>
                <BiDollar size={13} /> {t('suppliersPage.currentDue') || 'Current Due'}: {formatCurrency(currentDue)}
              </span>
              <span className={`ledger-status-badge ${supplier.isActive !== false ? 'is-active' : 'is-inactive'}`}>
                {supplier.isActive !== false ? <BiCheckCircle size={12} /> : <BiErrorCircle size={12} />}
                {supplier.isActive !== false ? 'Active' : 'Inactive'}
              </span>
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

      {purchases.length === 0 ? (
        <div className="ledger-empty-state">
          <div className="ledger-empty-icon"><BiCart /></div>
          <div className="ledger-empty-title">{t('purchasesPage.noPurchasesFound') || 'No purchases found'}</div>
          <div className="ledger-empty-hint">{t('empty.noPurchases')}</div>
        </div>
      ) : (
        <div className="table-container">
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
                {purchases.map((p) => {
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
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupplierLedgerPage;