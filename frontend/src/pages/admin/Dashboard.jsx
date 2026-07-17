import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import api from '../../services/api';
import Chart from 'react-apexcharts';
import { BiDollar, BiCart, BiTrendingUp, BiWallet, BiPackage, BiGroup, BiCar, BiError } from 'react-icons/bi';

const Dashboard = () => {
  const { t } = useTranslation();
  const { user, loading: authLoading } = useSelector((state) => state.auth);
  const [stats, setStats] = useState(null);
  const [salesChart, setSalesChart] = useState([]);
  const [recentSales, setRecentSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, chartRes, recentRes] = await Promise.all([
        api.get('/dashboard/stats'),
        api.get('/dashboard/sales-chart?period=daily'),
        api.get('/dashboard/recent-transactions'),
      ]);
      setStats(statsRes.data || {});
      setSalesChart(Array.isArray(chartRes.data) ? chartRes.data : []);
      setRecentSales(Array.isArray(recentRes.data) ? recentRes.data : []);
    } catch (err) {
      console.error('Failed to fetch dashboard data', err);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to load dashboard data';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const chartOptions = useMemo(() => {
    const categories = Array.isArray(salesChart) ? salesChart.map(s => s._id || '') : [];
    const seriesData = Array.isArray(salesChart) ? salesChart.map(s => s.total || 0) : [];

    const theme = (() => {
      try {
        return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
      } catch {
        return 'light';
      }
    })();

    return {
      chart: { type: 'area', height: 350, toolbar: { show: false }, foreColor: 'var(--text-secondary)' },
      dataLabels: { enabled: false },
      stroke: { curve: 'smooth', width: 2, colors: ['#6C63FF'] },
      fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.5, opacityTo: 0.1, stops: [0, 100] } },
      xaxis: { categories, labels: { show: true } },
      yaxis: { labels: { formatter: (val) => `৳${Number(val).toLocaleString()}` } },
      tooltip: { y: { formatter: (val) => `৳${Number(val).toLocaleString()}` } },
      grid: { borderColor: 'var(--border-color)' },
      theme: { mode: theme },
    };
  }, [salesChart]);

  const chartSeries = useMemo(() => {
    const seriesData = Array.isArray(salesChart) ? salesChart.map(s => s.total || 0) : [];
    return [{
      name: 'Sales',
      data: seriesData,
    }];
  }, [salesChart]);

  const statCards = useMemo(() => [
    { icon: BiDollar, label: t('dashboard.todaySales'), value: stats?.todaySales || 0, color: 'primary', prefix: '৳' },
    { icon: BiCart, label: t('dashboard.monthlySales'), value: stats?.monthlySales || 0, color: 'success', prefix: '৳' },
    { icon: BiTrendingUp, label: t('dashboard.totalProfit'), value: stats?.profit || 0, color: 'info', prefix: '৳' },
    { icon: BiWallet, label: t('dashboard.expenses'), value: stats?.monthlyExpenses || 0, color: 'danger', prefix: '৳' },
    { icon: BiPackage, label: t('dashboard.totalProducts'), value: stats?.totalProducts || 0, color: 'primary' },
    { icon: BiGroup, label: t('dashboard.totalCustomers'), value: stats?.totalCustomers || 0, color: 'success' },
    { icon: BiCar, label: t('dashboard.totalSuppliers'), value: stats?.totalSuppliers || 0, color: 'info' },
    { icon: BiError, label: t('dashboard.lowStock'), value: stats?.lowStockProducts || 0, color: 'warning' },
  ], [stats, t]);

  if (authLoading || loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
        <div className="spinner-border" style={{ color: 'var(--primary)' }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="d-flex flex-column justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
        <div className="premium-card p-5 text-center" style={{ maxWidth: '500px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem', color: 'var(--danger)' }}>
            <BiError />
          </div>
          <h5 className="mb-2" style={{ fontWeight: 700 }}>Failed to Load Dashboard</h5>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            {error}
          </p>
          <button
            className="btn-premium btn-premium-primary"
            onClick={() => fetchDashboardData()}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Page Header */}
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h4 className="mb-1" style={{ fontWeight: 800 }}>{t('nav.dashboard')}</h4>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
            Welcome back, {user?.name || 'User'}! Here's your overview.
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="row g-3 mb-4">
        {statCards.map((card, index) => (
          <div key={index} className="col-6 col-md-3">
            <div className={`stat-card stat-card-modern stat-${card.color}`}>
              <div className="stat-card-top">
                <div className="stat-icon-wrapper">
                  <card.icon />
                </div>
                {index % 2 === 0 && (
                  <span className="stat-trend-badge up">↑ 12.5%</span>
                )}
              </div>
              <div className="stat-value">
                {card.prefix}{Number(card.value).toLocaleString()}
              </div>
              <div className="stat-label">{card.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="row g-3">
        {/* Sales Chart */}
        <div className="col-md-8">
          <div className="premium-card">
            <div className="premium-card-header">
              <h6 className="mb-0" style={{ fontWeight: 600 }}>{t('dashboard.salesChart')}</h6>
              <span className="badge badge-primary">This Month</span>
            </div>
            <div className="premium-card-body">
              {salesChart.length > 0 ? (
                <Chart options={chartOptions} series={chartSeries} type="area" height={350} />
              ) : (
                <div className="text-center py-5" style={{ color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem', opacity: 0.5 }}>📊</div>
                  {t('common.noData')}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="col-md-4">
          <div className="premium-card">
            <div className="premium-card-header">
              <h6 className="mb-0" style={{ fontWeight: 600 }}>{t('dashboard.recentTransactions')}</h6>
              <span className="badge badge-success">{recentSales.length}</span>
            </div>
            <div className="premium-card-body" style={{ padding: '0.75rem' }}>
              {recentSales.length > 0 ? (
                recentSales.map((sale, index) => (
                  <div key={index} className="d-flex justify-content-between align-items-center p-2" style={{
                    borderBottom: index < recentSales.length - 1 ? '1px solid var(--border-light)' : 'none',
                    transition: 'background var(--transition-fast)',
                    borderRadius: index === 0 ? 'var(--border-radius-sm) var(--border-radius-sm) 0 0' : index === recentSales.length - 1 ? '0 0 var(--border-radius-sm) var(--border-radius-sm)' : '0',
                  }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.8rem' }}>{sale.invoiceNo || 'N/A'}</div>
                      <small style={{ color: 'var(--text-muted)' }}>
                        {sale.customer?.name || 'Walk-in Customer'}
                      </small>
                    </div>
                    <div className="text-end">
                      <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>৳{Number(sale.totalAmount || 0).toLocaleString()}</div>
                      <span className={`badge ${sale.paymentStatus === 'paid' ? 'badge-success' : sale.paymentStatus === 'partial' ? 'badge-warning' : 'badge-danger'}`}>
                        {sale.paymentStatus || 'unknown'}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-5" style={{ color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem', opacity: 0.5 }}>📄</div>
                  {t('common.noData')}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
