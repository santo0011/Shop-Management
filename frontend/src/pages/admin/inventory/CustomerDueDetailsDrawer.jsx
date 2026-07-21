import React, { useState, useEffect, useCallback } from 'react';
import api from '../../../services/api';
import StatCard from '../../../components/common/StatCard';
import PrintPreview from '../../../components/common/PrintPreview';
import {
  BiX, BiPhone, BiReceipt, BiWallet, BiDollar,
  BiCalendar, BiShow, BiCart, BiCheckCircle,
} from 'react-icons/bi';

// ─── Helpers ───────────────────────────────────────────────────
const formatCurrency = (val) => `₹${(val || 0).toFixed(2)}`;
const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const statusMeta = (t) => ({
  paid: { bg: 'rgba(46, 204, 113, 0.12)', color: '#2ecc71', label: t('common.paid') },
  partial: { bg: 'rgba(255, 181, 69, 0.12)', color: '#F39C12', label: t('common.partial') },
  unpaid: { bg: 'rgba(255, 107, 107, 0.12)', color: '#FF6B6B', label: t('common.due') },
});

const sectionTabs = (t) => [
  { key: 'invoices', label: t('customersPage.dueInvoices'), icon: BiReceipt },
  { key: 'purchases', label: t('customersPage.recentPurchases'), icon: BiCart },
];

const EmptyState = ({ icon, text }) => (
  <div style={{
    padding: '1.5rem 1rem', textAlign: 'center', borderRadius: 'var(--border-radius-md)',
    background: 'var(--bg-input)', border: '1px dashed var(--border-light)',
    color: 'var(--text-muted)', fontSize: '0.8rem',
  }}>
    <div style={{ fontSize: '1.6rem', marginBottom: '0.4rem', opacity: 0.6 }}>{icon}</div>
    {text}
  </div>
);

