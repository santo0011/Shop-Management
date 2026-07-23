import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import {
  BiTime, BiCalendar, BiCreditCard, BiDollar,
  BiInfoCircle, BiRefresh, BiStore,
  BiX, BiHistory, BiPlanet, BiUser, BiPhone,
  BiEnvelope, BiBuilding, BiHash,
  BiCalendarCheck, BiCalendarExclamation,
  BiClipboard, BiDetail, BiGroup, BiHdd,
  BiCheck, BiLayer,
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

// ─── Blue Theme Gradient ──────────────────────────────────────
const BLUE_GRADIENT = 'linear-gradient(135deg, #6C63FF, #4A42DB, #3a0ca3)';
const BLUE_DARK = '#3a0ca3';
const BLUE_MID = '#4A42DB';
const BLUE_LIGHT = '#6C63FF';

// ─── Status Badge ─────────────────────────────────────────────
const StatusBadge = ({ status, size = 'sm' }) => {
  const { t } = useTranslation();
  const map = {
    active: { bg: COLORS.successLight, color: '#00a67e', dot: '#00D9A6', label: t('subscriptionPage.active', 'Active') },
    queued: { bg: COLORS.warningLight, color: '#cc8a00', dot: '#FFB545', label: t('subscriptionPage.queued', 'Queued') },
    expired: { bg: COLORS.dangerLight, color: '#cc3b3b', dot: '#FF6B6B', label: t('subscriptionPage.expired', 'Expired') },
    cancelled: { bg: COLORS.greyLight, color: '#6b6b8d', dot: '#9a9ab8', label: t('subscriptionPage.cancelled', 'Cancelled') },
    trial: { bg: '#e3f2fd', color: '#1565c0', dot: '#1565c0', label: t('subscriptionPage.trial', 'Trial') },
  };
  const s = map[status] || map.expired;
  const isSmall = size === 'sm';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: isSmall ? '4px 12px' : '6px 16px',
      borderRadius: 100, fontSize: isSmall ? '0.75rem' : '0.82rem',
      fontWeight: 700, background: s.bg, color: s.color,
      letterSpacing: '0.2px', whiteSpace: 'nowrap',
      transition: 'transform 0.15s',
    }}
      onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.04)'}
      onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
    >
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: s.dot, display: 'inline-block' }} />
      {s.label}
    </span>
  );
};

// ─── Plan Badge ───────────────────────────────────────────────
const PlanBadge = ({ isCurrent }) => {
  const { t } = useTranslation();
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '4px 14px', borderRadius: 100,
      fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.3px',
      background: isCurrent
        ? BLUE_GRADIENT
        : COLORS.greyLight,
      color: isCurrent ? '#fff' : COLORS.textSecondary,
      whiteSpace: 'nowrap',
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: '50%',
        background: isCurrent ? '#fff' : COLORS.grey,
        display: 'inline-block',
      }} />
      {isCurrent ? t('subscriptionPage.currentPlanBadge', 'Current Plan') : t('subscriptionPage.available', 'Available')}
    </span>
  );
};

// ─── KPI Card ────────────────────────────────────────────────
const KpiCard = ({ icon: Icon, label, value, color }) => (
  <div style={{
    background: COLORS.card, borderRadius: 14, padding: '1.1rem 1.25rem',
    border: `1px solid ${COLORS.border}`,
    display: 'flex', alignItems: 'center', gap: 14,
    transition: 'transform 0.2s, box-shadow 0.15s',
  }}
    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.06)'; }}
    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
  >
    <div style={{
      width: 40, height: 40, borderRadius: 10,
      background: `${color}18`, color: color,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '1.2rem', flexShrink: 0,
    }}>
      <Icon />
    </div>
    <div>
      <div style={{ fontSize: '0.7rem', color: COLORS.textSecondary, fontWeight: 500, marginBottom: 1 }}>{label}</div>
      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: COLORS.text, lineHeight: 1.2 }}>{value}</div>
    </div>
  </div>
);

