import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  BiArrowBack, BiPrinter, BiFileBlank, BiFilter, BiCart, BiCreditCard, BiDollar,
  BiPhone, BiCalendar, BiReceipt, BiUndo, BiSync, BiSearch, BiX, BiCheck,
  BiCheckCircle, BiErrorCircle, BiTime, BiWallet, BiWalletAlt,
} from 'react-icons/bi';
import api from '../../services/api';
import { showToast } from '../../utils/toast';

// ─── Helpers ───────────────────────────────────────────────────
const formatCurrency = (val) => `₹${Number(val || 0).toFixed(2)}`;
const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const formatDateTime = (d) =>
  d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
const formatTime = (d) =>
  d ? new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '';

const datePresets = (t) => [
  { label: t('common.today'), value: 'today' },
  { label: t('common.last7Days'), value: '7d' },
  { label: t('common.last30Days'), value: '30d' },
  { label: t('common.thisMonth'), value: 'month' },
  { label: t('common.customRange'), value: 'custom' },
];

const getDateRange = (preset) => {
  const now = new Date();
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  switch (preset) {
    case 'today': return { startDate: start, endDate: now };
    case '7d': start.setDate(start.getDate() - 7); return { startDate: start, endDate: now };
    case '30d': start.setDate(start.getDate() - 30); return { startDate: start, endDate: now };
    case 'month': start.setDate(1); return { startDate: start, endDate: now };
    default: return { startDate: null, endDate: null };
  }
};

// ─── Minimal jsPDF table renderer (no autotable plugin installed) ───────
const drawPdfTable = (doc, startY, headers, rows, colWidths) => {
  const marginLeft = 14;
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.getWidth();
  const widths = colWidths || headers.map(() => (pageWidth - marginLeft * 2) / headers.length);
  let y = startY;

  const drawHeader = () => {
    doc.setFont(undefined, 'bold');
    doc.setFontSize(9);
    let x = marginLeft;
    headers.forEach((h, i) => { doc.text(String(h), x, y); x += widths[i]; });
    y += 2;
    doc.setDrawColor(200, 200, 200);
    doc.line(marginLeft, y, marginLeft + widths.reduce((a, b) => a + b, 0), y);
    y += 5;
    doc.setFont(undefined, 'normal');
  };

  drawHeader();
  rows.forEach((row) => {
    if (y > pageHeight - 15) {
      doc.addPage();
      y = 15;
      drawHeader();
    }
    let x = marginLeft;
    row.forEach((cell, i) => { doc.text(String(cell ?? ''), x, y); x += widths[i]; });
    y += 6;
  });

  return y + 4;
};