// ─── Customer Due Details Drawer ────────────────────────────────
// Read-only view built entirely from existing endpoints (getCustomer,
// getCustomerDueSummary, getSale) — no new business logic.
// "View Invoice" / "Print" reuse the existing PrintPreview component
// already used by POS and Sales.
const CustomerDueDetailsDrawer = ({ open, customerId, onClose, t }) => {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [dueDetails, setDueDetails] = useState({ unpaidInvoiceCount: 0, unpaidInvoices: [], recentPurchases: [] });
  const [shopInfo, setShopInfo] = useState(null);
  const [activeSection, setActiveSection] = useState('invoices');
  const [printSale, setPrintSale] = useState(null);

  const fetchAll = useCallback(async () => {
    if (!customerId) return;
    setLoading(true);
    try {
      const [profileRes, dueRes] = await Promise.all([
        api.get(`/customers/${customerId}`, { _skipLoading: true }),
        api.get(`/customers/${customerId}/due-summary`, { _skipLoading: true }),
      ]);
      setProfile(profileRes.data);
      setDueDetails(dueRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    if (open && customerId) {
      setActiveSection('invoices');
      fetchAll();
    } else if (!open) {
      setPrintSale(null);
    }
  }, [open, customerId, fetchAll]);

  useEffect(() => {
    api.get('/shops/my', { _skipLoading: true }).then(({ data }) => setShopInfo(data.shop || data)).catch(() => {});
  }, []);

  const handleViewOrPrint = async (invoiceId) => {
    try {
      const { data } = await api.get(`/sales/${invoiceId}`, { _skipLoading: true });
      setPrintSale(data.sale || data);
    } catch (err) {
      console.error(err);
    }
  };

  const STATUS = statusMeta(t);
  const TABS = sectionTabs(t);
  const dueAmount = profile?.dueAmount || 0;

  return (
    <>
      <div className={`drawer-overlay ${open ? 'open' : ''}`} onClick={onClose} />
      <div className={`drawer due-details-drawer ${open ? 'open' : ''}`}>
        <div className="drawer-header">
          <h5><BiWallet size={18} style={{ marginRight: 8, verticalAlign: 'middle' }} />{t('customersPage.dueDetailsTitle')}</h5>
          <button className="btn-close-premium" onClick={onClose}><BiX /></button>
        </div>
        <div className="drawer-body">
          {loading || !profile ? (
            <div className="text-center py-5" style={{ color: 'var(--text-muted)' }}>
              <div className="spinner-border spinner-border-sm me-2" /> {t('common.loading')}
            </div>
          ) : (
            <>
              {/* ─── Header profile ─────────────────────────────── */}
              <div className="due-details-hero">
                <div className="due-details-avatar">{(profile.name || '?').charAt(0).toUpperCase()}</div>
                <div className="due-details-hero-info">
                  <h4>{profile.name}</h4>
                  {profile.phone && <span className="due-details-phone"><BiPhone size={13} /> {profile.phone}</span>}
                </div>
                <div className="due-details-hero-due">
                  <span className="due-details-hero-due-label">{t('customersPage.currentDue')}</span>
                  <span className="due-details-hero-due-value">{formatCurrency(dueAmount)}</span>
                  <span className="due-details-hero-invoices">
                    {t('customersPage.unpaidInvoicesCount', { count: dueDetails.unpaidInvoiceCount || 0 })}
                  </span>
                </div>
              </div>

              {/* ─── Summary cards ──────────────────────────────── */}
              <div className="due-details-summary-grid">
                <StatCard icon={BiDollar} label={t('customersPage.currentDue')} value={formatCurrency(dueAmount)} color="danger" isCurrency />
                <StatCard icon={BiReceipt} label={t('customersPage.unpaidInvoices')} value={dueDetails.unpaidInvoiceCount || 0} color="warning" />
                <StatCard icon={BiWallet} label={t('customersPage.totalPurchases')} value={formatCurrency(profile.totalPurchases)} color="primary" isCurrency />
                <StatCard icon={BiCheckCircle} label={t('customersPage.totalPaid')} value={formatCurrency(profile.totalPaid)} color="success" isCurrency />
              </div>

              {/* ─── Section tabs ───────────────────────────────── */}
              <div className="due-details-tabs">
                {TABS.map((tab) => (
                  <button
                    key={tab.key}
                    className={`due-details-tab ${activeSection === tab.key ? 'active' : ''}`}
                    onClick={() => setActiveSection(tab.key)}
                  >
                    <tab.icon size={14} /> {tab.label}
                  </button>
                ))}
              </div>

              {/* ─── Due Invoice List ───────────────────────────── */}
              {activeSection === 'invoices' && (
                dueDetails.unpaidInvoices.length === 0 ? (
                  <EmptyState icon="🎉" text={t('customersPage.noUnpaidInvoices')} />
                ) : (
                  <div className="due-details-list">
                    {dueDetails.unpaidInvoices.map((inv) => {
                      const st = STATUS[inv.paymentStatus] || STATUS.unpaid;
                      return (
                        <div key={inv._id} className="due-invoice-card">
                          <div className="due-invoice-top">
                            <span className="due-invoice-no">{inv.invoiceNo}</span>
                            <span className="due-badge" style={{ background: st.bg, color: st.color }}>{st.label}</span>
                          </div>
                          <div className="due-invoice-date"><BiCalendar size={12} /> {formatDate(inv.createdAt)}</div>
                          <div className="due-invoice-amounts">
                            <div className="due-invoice-amount-item">
                              <span className="due-invoice-amount-label">{t('common.total')}</span>
                              <span>{formatCurrency(inv.totalAmount)}</span>
                            </div>
                            <div className="due-invoice-amount-item">
                              <span className="due-invoice-amount-label">{t('common.paid')}</span>
                              <span className="due-amount-paid">{formatCurrency(inv.paidAmount)}</span>
                            </div>
                            <div className="due-invoice-amount-item">
                              <span className="due-invoice-amount-label">{t('customersPage.remainingDue')}</span>
                              <span className="due-amount-remaining">{formatCurrency(inv.dueAmount)}</span>
                            </div>
                          </div>
                          <div className="due-invoice-actions">
                            <button className="due-invoice-btn" onClick={() => handleViewOrPrint(inv._id)}>
                              <BiShow size={13} /> {t('customersPage.viewInvoice')}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              )}

              {/* ─── Recent Purchases ───────────────────────────── */}
              {activeSection === 'purchases' && (
                dueDetails.recentPurchases.length === 0 ? (
                  <EmptyState icon="🛒" text={t('customersPage.noRecentPurchases')} />
                ) : (
                  <div className="due-details-list">
                    {dueDetails.recentPurchases.map((s) => {
                      const st = STATUS[s.paymentStatus] || STATUS.paid;
                      return (
                        <div key={s._id} className="due-purchase-row">
                          <div className="due-purchase-info">
                            <span className="due-invoice-no">{s.invoiceNo}</span>
                            <span className="due-invoice-date"><BiCalendar size={12} /> {formatDate(s.createdAt)}</span>
                          </div>
                          <div className="due-purchase-right">
                            <span className="due-purchase-amount">{formatCurrency(s.totalAmount)}</span>
                            <span className="due-badge" style={{ background: st.bg, color: st.color }}>{st.label}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              )}
            </>
          )}
        </div>
      </div>

      {printSale && (
        <PrintPreview sale={printSale} shopInfo={shopInfo} onClose={() => setPrintSale(null)} />
      )}
    </>
  );
};

export default CustomerDueDetailsDrawer;
