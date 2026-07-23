import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import showToast from '../../utils/toast';
import {
  BiSearch, BiFilter, BiX, BiChevronDown, BiChevronLeft, BiChevronRight,
  BiDotsVertical, BiRefresh, BiCreditCard, BiCalendar, BiUser, BiStore,
  BiDollar, BiTime, BiCheckCircle, BiError, BiInfoCircle, BiShow,
} from 'react-icons/bi';
import Swal from 'sweetalert2';

// ─── Color Palette ────────────────────────────────────────────
const COLORS = {
  primary: '#6C63FF',
  primaryLight: '#6C63FF15',
  success: '#00D9A6',
  successLight: '#00D9A615',
  warning: '#FFB545',
  warningLight: '#FFB54515',
  danger: '#FF6B6B',
  dangerLight: '#FF6B6B15',
  grey: '#9a9ab8',
  greyLight: '#9a9ab815',
  bg: '#f5f6fa',
  card: '#ffffff',
  border: '#e8e8f0',
  text: '#1a1a2e',
  textSecondary: '#6b6b8d',
};

const formatDate = (dateStr, lang) => {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return new Date(dateStr).toLocaleDateString();
  }
};

const formatDateTime = (dateStr, lang) => {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleString(lang === 'bn' ? 'bn-BD' : 'en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return new Date(dateStr).toLocaleString();
  }
};

const formatNumber = (num, lang) => {
  if (num === undefined || num === null) return '0';
  try {
    return Number(num).toLocaleString(lang === 'bn' ? 'bn-BD' : 'en-IN');
  } catch {
    return Number(num).toLocaleString();
  }
};

// ─── Status Badge ─────────────────────────────────────────────
const StatusBadge = ({ status, size = 'md' }) => {
  const { t } = useTranslation();
  const map = {
    active:    { bg: COLORS.successLight, color: '#00a67e', dot: '#00D9A6', labelKey: 'saSubscriptionsPage.statusActive' },
    queued:    { bg: COLORS.warningLight, color: '#cc8a00', dot: '#FFB545', labelKey: 'saSubscriptionsPage.statusQueued' },
    expired:   { bg: COLORS.dangerLight,  color: '#cc3b3b', dot: '#FF6B6B', labelKey: 'saSubscriptionsPage.statusExpired' },
    cancelled: { bg: COLORS.greyLight,    color: '#6b6b8d', dot: '#9a9ab8', labelKey: 'saSubscriptionsPage.statusCancelled' },
  };
  const s = map[status] || map.expired;
  const isSm = size === 'sm';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: isSm ? 4 : 6,
      padding: isSm ? '2px 8px' : '4px 12px',
      borderRadius: 100, fontSize: isSm ? '0.7rem' : '0.78rem',
      fontWeight: 700, background: s.bg, color: s.color,
      letterSpacing: '0.2px', whiteSpace: 'nowrap',
      transition: 'transform 0.15s',
    }}
      onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.04)'}
      onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
    >
      <span style={{
        width: isSm ? 5 : 7, height: isSm ? 5 : 7,
        borderRadius: '50%', background: s.dot,
        display: 'inline-block', flexShrink: 0,
      }} />
      {t(s.labelKey)}
    </span>
  );
};

// ─── Skeleton Row ────────────────────────────────────────────
const SkeletonRow = () => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 16,
    padding: '1rem 1.5rem', borderBottom: `1px solid ${COLORS.border}`,
  }}>
    {[40, 25, 20, 20, 15, 18, 12].map((w, i) => (
      <div key={i} style={{
        flex: i < 2 ? w : 1, height: 14,
        background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
        backgroundSize: '200% 100%',
        borderRadius: 6,
        animation: 'shimmer 1.5s infinite',
      }} />
    ))}
  </div>
);

// ─── KPI Card ────────────────────────────────────────────────
const KpiCard = ({ icon: Icon, label, value, color, subtitle }) => (
  <div style={{
    background: COLORS.card, borderRadius: 16, padding: '1.25rem 1.5rem',
    border: `1px solid ${COLORS.border}`,
    display: 'flex', alignItems: 'center', gap: 16,
    transition: 'transform 0.2s, box-shadow 0.2s',
  }}
    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.06)'; }}
    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
  >
    <div style={{
      width: 44, height: 44, borderRadius: 12,
      background: `${color}18`, color: color,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '1.3rem', flexShrink: 0,
    }}>
      <Icon />
    </div>
    <div>
      <div style={{ fontSize: '0.75rem', color: COLORS.textSecondary, fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: '1.5rem', fontWeight: 800, color: COLORS.text, lineHeight: 1.2 }}>
        {typeof value === 'number' ? Number(value).toLocaleString() : value || 0}
      </div>
      {subtitle && <div style={{ fontSize: '0.7rem', color: COLORS.textSecondary, marginTop: 2 }}>{subtitle}</div>}
    </div>
  </div>
);

