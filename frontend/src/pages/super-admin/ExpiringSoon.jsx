import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import showToast from '../../utils/toast';
import {
  BiSearch, BiFilter, BiX, BiChevronLeft, BiChevronRight,
  BiRefresh, BiStore, BiTime, BiCalendar, BiError,
  BiCheckCircle, BiBell, BiInfoCircle,
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
const StatusBadge = ({ status }) => {
  const { t } = useTranslation();
  const map = {
    active:    { bg: COLORS.successLight, color: '#00a67e', dot: '#00D9A6', labelKey: 'saExpiringSoonPage.statusActive' },
    queued:    { bg: COLORS.warningLight, color: '#cc8a00', dot: '#FFB545', labelKey: 'saExpiringSoonPage.statusQueued' },
    expired:   { bg: COLORS.dangerLight,  color: '#cc3b3b', dot: '#FF6B6B', labelKey: 'saExpiringSoonPage.statusExpired' },
    cancelled: { bg: COLORS.greyLight,    color: '#6b6b8d', dot: '#9a9ab8', labelKey: 'saExpiringSoonPage.statusCancelled' },
  };
  const s = map[status] || map.expired;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: 100, fontSize: '0.72rem',
      fontWeight: 700, background: s.bg, color: s.color,
      letterSpacing: '0.2px', whiteSpace: 'nowrap',
      transition: 'transform 0.15s',
    }}
      onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.04)'}
      onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
    >
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.dot, display: 'inline-block', flexShrink: 0 }} />
      {t(s.labelKey)}
    </span>
  );
};

// ─── Urgency Badge ────────────────────────────────────────────
const UrgencyBadge = ({ days }) => {
  const { t } = useTranslation();
  if (days <= 0) return <span style={{ color: COLORS.danger, fontWeight: 700 }}>{t('saExpiringSoonPage.urgencyExpired')}</span>;
  if (days === 1) return <span style={{ color: COLORS.danger, fontWeight: 700 }}>{t('saExpiringSoonPage.urgencyToday')}</span>;
  if (days <= 3) return <span style={{ color: '#e65100', fontWeight: 700 }}>{t('saExpiringSoonPage.urgencyDays', { days })}</span>;
  return <span style={{ color: COLORS.textSecondary }}>{t('saExpiringSoonPage.urgencyDaysNormal', { days })}</span>;
};

