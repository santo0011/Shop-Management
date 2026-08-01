import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import Chart from 'react-apexcharts';
import useCountUp from '../../hooks/useCountUp';
import {
  BiStore, BiCheckCircle, BiTime, BiDollar, BiCreditCard,
  BiCalendar, BiError, BiRefresh, BiTrendingUp,
  BiLineChart, BiPieChart, BiBarChartAlt,
} from 'react-icons/bi';

// ─── Shimmer keyframe (injected once) ─────────────────────────
const SHIMMER_STYLE = `@keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }`;

// ─── Skeleton for a single stat card ──────────────────────────
const StatCardSkeleton = () => (
  <div className="col-md-4 col-sm-6">
    <div className="premium-card" style={{ padding: '1.2rem', border: '1px solid var(--border-color)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12, flexShrink: 0,
          background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.5s infinite',
        }} />
        <div style={{ flex: 1 }}>
          <div style={{
            height: 22, width: '60%', marginBottom: 6,
            background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
            backgroundSize: '200% 100%', borderRadius: 6,
            animation: 'shimmer 1.5s infinite',
          }} />
          <div style={{
            height: 10, width: '40%',
            background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
            backgroundSize: '200% 100%', borderRadius: 4,
            animation: 'shimmer 1.5s infinite',
          }} />
        </div>
      </div>
    </div>
  </div>
);

// ─── Skeleton for a chart card ────────────────────────────────
const ChartCardSkeleton = ({ height = 320 }) => (
  <div className="col-lg-6">
    <div className="premium-card" style={{ border: '1px solid var(--border-color)' }}>
      <div className="premium-card-header">
        <div style={{
          height: 14, width: '40%',
          background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
          backgroundSize: '200% 100%', borderRadius: 4,
          animation: 'shimmer 1.5s infinite',
        }} />
      </div>
      <div className="premium-card-body" style={{ padding: '0.75rem' }}>
        <div style={{
          height, width: '100%',
          background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
          backgroundSize: '200% 100%', borderRadius: 8,
          animation: 'shimmer 1.5s infinite',
        }} />
      </div>
    </div>
  </div>
);

// ─── Page Header Skeleton ─────────────────────────────────────
const PageHeaderSkeleton = () => (
  <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
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
    <div style={{
      height: 36, width: 120,
      background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
      backgroundSize: '200% 100%', borderRadius: 8,
      animation: 'shimmer 1.5s infinite',
    }} />
  </div>
);

// ─── Chart Components (memoized to prevent re-renders) ────────
const RevenueChart = React.memo(({ data, theme, chartColors, t }) => {
  const options = useMemo(() => ({
    chart: {
      type: 'line', height: 320, toolbar: { show: false },
      foreColor: chartColors.textSecondary,
      zoom: { enabled: false },
      animations: { enabled: true, dynamicAnimation: { speed: 500 } },
    },
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth', width: 3, colors: [chartColors.primary] },
    fill: {
      type: 'gradient',
      gradient: { shadeIntensity: 1, opacityFrom: 0.3, opacityTo: 0.05, stops: [0, 100] },
    },
    markers: { size: 4, colors: ['#fff'], strokeColors: chartColors.primary, strokeWidth: 2 },
    xaxis: {
      categories: data?.map(r => {
        const parts = r._id.split('-');
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        return months[parseInt(parts[1]) - 1] + ' ' + parts[0];
      }) || [],
      labels: { rotate: 0, style: { fontSize: '11px', fontWeight: 500 } },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: {
        formatter: (val) => `₹${(val / 1000).toFixed(0)}K`,
        style: { fontSize: '11px' },
      },
    },
    tooltip: {
      y: { formatter: (val) => `₹${Number(val).toLocaleString('en-IN')}` },
      theme,
    },
    grid: { borderColor: chartColors.gridColor, strokeDashArray: 4 },
    theme: { mode: theme },
    colors: [chartColors.primary],
  }), [data, theme, chartColors]);

  const series = useMemo(() => [{
    name: t('dashboard.revenue'),
    data: data?.map(r => r.total) || [],
  }], [data, t]);

  if (!data?.length) {
    return <div className="text-center py-5" style={{ color: 'var(--text-muted)' }}>{t('common.noData')}</div>;
  }
  return <Chart options={options} series={series} type="line" height={320} />;
});

