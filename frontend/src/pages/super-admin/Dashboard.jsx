import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import Chart from 'react-apexcharts';
import useCountUp from '../../hooks/useCountUp';
import {
  BiStore, BiCheckCircle, BiTime, BiDollar, BiCreditCard,
  BiCalendar, BiError, BiRefresh, BiTrendingUp,
  BiLineChart, BiPieChart, BiBarChartAlt,
} from 'react-icons/bi';

const SuperDashboard = () => {
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    setError(null);
    try {
      const { data: result } = await api.get('/super-admin/dashboard', { _skipLoading: true });
      setData(result);
    } catch (err) {
      setError(err.response?.data?.message || t('dashboard.failedToLoadData'));
    }
  }, [t]);

  useEffect(() => {
    fetchData();
  }, []);

  const getTheme = () => {
    try {
      return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    } catch { return 'light'; }
  };

  const theme = useMemo(() => getTheme(), [data]);

  const chartColors = {
    primary: '#6C63FF',
    secondary: '#00D9A6',
    warning: '#FFB545',
    danger: '#FF6B6B',
    info: '#17A2B8',
    textSecondary: theme === 'dark' ? '#9a9ab8' : '#5a5a7a',
    gridColor: theme === 'dark' ? '#2a2a4e' : '#e8e8f0',
  };

  // ===== Monthly Revenue Line Chart =====
  const revenueChartOptions = useMemo(() => ({
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
      categories: data?.monthlyRevenue?.map(r => {
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
  }), [data?.monthlyRevenue, theme]);

  const revenueChartSeries = useMemo(() => [{
    name: t('dashboard.revenue'),
    data: data?.monthlyRevenue?.map(r => r.total) || [],
  }], [data?.monthlyRevenue, t]);

  // ===== Shop Growth Line Chart =====
  const shopGrowthOptions = useMemo(() => ({
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
      categories: data?.shopGrowth?.map(r => {
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
  }), [data?.shopGrowth, theme]);

  const shopGrowthSeries = useMemo(() => [{
    name: t('saDashboardPage.newShops'),
    data: data?.shopGrowth?.map(r => r.count) || [],
  }], [data?.shopGrowth, t]);

  // ===== Subscription Growth Line Chart =====
  const subGrowthOptions = useMemo(() => ({
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
      categories: data?.subscriptionGrowth?.map(r => {
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
  }), [data?.subscriptionGrowth, theme]);

  const subGrowthSeries = useMemo(() => [{
    name: t('saDashboardPage.activeSubscriptions'),
    data: data?.subscriptionGrowth?.map(r => r.count) || [],
  }], [data?.subscriptionGrowth, t]);

  // ===== Plan Distribution Donut Chart =====
  const planDistOptions = useMemo(() => ({
    chart: { type: 'donut', height: 320, toolbar: { show: false } },
    labels: data?.planDistribution?.map(r => r.planName || 'Unknown') || [],
    colors: ['#6C63FF', '#00D9A6', '#FFB545', '#FF6B6B', '#17A2B8'],
    legend: {
      position: 'bottom',
      labels: { colors: chartColors.textSecondary },
    },
    dataLabels: { enabled: true, formatter: (val) => `${val.toFixed(1)}%` },
    tooltip: {
      y: {
        formatter: (val, { seriesIndex, w }) => {
          const plan = data?.planDistribution?.[seriesIndex];
          return `${w.config.labels[seriesIndex]}: ${val} subs\nRevenue: ₹${(plan?.revenue || 0).toLocaleString('en-IN')}`;
        },
      },
      theme,
    },
    responsive: [{ breakpoint: 480, options: { chart: { height: 280 }, legend: { position: 'bottom' } } }],
    theme: { mode: theme },
  }), [data?.planDistribution, theme]);

  const planDistSeries = useMemo(() =>
    data?.planDistribution?.map(r => r.count) || [],
  [data?.planDistribution]);

  // ===== Active vs Expired Donut Chart =====
  const activeExpiredOptions = useMemo(() => ({
    chart: { type: 'donut', height: 280, toolbar: { show: false } },
    labels: data?.activeVsExpired?.map(r => r.name) || [],
    colors: ['#00D9A6', '#FF6B6B', '#FFB545', '#9a9ab8'],
    legend: { position: 'bottom', labels: { colors: chartColors.textSecondary } },
    dataLabels: { enabled: true, formatter: (val) => `${val.toFixed(1)}%` },
    tooltip: { theme },
    responsive: [{ breakpoint: 480, options: { chart: { height: 240 } } }],
    theme: { mode: theme },
  }), [data?.activeVsExpired, theme]);

  const activeExpiredSeries = useMemo(() =>
    data?.activeVsExpired?.map(r => r.value) || [],
  [data?.activeVsExpired]);

  // ===== 6 Most Important Stat Cards =====
  const statCards = [
    { icon: BiStore, key: 'totalShops', label: t('saDashboardPage.totalShops'), value: data?.totalShops || 0, color: 'primary' },
    { icon: BiCheckCircle, key: 'activeShops', label: t('saDashboardPage.activeShops'), value: data?.activeShops || 0, color: 'success' },
    { icon: BiTime, key: 'trialShops', label: t('saDashboardPage.trialShops'), value: data?.trialShops || 0, color: 'warning' },
    { icon: BiDollar, key: 'totalRevenue', label: t('saDashboardPage.totalRevenue'), value: data?.totalRevenue || 0, color: 'primary', prefix: '₹' },
    { icon: BiCreditCard, key: 'activeSubscriptions', label: t('saDashboardPage.activeSubscriptions'), value: data?.activeSubscriptions || 0, color: 'success' },
    { icon: BiCalendar, key: 'expiringSoon', label: t('saDashboardPage.expiringSoon'), value: data?.expiringSoon || 0, color: 'warning' },
  ];

  const animatedValues = {
    totalShops: useCountUp(data?.totalShops || 0),
    activeShops: useCountUp(data?.activeShops || 0),
    trialShops: useCountUp(data?.trialShops || 0),
    totalRevenue: useCountUp(data?.totalRevenue || 0),
    activeSubscriptions: useCountUp(data?.activeSubscriptions || 0),
    expiringSoon: useCountUp(data?.expiringSoon || 0),
  };

  return (
    <div>
      {/* Page Header */}
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

      {/* Error Banner */}
      {error && (
        <div className="d-flex align-items-center gap-2 mb-4 p-3" style={{ background: 'var(--glow-danger)', borderRadius: 'var(--border-radius-md)', color: 'var(--danger)', fontSize: '0.85rem' }}>
          <BiError style={{ fontSize: '1.2rem', flexShrink: 0 }} />
          <span style={{ flex: 1 }}>{error}</span>
          <button className="btn-premium btn-premium-primary btn-premium-sm" onClick={fetchData}><BiRefresh /> {t('common.retry')}</button>
        </div>
      )}

      {/* 6 Stat Cards - 3 per row */}
      <div className="row g-3 mb-4">
        {statCards.map((card, index) => (
          <div key={index} className="col-md-4 col-sm-6">
            <div className={`sa-stat-card sa-stat-${card.color}`}>
              <div className="sa-stat-icon">
                <card.icon />
              </div>
              <div className="sa-stat-info">
                <div className="sa-stat-value">
                  {card.prefix || ''}
                  {Number(animatedValues[card.key]).toLocaleString('en-IN')}
                </div>
                <div className="sa-stat-label">{card.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row 1 - Revenue + Shop Growth (Line Charts) */}
      <div className="row g-3 mb-3">
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
              {data?.monthlyRevenue?.length > 0 ? (
                <Chart options={revenueChartOptions} series={revenueChartSeries} type="line" height={320} />
              ) : (
                <div className="text-center py-5" style={{ color: 'var(--text-muted)' }}>{t('common.noData')}</div>
              )}
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
              {data?.shopGrowth?.length > 0 ? (
                <Chart options={shopGrowthOptions} series={shopGrowthSeries} type="line" height={320} />
              ) : (
                <div className="text-center py-5" style={{ color: 'var(--text-muted)' }}>{t('common.noData')}</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row 2 - Subscription Growth + Plan Distribution */}
      <div className="row g-3 mb-3">
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
              {data?.subscriptionGrowth?.length > 0 ? (
                <Chart options={subGrowthOptions} series={subGrowthSeries} type="line" height={320} />
              ) : (
                <div className="text-center py-5" style={{ color: 'var(--text-muted)' }}>{t('common.noData')}</div>
              )}
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
              {data?.planDistribution?.length > 0 ? (
                <Chart options={planDistOptions} series={planDistSeries} type="donut" height={320} />
              ) : (
                <div className="text-center py-5" style={{ color: 'var(--text-muted)' }}>{t('common.noData')}</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row 3 - Active vs Expired + Recent Activity */}
      <div className="row g-3 mb-3">
        <div className="col-lg-4">
          <div className="premium-card">
            <div className="premium-card-header">
              <div className="d-flex align-items-center gap-2">
                <BiPieChart style={{ color: 'var(--secondary)', fontSize: '1.1rem' }} />
                <h6 className="mb-0" style={{ fontWeight: 600 }}>Shop Status</h6>
              </div>
            </div>
            <div className="premium-card-body" style={{ padding: '0.75rem' }}>
              {data?.activeVsExpired?.length > 0 ? (
                <Chart options={activeExpiredOptions} series={activeExpiredSeries} type="donut" height={280} />
              ) : (
                <div className="text-center py-5" style={{ color: 'var(--text-muted)' }}>{t('common.noData')}</div>
              )}
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
              {data?.recentActivities?.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {data.recentActivities.slice(0, 6).map((activity, i) => (
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
              ) : (
                <div className="text-center py-4" style={{ color: 'var(--text-muted)' }}>{t('common.noData')}</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuperDashboard;