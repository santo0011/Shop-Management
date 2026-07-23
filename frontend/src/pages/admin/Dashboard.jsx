import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import api from '../../services/api';
import StatCard from '../../components/common/StatCard';
import {
  BiPackage, BiCart, BiGroup, BiCar, BiDollar, BiError, BiRefresh, BiTrendingUp, BiStar,
  BiUser, BiCreditCard, BiWallet, BiPhone, BiTime, BiHash, BiCheck, BiX, BiFilter,
  BiReceipt, BiRightArrowAlt, BiBarChartAlt, BiPieChart, BiLineChart, BiArea
} from 'react-icons/bi';

// Recharts
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, Legend, LabelList
} from 'recharts';

// ─── Payment Method Icons ────────────────────────────────────
const PAYMENT_METHOD_ICONS = {
  cash: '💵',
  card: '💳',
  upi: '📱',
  mobile_banking: '🏦',
};

const getPaymentMethodLabels = (t) => ({
  cash: t('sale.cash'),
  card: t('sale.card'),
  upi: t('sale.upi'),
  mobile_banking: t('sale.mobileBanking'),
  due: t('common.other'),
});

// ─── Status Styles ───────────────────────────────────────────
const getStatusStyles = (t) => ({
  paid: { bg: 'rgba(46, 204, 113, 0.12)', color: '#2ecc71', label: t('common.paid'), icon: '✅' },
  partial: { bg: 'rgba(255, 181, 69, 0.12)', color: '#F39C12', label: t('common.partial'), icon: '🟠' },
  unpaid: { bg: 'rgba(255, 107, 107, 0.12)', color: '#FF6B6B', label: t('common.due'), icon: '🔴' },
});

// ─── Chart Colors ────────────────────────────────────────────
const CHART_COLORS = {
  primary: '#6C63FF',
  secondary: '#00D9A6',
  warning: '#FFB545',
  danger: '#FF6B6B',
  info: '#17A2B8',
  accent: '#FF6B9D',
};

const PIE_COLORS = ['#6C63FF', '#00D9A6', '#FFB545', '#FF6B6B', '#17A2B8'];

const CATEGORY_COLORS = ['#6C63FF', '#00D9A6', '#FFB545', '#FF6B6B', '#17A2B8', '#FF6B9D'];

// ─── Top Products Chart Palette (one color per product bar) ──
const TOP_PRODUCTS_COLORS = ['#2a78d6', '#1baf7a', '#eb6834', '#7c5cd6', '#e34948'];

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

