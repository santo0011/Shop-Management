import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import Chart from 'react-apexcharts';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';
import * as XLSX from 'xlsx';
import api from '../../services/api';
import StatCard from '../../components/common/StatCard';
import DataTable from '../../components/common/DataTable';
import ExpandableCard from '../../components/common/ExpandableCard';
import { showToast } from '../../utils/toast';
import {
  BiCart, BiDollar, BiTrendingUp, BiReceipt, BiGroup, BiError, BiRefresh,
  BiStar, BiFile, BiFileBlank, BiSpreadsheet, BiCategory, BiCalendar,
  BiPackage, BiUser, BiHash, BiTime, BiCreditCard,
} from 'react-icons/bi';

// ─── Filter presets ───────────────────────────────────────────
const getPresets = (t) => [
  { key: 'today', label: t('common.today') },
  { key: '7d', label: t('common.last7Days') },
  { key: '30d', label: t('common.last30Days') },
  { key: 'month', label: t('common.thisMonth') },
  { key: 'custom', label: t('common.customRange') },
];

const getPaymentMethods = (t) => [
  { key: 'all', label: t('reportsPage.allPaymentMethods') },
  { key: 'cash', label: t('sale.cash') },
  { key: 'card', label: t('sale.card') },
  { key: 'upi', label: t('sale.upi') },
  { key: 'mobile_banking', label: t('sale.mobileBanking') },
  { key: 'due', label: t('common.due') },
];

const PAYMENT_METHOD_ICONS = { cash: '💵', card: '💳', upi: '📱', mobile_banking: '🏦', due: '🧾' };
const getPaymentMethodLabels = (t) => ({ cash: t('sale.cash'), card: t('sale.card'), upi: t('sale.upi'), mobile_banking: t('sale.mobileBanking'), due: t('common.due') });

// ─── Top Products Chart Palette (one color per product bar) ──
// Mirrors Dashboard.jsx's Top Selling Products chart exactly — same colors,
// gradient bars, colored-dot Y-axis ticks, and tooltip — so the two pages
// present the same chart for the same underlying data.
const TOP_PRODUCTS_COLORS = ['#2a78d6', '#1baf7a', '#eb6834', '#7c5cd6', '#e34948'];

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

const getStatusStyles = (t) => ({
  paid: { bg: 'rgba(46, 204, 113, 0.12)', color: '#2ecc71', label: t('common.paid') },
  partial: { bg: 'rgba(255, 181, 69, 0.12)', color: '#F39C12', label: t('common.partial') },
  unpaid: { bg: 'rgba(255, 107, 107, 0.12)', color: '#FF6B6B', label: t('common.due') },
});

const EMPTY_ANALYTICS = {
  summary: { totalOrders: 0, totalSales: 0, totalRevenue: 0, totalProfit: 0, totalCustomers: 0, lowStockProducts: 0 },
  daily: [], topProducts: [], paymentMethods: [], recentTransactions: [], lowStockProducts: [],
};

