import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../../../services/api';
import ExpandableCard from '../../../components/common/ExpandableCard';
import StatCard from '../../../components/common/StatCard';
import PrintPreview from '../../../components/common/PrintPreview';
import CustomerDueDetailsDrawer from './CustomerDueDetailsDrawer';
import Pagination from '../../../components/common/Pagination';
import {
  BiSearch, BiPlus, BiEdit, BiTrash, BiX, BiCheck, BiShow, BiPhone,
  BiEnvelope, BiMapPin, BiDollar, BiCalendar, BiUser, BiWallet, BiAward,
  BiLayer, BiGroup, BiCreditCard, BiTrendingUp, BiReceipt, BiHistory,
  BiStar, BiCrown, BiArrowBack, BiBook, BiTime,
  BiCheckCircle, BiErrorCircle,
  BiUpload, BiDownload, BiFile, BiPaste, BiTable, BiError, BiRefresh, BiInfoCircle,
} from 'react-icons/bi';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';

// ─── Helpers ───────────────────────────────────────────────────
const formatCurrency = (val) => `₹${Number(val || 0).toFixed(2)}`;
const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const formatDateTime = (d) =>
  d
    ? new Date(d).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

const paymentMethods = ['cash', 'card', 'upi', 'mobile_banking', 'due'];
const paymentMethodKey = (method) => (method === 'mobile_banking' ? 'mobileBanking' : method);

const paymentSourceMeta = (t) => ({
  pos: { label: t('customersPage.paymentSourcePos'), bg: 'rgba(108,99,255,0.1)', color: 'var(--primary)' },
  sale: { label: t('customersPage.paymentSourceSale'), bg: 'rgba(108,99,255,0.1)', color: 'var(--primary)' },
  due_collection: { label: t('customersPage.paymentSourceDueCollection'), bg: 'rgba(255,181,69,0.12)', color: '#F39C12' },
});

const emptyForm = { name: '', nameBn: '', phone: '', email: '', address: '' };
const REQUIRED_FIELDS = ['name', 'phone'];

const validateField = (t, name, value) => {
  switch (name) {
    case 'name': return String(value || '').trim() ? '' : t('customersPage.nameRequired');
    case 'phone': return String(value || '').trim() ? '' : t('customersPage.phoneRequired');
    default: return '';
  }
};

// ─── Tab Button ────────────────────────────────────────────────
const TabBtn = ({ active, onClick, icon, label }) => (
  <button
    className={`customers-tab-btn ${active ? 'is-active' : ''}`}
    onClick={onClick}
    onMouseEnter={(e) => { if (!active) { e.target.style.background = 'var(--bg-input)'; e.target.style.color = 'var(--text-primary)'; } }}
    onMouseLeave={(e) => { if (!active) { e.target.style.background = 'var(--bg-card)'; e.target.style.color = 'var(--text-secondary)'; } }}
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      padding: '0.55rem 1.25rem',
      fontSize: '0.85rem',
      fontWeight: 600,
      border: 'none',
      borderRadius: '10px',
      background: active ? 'var(--gradient-primary)' : 'var(--bg-card)',
      color: active ? '#fff' : 'var(--text-secondary)',
      boxShadow: active ? '0 4px 12px rgba(108,99,255,0.25)' : '0 1px 2px rgba(0,0,0,0.04)',
      cursor: 'pointer',
      transition: 'all 0.25s ease',
      whiteSpace: 'nowrap',
      letterSpacing: '0.2px',
      userSelect: 'none',
    }}
  >
    {icon} <span className="customers-tab-btn-label">{label}</span>
  </button>
);

// ─── Payment method config (icons & colors matching POS) ────────
const paymentMethodConfig = (t) => [
  { key: 'cash', icon: '💵', label: t('sale.cash'), color: '#2ecc71' },
  { key: 'card', icon: '💳', label: t('sale.card'), color: '#6C63FF' },
  { key: 'upi', icon: '📱', label: t('sale.upi'), color: '#00D9A6' },
  { key: 'mobile_banking', icon: '🏦', label: t('sale.mobileBanking'), color: '#FF6B9D' },
];

// ─── Payment Drawer ────────────────────────────────────────────
const PaymentDrawer = ({ open, onClose, customer, onSuccess, t }) => {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('cash');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const dueAmount = customer?.dueAmount || 0;
  const methods = paymentMethodConfig(t);

  useEffect(() => {
    if (open) {
      setAmount('');
      setMethod('cash');
      setNote('');
      setError('');
    }
  }, [open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const val = parseFloat(amount);
    if (!val || val <= 0) { setError(t('customersPage.invalidAmount')); return; }
    if (val > dueAmount) { setError(t('customersPage.amountExceedsDue')); return; }
    setSaving(true);
    setError('');
    try {
      await api.post(`/customers/${customer._id}/payment`, { amount: val, paymentMethod: method, notes: note });
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className={`drawer-overlay ${open ? 'open' : ''}`} onClick={onClose} />
      <div className={`drawer ${open ? 'open' : ''}`}>
        <div className="drawer-header">
          <h5 style={{ fontSize: '1rem', margin: 0 }}>{t('customersPage.receivePayment')}</h5>
          <button className="btn-close-premium" onClick={onClose}><BiX /></button>
        </div>
        <div className="drawer-body" style={{ padding: '1rem' }}>
          {customer && (
            <div style={{
              padding: '0.75rem 1rem',
              borderRadius: 'var(--border-radius-md)',
              background: 'rgba(108,99,255,0.06)',
              border: '1px solid rgba(108,99,255,0.12)',
              marginBottom: '1rem',
            }}>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{customer.name}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{customer.phone}</div>
              <div style={{ marginTop: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{t('customersPage.currentDue')}:</span>
                <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--danger)' }}>{formatCurrency(dueAmount)}</span>
              </div>
            </div>
          )}
          {error && (
            <div style={{
              padding: '0.5rem 0.75rem', borderRadius: 'var(--border-radius-sm)',
              background: 'var(--glow-danger)', color: 'var(--danger)',
              fontWeight: 500, marginBottom: '0.6rem', fontSize: '0.78rem',
            }}>{error}</div>
          )}
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {/* Payment Amount with Exact button */}
              <div>
                <label className="form-label" style={{ fontSize: '0.72rem', marginBottom: '0.2rem' }}>
                  {t('customersPage.paymentAmount')} <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'stretch' }}>
                  <input
                    type="number" step="0.01" className="form-control"
                    value={amount} onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    style={{ padding: '0.45rem 0.75rem', fontSize: '0.82rem', minHeight: '40px', flex: 1 }}
                  />
                  {dueAmount > 0 && (
                    <button
                      type="button"
                      onClick={() => setAmount(String(dueAmount))}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: '4px',
                        padding: '0.45rem 0.85rem', fontSize: '0.78rem', fontWeight: 600,
                        borderRadius: 'var(--border-radius-md)',
                        border: '1.5px solid var(--primary)',
                        background: 'transparent',
                        color: 'var(--primary)',
                        cursor: 'pointer', whiteSpace: 'nowrap',
                        transition: 'all 0.15s ease',
                        fontFamily: 'var(--font-family)',
                        minHeight: '40px',
                      }}
                      onMouseEnter={(e) => { e.target.style.background = 'rgba(108,99,255,0.08)'; }}
                      onMouseLeave={(e) => { e.target.style.background = 'transparent'; }}
                    >
                      <BiCheck style={{ fontSize: '1rem' }} /> {t('posPage.payment.exact')}
                    </button>
                  )}
                </div>
              </div>

              {/* Card-style Payment Method selector (matching POS) */}
              <div>
                <label className="form-label" style={{ fontSize: '0.72rem', marginBottom: '0.4rem' }}>
                  {t('sale.paymentMethod')}
                </label>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
                  gap: '0.5rem',
                }}>
                  {methods.map((pm) => (
                    <button
                      key={pm.key}
                      type="button"
                      onClick={() => setMethod(pm.key)}
                      style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                        padding: '0.6rem 0.4rem',
                        borderRadius: 'var(--border-radius-md)',
                        border: `1.5px solid ${method === pm.key ? pm.color : 'var(--border-color)'}`,
                        background: method === pm.key ? `${pm.color}10` : 'var(--bg-card)',
                        color: method === pm.key ? pm.color : 'var(--text-secondary)',
                        cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600,
                        transition: 'all 0.15s ease',
                        fontFamily: 'var(--font-family)',
                        minHeight: '60px',
                        boxShadow: method === pm.key ? `0 2px 8px ${pm.color}30` : 'none',
                      }}
                    >
                      <span style={{ fontSize: '1.3rem', lineHeight: 1 }}>{pm.icon}</span>
                      <span>{pm.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '0.72rem', marginBottom: '0.2rem' }}>
                  {t('common.notes')} ({t('common.optional')})
                </label>
                <textarea
                  className="form-control"
                  value={note} onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  placeholder={t('customersPage.paymentNotePlaceholder')}
                  style={{ padding: '0.45rem 0.75rem', fontSize: '0.82rem', resize: 'vertical' }}
                />
              </div>
            </div>
          </form>
        </div>
        <div className="drawer-footer" style={{ padding: '0.7rem 1rem', gap: '0.5rem' }}>
          <button type="button" className="btn-premium btn-premium-secondary" onClick={onClose}
            style={{ padding: '0.5rem 1.25rem', fontSize: '0.82rem', flex: 1, justifyContent: 'center' }}>
            {t('common.cancel')}
          </button>
          <button type="submit" form="payment-form" onClick={handleSubmit}
            className="btn-premium btn-premium-primary" disabled={saving}
            style={{ padding: '0.5rem 1.25rem', fontSize: '0.82rem', flex: 1, justifyContent: 'center' }}>
            {saving ? <><span className="spinner-border spinner-border-sm" /> {t('common.saving')}</>
              : <><BiCheck /> {t('customersPage.pay')}</>}
          </button>
        </div>
      </div>
    </>
  );
};

