import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import Chart from 'react-apexcharts';
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
const PRESETS = [
  { key: 'today', label: 'Today' },
  { key: '7d', label: '7 Days' },
  { key: '30d', label: '30 Days' },
  { key: 'month', label: 'This Month' },
  { key: 'custom', label: 'Custom' },
];

const PAYMENT_METHODS = [
  { key: 'all', label: 'All Payment Methods' },
  { key: 'cash', label: 'Cash' },
  { key: 'card', label: 'Card' },
  { key: 'upi', label: 'UPI' },
  { key: 'mobile_banking', label: 'Mobile Banking' },
  { key: 'due', label: 'Due' },
];

const PAYMENT_METHOD_ICONS = { cash: '💵', card: '💳', upi: '📱', mobile_banking: '🏦', due: '🧾' };
const PAYMENT_METHOD_LABELS = { cash: 'Cash', card: 'Card', upi: 'UPI', mobile_banking: 'Mobile Banking', due: 'Due' };

const STATUS_STYLES = {
  paid: { bg: 'rgba(46, 204, 113, 0.12)', color: '#2ecc71', label: 'Paid' },
  partial: { bg: 'rgba(255, 181, 69, 0.12)', color: '#F39C12', label: 'Partial' },
  unpaid: { bg: 'rgba(255, 107, 107, 0.12)', color: '#FF6B6B', label: 'Due' },
};

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