const ShopGrowthChart = React.memo(({ data, theme, chartColors, t }) => {
  const options = useMemo(() => ({
    chart: {
      type: 'line', height: 320, toolbar: { show: false },
      foreColor: chartColors.textSecondary,
      zoom: { enabled: false },
    },
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth', width: 3, colors: [chartColors.secondary] },
    fill: {
      type: 'gradient',
      gradient: { shadeIntensity: 1, opacityFrom: 0.3, opacityTo: 0.05, stops: [0, 100] },
    },
    markers: { size: 4, colors: ['#fff'], strokeColors: chartColors.secondary, strokeWidth: 2 },
    xaxis: {
      categories: data?.map(r => {
        const parts = r._id.split('-');
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        return months[parseInt(parts[1]) - 1];
      }) || [],
      labels: { style: { fontSize: '11px' } },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: { formatter: (val) => Math.round(val), style: { fontSize: '11px' } },
      min: 0,
    },
    tooltip: { theme },
    grid: { borderColor: chartColors.gridColor, strokeDashArray: 4 },
    theme: { mode: theme },
    colors: [chartColors.secondary],
  }), [data, theme, chartColors]);

  const series = useMemo(() => [{
    name: t('saDashboardPage.newShops'),
    data: data?.map(r => r.count) || [],
  }], [data, t]);

  if (!data?.length) {
    return <div className="text-center py-5" style={{ color: 'var(--text-muted)' }}>{t('common.noData')}</div>;
  }
  return <Chart options={options} series={series} type="line" height={320} />;
});