// ─── Skeleton Loading ────────────────────────────────────────
const SkeletonLoader = () => (
  <div style={{ maxWidth: 1200, margin: '0 auto', padding: '1.5rem 1rem' }}>
    <style>{`@keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }`}</style>
    <div style={{ marginBottom: '1.5rem' }}>
      <div style={{ height: 28, width: '35%', marginBottom: 8, background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)', backgroundSize: '200% 100%', borderRadius: 8, animation: 'shimmer 1.5s infinite' }} />
      <div style={{ height: 14, width: '25%', background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)', backgroundSize: '200% 100%', borderRadius: 6, animation: 'shimmer 1.5s infinite' }} />
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
      {[1, 2, 3, 4].map(i => (
        <div key={i} style={{ height: 64, borderRadius: 14, background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />
      ))}
    </div>
    <div style={{ height: 260, borderRadius: 20, background: BLUE_GRADIENT, marginBottom: '1.5rem', padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div>
          <div style={{ height: 12, width: 80, marginBottom: 8, background: 'linear-gradient(90deg, rgba(255,255,255,0.1) 25%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0.1) 75%)', backgroundSize: '200% 100%', borderRadius: 4, animation: 'shimmer 1.5s infinite' }} />
          <div style={{ height: 24, width: 140, background: 'linear-gradient(90deg, rgba(255,255,255,0.1) 25%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0.1) 75%)', backgroundSize: '200% 100%', borderRadius: 6, animation: 'shimmer 1.5s infinite' }} />
        </div>
        <div style={{ height: 22, width: 70, background: 'linear-gradient(90deg, rgba(255,255,255,0.1) 25%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0.1) 75%)', backgroundSize: '200% 100%', borderRadius: 20, animation: 'shimmer 1.5s infinite' }} />
      </div>
      <div style={{ height: 36, width: '25%', marginBottom: '1rem', background: 'linear-gradient(90deg, rgba(255,255,255,0.1) 25%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0.1) 75%)', backgroundSize: '200% 100%', borderRadius: 6, animation: 'shimmer 1.5s infinite' }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.75rem' }}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} style={{ height: 52, background: 'linear-gradient(90deg, rgba(255,255,255,0.08) 25%, rgba(255,255,255,0.15) 50%, rgba(255,255,255,0.08) 75%)', backgroundSize: '200% 100%', borderRadius: 10, animation: 'shimmer 1.5s infinite' }} />
        ))}
      </div>
    </div>
  </div>
);

// ─── Plan View Drawer (matches Super Admin drawer pattern) ──
const PlanViewDrawer = ({ plan, onClose }) => {
  const { t } = useTranslation();
  if (!plan) return null;
  const width = 540;

  return (
    <>
      {/* Overlay */}
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)',
        zIndex: 1040, animation: 'fadeIn 0.2s ease',
      }} />
      <style>{`
        @keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
      {/* Panel */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: Math.min(width, window.innerWidth),
        maxWidth: '100vw',
        background: COLORS.card, zIndex: 1050,
        boxShadow: '-4px 0 30px rgba(0,0,0,0.08)',
        animation: 'slideInRight 0.25s ease',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '1.25rem 1.5rem', borderBottom: `1px solid ${COLORS.border}`,
          flexShrink: 0,
        }}>
          <h5 style={{ margin: 0, fontWeight: 700, fontSize: '1.1rem', color: COLORS.text }}>
            {t('subscriptionPage.planDetails', 'Plan Details')}
          </h5>
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
          {/* Header Card */}
          <div style={{
            background: BLUE_GRADIENT,
            borderRadius: 14, padding: '1.5rem', color: 'white', marginBottom: '1.25rem',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <h4 style={{ margin: 0, fontWeight: 800 }}>{plan.name}</h4>
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 900, marginTop: 8 }}>
              ₹{plan.price}
              <span style={{ fontSize: '0.85rem', fontWeight: 400, opacity: 0.8 }}> /{plan.duration}</span>
            </div>
          </div>

          {/* Plan Information */}
          <div>
            <h6 style={{ fontWeight: 700, marginBottom: '0.75rem', color: COLORS.text, fontSize: '0.85rem' }}>
              <BiPlanet style={{ verticalAlign: 'middle', marginRight: 6 }} /> {t('subscriptionPage.planInformation', 'Plan Information')}
            </h6>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
              <PlanDetailCard label={t('subscriptionPage.planName', 'Plan Name')} value={plan.name} />
              <PlanDetailCard label={t('subscriptionPage.price', 'Price')} value={`₹${plan.price}`} />
              <PlanDetailCard label={t('subscriptionPage.duration', 'Duration')} value={plan.duration} />
              {plan.maxUsers && <PlanDetailCard label={t('subscriptionPage.maximumUsers', 'Max Users')} value={`${plan.maxUsers} ${t('subscriptionPage.users', 'users')}`} />}
              {plan.storageLimit && <PlanDetailCard label={t('subscriptionPage.storageLimit', 'Storage Limit')} value={plan.storageLimit} />}
              {plan.discount > 0 && <PlanDetailCard label={t('subscriptionPage.discount', 'Discount')} value={`${plan.discount}% ${t('subscriptionPage.off', 'off')}`} />}
              {plan.businessTypes && plan.businessTypes.length > 0 && (
                <PlanDetailCard label={t('subscriptionPage.businessTypes', 'Business Types')} value={plan.businessTypes.join(', ')} style={{ gridColumn: '1 / -1' }} />
              )}
            </div>
          </div>

          {/* Features */}
          {plan.features && plan.features.length > 0 && (
            <div style={{ marginTop: '1.25rem' }}>
              <h6 style={{ fontWeight: 700, marginBottom: '0.75rem', color: COLORS.text, fontSize: '0.85rem' }}>
                <BiCheck style={{ verticalAlign: 'middle', marginRight: 6 }} /> {t('subscriptionPage.featuresAndBenefits', 'Features & Benefits')}
              </h6>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                {plan.features.map((f, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '0.4rem 0.6rem', borderRadius: 8,
                    background: i % 2 === 0 ? 'rgba(0,217,166,0.05)' : 'transparent',
                  }}>
                    <div style={{
                      width: 20, height: 20, borderRadius: '50%',
                      background: COLORS.successLight, display: 'flex',
                      alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <BiCheck style={{ color: COLORS.success, fontSize: '0.75rem' }} />
                    </div>
                    <span style={{ fontSize: '0.85rem', color: COLORS.text, fontWeight: 500 }}>{f}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          {plan.description && (
            <div style={{ marginTop: '1.25rem' }}>
              <h6 style={{ fontWeight: 700, marginBottom: '0.75rem', color: COLORS.text, fontSize: '0.85rem' }}>
                <BiInfoCircle style={{ verticalAlign: 'middle', marginRight: 6 }} /> {t('subscriptionPage.description', 'Description')}
              </h6>
              <div style={{ background: COLORS.bg, borderRadius: 10, padding: '0.85rem 1rem' }}>
                <p style={{ fontSize: '0.85rem', color: COLORS.textSecondary, margin: 0, lineHeight: 1.6 }}>
                  {plan.description}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

// ─── Plan Detail Card ────────────────────────────────────────
const PlanDetailCard = ({ label, value, style }) => (
  <div style={{ background: COLORS.bg, borderRadius: 8, padding: '0.65rem 0.85rem', ...style }}>
    <div style={{ fontSize: '0.68rem', color: COLORS.textSecondary, marginBottom: 1 }}>{label}</div>
    <div style={{ fontWeight: 600, fontSize: '0.83rem', color: COLORS.text }}>{value}</div>
  </div>
);

// ─── Plan Info Row ───────────────────────────────────────────
const PlanInfoRow = ({ icon, label, value }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '0.3rem 0', fontSize: '0.82rem',
  }}>
    <span style={{ color: COLORS.grey, fontSize: '0.85rem', display: 'flex', width: 18, flexShrink: 0 }}>
      {icon}
    </span>
    <span style={{ color: COLORS.textSecondary, minWidth: 100, flexShrink: 0 }}>{label}</span>
    <span style={{ color: COLORS.text, fontWeight: 500, marginLeft: 'auto', textAlign: 'right' }}>
      {value}
    </span>
  </div>
);

// ─── Main Component ──────────────────────────────────────────
const SubscriptionPage = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState([]);
  const [statusData, setStatusData] = useState(null);
  const [history, setHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('current');
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [planDrawerOpen, setPlanDrawerOpen] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [plansRes, statusRes, historyRes] = await Promise.all([
        api.get('/plans', { _skipLoading: true }),
        api.get('/subscription/status', { _skipLoading: true }),
        api.get('/subscription/history?limit=50', { _skipLoading: true }),
      ]);
      setPlans(Array.isArray(plansRes.data) ? plansRes.data : []);
      setStatusData(statusRes.data);
      setHistory(historyRes.data?.subscriptions || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openPlanDrawer = (plan) => {
    setSelectedPlan(plan);
    setPlanDrawerOpen(true);
  };

  const closePlanDrawer = () => {
    setPlanDrawerOpen(false);
    setSelectedPlan(null);
  };

  if (loading) return <SkeletonLoader />;

  const currentSub = statusData?.currentSubscription;
  const queuedSub = statusData?.queuedSubscription;
  const daysRemaining = statusData?.daysRemaining || 0;
  const isExpired = statusData?.isExpired;
  const subStatus = statusData?.subscriptionStatus;

  // ── Expired Full-Screen ──
  if (isExpired) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        minHeight: '80vh', textAlign: 'center', padding: '2rem',
      }}>
        <div style={{
          width: 110, height: 110, borderRadius: '50%',
          background: 'linear-gradient(135deg, #ff6b6b22, #ee5a2422)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '3.2rem', marginBottom: '1.5rem',
          border: '3px solid #ff6b6b44',
        }}>⏰</div>
        <h2 style={{ color: '#c62828', marginBottom: '0.75rem', fontWeight: 800, fontSize: '1.6rem' }}>{t('subscriptionPage.subscriptionExpired', 'Subscription Expired')}</h2>
        <p style={{ color: COLORS.textSecondary, maxWidth: 380, marginBottom: '2rem', fontSize: '1rem', lineHeight: 1.6 }}>
          {t('subscriptionPage.subscriptionExpiredDesc', 'Your subscription has expired. Please contact the Super Admin to renew your subscription.')}
        </p>
        <a
          href="mailto:support@example.com?subject=Subscription%20Renewal%20Request"
          style={{
            padding: '0.8rem 2.25rem', borderRadius: 10, border: 'none',
            background: `linear-gradient(135deg, ${COLORS.primary}, #3a0ca3)`,
            color: 'white', fontWeight: 700, fontSize: '0.95rem',
            cursor: 'pointer', textDecoration: 'none',
            boxShadow: '0 4px 15px rgba(108,99,255,0.3)',
            display: 'inline-block',
          }}
        >
          {t('subscriptionPage.contactSuperAdmin', 'Contact Super Admin')}
        </a>
      </div>
    );
  }

  // ── Expiry Warning ──
  const showWarning = !isExpired && daysRemaining > 0 && daysRemaining <= 3 && currentSub;

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '1.25rem 1rem' }}>
      {/* ═══ Page Header ═══ */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem',
      }}>
        <div>
          <h2 style={{ margin: 0, fontWeight: 800, fontSize: '1.4rem', color: COLORS.text }}>{t('subscriptionPage.title', 'Subscription')}</h2>
          <p style={{ margin: '0.15rem 0 0', color: COLORS.textSecondary, fontSize: '0.8rem' }}>
            {t('subscriptionPage.subtitle', 'View your subscription details and available plans')}
          </p>
        </div>
        <button onClick={fetchData} style={{
          padding: '0.45rem 1rem', borderRadius: 8, border: `1px solid ${COLORS.border}`,
          background: COLORS.card, color: COLORS.text, fontWeight: 600, fontSize: '0.78rem',
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, transition: 'all 0.15s',
        }}
          onMouseEnter={e => e.currentTarget.style.borderColor = COLORS.primary}
          onMouseLeave={e => e.currentTarget.style.borderColor = COLORS.border}
        >
          <BiRefresh /> {t('subscriptionPage.refresh', 'Refresh')}
        </button>
      </div>

      {/* ═══ Expiry Warning Banner ═══ */}
      {showWarning && (
        <div style={{
          background: 'linear-gradient(135deg, #fff8e1, #ffecb3)',
          border: '1px solid #ffc107', borderRadius: 10, marginBottom: '1rem',
          padding: '0.75rem 1.1rem', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.6rem',
        }}>
          <span style={{ color: '#e65100', fontWeight: 600, fontSize: '0.82rem' }}>
            ⚠ {t('subscriptionPage.expiryWarning', 'Your subscription will expire in {{days}} day(s). Please contact your Super Admin to renew your subscription.', { days: daysRemaining })}
          </span>
          <a
            href="mailto:support@example.com?subject=Subscription%20Renewal%20Request"
            style={{
              padding: '0.4rem 1rem', borderRadius: 8, border: 'none',
              background: '#ff8f00', color: 'white', fontWeight: 700,
              cursor: 'pointer', fontSize: '0.78rem', textDecoration: 'none',
            }}
          >
            {t('subscriptionPage.contactSuperAdmin', 'Contact Super Admin')}
          </a>
        </div>
      )}

      {/* ═══ Tabs ═══ */}
      <div style={{
        display: 'flex', gap: 0, marginBottom: '1rem',
        borderBottom: `2px solid ${COLORS.border}`,
      }}>
        {[
          { key: 'current', label: t('subscriptionPage.currentPlan', 'Current Plan') },
          { key: 'plans', label: t('subscriptionPage.plans', 'Plans') },
          { key: 'history', label: t('subscriptionPage.history', 'History') },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
            padding: '0.6rem 1.25rem', border: 'none', background: 'none',
            fontWeight: activeTab === tab.key ? 700 : 500,
            color: activeTab === tab.key ? COLORS.primary : COLORS.textSecondary,
            borderBottom: activeTab === tab.key ? `2px solid ${COLORS.primary}` : '2px solid transparent',
            marginBottom: -2, cursor: 'pointer', transition: 'all 0.2s', fontSize: '0.85rem',
          }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ════════════════════════════════════════════════════════
          TAB: Current Plan
          ════════════════════════════════════════════════════════ */}
      {activeTab === 'current' && (
        <div>
          {currentSub ? (
            <>
              {/* ── Current Plan Card ── */}
              <div style={{
                background: BLUE_GRADIENT,
                borderRadius: 18, padding: '1.5rem', marginBottom: '1rem',
                color: 'white', position: 'relative', overflow: 'hidden',
              }}>
                <div style={{ position: 'absolute', top: -80, right: -80, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
                <div style={{ position: 'absolute', bottom: -40, left: -40, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 300, height: 300, borderRadius: '50%', background: 'rgba(255,255,255,0.02)' }} />
                <div style={{ position: 'relative', zIndex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                    <div>
                      <div style={{ fontSize: '0.65rem', opacity: 0.6, marginBottom: '0.15rem', letterSpacing: '1px' }}>{t('subscriptionPage.currentPlanLabel', 'CURRENT PLAN')}</div>
                      <div style={{ fontSize: '1.4rem', fontWeight: 800 }}>{currentSub.plan?.name}</div>
                    </div>
                    <StatusBadge status={currentSub.status || subStatus} />
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '0.6rem' }}>
                    ₹{currentSub.totalAmount || currentSub.amount}
                    <span style={{ fontSize: '0.8rem', fontWeight: 400, opacity: 0.6 }}>/{currentSub.plan?.duration}</span>
                  </div>
                  <div style={{
                    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '0.5rem',
                  }}>
                    {[
                      { label: t('subscriptionPage.startDate', 'Start Date'), value: new Date(currentSub.startDate).toLocaleDateString() },
                      { label: t('subscriptionPage.expiryDate', 'Expiry Date'), value: new Date(currentSub.endDate).toLocaleDateString() },
                      { label: t('subscriptionPage.daysLeft', 'Days Left'), value: daysRemaining > 0 ? t('subscriptionPage.daysRemainingValue', '{{days}}d', { days: daysRemaining }) : t('subscriptionPage.expired', 'Expired') },
                      { label: t('subscriptionPage.duration', 'Duration'), value: currentSub.plan?.duration || t('subscriptionPage.na', 'N/A') },
                    ].map((item, i) => (
                      <div key={i} style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 8, padding: '0.5rem 0.75rem', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.6rem', opacity: 0.6, marginBottom: '0.1rem' }}>{item.label}</div>
                        <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{item.value}</div>
                      </div>
                    ))}
                  </div>
                  {currentSub.plan?.features?.length > 0 && (
                    <div style={{ marginTop: '1rem' }}>
                      <div style={{ fontSize: '0.65rem', opacity: 0.6, marginBottom: '0.4rem', letterSpacing: '1px' }}>{t('subscriptionPage.features', 'FEATURES')}</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                        {currentSub.plan.features.map((f, i) => (
                          <span key={i} style={{
                            background: 'rgba(255,255,255,0.15)', borderRadius: 20,
                            padding: '0.15rem 0.65rem', fontSize: '0.75rem',
                          }}>
                            ✓ {f}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* ── Queued Subscription ── */}
              {queuedSub ? (
                <div style={{
                  background: COLORS.card, borderRadius: 12, padding: '0.9rem 1.1rem',
                  marginBottom: 0, border: `2px dashed ${COLORS.warning}`,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  flexWrap: 'wrap', gap: '0.6rem',
                }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                      <span style={{ fontSize: '1rem' }}>📋</span>
                      <strong style={{ color: '#e65100', fontSize: '0.85rem' }}>{t('subscriptionPage.nextPlanQueued', 'Next Plan (Queued)')}</strong>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: COLORS.text }}>
                      {queuedSub.plan?.name} — ₹{queuedSub.totalAmount}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: COLORS.textSecondary }}>
                      {t('subscriptionPage.willActivateAutomatically', 'Will activate automatically after current plan expires')}
                    </div>
                  </div>
                  <StatusBadge status="queued" />
                </div>
              ) : (
                <div style={{
                  background: COLORS.card, borderRadius: 12, padding: '0.9rem 1.1rem',
                  border: `1px dashed ${COLORS.border}`,
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: '0.82rem', color: COLORS.textSecondary }}>
                    {t('subscriptionPage.noUpcomingSubscription', 'No upcoming subscription.')}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '2.5rem', color: COLORS.textSecondary }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem', opacity: 0.35 }}>📋</div>
              <h4 style={{ color: COLORS.text, marginBottom: '0.25rem', fontWeight: 700 }}>{t('subscriptionPage.noActiveSubscription', 'No Active Subscription')}</h4>
              <p style={{ fontSize: '0.82rem' }}>{t('subscriptionPage.noActiveSubscriptionDesc', 'You don\'t have an active subscription. Please contact your Super Admin to assign a plan.')}</p>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
          TAB: Plans (Read-Only with View button)
          ════════════════════════════════════════════════════════ */}
      {activeTab === 'plans' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0.85rem' }}>
          {plans.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2.5rem', color: COLORS.textSecondary, gridColumn: '1 / -1' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.6rem', opacity: 0.35 }}>📦</div>
              <h4 style={{ color: COLORS.text, fontWeight: 700 }}>{t('subscriptionPage.noPlansAvailable', 'No Plans Available')}</h4>
              <p style={{ fontSize: '0.82rem' }}>{t('subscriptionPage.noPlansAvailableDesc', 'Check back later for subscription plans.')}</p>
            </div>
          ) : (
            plans.map(plan => {
              const isPopular = plan.isPopular;
              const isCurrentPlan = currentSub?.plan?._id === plan._id;
              return (
                <div key={plan._id} style={{
                  background: COLORS.card, borderRadius: 14, padding: '1.25rem',
                  border: isPopular ? `2px solid ${COLORS.primary}` : `1px solid ${COLORS.border}`,
                  position: 'relative', transition: 'all 0.2s',
                  boxShadow: isPopular ? '0 4px 20px rgba(108,99,255,0.12)' : '0 1px 4px rgba(0,0,0,0.04)',
                  display: 'flex', flexDirection: 'column',
                }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = isPopular ? '0 4px 20px rgba(108,99,255,0.12)' : '0 1px 4px rgba(0,0,0,0.04)'; }}
                >
                  {isPopular && (
                    <div style={{
                      position: 'absolute', top: -10, right: 16,
                      background: BLUE_GRADIENT,
                      color: 'white', padding: '2px 12px', borderRadius: 12,
                      fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.5px',
                    }}>
                      {t('subscriptionPage.popular', 'POPULAR')}
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.35rem' }}>
                    <h4 style={{ fontWeight: 800, margin: 0, color: COLORS.text, fontSize: '1.05rem' }}>{plan.name}</h4>
                    <PlanBadge isCurrent={isCurrentPlan} />
                  </div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 900, color: COLORS.primary, marginBottom: '0.1rem' }}>
                    ₹{plan.price}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: COLORS.textSecondary, marginBottom: '0.75rem' }}>
                    {t('subscriptionPage.per', 'per')} {plan.duration}
                  </div>
                  {plan.features?.length > 0 && (
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, flex: 1 }}>
                      {plan.features.slice(0, 4).map((f, i) => (
                        <li key={i} style={{
                          padding: '0.2rem 0', display: 'flex', alignItems: 'center',
                          gap: '0.45rem', fontSize: '0.8rem', color: COLORS.text,
                        }}>
                          <span style={{ color: COLORS.success, fontWeight: 700 }}>✓</span> {f}
                        </li>
                      ))}
                      {plan.features.length > 4 && (
                        <li style={{
                          padding: '0.2rem 0', fontSize: '0.75rem', color: COLORS.textSecondary,
                        }}>
                          {t('subscriptionPage.moreFeatures', '+{{count}} more features', { count: plan.features.length - 4 })}
                        </li>
                      )}
                    </ul>
                  )}
                  <button
                    onClick={() => openPlanDrawer(plan)}
                    style={{
                      width: '100%', padding: '0.55rem', borderRadius: 8, border: `1px solid ${COLORS.border}`,
                      background: COLORS.bg, color: COLORS.primary, fontWeight: 600,
                      cursor: 'pointer', fontSize: '0.82rem', marginTop: '0.75rem',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = COLORS.primaryLight; e.currentTarget.style.borderColor = COLORS.primary; }}
                    onMouseLeave={e => { e.currentTarget.style.background = COLORS.bg; e.currentTarget.style.borderColor = COLORS.border; }}
                  >
                    <BiDetail /> {t('subscriptionPage.viewDetails', 'View Details')}
                  </button>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
          TAB: History
          ════════════════════════════════════════════════════════ */}
      {activeTab === 'history' && (
        <div style={{
          background: COLORS.card, borderRadius: 14, overflow: 'hidden',
          border: `1px solid ${COLORS.border}`, boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        }}>
          {history.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: COLORS.textSecondary }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.6rem', opacity: 0.35 }}>📄</div>
              <div style={{ fontWeight: 700, color: COLORS.text, marginBottom: '0.2rem' }}>{t('subscriptionPage.noSubscriptionHistory', 'No Subscription History')}</div>
              <div style={{ fontSize: '0.82rem' }}>{t('subscriptionPage.noSubscriptionHistoryDesc', 'Your subscription history will appear here.')}</div>
            </div>
          ) : (
            history.map((sub, i) => (
              <div key={sub._id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0.75rem 1.25rem',
                borderBottom: i < history.length - 1 ? `1px solid ${COLORS.border}` : 'none',
                transition: 'background 0.15s',
              }}
                onMouseEnter={e => e.currentTarget.style.background = COLORS.bg}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem', color: COLORS.text }}>
                    {sub.plan?.name || t('subscriptionPage.na', 'N/A')}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: COLORS.textSecondary, display: 'flex', flexWrap: 'wrap', gap: '0.2rem 0.45rem' }}>
                    <span>{new Date(sub.startDate).toLocaleDateString()} — {new Date(sub.endDate).toLocaleDateString()}</span>
                    {sub.plan?.duration && <span>• {sub.plan.duration}</span>}
                    {sub.createdAt && <span>• {t('subscriptionPage.assigned', 'Assigned')}: {new Date(sub.createdAt).toLocaleDateString()}</span>}
                  </div>
                  {sub.cancellationReason && (
                    <div style={{ fontSize: '0.7rem', color: COLORS.danger, marginTop: 1 }}>
                      {t('subscriptionPage.cancelledWithReason', 'Cancelled: {{reason}}', { reason: sub.cancellationReason })}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexShrink: 0, marginLeft: '0.6rem' }}>
                  <span style={{ fontWeight: 700, color: COLORS.primary, fontSize: '0.85rem' }}>
                    ₹{sub.totalAmount || sub.amount}
                  </span>
                  <StatusBadge status={sub.status} />
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ═══ Plan View Drawer ═══ */}
      {planDrawerOpen && (
        <PlanViewDrawer plan={selectedPlan} onClose={closePlanDrawer} />
      )}
    </div>
  );
};

export default SubscriptionPage;