// ─── Customer Details Drawer (view-only with edit history, purchase history, payment history) ──
const CustomerDrawer = ({ open, onClose, onSuccess, editing, viewing, onEditFromView, t, navigate }) => {
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [purchases, setPurchases] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [activeDetailTab, setActiveDetailTab] = useState('purchases');
  const [printSale, setPrintSale] = useState(null);
  const [shopInfo, setShopInfo] = useState(null);

  useEffect(() => {
    api.get('/shops/my', { _skipLoading: true }).then(({ data }) => setShopInfo(data.shop || data)).catch(() => {});
  }, []);

  const handleViewInvoice = async (saleId) => {
    if (!saleId) return;
    try {
      const { data } = await api.get(`/sales/${saleId}`, { _skipLoading: true });
      setPrintSale(data.sale || data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setSubmitError(null);
    const data = viewing || editing;
    setForm(data ? {
      name: data.name || '',
      nameBn: data.nameBn || '',
      phone: data.phone || '',
      email: data.email || '',
      address: typeof data.address === 'object' ? Object.values(data.address).filter(Boolean).join(', ') : (data.address || ''),
    } : emptyForm);
  }, [open, editing, viewing]);

  // Fetch purchase & payment history when viewing
  useEffect(() => {
    if (!open || !viewing) return;
    const id = viewing._id;
    setLoadingHistory(true);
    Promise.all([
      api.get(`/customers/${id}/purchases`, { _skipLoading: true }).then(r => setPurchases(r.data)).catch(() => setPurchases([])),
      api.get(`/customers/${id}/payments`, { _skipLoading: true }).then(r => setPayments(r.data)).catch(() => setPayments([])),
    ]).finally(() => setLoadingHistory(false));
  }, [open, viewing]);

  const handleChange = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => {
      if (!(name in prev)) return prev;
      const msg = validateField(t, name, value);
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
      const msg = validateField(t, field, form[field]);
      if (msg) newErrors[field] = msg;
    });
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }
    setSaving(true);
    setSubmitError(null);
    try {
      if (editing) await api.put(`/customers/${editing._id}`, form);
      else await api.post('/customers', form);
      onSuccess();
      onClose();
    } catch (err) {
      setSubmitError(err.response?.data?.message || t('customersPage.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const isViewing = !!viewing;

  const inputStyle = { padding: '0.45rem 0.75rem', fontSize: '0.82rem', minHeight: '40px', height: '40px' };
  const labelStyle = { fontSize: '0.72rem', marginBottom: '0.2rem' };
  const errorStyle = { fontSize: '0.7rem', marginTop: '0.1rem' };

  const field = (name) => ({
    className: `form-control ${errors[name] ? 'is-invalid' : ''}`,
    value: form[name],
    onChange: (e) => handleChange(name, e.target.value),
    readOnly: isViewing,
    disabled: isViewing,
    style: isViewing ? { background: 'var(--bg-input)', cursor: 'default', opacity: 0.8 } : inputStyle,
  });

  // Detail tab styles — premium segmented control
  const detailTabStyle = (active) => ({
    flex: '1 1 0',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '5px',
    padding: '0.55rem 0.75rem',
    fontSize: '0.78rem',
    fontWeight: 700,
    border: 'none',
    borderRadius: '9px',
    background: active ? 'var(--bg-card)' : 'transparent',
    color: active ? 'var(--primary)' : 'var(--text-muted)',
    boxShadow: active ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    whiteSpace: 'nowrap',
  });

  if (isViewing) {
    const data = viewing;
    return (
      <>
        <div className={`drawer-overlay ${open ? 'open' : ''}`} onClick={onClose} />
        <div className={`drawer ${open ? 'open' : ''}`}>
          <div className="drawer-header">
            <h5>{t('customersPage.customerDetails')}</h5>
            <button className="btn-close-premium" onClick={onClose}><BiX /></button>
          </div>
          <div className="drawer-body customer-details-drawer-body">
            {/* ─── Profile Hero ──────────────────────────────────── */}
            <div style={{
              position: 'relative', marginBottom: '1rem', padding: '1.25rem',
              background: 'linear-gradient(135deg, rgba(108, 99, 255, 0.07), rgba(0, 217, 166, 0.05))',
              borderRadius: 'var(--border-radius-lg)', border: '1px solid rgba(108, 99, 255, 0.14)',
              overflow: 'hidden',
            }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'var(--gradient-primary)' }} />

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', flexWrap: 'wrap' }}>
                  <div style={{
                    width: '52px', height: '52px', borderRadius: '14px',
                    background: 'var(--gradient-primary)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', color: '#fff',
                    fontSize: '1.2rem', fontWeight: 700, flexShrink: 0,
                    boxShadow: '0 4px 15px rgba(108, 99, 255, 0.3)',
                  }}>
                    {(data.name || '?').charAt(0).toUpperCase()}
                  </div>

                  <div style={{ flex: '1 1 160px', minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <h4 style={{ margin: 0, fontWeight: 800, color: 'var(--text-primary)', fontSize: '1.05rem' }}>{data.name}</h4>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '4px',
                        padding: '2px 9px', borderRadius: '20px', fontSize: '0.68rem', fontWeight: 700,
                        background: data.dueAmount > 0 ? 'rgba(255,107,107,0.12)' : 'rgba(0,217,166,0.12)',
                        color: data.dueAmount > 0 ? 'var(--danger)' : 'var(--secondary)',
                      }}>
                        {data.dueAmount > 0 ? <BiErrorCircle size={12} /> : <BiCheckCircle size={12} />}
                        {data.dueAmount > 0 ? t('common.due') : t('common.active')}
                      </span>
                    </div>
                    {data.nameBn && data.nameBn.trim().toLowerCase() !== (data.name || '').trim().toLowerCase() && (
                      <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{data.nameBn}</p>
                    )}

                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
                      {data.phone && (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '5px',
                          padding: '3px 10px', borderRadius: '20px',
                          background: 'var(--bg-card)', border: '1px solid var(--border-light)',
                          color: 'var(--text-secondary)', fontSize: '0.74rem', fontWeight: 600,
                        }}>
                          <BiPhone size={13} /> {data.phone}
                        </span>
                      )}
                      {data.email && (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '5px',
                          padding: '3px 10px', borderRadius: '20px',
                          background: 'var(--bg-card)', border: '1px solid var(--border-light)',
                          color: 'var(--text-secondary)', fontSize: '0.74rem', fontWeight: 600,
                          maxWidth: '100%',
                        }}>
                          <BiEnvelope size={13} /> <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{data.email}</span>
                        </span>
                      )}
                    </div>
                    {(data.address) && (
                      <div style={{
                        display: 'flex', alignItems: 'flex-start', gap: '5px', marginTop: '6px',
                        color: 'var(--text-muted)', fontSize: '0.72rem',
                      }}>
                        <BiMapPin size={13} style={{ marginTop: '1px', flexShrink: 0 }} />
                        <span>{typeof data.address === 'object' ? Object.values(data.address).filter(Boolean).join(', ') : data.address}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="customer-ledger-btn-row" style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    className="customer-ledger-btn"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      padding: '0.4rem 1rem',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      border: 'none',
                      borderRadius: '8px',
                      background: 'var(--gradient-primary)',
                      color: '#fff',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      whiteSpace: 'nowrap',
                      letterSpacing: '0.2px',
                      boxShadow: '0 4px 12px rgba(108,99,255,0.3)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.filter = 'brightness(0.92)';
                      e.currentTarget.style.boxShadow = '0 6px 18px rgba(108,99,255,0.4)';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.filter = 'none';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(108,99,255,0.3)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                    onClick={() => { navigate(`/customers/${data._id}/ledger`); onClose(); }}
                  >
                    <BiBook size={14} />
                    <span>{t('customersPage.customerLedger')}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* ─── Financial Overview (KPI grid) ──────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '1.25rem' }}>
              {[
                { icon: BiWallet, label: t('customersPage.totalPurchases'), value: formatCurrency(data.totalPurchases), color: 'var(--primary)', bg: 'rgba(108,99,255,0.1)', borderColor: 'var(--primary)' },
                { icon: BiDollar, label: t('common.due'), value: formatCurrency(data.dueAmount), color: data.dueAmount > 0 ? 'var(--danger)' : 'var(--secondary)', bg: data.dueAmount > 0 ? 'rgba(255,107,107,0.1)' : 'rgba(0,217,166,0.1)', borderColor: data.dueAmount > 0 ? 'var(--danger)' : 'var(--secondary)' },
                { icon: BiAward, label: t('customersPage.loyaltyPoints'), value: `${data.loyaltyPoints || 0} ${t('customersPage.pts')}`, color: 'var(--primary)', bg: 'rgba(108,99,255,0.1)', borderColor: 'var(--warning)' },
                { icon: BiCalendar, label: t('customersPage.customerSince'), value: formatDate(data.createdAt), color: 'var(--text-primary)', bg: 'var(--bg-input)', borderColor: 'var(--info)' },
              ].map((kpi, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0,
                  padding: '10px 12px', borderRadius: 'var(--border-radius-md)',
                  background: 'var(--bg-card)', border: '1px solid var(--border-light)',
                  borderTop: `3px solid ${kpi.borderColor}`,
                }}>
                  <div className="customer-kpi-icon" style={{
                    width: '34px', height: '34px', borderRadius: '10px', flexShrink: 0,
                    background: kpi.bg, color: kpi.color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <kpi.icon size={16} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{
                      fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700,
                      textTransform: 'uppercase', letterSpacing: '0.3px',
                    }}>{kpi.label}</div>
                    <div style={{
                      fontSize: '0.85rem', fontWeight: 800, color: kpi.color,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>{kpi.value}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* ─── Purchase & Payment History Tabs ───────────────── */}
            <div style={{
              display: 'flex', gap: '4px', marginBottom: '0.75rem',
              padding: '4px', borderRadius: '12px',
              background: 'var(--bg-input)',
            }}>
              <button style={detailTabStyle(activeDetailTab === 'purchases')}
                onClick={() => setActiveDetailTab('purchases')}>
                <BiReceipt size={14} /> {t('customersPage.purchases')}
              </button>
              <button style={detailTabStyle(activeDetailTab === 'payments')}
                onClick={() => setActiveDetailTab('payments')}>
                <BiCreditCard size={14} /> {t('customersPage.payments')}
              </button>
              <button style={detailTabStyle(activeDetailTab === 'history')}
                onClick={() => setActiveDetailTab('history')}>
                <BiHistory size={14} /> {t('customersPage.editHistory')}
              </button>
            </div>

            {/* Purchase History */}
            {activeDetailTab === 'purchases' && (
              <div>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  fontWeight: 700, fontSize: '0.8rem', marginBottom: '0.65rem', color: 'var(--text-primary)',
                }}>
                  <BiReceipt size={15} style={{ color: 'var(--primary)' }} />
                  {t('customersPage.productPurchaseHistory')}
                </div>
                {loadingHistory ? (
                  <div className="text-center py-3" style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                    <span className="spinner-border spinner-border-sm me-2" /> {t('common.loading')}
                  </div>
                ) : purchases.length === 0 ? (
                  <div style={{
                    padding: '1rem', textAlign: 'center', borderRadius: 'var(--border-radius-md)',
                    background: 'var(--bg-card)', border: '1px dashed var(--border-light)',
                    color: 'var(--text-muted)', fontSize: '0.78rem',
                  }}>
                    <div style={{ fontSize: '1.2rem', marginBottom: '0.3rem', opacity: 0.5 }}>🛒</div>
                    {t('customersPage.noPurchaseHistory')}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {purchases.map((p, i) => (
                      <div key={i} style={{
                        display: 'flex', gap: '10px',
                        padding: '10px 12px', borderRadius: 'var(--border-radius-md)',
                        background: 'var(--bg-card)', border: '1px solid var(--border-light)',
                        fontSize: '0.78rem',
                      }}>
                        <div style={{
                          width: '30px', height: '30px', borderRadius: '9px', flexShrink: 0,
                          background: 'rgba(108,99,255,0.1)', color: 'var(--primary)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <BiReceipt size={15} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', marginBottom: '4px' }}>
                            <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{p.productName}</span>
                            <span style={{ fontWeight: 700, color: 'var(--primary)', whiteSpace: 'nowrap' }}>{formatCurrency(p.total)}</span>
                          </div>
                          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>{p.invoiceNo}</span>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}><BiCalendar size={12} /> {formatDate(p.saleDate)}</span>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}><BiLayer size={12} /> {t('sale.quantity')}: {p.quantity}</span>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}><BiDollar size={12} /> {formatCurrency(p.unitPrice)}</span>
                            {p.discount > 0 && <span style={{ color: 'var(--danger)', fontWeight: 600 }}>-{formatCurrency(p.discount)}</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Payment History */}
            {activeDetailTab === 'payments' && (
              <div>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  fontWeight: 700, fontSize: '0.8rem', marginBottom: '0.65rem', color: 'var(--text-primary)',
                }}>
                  <BiCreditCard size={15} style={{ color: 'var(--secondary)' }} />
                  {t('customersPage.paymentHistory')}
                </div>
                {loadingHistory ? (
                  <div className="text-center py-3" style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                    <span className="spinner-border spinner-border-sm me-2" /> {t('common.loading')}
                  </div>
                ) : payments.length === 0 ? (
                  <div style={{
                    padding: '1rem', textAlign: 'center', borderRadius: 'var(--border-radius-md)',
                    background: 'var(--bg-card)', border: '1px dashed var(--border-light)',
                    color: 'var(--text-muted)', fontSize: '0.78rem',
                  }}>
                    <div style={{ fontSize: '1.2rem', marginBottom: '0.3rem', opacity: 0.5 }}>💳</div>
                    {t('customersPage.noPaymentHistory')}
                  </div>
                ) : (
                  <div style={{ position: 'relative', paddingLeft: '20px' }}>
                    <div style={{
                      position: 'absolute', left: '7px', top: '6px', bottom: '6px',
                      width: '2px', background: 'linear-gradient(to bottom, var(--secondary), rgba(0,217,166,0.15))',
                      borderRadius: '1px',
                    }} />
                    {payments.map((p, i) => {
                      const srcMeta = paymentSourceMeta(t)[p.source] || paymentSourceMeta(t).due_collection;
                      return (
                        <div key={i} style={{ position: 'relative', marginBottom: '10px' }}>
                          <div style={{
                            position: 'absolute', left: '-20px', top: '12px',
                            width: '12px', height: '12px', borderRadius: '50%',
                            background: 'var(--bg-card)', border: '2px solid var(--secondary)',
                            boxShadow: '0 0 0 3px rgba(0,217,166,0.08)', zIndex: 1,
                          }} />
                          <div style={{
                            padding: '10px 12px', borderRadius: 'var(--border-radius-md)',
                            background: 'var(--bg-card)', border: '1px solid var(--border-light)',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.04)', fontSize: '0.78rem',
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', flexWrap: 'wrap', gap: '4px' }}>
                              <span style={{ fontWeight: 700, color: 'var(--secondary)', fontSize: '0.85rem' }}>
                                +{formatCurrency(p.amount)}
                              </span>
                              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                <span style={{
                                  padding: '1px 8px', borderRadius: '10px',
                                  background: 'rgba(108,99,255,0.1)', color: 'var(--primary)',
                                  fontSize: '0.7rem', fontWeight: 600,
                                }}>
                                  {t(`sale.${paymentMethodKey(p.paymentMethod)}`)}
                                </span>
                                <span style={{
                                  padding: '1px 8px', borderRadius: '10px',
                                  background: srcMeta.bg, color: srcMeta.color,
                                  fontSize: '0.7rem', fontWeight: 600,
                                }}>
                                  {srcMeta.label}
                                </span>
                              </div>
                            </div>
                            {p.invoiceNo && (
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px', flexWrap: 'wrap', gap: '4px' }}>
                                {p.saleId ? (
                                  <button
                                    onClick={() => handleViewInvoice(p.saleId)}
                                    style={{
                                      display: 'inline-flex', alignItems: 'center', gap: '3px',
                                      background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                                      fontSize: '0.72rem', color: 'var(--primary)', fontWeight: 600, textDecoration: 'underline',
                                    }}
                                  >
                                    <BiReceipt size={12} />{p.invoiceNo}
                                  </button>
                                ) : (
                                  <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                                    <BiReceipt size={12} style={{ marginRight: '3px', verticalAlign: 'middle' }} />{p.invoiceNo}
                                  </span>
                                )}
                                {p.invoiceTotal != null && (
                                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                    {t('common.total')}: {formatCurrency(p.invoiceTotal)}
                                  </span>
                                )}
                              </div>
                            )}
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}><BiUser size={12} /> {p.collectedBy || '—'}</span>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}><BiTime size={12} /> {formatDateTime(p.date)}</span>
                            </div>
                            <div style={{
                              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                              marginTop: '6px', paddingTop: '6px', borderTop: '1px dashed var(--border-light)',
                              fontSize: '0.7rem', color: 'var(--text-muted)',
                            }}>
                              <span>{t('customersPage.remainingDue')}</span>
                              <span style={{ fontWeight: 700, color: p.remainingDue > 0 ? 'var(--danger)' : 'var(--secondary)' }}>
                                {formatCurrency(p.remainingDue)}
                              </span>
                            </div>
                            {p.notes && (
                              <div style={{ marginTop: '4px', fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                {p.notes}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Edit History */}
            {activeDetailTab === 'history' && (
              <div>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  fontWeight: 700, fontSize: '0.8rem', marginBottom: '0.65rem', color: 'var(--text-primary)',
                }}>
                  <BiHistory size={15} style={{ color: 'var(--primary)' }} />
                  {t('customersPage.editHistory')}
                </div>
                {data.editHistory && data.editHistory.length > 0 ? (
                  <div style={{ position: 'relative', paddingLeft: '20px' }}>
                    <div style={{
                      position: 'absolute', left: '7px', top: '6px', bottom: '6px',
                      width: '2px', background: 'linear-gradient(to bottom, var(--primary), rgba(108,99,255,0.15))',
                      borderRadius: '1px',
                    }} />
                    {[...data.editHistory].reverse().map((entry, idx) => {
                      const hasName = entry.previousName && entry.newName;
                      const hasPhone = entry.previousPhone && entry.newPhone;
                      return (
                        <div key={idx} style={{ position: 'relative', marginBottom: '10px' }}>
                          <div style={{
                            position: 'absolute', left: '-20px', top: '12px',
                            width: '12px', height: '12px', borderRadius: '50%',
                            background: 'var(--bg-card)', border: '2px solid var(--primary)',
                            boxShadow: '0 0 0 3px rgba(108,99,255,0.08)', zIndex: 1,
                          }} />
                          <div style={{
                            padding: '10px 12px', borderRadius: 'var(--border-radius-md)',
                            background: 'var(--bg-card)', border: '1px solid var(--border-light)',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.04)', fontSize: '0.78rem',
                          }}>
                            <div style={{
                              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                              marginBottom: '8px', paddingBottom: '6px',
                              borderBottom: '1px solid var(--border-light)',
                            }}>
                              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600, color: 'var(--text-primary)' }}>
                                <BiUser size={13} /> {entry.updatedBy?.name || entry.updatedBy?.email || '—'}
                              </span>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                <BiTime size={12} /> {formatDateTime(entry.updatedAt)}
                              </span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              {hasName && (
                                <div>
                                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '2px' }}>
                                    <BiEdit size={12} /> {t('auth.name')}
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                    <span style={{
                                      padding: '1px 6px', borderRadius: '3px',
                                      background: 'rgba(255,107,107,0.1)', color: '#e74c3c',
                                      fontSize: '0.74rem', fontWeight: 600, textDecoration: 'line-through',
                                    }}>{entry.previousName}</span>
                                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>→</span>
                                    <span style={{
                                      padding: '1px 6px', borderRadius: '3px',
                                      background: 'rgba(0,217,166,0.12)', color: 'var(--secondary)',
                                      fontSize: '0.74rem', fontWeight: 600,
                                    }}>{entry.newName}</span>
                                  </div>
                                </div>
                              )}
                              {hasPhone && (
                                <div>
                                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '2px' }}>
                                    <BiPhone size={12} /> {t('auth.phone')}
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                    <span style={{
                                      padding: '1px 6px', borderRadius: '3px',
                                      background: 'rgba(255,107,107,0.1)', color: '#e74c3c',
                                      fontSize: '0.74rem', fontWeight: 600, textDecoration: 'line-through',
                                    }}>{entry.previousPhone}</span>
                                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>→</span>
                                    <span style={{
                                      padding: '1px 6px', borderRadius: '3px',
                                      background: 'rgba(0,217,166,0.12)', color: 'var(--secondary)',
                                      fontSize: '0.74rem', fontWeight: 600,
                                    }}>{entry.newPhone}</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{
                    padding: '1rem', textAlign: 'center', borderRadius: 'var(--border-radius-md)',
                    background: 'var(--bg-card)', border: '1px dashed var(--border-light)',
                    color: 'var(--text-muted)', fontSize: '0.78rem',
                  }}>
                    <div style={{ fontSize: '1.2rem', marginBottom: '0.3rem', opacity: 0.5 }}>📋</div>
                    {t('customersPage.noEditHistory')}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {printSale && (
          <PrintPreview sale={printSale} shopInfo={shopInfo} onClose={() => setPrintSale(null)} />
        )}
      </>
    );
  }

  // ─── Edit / Add form ─────────────────────────────────────────
  return (
    <>
      <div className={`drawer-overlay ${open ? 'open' : ''}`} onClick={onClose} />
      <div className={`drawer ${open ? 'open' : ''}`}>
        <div className="drawer-header" style={{ padding: '0.85rem 1.25rem', minHeight: 'auto' }}>
          <h5 style={{ fontSize: '1rem', margin: 0 }}>{editing ? t('customersPage.editCustomer') : t('customersPage.addCustomer')}</h5>
          <button className="btn-close-premium" onClick={onClose} style={{ width: '32px', height: '32px' }}><BiX /></button>
        </div>
        <div className="drawer-body customer-drawer-body" style={{ padding: '0.85rem 1rem 0.4rem 1rem' }}>
          {submitError && (
            <div style={{
              padding: '0.5rem 0.75rem', borderRadius: 'var(--border-radius-sm)',
              background: 'var(--glow-danger)', color: 'var(--danger)',
              fontWeight: 500, marginBottom: '0.6rem', fontSize: '0.78rem',
            }}>{submitError}</div>
          )}
          <form onSubmit={handleSubmit} id="customer-form" noValidate>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <div>
                <label className="form-label" style={labelStyle}>{t('customersPage.nameEn')} <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input {...field('name')} placeholder={t('customersPage.namePlaceholder')} />
                {errors.name && <div className="invalid-feedback-premium" style={errorStyle}>{errors.name}</div>}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div>
                  <label className="form-label" style={labelStyle}>{t('customersPage.nameBn')}</label>
                  <input {...field('nameBn')} placeholder={t('customersPage.nameBnPlaceholder')} />
                </div>
                <div>
                  <label className="form-label" style={labelStyle}>{t('auth.phone')} <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input {...field('phone')} placeholder={t('customersPage.phonePlaceholder')} />
                  {errors.phone && <div className="invalid-feedback-premium" style={errorStyle}>{errors.phone}</div>}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div>
                  <label className="form-label" style={labelStyle}>{t('auth.email')}</label>
                  <input type="email" {...field('email')} placeholder={t('customersPage.emailPlaceholder')} />
                </div>
                <div>
                  <label className="form-label" style={labelStyle}>{t('customersPage.address')}</label>
                  <input {...field('address')} placeholder={t('customersPage.addressPlaceholder')} />
                </div>
              </div>
            </div>
          </form>
        </div>
        <div className="drawer-footer customer-drawer-footer" style={{ padding: '0.7rem 1rem', gap: '0.5rem' }}>
          <button type="button" className="btn-premium btn-premium-secondary" onClick={onClose}
            style={{ padding: '0.5rem 1.25rem', fontSize: '0.82rem', flex: 1, justifyContent: 'center' }}>
            {t('common.cancel')}
          </button>
          <button type="submit" form="customer-form" className="btn-premium btn-premium-primary" disabled={saving}
            style={{ padding: '0.5rem 1.25rem', fontSize: '0.82rem', flex: 1, justifyContent: 'center' }}>
            {saving ? <><span className="spinner-border spinner-border-sm" /> {t('common.saving')}</>
              : <><BiCheck /> {t('common.save')}</>}
          </button>
        </div>
      </div>
    </>
  );
};

// ─── Bulk Import Drawer ──────────────────────────────────────────────────────
const BulkImportDrawer = ({ open, onClose, onSuccess, t }) => {
  const [activeTab, setActiveTab] = useState('excel'); // 'excel' | 'paste'
  const [pasteData, setPasteData] = useState('');
  const [parsedRows, setParsedRows] = useState([]);
  const [errors, setErrors] = useState({});
  const [duplicates, setDuplicates] = useState({});
  const [existingCustomers, setExistingCustomers] = useState([]);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [importing, setImporting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const fileInputRef = useRef(null);

  // Reset state when drawer opens
  useEffect(() => {
    if (!open) return;
    resetState();
    loadExistingCustomers();
  }, [open]);

  const resetState = () => {
    setPasteData('');
    setParsedRows([]);
    setErrors({});
    setDuplicates({});
    setShowPreview(false);
    setImportResult(null);
    setActiveTab('excel');
  };

  const loadExistingCustomers = async () => {
    try {
      const { data } = await api.get('/customers?limit=10000');
      setExistingCustomers(data.customers || []);
    } catch (err) {
      console.error(err);
    }
  };

  // ─── Detect Duplicates ──────────────────────────────────────────────────
  const detectDuplicates = useCallback((rows) => {
    const dupMap = {};
    const errorMap = {};
    rows.forEach((row, idx) => {
      const rowErrors = [];
      if (!row.name?.trim()) rowErrors.push(t('customersPage.nameRequired'));
      if (!row.phone?.trim()) rowErrors.push(t('customersPage.phoneRequired'));

      // Customer creation has no server-side duplicate check, so this
      // client-side match (by phone or email) is the only guard.
      const existing = existingCustomers.find(c =>
        c.phone === row.phone?.trim() || (row.email && c.email?.toLowerCase() === row.email?.trim()?.toLowerCase())
      );
      if (existing) {
        dupMap[idx] = existing;
      }

      if (rowErrors.length > 0) {
        errorMap[idx] = rowErrors;
      }
    });
    setErrors(errorMap);
    setDuplicates(dupMap);
    return { errorMap, dupMap };
  }, [existingCustomers]);

  // ─── Excel/CSV Import ───────────────────────────────────────────────────
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { defval: '' });

        if (jsonData.length === 0) {
          Swal.fire({ icon: 'warning', title: t('customersPage.bulkImport.emptyFileTitle'), text: t('customersPage.bulkImport.emptyFileText'), confirmButtonColor: '#6C63FF' });
          return;
        }

        const mapped = jsonData.map(row => {
          const keys = Object.keys(row).reduce((acc, key) => {
            acc[key.toLowerCase().trim()] = row[key];
            return acc;
          }, {});
          return {
            name: keys.name || keys['customer name'] || keys['customer_name'] || '',
            phone: String(keys.phone || keys['phone number'] || keys['phone_number'] || keys.mobile || ''),
            email: keys.email || keys['e-mail'] || keys['email address'] || '',
            address: keys.address || '',
            nameBn: keys.namebn || keys['name_bn'] || keys['bangla name'] || keys['bangla_name'] || '',
            openingBalance: parseFloat(keys.openingbalance || keys['opening balance'] || keys['opening_balance'] || keys.due || 0) || 0,
          };
        });

        setParsedRows(mapped);
        setShowPreview(true);
        detectDuplicates(mapped);
      } catch (err) {
        Swal.fire({ icon: 'error', title: t('customersPage.bulkImport.parseErrorTitle'), text: t('customersPage.bulkImport.parseErrorText'), confirmButtonColor: '#6C63FF' });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // ─── Download Sample Template ───────────────────────────────────────────
  const handleDownloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([
      { name: 'John Doe', phone: '01711111111', email: 'john@gmail.com', address: 'Dhaka', openingBalance: 0, nameBn: 'জন ডো' },
      { name: 'Jane Smith', phone: '01822222222', email: 'jane@gmail.com', address: 'Kolkata', openingBalance: 500, nameBn: '' },
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Customers');
    XLSX.writeFile(wb, 'customer_import_template.xlsx');
  };

  // ─── Paste Import ───────────────────────────────────────────────────────
  const handleParsePaste = () => {
    if (!pasteData.trim()) {
      Swal.fire({ icon: 'warning', title: t('customersPage.bulkImport.emptyDataTitle'), text: t('customersPage.bulkImport.emptyDataText'), confirmButtonColor: '#6C63FF' });
      return;
    }

    const lines = pasteData.split('\n').filter(line => line.trim());
    const parsed = lines.map((line) => {
      // Support comma, tab, or pipe separated
      const parts = line.includes('\t') ? line.split('\t') :
                    line.includes('|') ? line.split('|') :
                    line.split(',');
      const cleanParts = parts.map(p => p.trim());
      return {
        name: cleanParts[0] || '',
        phone: cleanParts[1] || '',
        email: cleanParts[2] || '',
        address: cleanParts[3] || '',
        openingBalance: parseFloat(cleanParts[4]) || 0,
        nameBn: cleanParts[5] || '',
      };
    });

    if (parsed.length === 0) {
      Swal.fire({ icon: 'warning', title: t('customersPage.bulkImport.noDataTitle'), text: t('customersPage.bulkImport.noDataText'), confirmButtonColor: '#6C63FF' });
      return;
    }

    setParsedRows(parsed);
    setShowPreview(true);
    detectDuplicates(parsed);
  };

  // ─── Remove Row ─────────────────────────────────────────────────────────
  const removeRow = (idx) => {
    const updated = parsedRows.filter((_, i) => i !== idx);
    setParsedRows(updated);
    detectDuplicates(updated);
  };

  // ─── Import All ─────────────────────────────────────────────────────────
  const handleImport = async () => {
    const validRows = parsedRows.filter((row, idx) => {
      if (errors[idx] && errors[idx].length > 0) return false;
      if (skipDuplicates && duplicates[idx]) return false;
      return true;
    });

    if (validRows.length === 0) {
      Swal.fire({ icon: 'warning', title: t('customersPage.bulkImport.noValidRowsTitle'), text: t('customersPage.bulkImport.noValidRowsText'), confirmButtonColor: '#6C63FF' });
      return;
    }

    setImporting(true);
    let imported = 0;
    let updated = 0;
    let failed = 0;
    const failedDetails = [];

    for (const row of validRows) {
      try {
        const existing = existingCustomers.find(c =>
          c.phone === row.phone?.trim() || (row.email && c.email?.toLowerCase() === row.email.toLowerCase())
        );

        const payload = {
          name: row.name,
          nameBn: row.nameBn || '',
          email: row.email || '',
          phone: row.phone,
          address: row.address || '',
          openingBalance: Number(row.openingBalance) || 0,
        };

        if (existing && !skipDuplicates) {
          await api.put(`/customers/${existing._id}`, payload);
          updated++;
        } else {
          await api.post('/customers', payload);
          imported++;
        }
      } catch (err) {
        failed++;
        failedDetails.push(`${row.name}: ${err.response?.data?.message || err.message}`);
      }
    }

    setImportResult({ total: parsedRows.length, imported, updated, failed, failedDetails });
    setImporting(false);
    onSuccess();
  };

  const errorCount = Object.keys(errors).length;
  const duplicateCount = Object.keys(duplicates).length;
  const validCount = parsedRows.length - errorCount - (skipDuplicates ? duplicateCount : 0);

  const getRowStatus = (idx) => {
    const rowErrors = errors[idx];
    const isDup = duplicates[idx];
    if (rowErrors && rowErrors.length > 0) return 'error';
    if (isDup && skipDuplicates) return 'duplicate-skip';
    if (isDup) return 'duplicate-update';
    return 'valid';
  };

  return (
    <>
      <div className={`drawer-overlay ${open ? 'open' : ''}`} onClick={onClose} />
      <div className={`drawer ${open ? 'open' : ''}`} style={{ width: '640px', maxWidth: '100vw' }}>
        <div className="drawer-header">
          <h5><BiUpload className="me-2" />{t('customersPage.bulkImport.title')}</h5>
          <button className="btn-close-premium" onClick={onClose}><BiX /></button>
        </div>
        <div className="drawer-body" style={{ padding: 0, display: 'flex', flexDirection: 'column' }}>
          {/* Tabs */}
          <div className="bulk-import-tabs">
            <button
              className={`bulk-import-tab ${activeTab === 'excel' ? 'active' : ''}`}
              onClick={() => { setActiveTab('excel'); setShowPreview(false); setParsedRows([]); }}
            >
              <BiFile /> {t('customersPage.bulkImport.tabExcel')}
            </button>
            <button
              className={`bulk-import-tab ${activeTab === 'paste' ? 'active' : ''}`}
              onClick={() => { setActiveTab('paste'); setShowPreview(false); setParsedRows([]); }}
            >
              <BiPaste /> {t('customersPage.bulkImport.tabPaste')}
            </button>
          </div>

          <div style={{ padding: '1.25rem', flex: 1, overflowY: 'auto' }}>
            {/* ─── Tab 1: Excel/CSV ────────────────────────────────────────── */}
            {activeTab === 'excel' && !showPreview && (
              <div className="bulk-import-upload-area">
                <div className="bulk-import-upload-box">
                  <BiUpload size={48} />
                  <h6>{t('customersPage.bulkImport.uploadTitle')}</h6>
                  <p>{t('customersPage.bulkImport.uploadDesc')}</p>
                  <div className="d-flex gap-2 justify-content-center flex-wrap">
                    <button
                      className="btn-premium btn-premium-primary"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <BiUpload /> {t('customersPage.bulkImport.selectFile')}
                    </button>
                    <button
                      className="btn-premium btn-premium-secondary"
                      onClick={handleDownloadTemplate}
                    >
                      <BiDownload /> {t('customersPage.bulkImport.downloadTemplate')}
                    </button>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    style={{ display: 'none' }}
                    onChange={handleFileUpload}
                  />
                  <div className="bulk-import-format-info">
                    <BiInfoCircle />
                    <small>{t('customersPage.bulkImport.formatInfo')}</small>
                  </div>
                </div>
              </div>
            )}

            {/* ─── Tab 2: Paste ────────────────────────────────────────────── */}
            {activeTab === 'paste' && !showPreview && (
              <div className="bulk-import-paste-area">
                <div className="bulk-import-paste-header">
                  <BiPaste size={28} />
                  <h6>{t('customersPage.bulkImport.pasteTitle')}</h6>
                </div>
                <p className="bulk-import-paste-desc">
                  {t('customersPage.bulkImport.pasteDesc')}
                </p>
                <div className="bulk-import-format-example">
                  <strong>{t('customersPage.bulkImport.formatLabel')}</strong> {t('customersPage.bulkImport.formatExample')}
                </div>
                <textarea
                  className="bulk-import-textarea"
                  rows={8}
                  value={pasteData}
                  onChange={(e) => setPasteData(e.target.value)}
                  placeholder={t('customersPage.bulkImport.pasteExample')}
                />
                <button
                  className="btn-premium btn-premium-primary w-100 mt-2"
                  onClick={handleParsePaste}
                >
                  <BiTable /> {t('customersPage.bulkImport.parsePreview')}
                </button>
              </div>
            )}

            {/* ─── Preview Table ───────────────────────────────────────────── */}
            {showPreview && parsedRows.length > 0 && (
              <div className="bulk-import-preview">
                {/* Summary Stats */}
                <div className="bulk-import-summary">
                  <div className="bulk-import-stat">
                    <span className="bulk-import-stat-value">{parsedRows.length}</span>
                    <span className="bulk-import-stat-label">{t('customersPage.bulkImport.totalRows')}</span>
                  </div>
                  <div className="bulk-import-stat bulk-import-stat-valid">
                    <span className="bulk-import-stat-value">{validCount}</span>
                    <span className="bulk-import-stat-label">{t('customersPage.bulkImport.valid')}</span>
                  </div>
                  <div className="bulk-import-stat bulk-import-stat-error">
                    <span className="bulk-import-stat-value">{errorCount}</span>
                    <span className="bulk-import-stat-label">{t('customersPage.bulkImport.errors')}</span>
                  </div>
                  <div className="bulk-import-stat bulk-import-stat-dup">
                    <span className="bulk-import-stat-value">{duplicateCount}</span>
                    <span className="bulk-import-stat-label">{t('customersPage.bulkImport.duplicates')}</span>
                  </div>
                </div>

                {/* Duplicate handling toggle */}
                {duplicateCount > 0 && (
                  <div className="bulk-import-dup-toggle">
                    <label className="bulk-import-toggle-label">
                      <input
                        type="checkbox"
                        checked={skipDuplicates}
                        onChange={(e) => setSkipDuplicates(e.target.checked)}
                      />
                      <span>{t('customersPage.bulkImport.skipDuplicates', { count: duplicateCount })}</span>
                    </label>
                    <span className="bulk-import-toggle-hint">
                      {t('customersPage.bulkImport.skipDuplicatesHint')}
                    </span>
                  </div>
                )}

                {/* Import Result */}
                {importResult && (
                  <div className="bulk-import-result">
                    <div className="bulk-import-result-icon">
                      <BiCheck size={32} />
                    </div>
                    <h6>{t('customersPage.bulkImport.importComplete')}</h6>
                    <div className="bulk-import-result-stats">
                      <span>{t('customersPage.bulkImport.imported')} <strong>{importResult.imported}</strong></span>
                      <span>{t('customersPage.bulkImport.updated')} <strong>{importResult.updated}</strong></span>
                      <span>{t('customersPage.bulkImport.failed')} <strong style={{ color: importResult.failed > 0 ? 'var(--danger)' : undefined }}>{importResult.failed}</strong></span>
                    </div>
                    {importResult.failedDetails.length > 0 && (
                      <div className="bulk-import-result-failures">
                        <small>{t('customersPage.bulkImport.failedRows')}</small>
                        {importResult.failedDetails.map((detail, i) => (
                          <div key={i} className="bulk-import-failure-item">{detail}</div>
                        ))}
                      </div>
                    )}
                    <button
                      className="btn-premium btn-premium-primary mt-3"
                      onClick={() => { setShowPreview(false); setImportResult(null); setParsedRows([]); }}
                    >
                      <BiRefresh /> {t('customersPage.bulkImport.importMore')}
                    </button>
                  </div>
                )}

                {/* Preview Table (hidden when import complete) */}
                {!importResult && (
                  <>
                    <div className="bulk-import-preview-scroll">
                      <table className="bulk-import-table">
                        <thead>
                          <tr>
                            <th style={{ width: '40px' }}>#</th>
                            <th>{t('common.name')}</th>
                            <th>{t('auth.phone')}</th>
                            <th>{t('auth.email')}</th>
                            <th>{t('customersPage.address')}</th>
                            <th style={{ width: '80px' }}>{t('common.status')}</th>
                            <th style={{ width: '40px' }}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {parsedRows.map((row, idx) => {
                            const status = getRowStatus(idx);
                            return (
                              <tr key={idx} className={`bulk-import-row-${status}`}>
                                <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{idx + 1}</td>
                                <td>
                                  <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{row.name || '-'}</div>
                                  {row.nameBn && <small style={{ color: 'var(--text-muted)' }}>{row.nameBn}</small>}
                                </td>
                                <td style={{ fontSize: '0.85rem' }}>{row.phone || '-'}</td>
                                <td style={{ fontSize: '0.85rem' }}>{row.email || '-'}</td>
                                <td style={{ fontSize: '0.85rem', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.address || '-'}</td>
                                <td>
                                  {status === 'error' && (
                                    <span className="bulk-import-status-badge status-error" title={errors[idx]?.join(', ')}>
                                      <BiError /> {t('customersPage.bulkImport.statusError')}
                                    </span>
                                  )}
                                  {status === 'duplicate-skip' && (
                                    <span className="bulk-import-status-badge status-dup-skip" title={t('customersPage.bulkImport.duplicateOf', { name: duplicates[idx]?.name })}>
                                      <BiX /> {t('customersPage.bulkImport.statusSkip')}
                                    </span>
                                  )}
                                  {status === 'duplicate-update' && (
                                    <span className="bulk-import-status-badge status-dup-update" title={t('customersPage.bulkImport.willUpdate', { name: duplicates[idx]?.name })}>
                                      <BiRefresh /> {t('customersPage.bulkImport.statusUpdate')}
                                    </span>
                                  )}
                                  {status === 'valid' && (
                                    <span className="bulk-import-status-badge status-valid">
                                      <BiCheck /> {t('customersPage.bulkImport.statusValid')}
                                    </span>
                                  )}
                                </td>
                                <td>
                                  <button
                                    className="bulk-import-remove-row"
                                    onClick={() => removeRow(idx)}
                                    title={t('customersPage.bulkImport.removeRow')}
                                  >
                                    <BiX />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Error Details */}
                    {errorCount > 0 && (
                      <div className="bulk-import-errors-section">
                        <h6><BiError /> {t('customersPage.bulkImport.rowErrors')}</h6>
                        {Object.entries(errors).map(([idx, errs]) => (
                          <div key={idx} className="bulk-import-error-item">
                            <strong>{t('customersPage.bulkImport.rowLabel', { num: parseInt(idx) + 1 })}</strong> {parsedRows[parseInt(idx)]?.name} — {errs.join(', ')}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="bulk-import-actions">
                      <button
                        className="btn-premium btn-premium-secondary"
                        onClick={() => { setShowPreview(false); setImportResult(null); }}
                      >
                        <BiX /> {t('common.cancel')}
                      </button>
                      <button
                        className="btn-premium btn-premium-primary"
                        onClick={handleImport}
                        disabled={importing || validCount === 0}
                      >
                        {importing ? (
                          <><span className="spinner-border spinner-border-sm" /> {t('customersPage.bulkImport.importing')}</>
                        ) : (
                          <><BiUpload /> {t('customersPage.bulkImport.importCustomer', { count: validCount })}</>
                        )}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

// Fixed page size for the "All Customers" list — server-side pagination via ?page=&limit=.
const CUSTOMERS_PER_PAGE = 10;

// ═══════════════════════════════════════════════════════════════════
//  MAIN CUSTOMERS PAGE
// ═══════════════════════════════════════════════════════════════════
const Customers = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();

  // ── Skeleton Loading ────────────────────────────────────────────────
  const CustomersSkeletonLoader = () => (
    <div>
      <style>{`@keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }`}</style>
      {/* Page Header */}
      <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
        <div style={{ flex: 1 }}>
          <div style={{
            height: 28, width: '25%', marginBottom: 8,
            background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
            backgroundSize: '200% 100%', borderRadius: 8,
            animation: 'shimmer 1.5s infinite',
          }} />
          <div style={{
            height: 14, width: '18%',
            background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
            backgroundSize: '200% 100%', borderRadius: 6,
            animation: 'shimmer 1.5s infinite',
          }} />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{
            height: 36, width: 130,
            background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
            backgroundSize: '200% 100%', borderRadius: 8,
            animation: 'shimmer 1.5s infinite',
          }} />
          <div style={{
            height: 36, width: 140,
            background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
            backgroundSize: '200% 100%', borderRadius: 8,
            animation: 'shimmer 1.5s infinite',
          }} />
        </div>
      </div>

      {/* Stat Cards row */}
      <div className="row g-3 mb-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="col-12 col-sm-6 col-xl-4">
            <div className="premium-card" style={{ padding: '1rem', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                  background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
                  backgroundSize: '200% 100%',
                  animation: 'shimmer 1.5s infinite',
                }} />
                <div style={{ flex: 1 }}>
                  <div style={{
                    height: 10, width: '60%', marginBottom: 6,
                    background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
                    backgroundSize: '200% 100%', borderRadius: 4,
                    animation: 'shimmer 1.5s infinite',
                  }} />
                  <div style={{
                    height: 20, width: '80%',
                    background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
                    backgroundSize: '200% 100%', borderRadius: 6,
                    animation: 'shimmer 1.5s infinite',
                  }} />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter Bar */}
      <div style={{ marginBottom: '1rem' }}>
        <div style={{
          height: 36, width: 280,
          background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
          backgroundSize: '200% 100%', borderRadius: 8,
          animation: 'shimmer 1.5s infinite',
        }} />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: '1.25rem' }}>
        {[1, 2, 3].map((i) => (
          <div key={i} style={{
            height: 36, width: 120,
            background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
            backgroundSize: '200% 100%', borderRadius: 10,
            animation: 'shimmer 1.5s infinite',
          }} />
        ))}
      </div>

      {/* Table skeleton */}
      <div className="table-container desktop-table" style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-lg)', overflow: 'hidden', background: 'var(--bg-card)' }}>
        <div style={{ display: 'flex', padding: '0.85rem 1rem', background: 'var(--bg-input)', borderBottom: '1px solid var(--border-color)', gap: '1rem' }}>
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} style={{
              flex: 1, height: 12,
              background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
              backgroundSize: '200% 100%', borderRadius: 4,
              animation: 'shimmer 1.5s infinite',
            }} />
          ))}
        </div>
        {[1, 2, 3, 4, 5].map((r) => (
          <div key={r} style={{
            display: 'flex', padding: '0.75rem 1rem', gap: '1rem',
            borderTop: '1px solid var(--border-color)',
          }}>
            {[1, 2, 3, 4, 5, 6, 7].map((c) => (
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

  // ─── Table Inline Skeleton ─────────────────────────────────────────────
  const TableSkeletonRows = () => (
    <>
      {[1, 2, 3, 4, 5].map((r) => (
        <tr key={r} style={{ opacity: 0.5 }}>
          {[1, 2, 3, 4, 5, 6, 7].map((c) => (
            <td key={c} style={{ padding: '0.75rem 1rem' }}>
              <div style={{
                height: 10, width: c === 1 ? 24 : c === 4 ? '45%' : c === 5 ? '40%' : '35%',
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

  // ── State ────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('all');
  const [customers, setCustomers] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searching, setSearching] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [bulkImportOpen, setBulkImportOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);

  // Summary stats
  const [stats, setStats] = useState({ totalCustomers: 0, activeCustomers: 0, totalCustomerDue: 0 });

  // Due tab
  const [dueData, setDueData] = useState({ dueCustomers: [], totalDueCustomers: 0, totalDueAmount: 0, dueCollectedToday: 0 });

  // Top tab
  const [topData, setTopData] = useState({ topCustomers: [], topCustomerRevenue: 0, totalPurchasesTop10: 0, averagePurchaseValue: 0 });

  // Payment drawer
  const [paymentDrawerOpen, setPaymentDrawerOpen] = useState(false);
  const [paymentCustomer, setPaymentCustomer] = useState(null);

  // Due customer details drawer
  const [dueDetailsOpen, setDueDetailsOpen] = useState(false);
  const [dueDetailsCustomerId, setDueDetailsCustomerId] = useState(null);

  const isFirstLoad = useRef(true);

  // ── Data fetching ────────────────────────────────────────────
  const fetchCustomers = useCallback(async () => {
    if (isFirstLoad.current) {
      setInitialLoading(true);
    } else {
      setRefreshing(true);
    }
    try {
      const { data } = await api.get(
        `/customers?search=${encodeURIComponent(debouncedSearch)}&page=${page}&limit=${CUSTOMERS_PER_PAGE}`,
        { _skipLoading: true }
      );
      setCustomers(data.customers || []);
      setTotalCount(data.total || 0);
      const pages = Math.max(1, data.pages || 1);
      setTotalPages(pages);
      // Self-correct if the current page no longer exists — e.g. the last
      // customer on the last page was just deleted.
      if (page > pages) {
        setPage(pages);
      }
    } catch (err) { console.error(err); } finally {
      setInitialLoading(false);
      setRefreshing(false);
      setSearching(false);
      if (isFirstLoad.current) isFirstLoad.current = false;
    }
  }, [debouncedSearch, page]);

  const fetchStats = useCallback(async () => {
    try {
      const { data } = await api.get('/customers/stats', { _skipLoading: true });
      setStats(data);
    } catch (err) { console.error(err); }
  }, []);

  const fetchDueData = useCallback(async () => {
    try {
      const { data } = await api.get('/customers/due', { _skipLoading: true });
      setDueData(data);
    } catch (err) { console.error(err); }
  }, []);

  const fetchTopData = useCallback(async () => {
    try {
      const { data } = await api.get('/customers/top', { _skipLoading: true });
      setTopData(data);
    } catch (err) { console.error(err); }
  }, []);

  const refreshAll = useCallback(() => {
    fetchCustomers();
    fetchStats();
    fetchDueData();
    fetchTopData();
  }, [fetchCustomers, fetchStats, fetchDueData, fetchTopData]);

  // The customers list already has its own mount/page/search-driven effect
  // below — only fetch the other three here, or the list would double-fetch
  // on mount.
  useEffect(() => {
    fetchStats();
    fetchDueData();
    fetchTopData();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // A new search term invalidates the current page — always land back on page 1.
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // Deep-link
  useEffect(() => {
    const openId = location.state?.openCustomerId;
    if (!openId) return;
    window.history.replaceState({}, document.title);
    api.get(`/customers/${openId}`, { _skipLoading: true })
      .then(({ data }) => { setViewing(data); setEditing(null); setDrawerOpen(true); })
      .catch((err) => console.error(err));
  }, [location.state]);

  // ── Handlers ─────────────────────────────────────────────────
  const handleView = (customer) => { setViewing(customer); setEditing(null); setDrawerOpen(true); };
  const handleEdit = (customer) => { setEditing(customer); setViewing(null); setDrawerOpen(true); };
  const handleAdd = () => { setEditing(null); setViewing(null); setDrawerOpen(true); };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/customers/${id}`);
      // Deleting the only customer on a page beyond the first would otherwise
      // fetch that now-empty page first — step back a page up front instead.
      if (customers.length === 1 && page > 1) {
        setPage(page - 1);
        fetchStats(); fetchDueData(); fetchTopData();
      } else {
        refreshAll();
      }
      Swal.fire({
        title: t('customersPage.deletedTitle'), text: t('customersPage.deletedText'),
        icon: 'success', timer: 1500, showConfirmButton: false,
        background: 'var(--bg-card)', color: 'var(--text-primary)',
      });
    } catch (err) {
      const backendMsg = err.response?.data?.message || '';
      const message = backendMsg.includes('cannot be deleted because they have existing sales history')
        ? t('customersPage.customerDeleteBlocked') : (backendMsg || t('common.error'));
      Swal.fire({
        title: t('common.error'), text: message, icon: 'error',
        confirmButtonColor: '#6c757d', confirmButtonText: t('common.ok'),
        background: 'var(--bg-card)', color: 'var(--text-primary)',
      });
    }
  };

  const confirmDelete = (customer) => {
    Swal.fire({
      title: t('customersPage.deleteCustomerTitle'),
      text: t('customersPage.deleteCustomerConfirm', { name: customer.name }),
      icon: 'warning', showCancelButton: true,
      confirmButtonColor: '#FF6B6B', cancelButtonColor: '#6c757d',
      confirmButtonText: t('customersPage.yesDeleteIt'), cancelButtonText: t('common.cancel'),
      background: 'var(--bg-card)', color: 'var(--text-primary)', reverseButtons: true,
    }).then((result) => { if (result.isConfirmed) handleDelete(customer._id); });
  };

  const openPayment = (customer) => { setPaymentCustomer(customer); setPaymentDrawerOpen(true); };

  const openDueDetails = (customer) => { setDueDetailsCustomerId(customer._id); setDueDetailsOpen(true); };

  if (initialLoading) return <CustomersSkeletonLoader />;

  // ── Render ───────────────────────────────────────────────────
  return (
    <div>
      {/* Header */}
      <div className="d-flex align-items-center justify-content-between mb-3" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h4 className="mb-1" style={{ fontWeight: 800 }}>{t('nav.customers')}</h4>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>{t('customersPage.subtitle')}</p>
        </div>
        <div className="d-flex gap-2">
          <button className="btn-premium btn-premium-secondary" onClick={() => setBulkImportOpen(true)}>
            <BiUpload /> {t('customersPage.bulkImportButton')}
          </button>
          <button className="btn-premium btn-premium-primary" onClick={handleAdd}>
            <BiPlus /> {t('customersPage.addCustomer')}
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="list-filters-card">
        <div className="list-filter-field list-search-field">
          <div className="search-box">
            <BiSearch className="search-icon" />
            <input className="form-control list-filter-input" placeholder={t('customersPage.searchPlaceholder')}
              value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
      </div>

      {/* ─── Tabs ──────────────────────────────────────────────── */}
      <div className="customers-tabs-row" style={{
        display: 'flex', gap: '8px', marginBottom: '1.25rem',
        overflowX: 'auto', paddingBottom: '4px',
      }}>
        <TabBtn active={activeTab === 'all'} onClick={() => setActiveTab('all')}
          icon={<BiGroup size={16} />} label={t('customersPage.allCustomers')} />
        <TabBtn active={activeTab === 'due'} onClick={() => setActiveTab('due')}
          icon={<BiDollar size={16} />} label={t('customersPage.dueCustomers')} />
        <TabBtn active={activeTab === 'top'} onClick={() => setActiveTab('top')}
          icon={<BiCrown size={16} />} label={t('customersPage.top10Customers')} />
      </div>

      {/* ══════════════════════════════════════════════════════════
          TAB 1: ALL CUSTOMERS
          ══════════════════════════════════════════════════════════ */}
      {activeTab === 'all' && (
        <>
          {/* Summary cards — dashboard style */}
          <div className="row g-3 mb-4 customers-summary-grid">
            <div className="col-12 col-sm-6 col-xl-4">
              <StatCard icon={BiGroup} label={t('customersPage.totalCustomers')} value={stats.totalCustomers} color="primary" />
            </div>
            <div className="col-12 col-sm-6 col-xl-4">
              <StatCard icon={BiUser} label={t('customersPage.activeCustomers')} value={stats.activeCustomers} color="success" />
            </div>
            <div className="col-12 col-sm-6 col-xl-4">
              <StatCard icon={BiDollar} label={t('customersPage.totalCustomerDue')} value={formatCurrency(stats.totalCustomerDue)} color="danger" isCurrency />
            </div>
          </div>

          {/* Table */}
          <div className={`table-container desktop-table ${searching || refreshing ? 'is-refreshing' : 'content-visible'}`}>
            <div className="table-responsive">
              <table className="table-custom mb-0">
                <thead>
                  <tr>
                    <th style={{ width: '56px' }}>{t('common.sl')}</th>
                    <th>{t('auth.name')}</th>
                    <th>{t('auth.phone')}</th>
                    <th>{t('customersPage.totalPurchase')}</th>
                    <th>{t('common.due')}</th>
                    <th>{t('customersPage.loyalty')}</th>
                    <th style={{ width: '140px' }}>{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {refreshing ? (
                    <TableSkeletonRows />
                  ) : searching ? (
                    <tr><td colSpan={7} className="text-center py-5" style={{ color: 'var(--text-muted)' }}>
                      <div className="spinner-border spinner-border-sm me-2" /> {t('common.loading')}
                    </td></tr>
                  ) : customers.length === 0 ? (
                    <tr><td colSpan={7} className="text-center py-5" style={{ color: 'var(--text-muted)' }}>
                      <div style={{ fontSize: '2rem', marginBottom: '0.5rem', opacity: 0.5 }}>👥</div>
                      {t('customersPage.noCustomersFound')}
                    </td></tr>
                  ) : customers.map((customer, idx) => (
                    <tr key={customer._id}>
                      <td style={{ color: 'var(--text-muted)', fontWeight: 600 }}>
                        {(page - 1) * CUSTOMERS_PER_PAGE + idx + 1}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{customer.name}</div>
                        {customer.nameBn && <small style={{ color: 'var(--text-muted)' }}>{customer.nameBn}</small>}
                      </td>
                      <td>{customer.phone}</td>
                      <td>{formatCurrency(customer.totalPurchases)}</td>
                      <td>
                        <span style={customer.dueAmount > 0 ? { color: 'var(--danger)', fontWeight: 700 } : undefined}>
                          {formatCurrency(customer.dueAmount)}
                        </span>
                      </td>
                      <td>
                        <span className="badge badge-primary" style={{
                          background: 'rgba(108, 99, 255, 0.12)', color: 'var(--primary)',
                          padding: '0.3rem 0.75rem', borderRadius: 'var(--border-radius-pill)',
                          fontSize: '0.8rem', fontWeight: 600,
                        }}>
                          {customer.loyaltyPoints || 0} {t('customersPage.pts')}
                        </span>
                      </td>
                      <td>
                        <div className="d-flex gap-1">
                          <button className="btn-action btn-action-view" data-tooltip={t('common.view')}
                            onClick={() => handleView(customer)}><BiShow /></button>
                          <button className="btn-action btn-action-edit" data-tooltip={t('common.edit')}
                            onClick={() => handleEdit(customer)}><BiEdit /></button>
                          <button className="btn-action btn-action-delete" data-tooltip={t('common.delete')}
                            onClick={() => confirmDelete(customer)}><BiTrash /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile cards */}
          <div className={`mobile-cards ${searching || refreshing ? 'is-refreshing' : ''}`}>
            {refreshing ? (
              <div className="text-center py-5" style={{ color: 'var(--text-muted)' }}>
                <div className="spinner-border spinner-border-sm me-2" /> {t('common.loading')}
              </div>
            ) : searching ? (
              <div className="text-center py-4" style={{ color: 'var(--text-muted)' }}>
                <div className="spinner-border spinner-border-sm me-2" /> {t('common.loading')}
              </div>
            ) : customers.length === 0 ? (
              <div className="text-center py-5" style={{ color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem', opacity: 0.5 }}>👥</div>
                {t('customersPage.noCustomersFound')}
              </div>
            ) : customers.map((customer) => (
              <ExpandableCard
                key={customer._id}
                compact={
                  <>
                    <div className="expandable-card__compact-row">
                      <span className="expandable-card__name">{customer.name}</span>
                      <span className="expandable-card__price">{formatCurrency(customer.dueAmount)}</span>
                    </div>
                    <div className="expandable-card__meta">
                      <span className="expandable-card__meta-item"><BiPhone /><strong>{customer.phone}</strong></span>
                      <span className="expandable-card__meta-item"><BiWallet /><span>{formatCurrency(customer.totalPurchases)}</span></span>
                    </div>
                  </>
                }
                expanded={
                  <div className="expandable-card__rows">
                    {[
                      { label: t('auth.phone'), value: customer.phone },
                      { label: t('auth.email'), value: customer.email || '-' },
                      { label: t('customersPage.address'), value: customer.address || '-' },
                      { label: t('customersPage.totalPurchases'), value: formatCurrency(customer.totalPurchases) },
                      { label: t('common.due'), value: formatCurrency(customer.dueAmount), style: customer.dueAmount > 0 ? { color: 'var(--danger)' } : undefined },
                      { label: t('customersPage.loyaltyPoints'), value: `${customer.loyaltyPoints || 0} ${t('customersPage.pts')}` },
                      { label: t('customersPage.customerSince'), value: formatDate(customer.createdAt) },
                    ].map((item, i) => (
                      <div key={i} className="expandable-card__row">
                        <span className="expandable-card__row-label">{item.label}</span>
                        <span className="expandable-card__row-dots" />
                        <span className="expandable-card__row-value" style={item.style}>{item.value}</span>
                      </div>
                    ))}
                  </div>
                }
                actions={
                  <>
                    <button className="btn-action btn-action-view" data-tooltip={t('common.view')}
                      onClick={() => handleView(customer)}><BiShow /></button>
                    <button className="btn-action btn-action-edit" data-tooltip={t('common.edit')}
                      onClick={() => handleEdit(customer)}><BiEdit /></button>
                    <button className="btn-action btn-action-delete" data-tooltip={t('common.delete')}
                      onClick={() => confirmDelete(customer)}><BiTrash /></button>
                  </>
                }
              />
            ))}
          </div>

          {/* Pagination — shared between desktop table and mobile cards */}
          <Pagination
            page={page}
            totalPages={totalPages}
            totalCount={totalCount}
            pageSize={CUSTOMERS_PER_PAGE}
            onPageChange={setPage}
          />
        </>
      )}

      {/* ══════════════════════════════════════════════════════════
          TAB 2: DUE CUSTOMERS
          ══════════════════════════════════════════════════════════ */}
      {activeTab === 'due' && (
        <>
          {/* Summary cards — dashboard style */}
          <div className="row g-3 mb-4 customers-summary-grid">
            <div className="col-12 col-sm-6 col-xl-4">
              <StatCard icon={BiUser} label={t('customersPage.totalDueCustomers')} value={dueData.totalDueCustomers} color="danger" />
            </div>
            <div className="col-12 col-sm-6 col-xl-4">
              <StatCard icon={BiDollar} label={t('customersPage.totalDueAmount')} value={formatCurrency(dueData.totalDueAmount)} color="danger" isCurrency />
            </div>
            <div className="col-12 col-sm-6 col-xl-4">
              <StatCard icon={BiCreditCard} label={t('customersPage.dueCollectedToday')} value={formatCurrency(dueData.dueCollectedToday)} color="success" isCurrency />
            </div>
          </div>

          {/* Due Customers List */}
          {dueData.dueCustomers.length === 0 ? (
            <div style={{
              padding: '2rem', textAlign: 'center', borderRadius: 'var(--border-radius-md)',
              background: 'var(--bg-card)', border: '1px dashed var(--border-light)',
              color: 'var(--text-muted)', fontSize: '0.85rem',
            }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem', opacity: 0.5 }}>🎉</div>
              {t('customersPage.noDueCustomers')}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {dueData.dueCustomers.map((customer) => (
                <div key={customer._id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  flexWrap: 'wrap', gap: '10px',
                  padding: '12px 16px', borderRadius: 'var(--border-radius-md)',
                  background: 'var(--bg-card)', border: '1px solid var(--border-light)',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                }}>
                  <div style={{ flex: '1 1 180px', minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>{customer.name}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      📞 {customer.phone}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flex: '0 0 auto' }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--danger)' }}>
                      {formatCurrency(customer.dueAmount)}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      {t('customersPage.totalPurchase')}: {formatCurrency(customer.totalPurchases)}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <button
                      className="btn-premium btn-premium-secondary"
                      style={{ padding: '0.4rem 0.9rem', fontSize: '0.78rem', whiteSpace: 'nowrap' }}
                      onClick={() => openDueDetails(customer)}
                    >
                      <BiShow style={{ marginRight: 4 }} /> {t('common.viewDetails')}
                    </button>
                    <button
                      className="btn-premium btn-premium-primary"
                      style={{ padding: '0.4rem 0.9rem', fontSize: '0.78rem', whiteSpace: 'nowrap' }}
                      onClick={() => openPayment(customer)}
                    >
                      <BiCreditCard style={{ marginRight: 4 }} /> {t('customersPage.receivePayment')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ══════════════════════════════════════════════════════════
          TAB 3: TOP 10 CUSTOMERS
          ══════════════════════════════════════════════════════════ */}
      {activeTab === 'top' && (
        <>
          {/* Summary cards — dashboard style */}
          <div className="row g-3 mb-4 customers-summary-grid">
            <div className="col-12 col-sm-6 col-xl-4">
              <StatCard icon={BiCrown} label={t('customersPage.topCustomerRevenue')} value={formatCurrency(topData.topCustomerRevenue)} color="primary" isCurrency />
            </div>
            <div className="col-12 col-sm-6 col-xl-4">
              <StatCard icon={BiTrendingUp} label={t('customersPage.totalPurchasesTop10')} value={formatCurrency(topData.totalPurchasesTop10)} color="success" isCurrency />
            </div>
            <div className="col-12 col-sm-6 col-xl-4">
              <StatCard icon={BiAward} label={t('customersPage.averagePurchaseValue')} value={formatCurrency(topData.averagePurchaseValue)} color="warning" isCurrency />
            </div>
          </div>

          {/* Top 10 Table */}
          <div className="table-container desktop-table">
            <div className="table-responsive">
              <table className="table-custom mb-0">
                <thead>
                  <tr>
                    <th style={{ width: '50px' }}>#</th>
                    <th>{t('auth.name')}</th>
                    <th>{t('auth.phone')}</th>
                    <th>{t('customersPage.totalOrders')}</th>
                    <th>{t('customersPage.totalPurchaseAmount')}</th>
                  </tr>
                </thead>
                <tbody>
                  {topData.topCustomers.length === 0 ? (
                    <tr><td colSpan={5} className="text-center py-5" style={{ color: 'var(--text-muted)' }}>
                      <div style={{ fontSize: '2rem', marginBottom: '0.5rem', opacity: 0.5 }}>👑</div>
                      {t('customersPage.noCustomersFound')}
                    </td></tr>
                  ) : topData.topCustomers.map((customer, idx) => (
                    <tr key={customer._id}>
                      <td>
                        <div style={{
                          width: '28px', height: '28px', borderRadius: '50%',
                          background: idx < 3 ? 'linear-gradient(135deg, #FFD700, #FFA500)' : 'var(--bg-input)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 700, fontSize: '0.78rem',
                          color: idx < 3 ? '#fff' : 'var(--text-muted)',
                        }}>
                          {idx < 3 ? ['🥇', '🥈', '🥉'][idx] : idx + 1}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{customer.name}</div>
                        {customer.nameBn && <small style={{ color: 'var(--text-muted)' }}>{customer.nameBn}</small>}
                      </td>
                      <td>{customer.phone}</td>
                      <td>{customer.totalOrders}</td>
                      <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{formatCurrency(customer.totalPurchases)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile cards for Top 10 */}
          <div className="mobile-cards">
            {topData.topCustomers.length === 0 ? (
              <div className="text-center py-5" style={{ color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem', opacity: 0.5 }}>👑</div>
                {t('customersPage.noCustomersFound')}
              </div>
            ) : topData.topCustomers.map((customer, idx) => (
              <ExpandableCard
                key={customer._id}
                compact={
                  <>
                    <div className="expandable-card__compact-row">
                      <span className="expandable-card__name" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{
                          width: '24px', height: '24px', borderRadius: '50%',
                          background: idx < 3 ? 'linear-gradient(135deg, #FFD700, #FFA500)' : 'var(--bg-input)',
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 700, fontSize: '0.7rem',
                          color: idx < 3 ? '#fff' : 'var(--text-muted)',
                        }}>
                          {idx < 3 ? ['🥇', '🥈', '🥉'][idx] : idx + 1}
                        </span>
                        {customer.name}
                      </span>
                      <span className="expandable-card__price" style={{ color: 'var(--primary)' }}>
                        {formatCurrency(customer.totalPurchases)}
                      </span>
                    </div>
                    <div className="expandable-card__meta">
                      <span className="expandable-card__meta-item"><BiPhone /><strong>{customer.phone}</strong></span>
                      <span className="expandable-card__meta-item"><BiReceipt /><span>{customer.totalOrders} {t('sale.items')}</span></span>
                    </div>
                  </>
                }
                expanded={
                  <div className="expandable-card__rows">
                    <div className="expandable-card__row">
                      <span className="expandable-card__row-label">{t('auth.phone')}</span>
                      <span className="expandable-card__row-dots" />
                      <span className="expandable-card__row-value">{customer.phone}</span>
                    </div>
                    <div className="expandable-card__row">
                      <span className="expandable-card__row-label">{t('customersPage.totalOrders')}</span>
                      <span className="expandable-card__row-dots" />
                      <span className="expandable-card__row-value">{customer.totalOrders}</span>
                    </div>
                    <div className="expandable-card__row">
                      <span className="expandable-card__row-label">{t('customersPage.totalPurchaseAmount')}</span>
                      <span className="expandable-card__row-dots" />
                      <span className="expandable-card__row-value" style={{ color: 'var(--primary)', fontWeight: 700 }}>
                        {formatCurrency(customer.totalPurchases)}
                      </span>
                    </div>
                  </div>
                }
              />
            ))}
          </div>
        </>
      )}

      {/* ─── Drawers ───────────────────────────────────────────── */}
      <CustomerDrawer
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setEditing(null); setViewing(null); }}
        onSuccess={refreshAll}
        editing={editing}
        viewing={viewing}
        onEditFromView={(customer) => { setDrawerOpen(false); setViewing(null); setTimeout(() => { setEditing(customer); setDrawerOpen(true); }, 200); }}
        t={t}
        navigate={navigate}
      />

      {/* Bulk Import Drawer */}
      <BulkImportDrawer
        open={bulkImportOpen}
        onClose={() => setBulkImportOpen(false)}
        onSuccess={refreshAll}
        t={t}
      />

      <PaymentDrawer
        open={paymentDrawerOpen}
        onClose={() => { setPaymentDrawerOpen(false); setPaymentCustomer(null); }}
        customer={paymentCustomer}
        onSuccess={refreshAll}
        t={t}
      />

      <CustomerDueDetailsDrawer
        open={dueDetailsOpen}
        customerId={dueDetailsCustomerId}
        onClose={() => setDueDetailsOpen(false)}
        t={t}
      />
    </div>
  );
};

export default Customers;