// ─── Animated count-up for KPI values ───────────────────────────
const useCountUp = (target, duration = 700) => {
  const [value, setValue] = useState(target || 0);
  const fromRef = useRef(target || 0);
  const rafRef = useRef(null);

  useEffect(() => {
    const from = fromRef.current;
    const to = target || 0;
    if (from === to) { setValue(to); return undefined; }
    const start = performance.now();
    const tick = (now) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(from + (to - from) * eased);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = to;
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  return value;
};

const KpiCard = ({ icon: Icon, label, value, accent, glow }) => {
  const animated = useCountUp(value);
  return (
    <div className="ledger-kpi-card" style={{ '--kpi-accent': accent, '--kpi-glow': glow }}>
      <div className="ledger-kpi-icon"><Icon /></div>
      <div style={{ minWidth: 0 }}>
        <div className="ledger-kpi-value">{formatCurrency(animated)}</div>
        <div className="ledger-kpi-label">{label}</div>
      </div>
    </div>
  );
};

// ─── Transaction type visual config ─────────────────────────────
const typeConfig = (t) => ({
  sale: { icon: BiCart, color: '#6C63FF', glow: 'rgba(108,99,255,0.12)', label: t('customer.sale') },
  payment: { icon: BiCreditCard, color: '#00D9A6', glow: 'rgba(0,217,166,0.12)', label: t('customersPage.paymentType') },
  return: { icon: BiUndo, color: '#F39C12', glow: 'rgba(243,156,18,0.12)', label: t('customersPage.returnType') },
  dueAdjustment: { icon: BiSync, color: '#FF6B6B', glow: 'rgba(255,107,107,0.12)', label: t('customersPage.dueAdjustmentType') },
});

// ─── Payment method config (icons & colors matching POS) ────────
const paymentMethodConfig = (t) => [
  { key: 'cash', icon: '💵', label: t('sale.cash'), color: '#2ecc71' },
  { key: 'card', icon: '💳', label: t('sale.card'), color: '#6C63FF' },
  { key: 'upi', icon: '📱', label: t('sale.upi'), color: '#00D9A6' },
  { key: 'mobile_banking', icon: '🏦', label: t('sale.mobileBanking'), color: '#FF6B9D' },
];

// ─── Receive Payment modal ───────────────────────────────────────
const ReceivePaymentModal = ({ open, onClose, customer, onSuccess, t }) => {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('cash');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const dueAmount = customer?.dueAmount || 0;
  const methods = paymentMethodConfig(t);

  useEffect(() => {
    if (open) { setAmount(''); setMethod('cash'); setNote(''); setError(''); }
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
      showToast.success(t('customersPage.receivePayment'));
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`ledger-modal-overlay ${open ? 'open' : ''}`} onClick={onClose}>
      <div className="ledger-modal" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-header" style={{ padding: '0.9rem 1.1rem', minHeight: 'auto' }}>
          <h5 style={{ fontSize: '1rem', margin: 0 }}>{t('customersPage.receivePayment')}</h5>
          <button className="btn-close-premium" onClick={onClose} style={{ width: '32px', height: '32px' }}><BiX /></button>
        </div>
        <div style={{ padding: '1rem 1.1rem' }}>
          {customer && (
            <div style={{
              padding: '0.75rem 1rem', borderRadius: 'var(--border-radius-md)',
              background: 'rgba(108,99,255,0.06)', border: '1px solid rgba(108,99,255,0.12)',
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
          <form onSubmit={handleSubmit} id="ledger-payment-form">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {/* Payment Amount with Exact button */}
              <div>
                <label className="form-label" style={{ fontSize: '0.72rem', marginBottom: '0.2rem' }}>
                  {t('customersPage.paymentAmount')} <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'stretch' }}>
                  <input
                    type="number" step="0.01" className="form-control" value={amount}
                    onChange={(e) => setAmount(e.target.value)} placeholder="0.00"
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
                  className="form-control" value={note} onChange={(e) => setNote(e.target.value)} rows={2}
                  placeholder={t('customersPage.paymentNotePlaceholder')}
                  style={{ padding: '0.45rem 0.75rem', fontSize: '0.82rem', resize: 'vertical' }}
                />
              </div>
            </div>
          </form>
        </div>
        <div className="drawer-footer" style={{ padding: '0.7rem 1.1rem', gap: '0.5rem' }}>
          <button type="button" className="btn-premium btn-premium-secondary" onClick={onClose}
            style={{ padding: '0.5rem 1.25rem', fontSize: '0.82rem', flex: 1, justifyContent: 'center' }}>
            {t('common.cancel')}
          </button>
          <button type="submit" form="ledger-payment-form" className="btn-premium btn-premium-primary" disabled={saving}
            style={{ padding: '0.5rem 1.25rem', fontSize: '0.82rem', flex: 1, justifyContent: 'center' }}>
            {saving ? <><span className="spinner-border spinner-border-sm" /> {t('common.saving')}</>
              : <><BiCheck /> {t('customersPage.pay')}</>}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Skeleton Loading ────────────────────────────────────────────
const CustomerLedgerSkeletonLoader = () => (
  <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
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

    {/* Filter bar skeleton */}
    <div style={{ display: 'flex', gap: '10px', marginBottom: '1rem', flexWrap: 'wrap' }}>
      <div style={{
        height: 36, width: 400,
        background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
        backgroundSize: '200% 100%', borderRadius: 8,
        animation: 'shimmer 1.5s infinite',
      }} />
      <div style={{
        height: 36, width: 150,
        background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
        backgroundSize: '200% 100%', borderRadius: 8,
        animation: 'shimmer 1.5s infinite',
      }} />
      <div style={{
        height: 36, width: 150,
        background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
        backgroundSize: '200% 100%', borderRadius: 8,
        animation: 'shimmer 1.5s infinite',
      }} />
    </div>

    {/* Timeline skeleton */}
    <div>
      {[1, 2, 3, 4].map((r) => (
        <div key={r} className="ledger-txn-row" style={{ opacity: 0.5 }}>
          <div className="ledger-txn-rail">
            <div style={{
              width: 12, height: 12, borderRadius: '50%',
              background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
              backgroundSize: '200% 100%',
              animation: 'shimmer 1.5s infinite',
            }} />
          </div>
          <div className="ledger-txn-card">
            <div style={{
              height: 14, width: '40%', marginBottom: 8,
              background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
              backgroundSize: '200% 100%', borderRadius: 4,
              animation: 'shimmer 1.5s infinite',
            }} />
            <div style={{
              height: 10, width: '30%',
              background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
              backgroundSize: '200% 100%', borderRadius: 4,
              animation: 'shimmer 1.5s infinite',
            }} />
          </div>
        </div>
      ))}
    </div>
  </div>
);

// ─── Inline Timeline Skeleton ──────────────────────────────────────
const TimelineSkeletonRows = () => (
  <>
    {[1, 2, 3, 4].map((r) => (
      <div key={r} className="ledger-txn-row" style={{ opacity: 0.5 }}>
        <div className="ledger-txn-rail">
          <div style={{
            width: 12, height: 12, borderRadius: '50%',
            background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s infinite',
          }} />
        </div>
        <div className="ledger-txn-card">
          <div style={{
            height: 14, width: '40%', marginBottom: 8,
            background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
            backgroundSize: '200% 100%', borderRadius: 4,
            animation: 'shimmer 1.5s infinite',
          }} />
          <div style={{
            height: 10, width: '30%',
            background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
            backgroundSize: '200% 100%', borderRadius: 4,
            animation: 'shimmer 1.5s infinite',
          }} />
        </div>
      </div>
    ))}
  </>
);

const CustomerLedgerPage = () => {
  const { t } = useTranslation();
  const { customerId } = useParams();
  const navigate = useNavigate();

  const [ledgerData, setLedgerData] = useState({ customer: {}, summary: {}, entries: [] });
  const [profile, setProfile] = useState(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [datePreset, setDatePreset] = useState('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [searchInvoice, setSearchInvoice] = useState('');
  const [debouncedSearchInvoice, setDebouncedSearchInvoice] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const isFirstLoad = useRef(true);

  const TYPES = typeConfig(t);

  const fetchLedger = useCallback(async () => {
    if (!customerId) return;
    if (isFirstLoad.current) {
      setInitialLoading(true);
    } else {
      setRefreshing(true);
    }
    try {
      let params = {};
      if (datePreset === 'custom') {
        if (customStart) params.startDate = customStart;
        if (customEnd) params.endDate = customEnd;
      } else if (datePreset !== 'all') {
        const range = getDateRange(datePreset);
        if (range.startDate) params.startDate = range.startDate.toISOString();
        if (range.endDate) params.endDate = range.endDate.toISOString();
      }
      const { data } = await api.get(`/customers/${customerId}/ledger`, { params, _skipLoading: true });
      setLedgerData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setInitialLoading(false);
      setRefreshing(false);
      if (isFirstLoad.current) isFirstLoad.current = false;
    }
  }, [customerId, datePreset, customStart, customEnd]);

  const fetchProfile = useCallback(async () => {
    if (!customerId) return;
    try {
      const { data } = await api.get(`/customers/${customerId}`, { _skipLoading: true });
      setProfile(data);
    } catch (err) {
      console.error(err);
    }
  }, [customerId]);

  useEffect(() => { fetchLedger(); }, [fetchLedger]);
  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  // Debounce invoice search (~250ms) so filtering/animation doesn't fire on every
  // keystroke — clearing the box snaps back to the full list immediately.
  useEffect(() => {
    if (searchInvoice === '') {
      setDebouncedSearchInvoice('');
      return undefined;
    }
    const timer = setTimeout(() => setDebouncedSearchInvoice(searchInvoice), 250);
    return () => clearTimeout(timer);
  }, [searchInvoice]);

  const summary = ledgerData.summary || {};
  const entries = ledgerData.entries || [];
  const customer = ledgerData.customer || {};

  // Client-side derived stats — computed only from what the (unchanged) ledger API already returns
  const totalOrders = useMemo(() => entries.filter((e) => e.type === 'sale').length, [entries]);
  const totalReturns = useMemo(
    () => entries.filter((e) => e.type === 'return').reduce((sum, e) => sum + (e.credit || 0), 0),
    [entries]
  );

  const parsePaymentMethod = (entry) => {
    const match = /\(([^)]+)\)/.exec(entry.description || '');
    return match ? match[1] : '';
  };

  const filteredEntries = useMemo(() => {
    let list = entries;
    if (debouncedSearchInvoice.trim()) {
      const q = debouncedSearchInvoice.trim().toLowerCase();
      list = list.filter((e) => (e.invoiceNo || '').toLowerCase().includes(q));
    }
    if (typeFilter !== 'all') {
      list = list.filter((e) => e.type === typeFilter);
    }
    if (methodFilter !== 'all') {
      list = list.filter((e) => e.type === 'payment' && parsePaymentMethod(e) === methodFilter);
    }
    // newest first for a timeline feel — each entry already carries its own running balance
    return [...list].reverse();
  }, [entries, debouncedSearchInvoice, typeFilter, methodFilter]);

  // Wraps the matching substring of an invoice number in a highlight span.
  const highlightInvoiceMatch = (invoiceNo, query) => {
    if (!query || !invoiceNo) return invoiceNo;
    const idx = invoiceNo.toLowerCase().indexOf(query.trim().toLowerCase());
    if (idx === -1) return invoiceNo;
    return (
      <>
        {invoiceNo.slice(0, idx)}
        <span className="ledger-txn-invoice-highlight">{invoiceNo.slice(idx, idx + query.trim().length)}</span>
        {invoiceNo.slice(idx + query.trim().length)}
      </>
    );
  };

  // Prints the current page in place (no new tab, no navigation) — the browser's
  // native print dialog opens over this page and the user stays here afterward,
  // whether they print or cancel. Non-printable chrome (sidebar/header/filters/
  // action buttons) is hidden via the .no-print class + the global @media print rules.
  const handlePrint = () => {
    window.print();
  };

  const handleBack = () => {
    const canGoBack = window.history.state && window.history.state.idx > 0;
    if (canGoBack) {
      navigate(-1);
    } else {
      navigate('/customers', { state: { openCustomerId: customerId } });
    }
  };

  const exportPDF = async () => {
    setExportingPdf(true);
    try {
      const jsPDF = (await import('jspdf')).default;
      const doc = new jsPDF();

      doc.setFontSize(16);
      doc.text(`${t('customersPage.customerLedger')} - ${customer?.name || ''}`, 14, 15);
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(customer?.phone || '', 14, 22);
      doc.setTextColor(0);

      let y = 32;
      doc.setFontSize(11);
      [
        `${t('customersPage.totalPurchase')}: ${formatCurrency(summary.totalPurchase)}`,
        `${t('customersPage.totalPaid')}: ${formatCurrency(summary.totalPaid)}`,
        `${t('customersPage.currentDue')}: ${formatCurrency(summary.currentDue)}`,
        `${t('customersPage.totalReturns')}: ${formatCurrency(totalReturns)}`,
      ].forEach((line) => { doc.text(line, 14, y); y += 6; });
      y += 4;

      drawPdfTable(
        doc, y,
        [t('customersPage.dateTime'), t('sale.invoiceNo'), t('customersPage.transactionType'), t('customersPage.debit'), t('customersPage.credit'), t('customersPage.balance')],
        entries.map((e) => [formatDateTime(e.date), e.invoiceNo || '—', e.type.toUpperCase(), e.debit > 0 ? formatCurrency(e.debit) : '—', e.credit > 0 ? formatCurrency(e.credit) : '—', formatCurrency(e.balance)])
      );

      doc.save(`ledger-${customer?.name || 'customer'}.pdf`);
      showToast.success(t('toast.pdfExported'));
    } catch (err) {
      showToast.error(t('toast.pdfExportFailed'));
    } finally {
      setExportingPdf(false);
    }
  };

  const isActive = profile ? profile.isActive !== false : null;
  const dueAmount = summary.currentDue || 0;
  const customerForModal = { _id: customerId, name: customer?.name, phone: customer?.phone, dueAmount };

  if (initialLoading) return <CustomerLedgerSkeletonLoader />;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* ─── Page titlebar with Back button ────────────────────── */}
      <div className="ledger-titlebar">
        <button className="btn-premium btn-premium-secondary no-print" onClick={handleBack}>
          <BiArrowBack style={{ marginRight: 4 }} /> {t('common.back')}
        </button>
        <h4 className="ledger-titlebar-heading">{t('customersPage.customerLedger')}</h4>
      </div>

      {/* ─── Premium header banner ─────────────────────────────── */}
      <div className="ledger-header-banner">
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', flexWrap: 'wrap', flex: '1 1 320px' }}>
          <div className="ledger-avatar">{(customer.name || '?').charAt(0).toUpperCase()}</div>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h4 style={{ margin: 0, fontWeight: 800, color: 'var(--text-primary)', fontSize: '1.1rem' }}>
                {customer.name || t('customersPage.customerLedger')}
              </h4>
              {isActive !== null && (
                <span className={`ledger-status-badge ${isActive ? 'is-active' : 'is-inactive'}`}>
                  {isActive ? <BiCheckCircle size={12} /> : <BiErrorCircle size={12} />}
                  {isActive ? t('common.active') : t('common.inactive')}
                </span>
              )}
            </div>
            <p style={{ margin: '2px 0 0', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
              {t('customersPage.ledgerSubtitle')}
            </p>

            <div className="ledger-header-meta">
              {customer.phone && (
                <span className="ledger-meta-chip"><BiPhone size={13} /> {customer.phone}</span>
              )}
              {profile?.createdAt && (
                <span className="ledger-meta-chip"><BiCalendar size={13} /> {t('customersPage.customerSince')}: {formatDate(profile.createdAt)}</span>
              )}
              <span className="ledger-meta-chip"><BiReceipt size={13} /> {t('customersPage.totalOrders')}: {totalOrders}</span>
              <span className={`ledger-meta-chip is-due-highlight ${dueAmount > 0 ? '' : 'is-clear'}`}>
                <BiDollar size={13} /> {t('customersPage.currentDue')}: {formatCurrency(dueAmount)}
              </span>
            </div>
          </div>
        </div>

        <div className="ledger-header-actions no-print">
          <button
            className="btn-premium btn-premium-primary"
            onClick={() => setPaymentModalOpen(true)}
            disabled={dueAmount <= 0}
            style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}
          >
            <BiWalletAlt style={{ marginRight: 4 }} /> {t('customersPage.receivePayment')}
          </button>
          <button className="btn-premium btn-premium-secondary" onClick={handlePrint} style={{ padding: '0.5rem 0.9rem', fontSize: '0.8rem' }}>
            <BiPrinter style={{ marginRight: 4 }} /> {t('customersPage.printLedger')}
          </button>
          <button
            className="btn-premium btn-premium-secondary" onClick={exportPDF} disabled={exportingPdf}
            style={{ padding: '0.5rem 0.9rem', fontSize: '0.8rem' }}
          >
            {exportingPdf ? <span className="spinner-border spinner-border-sm" style={{ marginRight: 4 }} /> : <BiFileBlank style={{ marginRight: 4 }} />}
            {t('common.export')} {t('common.pdf')}
          </button>
        </div>
      </div>

      {/* ─── KPI grid ───────────────────────────────────────────── */}
      <div className="ledger-kpi-grid">
        <KpiCard icon={BiCart} label={t('customersPage.totalPurchase')} value={summary.totalPurchase} accent="#6C63FF" glow="rgba(108,99,255,0.12)" />
        <KpiCard icon={BiCreditCard} label={t('customersPage.totalPaid')} value={summary.totalPaid} accent="#00D9A6" glow="rgba(0,217,166,0.12)" />
        <KpiCard icon={BiWallet} label={t('customersPage.currentDue')} value={dueAmount} accent={dueAmount > 0 ? '#FF6B6B' : '#00D9A6'} glow={dueAmount > 0 ? 'rgba(255,107,107,0.12)' : 'rgba(0,217,166,0.12)'} />
        <KpiCard icon={BiUndo} label={t('customersPage.totalReturns')} value={totalReturns} accent="#F39C12" glow="rgba(243,156,18,0.12)" />
      </div>

      {/* ─── Sticky smart filter bar ────────────────────────────── */}
      <div className="ledger-filter-bar no-print">
        <div className="ledger-filter-pills">
          <button className={`ledger-pill ${datePreset === 'all' ? 'is-active' : ''}`} onClick={() => { setDatePreset('all'); setShowFilters(false); }}>
            {t('common.all')}
          </button>
          {datePresets(t).map((p) => (
            <button
              key={p.value}
              className={`ledger-pill ${datePreset === p.value ? 'is-active' : ''}`}
              onClick={() => { setDatePreset(p.value); setShowFilters(p.value === 'custom'); }}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="ledger-filter-controls">
          <div className="search-box ledger-search-box">
            <BiSearch className="search-icon" />
            <input
              className="form-control" placeholder={t('customersPage.searchInvoiceNo')}
              value={searchInvoice} onChange={(e) => setSearchInvoice(e.target.value)}
            />
            {searchInvoice && (
              <button
                type="button"
                className="ledger-search-clear"
                onClick={() => setSearchInvoice('')}
                aria-label={t('common.clearFilters')}
              >
                <BiX />
              </button>
            )}
          </div>
          <select className="ledger-filter-select" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="all">{t('customersPage.allTypes')}</option>
            <option value="sale">{t('customer.sale')}</option>
            <option value="payment">{t('customersPage.paymentType')}</option>
            <option value="return">{t('customersPage.returnType')}</option>
          </select>
          <select className="ledger-filter-select" value={methodFilter} onChange={(e) => setMethodFilter(e.target.value)}>
            <option value="all">{t('reportsPage.allPaymentMethods')}</option>
            <option value="cash">{t('sale.cash')}</option>
            <option value="card">{t('sale.card')}</option>
            <option value="upi">{t('sale.upi')}</option>
            <option value="mobile_banking">{t('sale.mobileBanking')}</option>
          </select>
        </div>
      </div>

      {showFilters && (
        <div className="no-print" style={{
          display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap',
          padding: '0.75rem 1rem', borderRadius: 'var(--border-radius-md)',
          background: 'var(--bg-card)', border: '1px solid var(--border-light)', marginBottom: '1rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)' }}>{t('common.from')}:</span>
            <input type="date" className="form-control" value={customStart} onChange={(e) => setCustomStart(e.target.value)}
              style={{ padding: '0.3rem 0.5rem', fontSize: '0.78rem', width: '150px', minHeight: '34px' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)' }}>{t('common.to')}:</span>
            <input type="date" className="form-control" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)}
              style={{ padding: '0.3rem 0.5rem', fontSize: '0.78rem', width: '150px', minHeight: '34px' }} />
          </div>
          <button className="btn-premium btn-premium-primary" onClick={fetchLedger} style={{ padding: '0.3rem 0.8rem', fontSize: '0.75rem' }}>
            <BiFilter style={{ marginRight: 4 }} /> {t('common.filter')}
          </button>
        </div>
      )}

      {/* ─── Transaction timeline ───────────────────────────────── */}
      {refreshing ? (
        <TimelineSkeletonRows />
      ) : (
        // Keying on the active filters (re)mounts this branch whenever the debounced
        // search/type/method filters actually change, replaying the fade+slide-in
        // animation on the results — including the transition into/out of the empty
        // state — without touching scroll position or the loading state above.
        <div key={`${debouncedSearchInvoice}|${typeFilter}|${methodFilter}`}>
          {filteredEntries.length === 0 ? (
            <div className="ledger-empty-state">
              <div className="ledger-empty-icon"><BiReceipt /></div>
              <div className="ledger-empty-title">{t('customersPage.noTransactionsFound')}</div>
              <div className="ledger-empty-hint">{t('customersPage.noTransactionsHint')}</div>
            </div>
          ) : (
            <div className="ledger-timeline">
              {filteredEntries.map((entry, idx) => {
                const cfg = TYPES[entry.type] || TYPES.sale;
                const Icon = cfg.icon;
                return (
                  <div key={idx} className="ledger-txn-row" style={{ '--row-delay': Math.min(idx, 10) }}>
                    <div className="ledger-txn-rail">
                      <div className="ledger-txn-dot" style={{ '--txn-color': cfg.color, '--txn-glow': cfg.glow }}>
                        <Icon />
                      </div>
                    </div>
                    <div className="ledger-txn-card" style={{ '--txn-color': cfg.color }}>
                      <div className="ledger-txn-top">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span className="ledger-txn-type-badge" style={{ '--txn-color': cfg.color, '--txn-glow': cfg.glow }}>
                            <Icon size={12} /> {cfg.label}
                          </span>
                          {entry.invoiceNo && (
                            <span className="ledger-txn-invoice">
                              {highlightInvoiceMatch(entry.invoiceNo, debouncedSearchInvoice)}
                            </span>
                          )}
                        </div>
                        <span className="ledger-txn-datetime">
                          <BiTime size={12} /> {formatDate(entry.date)} · {formatTime(entry.date)}
                        </span>
                      </div>

                      <div className="ledger-txn-amounts">
                        <div className="ledger-txn-amount-item">
                          <span className="ledger-txn-amount-label">{t('customersPage.debit')}</span>
                          <span className="ledger-txn-amount-value" style={{ color: entry.debit > 0 ? '#6C63FF' : 'var(--text-muted)' }}>
                            {entry.debit > 0 ? formatCurrency(entry.debit) : '—'}
                          </span>
                        </div>
                        <div className="ledger-txn-amount-item">
                          <span className="ledger-txn-amount-label">{t('customersPage.credit')}</span>
                          <span className="ledger-txn-amount-value" style={{ color: entry.credit > 0 ? '#00D9A6' : 'var(--text-muted)' }}>
                            {entry.credit > 0 ? formatCurrency(entry.credit) : '—'}
                          </span>
                        </div>
                        <div className="ledger-txn-balance-badge">
                          <span className="ledger-txn-amount-label">{t('customersPage.runningBalance')}</span>
                          <span className="ledger-txn-amount-value" style={{ color: entry.balance > 0 ? '#e74c3c' : '#2ecc71' }}>
                            {formatCurrency(entry.balance)}
                          </span>
                        </div>
                      </div>

                      {entry.note && <div className="ledger-txn-note">{entry.note}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <ReceivePaymentModal
        open={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        customer={customerForModal}
        onSuccess={() => { fetchLedger(); fetchProfile(); }}
        t={t}
      />
    </div>
  );
};

export default CustomerLedgerPage;