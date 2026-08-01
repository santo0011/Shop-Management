import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import SAPageHeader from '../../components/common/SAPageHeader';
import Chart from 'react-apexcharts';
import { BiRefresh, BiDollar, BiTrendingUp, BiStore, BiCalendar } from 'react-icons/bi';

// ─── Skeleton Loader ──────────────────────────────────────────
const RevenueReportsSkeletonLoader = () => (
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
      <div style={{
        height: 32, width: 100,
        background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
        backgroundSize: '200% 100%', borderRadius: 8,
        animation: 'shimmer 1.5s infinite',
      }} />
    </div>

    {/* Filter bar skeleton */}
    <div className="list-filters-card mb-3">
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {[1, 2, 3].map((i) => (
          <div key={i} style={{
            height: 32, width: 80,
            background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
            backgroundSize: '200% 100%', borderRadius: 8,
            animation: 'shimmer 1.5s infinite',
          }} />
        ))}
        <div style={{
          height: 32, width: 140,
          background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
          backgroundSize: '200% 100%', borderRadius: 8,
          animation: 'shimmer 1.5s infinite',
        }} />
        <div style={{
          height: 32, width: 140,
          background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
          backgroundSize: '200% 100%', borderRadius: 8,
          animation: 'shimmer 1.5s infinite',
        }} />
      </div>
    </div>

    {/* Stat cards skeleton */}
    <div className="row g-3 mb-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="col-md-3 col-6">
          <div className="sa-stat-card" style={{ padding: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
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
        </div>
      ))}
    </div>

    {/* Chart skeleton */}
    <div className="premium-card">
      <div className="premium-card-header">
        <div style={{
          height: 20, width: '30%',
          background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
          backgroundSize: '200% 100%', borderRadius: 6,
          animation: 'shimmer 1.5s infinite',
        }} />
      </div>
      <div className="premium-card-body">
        <div style={{
          height: 350, width: '100%',
          background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
          backgroundSize: '200% 100%', borderRadius: 12,
          animation: 'shimmer 1.5s infinite',
        }} />
      </div>
    </div>
  </div>
);

// ─── Inline Stat Cards + Chart Skeleton ──────────────────────
const RevenueContentSkeleton = () => (
  <>
    <div className="row g-3 mb-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="col-md-3 col-6">
          <div className="sa-stat-card" style={{ padding: '1rem', opacity: 0.5 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
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
        </div>
      ))}
    </div>
    <div className="premium-card">
      <div className="premium-card-header">
        <div style={{
          height: 20, width: '30%',
          background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
          backgroundSize: '200% 100%', borderRadius: 6,
          animation: 'shimmer 1.5s infinite',
        }} />
      </div>
      <div className="premium-card-body">
        <div style={{
          height: 350, width: '100%',
          background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
          backgroundSize: '200% 100%', borderRadius: 12,
          animation: 'shimmer 1.5s infinite',
        }} />
      </div>
    </div>
  </>
);