const SubGrowthChart = React.memo(({ data, theme, chartColors, t }) => {
  const options = useMemo(() => ({
    chart: {
      type: 'line', height: 320, toolbar: { show: false },
      foreColor: chartColors.textSecondary,
    },
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth', width: 3, colors: [chartColors.info] },
    fill: {
      type: 'gradient',
      gradient: { shadeIntensity: 1, opacityFrom: 0.3, opacityTo: 0.05, stops: [0, 100] },
    },
    markers: { size: 4, colors: ['#fff'], strokeColors: chartColors.info, strokeWidth: 2 },
    xaxis: {
      categories: data?.map(r => {
        const parts = r._id.split('-');
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        return months[parseInt(parts[1]) - 1];
      }) || [],
      labels: { style: { fontSize: '11px' } },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: { labels: { formatter: (val) => Math.round(val), style: { fontSize: '11px' } } },
    tooltip: { theme },
    grid: { borderColor: chartColors.gridColor, strokeDashArray: 4 },
    theme: { mode: theme },
    colors: [chartColors.info],
  }), [data, theme, chartColors]);

  const series = useMemo(() => [{
    name: t('saDashboardPage.activeSubscriptions'),
    data: data?.map(r => r.count) || [],
  }], [data, t]);

  if (!data?.length) {
    return <div className="text-center py-5" style={{ color: 'var(--text-muted)' }}>{t('common.noData')}</div>;
  }
  return <Chart options={options} series={series} type="line" height={320} />;
});

const PlanDistChart = React.memo(({ data, theme, chartColors, t }) => {
  const options = useMemo(() => ({
    chart: { type: 'donut', height: 320, toolbar: { show: false } },
    labels: data?.map(r => r.planName || 'Unknown') || [],
    colors: ['#6C63FF', '#00D9A6', '#FFB545', '#FF6B6B', '#17A2B8'],
    legend: {
      position: 'bottom',
      labels: { colors: chartColors.textSecondary },
    },
    dataLabels: { enabled: true, formatter: (val) => `${val.toFixed(1)}%` },
    tooltip: {
      y: {
        formatter: (val, { seriesIndex, w }) => {
          const plan = data?.[seriesIndex];
          return `${w.config.labels[seriesIndex]}: ${val} subs\nRevenue: ₹${(plan?.revenue || 0).toLocaleString('en-IN')}`;
        },
      },
      theme,
    },
    responsive: [{ breakpoint: 480, options: { chart: { height: 280 }, legend: { position: 'bottom' } } }],
    theme: { mode: theme },
  }), [data, theme, chartColors]);

  const series = useMemo(() => data?.map(r => r.count) || [], [data]);

  if (!data?.length) {
    return <div className="text-center py-5" style={{ color: 'var(--text-muted)' }}>{t('common.noData')}</div>;
  }
  return <Chart options={options} series={series} type="donut" height={320} />;
});

const ActiveExpiredChart = React.memo(({ data, theme, chartColors, t }) => {
  const options = useMemo(() => ({
    chart: { type: 'donut', height: 280, toolbar: { show: false } },
    labels: data?.map(r => r.name) || [],
    colors: ['#00D9A6', '#FF6B6B', '#FFB545', '#9a9ab8'],
    legend: { position: 'bottom', labels: { colors: chartColors.textSecondary } },
    dataLabels: { enabled: true, formatter: (val) => `${val.toFixed(1)}%` },
    tooltip: { theme },
    responsive: [{ breakpoint: 480, options: { chart: { height: 240 } } }],
    theme: { mode: theme },
  }), [data, theme, chartColors]);

  const series = useMemo(() => data?.map(r => r.value) || [], [data]);

  if (!data?.length) {
    return <div className="text-center py-5" style={{ color: 'var(--text-muted)' }}>{t('common.noData')}</div>;
  }
  return <Chart options={options} series={series} type="donut" height={280} />;
});

const RecentActivity = React.memo(({ activities, t }) => {
  if (!activities?.length) {
    return <div className="text-center py-4" style={{ color: 'var(--text-muted)' }}>{t('common.noData')}</div>;
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {activities.slice(0, 6).map((activity, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '0.5rem 0.75rem',
          borderRadius: 'var(--border-radius-sm)',
          background: 'var(--bg-input)',
        }}>
          <div style={{
            width: '28px', height: '28px', borderRadius: '8px',
            background: 'var(--glow-primary)', color: 'var(--primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.8rem', flexShrink: 0,
          }}>
            <BiTrendingUp />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>{activity.action}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              {activity.user?.name || 'System'} · {new Date(activity.createdAt).toLocaleString()}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
});

// ─── Stat Card Component ──────────────────────────────────────
const StatCard = React.memo(({ card, animatedValue, prefix }) => (
  <div className={`sa-stat-card sa-stat-${card.color}`}>
    <div className="sa-stat-icon">
      <card.icon />
    </div>
    <div className="sa-stat-info">
      <div className="sa-stat-value">
        {prefix || ''}
        {Number(animatedValue).toLocaleString('en-IN')}
      </div>
      <div className="sa-stat-label">{card.label}</div>
    </div>
  </div>
));

const SuperDashboard = () => {
  const { t } = useTranslation();
  const [kpiData, setKpiData] = useState(null);
  const [subData, setSubData] = useState(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState(null);
  const fetchIdRef = useRef(0);

  // Get theme once from DOM (not dependent on data)
  const getTheme = useCallback(() => {
    try {
      return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    } catch { return 'light'; }
  }, []);

  const theme = useMemo(() => getTheme(), []);

  const chartColors = useMemo(() => ({
    primary: '#6C63FF',
    secondary: '#00D9A6',
    warning: '#FFB545',
    danger: '#FF6B6B',
    info: '#17A2B8',
    textSecondary: theme === 'dark' ? '#9a9ab8' : '#5a5a7a',
    gridColor: theme === 'dark' ? '#2a2a4e' : '#e8e8f0',
  }), [theme]);

  const fetchData = useCallback(async () => {
    const fetchId = ++fetchIdRef.current;
    setError(null);
    setInitialLoading(true);
    setKpiData(null);
    setSubData(null);

    // Fire subscription dashboard independently (doesn't block KPI cards)
    api.get('/subscription/dashboard', { _skipLoading: true }).then(subRes => {
      if (fetchId === fetchIdRef.current) {
        setSubData(subRes.data);
      }
    }).catch(() => {
      // Subscription dashboard is optional - charts will show loading state
    });

    try {
      // Main dashboard data - KPI cards appear as soon as this resolves
      const dashboardRes = await api.get('/super-admin/dashboard', { _skipLoading: true });

      if (fetchId !== fetchIdRef.current) return;

      setKpiData(dashboardRes.data);
      setInitialLoading(false);
    } catch (err) {
      if (fetchId !== fetchIdRef.current) return;
      setError(err.response?.data?.message || t('dashboard.failedToLoadData'));
      setInitialLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchData();
  }, []);

  // Merge KPI + subscription data for the complete view
  const mergedData = useMemo(() => {
    if (!kpiData) return null;
    // subscription dashboard's monthlyRevenue is a number (current month total),
    // but the dashboard's monthlyRevenue is an array (month-by-month breakdown).
    // Keep the array – the number is what we already have in kpiData.totalRevenue.
    return {
      ...kpiData,
      ...(subData || {}),
      // Preserve the monthlyRevenue array from main dashboard (overwrite any number from subData)
      monthlyRevenue: kpiData.monthlyRevenue,
    };
  }, [kpiData, subData]);

  // Derived state for progressive rendering
  const kpiReady = !!kpiData;
  const chartsReady = !!subData && !!kpiData;

  // useCountUp at top level (rules of hooks)
  const animatedTotalShops = useCountUp(kpiData?.totalShops || 0);
  const animatedActiveShops = useCountUp(kpiData?.activeShops || 0);
  const animatedTrialShops = useCountUp(kpiData?.trialShops || 0);
  const animatedTotalRevenue = useCountUp(kpiData?.totalRevenue || 0);
  const animatedActiveSubscriptions = useCountUp(kpiData?.activeSubscriptions || 0);
  const animatedExpiringSoon = useCountUp(kpiData?.expiringSoon || 0);

  // ===== 6 Most Important Stat Cards =====
  const statCards = useMemo(() => [
    { icon: BiStore, key: 'totalShops', label: t('saDashboardPage.totalShops'), value: kpiData?.totalShops || 0, color: 'primary' },
    { icon: BiCheckCircle, key: 'activeShops', label: t('saDashboardPage.activeShops'), value: kpiData?.activeShops || 0, color: 'success' },
    { icon: BiTime, key: 'trialShops', label: t('saDashboardPage.trialShops'), value: kpiData?.trialShops || 0, color: 'warning' },
    { icon: BiDollar, key: 'totalRevenue', label: t('saDashboardPage.totalRevenue'), value: kpiData?.totalRevenue || 0, color: 'primary', prefix: '₹' },
    { icon: BiCreditCard, key: 'activeSubscriptions', label: t('saDashboardPage.activeSubscriptions'), value: kpiData?.activeSubscriptions || 0, color: 'success' },
    { icon: BiCalendar, key: 'expiringSoon', label: t('saDashboardPage.expiringSoon'), value: kpiData?.expiringSoon || 0, color: 'warning' },
  ], [kpiData?.totalShops, kpiData?.activeShops, kpiData?.trialShops, kpiData?.totalRevenue, kpiData?.activeSubscriptions, kpiData?.expiringSoon, t]);

  const animatedValues = useMemo(() => ({
    totalShops: animatedTotalShops,
    activeShops: animatedActiveShops,
    trialShops: animatedTrialShops,
    totalRevenue: animatedTotalRevenue,
    activeSubscriptions: animatedActiveSubscriptions,
    expiringSoon: animatedExpiringSoon,
  }), [animatedTotalShops, animatedActiveShops, animatedTrialShops, animatedTotalRevenue, animatedActiveSubscriptions, animatedExpiringSoon]);

  return (
    <div>
      <style>{SHIMMER_STYLE}</style>

      {/* Page Header */}
      {!kpiReady ? (
        <PageHeaderSkeleton />
      ) : (
        <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
          <div>
            <h4 className="mb-1" style={{ fontWeight: 800, fontSize: '1.35rem' }}>{t('nav.dashboard')}</h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
              {t('saDashboardPage.subtitle')}
            </p>
          </div>
          <button className="btn-premium btn-premium-secondary btn-premium-sm" onClick={fetchData}>
            <BiRefresh /> {t('common.refresh')}
          </button>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="d-flex align-items-center gap-2 mb-4 p-3" style={{ background: 'var(--glow-danger)', borderRadius: 'var(--border-radius-md)', color: 'var(--danger)', fontSize: '0.85rem' }}>
          <BiError style={{ fontSize: '1.2rem', flexShrink: 0 }} />
          <span style={{ flex: 1 }}>{error}</span>
          <button className="btn-premium btn-premium-primary btn-premium-sm" onClick={fetchData}><BiRefresh /> {t('common.retry')}</button>
        </div>
      )}

      {/* 6 Stat Cards - show as soon as KPI data arrives (progressive) */}
      <div className="row g-3 mb-4">
        {!kpiReady
          ? [1, 2, 3, 4, 5, 6].map((i) => <StatCardSkeleton key={i} />)
          : statCards.map((card, index) => (
              <div key={index} className="col-md-4 col-sm-6">
                <StatCard card={card} animatedValue={animatedValues[card.key]} prefix={card.prefix} />
              </div>
            ))
        }
      </div>

      {/* Charts Row 1 - Revenue + Shop Growth (show skeleton until subData arrives) */}
      <div className="row g-3 mb-3">
        {!chartsReady ? (
          <>
            <ChartCardSkeleton />
            <ChartCardSkeleton />
          </>
        ) : (
          <>
            <div className="col-lg-6">
              <div className="premium-card">
                <div className="premium-card-header">
                  <div className="d-flex align-items-center gap-2">
                    <BiLineChart style={{ color: 'var(--primary)', fontSize: '1.1rem' }} />
                    <h6 className="mb-0" style={{ fontWeight: 600 }}>{t('saDashboardPage.monthlyRevenue')}</h6>
                  </div>
                  <span className="badge badge-primary">{t('dashboard.revenue')}</span>
                </div>
                <div className="premium-card-body" style={{ padding: '0.75rem' }}>
                  <RevenueChart data={mergedData.monthlyRevenue} theme={theme} chartColors={chartColors} t={t} />
                </div>
              </div>
            </div>
            <div className="col-lg-6">
              <div className="premium-card">
                <div className="premium-card-header">
                  <div className="d-flex align-items-center gap-2">
                    <BiTrendingUp style={{ color: 'var(--secondary)', fontSize: '1.1rem' }} />
                    <h6 className="mb-0" style={{ fontWeight: 600 }}>{t('saDashboardPage.shopGrowth')}</h6>
                  </div>
                  <span className="badge badge-success">{t('subscription.monthly')}</span>
                </div>
                <div className="premium-card-body" style={{ padding: '0.75rem' }}>
                  <ShopGrowthChart data={mergedData.shopGrowth} theme={theme} chartColors={chartColors} t={t} />
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Charts Row 2 - Subscription Growth + Plan Distribution */}
      <div className="row g-3 mb-3">
        {!chartsReady ? (
          <>
            <ChartCardSkeleton />
            <ChartCardSkeleton />
          </>
        ) : (
          <>
            <div className="col-lg-6">
              <div className="premium-card">
                <div className="premium-card-header">
                  <div className="d-flex align-items-center gap-2">
                    <BiLineChart style={{ color: 'var(--info)', fontSize: '1.1rem' }} />
                    <h6 className="mb-0" style={{ fontWeight: 600 }}>Subscription Growth</h6>
                  </div>
                  <span className="badge badge-info">{t('saDashboardPage.activeSubscriptions')}</span>
                </div>
                <div className="premium-card-body" style={{ padding: '0.75rem' }}>
                  <SubGrowthChart data={mergedData.subscriptionGrowth} theme={theme} chartColors={chartColors} t={t} />
                </div>
              </div>
            </div>
            <div className="col-lg-6">
              <div className="premium-card">
                <div className="premium-card-header">
                  <div className="d-flex align-items-center gap-2">
                    <BiPieChart style={{ color: 'var(--primary)', fontSize: '1.1rem' }} />
                    <h6 className="mb-0" style={{ fontWeight: 600 }}>Plan Distribution</h6>
                  </div>
                  <span className="badge badge-primary">{t('managePlansPage.plans')}</span>
                </div>
                <div className="premium-card-body" style={{ padding: '0.75rem' }}>
                  <PlanDistChart data={mergedData.planDistribution} theme={theme} chartColors={chartColors} t={t} />
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Charts Row 3 - Active vs Expired + Recent Activity */}
      <div className="row g-3 mb-3">
        {!chartsReady ? (
          <>
            <ChartCardSkeleton height={280} />
            <ChartCardSkeleton height={280} />
          </>
        ) : (
          <>
            <div className="col-lg-4">
              <div className="premium-card">
                <div className="premium-card-header">
                  <div className="d-flex align-items-center gap-2">
                    <BiPieChart style={{ color: 'var(--secondary)', fontSize: '1.1rem' }} />
                    <h6 className="mb-0" style={{ fontWeight: 600 }}>Shop Status</h6>
                  </div>
                </div>
                <div className="premium-card-body" style={{ padding: '0.75rem' }}>
                  <ActiveExpiredChart data={mergedData.activeVsExpired} theme={theme} chartColors={chartColors} t={t} />
                </div>
              </div>
            </div>
            <div className="col-lg-8">
              <div className="premium-card">
                <div className="premium-card-header">
                  <div className="d-flex align-items-center gap-2">
                    <BiStore style={{ color: 'var(--primary)', fontSize: '1.1rem' }} />
                    <h6 className="mb-0" style={{ fontWeight: 600 }}>Recent Activity</h6>
                  </div>
                  <span className="badge badge-primary">Latest</span>
                </div>
                <div className="premium-card-body" style={{ padding: '0.75rem' }}>
                  <RecentActivity activities={mergedData.recentActivities} t={t} />
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SuperDashboard;