// ─── Drawer ──────────────────────────────────────────────────
const Drawer = ({ open, onClose, title, children, width = 520 }) => (
  <>
    {/* Overlay */}
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)',
      zIndex: 1040, opacity: open ? 1 : 0,
      pointerEvents: open ? 'auto' : 'none',
      transition: 'opacity 0.25s ease',
    }} />
    {/* Panel */}
    <div style={{
      position: 'fixed', top: 0, right: 0, bottom: 0,
      width: Math.min(width, window.innerWidth),
      maxWidth: '100vw',
      background: COLORS.card, zIndex: 1050,
      boxShadow: '-4px 0 30px rgba(0,0,0,0.08)',
      transform: open ? 'translateX(0)' : 'translateX(100%)',
      transition: 'transform 0.3s cubic-bezier(0.16,1,0.3,1)',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '1.25rem 1.5rem', borderBottom: `1px solid ${COLORS.border}`,
        flexShrink: 0,
      }}>
        <h5 style={{ margin: 0, fontWeight: 700, fontSize: '1.1rem' }}>{title}</h5>
        <button onClick={onClose} style={{
          width: 32, height: 32, borderRadius: 8, border: 'none',
          background: COLORS.bg, cursor: 'pointer', display: 'flex',
          alignItems: 'center', justifyContent: 'center', color: COLORS.textSecondary,
          transition: 'background 0.15s',
        }}
          onMouseEnter={e => e.currentTarget.style.background = COLORS.border}
          onMouseLeave={e => e.currentTarget.style.background = COLORS.bg}
        >
          <BiX size={18} />
        </button>
      </div>
      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
        {children}
      </div>
    </div>
  </>
);