const RevenueReports = () => {
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState('monthly');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const isFirstLoad = useRef(true);

  const fetchData = useCallback(async () => {
    if (isFirstLoad.current) {
      setInitialLoading(true);
    } else {
      setRefreshing(true);
    }
    try {
      const params = { period };
      if (dateFrom) params.from = dateFrom;
      if (dateTo) params.to = dateTo;
      const { data: result } = await api.get('/super-admin/revenue-reports', { params, _skipLoading: true });
      setData(result);
    } catch (err) {
      console.error(err);
    } finally {
      setInitialLoading(false);
      setRefreshing(false);
      if (isFirstLoad.current) isFirstLoad.current = false;
    }
  }, [period, dateFrom, dateTo]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const getTheme = () => {
    try { return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'; }
    catch { return 'light'; }
  };

  const theme = useMemo(() => getTheme(), [data]);
  const chartColors = {
    primary: '#6C63FF', secondary: '#00D9A6',
    textSecondary: theme === 'dark' ? '#9a9ab8' : '#5a5a7a',
    gridColor: theme === 'dark' ? '#2a2a4e' : '#e8e8f0',
  };

  const chartOptions = useMemo(() => ({
    chart: { type: 'area', height: 350, toolbar: { show: false }, foreColor: chartColors.textSecondary },
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth', width: 2, colors: [chartColors.primary] },
    fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.5, opacityTo: 0.1 } },
    xaxis: { categories: data?.revenue?.map(r => r._id) || [], labels: { rotate: -45, style: { fontSize: '11px' } } },
    yaxis: { labels: { formatter: (val) => `₹${Number(val).toLocaleString('en-IN')}` } },
    tooltip: { y: { formatter: (val) => `₹${Number(val).toLocaleString('en-IN')}` } },
    grid: { borderColor: chartColors.gridColor },
    theme: { mode: theme },
    colors: [chartColors.primary],
  }), [data?.revenue, theme]);

  const chartSeries = useMemo(() => [{
    name: t('dashboard.revenue'),
    data: data?.revenue?.map(r => r.total) || [],
  }], [data?.revenue, t]);

  if (initialLoading) return <RevenueReportsSkeletonLoader />;

  return (
    <div>
      <SAPageHeader
        title={t('nav.revenueReports')}
        subtitle="Analyze platform revenue"
        actions={
          <button className="btn-premium btn-premium-secondary btn-premium-sm" onClick={fetchData}>
            <BiRefresh /> {t('common.refresh')}
          </button>
        }
      />

      <div className="list-filters-card mb-3">
        <div className="d-flex gap-2 flex-wrap align-items-center">
          {['daily', 'monthly', 'yearly'].map((p) => (
            <button key={p} className={`btn-premium btn-premium-sm ${period === p ? 'btn-premium-primary' : 'btn-premium-secondary'}`} onClick={() => setPeriod(p)}>
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
          <input type="date" className="form-control" style={{ width: '140px' }} value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          <input type="date" className="form-control" style={{ width: '140px' }} value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </div>
      </div>

      {refreshing ? (
        <RevenueContentSkeleton />
      ) : (
        <>
          <div className="row g-3 mb-4">
            <div className="col-md-3 col-6">
              <div className="sa-stat-card sa-stat-primary">
                <div className="sa-stat-icon"><BiDollar /></div>
                <div className="sa-stat-info">
                  <div className="sa-stat-value">₹{Number(data?.totalRevenue || 0).toLocaleString('en-IN')}</div>
                  <div className="sa-stat-label">Total Revenue</div>
                </div>
              </div>
            </div>
            <div className="col-md-3 col-6">
              <div className="sa-stat-card sa-stat-success">
                <div className="sa-stat-icon"><BiTrendingUp /></div>
                <div className="sa-stat-info">
                  <div className="sa-stat-value">₹{Number(data?.monthlyRevenue || 0).toLocaleString('en-IN')}</div>
                  <div className="sa-stat-label">Monthly Revenue</div>
                </div>
              </div>
            </div>
            <div className="col-md-3 col-6">
              <div className="sa-stat-card sa-stat-warning">
                <div className="sa-stat-icon"><BiStore /></div>
                <div className="sa-stat-info">
                  <div className="sa-stat-value">{data?.payingShops || 0}</div>
                  <div className="sa-stat-label">Paying Shops</div>
                </div>
              </div>
            </div>
            <div className="col-md-3 col-6">
              <div className="sa-stat-card sa-stat-info">
                <div className="sa-stat-icon"><BiCalendar /></div>
                <div className="sa-stat-info">
                  <div className="sa-stat-value">{data?.periodLabel || period}</div>
                  <div className="sa-stat-label">Report Period</div>
                </div>
              </div>
            </div>
          </div>

          <div className="premium-card">
            <div className="premium-card-header">
              <h6 className="mb-0" style={{ fontWeight: 600 }}>Revenue Trend ({period})</h6>
            </div>
            <div className="premium-card-body">
              {data?.revenue?.length > 0 ? (
                <Chart options={chartOptions} series={chartSeries} type="area" height={350} />
              ) : (
                <div className="text-center py-5" style={{ color: 'var(--text-muted)' }}>{t('common.noData')}</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default RevenueReports;