import React, { useState, useEffect, useCallback } from 'react';
import api from '../../../services/api';
import {
  BiX, BiDollar, BiCart, BiCalendar, BiBuilding,
  BiUser, BiPhone, BiEnvelope, BiMapPin, BiWallet,
  BiCheckCircle, BiTime, BiHash, BiInfoCircle, BiBook,
} from 'react-icons/bi';
import { useNavigate } from 'react-router-dom';

// ─── Helpers ───────────────────────────────────────────────────
const formatCurrency = (val) => `₹${(val || 0).toFixed(2)}`;
const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const formatDateTime = (d) =>
  d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

// ─── Summary Card (no icon) ────────────────────────────────────
const SummaryCard = ({ label, value, color }) => {
  const colorMap = {
    primary: { text: 'var(--primary)', accent: 'var(--primary)' },
    success: { text: '#00D9A6', accent: '#00D9A6' },
    warning: { text: 'var(--warning)', accent: 'var(--warning)' },
    danger: { text: 'var(--danger)', accent: 'var(--danger)' },
  };
  const colors = colorMap[color] || colorMap.primary;

  return (
    <div className="supplier-summary-card" style={{ '--summary-accent': colors.accent }}>
      <div className="supplier-summary-info">
        <span className="supplier-summary-value" style={{ color: colors.text }}>{value}</span>
        <span className="supplier-summary-label">{label}</span>
      </div>
    </div>
  );
};

// ─── Info Row ──────────────────────────────────────────────────
const InfoRow = ({ icon: Icon, label, value }) => (
  <div className="supplier-info-row">
    <div className="supplier-info-icon"><Icon size={14} /></div>
    <div className="supplier-info-content">
      <span className="supplier-info-label">{label}</span>
      <span className="supplier-info-value">{value || '—'}</span>
    </div>
  </div>
);

// ─── Supplier Details Drawer ───────────────────────────────────
const SupplierDetailsDrawer = ({ open, supplierId, onClose, t }) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const navigate = useNavigate();

  const fetchDetails = useCallback(async () => {
    if (!supplierId) return;
    setLoading(true);
    try {
      const { data: res } = await api.get(`/suppliers/${supplierId}/details`, { _skipLoading: true });
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [supplierId]);

  useEffect(() => {
    if (open && supplierId) {
      fetchDetails();
    }
  }, [open, supplierId, fetchDetails]);

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
    navigate(`/suppliers/${supplierId}/ledger`);
    onClose();
  };

  const supplier = data?.supplier;
  const summary = data?.summary;

  return (
    <>
      <div className={`drawer-overlay ${open ? 'open' : ''}`} onClick={onClose} />
      <div className={`drawer supplier-details-drawer ${open ? 'open' : ''}`}>
        <div className="drawer-header">
          <h5 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BiBuilding size={18} />
            {t('suppliersPage.detailsTitle') || 'Supplier Details'}
          </h5>
          <button className="btn-close-premium" onClick={onClose}><BiX /></button>
        </div>
        <div className="drawer-body" style={{ overflowX: 'hidden' }}>
          {!open ? null : loading || !supplier ? (
            <div className="text-center py-5" style={{ color: 'var(--text-muted)' }}>
              <div className="spinner-border spinner-border-sm me-2" /> {t('common.loading')}
            </div>
          ) : (
            <>
              {/* ─── Profile Header ───────────────────────────── */}
              <div className="supplier-details-hero">
                <div className="supplier-details-avatar">
                  {(supplier.name || 'S').charAt(0).toUpperCase()}
                </div>
                <div className="supplier-details-hero-info">
                  <h4>{supplier.name}</h4>
                  {supplier.company && (
                    <span className="supplier-details-company">
                      <BiBuilding size={13} /> {supplier.company}
                    </span>
                  )}
                  <span className="supplier-details-phone">
                    <BiPhone size={12} /> {supplier.phone}
                  </span>
                  {/* ─── Ledger Button ────────────────────────── */}
                  <button className="supplier-ledger-btn" onClick={handleGoToLedger}>
                    <BiBook size={14} /> {t('suppliersPage.viewLedger') || 'Supplier Ledger'}
                  </button>
                </div>
                <div className="supplier-details-hero-status">
                  <span
                    className="supplier-status-badge"
                    style={{
                      background: supplier.isActive !== false
                        ? 'rgba(46, 204, 113, 0.12)'
                        : 'rgba(255, 107, 107, 0.12)',
                      color: supplier.isActive !== false ? '#2ecc71' : '#FF6B6B',
                    }}
                  >
                    {t('common.active') || (supplier.isActive !== false ? 'Active' : 'Inactive')}
                  </span>
                </div>
              </div>

              {/* ─── Summary Cards ────────────────────────────── */}
              <div className="supplier-summary-grid">
                <SummaryCard
                  label={t('suppliersPage.totalPurchases') || 'Total Purchases'}
                  value={summary?.totalPurchases || 0}
                  color="primary"
                />
                <SummaryCard
                  label={t('suppliersPage.totalPurchaseAmount') || 'Total Purchase Amount'}
                  value={formatCurrency(summary?.totalPurchaseAmount || 0)}
                  color="success"
                />
                <SummaryCard
                  label={t('suppliersPage.currentDue') || 'Current Due'}
                  value={formatCurrency(summary?.currentDue || 0)}
                  color="danger"
                />
              </div>

              {/* ─── Supplier Information Card ────────────────── */}
              <div className="supplier-details-section">
                <h6 className="supplier-details-section-title">
                  <BiInfoCircle size={15} /> {t('suppliersPage.supplierInfo') || 'Supplier Information'}
                </h6>
                <div className="supplier-info-card">
                  <InfoRow icon={BiUser} label={t('auth.name') || 'Name'} value={supplier.name} />
                  {supplier.nameBn && (
                    <InfoRow icon={BiUser} label={t('suppliersPage.form.nameBn') || 'Name (BN)'} value={supplier.nameBn} />
                  )}
                  <InfoRow icon={BiBuilding} label={t('suppliersPage.form.company') || 'Company'} value={supplier.company} />
                  <InfoRow icon={BiPhone} label={t('auth.phone') || 'Phone'} value={supplier.phone} />
                  <InfoRow icon={BiEnvelope} label={t('auth.email') || 'Email'} value={supplier.email} />
                  <InfoRow icon={BiMapPin} label={t('suppliersPage.form.address') || 'Address'} value={supplier.address} />
                  <InfoRow icon={BiHash} label={t('suppliersPage.gstVat') || 'GST/VAT Number'} value={supplier.gstNumber || supplier.vatNumber || '—'} />
                  <InfoRow
                    icon={BiCheckCircle}
                    label={t('common.status') || 'Status'}
                    value={
                      <span
                        className="supplier-status-badge supplier-status-badge-sm"
                        style={{
                          background: supplier.isActive !== false
                            ? 'rgba(46, 204, 113, 0.12)'
                            : 'rgba(255, 107, 107, 0.12)',
                          color: supplier.isActive !== false ? '#2ecc71' : '#FF6B6B',
                        }}
                      >
                        {supplier.isActive !== false ? 'Active' : 'Inactive'}
                      </span>
                    }
                  />
                  <InfoRow icon={BiCalendar} label={t('suppliersPage.created') || 'Created Date'} value={formatDate(supplier.createdAt)} />
                  <InfoRow icon={BiTime} label={t('suppliersPage.lastUpdated') || 'Last Updated'} value={formatDateTime(supplier.updatedAt)} />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default SupplierDetailsDrawer;