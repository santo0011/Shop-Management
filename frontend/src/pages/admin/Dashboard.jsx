import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import api from '../../services/api';
import Chart from 'react-apexcharts';
import StatCard from '../../components/common/StatCard';
import {
  BiPackage, BiCart, BiGroup, BiCar, BiDollar, BiError, BiRefresh, BiTrendingUp, BiStar,
  BiUser, BiCreditCard, BiWallet, BiPhone, BiTime, BiHash, BiCheck, BiX, BiFilter,
  BiReceipt, BiRightArrowAlt
} from 'react-icons/bi';

// ─── Payment Method Icons ────────────────────────────────────
const PAYMENT_METHOD_ICONS = {
  cash: '💵',
  card: '💳',
  upi: '📱',
  mobile_banking: '🏦',
};

const PAYMENT_METHOD_LABELS = {
  cash: 'Cash',
  card: 'Card',
  upi: 'UPI',
  mobile_banking: 'Mobile Banking',
};

// ─── Status Styles ───────────────────────────────────────────
const STATUS_STYLES = {
  paid: { bg: 'rgba(46, 204, 113, 0.12)', color: '#2ecc71', label: 'Paid', icon: '✅' },
  partial: { bg: 'rgba(255, 181, 69, 0.12)', color: '#F39C12', label: 'Partial', icon: '🟠' },
  unpaid: { bg: 'rgba(255, 107, 107, 0.12)', color: '#FF6B6B', label: 'Due', icon: '🔴' },
};

// ─── Format helpers ─────────────────────────────────────────
const formatDate = (dateStr) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
};

const formatTime = (dateStr) => {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
};

const isToday = (dateStr) => {
  const d = new Date(dateStr);
  const today = new Date();
  return d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear();
};