// ─── Format helpers ─────────────────────────────────────────
const money = (val) => `₹${Number(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const count = (val) => Number(val || 0).toLocaleString('en-IN');
const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
const formatDateTime = (dateStr) => new Date(dateStr).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
const toISODate = (d) => d.toISOString().slice(0, 10);

const computeRange = (preset, customStart, customEnd) => {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  let start = new Date();

  if (preset === 'today') {
    start.setHours(0, 0, 0, 0);
  } else if (preset === '7d') {
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);
  } else if (preset === 'month') {
    start = new Date(end.getFullYear(), end.getMonth(), 1);
  } else if (preset === 'custom') {
    if (!customStart || !customEnd) return null;
    const s = new Date(customStart);
    s.setHours(0, 0, 0, 0);
    const e = new Date(customEnd);
    e.setHours(23, 59, 59, 999);
    return { startDate: s.toISOString(), endDate: e.toISOString() };
  } else {
    start.setDate(start.getDate() - 29);
    start.setHours(0, 0, 0, 0);
  }

  return { startDate: start.toISOString(), endDate: end.toISOString() };
};

// ─── Minimal jsPDF table renderer (no autotable plugin installed) ────────
const drawPdfTable = (doc, startY, headers, rows, colWidths) => {
  const marginLeft = 14;
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.getWidth();
  const widths = colWidths || headers.map(() => (pageWidth - marginLeft * 2) / headers.length);
  let y = startY;

  const drawHeader = () => {
    doc.setFont(undefined, 'bold');
    doc.setFontSize(9);
    let x = marginLeft;
    headers.forEach((h, i) => { doc.text(String(h), x, y); x += widths[i]; });
    y += 2;
    doc.setDrawColor(200, 200, 200);
    doc.line(marginLeft, y, marginLeft + widths.reduce((a, b) => a + b, 0), y);
    y += 5;
    doc.setFont(undefined, 'normal');
  };

  drawHeader();
  rows.forEach((row) => {
    if (y > pageHeight - 15) {
      doc.addPage();
      y = 15;
      drawHeader();
    }
    let x = marginLeft;
    row.forEach((cell, i) => { doc.text(String(cell ?? ''), x, y); x += widths[i]; });
    y += 6;
  });

  return y + 4;
};

// ─── Static/persistent data (fetched once, cached) ─────────────────────
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
let cachedPersistentData = null;
let persistentCacheTime = 0;

const getPersistentData = async (forceRefresh) => {
  const now = Date.now();
  if (!forceRefresh && cachedPersistentData && (now - persistentCacheTime) < CACHE_DURATION) {
    return cachedPersistentData;
  }
  const [lowStockRes, customerDueRes, supplierDueRes] = await Promise.all([
    api.get('/reports/stock?lowStock=true', { _skipLoading: true }),
    api.get('/reports/customer-due', { _skipLoading: true }),
    api.get('/reports/supplier-due', { _skipLoading: true }),
  ]);
  const data = {
    lowStockProducts: lowStockRes.data.products || [],
    totalCustomerDue: customerDueRes.data.totalDue || 0,
    totalSupplierDue: supplierDueRes.data.totalDue || 0,
  };
  cachedPersistentData = data;
  persistentCacheTime = now;
  return data;
};

const clearPersistentCache = () => { cachedPersistentData = null; persistentCacheTime = 0; };

// ─── Skeleton Loading ────────────────────────────────────────
const ReportsSkeletonLoader = () => (
  <div>
    <style>{`@keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }`}</style>
    {/* Page Header */}
    <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
      <div style={{ flex: 1 }}>
        <div style={{
          height: 28, width: '30%', marginBottom: 8,
          background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
          backgroundSize: '200% 100%', borderRadius: 8,
          animation: 'shimmer 1.5s infinite',
        }} />
        <div style={{
          height: 14, width: '20%',
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

    {/* Summary Cards row */}
    <div className="row g-3 mb-3">
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

    {/* Filter Bar skeleton */}
    <div className="premium-card mb-3" style={{ border: '1px solid var(--border-color)' }}>
      <div className="premium-card-body" style={{ padding: '0.75rem 1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{
            height: 32, width: 90,
            background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
            backgroundSize: '200% 100%', borderRadius: 8,
            animation: 'shimmer 1.5s infinite',
          }} />
          <div style={{
            height: 32, width: 90,
            background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
            backgroundSize: '200% 100%', borderRadius: 8,
            animation: 'shimmer 1.5s infinite',
          }} />
          <div style={{
            height: 32, width: 90,
            background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
            backgroundSize: '200% 100%', borderRadius: 8,
            animation: 'shimmer 1.5s infinite',
          }} />
          <div style={{
            height: 32, width: 90,
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
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem' }}>
            <div style={{
              height: 32, width: 60,
              background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
              backgroundSize: '200% 100%', borderRadius: 8,
              animation: 'shimmer 1.5s infinite',
            }} />
            <div style={{
              height: 32, width: 60,
              background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
              backgroundSize: '200% 100%', borderRadius: 8,
              animation: 'shimmer 1.5s infinite',
            }} />
            <div style={{
              height: 32, width: 60,
              background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
              backgroundSize: '200% 100%', borderRadius: 8,
              animation: 'shimmer 1.5s infinite',
            }} />
          </div>
        </div>
      </div>
    </div>

    {/* Charts row */}
    <div className="row g-3 mb-3">
      <div className="col-lg-6">
        <div className="premium-card" style={{ border: '1px solid var(--border-color)' }}>
          <div className="premium-card-header" style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-color)' }}>
            <div style={{
              height: 16, width: '50%',
              background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
              backgroundSize: '200% 100%', borderRadius: 4,
              animation: 'shimmer 1.5s infinite',
            }} />
          </div>
          <div className="premium-card-body" style={{ padding: '1rem', height: 340, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
              height: 16, width: '45%',
              background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
              backgroundSize: '200% 100%', borderRadius: 4,
              animation: 'shimmer 1.5s infinite',
            }} />
          </div>
          <div className="premium-card-body" style={{ padding: '1rem', height: 340, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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

    {/* Table skeleton */}
    <div className="premium-card" style={{ border: '1px solid var(--border-color)' }}>
      <div className="premium-card-header" style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-color)' }}>
        <div style={{
          height: 16, width: '30%',
          background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
          backgroundSize: '200% 100%', borderRadius: 4,
          animation: 'shimmer 1.5s infinite',
        }} />
      </div>
      <div style={{ padding: '1rem 1.25rem' }}>
        {/* Table header */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.75rem' }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} style={{
              flex: 1, height: 12,
              background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
              backgroundSize: '200% 100%', borderRadius: 4,
              animation: 'shimmer 1.5s infinite',
            }} />
          ))}
        </div>
        {/* Table rows */}
        {[1, 2, 3, 4, 5].map((r) => (
          <div key={r} style={{
            display: 'flex', gap: '1rem', padding: '0.6rem 0',
            borderTop: '1px solid var(--border-color)',
          }}>
            {[1, 2, 3, 4, 5].map((c) => (
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

const Reports = () => {
  const { t } = useTranslation();
  const PRESETS = getPresets(t);
  const PAYMENT_METHODS = getPaymentMethods(t);
  const PAYMENT_METHOD_LABELS = getPaymentMethodLabels(t);
  const STATUS_STYLES = getStatusStyles(t);

  const [filters, setFilters] = useState({ preset: '30d', customStart: '', customEnd: '', paymentMethod: 'all' });
  const [analytics, setAnalytics] = useState(EMPTY_ANALYTICS);
  const [loading, setLoading] = useState(true); // Full-page loading only for initial load
  const [refreshing, setRefreshing] = useState(false); // Subsequent loads show spinner on buttons only
  const [error, setError] = useState(null);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [persistentData, setPersistentData] = useState(null);
  const initialLoadDone = useRef(false);

  const range = useMemo(
    () => computeRange(filters.preset, filters.customStart, filters.customEnd),
    [filters.preset, filters.customStart, filters.customEnd]
  );

  // Load persistent (non-date-dependent) data once and cache it.
  // Also merge low stock products into analytics so exports still work.
  useEffect(() => {
    getPersistentData(false).then((data) => {
      setPersistentData(data);
      setAnalytics((prev) => ({
        ...prev,
        lowStockProducts: data.lowStockProducts || [],
      }));
    }).catch(() => {});
  }, []);

  // Theme detection — only depends on DOM, not analytics data
  const theme = useMemo(() => {
    try { return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'; } catch { return 'light'; }
  }, []);

  const chartColors = {
    primary: '#6C63FF',
    secondary: '#00D9A6',
    textSecondary: theme === 'dark' ? '#9a9ab8' : '#5a5a7a',
    gridColor: theme === 'dark' ? '#2a2a4e' : '#e8e8f0',
  };

  const fetchAnalytics = useCallback(async (showFullLoader) => {
    if (!range) return;
    if (showFullLoader) setLoading(true); else setRefreshing(true);
    setError(null);
    try {
      const params = new URLSearchParams({ startDate: range.startDate, endDate: range.endDate });
      if (filters.paymentMethod !== 'all') params.append('paymentMethod', filters.paymentMethod);
      const { data } = await api.get(`/reports/analytics?${params.toString()}`, { _skipLoading: true });
      setAnalytics((prev) => ({
        ...prev,
        summary: data.summary || prev.summary,
        daily: data.daily || [],
        topProducts: data.topProducts || [],
        paymentMethods: data.paymentMethods || [],
        recentTransactions: data.recentTransactions || [],
        lowStockProducts: data.lowStockProducts || prev.lowStockProducts,
      }));
    } catch (err) {
      setError(err.response?.data?.message || err.message || t('reportsPage.failedToLoadData'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [range, filters.paymentMethod, t]);

  // Initial load — single fetch, no duplicate
  useEffect(() => {
    if (!initialLoadDone.current) {
      initialLoadDone.current = true;
      fetchAnalytics(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Subsequent loads when filters change (only after initial load)
  useEffect(() => {
    if (!initialLoadDone.current) return;
    fetchAnalytics(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range, filters.paymentMethod]);

  // ─── Theme-aware chart config (mirrors Dashboard.jsx) ─────────────────
  const trendOptions = useMemo(() => ({
    chart: { type: 'area', height: 320, toolbar: { show: false }, foreColor: chartColors.textSecondary },
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth', width: 2 },
    fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.45, opacityTo: 0.05, stops: [0, 100] } },
    xaxis: { categories: analytics.daily.map(d => d.date), labels: { rotate: -45, style: { fontSize: '11px' } } },
    yaxis: { labels: { formatter: (val) => `₹${Number(val).toLocaleString('en-IN')}`, style: { fontSize: '11px' } } },
    tooltip: { y: { formatter: (val) => `₹${Number(val).toLocaleString('en-IN')}` } },
    legend: { show: true, position: 'top', fontSize: '12px' },
    grid: { borderColor: chartColors.gridColor },
    theme: { mode: theme },
    colors: [chartColors.primary, chartColors.secondary],
  }), [analytics.daily, theme, chartColors]);

  const trendSeries = useMemo(() => [
    { name: t('nav.sales'), data: analytics.daily.map(d => Number((d.sales || 0).toFixed(2))) },
    { name: t('product.profit'), data: analytics.daily.map(d => Number((d.profit || 0).toFixed(2))) },
  ], [analytics.daily, t]);

  const isDark = theme === 'dark';

  // Same shape as Dashboard.jsx's topProductsData — top 5, truncated names,
  // Quantity Sold as the bar value, Revenue carried along for the tooltip.
  const topProductsChartData = useMemo(() => {
    return analytics.topProducts.slice(0, 5).map((p, index) => ({
      name: p.name?.length > 20 ? p.name.substring(0, 20) + '...' : p.name || t('common.unknown'),
      'Quantity Sold': p.quantity || 0,
      Revenue: p.revenue || 0,
      _index: index,
    }));
  }, [analytics.topProducts, t]);

  // Merge low stock and totals from persistent cache + analytics
  const summaryCards = useMemo(() => {
    const lowStockCount = persistentData?.lowStockProducts?.length ?? analytics.lowStockProducts?.length ?? 0;
    const totalDue = (persistentData?.totalCustomerDue ?? 0) + (persistentData?.totalSupplierDue ?? 0);
    return [
      { icon: BiCart, label: t('dashboard.totalSales'), value: money(analytics.summary.totalSales), color: 'primary', rawValue: analytics.summary.totalSales, isCurrency: true },
      { icon: BiDollar, label: t('reportsPage.totalRevenue'), value: money(analytics.summary.totalRevenue), color: 'success', rawValue: analytics.summary.totalRevenue, isCurrency: true },
      { icon: BiTrendingUp, label: t('dashboard.totalProfit'), value: money(analytics.summary.totalProfit), color: 'info', rawValue: analytics.summary.totalProfit, isCurrency: true },
      { icon: BiReceipt, label: t('dashboard.totalOrders'), value: count(analytics.summary.totalOrders), color: 'warning', rawValue: analytics.summary.totalOrders, isCurrency: false },
      { icon: BiCreditCard, label: t('dashboard.totalDueAmount'), value: money(totalDue), color: 'warning', rawValue: totalDue, isCurrency: true },
      { icon: BiError, label: t('dashboard.lowStockProducts'), value: count(lowStockCount), color: 'danger', rawValue: lowStockCount, isCurrency: false },
    ];
  }, [analytics.summary, persistentData, t]);

  // ─── Export ─────────────────────────────────────────────────────────
  const downloadBlob = (content, mime, filename) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const fileTag = () => `${toISODate(new Date(range.startDate))}_to_${toISODate(new Date(range.endDate))}`;

  const exportCSV = () => {
    if (!range) return;
    const rows = [
      [t('common.date'), t('dashboard.ordersLabel'), t('nav.sales'), t('product.profit')],
      ...analytics.daily.map(d => [d.date, d.orders, d.sales.toFixed(2), d.profit.toFixed(2)]),
    ];
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    downloadBlob(csv, 'text/csv;charset=utf-8;', `sales-report-${fileTag()}.csv`);
    showToast.success(t('toast.csvExported'));
  };

  const exportExcel = () => {
    if (!range) return;
    const wb = XLSX.utils.book_new();
    const s = analytics.summary;
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([{
      [t('dashboard.totalSales')]: s.totalSales, [t('reportsPage.totalRevenue')]: s.totalRevenue, [t('dashboard.totalProfit')]: s.totalProfit,
      [t('dashboard.totalOrders')]: s.totalOrders, [t('dashboard.totalCustomers')]: s.totalCustomers, [t('dashboard.lowStockProducts')]: s.lowStockProducts,
    }]), t('report.periodSummary'));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(analytics.daily), t('report.dailySales'));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(analytics.topProducts), t('dashboard.topProducts'));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(analytics.paymentMethods), t('reportsPage.paymentMethods'));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(analytics.lowStockProducts), t('dashboard.lowStockProducts'));
    XLSX.writeFile(wb, `sales-report-${fileTag()}.xlsx`);
    showToast.success(t('toast.excelExported'));
  };

  const exportPDF = async () => {
    if (!range) return;
    setExportingPdf(true);
    try {
      const jsPDF = (await import('jspdf')).default;
      const doc = new jsPDF();
      const s = analytics.summary;

      doc.setFontSize(16);
      doc.text(t('reportsPage.salesReportTitle'), 14, 15);
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`${formatDate(range.startDate)} - ${formatDate(range.endDate)}`, 14, 22);
      doc.setTextColor(0);

      let y = 32;
      doc.setFontSize(11);
      const summaryLines = [
        `${t('dashboard.totalSales')}: ${money(s.totalSales)}`,
        `${t('reportsPage.totalRevenue')}: ${money(s.totalRevenue)}`,
        `${t('dashboard.totalProfit')}: ${money(s.totalProfit)}`,
        `${t('dashboard.totalOrders')}: ${count(s.totalOrders)}`,
        `${t('dashboard.totalDueAmount')}: ${money(s.totalDue)}`,
        `${t('dashboard.lowStockProducts')}: ${count(s.lowStockProducts)}`,
      ];
      summaryLines.forEach((line) => { doc.text(line, 14, y); y += 6; });
      y += 4;

      doc.setFontSize(12);
      doc.text(`${t('report.dailySales')} ${t('report.periodSummary')}`, 14, y);
      y += 6;
      y = drawPdfTable(doc, y, [t('common.date'), t('dashboard.ordersLabel'), t('nav.sales'), t('product.profit')],
        analytics.daily.map(d => [d.date, d.orders, money(d.sales), money(d.profit)]));

      if (y > doc.internal.pageSize.getHeight() - 40) { doc.addPage(); y = 15; }
      doc.setFontSize(12);
      doc.text(t('dashboard.topSellingProducts'), 14, y);
      y += 6;
      drawPdfTable(doc, y, [t('reportsPage.product'), t('product.category'), t('dashboard.quantitySold'), t('dashboard.revenue')],
        analytics.topProducts.map(p => [p.name, p.category, p.quantity, money(p.revenue)]));

      doc.save(`sales-report-${fileTag()}.pdf`);
      showToast.success(t('toast.pdfExported'));
    } catch (err) {
      showToast.error(t('toast.pdfExportFailed'));
    } finally {
      setExportingPdf(false);
    }
  };

  // Show full-page skeleton on initial load instead of inline spinners
  if (loading) return <ReportsSkeletonLoader />;

  // Show inline spinners instead of blocking the entire page — like Sales page
  if (error) {
    return (
      <div className="d-flex flex-column justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
        <div className="premium-card p-5 text-center" style={{ maxWidth: '500px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem', color: 'var(--danger)' }}><BiError /></div>
          <h5 className="mb-2" style={{ fontWeight: 700 }}>{t('reportsPage.failedToLoad')}</h5>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>{error}</p>
          <button className="btn-premium btn-premium-primary" onClick={() => fetchAnalytics(true)}><BiRefresh /> {t('common.retry')}</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Page Header */}
      <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
        <div>
          <h4 className="mb-1" style={{ fontWeight: 800 }}>{t('nav.reports')}</h4>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
            {t('reportsPage.subtitle')}
          </p>
        </div>
        <div className="d-flex gap-2">
          {/* {loading && <div className="" style={{ color: 'var(--primary)', alignSelf: 'center' }} />} */}
          <button className="btn-premium btn-premium-secondary btn-premium-sm" onClick={() => fetchAnalytics(false)} disabled={refreshing}>
            {refreshing ? <span className="spinner-border spinner-border-sm" /> : <BiRefresh />} {t('common.refresh')}
          </button>
        </div>
      </div>

      {/* Summary Cards - 3 per row desktop, 2 per row mobile */}
      <div className="row g-3 mb-3">
        {summaryCards.map((card, index) => (
          <div key={index} className="col-6 col-md-4">
            <StatCard icon={card.icon} label={card.label} value={card.value} color={card.color} rawValue={card.rawValue} isCurrency={card.isCurrency} />
          </div>
        ))}
      </div>

      {/* Filter Bar */}
      <div className="premium-card mb-3">
        <div className="premium-card-body reports-filter-card-body">
          <div className="reports-filter-bar">
            <div className="sales-date-filters-scroll">
              <div className="sales-date-segmented" role="tablist" aria-label={t('reportsPage.reportPeriod')}>
                {PRESETS.map((p, idx) => (
                  <React.Fragment key={p.key}>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={filters.preset === p.key}
                      className={`sales-date-pill ${filters.preset === p.key ? 'active' : ''}`}
                      onClick={() => setFilters(f => ({ ...f, preset: p.key }))}
                    >
                      <BiCalendar />
                      <span>{p.label}</span>
                    </button>
                    {idx === 2 && <span className="sales-date-break" aria-hidden="true" />}
                  </React.Fragment>
                ))}
              </div>
            </div>

            {filters.preset === 'custom' && (
              <>
                <div className="sales-filter">
                  <BiCalendar size={14} className="sales-filter-icon-abs" />
                  <input type="date" className="form-control sales-filter-input" style={{ paddingLeft: '30px' }} value={filters.customStart} onChange={e => setFilters(f => ({ ...f, customStart: e.target.value }))} />
                </div>
                <div className="sales-filter">
                  <BiCalendar size={14} className="sales-filter-icon-abs" />
                  <input type="date" className="form-control sales-filter-input" style={{ paddingLeft: '30px' }} value={filters.customEnd} onChange={e => setFilters(f => ({ ...f, customEnd: e.target.value }))} />
                </div>
              </>
            )}

            <select
              className="form-select reports-payment-select"
              value={filters.paymentMethod}
              onChange={e => setFilters(f => ({ ...f, paymentMethod: e.target.value }))}
            >
              {PAYMENT_METHODS.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
            </select>

            <div className="reports-export-group">
              <button type="button" className="btn-premium btn-premium-secondary btn-premium-sm" onClick={exportCSV} title={`${t('common.export')} ${t('common.csv')}`}>
                <BiFile /> {t('common.csv')}
              </button>
              <button type="button" className="btn-premium btn-premium-secondary btn-premium-sm" onClick={exportExcel} title={`${t('common.export')} ${t('common.excel')}`}>
                <BiSpreadsheet /> {t('common.excel')}
              </button>
              <button type="button" className="btn-premium btn-premium-secondary btn-premium-sm" onClick={exportPDF} disabled={exportingPdf} title={`${t('common.export')} ${t('common.pdf')}`}>
                {exportingPdf ? <span className="spinner-border spinner-border-sm" /> : <BiFileBlank />} {t('common.pdf')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Charts - 2 in a row */}
      <div className="row g-3 mb-3">
        <div className="col-lg-6">
          <div className="premium-card">
            <div className="premium-card-header">
              <h6 className="mb-0" style={{ fontWeight: 600 }}>
                <BiTrendingUp size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                {t('report.salesVsProfitTrend')}
              </h6>
              <span className="badge badge-primary">{PRESETS.find(p => p.key === filters.preset)?.label || t('common.custom')}</span>
            </div>
            <div className="premium-card-body" style={{ padding: '1rem' }}>
              {refreshing ? (
                <div className="text-center py-5" style={{ color: 'var(--text-muted)' }}>
                  <div className="spinner-border spinner-border-sm me-2" /> {t('common.loading')}
                </div>
              ) : analytics.daily.length > 0 ? (
                <Chart options={trendOptions} series={trendSeries} type="area" height={320} />
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
                {t('dashboard.topSellingProducts')}
              </h6>
              <span className="badge badge-success">{t('report.byQuantity')}</span>
            </div>
            <div className="premium-card-body" style={{ padding: '1rem' }}>
              {refreshing ? (
                <div className="text-center py-5" style={{ color: 'var(--text-muted)' }}>
                  <div className="spinner-border spinner-border-sm me-2" /> {t('common.loading')}
                </div>
              ) : topProductsChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart
                    data={topProductsChartData}
                    layout="vertical"
                    margin={{ top: 5, right: 38, left: 10, bottom: 5 }}
                    barSize={20}
                    barCategoryGap="28%"
                  >
                    <defs>
                      {TOP_PRODUCTS_COLORS.map((color, index) => (
                        <linearGradient key={index} id={`reportsTopProductBarGradient-${index}`} x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor={color} stopOpacity={0.75} />
                          <stop offset="100%" stopColor={color} stopOpacity={1} />
                        </linearGradient>
                      ))}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartColors.gridColor} horizontal={false} />
                    <XAxis
                      type="number"
                      tick={{ fill: chartColors.textSecondary, fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={<TopProductsYAxisTick textColor={chartColors.textSecondary} />}
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
                      {topProductsChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={`url(#reportsTopProductBarGradient-${index})`} />
                      ))}
                      <LabelList
                        dataKey="Quantity Sold"
                        position="right"
                        formatter={(val) => Number(val).toLocaleString('en-IN')}
                        style={{ fill: chartColors.textSecondary, fontSize: 11, fontWeight: 700 }}
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
      </div>

      {/* Top 10 Best Selling Products */}
      <div className="desktop-table mb-3">
        {refreshing ? (
          <div className="premium-card">
            <div className="premium-card-body text-center py-4" style={{ color: 'var(--text-muted)' }}>
              <div className="spinner-border spinner-border-sm me-2" /> {t('common.loading')}
            </div>
          </div>
        ) : (
          <DataTable
            title={t('reportsPage.top10Products')}
            icon={BiStar}
            data={analytics.topProducts}
            rowKey={(row) => row.productId}
            searchKeys={['name', 'category']}
            searchPlaceholder={t('product.searchProductsPlaceholder')}
            emptyMessage={t('reportsPage.noSalesPeriod')}
            pageSize={10}
            columns={[
              { key: 'name', label: t('reportsPage.product'), sortable: true },
              { key: 'category', label: t('product.category'), sortable: true },
              { key: 'quantity', label: t('dashboard.quantitySold'), sortable: true, align: 'right' },
              { key: 'revenue', label: t('dashboard.revenue'), sortable: true, align: 'right', render: (row) => money(row.revenue) },
            ]}
          />
        )}
      </div>

      {/* ─── Mobile: Top Products Cards ────────────────────────────────── */}
      <div className="mobile-cards mb-3">
        <h5 className="mb-2" style={{ fontWeight: 700, fontSize: '0.95rem' }}>
          <BiStar size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} />
          {t('reportsPage.top10Products')}
        </h5>
        {refreshing ? (
          <div className="text-center py-4" style={{ color: 'var(--text-muted)' }}>
            <div className="spinner-border spinner-border-sm me-2" /> {t('common.loading')}
          </div>
        ) : analytics.topProducts.length === 0 ? (
          <div className="text-center py-4" style={{ color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem', opacity: 0.5 }}>📦</div>
            {t('reportsPage.noSalesPeriod')}
          </div>
        ) : analytics.topProducts.map((product) => (
          <ExpandableCard
            key={product.productId}
            compact={
              <>
                <div className="expandable-card__compact-row">
                  <span className="expandable-card__name">{product.name}</span>
                  <span className="expandable-card__price">{t('reportsPage.soldCount', { count: product.quantity })}</span>
                </div>
                <div className="expandable-card__meta">
                  <span className="expandable-card__meta-item">
                    <BiCategory />
                    <span>{product.category || '-'}</span>
                  </span>
                </div>
              </>
            }
            expanded={
              <div className="expandable-card__rows">
                <div className="expandable-card__row">
                  <span className="expandable-card__row-label">{t('reportsPage.product')}</span>
                  <span className="expandable-card__row-dots" />
                  <span className="expandable-card__row-value">{product.name}</span>
                </div>
                <div className="expandable-card__row">
                  <span className="expandable-card__row-label">{t('product.category')}</span>
                  <span className="expandable-card__row-dots" />
                  <span className="expandable-card__row-value">{product.category || '-'}</span>
                </div>
                <div className="expandable-card__row">
                  <span className="expandable-card__row-label">{t('dashboard.quantitySold')}</span>
                  <span className="expandable-card__row-dots" />
                  <span className="expandable-card__row-value">{product.quantity}</span>
                </div>
                <div className="expandable-card__row">
                  <span className="expandable-card__row-label">{t('dashboard.revenue')}</span>
                  <span className="expandable-card__row-dots" />
                  <span className="expandable-card__row-value">{money(product.revenue)}</span>
                </div>
              </div>
            }
          />
        ))}
      </div>

      {/* One-line period summary (replaces the old per-day table) */}
      <div className="reports-summary-line mb-3">
        <BiTrendingUp />
        <span>
          {PRESETS.find(p => p.key === filters.preset)?.label || t('common.custom')} {t('report.periodSummary')}:{' '}
          <strong>{count(analytics.summary.totalOrders)}</strong> {t('dashboard.ordersLabel')}{' · '}
          <strong>{money(analytics.summary.totalSales)}</strong> {t('nav.sales')}{' · '}
          <strong>{money(analytics.summary.totalProfit)}</strong> {t('product.profit')}
        </span>
      </div>

      {/* Recent Sales */}
      <div className="desktop-table">
        {refreshing ? (
          <div className="premium-card">
            <div className="premium-card-body text-center py-4" style={{ color: 'var(--text-muted)' }}>
              <div className="spinner-border spinner-border-sm me-2" /> {t('common.loading')}
            </div>
          </div>
        ) : (
          <DataTable
            title={t('sale.recentSales')}
            icon={BiReceipt}
            data={analytics.recentTransactions}
            rowKey={(row) => row._id}
            searchKeys={['invoiceNo']}
            searchPlaceholder={t('sale.searchInvoicePlaceholder')}
            emptyMessage={t('empty.noTransactions')}
            pageSize={10}
            columns={[
              { key: 'invoiceNo', label: t('sale.invoice'), sortable: true },
              { key: 'createdAt', label: t('common.date'), sortable: true, render: (row) => formatDateTime(row.createdAt) },
              {
                key: 'customer', label: t('sale.customer'), sortable: false,
                render: (row) => row.customer?.name || t('dashboard.walkInCustomer'),
              },
              { key: 'totalAmount', label: t('common.amount'), sortable: true, align: 'right', render: (row) => money(row.totalAmount) },
              {
                key: 'paymentMethod', label: t('sale.paymentMethod'), sortable: true,
                render: (row) => `${PAYMENT_METHOD_ICONS[row.paymentMethod] || '💵'} ${PAYMENT_METHOD_LABELS[row.paymentMethod] || row.paymentMethod}`,
              },
              {
                key: 'paymentStatus', label: t('common.status'), sortable: true,
                render: (row) => {
                  const st = STATUS_STYLES[row.paymentStatus] || STATUS_STYLES.paid;
                  return <span className="reports-status-pill" style={{ background: st.bg, color: st.color }}>{st.label}</span>;
                },
              },
            ]}
          />
        )}
      </div>

      {/* ─── Mobile: Recent Sales Cards ────────────────────────────────── */}
      <div className="mobile-cards">
        <h5 className="mb-2" style={{ fontWeight: 700, fontSize: '0.95rem' }}>
          <BiReceipt size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} />
          {t('sale.recentSales')}
        </h5>
        {refreshing ? (
          <div className="text-center py-4" style={{ color: 'var(--text-muted)' }}>
            <div className="spinner-border spinner-border-sm me-2" /> {t('common.loading')}
          </div>
        ) : analytics.recentTransactions.length === 0 ? (
          <div className="text-center py-4" style={{ color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem', opacity: 0.5 }}>🧾</div>
            {t('empty.noTransactions')}
          </div>
        ) : analytics.recentTransactions.map((tx) => {
          const st = STATUS_STYLES[tx.paymentStatus] || STATUS_STYLES.paid;
          return (
            <ExpandableCard
              key={tx._id}
              compact={
                <>
                  <div className="expandable-card__compact-row">
                    <span className="expandable-card__name">{tx.invoiceNo || t('common.notAvailable')}</span>
                    <span className="expandable-card__price">{money(tx.totalAmount)}</span>
                  </div>
                  <div className="expandable-card__meta">
                    <span className="expandable-card__meta-item">
                      <BiUser />
                      <span>{tx.customer?.name || t('dashboard.walkInCustomer')}</span>
                    </span>
                    <span className="reports-status-pill" style={{ background: st.bg, color: st.color, padding: '2px 8px', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 600 }}>{st.label}</span>
                  </div>
                </>
              }
              expanded={
                <div className="expandable-card__rows">
                  <div className="expandable-card__row">
                    <span className="expandable-card__row-label">{t('sale.invoice')}</span>
                    <span className="expandable-card__row-dots" />
                    <span className="expandable-card__row-value">{tx.invoiceNo || t('common.notAvailable')}</span>
                  </div>
                  <div className="expandable-card__row">
                    <span className="expandable-card__row-label">{t('common.date')}</span>
                    <span className="expandable-card__row-dots" />
                    <span className="expandable-card__row-value">{formatDateTime(tx.createdAt)}</span>
                  </div>
                  <div className="expandable-card__row">
                    <span className="expandable-card__row-label">{t('sale.customer')}</span>
                    <span className="expandable-card__row-dots" />
                    <span className="expandable-card__row-value">{tx.customer?.name || t('dashboard.walkInCustomer')}</span>
                  </div>
                  <div className="expandable-card__row">
                    <span className="expandable-card__row-label">{t('common.amount')}</span>
                    <span className="expandable-card__row-dots" />
                    <span className="expandable-card__row-value">{money(tx.totalAmount)}</span>
                  </div>
                  <div className="expandable-card__row">
                    <span className="expandable-card__row-label">{t('sale.paymentMethod')}</span>
                    <span className="expandable-card__row-dots" />
                    <span className="expandable-card__row-value">{PAYMENT_METHOD_ICONS[tx.paymentMethod] || '💵'} {PAYMENT_METHOD_LABELS[tx.paymentMethod] || tx.paymentMethod}</span>
                  </div>
                  <div className="expandable-card__row">
                    <span className="expandable-card__row-label">{t('common.status')}</span>
                    <span className="expandable-card__row-dots" />
                    <span className="expandable-card__row-value"><span className="reports-status-pill" style={{ background: st.bg, color: st.color, padding: '2px 8px', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 600 }}>{st.label}</span></span>
                  </div>
                </div>
              }
            />
          );
        })}
      </div>
    </div>
  );
};

export default Reports;