// ─── Main Component ──────────────────────────────────────────
const Subscriptions = () => {
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [shops, setShops] = useState([]);
  const [plans, setPlans] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const lang = i18n.language;

  // KPI data
  const [activeCount, setActiveCount] = useState(0);
  const [queuedCount, setQueuedCount] = useState(0);
  const [expiringCount, setExpiringCount] = useState(0);
  const [revenue, setRevenue] = useState(0);

  // Drawers
  const [drawerAssign, setDrawerAssign] = useState(false);
  const [drawerDetail, setDrawerDetail] = useState(false);
  const [drawerHistory, setDrawerHistory] = useState(false);
  const [selectedSub, setSelectedSub] = useState(null);
  const [historyData, setHistoryData] = useState([]);

  // Assign form
  const [assignShop, setAssignShop] = useState('');
  const [assignPlan, setAssignPlan] = useState('');
  const [assignDate, setAssignDate] = useState(new Date().toISOString().split('T')[0]);
  const [assignNotes, setAssignNotes] = useState('');
  const [assigning, setAssigning] = useState(false);

  useEffect(() => { fetchData(); }, [page, statusFilter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [subsRes, shopsRes, plansRes, dashRes] = await Promise.all([
        api.get(`/subscription/all?page=${page}&limit=20${statusFilter ? `&status=${statusFilter}` : ''}`, { _skipLoading: true }),
        api.get('/shops', { _skipLoading: true }),
        api.get('/plans', { _skipLoading: true }),
        api.get('/subscription/dashboard', { _skipLoading: true }).catch(() => ({ data: {} })),
      ]);
      setSubscriptions(subsRes.data.subscriptions || []);
      setTotalPages(subsRes.data.pages || 1);
      setShops(shopsRes.data.shops || shopsRes.data || []);
      setPlans(plansRes.data || []);
      setActiveCount(dashRes.data?.activeSubscriptions || 0);
      setQueuedCount(dashRes.data?.queuedSubscriptions || 0);
      setExpiringCount(dashRes.data?.expiringIn3Days || 0);
      setRevenue(dashRes.data?.totalRevenue || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // ── Assign ────────────────────────────────────────────────
  const handleAssign = async () => {
    if (!assignShop || !assignPlan || !assignDate) {
      showToast.error(t('saSubscriptionsPage.toastFillRequired'));
      return;
    }

    const shopName = shops.find(s => s._id === assignShop)?.name || t('common.unknown');
    const planName = plans.find(p => p._id === assignPlan)?.name || t('common.unknown');

    const { isConfirmed } = await Swal.fire({
      title: t('saSubscriptionsPage.confirmAssignTitle'),
      html: `
        <div style="text-align: left; font-size: 0.9rem;">
          <p style="margin-bottom: 0.5rem;">${t('saSubscriptionsPage.confirmAssignTitle')}</p>
          <div style="background: #f5f6fa; border-radius: 8px; padding: 0.75rem 1rem; margin-bottom: 0.5rem;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
              <span style="color: #6b6b8d;">${t('saSubscriptionsPage.confirmAssignShop')}</span>
              <strong>${shopName}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
              <span style="color: #6b6b8d;">${t('saSubscriptionsPage.confirmAssignPlan')}</span>
              <strong>${planName}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
              <span style="color: #6b6b8d;">${t('saSubscriptionsPage.confirmAssignStartDate')}</span>
              <strong>${new Date(assignDate).toLocaleDateString(/* locale irrelevant for confirm popup */)}</strong>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #6b6b8d;">${t('saSubscriptionsPage.confirmAssignEndDate')}</span>
              <strong>${calcEndDate(assignPlan, assignDate) ? formatDate(calcEndDate(assignPlan, assignDate), lang) : t('saSubscriptionsPage.drawerAssignEndDate')}</strong>
            </div>
          </div>
          <p style="color: #e65100; font-size: 0.8rem; margin: 0;">
            ${t('saSubscriptionsPage.confirmAssignWarning')}
          </p>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: COLORS.primary,
      cancelButtonColor: '#6b6b8d',
      confirmButtonText: t('saSubscriptionsPage.confirmAssignYes'),
      cancelButtonText: t('saSubscriptionsPage.confirmAssignCancel'),
      background: COLORS.card,
      color: COLORS.text,
      reverseButtons: true,
    });

    if (!isConfirmed) return;

    setAssigning(true);
    try {
      const { data } = await api.post('/subscription/assign', {
        shopId: assignShop, planId: assignPlan, startDate: assignDate, notes: assignNotes,
      });
      showToast.success(data.message || t('saSubscriptionsPage.toastAssignSuccess'));
      setDrawerAssign(false);
      resetAssignForm();
      fetchData();
    } catch (err) {
      showToast.error(err.response?.data?.message || t('saSubscriptionsPage.toastAssignFailed'));
    } finally {
      setAssigning(false);
    }
  };

  const resetAssignForm = () => {
    setAssignShop(''); setAssignPlan(''); setAssignNotes('');
    setAssignDate(new Date().toISOString().split('T')[0]);
  };

  // ── Cancel ────────────────────────────────────────────────
  const handleCancel = async (subId) => {
    const { value: reason } = await Swal.fire({
      title: t('saSubscriptionsPage.confirmCancelTitle'),
      input: 'textarea',
      inputLabel: t('saSubscriptionsPage.confirmCancelReason'),
      inputPlaceholder: t('saSubscriptionsPage.confirmCancelPlaceholder'),
      showCancelButton: true,
      confirmButtonColor: COLORS.danger,
      confirmButtonText: t('saSubscriptionsPage.confirmCancelBtn'),
      cancelButtonText: t('saSubscriptionsPage.confirmCancelGoBack'),
      background: COLORS.card,
      color: COLORS.text,
      inputValidator: (v) => { if (!v) return t('saSubscriptionsPage.confirmCancelReasonRequired'); },
    });
    if (!reason) return;
    try {
      await api.put(`/subscription/${subId}/cancel`, { cancellationReason: reason });
      showToast.success(t('saSubscriptionsPage.toastCancelSuccess'));
      fetchData();
    } catch (err) {
      showToast.error(err.response?.data?.message || t('saSubscriptionsPage.toastCancelFailed'));
    }
  };

  // ── View Details ──────────────────────────────────────────
  const viewDetails = async (sub) => {
    try {
      const { data } = await api.get(`/subscription/${sub._id}`, { _skipLoading: true });
      setSelectedSub(data);
      setDrawerDetail(true);
    } catch { showToast.error(t('saSubscriptionsPage.toastLoadDetailsFailed')); }
  };

  // ── View History ──────────────────────────────────────────
  const viewHistory = async () => {
    try {
      const { data } = await api.get('/subscription/history?limit=50', { _skipLoading: true });
      setHistoryData(data.subscriptions || []);
      setDrawerHistory(true);
    } catch { showToast.error(t('saSubscriptionsPage.toastLoadHistoryFailed')); }
  };

  // ── Calculate End Date ────────────────────────────────────
  const calcEndDate = (planId, start) => {
    const plan = plans.find(p => p._id === planId);
    if (!plan) return '';
    const map = { monthly: 30, quarterly: 90, yearly: 365 };
    const end = new Date(start);
    end.setDate(end.getDate() + (map[plan.duration] || 30));
    return end.toISOString().split('T')[0];
  };

  // ── Render ────────────────────────────────────────────────
  return (
    <div style={{ padding: '1.5rem', maxWidth: 1360, margin: '0 auto' }}>
      <style>{`
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        .sub-row { transition: background 0.15s, transform 0.15s; }
        .sub-row:hover { background: #f8f9ff; transform: translateX(2px); }
      `}</style>

      {/* ── Header ─────────────────────────────────────────── */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem',
      }}>
        <div>
          <h2 style={{ margin: 0, fontWeight: 800, fontSize: '1.5rem', color: COLORS.text }}>
            {t('saSubscriptionsPage.title')}
          </h2>
          <p style={{ margin: '0.25rem 0 0', color: COLORS.textSecondary, fontSize: '0.85rem' }}>
            {t('saSubscriptionsPage.subtitle')}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => setDrawerAssign(true)} style={{
            padding: '0.6rem 1.25rem', borderRadius: 10, border: 'none',
            background: `linear-gradient(135deg, ${COLORS.primary}, #3a0ca3)`,
            color: 'white', fontWeight: 700, fontSize: '0.85rem',
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
            boxShadow: '0 4px 15px rgba(108,99,255,0.25)',
            transition: 'all 0.15s',
          }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(108,99,255,0.35)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 15px rgba(108,99,255,0.25)'; }}
          >
            {t('saSubscriptionsPage.assignSubscription')}
          </button>
        </div>
      </div>

      {/* ── KPI Cards ──────────────────────────────────────── */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem', marginBottom: '1.5rem',
      }}>
        <KpiCard icon={BiCheckCircle} label={t('saSubscriptionsPage.kpiActiveSubscriptions')} value={activeCount} color={COLORS.success} />
        <KpiCard icon={BiTime} label={t('saSubscriptionsPage.kpiQueuedSubscriptions')} value={queuedCount} color={COLORS.warning} />
        <KpiCard icon={BiError} label={t('saSubscriptionsPage.kpiExpiringIn3Days')} value={expiringCount} color={COLORS.danger} subtitle={t('saSubscriptionsPage.kpiExpiringIn3DaysSub')} />
        <KpiCard icon={BiDollar} label={t('saSubscriptionsPage.kpiTotalRevenue')} value={`₹${formatNumber(revenue, lang)}`} color={COLORS.primary} />
      </div>

      {/* ── Filters ────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1rem',
        flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: COLORS.textSecondary }}>
          <BiFilter size={16} />
          <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{t('saSubscriptionsPage.filterLabel')}</span>
        </div>
        {[
          { value: '', labelKey: 'saSubscriptionsPage.filterAll' },
          { value: 'active', labelKey: 'saSubscriptionsPage.filterActive' },
          { value: 'queued', labelKey: 'saSubscriptionsPage.filterQueued' },
          { value: 'expired', labelKey: 'saSubscriptionsPage.filterExpired' },
          { value: 'cancelled', labelKey: 'saSubscriptionsPage.filterCancelled' },
        ].map(s => (
          <button key={s.value} onClick={() => { setStatusFilter(s.value); setPage(1); }} style={{
            padding: '0.4rem 1rem', borderRadius: 100, border: `1px solid ${statusFilter === s.value ? COLORS.primary : COLORS.border}`,
            background: statusFilter === s.value ? COLORS.primaryLight : COLORS.card,
            color: statusFilter === s.value ? COLORS.primary : COLORS.textSecondary,
            fontWeight: statusFilter === s.value ? 700 : 500, fontSize: '0.8rem',
            cursor: 'pointer', transition: 'all 0.15s',
          }}>
            {t(s.labelKey)}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <button onClick={fetchData} style={{
          padding: '0.4rem 1rem', borderRadius: 100, border: `1px solid ${COLORS.border}`,
          background: COLORS.card, color: COLORS.textSecondary, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8rem',
          transition: 'all 0.15s',
        }}
          onMouseEnter={e => e.currentTarget.style.borderColor = COLORS.primary}
          onMouseLeave={e => e.currentTarget.style.borderColor = COLORS.border}
        >
          <BiRefresh /> {t('saSubscriptionsPage.refresh')}
        </button>
      </div>

      {/* ── Table ──────────────────────────────────────────── */}
      <div style={{
        background: COLORS.card, borderRadius: 16, overflow: 'hidden',
        border: `1px solid ${COLORS.border}`, boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
      }}>
        {/* Header Row */}
        <div style={{
          display: 'flex', alignItems: 'center', padding: '0.85rem 1.5rem',
          background: COLORS.bg, fontWeight: 700, fontSize: '0.78rem',
          color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: '0.5px',
          borderBottom: `1px solid ${COLORS.border}`,
        }}>
          <div style={{ flex: 2 }}>{t('saSubscriptionsPage.tableShopPlan')}</div>
          <div style={{ flex: 1.2, display: 'none', '@media (min-width: 768px)': { display: 'block' } }}>{t('saSubscriptionsPage.tableStartDate')}</div>
          <div style={{ flex: 1.2 }}>{t('saSubscriptionsPage.tableEndDate')}</div>
          <div style={{ flex: 0.8 }}>{t('saSubscriptionsPage.tableAmount')}</div>
          <div style={{ flex: 0.9 }}>{t('saSubscriptionsPage.tableStatus')}</div>
          <div style={{ flex: 0.7, textAlign: 'right' }}>{t('saSubscriptionsPage.tableAction')}</div>
        </div>

        {/* Data Rows */}
        {loading ? (
          <>
            {[1,2,3,4,5].map(i => <SkeletonRow key={i} />)}
          </>
        ) : subscriptions.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: COLORS.textSecondary }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.75rem', opacity: 0.3 }}>📋</div>
            <h4 style={{ color: COLORS.text, marginBottom: '0.25rem' }}>{t('saSubscriptionsPage.emptyTitle')}</h4>
            <p style={{ fontSize: '0.85rem', margin: 0 }}>{t('saSubscriptionsPage.emptyText')}</p>
          </div>
        ) : (
          subscriptions.map(sub => (
            <div key={sub._id} className="sub-row" onClick={() => viewDetails(sub)} style={{
              display: 'flex', alignItems: 'center', padding: '0.85rem 1.5rem',
              borderBottom: `1px solid ${COLORS.border}`, cursor: 'pointer',
            }}>
              {/* Shop & Plan */}
              <div style={{ flex: 2, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', color: COLORS.text }}>{sub.plan?.name || t('common.notAvailable')}</div>
                <div style={{ fontSize: '0.78rem', color: COLORS.textSecondary, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <BiStore size={12} /> {sub.shop?.name || t('common.notAvailable')}
                </div>
              </div>
              {/* Start */}
              <div style={{ flex: 1.2, fontSize: '0.82rem', color: COLORS.text, display: 'none', '@media (min-width: 768px)': { display: 'block' } }}>
                {formatDate(sub.startDate, lang)}
              </div>
              {/* End */}
              <div style={{ flex: 1.2, fontSize: '0.82rem', color: COLORS.text }}>
                <span style={{ color: new Date(sub.endDate) < new Date() ? COLORS.danger : COLORS.text }}>
                  {formatDate(sub.endDate, lang)}
                </span>
              </div>
              {/* Amount */}
              <div style={{ flex: 0.8, fontWeight: 700, fontSize: '0.9rem', color: COLORS.primary }}>
                  ₹{sub.totalAmount || sub.amount}
              </div>
              {/* Status */}
              <div style={{ flex: 0.9 }}>
                <StatusBadge status={sub.status} size={page > 0 ? 'sm' : 'md'} />
              </div>
              {/* Action */}
              <div style={{ flex: 0.7, textAlign: 'right', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }} onClick={e => e.stopPropagation()}>
                <button onClick={() => viewDetails(sub)} style={{
                  padding: '0.3rem 0.65rem', borderRadius: 8, border: `1px solid ${COLORS.primary}`,
                  background: 'transparent', color: COLORS.primary, fontWeight: 600,
                  fontSize: '0.75rem', cursor: 'pointer', transition: 'all 0.15s',
                  display: 'flex', alignItems: 'center', gap: 3,
                }}
                  onMouseEnter={e => { e.currentTarget.style.background = COLORS.primaryLight; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <BiShow size={12} /> {t('saSubscriptionsPage.btnView')}
                </button>
                {sub.status === 'active' && (
                  <button onClick={() => handleCancel(sub._id)} style={{
                    padding: '0.3rem 0.65rem', borderRadius: 8, border: `1px solid ${COLORS.danger}`,
                    background: 'transparent', color: COLORS.danger, fontWeight: 600,
                    fontSize: '0.75rem', cursor: 'pointer', transition: 'all 0.15s',
                  }}
                    onMouseEnter={e => { e.currentTarget.style.background = COLORS.dangerLight; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    {t('saSubscriptionsPage.btnCancel')}
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── Pagination ─────────────────────────────────────── */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: '1.5rem' }}>
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} style={{
            padding: '0.5rem 1rem', borderRadius: 10, border: `1px solid ${COLORS.border}`,
            background: COLORS.card, color: page <= 1 ? COLORS.border : COLORS.text,
            cursor: page <= 1 ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: '0.8rem',
            display: 'flex', alignItems: 'center', gap: 4, transition: 'all 0.15s',
          }}>
            <BiChevronLeft /> {t('saSubscriptionsPage.paginationPrev')}
          </button>
          {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
            const p = page <= 3 ? i + 1 : (page > totalPages - 2 ? totalPages - 4 + i : page - 2 + i);
            if (p > 0 && p <= totalPages) return (
              <button key={p} onClick={() => setPage(p)} style={{
                width: 36, height: 36, borderRadius: 10, border: 'none',
                background: page === p ? COLORS.primary : COLORS.card,
                color: page === p ? 'white' : COLORS.text,
                fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem',
                transition: 'all 0.15s',
              }}>
                {p}
              </button>
            );
            return null;
          })}
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} style={{
            padding: '0.5rem 1rem', borderRadius: 10, border: `1px solid ${COLORS.border}`,
            background: COLORS.card, color: page >= totalPages ? COLORS.border : COLORS.text,
            cursor: page >= totalPages ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: '0.8rem',
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            {t('saSubscriptionsPage.paginationNext')} <BiChevronRight />
          </button>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────── */}
      {/* ── DRAWER: Assign Subscription ─────────────────────── */}
      {/* ──────────────────────────────────────────────────────── */}
      <Drawer open={drawerAssign} onClose={() => { setDrawerAssign(false); resetAssignForm(); }} title={t('saSubscriptionsPage.drawerAssignTitle')}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Shop */}
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: '0.85rem', color: COLORS.text }}>{t('saSubscriptionsPage.drawerAssignShop')}</label>
            <select value={assignShop} onChange={e => setAssignShop(e.target.value)} style={{
              width: '100%', padding: '0.65rem 0.85rem', borderRadius: 10,
              border: `1px solid ${COLORS.border}`, background: COLORS.card,
              color: COLORS.text, fontSize: '0.9rem',
            }}>
              <option value="">{t('saSubscriptionsPage.drawerAssignShopPlaceholder')}</option>
              {shops.map(s => <option key={s._id} value={s._id}>{s.name} ({s.phone})</option>)}
            </select>
          </div>

          {/* Plan */}
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: '0.85rem', color: COLORS.text }}>{t('saSubscriptionsPage.drawerAssignPlan')}</label>
            <select value={assignPlan} onChange={e => setAssignPlan(e.target.value)} style={{
              width: '100%', padding: '0.65rem 0.85rem', borderRadius: 10,
              border: `1px solid ${COLORS.border}`, background: COLORS.card,
              color: COLORS.text, fontSize: '0.9rem',
            }}>
              <option value="">{t('saSubscriptionsPage.drawerAssignPlanPlaceholder')}</option>
              {plans.map(p => <option key={p._id} value={p._id}>{p.name} - ₹{p.price} ({p.duration})</option>)}
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: '0.85rem', color: COLORS.text }}>{t('saSubscriptionsPage.drawerAssignStartDate')}</label>
            <input type="date" value={assignDate} onChange={e => setAssignDate(e.target.value)} style={{
              width: '100%', padding: '0.65rem 0.85rem', borderRadius: 10,
              border: `1px solid ${COLORS.border}`, background: COLORS.card,
              color: COLORS.text, fontSize: '0.9rem',
            }} />
          </div>

          {/* End Date (Auto) */}
          {assignPlan && assignDate && (
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: '0.85rem', color: COLORS.textSecondary }}>
                {t('saSubscriptionsPage.drawerAssignEndDate')}
              </label>
              <input type="date" value={calcEndDate(assignPlan, assignDate)} disabled style={{
                width: '100%', padding: '0.65rem 0.85rem', borderRadius: 10,
                border: `1px solid ${COLORS.border}`, background: COLORS.bg,
                color: COLORS.textSecondary, fontSize: '0.9rem', opacity: 0.7,
              }} />
            </div>
          )}

          {/* Notes */}
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: '0.85rem', color: COLORS.text }}>{t('saSubscriptionsPage.drawerAssignNotes')}</label>
            <textarea value={assignNotes} onChange={e => setAssignNotes(e.target.value)}
              placeholder={t('saSubscriptionsPage.drawerAssignNotesPlaceholder')}
              style={{
                width: '100%', padding: '0.65rem 0.85rem', borderRadius: 10,
                border: `1px solid ${COLORS.border}`, background: COLORS.card,
                color: COLORS.text, fontSize: '0.9rem', minHeight: 80, resize: 'vertical',
              }} />
          </div>

          {/* Submit */}
          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button onClick={() => { setDrawerAssign(false); resetAssignForm(); }} style={{
              flex: 1, padding: '0.7rem', borderRadius: 10, border: `1px solid ${COLORS.border}`,
              background: COLORS.card, color: COLORS.text, fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem',
            }}>{t('saSubscriptionsPage.drawerAssignBtnCancel')}</button>
            <button onClick={handleAssign} disabled={assigning} style={{
              flex: 1, padding: '0.7rem', borderRadius: 10, border: 'none',
              background: `linear-gradient(135deg, ${COLORS.primary}, #3a0ca3)`,
              color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem',
              opacity: assigning ? 0.7 : 1,
            }}>
              {assigning ? t('saSubscriptionsPage.drawerAssignBtnSubmitting') : t('saSubscriptionsPage.drawerAssignBtnSubmit')}
            </button>
          </div>
        </div>
      </Drawer>

      {/* ──────────────────────────────────────────────────────── */}
      {/* ── DRAWER: Subscription Details (Enhanced) ────────── */}
      {/* ──────────────────────────────────────────────────────── */}
      <Drawer open={drawerDetail} onClose={() => setDrawerDetail(false)} title={t('saSubscriptionsPage.drawerDetailTitle')} width={540}>
        {selectedSub && (() => {
          const now = new Date();
          const end = new Date(selectedSub.endDate);
          const daysLeft = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
          const shop = selectedSub.shop || {};
          const plan = selectedSub.plan || {};

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* ═══ Header ═══ */}
              <div style={{
                background: `linear-gradient(135deg, ${COLORS.primary}, #3a0ca3)`,
                borderRadius: 14, padding: '1.5rem', color: 'white',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <h4 style={{ margin: 0, fontWeight: 800 }}>{plan.name || t('common.notAvailable')}</h4>
                  <StatusBadge status={selectedSub.status} />
                </div>
                <div style={{ fontSize: '0.85rem', opacity: 0.8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <BiStore /> {shop.name || t('common.notAvailable')}
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 900, marginTop: 12 }}>
                  ₹{selectedSub.totalAmount || selectedSub.amount}
                </div>
                <div style={{ marginTop: 8, fontSize: '0.85rem', opacity: 0.9 }}>
                  {daysLeft > 0
                    ? t('saSubscriptionsPage.daysRemaining', { days: daysLeft, plural: daysLeft > 1 ? 's' : '' })
                    : t('saSubscriptionsPage.expired')}
                </div>
              </div>

              {/* ═══ Shop Information ═══ */}
              <div>
                <h6 style={{ fontWeight: 700, marginBottom: '0.75rem', color: COLORS.text, fontSize: '0.85rem' }}>{t('saSubscriptionsPage.drawerDetailShopInfo')}</h6>
                <div style={{ background: COLORS.bg, borderRadius: 10, padding: '0.85rem 1rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: COLORS.textSecondary }}>{t('saSubscriptionsPage.drawerDetailShopName')}</div>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem', color: COLORS.text }}>{shop.name || t('common.notAvailable')}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: COLORS.textSecondary }}>{t('saSubscriptionsPage.drawerDetailBusinessType')}</div>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem', color: COLORS.text }}>
                        {shop.businessType ? shop.businessType.charAt(0).toUpperCase() + shop.businessType.slice(1) : t('common.notAvailable')}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: COLORS.textSecondary }}>{t('saSubscriptionsPage.drawerDetailPhone')}</div>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem', color: COLORS.text }}>{shop.phone || t('common.notAvailable')}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: COLORS.textSecondary }}>{t('saSubscriptionsPage.drawerDetailEmail')}</div>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem', color: COLORS.text }}>{shop.email || t('common.notAvailable')}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ═══ Subscription Info ═══ */}
              <div>
                <h6 style={{ fontWeight: 700, marginBottom: '0.75rem', color: COLORS.text, fontSize: '0.85rem' }}>{t('saSubscriptionsPage.drawerDetailSubInfo')}</h6>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                  {[
                    { label: t('saSubscriptionsPage.drawerDetailCurrentPlan'), value: plan.name || t('common.notAvailable') },
                    { label: t('saSubscriptionsPage.drawerDetailStatus'), value: selectedSub.status },
                    { label: t('saSubscriptionsPage.drawerDetailStartDate'), value: formatDate(selectedSub.startDate, lang) },
                    { label: t('saSubscriptionsPage.drawerDetailExpiryDate'), value: formatDate(selectedSub.endDate, lang) },
                    { label: t('saSubscriptionsPage.drawerDetailRemainingDays'), value: daysLeft > 0 ? `${daysLeft}d` : t('saSubscriptionsPage.expired') },
                    { label: t('saSubscriptionsPage.drawerDetailDuration'), value: plan.duration || t('common.notAvailable') },
                    { label: t('saSubscriptionsPage.drawerDetailAmount'), value: `₹${selectedSub.totalAmount || selectedSub.amount}` },
                    { label: t('saSubscriptionsPage.drawerDetailAssignedDate'), value: selectedSub.createdAt ? formatDate(selectedSub.createdAt, lang) : t('common.notAvailable') },
                  ].map((item, i) => (
                    <div key={i} style={{ background: COLORS.bg, borderRadius: 8, padding: '0.65rem 0.85rem' }}>
                      <div style={{ fontSize: '0.68rem', color: COLORS.textSecondary, marginBottom: 1 }}>{item.label}</div>
                      <div style={{ fontWeight: 600, fontSize: '0.83rem', color: COLORS.text }}>{item.value}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ═══ Payment Information ═══ */}
              <div>
                <h6 style={{ fontWeight: 700, marginBottom: '0.75rem', color: COLORS.text, fontSize: '0.85rem' }}>{t('saSubscriptionsPage.drawerDetailPaymentInfo')}</h6>
                <div style={{ background: COLORS.bg, borderRadius: 10, padding: '0.85rem 1rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: COLORS.textSecondary }}>{t('saSubscriptionsPage.drawerDetailPlanPrice')}</div>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem', color: COLORS.text }}>₹{selectedSub.amount || 0}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: COLORS.textSecondary }}>{t('saSubscriptionsPage.drawerDetailDiscount')}</div>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem', color: COLORS.text }}>{selectedSub.discount ? `₹${selectedSub.discount}` : '—'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: COLORS.textSecondary }}>{t('saSubscriptionsPage.drawerDetailTotalAmount')}</div>
                      <div style={{ fontWeight: 700, fontSize: '0.85rem', color: COLORS.primary }}>₹{selectedSub.totalAmount || selectedSub.amount}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: COLORS.textSecondary }}>{t('saSubscriptionsPage.drawerDetailPaymentMethod')}</div>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem', color: COLORS.text }}>
                        {selectedSub.paymentMethod ? selectedSub.paymentMethod.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : '—'}
                      </div>
                    </div>
                  </div>
                  {selectedSub.transactionId && (
                    <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: `1px solid ${COLORS.border}` }}>
                      <div style={{ fontSize: '0.7rem', color: COLORS.textSecondary }}>{t('saSubscriptionsPage.drawerDetailTransactionId')}</div>
                      <div style={{ fontWeight: 600, fontSize: '0.83rem', color: COLORS.text, fontFamily: 'monospace' }}>{selectedSub.transactionId}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* ═══ Next Queued Plan ═══ */}
              {selectedSub.nextSubscription && (
                <div style={{
                  background: COLORS.warningLight, borderRadius: 10, padding: '0.85rem 1rem',
                  border: `1px dashed ${COLORS.warning}`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <span style={{ fontSize: '1rem' }}>📋</span>
                    <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#cc8a00' }}>{t('saSubscriptionsPage.drawerDetailNextQueuedPlan')}</span>
                  </div>
                  <div style={{ fontSize: '0.83rem', color: COLORS.text }}>
                    {t('saSubscriptionsPage.drawerDetailNextQueuedDesc')}
                  </div>
                </div>
              )}

              {/* ═══ Assigned By / Cancellation / Notes ═══ */}
              {selectedSub.assignedBy && (
                <div style={{ background: COLORS.bg, borderRadius: 10, padding: '0.75rem 1rem' }}>
                  <div style={{ fontSize: '0.7rem', color: COLORS.textSecondary, marginBottom: 2 }}>{t('saSubscriptionsPage.drawerDetailAssignedBy')}</div>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{selectedSub.assignedBy?.name || t('common.notAvailable')}</div>
                </div>
              )}

              {selectedSub.cancellationReason && (
                <div style={{ background: COLORS.dangerLight, borderRadius: 10, padding: '0.75rem 1rem', color: COLORS.danger }}>
                  <strong>{t('saSubscriptionsPage.drawerDetailCancelled')}</strong> {selectedSub.cancellationReason}
                  {selectedSub.cancelledAt && <div style={{ fontSize: '0.75rem', marginTop: 4 }}>{formatDateTime(selectedSub.cancelledAt, lang)}</div>}
                </div>
              )}

              {selectedSub.notes && (
                <div style={{ background: COLORS.bg, borderRadius: 10, padding: '0.75rem 1rem' }}>
                  <div style={{ fontSize: '0.7rem', color: COLORS.textSecondary, marginBottom: 2 }}>{t('saSubscriptionsPage.drawerDetailNotes')}</div>
                  <div style={{ fontSize: '0.85rem' }}>{selectedSub.notes}</div>
                </div>
              )}

              {/* ═══ Subscription Timeline ═══ */}
              <div>
                <h6 style={{ fontWeight: 700, marginBottom: '1rem', color: COLORS.text, fontSize: '0.85rem' }}>{t('saSubscriptionsPage.drawerDetailTimeline')}</h6>
                <div style={{ position: 'relative', paddingLeft: 24 }}>
                  <div style={{ position: 'absolute', left: 7, top: 0, bottom: 0, width: 2, background: COLORS.border }} />
                  {(selectedSub.timeline || []).length === 0 ? (
                    <p style={{ color: COLORS.textSecondary, fontSize: '0.85rem' }}>{t('saSubscriptionsPage.drawerDetailNoTimeline')}</p>
                  ) : (
                    selectedSub.timeline.map((event, i) => {
                      const dotColors = {
                        assigned: COLORS.primary, activated: COLORS.success,
                        renewed: COLORS.warning, cancelled: COLORS.danger,
                        expired: COLORS.grey, queued: '#f1c40f',
                      };
                      return (
                        <div key={i} style={{ position: 'relative', paddingBottom: 18 }}>
                          <div style={{
                            position: 'absolute', left: -17, top: 4,
                            width: 14, height: 14, borderRadius: '50%',
                            background: dotColors[event.event] || COLORS.primary,
                            border: `3px solid ${COLORS.card}`, zIndex: 1,
                          }} />
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '0.83rem', textTransform: 'capitalize', color: COLORS.text }}>
                              {event.event}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: COLORS.textSecondary }}>
                              {formatDateTime(event.timestamp, lang)}
                            </div>
                            {event.details && (
                              <div style={{ fontSize: '0.75rem', color: COLORS.textSecondary, marginTop: 2 }}>
                                {event.details}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          );
        })()}
      </Drawer>

      {/* ──────────────────────────────────────────────────────── */}
      {/* ── DRAWER: Subscription History ────────────────────── */}
      {/* ──────────────────────────────────────────────────────── */}
      <Drawer open={drawerHistory} onClose={() => setDrawerHistory(false)} title={t('saSubscriptionsPage.drawerHistoryTitle')} width={540}>
        {historyData.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: COLORS.textSecondary }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.75rem', opacity: 0.3 }}>📄</div>
            <p>{t('saSubscriptionsPage.drawerHistoryEmpty')}</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {historyData.map((sub, i) => (
              <div key={sub._id} style={{
                background: COLORS.bg, borderRadius: 12, padding: '1rem',
                transition: 'transform 0.15s',
              }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateX(4px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'translateX(0)'}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <strong style={{ fontSize: '0.9rem', color: COLORS.text }}>{sub.plan?.name || t('common.notAvailable')}</strong>
                  <StatusBadge status={sub.status} size="sm" />
                </div>
                <div style={{ fontSize: '0.78rem', color: COLORS.textSecondary, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <span>💰 ₹{sub.totalAmount || sub.amount}</span>
                  <span>📅 {formatDate(sub.startDate, lang)} — {formatDate(sub.endDate, lang)}</span>
                  {sub.plan?.duration && <span>⏱ {sub.plan.duration}</span>}
                </div>
                {sub.assignedBy?.name && (
                  <div style={{ fontSize: '0.75rem', color: COLORS.textSecondary, marginTop: 4 }}>
                    {t('saSubscriptionsPage.drawerHistoryAssignedBy', { name: sub.assignedBy.name })}
                  </div>
                )}
                {sub.cancellationReason && (
                  <div style={{ fontSize: '0.75rem', color: COLORS.danger, marginTop: 4 }}>
                    {t('saSubscriptionsPage.drawerHistoryCancelled', { reason: sub.cancellationReason })}
                    {sub.cancelledAt && <> ({formatDate(sub.cancelledAt, lang)})</>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default Subscriptions;