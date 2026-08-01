import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import showToast from '../../utils/toast';
import {
  BiSearch, BiFilter, BiX, BiChevronLeft, BiChevronRight,
  BiRefresh, BiStore, BiCalendar, BiCheckCircle, BiDollar,
  BiInfoCircle, BiTime,
} from 'react-icons/bi';

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
    active:    { bg: COLORS.successLight, color: '#00a67e', dot: '#00D9A6', labelKey: 'saActiveSubscriptionsPage.statusActive' },
    queued:    { bg: COLORS.warningLight, color: '#cc8a00', dot: '#FFB545', labelKey: 'saActiveSubscriptionsPage.statusQueued' },
    expired:   { bg: COLORS.dangerLight,  color: '#cc3b3b', dot: '#FF6B6B', labelKey: 'saActiveSubscriptionsPage.statusExpired' },
    cancelled: { bg: COLORS.greyLight,    color: '#6b6b8d', dot: '#9a9ab8', labelKey: 'saActiveSubscriptionsPage.statusCancelled' },
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
    {[35, 25, 20, 18, 15].map((w, i) => (
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
const Drawer = ({ open, onClose, title, children, width = 500 }) => (
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
const ActiveSubscriptions = () => {
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [subscriptions, setSubscriptions] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSub, setSelectedSub] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const lang = i18n.language;

  // KPI data
  const [totalActive, setTotalActive] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [expiringSoon, setExpiringSoon] = useState(0);
  const [queuedCount, setQueuedCount] = useState(0);

  useEffect(() => { fetchData(); }, [page]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [subsRes, dashRes] = await Promise.all([
        api.get(`/subscription/all?page=${page}&limit=20&status=active`, { _skipLoading: true }),
        api.get('/subscription/dashboard', { _skipLoading: true }).catch(() => ({ data: {} })),
      ]);
      setSubscriptions(subsRes.data.subscriptions || []);
      setTotalPages(subsRes.data.pages || 1);
      setTotalActive(dashRes.data?.activeSubscriptions || 0);
      setTotalRevenue(dashRes.data?.totalRevenue || 0);
      setExpiringSoon(dashRes.data?.expiringIn3Days || 0);
      setQueuedCount(dashRes.data?.queuedSubscriptions || 0);
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
    } catch { showToast.error(t('saActiveSubscriptionsPage.failedToLoadDetails')); }
  };

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
            {t('saActiveSubscriptionsPage.title')}
          </h2>
          <p style={{ margin: '0.25rem 0 0', color: COLORS.textSecondary, fontSize: '0.85rem' }}>
            {t('saActiveSubscriptionsPage.subtitle')}
          </p>
        </div>
        <button onClick={fetchData} style={{
          padding: '0.55rem 1.25rem', borderRadius: 10, border: `1px solid ${COLORS.border}`,
          background: COLORS.card, color: COLORS.text, fontWeight: 600, fontSize: '0.85rem',
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
          transition: 'all 0.15s',
        }}
          onMouseEnter={e => e.currentTarget.style.borderColor = COLORS.primary}
          onMouseLeave={e => e.currentTarget.style.borderColor = COLORS.border}
        >
          <BiRefresh /> {t('saActiveSubscriptionsPage.refresh')}
        </button>
      </div>

      {/* ── KPI Cards ──────────────────────────────────────── */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem', marginBottom: '1.5rem',
      }}>
        <KpiCard icon={BiCheckCircle} label={t('saActiveSubscriptionsPage.kpiActiveSubscriptions')} value={totalActive} color={COLORS.success} subtitle={t('saActiveSubscriptionsPage.kpiActiveSubscriptionsSub')} />
        <KpiCard icon={BiTime} label={t('saActiveSubscriptionsPage.kpiQueued')} value={queuedCount} color={COLORS.warning} subtitle={t('saActiveSubscriptionsPage.kpiQueuedSub')} />
        <KpiCard icon={BiInfoCircle} label={t('saActiveSubscriptionsPage.kpiExpiringIn3Days')} value={expiringSoon} color={COLORS.danger} subtitle={t('saActiveSubscriptionsPage.kpiExpiringIn3DaysSub')} />
        <KpiCard icon={BiDollar} label={t('saActiveSubscriptionsPage.kpiTotalRevenue')} value={`₹${formatNumber(totalRevenue, lang)}`} color={COLORS.primary} subtitle={t('saActiveSubscriptionsPage.kpiTotalRevenueSub')} />
      </div>

      {/* ── Filters ────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1rem',
        flexWrap: 'wrap',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto',
          padding: '0.4rem 0.85rem', borderRadius: 100, border: `1px solid ${COLORS.border}`,
          background: COLORS.card,
        }}>
          <BiSearch size={14} style={{ color: COLORS.textSecondary }} />
          <input
            placeholder={t('saActiveSubscriptionsPage.searchPlaceholder')}
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setPage(1); }}
            style={{
              border: 'none', background: 'none', outline: 'none',
              color: COLORS.text, fontSize: '0.8rem', width: 200,
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
          <div style={{ flex: 2 }}>{t('saActiveSubscriptionsPage.tableShopPlan')}</div>
          <div style={{ flex: 1 }}>{t('saActiveSubscriptionsPage.tableAmount')}</div>
          <div style={{ flex: 1.2 }}>{t('saActiveSubscriptionsPage.tableExpiryDate')}</div>
          <div style={{ flex: 0.5 }}>{t('saActiveSubscriptionsPage.tableDaysLeft')}</div>
          <div style={{ flex: 0.8 }}>{t('saActiveSubscriptionsPage.tableStatus')}</div>
        </div>

        {/* Rows */}
        {loading ? (
          <>
            {[1,2,3,4,5].map(i => <SkeletonRow key={i} />)}
          </>
        ) : filteredSubs.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: COLORS.textSecondary }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.75rem', opacity: 0.3 }}>✅</div>
            <h4 style={{ color: COLORS.text, marginBottom: '0.25rem' }}>{t('saActiveSubscriptionsPage.emptyTitle')}</h4>
            <p style={{ fontSize: '0.85rem', margin: 0 }}>
              {searchQuery ? t('saActiveSubscriptionsPage.emptySearchText') : t('saActiveSubscriptionsPage.emptyText')}
            </p>
          </div>
        ) : (
          filteredSubs.map(sub => {
            const now = new Date();
            const end = new Date(sub.endDate);
            const daysLeft = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
            const isExpiring = daysLeft <= 3;

            return (
              <div key={sub._id} className="sub-row" onClick={() => viewDetails(sub)} style={{
                display: 'flex', alignItems: 'center', padding: '0.85rem 1.5rem',
                borderBottom: `1px solid ${COLORS.border}`, cursor: 'pointer',
              }}>
                {/* Shop & Plan */}
                <div style={{ flex: 2, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', color: COLORS.text }}>
                    {sub.plan?.name || t('common.notAvailable')}
                    {isExpiring && <span style={{ marginLeft: 6, fontSize: '0.7rem' }}>⚠️</span>}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: COLORS.textSecondary, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <BiStore size={12} /> {sub.shop?.name || t('common.notAvailable')} · {sub.shop?.phone || ''}
                  </div>
                </div>
                {/* Amount */}
                <div style={{ flex: 1, fontWeight: 700, fontSize: '0.9rem', color: COLORS.primary }}>
                  ₹{sub.totalAmount || sub.amount}
                </div>
                {/* Expiry Date */}
                <div style={{ flex: 1.2, fontSize: '0.82rem', color: COLORS.text }}>
                  <span style={{ color: isExpiring ? COLORS.danger : COLORS.text, fontWeight: isExpiring ? 700 : 400 }}>
                    {formatDate(sub.endDate, lang)}
                  </span>
                </div>
                {/* Days Left */}
                <div style={{ flex: 0.5, fontSize: '0.85rem' }}>
                  {daysLeft > 0 ? (
                    <span style={{ color: isExpiring ? COLORS.danger : COLORS.textSecondary, fontWeight: isExpiring ? 700 : 400 }}>
                      {t('saActiveSubscriptionsPage.daysRemaining', { days: daysLeft })}
                    </span>
                  ) : (
                    <span style={{ color: COLORS.danger, fontWeight: 700 }}>{t('saActiveSubscriptionsPage.expired')}</span>
                  )}
                </div>
                {/* Status */}
                <div style={{ flex: 0.8 }}>
                  <StatusBadge status="active" />
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
            <BiChevronLeft /> {t('saActiveSubscriptionsPage.paginationPrev')}
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
            {t('saActiveSubscriptionsPage.paginationNext')} <BiChevronRight />
          </button>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────── */}
      {/* ── DRAWER: Subscription Details ────────────────────── */}
      {/* ──────────────────────────────────────────────────────── */}
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={t('saActiveSubscriptionsPage.drawerTitle')}>
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
              {(() => {
                const now = new Date();
                const end = new Date(selectedSub.endDate);
                const daysLeft = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
                return (
                  <div style={{ marginTop: 8, fontSize: '0.85rem', opacity: 0.9 }}>
                    {daysLeft <= 0
                      ? t('saActiveSubscriptionsPage.drawerExpired')
                      : t('saActiveSubscriptionsPage.drawerDaysRemaining', { days: daysLeft, plural: daysLeft > 1 ? 's' : '' })}
                  </div>
                );
              })()}
            </div>

            {/* Details Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              {[
                { label: t('saActiveSubscriptionsPage.drawerStartDate'), value: formatDate(selectedSub.startDate, lang) },
                { label: t('saActiveSubscriptionsPage.drawerEndDate'), value: formatDate(selectedSub.endDate, lang) },
                { label: t('saActiveSubscriptionsPage.drawerDuration'), value: selectedSub.plan?.duration || t('common.notAvailable') },
                { label: t('saActiveSubscriptionsPage.drawerAmount'), value: `₹${selectedSub.totalAmount || selectedSub.amount}` },
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
                <div style={{ fontSize: '0.7rem', color: COLORS.textSecondary, marginBottom: 2 }}>{t('saActiveSubscriptionsPage.drawerAssignedBy')}</div>
                <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{selectedSub.assignedBy?.name || t('common.notAvailable')}</div>
              </div>
            )}

            {/* Cancellation */}
            {selectedSub.cancellationReason && (
              <div style={{ background: COLORS.dangerLight, borderRadius: 10, padding: '0.75rem 1rem', color: COLORS.danger }}>
                <strong>{t('saActiveSubscriptionsPage.drawerCancelled')}</strong> {selectedSub.cancellationReason}
                {selectedSub.cancelledAt && <div style={{ fontSize: '0.75rem', marginTop: 4 }}>{formatDateTime(selectedSub.cancelledAt, lang)}</div>}
              </div>
            )}

            {/* Notes */}
            {selectedSub.notes && (
              <div style={{ background: COLORS.bg, borderRadius: 10, padding: '0.75rem 1rem' }}>
                <div style={{ fontSize: '0.7rem', color: COLORS.textSecondary, marginBottom: 2 }}>{t('saActiveSubscriptionsPage.drawerNotes')}</div>
                <div style={{ fontSize: '0.85rem' }}>{selectedSub.notes}</div>
              </div>
            )}

            {/* Timeline */}
            <div>
              <h6 style={{ fontWeight: 700, marginBottom: '1rem', color: COLORS.text }}>{t('saActiveSubscriptionsPage.drawerTimeline')}</h6>
              <div style={{ position: 'relative', paddingLeft: 24 }}>
                <div style={{ position: 'absolute', left: 7, top: 0, bottom: 0, width: 2, background: COLORS.border }} />
                {(selectedSub.timeline || []).length === 0 ? (
                  <p style={{ color: COLORS.textSecondary, fontSize: '0.85rem' }}>{t('saActiveSubscriptionsPage.drawerNoTimeline')}</p>
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
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default ActiveSubscriptions;