const Reports = () => {
  const { t } = useTranslation();

  const [filters, setFilters] = useState({ preset: '30d', customStart: '', customEnd: '', paymentMethod: 'all' });
  const [analytics, setAnalytics] = useState(EMPTY_ANALYTICS);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [exportingPdf, setExportingPdf] = useState(false);

  const range = useMemo(
    () => computeRange(filters.preset, filters.customStart, filters.customEnd),
    [filters.preset, filters.customStart, filters.customEnd]
  );

  const fetchAnalytics = useCallback(async (isFirstLoad) => {
    if (!range) return;
    if (isFirstLoad) setLoading(true); else setRefreshing(true);
    setError(null);
    try {
      const params = new URLSearchParams({ startDate: range.startDate, endDate: range.endDate });
      if (filters.paymentMethod !== 'all') params.append('paymentMethod', filters.paymentMethod);
      const { data } = await api.get(`/reports/analytics?${params.toString()}`, { _skipLoading: true });
      setAnalytics(data);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load report data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [range, filters.paymentMethod]);

  useEffect(() => {
    fetchAnalytics(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (loading) return;
    fetchAnalytics(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range, filters.paymentMethod]);

  // ─── Theme-aware chart config (mirrors Dashboard.jsx) ─────────────────
  const getTheme = () => {
    try { return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'; } catch { return 'light'; }
  };
  const theme = useMemo(() => getTheme(), [analytics]);
  const chartColors = {
    primary: '#6C63FF',
    secondary: '#00D9A6',
    textSecondary: theme === 'dark' ? '#9a9ab8' : '#5a5a7a',
    gridColor: theme === 'dark' ? '#2a2a4e' : '#e8e8f0',
  };

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
  }), [analytics, theme]);

  const trendSeries = useMemo(() => [
    { name: 'Sales', data: analytics.daily.map(d => Number((d.sales || 0).toFixed(2))) },
    { name: 'Profit', data: analytics.daily.map(d => Number((d.profit || 0).toFixed(2))) },
  ], [analytics]);

  const topProductsChartOptions = useMemo(() => ({
    chart: { type: 'bar', height: 320, toolbar: { show: false }, foreColor: chartColors.textSecondary },
    plotOptions: { bar: { borderRadius: 6, horizontal: true, barHeight: '55%' } },
    dataLabels: { enabled: true, style: { fontSize: '11px', fontWeight: 600, colors: [theme === 'dark' ? '#fff' : '#1a1a2e'] } },
    xaxis: { categories: analytics.topProducts.map(p => p.name), labels: { style: { fontSize: '11px' } } },
    yaxis: { labels: { style: { fontSize: '11px' } } },
    tooltip: { y: { formatter: (val) => `${val} sold` } },
    grid: { borderColor: chartColors.gridColor },
    theme: { mode: theme },
    colors: [chartColors.secondary],
  }), [analytics, theme]);

  const topProductsChartSeries = useMemo(() => [
    { name: 'Quantity Sold', data: analytics.topProducts.map(p => p.quantity) },
  ], [analytics]);

  // ─── Summary cards (reuses the shared StatCard component) ─────────────
  const summaryCards = [
    { icon: BiCart, label: 'Total Sales', value: money(analytics.summary.totalSales), color: 'primary', rawValue: analytics.summary.totalSales, isCurrency: true },
    { icon: BiDollar, label: 'Total Revenue', value: money(analytics.summary.totalRevenue), color: 'success', rawValue: analytics.summary.totalRevenue, isCurrency: true },
    { icon: BiTrendingUp, label: 'Total Profit', value: money(analytics.summary.totalProfit), color: 'info', rawValue: analytics.summary.totalProfit, isCurrency: true },
    { icon: BiReceipt, label: 'Total Orders', value: count(analytics.summary.totalOrders), color: 'warning', rawValue: analytics.summary.totalOrders, isCurrency: false },
    { icon: BiCreditCard, label: 'Total Due Amount', value: money(analytics.summary.totalDue), color: 'warning', rawValue: analytics.summary.totalDue, isCurrency: true },
    { icon: BiError, label: 'Low Stock Products', value: count(analytics.summary.lowStockProducts), color: 'danger', rawValue: analytics.summary.lowStockProducts, isCurrency: false },
  ];

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
      ['Date', 'Orders', 'Sales', 'Profit'],
      ...analytics.daily.map(d => [d.date, d.orders, d.sales.toFixed(2), d.profit.toFixed(2)]),
    ];
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    downloadBlob(csv, 'text/csv;charset=utf-8;', `sales-report-${fileTag()}.csv`);
    showToast.success('CSV exported');
  };

  const exportExcel = () => {
    if (!range) return;
    const wb = XLSX.utils.book_new();
    const s = analytics.summary;
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([{
      'Total Sales': s.totalSales, 'Total Revenue': s.totalRevenue, 'Total Profit': s.totalProfit,
      'Total Orders': s.totalOrders, 'Total Customers': s.totalCustomers, 'Low Stock Products': s.lowStockProducts,
    }]), 'Summary');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(analytics.daily), 'Daily Sales');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(analytics.topProducts), 'Top Products');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(analytics.paymentMethods), 'Payment Methods');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(analytics.lowStockProducts), 'Low Stock Products');
    XLSX.writeFile(wb, `sales-report-${fileTag()}.xlsx`);
    showToast.success('Excel file exported');
  };

  const exportPDF = async () => {
    if (!range) return;
    setExportingPdf(true);
    try {
      const jsPDF = (await import('jspdf')).default;
      const doc = new jsPDF();
      const s = analytics.summary;

      doc.setFontSize(16);
      doc.text('Sales Report', 14, 15);
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`${formatDate(range.startDate)} - ${formatDate(range.endDate)}`, 14, 22);
      doc.setTextColor(0);

      let y = 32;
      doc.setFontSize(11);
      const summaryLines = [
        `Total Sales: ${money(s.totalSales)}`,
        `Total Revenue: ${money(s.totalRevenue)}`,
        `Total Profit: ${money(s.totalProfit)}`,
        `Total Orders: ${count(s.totalOrders)}`,
        `Total Due Amount: ${money(s.totalDue)}`,
        `Low Stock Products: ${count(s.lowStockProducts)}`,
      ];
      summaryLines.forEach((line) => { doc.text(line, 14, y); y += 6; });
      y += 4;

      doc.setFontSize(12);
      doc.text('Daily Sales Summary', 14, y);
      y += 6;
      y = drawPdfTable(doc, y, ['Date', 'Orders', 'Sales', 'Profit'],
        analytics.daily.map(d => [d.date, d.orders, money(d.sales), money(d.profit)]));

      if (y > doc.internal.pageSize.getHeight() - 40) { doc.addPage(); y = 15; }
      doc.setFontSize(12);
      doc.text('Top Selling Products', 14, y);
      y += 6;
      drawPdfTable(doc, y, ['Product', 'Category', 'Qty Sold', 'Revenue'],
        analytics.topProducts.map(p => [p.name, p.category, p.quantity, money(p.revenue)]));

      doc.save(`sales-report-${fileTag()}.pdf`);
      showToast.success('PDF exported');
    } catch (err) {
      showToast.error('Failed to export PDF');
    } finally {
      setExportingPdf(false);
    }
  };

  if (loading) return null;

  if (error) {
    return (
      <div className="d-flex flex-column justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
        <div className="premium-card p-5 text-center" style={{ maxWidth: '500px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem', color: 'var(--danger)' }}><BiError /></div>
          <h5 className="mb-2" style={{ fontWeight: 700 }}>Failed to Load Reports</h5>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>{error}</p>
          <button className="btn-premium btn-premium-primary" onClick={() => fetchAnalytics(true)}><BiRefresh /> Retry</button>
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
            Sales, profit, and performance analytics for your shop.
          </p>
        </div>
        <button className="btn-premium btn-premium-secondary btn-premium-sm" onClick={() => fetchAnalytics(false)} disabled={refreshing}>
          {refreshing ? <span className="spinner-border spinner-border-sm" /> : <BiRefresh />} Refresh
        </button>
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
        <div className="premium-card-body" style={{ padding: '1rem 1.25rem' }}>
          <div className="reports-filter-bar">
            <div className="reports-filter-presets">
              {PRESETS.map(p => (
                <button
                  key={p.key}
                  type="button"
                  className={`reports-preset-btn ${filters.preset === p.key ? 'active' : ''}`}
                  onClick={() => setFilters(f => ({ ...f, preset: p.key }))}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {filters.preset === 'custom' && (
              <div className="d-flex align-items-center gap-2 flex-wrap">
                <input type="date" className="form-control" style={{ maxWidth: 160 }} value={filters.customStart} onChange={e => setFilters(f => ({ ...f, customStart: e.target.value }))} />
                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>to</span>
                <input type="date" className="form-control" style={{ maxWidth: 160 }} value={filters.customEnd} onChange={e => setFilters(f => ({ ...f, customEnd: e.target.value }))} />
              </div>
            )}

            <select
              className="form-select reports-payment-select"
              value={filters.paymentMethod}
              onChange={e => setFilters(f => ({ ...f, paymentMethod: e.target.value }))}
            >
              {PAYMENT_METHODS.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
            </select>

            <div className="reports-export-group">
              <button type="button" className="btn-premium btn-premium-secondary btn-premium-sm" onClick={exportCSV} title="Export CSV">
                <BiFile /> CSV
              </button>
              <button type="button" className="btn-premium btn-premium-secondary btn-premium-sm" onClick={exportExcel} title="Export Excel">
                <BiSpreadsheet /> Excel
              </button>
              <button type="button" className="btn-premium btn-premium-secondary btn-premium-sm" onClick={exportPDF} disabled={exportingPdf} title="Export PDF">
                {exportingPdf ? <span className="spinner-border spinner-border-sm" /> : <BiFileBlank />} PDF
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
                Sales vs Profit Trend
              </h6>
              <span className="badge badge-primary">{PRESETS.find(p => p.key === filters.preset)?.label || 'Custom'}</span>
            </div>
            <div className="premium-card-body" style={{ padding: '1rem' }}>
              {analytics.daily.length > 0 ? (
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
                Top Selling Products
              </h6>
              <span className="badge badge-success">By Quantity</span>
            </div>
            <div className="premium-card-body" style={{ padding: '1rem' }}>
              {analytics.topProducts.length > 0 ? (
                <Chart options={topProductsChartOptions} series={topProductsChartSeries} type="bar" height={320} />
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
        <DataTable
          title="Top 10 Best Selling Products"
          icon={BiStar}
          data={analytics.topProducts}
          rowKey={(row) => row.productId}
          searchKeys={['name', 'category']}
          searchPlaceholder="Search products..."
          emptyMessage="No sales in this period"
          pageSize={10}
          columns={[
            { key: 'name', label: 'Product', sortable: true },
            { key: 'category', label: 'Category', sortable: true },
            { key: 'quantity', label: 'Qty Sold', sortable: true, align: 'right' },
            { key: 'revenue', label: 'Revenue', sortable: true, align: 'right', render: (row) => money(row.revenue) },
          ]}
        />
      </div>

      {/* ─── Mobile: Top Products Cards ────────────────────────────────── */}
      <div className="mobile-cards mb-3">
        <h5 className="mb-2" style={{ fontWeight: 700, fontSize: '0.95rem' }}>
          <BiStar size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} />
          Top 10 Best Selling Products
        </h5>
        {analytics.topProducts.length === 0 ? (
          <div className="text-center py-4" style={{ color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem', opacity: 0.5 }}>📦</div>
            No sales in this period
          </div>
        ) : analytics.topProducts.map((product) => (
          <ExpandableCard
            key={product.productId}
            compact={
              <>
                <div className="expandable-card__compact-row">
                  <span className="expandable-card__name">{product.name}</span>
                  <span className="expandable-card__price">{product.quantity} sold</span>
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
                  <span className="expandable-card__row-label">Product</span>
                  <span className="expandable-card__row-dots" />
                  <span className="expandable-card__row-value">{product.name}</span>
                </div>
                <div className="expandable-card__row">
                  <span className="expandable-card__row-label">Category</span>
                  <span className="expandable-card__row-dots" />
                  <span className="expandable-card__row-value">{product.category || '-'}</span>
                </div>
                <div className="expandable-card__row">
                  <span className="expandable-card__row-label">Qty Sold</span>
                  <span className="expandable-card__row-dots" />
                  <span className="expandable-card__row-value">{product.quantity}</span>
                </div>
                <div className="expandable-card__row">
                  <span className="expandable-card__row-label">Revenue</span>
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
          {PRESETS.find(p => p.key === filters.preset)?.label || 'Custom'} Summary:{' '}
          <strong>{count(analytics.summary.totalOrders)}</strong> Orders{' · '}
          <strong>{money(analytics.summary.totalSales)}</strong> Sales{' · '}
          <strong>{money(analytics.summary.totalProfit)}</strong> Profit
        </span>
      </div>

      {/* Recent Sales */}
      <div className="desktop-table">
        <DataTable
          title="Recent Sales"
          icon={BiReceipt}
          data={analytics.recentTransactions}
          rowKey={(row) => row._id}
          searchKeys={['invoiceNo']}
          searchPlaceholder="Search invoice..."
          emptyMessage="No transactions in this period"
          pageSize={10}
          columns={[
            { key: 'invoiceNo', label: 'Invoice', sortable: true },
            { key: 'createdAt', label: 'Date', sortable: true, render: (row) => formatDateTime(row.createdAt) },
            {
              key: 'customer', label: 'Customer', sortable: false,
              render: (row) => row.customer?.name || 'Walk-in Customer',
            },
            { key: 'totalAmount', label: 'Amount', sortable: true, align: 'right', render: (row) => money(row.totalAmount) },
            {
              key: 'paymentMethod', label: 'Payment', sortable: true,
              render: (row) => `${PAYMENT_METHOD_ICONS[row.paymentMethod] || '💵'} ${PAYMENT_METHOD_LABELS[row.paymentMethod] || row.paymentMethod}`,
            },
            {
              key: 'paymentStatus', label: 'Status', sortable: true,
              render: (row) => {
                const st = STATUS_STYLES[row.paymentStatus] || STATUS_STYLES.paid;
                return <span className="reports-status-pill" style={{ background: st.bg, color: st.color }}>{st.label}</span>;
              },
            },
          ]}
        />
      </div>

      {/* ─── Mobile: Recent Sales Cards ────────────────────────────────── */}
      <div className="mobile-cards">
        <h5 className="mb-2" style={{ fontWeight: 700, fontSize: '0.95rem' }}>
          <BiReceipt size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} />
          Recent Sales
        </h5>
        {analytics.recentTransactions.length === 0 ? (
          <div className="text-center py-4" style={{ color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem', opacity: 0.5 }}>🧾</div>
            No transactions in this period
          </div>
        ) : analytics.recentTransactions.map((tx) => {
          const st = STATUS_STYLES[tx.paymentStatus] || STATUS_STYLES.paid;
          return (
            <ExpandableCard
              key={tx._id}
              compact={
                <>
                  <div className="expandable-card__compact-row">
                    <span className="expandable-card__name">{tx.invoiceNo || 'N/A'}</span>
                    <span className="expandable-card__price">{money(tx.totalAmount)}</span>
                  </div>
                  <div className="expandable-card__meta">
                    <span className="expandable-card__meta-item">
                      <BiUser />
                      <span>{tx.customer?.name || 'Walk-in'}</span>
                    </span>
                    <span className="reports-status-pill" style={{ background: st.bg, color: st.color, padding: '2px 8px', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 600 }}>{st.label}</span>
                  </div>
                </>
              }
              expanded={
                <div className="expandable-card__rows">
                  <div className="expandable-card__row">
                    <span className="expandable-card__row-label">Invoice</span>
                    <span className="expandable-card__row-dots" />
                    <span className="expandable-card__row-value">{tx.invoiceNo || 'N/A'}</span>
                  </div>
                  <div className="expandable-card__row">
                    <span className="expandable-card__row-label">Date</span>
                    <span className="expandable-card__row-dots" />
                    <span className="expandable-card__row-value">{formatDateTime(tx.createdAt)}</span>
                  </div>
                  <div className="expandable-card__row">
                    <span className="expandable-card__row-label">Customer</span>
                    <span className="expandable-card__row-dots" />
                    <span className="expandable-card__row-value">{tx.customer?.name || 'Walk-in Customer'}</span>
                  </div>
                  <div className="expandable-card__row">
                    <span className="expandable-card__row-label">Amount</span>
                    <span className="expandable-card__row-dots" />
                    <span className="expandable-card__row-value">{money(tx.totalAmount)}</span>
                  </div>
                  <div className="expandable-card__row">
                    <span className="expandable-card__row-label">Payment</span>
                    <span className="expandable-card__row-dots" />
                    <span className="expandable-card__row-value">{PAYMENT_METHOD_ICONS[tx.paymentMethod] || '💵'} {PAYMENT_METHOD_LABELS[tx.paymentMethod] || tx.paymentMethod}</span>
                  </div>
                  <div className="expandable-card__row">
                    <span className="expandable-card__row-label">Status</span>
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