// ─── Skeleton Row ────────────────────────────────────────────
const SkeletonRow = () => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 16,
    padding: '1rem 1.5rem', borderBottom: `1px solid ${COLORS.border}`,
  }}>
    {[35, 25, 20, 18, 15, 12].map((w, i) => (
      <div key={i} style={{
        flex: i < 2 ? w : 1, height: 14,
        background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
        backgroundSize: '200% 100%', borderRadius: 6,
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
const Drawer = ({ open, onClose, title, children, width = 480 }) => (
  <>
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)',
      zIndex: 1040, opacity: open ? 1 : 0,
      pointerEvents: open ? 'auto' : 'none',
      transition: 'opacity 0.25s ease',
    }} />
    <div style={{
      position: 'fixed', top: 0, right: 0, bottom: 0,
      width: Math.min(width, window.innerWidth), maxWidth: '100vw',
      background: COLORS.card, zIndex: 1050,
      boxShadow: '-4px 0 30px rgba(0,0,0,0.08)',
      transform: open ? 'translateX(0)' : 'translateX(100%)',
      transition: 'transform 0.3s cubic-bezier(0.16,1,0.3,1)',
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '1.25rem 1.5rem', borderBottom: `1px solid ${COLORS.border}`, flexShrink: 0,
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
      <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
        {children}
      </div>
    </div>
  </>
);

// ─── Main Component ──────────────────────────────────────────
const ExpiringSoon = () => {
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [subscriptions, setSubscriptions] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [daysFilter, setDaysFilter] = useState(7);
  const [selectedSub, setSelectedSub] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const lang = i18n.language;

  // KPI counts
  const [expiringToday, setExpiringToday] = useState(0);
  const [expiringIn3, setExpiringIn3] = useState(0);
  const [expiringIn7, setExpiringIn7] = useState(0);
  const [totalExpiring, setTotalExpiring] = useState(0);

  useEffect(() => { fetchExpiring(); }, [page, daysFilter]);

  const fetchExpiring = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(
        `/subscription/expiring?page=${page}&limit=20&days=${daysFilter}`,
        { _skipLoading: true }
      );
      const subs = data.subscriptions || [];
      setSubscriptions(subs);
      setTotalPages(data.pages || 1);

      // Calculate KPI counts
      const today = subs.filter(s => s.remainingDays <= 0).length;
      const in3 = subs.filter(s => s.remainingDays > 0 && s.remainingDays <= 3).length;
      const in7 = subs.filter(s => s.remainingDays > 3 && s.remainingDays <= 7).length;
      setExpiringToday(today);
      setExpiringIn3(in3);
      setExpiringIn7(in7);
      setTotalExpiring(subs.length);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredSubs = searchQuery
    ? subscriptions.filter(s =>
        s.shop?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.plan?.name?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : subscriptions;

  const viewDetails = async (sub) => {
    try {
      const { data } = await api.get(`/subscription/${sub._id}`, { _skipLoading: true });
      setSelectedSub(data);
      setDrawerOpen(true);
    } catch { showToast.error(t('saExpiringSoonPage.failedToLoadDetails')); }
  };

  const handleRenew = (sub) => {
    Swal.fire({
      title: t('saExpiringSoonPage.renewTitle'),
      text: t('saExpiringSoonPage.renewText', { shop: sub.shop?.name, plan: sub.plan?.name }),
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: COLORS.primary,
      confirmButtonText: t('saExpiringSoonPage.renewConfirm'),
      cancelButtonText: t('saExpiringSoonPage.renewCancel'),
      background: COLORS.card,
      color: COLORS.text,
    }).then(result => {
      if (result.isConfirmed) {
        showToast.info(t('saExpiringSoonPage.renewInfo'));
      }
    });
  };

  return (
    <div style={{ padding: '1.5rem', maxWidth: 1360, margin: '0 auto' }}>
      <style>{`
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        .exp-row { transition: background 0.15s, transform 0.15s; }
        .exp-row:hover { background: #f8f9ff; transform: translateX(2px); }
      `}</style>

      {/* ── Header ─────────────────────────────────────────── */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem',
      }}>
        <div>
          <h2 style={{ margin: 0, fontWeight: 800, fontSize: '1.5rem', color: COLORS.text }}>
            {t('saExpiringSoonPage.title')}
          </h2>
          <p style={{ margin: '0.25rem 0 0', color: COLORS.textSecondary, fontSize: '0.85rem' }}>
            {t('saExpiringSoonPage.subtitle')}
          </p>
        </div>
        <button onClick={fetchExpiring} style={{
          padding: '0.55rem 1.25rem', borderRadius: 10, border: `1px solid ${COLORS.border}`,
          background: COLORS.card, color: COLORS.text, fontWeight: 600, fontSize: '0.85rem',
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
          transition: 'all 0.15s',
        }}
          onMouseEnter={e => e.currentTarget.style.borderColor = COLORS.primary}
          onMouseLeave={e => e.currentTarget.style.borderColor = COLORS.border}
        >
          <BiRefresh /> {t('saExpiringSoonPage.refresh')}
        </button>
      </div>

      {/* ── KPI Cards ──────────────────────────────────────── */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem', marginBottom: '1.5rem',
      }}>
        <KpiCard icon={BiError} label={t('saExpiringSoonPage.kpiExpiringToday')} value={expiringToday} color={COLORS.danger} subtitle={t('saExpiringSoonPage.kpiExpiringTodaySub')} />
        <KpiCard icon={BiBell} label={t('saExpiringSoonPage.kpiWithin3Days')} value={expiringIn3} color={COLORS.warning} subtitle={t('saExpiringSoonPage.kpiWithin3DaysSub')} />
        <KpiCard icon={BiTime} label={t('saExpiringSoonPage.kpiWithin7Days')} value={expiringIn7} color="#17a2b8" subtitle={t('saExpiringSoonPage.kpiWithin7DaysSub')} />
        <KpiCard icon={BiCheckCircle} label={t('saExpiringSoonPage.kpiTotalExpiring')} value={totalExpiring} color={COLORS.primary} subtitle={t('saExpiringSoonPage.kpiTotalExpiringSub')} />
      </div>

      {/* ── Filters ────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1rem',
        flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: COLORS.textSecondary }}>
          <BiFilter size={16} />
          <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{t('saExpiringSoonPage.filterPeriod')}</span>
        </div>
        {[
          { value: 1, labelKey: 'saExpiringSoonPage.filterToday' },
          { value: 3, labelKey: 'saExpiringSoonPage.filter3Days' },
          { value: 7, labelKey: 'saExpiringSoonPage.filter7Days' },
          { value: 14, labelKey: 'saExpiringSoonPage.filter14Days' },
          { value: 30, labelKey: 'saExpiringSoonPage.filter30Days' },
        ].map(opt => (
          <button key={opt.value} onClick={() => { setDaysFilter(opt.value); setPage(1); }} style={{
            padding: '0.4rem 1rem', borderRadius: 100, border: `1px solid ${daysFilter === opt.value ? COLORS.primary : COLORS.border}`,
            background: daysFilter === opt.value ? COLORS.primaryLight : COLORS.card,
            color: daysFilter === opt.value ? COLORS.primary : COLORS.textSecondary,
            fontWeight: daysFilter === opt.value ? 700 : 500, fontSize: '0.8rem',
            cursor: 'pointer', transition: 'all 0.15s',
          }}>{t(opt.labelKey)}</button>
        ))}

        {/* Search */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto',
          padding: '0.4rem 0.85rem', borderRadius: 100, border: `1px solid ${COLORS.border}`,
          background: COLORS.card,
        }}>
          <BiSearch size={14} style={{ color: COLORS.textSecondary }} />
          <input
            placeholder={t('saExpiringSoonPage.searchPlaceholder')}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              border: 'none', background: 'none', outline: 'none',
              color: COLORS.text, fontSize: '0.8rem', width: 160,
            }}
          />
          {searchQuery && (
            <BiX size={14} style={{ color: COLORS.textSecondary, cursor: 'pointer' }} onClick={() => setSearchQuery('')} />
          )}
        </div>
      </div>

      {/* ── Table ──────────────────────────────────────────── */}
      <div style={{
        background: COLORS.card, borderRadius: 16, overflow: 'hidden',
        border: `1px solid ${COLORS.border}`, boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', padding: '0.85rem 1.5rem',
          background: COLORS.bg, fontWeight: 700, fontSize: '0.78rem',
          color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: '0.5px',
          borderBottom: `1px solid ${COLORS.border}`,
        }}>
          <div style={{ flex: 2 }}>{t('saExpiringSoonPage.tableShopPlan')}</div>
          <div style={{ flex: 1.2 }}>{t('saExpiringSoonPage.tableExpiryDate')}</div>
          <div style={{ flex: 1 }}>{t('saExpiringSoonPage.tableRemaining')}</div>
          <div style={{ flex: 0.8 }}>{t('saExpiringSoonPage.tableStatus')}</div>
          <div style={{ flex: 0.7, textAlign: 'right' }}>{t('saExpiringSoonPage.tableAction')}</div>
        </div>

        {/* Rows */}
        {loading ? (
          <>
            {[1,2,3,4,5].map(i => <SkeletonRow key={i} />)}
          </>
        ) : filteredSubs.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: COLORS.textSecondary }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.75rem', opacity: 0.3 }}>📅</div>
            <h4 style={{ color: COLORS.text, marginBottom: '0.25rem' }}>{t('saExpiringSoonPage.emptyTitle')}</h4>
            <p style={{ fontSize: '0.85rem', margin: 0 }}>
              {searchQuery
                ? t('saExpiringSoonPage.emptySearchText')
                : t('saExpiringSoonPage.emptyText')}
            </p>
          </div>
        ) : (
          filteredSubs.map(sub => {
            const days = sub.remainingDays || 0;
            const isUrgent = days <= 1;
            const isWarning = days <= 3;
            const rowBg = isUrgent ? COLORS.dangerLight : isWarning ? `${COLORS.warningLight}80` : 'transparent';

            return (
              <div key={sub._id} className="exp-row" onClick={() => viewDetails(sub)} style={{
                display: 'flex', alignItems: 'center', padding: '0.85rem 1.5rem',
                borderBottom: `1px solid ${COLORS.border}`, cursor: 'pointer',
                background: rowBg,
              }}>
                {/* Shop & Plan */}
                <div style={{ flex: 2, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', color: COLORS.text }}>
                    {sub.plan?.name || t('common.notAvailable')}
                    {isUrgent && <span style={{ marginLeft: 6, fontSize: '0.7rem' }}>🔥</span>}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: COLORS.textSecondary, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <BiStore size={12} /> {sub.shop?.name || t('common.notAvailable')}
                  </div>
                </div>
                {/* Expiry Date */}
                <div style={{ flex: 1.2, fontSize: '0.82rem', color: COLORS.text }}>
                  <span style={{ color: isUrgent ? COLORS.danger : COLORS.text, fontWeight: isUrgent ? 700 : 400 }}>
                    {formatDate(sub.endDate, lang)}
                  </span>
                </div>
                {/* Remaining Days */}
                <div style={{ flex: 1, fontSize: '0.85rem' }}>
                  <UrgencyBadge days={days} />
                </div>
                {/* Status */}
                <div style={{ flex: 0.8 }}>
                  <StatusBadge status={sub.status} />
                </div>
                {/* Action */}
                <div style={{ flex: 0.7, textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                  <button onClick={() => handleRenew(sub)} style={{
                    padding: '0.3rem 0.85rem', borderRadius: 8,
                    border: `1px solid ${COLORS.primary}`,
                    background: 'transparent', color: COLORS.primary, fontWeight: 600,
                    fontSize: '0.75rem', cursor: 'pointer', transition: 'all 0.15s',
                  }}
                    onMouseEnter={e => { e.currentTarget.style.background = COLORS.primaryLight; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    {t('saExpiringSoonPage.btnRenew')}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── Pagination ─────────────────────────────────────── */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: '1.5rem' }}>
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} style={{
            padding: '0.5rem 1rem', borderRadius: 10, border: `1px solid ${COLORS.border}`,
            background: COLORS.card, color: page <= 1 ? COLORS.border : COLORS.text,
            cursor: page <= 1 ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: '0.8rem',
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <BiChevronLeft /> {t('saExpiringSoonPage.paginationPrev')}
          </button>
          {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
            const p = page <= 3 ? i + 1 : (page > totalPages - 2 ? totalPages - 4 + i : page - 2 + i);
            if (p > 0 && p <= totalPages) return (
              <button key={p} onClick={() => setPage(p)} style={{
                width: 36, height: 36, borderRadius: 10, border: 'none',
                background: page === p ? COLORS.primary : COLORS.card,
                color: page === p ? 'white' : COLORS.text,
                fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem',
              }}>{p}</button>
            );
            return null;
          })}
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} style={{
            padding: '0.5rem 1rem', borderRadius: 10, border: `1px solid ${COLORS.border}`,
            background: COLORS.card, color: page >= totalPages ? COLORS.border : COLORS.text,
            cursor: page >= totalPages ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: '0.8rem',
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            {t('saExpiringSoonPage.paginationNext')} <BiChevronRight />
          </button>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────── */}
      {/* ── DRAWER: Subscription Details ────────────────────── */}
      {/* ──────────────────────────────────────────────────────── */}
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={t('saExpiringSoonPage.drawerTitle')}>
        {selectedSub && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Header Card */}
            <div style={{
              background: `linear-gradient(135deg, ${COLORS.primary}, #3a0ca3)`,
              borderRadius: 14, padding: '1.5rem', color: 'white',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <h4 style={{ margin: 0, fontWeight: 800 }}>{selectedSub.plan?.name}</h4>
                <StatusBadge status={selectedSub.status} />
              </div>
              <div style={{ fontSize: '0.85rem', opacity: 0.8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <BiStore /> {selectedSub.shop?.name || t('common.notAvailable')}
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 900, marginTop: 12 }}>
                ₹{selectedSub.totalAmount || selectedSub.amount}
              </div>
              {selectedSub.remainingDays !== undefined && (
                <div style={{ marginTop: 8, fontSize: '0.85rem', opacity: 0.9 }}>
                  {selectedSub.remainingDays <= 0
                    ? t('saExpiringSoonPage.drawerExpired')
                    : t('saExpiringSoonPage.drawerDaysRemaining', { days: selectedSub.remainingDays, plural: selectedSub.remainingDays > 1 ? 's' : '' })}
                </div>
              )}
            </div>

            {/* Details Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              {[
                { label: t('saExpiringSoonPage.drawerStartDate'), value: formatDate(selectedSub.startDate, lang) },
                { label: t('saExpiringSoonPage.drawerEndDate'), value: formatDate(selectedSub.endDate, lang) },
                { label: t('saExpiringSoonPage.drawerDuration'), value: selectedSub.plan?.duration || t('common.notAvailable') },
                { label: t('saExpiringSoonPage.drawerAmount'), value: `₹${selectedSub.totalAmount || selectedSub.amount}` },
              ].map((item, i) => (
                <div key={i} style={{ background: COLORS.bg, borderRadius: 10, padding: '0.75rem 1rem' }}>
                  <div style={{ fontSize: '0.7rem', color: COLORS.textSecondary, marginBottom: 2 }}>{item.label}</div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: COLORS.text }}>{item.value}</div>
                </div>
              ))}
            </div>

            {/* Assigned By */}
            {selectedSub.assignedBy && (
              <div style={{ background: COLORS.bg, borderRadius: 10, padding: '0.75rem 1rem' }}>
                <div style={{ fontSize: '0.7rem', color: COLORS.textSecondary, marginBottom: 2 }}>{t('saExpiringSoonPage.drawerAssignedBy')}</div>
                <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{selectedSub.assignedBy?.name || t('common.notAvailable')}</div>
              </div>
            )}

            {/* Cancellation */}
            {selectedSub.cancellationReason && (
              <div style={{ background: COLORS.dangerLight, borderRadius: 10, padding: '0.75rem 1rem', color: COLORS.danger }}>
                <strong>{t('saExpiringSoonPage.drawerCancelled')}</strong> {selectedSub.cancellationReason}
                {selectedSub.cancelledAt && <div style={{ fontSize: '0.75rem', marginTop: 4 }}>{formatDateTime(selectedSub.cancelledAt, lang)}</div>}
              </div>
            )}

            {/* Notes */}
            {selectedSub.notes && (
              <div style={{ background: COLORS.bg, borderRadius: 10, padding: '0.75rem 1rem' }}>
                <div style={{ fontSize: '0.7rem', color: COLORS.textSecondary, marginBottom: 2 }}>{t('saExpiringSoonPage.drawerNotes')}</div>
                <div style={{ fontSize: '0.85rem' }}>{selectedSub.notes}</div>
              </div>
            )}

            {/* Timeline */}
            <div>
              <h6 style={{ fontWeight: 700, marginBottom: '1rem', color: COLORS.text }}>{t('saExpiringSoonPage.drawerTimeline')}</h6>
              <div style={{ position: 'relative', paddingLeft: 24 }}>
                <div style={{ position: 'absolute', left: 7, top: 0, bottom: 0, width: 2, background: COLORS.border }} />
                {(selectedSub.timeline || []).length === 0 ? (
                  <p style={{ color: COLORS.textSecondary, fontSize: '0.85rem' }}>{t('saExpiringSoonPage.drawerNoTimeline')}</p>
                ) : (
                  selectedSub.timeline.map((event, i) => {
                    const dotColors = {
                      assigned: COLORS.primary, activated: COLORS.success,
                      renewed: COLORS.warning, cancelled: COLORS.danger,
                      expired: COLORS.grey, queued: '#f1c40f',
                    };
                    return (
                      <div key={i} style={{ position: 'relative', paddingBottom: 20 }}>
                        <div style={{
                          position: 'absolute', left: -17, top: 4,
                          width: 14, height: 14, borderRadius: '50%',
                          background: dotColors[event.event] || COLORS.primary,
                          border: `3px solid ${COLORS.card}`, zIndex: 1,
                        }} />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.85rem', textTransform: 'capitalize', color: COLORS.text }}>{event.event}</div>
                          <div style={{ fontSize: '0.72rem', color: COLORS.textSecondary }}>{formatDateTime(event.timestamp, lang)}</div>
                          {event.details && <div style={{ fontSize: '0.78rem', color: COLORS.textSecondary, marginTop: 2 }}>{event.details}</div>}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Renew Button */}
            <button onClick={() => handleRenew(selectedSub)} style={{
              width: '100%', padding: '0.75rem', borderRadius: 10, border: 'none',
              background: `linear-gradient(135deg, ${COLORS.primary}, #3a0ca3)`,
              color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem',
              marginTop: '0.5rem',
            }}>
              {t('saExpiringSoonPage.drawerRenewBtn')}
            </button>
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default ExpiringSoon;