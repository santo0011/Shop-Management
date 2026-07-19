import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts';

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

const CustomAreaTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  const profitItem = payload.find(p => p.name === 'Profit');
  const expenseItem = payload.find(p => p.name === 'Expenses');
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
        <span>Net Profit: </span>
        <strong>{formatCurrency(netProfit)}</strong>
      </div>
    </div>
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
          <strong>{entry.name === 'Revenue' ? formatCurrency(entry.value) : entry.value}</strong>
        </div>
      ))}
    </div>
  );
};

const CustomPieTooltip = ({ active, payload }) => {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0].payload;
  return (
    <div className="dashboard-tooltip">
      <div className="dashboard-tooltip-row" style={{ color: payload[0].color }}>
        <span className="dashboard-tooltip-dot" style={{ background: payload[0].color }} />
        <span>{data.name}: </span>
        <strong>{formatCurrency(data.value)}</strong>
      </div>
      <div className="dashboard-tooltip-row">
        <span>Transactions: </span>
        <strong>{data.count || 0}</strong>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const { t } = useTranslation();
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

  useEffect(() => {
    const observer = new MutationObserver(() => {
      const currentTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
      setTheme(currentTheme);
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    setTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light');
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [salesPeriod]);

  const fetchDashboardData = async () => {
    setLoading(true);
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
      setError(err.response?.data?.message || err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const isDark = theme === 'dark';
  const textColor = isDark ? '#9a9ab8' : '#5a5a7a';
  const gridColor = isDark ? '#2a2a4e' : '#e8e8f0';
  const tooltipBg = isDark ? '#1a1a3e' : '#ffffff';
  const tooltipBorder = isDark ? '#2a2a4e' : '#e8e8f0';

  // Sales Period options
  const PERIOD_OPTIONS = [
    { key: 1, label: 'Today' },
    { key: 7, label: 'Last 7 Days' },
    { key: 30, label: 'Last 30 Days' },
    { key: 0, label: 'This Month' },
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
    { key: 'all', label: 'All' },
    { key: 'paid', label: 'Paid' },
    { key: 'partial', label: 'Partial' },
    { key: 'unpaid', label: 'Due' },
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
    return topProducts.slice(0, 5).map(p => ({
      name: p.name?.length > 20 ? p.name.substring(0, 20) + '...' : p.name || 'Unknown',
      'Quantity Sold': p.totalQuantity || 0,
      Revenue: p.totalRevenue || 0,
    }));
  }, [topProducts]);

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
      name: c.name || 'Unknown',
      Revenue: c.revenue || 0,
    }));
  }, [salesByCategory]);

  if (error) {
    return (
      <div className="d-flex flex-column justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
        <div className="premium-card p-5 text-center" style={{ maxWidth: '500px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem', color: 'var(--danger)' }}><BiError /></div>
          <h5 className="mb-2" style={{ fontWeight: 700 }}>Failed to Load Dashboard</h5>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>{error}</p>
          <button className="btn-premium btn-premium-primary" onClick={() => { setSalesPeriod(7); fetchDashboardData(); }}><BiRefresh /> Retry</button>
        </div>
      </div>
    );
  }

  const statCards = [
    { icon: BiPackage, label: 'Total Products', value: stats?.totalProducts || 0, color: 'primary' },
    { icon: BiCart, label: 'Total Sales', value: stats?.monthlySalesCount || 0, color: 'success' },
    { icon: BiCreditCard, label: 'Total Due Amount', subtitle: 'Outstanding Receivables', value: stats?.customerDue || 0, color: 'warning', prefix: '₹' },
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
    <div className="dashboard-modern">
      {/* Page Header */}
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h4 className="mb-1" style={{ fontWeight: 800 }}>{t('nav.dashboard')}</h4>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
            Welcome back, {user?.name || 'User'}! Here's your overview.
          </p>
        </div>
        <button className="btn-premium btn-premium-secondary btn-premium-sm" onClick={() => { setSalesPeriod(7); fetchDashboardData(); }}>
          <BiRefresh /> Refresh
        </button>
      </div>

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
                Sales Overview
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
              {salesChartData.length > 0 ? (
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
                      stroke={CHART_COLORS.primary}
                      strokeWidth={3}
                      dot={false}
                      activeDot={{ r: 6, fill: CHART_COLORS.primary, stroke: '#fff', strokeWidth: 2 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="Orders"
                      stroke={CHART_COLORS.secondary}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 5, fill: CHART_COLORS.secondary, stroke: '#fff', strokeWidth: 2 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="Profit"
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
                Profit vs Expense
              </h6>
            </div>
            <div className="premium-card-body">
              {profitExpense.length > 0 ? (
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
                    <Tooltip content={<CustomAreaTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="Profit"
                      stroke={CHART_COLORS.secondary}
                      strokeWidth={2}
                      fill="url(#profitGradient)"
                      animationDuration={1000}
                    />
                    <Area
                      type="monotone"
                      dataKey="Expenses"
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
                Top Selling Products
              </h6>
              <span className="badge badge-success">This Month</span>
            </div>
            <div className="premium-card-body">
              {topProductsData.length > 0 ? (
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart
                    data={topProductsData}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                    barSize={28}
                  >
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
                      tick={{ fill: textColor, fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      width={120}
                    />
                    <Tooltip content={<CustomBarTooltip />} />
                    <Bar
                      dataKey="Quantity Sold"
                      fill={CHART_COLORS.primary}
                      radius={[0, 6, 6, 0]}
                      animationDuration={800}
                    />
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
              {paymentData.length > 0 ? (
                <div className="dashboard-donut-container">
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={paymentData}
                        cx="50%"
                        cy="50%"
                        innerRadius={65}
                        outerRadius={100}
                        paddingAngle={3}
                        dataKey="value"
                        animationDuration={800}
                        animationBegin={0}
                      >
                        {paymentData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomPieTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="dashboard-donut-legend">
                    {paymentData.map((entry, index) => (
                      <div key={index} className="dashboard-donut-legend-item">
                        <span
                          className="dashboard-donut-legend-dot"
                          style={{ background: PIE_COLORS[index % PIE_COLORS.length] }}
                        />
                        <span className="dashboard-donut-legend-name">{entry.name}</span>
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
                Sales by Category
              </h6>
              <span className="badge badge-primary">This Month</span>
            </div>
            <div className="premium-card-body">
              {categoryData.length > 0 ? (
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
            <h6 className="mb-0" style={{ fontWeight: 600 }}>Recent Payments</h6>
          </div>
          <button
            className="btn-premium btn-premium-secondary btn-premium-sm rp-view-all-btn"
            onClick={() => window.location.href = '/sales'}
          >
            View All <BiRightArrowAlt size={14} style={{ marginLeft: 4 }} />
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
          {filteredPayments.length === 0 ? (
            <div className="rp-empty">
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem', opacity: 0.5 }}>📄</div>
              <p style={{ fontSize: '0.85rem', margin: 0 }}>No payments found</p>
            </div>
          ) : (
            <>
              {/* Desktop List */}
              <div className="rp-list">
                {filteredPayments.map((payment) => {
                  const st = STATUS_STYLES[payment.paymentStatus] || STATUS_STYLES.paid;
                  const pmtIcon = PAYMENT_METHOD_ICONS[payment.paymentMethod] || '💵';
                  const pmtLabel = PAYMENT_METHOD_LABELS[payment.paymentMethod] || payment.paymentMethod?.toUpperCase() || 'CASH';
                  const isNew = isToday(payment.createdAt);
                  const customerName = payment.customer?.name || 'Walk-in Customer';
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
                          {isNew && <span className="rp-row__new-badge">New</span>}
                        </div>
                        <div className="rp-row__meta">
                          <span className="rp-row__meta-item">
                            <BiHash size={10} /> {payment.invoiceNo || 'N/A'}
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
                  const pmtLabel = PAYMENT_METHOD_LABELS[payment.paymentMethod] || payment.paymentMethod?.toUpperCase() || 'CASH';
                  const isNew = isToday(payment.createdAt);
                  const customerName = payment.customer?.name || 'Walk-in Customer';
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
                            {isNew && <span className="rp-mobile-card__new-badge">New</span>}
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