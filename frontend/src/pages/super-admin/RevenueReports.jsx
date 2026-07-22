import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import SAPageHeader from '../../components/common/SAPageHeader';
import Chart from 'react-apexcharts';
import { BiRefresh, BiDollar, BiTrendingUp, BiStore, BiCalendar } from 'react-icons/bi';

const RevenueReports = () => {
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('monthly');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => { fetchData(); }, [period]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = { period };
      if (dateFrom) params.from = dateFrom;
      if (dateTo) params.to = dateTo;
      const { data: result } = await api.get('/super-admin/revenue-reports', { params, _skipLoading: true });
      setData(result);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

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

      {loading ? (
        <div className="text-center py-5"><div className="spinner-border spinner-border-sm me-2" /> {t('common.loading')}</div>
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