const Dashboard = () => {
  const { t } = useTranslation();
  const { user } = useSelector((state) => state.auth);
  const [stats, setStats] = useState(null);
  const [salesChart, setSalesChart] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [recentPayments, setRecentPayments] = useState([]);
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, chartRes, topRes, recentRes] = await Promise.all([
        api.get('/dashboard/stats'),
        api.get('/dashboard/sales-chart?period=daily'),
        api.get('/dashboard/top-products'),
        api.get('/dashboard/recent-transactions'),
      ]);
      setStats(statsRes.data || {});
      setSalesChart(Array.isArray(chartRes.data) ? chartRes.data : []);
      setTopProducts(Array.isArray(topRes.data) ? topRes.data : []);
      setRecentPayments(Array.isArray(recentRes.data) ? recentRes.data : []);
    } catch (err) {
      console.error('Failed to fetch dashboard data', err);
      setError(err.response?.data?.message || err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const getTheme = () => {
    try {
      return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    } catch { return 'light'; }
  };

  const theme = useMemo(() => getTheme(), [stats]);

  const chartColors = {
    primary: '#6C63FF',
    secondary: '#00D9A6',
    warning: '#FFB545',
    danger: '#FF6B6B',
    textSecondary: theme === 'dark' ? '#9a9ab8' : '#5a5a7a',
    gridColor: theme === 'dark' ? '#2a2a4e' : '#e8e8f0',
  };

  // Sales Overview Chart
  const salesChartOptions = useMemo(() => ({
    chart: { type: 'area', height: 300, toolbar: { show: false }, foreColor: chartColors.textSecondary },
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth', width: 2, colors: [chartColors.primary] },
    fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.5, opacityTo: 0.1, stops: [0, 100] } },
    xaxis: {
      categories: Array.isArray(salesChart) ? salesChart.map(s => s._id || '') : [],
      labels: { rotate: -45, style: { fontSize: '11px' } },
    },
    yaxis: {
      labels: { formatter: (val) => `₹${Number(val).toLocaleString('en-IN')}`, style: { fontSize: '11px' } },
    },
    tooltip: { y: { formatter: (val) => `₹${Number(val).toLocaleString('en-IN')}` } },
    grid: { borderColor: chartColors.gridColor },
    theme: { mode: theme },
    colors: [chartColors.primary],
  }), [salesChart, theme]);

  const salesChartSeries = useMemo(() => [{
    name: 'Revenue',
    data: Array.isArray(salesChart) ? salesChart.map(s => s.total || 0) : [],
  }], [salesChart]);

  // Top Selling Products Chart
  const topProductsOptions = useMemo(() => ({
    chart: { type: 'bar', height: 300, toolbar: { show: false }, foreColor: chartColors.textSecondary },
    plotOptions: { bar: { borderRadius: 6, horizontal: true, barHeight: '40%' } },
    dataLabels: { enabled: true, formatter: (val) => `${val}`, style: { fontSize: '11px', fontWeight: 600, colors: [theme === 'dark' ? '#fff' : '#1a1a2e'] } },
    xaxis: {
      categories: Array.isArray(topProducts) ? topProducts.map(p => p.name || 'Unknown') : [],
      labels: { style: { fontSize: '11px' } },
    },
    yaxis: {
      labels: { style: { fontSize: '11px' } },
    },
    tooltip: { y: { formatter: (val) => `${val} sold` } },
    grid: { borderColor: chartColors.gridColor },
    theme: { mode: theme },
    colors: [chartColors.secondary],
  }), [topProducts, theme]);

  const topProductsSeries = useMemo(() => [{
    name: 'Quantity Sold',
    data: Array.isArray(topProducts) ? topProducts.map(p => p.totalQuantity || 0) : [],
  }], [topProducts]);

  // Filter recent payments
  const filteredPayments = useMemo(() => {
    if (paymentFilter === 'all') return recentPayments;
    return recentPayments.filter(p => p.paymentStatus === paymentFilter);
  }, [recentPayments, paymentFilter]);

  const FILTER_OPTIONS = [
    { key: 'all', label: 'All' },
    { key: 'paid', label: 'Paid' },
    { key: 'partial', label: 'Partial' },
    { key: 'unpaid', label: 'Due' },
  ];

  if (loading) return null;

  if (error) {
    return (
      <div className="d-flex flex-column justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
        <div className="premium-card p-5 text-center" style={{ maxWidth: '500px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem', color: 'var(--danger)' }}><BiError /></div>
          <h5 className="mb-2" style={{ fontWeight: 700 }}>Failed to Load Dashboard</h5>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>{error}</p>
          <button className="btn-premium btn-premium-primary" onClick={fetchDashboardData}><BiRefresh /> Retry</button>
        </div>
      </div>
    );
  }

  const statCards = [
    { icon: BiPackage, label: 'Total Products', value: stats?.totalProducts || 0, color: 'primary' },
    { icon: BiCart, label: 'Total Sales', value: stats?.monthlySalesCount || 0, color: 'success' },
    { icon: BiGroup, label: 'Total Customers', value: stats?.totalCustomers || 0, color: 'info' },
    { icon: BiCar, label: 'Total Suppliers', value: stats?.totalSuppliers || 0, color: 'warning' },
    { icon: BiDollar, label: "Today's Revenue", value: stats?.todaySales || 0, color: 'primary', prefix: '₹' },
    { icon: BiError, label: 'Low Stock Products', value: stats?.lowStockProducts || 0, color: 'danger' },
  ];

  const formatValue = (card) => {
    if (card.prefix) {
      return `${card.prefix}${Number(card.value).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    }
    return Number(card.value).toLocaleString('en-IN');
  };

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
        <button className="btn-premium btn-premium-secondary btn-premium-sm" onClick={fetchDashboardData}>
          <BiRefresh /> Refresh
        </button>
      </div>

      {/* Stat Cards - 3 per row desktop, 2 per row mobile */}
      <div className="row g-3 mb-4">
        {statCards.map((card, index) => (
          <div key={index} className="col-6 col-md-4">
            <StatCard icon={card.icon} label={card.label} value={formatValue(card)} color={card.color} />
          </div>
        ))}
      </div>

      {/* Charts - 2 in a row */}
      <div className="row g-3 mb-4">
        <div className="col-lg-6">
          <div className="premium-card">
            <div className="premium-card-header">
              <h6 className="mb-0" style={{ fontWeight: 600 }}>
                <BiTrendingUp size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                Sales Overview
              </h6>
              <span className="badge badge-primary">Last 30 Days</span>
            </div>
            <div className="premium-card-body" style={{ padding: '1rem' }}>
              {salesChart.length > 0 ? (
                <Chart options={salesChartOptions} series={salesChartSeries} type="area" height={300} />
              ) : (
                <div className="text-center py-5" style={{ color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem', opacity: 0.5 }}>📊</div>
                  {t('common.noData')}
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="col-lg-6">
          <div className="premium-card">
            <div className="premium-card-header">
              <h6 className="mb-0" style={{ fontWeight: 600 }}>
                <BiStar size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                Top Selling Products
              </h6>
              <span className="badge badge-success">This Month</span>
            </div>
            <div className="premium-card-body" style={{ padding: '1rem' }}>
              {topProducts.length > 0 ? (
                <Chart options={topProductsOptions} series={topProductsSeries} type="bar" height={300} />
              ) : (
                <div className="text-center py-5" style={{ color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem', opacity: 0.5 }}>📦</div>
                  {t('common.noData')}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Payments Section */}
      <div className="premium-card">
        <div className="premium-card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: 'var(--border-radius-md)',
                background: 'rgba(108,99,255,0.1)',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1rem',
              }}
            >
              <BiReceipt />
            </div>
            <h6 className="mb-0" style={{ fontWeight: 600 }}>Recent Payments</h6>
          </div>
          <button
            className="btn-premium btn-premium-secondary btn-premium-sm"
            onClick={() => window.location.href = '/sales'}
            style={{ fontSize: '0.75rem', padding: '0.3rem 0.8rem' }}
          >
            View All <BiRightArrowAlt size={14} style={{ marginLeft: 4 }} />
          </button>
        </div>

        {/* Quick Filter */}
        <div style={{ padding: '0.75rem 1.25rem', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {FILTER_OPTIONS.map(opt => (
            <button
              key={opt.key}
              onClick={() => setPaymentFilter(opt.key)}
              style={{
                padding: '4px 14px',
                borderRadius: '20px',
                border: '1.5px solid',
                borderColor: paymentFilter === opt.key ? 'var(--primary)' : 'var(--border-color)',
                background: paymentFilter === opt.key ? 'rgba(108,99,255,0.1)' : 'transparent',
                color: paymentFilter === opt.key ? 'var(--primary)' : 'var(--text-secondary)',
                fontSize: '0.72rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                fontFamily: 'var(--font-family)',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div style={{ padding: '0.75rem 1.25rem' }}>
          {filteredPayments.length === 0 ? (
            <div className="text-center py-4" style={{ color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem', opacity: 0.5 }}>📄</div>
              <p style={{ fontSize: '0.85rem', margin: 0 }}>No payments found</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {filteredPayments.map((payment, idx) => {
                const st = STATUS_STYLES[payment.paymentStatus] || STATUS_STYLES.paid;
                const pmtIcon = PAYMENT_METHOD_ICONS[payment.paymentMethod] || '💵';
                const pmtLabel = PAYMENT_METHOD_LABELS[payment.paymentMethod] || payment.paymentMethod?.toUpperCase() || 'CASH';
                const isNew = isToday(payment.createdAt);
                const customerName = payment.customer?.name || 'Walk-in Customer';
                const initial = customerName.charAt(0).toUpperCase();

                return (
                  <div
                    key={payment._id}
                    onClick={() => window.location.href = `/sales?view=${payment._id}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '0.7rem 0.85rem',
                      borderRadius: 'var(--border-radius-md)',
                      background: idx % 2 === 0 ? 'var(--bg-card)' : 'var(--bg-input)',
                      border: '1px solid var(--border-light)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--primary)';
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(108,99,255,0.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border-light)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    {/* Avatar */}
                    <div
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '50%',
                        background: 'var(--gradient-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      {payment.customer?.name ? initial : <BiUser size={18} />}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {customerName}
                        </span>
                        {isNew && (
                          <span
                            style={{
                              fontSize: '0.6rem',
                              fontWeight: 700,
                              padding: '1px 8px',
                              borderRadius: '10px',
                              background: 'rgba(0, 217, 166, 0.15)',
                              color: '#00D9A6',
                              textTransform: 'uppercase',
                              letterSpacing: '0.3px',
                            }}
                          >
                            New
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginTop: '2px' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                          <BiHash size={10} style={{ verticalAlign: 'middle' }} /> {payment.invoiceNo || 'N/A'}
                        </span>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>•</span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          <BiTime size={10} style={{ verticalAlign: 'middle' }} /> {formatDate(payment.createdAt)} • {formatTime(payment.createdAt)}
                        </span>
                      </div>
                    </div>

                    {/* Amount & Method & Status */}
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                        ₹{Number(payment.totalAmount || 0).toLocaleString('en-IN')}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end', marginTop: '2px' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                          {pmtIcon} {pmtLabel}
                        </span>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                            padding: '2px 8px',
                            borderRadius: '10px',
                            background: st.bg,
                            color: st.color,
                            fontSize: '0.65rem',
                            fontWeight: 700,
                          }}
                        >
                          {st.icon} {st.label}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;