const formatCurrency = (val) => `₹${Number(val).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

// ─── Custom Tooltips ─────────────────────────────────────────
const CustomLineTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="dashboard-tooltip">
      <div className="dashboard-tooltip-date">{label}</div>
      {payload.map((entry, idx) => (
        <div key={idx} className="dashboard-tooltip-row" style={{ color: entry.color }}>
          <span className="dashboard-tooltip-dot" style={{ background: entry.color }} />
          <span>{entry.name}: </span>
          <strong>{formatCurrency(entry.value)}</strong>
        </div>
      ))}
    </div>
  );
};

const CustomAreaTooltip = ({ active, payload, label, t }) => {
  if (!active || !payload || !payload.length) return null;
  const profitItem = payload.find(p => p.dataKey === 'Profit');
  const expenseItem = payload.find(p => p.dataKey === 'Expenses');
  const profit = profitItem?.value || 0;
  const expenses = expenseItem?.value || 0;
  const netProfit = profit - expenses;
  return (
    <div className="dashboard-tooltip">
      <div className="dashboard-tooltip-date">{label}</div>
      {payload.map((entry, idx) => (
        <div key={idx} className="dashboard-tooltip-row" style={{ color: entry.color }}>
          <span className="dashboard-tooltip-dot" style={{ background: entry.color }} />
          <span>{entry.name}: </span>
          <strong>{formatCurrency(entry.value)}</strong>
        </div>
      ))}
      <div className="dashboard-tooltip-divider" />
      <div className="dashboard-tooltip-row" style={{ color: netProfit >= 0 ? '#00D9A6' : '#FF6B6B' }}>
        <span>{t('dashboard.netProfit')}: </span>
        <strong>{formatCurrency(netProfit)}</strong>
      </div>
    </div>
  );
};

const TopProductsYAxisTick = ({ x, y, payload, index, textColor }) => {
  const color = TOP_PRODUCTS_COLORS[index % TOP_PRODUCTS_COLORS.length];
  return (
    <g transform={`translate(${x},${y})`}>
      <circle cx={-108} cy={0} r={4} fill={color} />
      <text x={-98} y={0} dy={4} textAnchor="start" fontSize={11} fontWeight={600} fill={textColor}>
        {payload.value}
      </text>
    </g>
  );
};

const CustomBarTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="dashboard-tooltip">
      <div className="dashboard-tooltip-date" style={{ marginBottom: 4 }}>{label}</div>
      {payload.map((entry, idx) => (
        <div key={idx} className="dashboard-tooltip-row" style={{ color: entry.color }}>
          <span className="dashboard-tooltip-dot" style={{ background: entry.color }} />
          <span>{entry.name}: </span>
          <strong>{entry.dataKey === 'Revenue' ? formatCurrency(entry.value) : entry.value}</strong>
        </div>
      ))}
    </div>
  );
};

const CustomTopProductsTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="dashboard-tooltip">
      <div className="dashboard-tooltip-date" style={{ marginBottom: 4 }}>{label}</div>
      {payload.map((entry, idx) => {
        const color = TOP_PRODUCTS_COLORS[(entry.payload?._index ?? 0) % TOP_PRODUCTS_COLORS.length];
        return (
          <div key={idx} className="dashboard-tooltip-row" style={{ color }}>
            <span className="dashboard-tooltip-dot" style={{ background: color }} />
            <span>{entry.name}: </span>
            <strong>{Number(entry.value).toLocaleString('en-IN')}</strong>
          </div>
        );
      })}
    </div>
  );
};

const CustomPieTooltip = ({ active, payload, t, paymentMethodLabels }) => {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0].payload;
  return (
    <div className="dashboard-tooltip">
      <div className="dashboard-tooltip-row" style={{ color: payload[0].color }}>
        <span className="dashboard-tooltip-dot" style={{ background: payload[0].color }} />
        <span>{paymentMethodLabels[data.method] || data.name}: </span>
        <strong>{formatCurrency(data.value)}</strong>
      </div>
      <div className="dashboard-tooltip-row">
        <span>{t('dashboard.transactions')}: </span>
        <strong>{data.count || 0}</strong>
      </div>
    </div>
  );
};

// ─── Skeleton Loading ────────────────────────────────────────
const DashboardSkeletonLoader = () => (
  <div className="dashboard-modern">
    <style>{`@keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }`}</style>
    {/* Page Header */}
    <div className="d-flex align-items-center justify-content-between mb-4">
      <div style={{ flex: 1 }}>
        <div style={{
          height: 28, width: '35%', marginBottom: 8,
          background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
          backgroundSize: '200% 100%', borderRadius: 8,
          animation: 'shimmer 1.5s infinite',
        }} />
        <div style={{
          height: 14, width: '25%',
          background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
          backgroundSize: '200% 100%', borderRadius: 6,
          animation: 'shimmer 1.5s infinite',
        }} />
      </div>
      <div style={{
        height: 36, width: 100,
        background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
        backgroundSize: '200% 100%', borderRadius: 8,
        animation: 'shimmer 1.5s infinite',
      }} />
    </div>

    {/* Stat Cards */}
    <div className="row g-3 mb-4">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="col-6 col-md-4">
          <div className="premium-card" style={{ padding: '1rem', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
                backgroundSize: '200% 100%',
                animation: 'shimmer 1.5s infinite',
              }} />
              <div style={{ flex: 1 }}>
                <div style={{
                  height: 10, width: '60%', marginBottom: 6,
                  background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
                  backgroundSize: '200% 100%', borderRadius: 4,
                  animation: 'shimmer 1.5s infinite',
                }} />
                <div style={{
                  height: 20, width: '80%',
                  background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
                  backgroundSize: '200% 100%', borderRadius: 6,
                  animation: 'shimmer 1.5s infinite',
                }} />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>

    {/* Chart Row */}
    <div className="row g-3 mb-4">
      <div className="col-lg-8">
        <div className="premium-card" style={{ border: '1px solid var(--border-color)' }}>
          <div className="premium-card-header" style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-color)' }}>
            <div style={{
              height: 16, width: '30%',
              background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
              backgroundSize: '200% 100%', borderRadius: 4,
              animation: 'shimmer 1.5s infinite',
            }} />
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} style={{
                  height: 26, width: 50,
                  background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
                  backgroundSize: '200% 100%', borderRadius: 6,
                  animation: 'shimmer 1.5s infinite',
                }} />
              ))}
            </div>
          </div>
          <div className="premium-card-body" style={{ padding: '1rem', height: 320, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{
              width: '95%', height: '85%',
              background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
              backgroundSize: '200% 100%', borderRadius: 12,
              animation: 'shimmer 1.5s infinite',
            }} />
          </div>
        </div>
      </div>
      <div className="col-lg-4">
        <div className="premium-card" style={{ border: '1px solid var(--border-color)', height: '100%' }}>
          <div className="premium-card-header" style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-color)' }}>
            <div style={{
              height: 16, width: '50%',
              background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
              backgroundSize: '200% 100%', borderRadius: 4,
              animation: 'shimmer 1.5s infinite',
            }} />
          </div>
          <div className="premium-card-body" style={{ padding: '1rem', height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{
              width: '85%', height: '85%', borderRadius: '50%',
              background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
              backgroundSize: '200% 100%',
              animation: 'shimmer 1.5s infinite',
            }} />
          </div>
        </div>
      </div>
    </div>

    {/* Bottom charts row */}
    <div className="row g-3 mb-4">
      <div className="col-lg-6">
        <div className="premium-card" style={{ border: '1px solid var(--border-color)' }}>
          <div className="premium-card-header" style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-color)' }}>
            <div style={{
              height: 16, width: '35%',
              background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
              backgroundSize: '200% 100%', borderRadius: 4,
              animation: 'shimmer 1.5s infinite',
            }} />
          </div>
          <div className="premium-card-body" style={{ padding: '1rem', height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{
              width: '90%', height: '80%',
              background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
              backgroundSize: '200% 100%', borderRadius: 12,
              animation: 'shimmer 1.5s infinite',
            }} />
          </div>
        </div>
      </div>
      <div className="col-lg-6">
        <div className="premium-card" style={{ border: '1px solid var(--border-color)' }}>
          <div className="premium-card-header" style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-color)' }}>
            <div style={{
              height: 16, width: '35%',
              background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
              backgroundSize: '200% 100%', borderRadius: 4,
              animation: 'shimmer 1.5s infinite',
            }} />
          </div>
          <div className="premium-card-body" style={{ padding: '1rem', height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{
              width: '90%', height: '80%',
              background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
              backgroundSize: '200% 100%', borderRadius: 12,
              animation: 'shimmer 1.5s infinite',
            }} />
          </div>
        </div>
      </div>
    </div>

    {/* Recent Payments table */}
    <div className="premium-card" style={{ border: '1px solid var(--border-color)' }}>
      <div className="premium-card-header" style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-color)' }}>
        <div style={{
          height: 16, width: '25%',
          background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
          backgroundSize: '200% 100%', borderRadius: 4,
          animation: 'shimmer 1.5s infinite',
        }} />
      </div>
      <div style={{ padding: '0.75rem 1.25rem' }}>
        {[1, 2, 3, 4].map((r) => (
          <div key={r} style={{
            display: 'flex', gap: '1rem', padding: '0.75rem 0',
            borderTop: '1px solid var(--border-color)',
          }}>
            {[1, 2, 3].map((c) => (
              <div key={c} style={{
                flex: 1, height: 10,
                background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
                backgroundSize: '200% 100%', borderRadius: 4,
                animation: 'shimmer 1.5s infinite',
              }} />
            ))}
          </div>
        ))}
      </div>
    </div>
  </div>
);

const Dashboard = () => {
  const { t } = useTranslation();
  const PAYMENT_METHOD_LABELS = getPaymentMethodLabels(t);
  const STATUS_STYLES = getStatusStyles(t);
  const { user } = useSelector((state) => state.auth);
  const [stats, setStats] = useState(null);
  const [salesChart, setSalesChart] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [profitExpense, setProfitExpense] = useState([]);
  const [paymentDistribution, setPaymentDistribution] = useState([]);
  const [salesByCategory, setSalesByCategory] = useState([]);
  const [recentPayments, setRecentPayments] = useState([]);
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [salesPeriod, setSalesPeriod] = useState(7);
  const [theme, setTheme] = useState('light');
  const [subStatus, setSubStatus] = useState(null);
  const initialLoadDone = useRef(false);

  // Fetch subscription status for expiry warning
  useEffect(() => {
    const fetchSubStatus = async () => {
      try {
        const { data } = await api.get('/subscription/status', { _skipLoading: true });
        setSubStatus(data);
      } catch (err) {
        // Silently fail
      }
    };
    fetchSubStatus();
    const interval = setInterval(fetchSubStatus, 60000);
    return () => clearInterval(interval);
  }, []);

  // Simple theme detection — read once on mount, no MutationObserver
  useEffect(() => {
    setTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light');
  }, []);

  const fetchDashboardData = useCallback(async (isInitial) => {
    if (isInitial) setLoading(true);
    setError(null);
    try {
      const [statsRes, chartRes, topRes, profitRes, paymentRes, categoryRes, recentRes] = await Promise.all([
        api.get('/dashboard/stats', { _skipLoading: true }),
        api.get(`/dashboard/sales-chart?days=${salesPeriod}`, { _skipLoading: true }),
        api.get('/dashboard/top-products', { _skipLoading: true }),
        api.get('/dashboard/profit-expense', { _skipLoading: true }),
        api.get('/dashboard/payment-distribution', { _skipLoading: true }),
        api.get('/dashboard/sales-by-category', { _skipLoading: true }),
        api.get('/dashboard/recent-transactions', { _skipLoading: true }),
      ]);
      setStats(statsRes.data || {});
      setSalesChart(Array.isArray(chartRes.data) ? chartRes.data : []);
      setTopProducts(Array.isArray(topRes.data) ? topRes.data : []);
      setProfitExpense(Array.isArray(profitRes.data) ? profitRes.data : []);
      setPaymentDistribution(Array.isArray(paymentRes.data) ? paymentRes.data : []);
      setSalesByCategory(Array.isArray(categoryRes.data) ? categoryRes.data : []);
      setRecentPayments(Array.isArray(recentRes.data) ? recentRes.data : []);
    } catch (err) {
      console.error('Failed to fetch dashboard data', err);
      setError(err.response?.data?.message || err.message || t('dashboard.failedToLoadData'));
    } finally {
      setLoading(false);
    }
  }, [salesPeriod, t]);

  // Initial load
  useEffect(() => {
    if (!initialLoadDone.current) {
      initialLoadDone.current = true;
      fetchDashboardData(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-fetch when sales period changes (after initial load)
  useEffect(() => {
    if (!initialLoadDone.current) return;
    fetchDashboardData(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [salesPeriod]);

  const isDark = theme === 'dark';
  const textColor = isDark ? '#9a9ab8' : '#5a5a7a';
  const gridColor = isDark ? '#2a2a4e' : '#e8e8f0';
  const tooltipBg = isDark ? '#1a1a3e' : '#ffffff';
  const tooltipBorder = isDark ? '#2a2a4e' : '#e8e8f0';

  // Sales Period options
  const PERIOD_OPTIONS = [
    { key: 1, label: t('common.today') },
    { key: 7, label: t('common.last7Days') },
    { key: 30, label: t('common.last30Days') },
    { key: 0, label: t('common.thisMonth') },
  ];

  const handlePeriodChange = (days) => {
    if (days === 0) {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const diffDays = Math.floor((now - startOfMonth) / (1000 * 60 * 60 * 24)) + 1;
      setSalesPeriod(diffDays);
    } else {
      setSalesPeriod(days);
    }
  };

  // Filter recent payments
  const filteredPayments = useMemo(() => {
    if (paymentFilter === 'all') return recentPayments;
    return recentPayments.filter(p => p.paymentStatus === paymentFilter);
  }, [recentPayments, paymentFilter]);

  const FILTER_OPTIONS = [
    { key: 'all', label: t('common.all') },
    { key: 'paid', label: t('common.paid') },
    { key: 'partial', label: t('common.partial') },
    { key: 'unpaid', label: t('common.due') },
  ];

  // ─── Sales Chart Data ──────────────────────────────────────
  const salesChartData = useMemo(() => {
    return salesChart.map(d => ({
      date: d.date ? new Date(d.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '',
      Sales: d.sales || 0,
      Orders: d.orders || 0,
      Profit: d.profit || 0,
    }));
  }, [salesChart]);

  // ─── Top Products Data ─────────────────────────────────────
  const topProductsData = useMemo(() => {
    return topProducts.slice(0, 5).map((p, index) => ({
      name: p.name?.length > 20 ? p.name.substring(0, 20) + '...' : p.name || t('common.unknown'),
      'Quantity Sold': p.totalQuantity || 0,
      Revenue: p.totalRevenue || 0,
      _index: index,
    }));
  }, [topProducts, t]);

  // ─── Payment Distribution Data ─────────────────────────────
  const paymentData = useMemo(() => {
    return paymentDistribution.map(d => ({
      ...d,
      percentage: ((d.value / (paymentDistribution.reduce((sum, p) => sum + p.value, 0) || 1)) * 100).toFixed(1),
    }));
  }, [paymentDistribution]);

  // ─── Category Data ─────────────────────────────────────────
  const categoryData = useMemo(() => {
    return salesByCategory.map(c => ({
      name: c.name || t('common.unknown'),
      Revenue: c.revenue || 0,
    }));
  }, [salesByCategory, t]);

  if (loading) return <DashboardSkeletonLoader />;

  if (error) {
    return (
      <div className="d-flex flex-column justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
        <div className="premium-card p-5 text-center" style={{ maxWidth: '500px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem', color: 'var(--danger)' }}><BiError /></div>
          <h5 className="mb-2" style={{ fontWeight: 700 }}>{t('dashboard.failedToLoad')}</h5>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>{error}</p>
          <button className="btn-premium btn-premium-primary" onClick={() => { setSalesPeriod(7); }}><BiRefresh /> {t('common.retry')}</button>
        </div>
      </div>
    );
  }

  const statCards = [
    { icon: BiPackage, label: t('dashboard.totalProducts'), value: stats?.totalProducts || 0, color: 'primary' },
    { icon: BiCart, label: t('dashboard.totalSales'), value: stats?.monthlySalesCount || 0, color: 'success' },
    { icon: BiCreditCard, label: t('dashboard.totalDueAmount'), subtitle: t('dashboard.outstandingReceivables'), value: stats?.customerDue || 0, color: 'warning', prefix: '₹' },
    { icon: BiCar, label: t('dashboard.totalSuppliers'), value: stats?.totalSuppliers || 0, color: 'warning' },
    { icon: BiDollar, label: t('dashboard.todaysRevenue'), value: stats?.todaySales || 0, color: 'primary', prefix: '₹' },
    { icon: BiError, label: t('dashboard.lowStockProducts'), value: stats?.lowStockProducts || 0, color: 'danger' },
  ];

  const formatValue = (card) => {
    if (card.prefix) {
      return `${card.prefix}${Number(card.value).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    }
    return Number(card.value).toLocaleString('en-IN');
  };

  return (
    <div className="dashboard-modern">
      {/* Page Header */}
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h4 className="mb-1" style={{ fontWeight: 800 }}>{t('nav.dashboard')}</h4>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
            {t('dashboard.welcomeMessage', { name: user?.name || t('common.user') })}
          </p>
        </div>
        <div className="d-flex gap-2">
          {/* {loading && <div className="spinner-border spinner-border-sm" style={{ color: 'var(--primary)', alignSelf: 'center' }} />} */}
          <button className="btn-premium btn-premium-secondary btn-premium-sm" onClick={() => setSalesPeriod(7)} disabled={loading}>
            {loading ? <span className="spinner-border spinner-border-sm" /> : <BiRefresh />} {t('common.refresh')}
          </button>
        </div>
      </div>

      {/* Subscription Expiry Warning */}
      {subStatus && !subStatus.isExpired && subStatus.daysRemaining > 0 && subStatus.daysRemaining <= 3 && (
        <div style={{
          background: 'linear-gradient(135deg, #fff8e1, #ffecb3)',
          border: '1px solid #ffc107', borderRadius: 14,
          padding: '1rem 1.5rem', marginBottom: '1.5rem',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: '0.75rem',
        }}>
          <span style={{ color: '#e65100', fontWeight: 600 }}>
            ⚠ Your subscription will expire in {subStatus.daysRemaining} day{subStatus.daysRemaining > 1 ? 's' : ''}. Please contact your Super Admin.
          </span>
          <a
            href="/subscription"
            style={{
              padding: '0.5rem 1.25rem', borderRadius: 8, border: 'none',
              background: '#ff8f00', color: 'white', fontWeight: 700,
              cursor: 'pointer', fontSize: '0.85rem', textDecoration: 'none',
              display: 'inline-block',
            }}
          >
            Renew Now
          </a>
        </div>
      )}

      {/* Stat Cards - 3 per row desktop, 2 per row mobile */}
      <div className="row g-3 mb-4">
        {statCards.map((card, index) => (
          <div key={index} className="col-6 col-md-4">
            <StatCard icon={card.icon} label={card.label} value={formatValue(card)} color={card.color} rawValue={card.value} isCurrency={!!card.prefix} />
          </div>
        ))}
      </div>

      {/* Row 1: Sales Overview + Profit vs Expense */}
      <div className="row g-3 mb-4">
        {/* Sales Overview - Modern Line Chart */}
        <div className="col-lg-8">
          <div className="premium-card dashboard-chart-card">
            <div className="premium-card-header">
              <h6 className="mb-0" style={{ fontWeight: 600 }}>
                <BiLineChart size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                {t('dashboard.salesOverview')}
              </h6>
              <div className="dashboard-period-filter">
                {PERIOD_OPTIONS.map(opt => (
                  <button
                    key={opt.key}
                    className={`dashboard-period-btn ${salesPeriod === opt.key || (opt.key === 0 && salesPeriod > 30) ? 'active' : ''}`}
                    onClick={() => handlePeriodChange(opt.key)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="premium-card-body">
              {loading ? (
                <div className="text-center py-5" style={{ color: 'var(--text-muted)' }}>
                  <div className="spinner-border spinner-border-sm me-2" /> {t('common.loading')}
                </div>
              ) : salesChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart data={salesChartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: textColor, fontSize: 11 }}
                      tickLine={false}
                      axisLine={{ stroke: gridColor }}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tick={{ fill: textColor, fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`}
                    />
                    <Tooltip content={<CustomLineTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="Sales"
                      name={t('nav.sales')}
                      stroke={CHART_COLORS.primary}
                      strokeWidth={3}
                      dot={false}
                      activeDot={{ r: 6, fill: CHART_COLORS.primary, stroke: '#fff', strokeWidth: 2 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="Orders"
                      name={t('dashboard.ordersLabel')}
                      stroke={CHART_COLORS.secondary}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 5, fill: CHART_COLORS.secondary, stroke: '#fff', strokeWidth: 2 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="Profit"
                      name={t('product.profit')}
                      stroke={CHART_COLORS.warning}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 5, fill: CHART_COLORS.warning, stroke: '#fff', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-5" style={{ color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem', opacity: 0.5 }}>📊</div>
                  {t('common.noData')}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Profit vs Expense - Area Chart */}
        <div className="col-lg-4">
          <div className="premium-card dashboard-chart-card">
            <div className="premium-card-header">
              <h6 className="mb-0" style={{ fontWeight: 600 }}>
                <BiArea size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                {t('dashboard.profitVsExpense')}
              </h6>
            </div>
            <div className="premium-card-body">
              {loading ? (
                <div className="text-center py-5" style={{ color: 'var(--text-muted)' }}>
                  <div className="spinner-border spinner-border-sm me-2" /> {t('common.loading')}
                </div>
              ) : profitExpense.length > 0 ? (
                <ResponsiveContainer width="100%" height={320}>
                  <AreaChart data={profitExpense} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                    <defs>
                      <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={CHART_COLORS.secondary} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={CHART_COLORS.secondary} stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={CHART_COLORS.danger} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={CHART_COLORS.danger} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                    <XAxis
                      dataKey="month"
                      tick={{ fill: textColor, fontSize: 11 }}
                      tickLine={false}
                      axisLine={{ stroke: gridColor }}
                    />
                    <YAxis
                      tick={{ fill: textColor, fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`}
                    />
                    <Tooltip content={<CustomAreaTooltip t={t} />} />
                    <Area
                      type="monotone"
                      dataKey="Profit"
                      name={t('product.profit')}
                      stroke={CHART_COLORS.secondary}
                      strokeWidth={2}
                      fill="url(#profitGradient)"
                      animationDuration={1000}
                    />
                    <Area
                      type="monotone"
                      dataKey="Expenses"
                      name={t('dashboard.expensesLabel')}
                      stroke={CHART_COLORS.danger}
                      strokeWidth={2}
                      fill="url(#expenseGradient)"
                      animationDuration={1000}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                      iconType="circle"
                      iconSize={8}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-5" style={{ color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem', opacity: 0.5 }}>📈</div>
                  {t('common.noData')}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Top Selling Products + Payment Distribution */}
      <div className="row g-3 mb-4">
        {/* Top Selling Products - Horizontal Bar Chart */}
        <div className="col-lg-6">
          <div className="premium-card dashboard-chart-card">
            <div className="premium-card-header">
              <h6 className="mb-0" style={{ fontWeight: 600 }}>
                <BiStar size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                {t('dashboard.topSellingProducts')}
              </h6>
              <span className="badge badge-success">{t('common.thisMonth')}</span>
            </div>
            <div className="premium-card-body">
              {loading ? (
                <div className="text-center py-5" style={{ color: 'var(--text-muted)' }}>
                  <div className="spinner-border spinner-border-sm me-2" /> {t('common.loading')}
                </div>
              ) : topProductsData.length > 0 ? (
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart
                    data={topProductsData}
                    layout="vertical"
                    margin={{ top: 5, right: 38, left: 10, bottom: 5 }}
                    barSize={20}
                    barCategoryGap="28%"
                  >
                    <defs>
                      {TOP_PRODUCTS_COLORS.map((color, index) => (
                        <linearGradient key={index} id={`topProductBarGradient-${index}`} x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor={color} stopOpacity={0.75} />
                          <stop offset="100%" stopColor={color} stopOpacity={1} />
                        </linearGradient>
                      ))}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
                    <XAxis
                      type="number"
                      tick={{ fill: textColor, fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={<TopProductsYAxisTick textColor={textColor} />}
                      tickLine={false}
                      axisLine={false}
                      width={120}
                    />
                    <Tooltip content={<CustomTopProductsTooltip />} cursor={{ fill: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }} />
                    <Bar
                      dataKey="Quantity Sold"
                      name={t('dashboard.quantitySold')}
                      radius={[0, 8, 8, 0]}
                      animationDuration={900}
                      animationEasing="ease-out"
                    >
                      {topProductsData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={`url(#topProductBarGradient-${index})`} />
                      ))}
                      <LabelList
                        dataKey="Quantity Sold"
                        position="right"
                        formatter={(val) => Number(val).toLocaleString('en-IN')}
                        style={{ fill: textColor, fontSize: 11, fontWeight: 700 }}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-5" style={{ color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem', opacity: 0.5 }}>📦</div>
                  {t('common.noData')}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Payment Method Distribution - Donut Chart */}
        <div className="col-lg-6">
          <div className="premium-card dashboard-chart-card">
            <div className="premium-card-header">
              <h6 className="mb-0" style={{ fontWeight: 600 }}>
                <BiPieChart size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                Payment Method Distribution
              </h6>
            </div>
            <div className="premium-card-body">
              {loading ? (
                <div className="text-center py-5" style={{ color: 'var(--text-muted)' }}>
                  <div className="spinner-border spinner-border-sm me-2" /> {t('common.loading')}
                </div>
              ) : paymentData.length > 0 ? (
                <div className="dashboard-donut-container">
                  <div className="dashboard-donut-chart-wrap">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={paymentData}
                          cx="50%"
                          cy="50%"
                          innerRadius={62}
                          outerRadius={92}
                          paddingAngle={3}
                          dataKey="value"
                          animationDuration={800}
                          animationBegin={0}
                        >
                          {paymentData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomPieTooltip t={t} paymentMethodLabels={PAYMENT_METHOD_LABELS} />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="dashboard-donut-legend">
                    {paymentData.map((entry, index) => (
                      <div key={index} className="dashboard-donut-legend-item">
                        <span
                          className="dashboard-donut-legend-dot"
                          style={{ background: PIE_COLORS[index % PIE_COLORS.length] }}
                        />
                        <span className="dashboard-donut-legend-name">{PAYMENT_METHOD_LABELS[entry.method] || entry.name}</span>
                        <span className="dashboard-donut-legend-value">{formatCurrency(entry.value)}</span>
                        <span className="dashboard-donut-legend-pct">{entry.percentage}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-5" style={{ color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem', opacity: 0.5 }}>🔄</div>
                  {t('common.noData')}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: Sales by Category */}
      <div className="row g-3 mb-4">
        <div className="col-12">
          <div className="premium-card dashboard-chart-card">
            <div className="premium-card-header">
              <h6 className="mb-0" style={{ fontWeight: 600 }}>
                <BiBarChartAlt size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                {t('dashboard.salesByCategory')}
              </h6>
              <span className="badge badge-primary">{t('common.thisMonth')}</span>
            </div>
            <div className="premium-card-body">
              {loading ? (
                <div className="text-center py-5" style={{ color: 'var(--text-muted)' }}>
                  <div className="spinner-border spinner-border-sm me-2" /> {t('common.loading')}
                </div>
              ) : categoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={categoryData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }} barSize={40}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: textColor, fontSize: 11 }}
                      tickLine={false}
                      axisLine={{ stroke: gridColor }}
                    />
                    <YAxis
                      tick={{ fill: textColor, fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`}
                    />
                    <Tooltip content={<CustomBarTooltip />} />
                    <Bar
                      dataKey="Revenue"
                      name={t('dashboard.revenue')}
                      radius={[6, 6, 0, 0]}
                      animationDuration={800}
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-5" style={{ color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem', opacity: 0.5 }}>📊</div>
                  {t('common.noData')}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Payments Section */}
      <div className="premium-card rp-section">
        <div className="premium-card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="rp-header-icon">
              <BiReceipt />
            </div>
            <h6 className="mb-0" style={{ fontWeight: 600 }}>{t('dashboard.recentPayments')}</h6>
          </div>
          <button
            className="btn-premium btn-premium-secondary btn-premium-sm rp-view-all-btn"
            onClick={() => window.location.href = '/sales'}
          >
            {t('common.viewAll')} <BiRightArrowAlt size={14} style={{ marginLeft: 4 }} />
          </button>
        </div>

        {/* Quick Filter */}
        <div className="rp-filter-bar">
          {FILTER_OPTIONS.map(opt => (
            <button
              key={opt.key}
              className={`rp-filter-chip ${paymentFilter === opt.key ? 'rp-filter-chip--active' : ''}`}
              onClick={() => setPaymentFilter(opt.key)}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="rp-body">
          {loading ? (
            <div className="rp-empty">
              <div className="spinner-border spinner-border-sm me-2" /> {t('common.loading')}
            </div>
          ) : filteredPayments.length === 0 ? (
            <div className="rp-empty">
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem', opacity: 0.5 }}>📄</div>
              <p style={{ fontSize: '0.85rem', margin: 0 }}>{t('dashboard.noPaymentsFound')}</p>
            </div>
          ) : (
            <>
              {/* Desktop List */}
              <div className="rp-list">
                {filteredPayments.map((payment) => {
                  const st = STATUS_STYLES[payment.paymentStatus] || STATUS_STYLES.paid;
                  const pmtIcon = PAYMENT_METHOD_ICONS[payment.paymentMethod] || '💵';
                  const pmtLabel = PAYMENT_METHOD_LABELS[payment.paymentMethod] || payment.paymentMethod?.toUpperCase() || t('sale.cash');
                  const isNew = isToday(payment.createdAt);
                  const customerName = payment.customer?.name || t('dashboard.walkInCustomer');
                  const initial = customerName.charAt(0).toUpperCase();

                  return (
                    <div
                      key={payment._id}
                      className="rp-row"
                      onClick={() => window.location.href = `/sales?view=${payment._id}`}
                    >
                      <div className="rp-row__avatar">
                        {payment.customer?.name ? initial : <BiUser size={18} />}
                      </div>
                      <div className="rp-row__info">
                        <div className="rp-row__name-row">
                          <span className="rp-row__name">{customerName}</span>
                          {isNew && <span className="rp-row__new-badge">{t('dashboard.new')}</span>}
                        </div>
                        <div className="rp-row__meta">
                          <span className="rp-row__meta-item">
                            <BiHash size={10} /> {payment.invoiceNo || t('common.notAvailable')}
                          </span>
                          <span className="rp-row__meta-dot">•</span>
                          <span className="rp-row__meta-item">
                            <BiTime size={10} /> {formatDate(payment.createdAt)} • {formatTime(payment.createdAt)}
                          </span>
                        </div>
                      </div>
                      <div className="rp-row__right">
                        <div className="rp-row__amount">
                          ₹{Number(payment.totalAmount || 0).toLocaleString('en-IN')}
                        </div>
                        <div className="rp-row__badge-row">
                          <span className="rp-row__method">{pmtIcon} {pmtLabel}</span>
                          <span
                            className="rp-row__status"
                            style={{ background: st.bg, color: st.color }}
                          >
                            {st.icon} {st.label}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Mobile Cards */}
              <div className="rp-mobile">
                {filteredPayments.map((payment) => {
                  const st = STATUS_STYLES[payment.paymentStatus] || STATUS_STYLES.paid;
                  const pmtIcon = PAYMENT_METHOD_ICONS[payment.paymentMethod] || '💵';
                  const pmtLabel = PAYMENT_METHOD_LABELS[payment.paymentMethod] || payment.paymentMethod?.toUpperCase() || t('sale.cash');
                  const isNew = isToday(payment.createdAt);
                  const customerName = payment.customer?.name || t('dashboard.walkInCustomer');
                  const initial = customerName.charAt(0).toUpperCase();

                  return (
                    <div
                      key={payment._id}
                      className="rp-mobile-card"
                      onClick={() => window.location.href = `/sales?view=${payment._id}`}
                    >
                      <div className="rp-mobile-card__top">
                        <div className="rp-mobile-card__left">
                          <div className="rp-mobile-card__avatar">
                            {payment.customer?.name ? initial : <BiUser size={14} />}
                          </div>
                          <div className="rp-mobile-card__name-row">
                            <span className="rp-mobile-card__name">{customerName}</span>
                            {isNew && <span className="rp-mobile-card__new-badge">{t('dashboard.new')}</span>}
                          </div>
                        </div>
                        <div className="rp-mobile-card__amount">
                          ₹{Number(payment.totalAmount || 0).toLocaleString('en-IN')}
                        </div>
                      </div>
                      <div className="rp-mobile-card__bottom">
                        <div className="rp-mobile-card__meta">
                          <span className="rp-mobile-card__meta-item">
                            {pmtIcon} {pmtLabel}
                          </span>
                          <span className="rp-mobile-card__meta-dot">•</span>
                          <span className="rp-mobile-card__meta-item">
                            {formatDate(payment.createdAt)} • {formatTime(payment.createdAt)}
                          </span>
                        </div>
                        <span
                          className="rp-mobile-card__status"
                          style={{ background: st.bg, color: st.color }}
                        >
                          {st.icon} {st.label}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;