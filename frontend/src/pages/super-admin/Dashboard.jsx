import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import Chart from 'react-apexcharts';
import {
  BiStore, BiCheckCircle, BiTime, BiDollar, BiCreditCard, BiCalendar, BiError, BiRefresh
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
      setError(err.response?.data?.message || 'Failed to load dashboard data');
    }
  }, []);

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
    textSecondary: theme === 'dark' ? '#9a9ab8' : '#5a5a7a',
    gridColor: theme === 'dark' ? '#2a2a4e' : '#e8e8f0',
  };

  // Monthly Revenue Chart
  const revenueChartOptions = useMemo(() => ({
    chart: { type: 'area', height: 320, toolbar: { show: false }, foreColor: chartColors.textSecondary },
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth', width: 2, colors: [chartColors.primary] },
    fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.5, opacityTo: 0.1, stops: [0, 100] } },
    xaxis: { categories: data?.monthlyRevenue?.map(r => r._id) || [], labels: { rotate: -45, style: { fontSize: '11px' } } },
    yaxis: { labels: { formatter: (val) => `₹${Number(val).toLocaleString('en-IN')}`, style: { fontSize: '11px' } } },
    tooltip: { y: { formatter: (val) => `₹${Number(val).toLocaleString('en-IN')}` } },
    grid: { borderColor: chartColors.gridColor },
    theme: { mode: theme },
    colors: [chartColors.primary],
  }), [data?.monthlyRevenue, theme]);

  const revenueChartSeries = useMemo(() => [{
    name: 'Revenue',
    data: data?.monthlyRevenue?.map(r => r.total) || [],
  }], [data?.monthlyRevenue]);

  // Shop Growth Chart
  const shopGrowthOptions = useMemo(() => ({
    chart: { type: 'bar', height: 320, toolbar: { show: false }, foreColor: chartColors.textSecondary },
    plotOptions: { bar: { borderRadius: 6, columnWidth: '55%' } },
    dataLabels: { enabled: false },
    xaxis: { categories: data?.shopGrowth?.map(r => r._id) || [], labels: { rotate: -45, style: { fontSize: '11px' } } },
    yaxis: { labels: { formatter: (val) => Math.round(val), style: { fontSize: '11px' } } },
    grid: { borderColor: chartColors.gridColor },
    theme: { mode: theme },
    colors: [chartColors.secondary],
  }), [data?.shopGrowth, theme]);

  const shopGrowthSeries = useMemo(() => [{
    name: 'New Shops',
    data: data?.shopGrowth?.map(r => r.count) || [],
  }], [data?.shopGrowth]);

  const statCards = [
    { icon: BiStore, label: 'Total Shops', value: data?.totalShops || 0, color: 'primary' },
    { icon: BiCheckCircle, label: 'Active Shops', value: data?.activeShops || 0, color: 'success' },
    { icon: BiTime, label: 'Trial Shops', value: data?.trialShops || 0, color: 'warning' },
    { icon: BiDollar, label: 'Total Revenue', value: data?.totalRevenue || 0, color: 'primary', prefix: '₹' },
    { icon: BiCreditCard, label: 'Active Subscriptions', value: data?.activeSubscriptions || 0, color: 'success' },
    { icon: BiCalendar, label: 'Expiring Soon', value: data?.expiringSoon || 0, color: 'warning' },
  ];

  return (
    <div>
      {/* Page Header */}
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h4 className="mb-1" style={{ fontWeight: 800 }}>Dashboard</h4>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
            Business overview at a glance
          </p>
        </div>
        <button className="btn-premium btn-premium-secondary btn-premium-sm" onClick={fetchData}>
          <BiRefresh /> Refresh
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="d-flex align-items-center gap-2 mb-4 p-3" style={{ background: 'var(--glow-danger)', borderRadius: 'var(--border-radius-md)', color: 'var(--danger)', fontSize: '0.85rem' }}>
          <BiError style={{ fontSize: '1.2rem', flexShrink: 0 }} />
          <span style={{ flex: 1 }}>{error}</span>
          <button className="btn-premium btn-premium-primary btn-premium-sm" onClick={fetchData}><BiRefresh /> Retry</button>
        </div>
      )}

      {/* Stat Cards */}
      <div className="row g-3 mb-4">
        {statCards.map((card, index) => (
          <div key={index} className="col-md-4">
            <div className={`stat-card stat-card-modern stat-${card.color}`} style={{ padding: '1.25rem' }}>
              <div className="d-flex align-items-center gap-3">
                <div className="stat-icon-wrapper" style={{ width: '44px', height: '44px', fontSize: '1.3rem', marginBottom: 0 }}>
                  <card.icon />
                </div>
                <div>
                  <div className="stat-value" style={{ fontSize: '1.4rem', marginBottom: 0 }}>
                    {card.prefix || ''}{Number(card.value).toLocaleString('en-IN')}
                  </div>
                  <div className="stat-label" style={{ fontSize: '0.78rem' }}>{card.label}</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="row g-3">
        <div className="col-lg-6">
          <div className="premium-card">
            <div className="premium-card-header">
              <h6 className="mb-0" style={{ fontWeight: 600 }}>Monthly Revenue</h6>
              <span className="badge badge-primary">Revenue</span>
            </div>
            <div className="premium-card-body">
              <Chart options={revenueChartOptions} series={revenueChartSeries} type="area" height={320} />
            </div>
          </div>
        </div>
        <div className="col-lg-6">
          <div className="premium-card">
            <div className="premium-card-header">
              <h6 className="mb-0" style={{ fontWeight: 600 }}>Shop Growth</h6>
              <span className="badge badge-success">Monthly</span>
            </div>
            <div className="premium-card-body">
              <Chart options={shopGrowthOptions} series={shopGrowthSeries} type="bar" height={320} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuperDashboard;