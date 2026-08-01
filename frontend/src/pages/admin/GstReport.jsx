import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import StatCard from '../../components/common/StatCard';
import Pagination from '../../components/common/Pagination';
import ExpandableCard from '../../components/common/ExpandableCard';
import { showToast } from '../../utils/toast';
import {
  BiCalendar, BiSearch, BiFile, BiFileBlank, BiRefresh, BiCart, BiReceipt,
  BiWallet, BiRupee, BiError, BiUpArrowAlt, BiDownArrowAlt, BiBuilding,
} from 'react-icons/bi';

// ─── Filter presets (mirrors Reports.jsx exactly) ──────────────────────────
const getDatePresets = (t) => [
  { key: 'today', label: t('common.today') },
  { key: '7d', label: t('common.last7Days') },
  { key: '30d', label: t('common.last30Days') },
  { key: 'month', label: t('common.thisMonth') },
  { key: 'custom', label: t('common.customRange') },
];

const getGstTypeOptions = (t) => [
  { key: 'all', label: t('common.all') },
  { key: 'intra', label: t('gstReportPage.intraState') },
  { key: 'inter', label: t('gstReportPage.interState') },
];

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

// ─── Format helpers ─────────────────────────────────────────────────────
const money = (val) => `₹${Number(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const count = (val) => Number(val || 0).toLocaleString('en-IN');
const formatDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
const toISODate = (d) => d.toISOString().slice(0, 10);

// GST type per row is read straight from what was actually recorded on that
// transaction (its own cgst/sgst/igst, set by splitGst at creation) — not
// re-derived from today's Settings. Same convention as the Purchase Details
// drawer / Supplier Ledger built earlier: never a generic "Tax" label.
const rowGstType = (row) => {
  if ((row.cgst || 0) > 0 || (row.sgst || 0) > 0) return 'intra';
  if ((row.igst || 0) > 0) return 'inter';
  return 'none';
};

const gstTypeBadgeLabel = (type, t) => {
  if (type === 'intra') return t('suppliersPage.gstTypeIntra');
  if (type === 'inter') return t('suppliersPage.gstTypeInter');
  return t('suppliersPage.gstTypeNone');
};

const EMPTY_SUMMARY = { totalTaxable: 0, totalCgst: 0, totalSgst: 0, totalIgst: 0, totalGst: 0, totalSales: 0, totalPurchases: 0, count: 0 };
const EMPTY_OVERVIEW = {
  sales: { summary: EMPTY_SUMMARY },
  purchases: { summary: EMPTY_SUMMARY },
  summary: { totalTaxableValue: 0, totalCgst: 0, totalSgst: 0, totalIgst: 0, totalGst: 0, outputGst: 0, inputGst: 0, netGst: 0 },
};

// ─── CSV export (identical pattern to Reports.jsx's downloadBlob) ─────────
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

// ─── Minimal jsPDF table renderer (no autotable plugin installed) ─────────
// Identical helper to Reports.jsx's drawPdfTable — kept local so this page
// has no dependency on Reports.jsx internals.
const drawPdfTable = (doc, startY, headers, rows, colWidths) => {
  const marginLeft = 14;
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.getWidth();
  const widths = colWidths || headers.map(() => (pageWidth - marginLeft * 2) / headers.length);
  let y = startY;

  const drawHeader = () => {
    doc.setFont(undefined, 'bold');
    doc.setFontSize(8);
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
    if (y > pageHeight - 20) {
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

// ─── Skeleton Loading ───────────────────────────────────────────────────
const GstReportSkeletonLoader = () => (
  <div>
    <style>{`@keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }`}</style>
    <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
      <div style={{ flex: 1 }}>
        <div style={{ height: 28, width: '30%', marginBottom: 8, background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)', backgroundSize: '200% 100%', borderRadius: 8, animation: 'shimmer 1.5s infinite' }} />
        <div style={{ height: 14, width: '20%', background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)', backgroundSize: '200% 100%', borderRadius: 6, animation: 'shimmer 1.5s infinite' }} />
      </div>
    </div>
    <div className="row g-3 mb-3">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="col-6 col-md-4 col-lg-2">
          <div style={{ height: 90, borderRadius: 12, background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />
        </div>
      ))}
    </div>
    <div style={{ height: 56, borderRadius: 12, marginBottom: 16, background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />
    <div style={{ height: 320, borderRadius: 12, background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />
  </div>
);

const TableSkeletonRows = ({ cols }) => (
  <>
    {[1, 2, 3, 4, 5].map((r) => (
      <tr key={r} style={{ opacity: 0.5 }}>
        {Array.from({ length: cols }).map((_, c) => (
          <td key={c} style={{ padding: '0.75rem 1rem' }}>
            <div style={{ height: 10, width: c === 0 ? '70%' : '50%', background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)', backgroundSize: '200% 100%', borderRadius: 4, animation: 'shimmer 1.5s infinite' }} />
          </td>
        ))}
      </tr>
    ))}
  </>
);

// ─── GST Report Page ────────────────────────────────────────────────────
const GstReport = () => {
  const { t } = useTranslation();
  const DATE_PRESETS = getDatePresets(t);
  const GST_TYPE_OPTIONS = getGstTypeOptions(t);

  const [filters, setFilters] = useState({ preset: '30d', customStart: '', customEnd: '', gstType: 'all' });
  const [activeTab, setActiveTab] = useState('sales'); // 'sales' | 'purchases'
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);

  const [shopInfo, setShopInfo] = useState(null);
  const [overview, setOverview] = useState(EMPTY_OVERVIEW);
  const [rows, setRows] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [exportingCsv, setExportingCsv] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  const initialLoadDone = useRef(false);
  const searchTimeoutRef = useRef(null);

  const range = useMemo(
    () => computeRange(filters.preset, filters.customStart, filters.customEnd),
    [filters.preset, filters.customStart, filters.customEnd]
  );

  // Company info + Settings → Tax & GST (state, rates) — fetched once, never
  // hardcoded. Same pattern established for the Supplier Ledger / Purchases
  // drawer this session.
  useEffect(() => {
    api.get('/shops/my', { _skipLoading: true })
      .then(({ data }) => setShopInfo(data.shop || data))
      .catch(() => {});
  }, []);

  const companyState = shopInfo?.settings?.businessState || 'West Bengal';
  const gstEnabled = shopInfo?.settings?.gstEnabled !== false;
  const defaultGstRate = shopInfo?.settings?.defaultGstRate ?? 18;
  const cgstRate = shopInfo?.settings?.cgstRate ?? (defaultGstRate / 2);
  const sgstRate = shopInfo?.settings?.sgstRate ?? (defaultGstRate / 2);
  const igstRate = shopInfo?.settings?.igstRate ?? defaultGstRate;

  // Debounced search — resets to page 1 only when the debounced value
  // actually changes, not on every keystroke.
  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => { if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current); };
  }, [search]);

  const fetchOverview = useCallback(async () => {
    if (!range) return;
    try {
      const params = new URLSearchParams({ startDate: range.startDate, endDate: range.endDate });
      if (filters.gstType !== 'all') params.append('gstType', filters.gstType);
      const { data } = await api.get(`/reports/gst?${params.toString()}`, { _skipLoading: true });
      setOverview(data);
    } catch (err) {
      setError(err.response?.data?.message || t('gstReportPage.loadFailed'));
    }
  }, [range, filters.gstType, t]);

  const fetchDetails = useCallback(async (isInitial) => {
    if (!range) return;
    if (isInitial) setInitialLoading(true); else setRefreshing(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        reportType: activeTab,
        startDate: range.startDate,
        endDate: range.endDate,
        page: String(page),
        limit: '20',
      });
      if (filters.gstType !== 'all') params.append('gstType', filters.gstType);
      if (debouncedSearch) params.append('search', debouncedSearch);
      const { data } = await api.get(`/reports/gst/details?${params.toString()}`, { _skipLoading: true });
      setRows(data.rows || []);
      setTotalPages(data.pages || 1);
      setTotalCount(data.totalCount || 0);
    } catch (err) {
      setError(err.response?.data?.message || t('gstReportPage.loadFailed'));
    } finally {
      setInitialLoading(false);
      setRefreshing(false);
    }
  }, [range, activeTab, filters.gstType, debouncedSearch, page, t]);

  // Initial load — single fetch, no duplicate.
  useEffect(() => {
    if (!initialLoadDone.current) {
      initialLoadDone.current = true;
      fetchOverview();
      fetchDetails(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Overview (dashboard cards + GST summary) only depends on date range +
  // GST type — switching tabs/search/page never re-runs it, since it
  // already covers both sales and purchases together.
  useEffect(() => {
    if (!initialLoadDone.current) return;
    fetchOverview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range, filters.gstType]);

  // Detail table refetches on every filter that actually narrows it,
  // including `page` — explicitly wired here (see plan note re: Sales.jsx's
  // own pagination not always retriggering a fetch).
  useEffect(() => {
    if (!initialLoadDone.current) return;
    fetchDetails(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, range, filters.gstType, debouncedSearch, page]);

  const handleTabChange = (tab) => {
    if (tab === activeTab) return;
    setActiveTab(tab);
    setPage(1);
  };
  const handlePresetChange = (key) => {
    setFilters((f) => ({ ...f, preset: key }));
    setPage(1);
  };
  const handleGstTypeChange = (key) => {
    setFilters((f) => ({ ...f, gstType: key }));
    setPage(1);
  };

  const activeSummary = activeTab === 'sales' ? overview.sales.summary : overview.purchases.summary;
  const isSalesTab = activeTab === 'sales';

  const dashboardCards = isSalesTab ? [
    { icon: BiCart, label: t('gstReportPage.totalSales'), value: count(activeSummary.count), rawValue: activeSummary.count, color: 'primary' },
    { icon: BiReceipt, label: t('gstReportPage.taxableAmount'), value: money(activeSummary.totalTaxable), rawValue: activeSummary.totalTaxable, isCurrency: true, color: 'info' },
    { icon: BiRupee, label: 'CGST', value: money(activeSummary.totalCgst), rawValue: activeSummary.totalCgst, isCurrency: true, color: 'success' },
    { icon: BiRupee, label: 'SGST', value: money(activeSummary.totalSgst), rawValue: activeSummary.totalSgst, isCurrency: true, color: 'success' },
    { icon: BiRupee, label: 'IGST', value: money(activeSummary.totalIgst), rawValue: activeSummary.totalIgst, isCurrency: true, color: 'warning' },
    { icon: BiWallet, label: t('gstReportPage.grandTotal'), value: money(activeSummary.totalSales), rawValue: activeSummary.totalSales, isCurrency: true, color: 'success' },
  ] : [
    { icon: BiCart, label: t('gstReportPage.totalPurchases'), value: count(activeSummary.count), rawValue: activeSummary.count, color: 'primary' },
    { icon: BiReceipt, label: t('gstReportPage.taxableAmount'), value: money(activeSummary.totalTaxable), rawValue: activeSummary.totalTaxable, isCurrency: true, color: 'info' },
    { icon: BiRupee, label: t('gstReportPage.inputCgst'), value: money(activeSummary.totalCgst), rawValue: activeSummary.totalCgst, isCurrency: true, color: 'success' },
    { icon: BiRupee, label: t('gstReportPage.inputSgst'), value: money(activeSummary.totalSgst), rawValue: activeSummary.totalSgst, isCurrency: true, color: 'success' },
    { icon: BiRupee, label: t('gstReportPage.inputIgst'), value: money(activeSummary.totalIgst), rawValue: activeSummary.totalIgst, isCurrency: true, color: 'warning' },
    { icon: BiWallet, label: t('gstReportPage.grandTotal'), value: money(activeSummary.totalPurchases), rawValue: activeSummary.totalPurchases, isCurrency: true, color: 'success' },
  ];

  const isNetPayable = overview.summary.netGst >= 0;

  const columns = isSalesTab
    ? [t('gstReportPage.invoice'), t('common.date'), t('gstReportPage.customer'), t('gstReportPage.state'), t('gstReportPage.gstType'), t('gstReportPage.taxableAmount'), 'CGST', 'SGST', 'IGST', t('gstReportPage.grandTotal')]
    : [t('gstReportPage.invoice'), t('common.date'), t('gstReportPage.supplier'), t('gstReportPage.state'), t('gstReportPage.gstType'), t('gstReportPage.taxableAmount'), 'CGST', 'SGST', 'IGST', t('gstReportPage.grandTotal')];

  // ─── Export: fetch the FULL filtered set (not just the current page) ──
  const fetchFullExportSet = async () => {
    if (!range) return [];
    const params = new URLSearchParams({
      reportType: activeTab,
      startDate: range.startDate,
      endDate: range.endDate,
      page: '1',
      limit: '5000',
    });
    if (filters.gstType !== 'all') params.append('gstType', filters.gstType);
    if (debouncedSearch) params.append('search', debouncedSearch);
    const { data } = await api.get(`/reports/gst/details?${params.toString()}`, { _skipLoading: true });
    return data.rows || [];
  };

  const fileTag = () => range ? `${toISODate(new Date(range.startDate))}_to_${toISODate(new Date(range.endDate))}` : 'report';

  const exportCSV = async () => {
    setExportingCsv(true);
    try {
      const fullRows = await fetchFullExportSet();
      const header = [t('gstReportPage.invoice'), t('common.date'), isSalesTab ? t('gstReportPage.customer') : t('gstReportPage.supplier'), t('gstReportPage.state'), t('gstReportPage.gstType'), t('gstReportPage.taxableAmount'), 'CGST', 'SGST', 'IGST', t('gstReportPage.grandTotal')];
      const dataRows = fullRows.map((r) => [
        r.no || '-', formatDate(r.date), r.partyName || '-', r.partyState || '-',
        gstTypeBadgeLabel(rowGstType(r), t),
        Number(r.taxableAmount || 0).toFixed(2), Number(r.cgst || 0).toFixed(2), Number(r.sgst || 0).toFixed(2), Number(r.igst || 0).toFixed(2), Number(r.totalAmount || 0).toFixed(2),
      ]);
      const csv = [header, ...dataRows].map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
      downloadBlob(csv, 'text/csv;charset=utf-8;', `gst-report-${activeTab}-${fileTag()}.csv`);
      showToast.success(t('toast.csvExported'));
    } catch (err) {
      showToast.error(t('toast.pdfExportFailed'));
    } finally {
      setExportingCsv(false);
    }
  };

  const exportPDF = async () => {
    setExportingPdf(true);
    try {
      const fullRows = await fetchFullExportSet();
      const jsPDF = (await import('jspdf')).default;
      const doc = new jsPDF();

      // ─── Company Information ───────────────────────────────────
      doc.setFontSize(16);
      doc.text(shopInfo?.name || t('gstReportPage.companyInformation'), 14, 15);
      doc.setFontSize(9);
      doc.setTextColor(100);
      let y = 21;
      const addr = shopInfo?.address;
      const addrLine = addr ? [addr.street, addr.city, addr.state, addr.zipCode].filter(Boolean).join(', ') : '';
      if (addrLine) { doc.text(addrLine, 14, y); y += 5; }
      const contactLine = [shopInfo?.phone, shopInfo?.email].filter(Boolean).join(' | ');
      if (contactLine) { doc.text(contactLine, 14, y); y += 5; }
      if (shopInfo?.settings?.gstNumber) { doc.text(`${t('gstReportPage.gstin')}: ${shopInfo.settings.gstNumber}`, 14, y); y += 5; }
      doc.setTextColor(0);

      // ─── Title, period, filters ─────────────────────────────────
      y += 3;
      doc.setFontSize(13);
      doc.text(`${t('gstReportPage.reportTitle')} — ${isSalesTab ? t('gstReportPage.salesGstTab') : t('gstReportPage.purchaseGstTab')}`, 14, y);
      y += 6;
      doc.setFontSize(9);
      doc.setTextColor(100);
      if (range) doc.text(`${t('gstReportPage.reportPeriod')}: ${formatDate(range.startDate)} - ${formatDate(range.endDate)}`, 14, y);
      y += 5;
      const filterLabel = GST_TYPE_OPTIONS.find((o) => o.key === filters.gstType)?.label || '';
      doc.text(`${t('gstReportPage.filtersApplied')}: ${filterLabel}${debouncedSearch ? ` | "${debouncedSearch}"` : ''}`, 14, y);
      y += 5;
      doc.text(`${t('gstReportPage.generatedOn')}: ${formatDate(new Date())}`, 14, y);
      doc.setTextColor(0);
      y += 8;

      // ─── GST Summary ─────────────────────────────────────────────
      doc.setFontSize(11);
      doc.text(t('gstReportPage.gstSummary'), 14, y);
      y += 6;
      doc.setFontSize(9);
      const summaryLines = [
        `${t('gstReportPage.taxableAmount')}: ${money(activeSummary.totalTaxable)}`,
        `CGST: ${money(activeSummary.totalCgst)}   SGST: ${money(activeSummary.totalSgst)}   IGST: ${money(activeSummary.totalIgst)}`,
        `${t('gstReportPage.grandTotal')}: ${money(isSalesTab ? activeSummary.totalSales : activeSummary.totalPurchases)}`,
        `${t('gstReportPage.outputGst')}: ${money(overview.summary.outputGst)}   ${t('gstReportPage.inputGst')}: ${money(overview.summary.inputGst)}`,
        `${isNetPayable ? t('gstReportPage.netGstPayable') : t('gstReportPage.netGstCredit')}: ${money(Math.abs(overview.summary.netGst))}`,
      ];
      summaryLines.forEach((line) => { doc.text(line, 14, y); y += 5.5; });
      y += 4;

      // ─── Full Report Table ───────────────────────────────────────
      const headers = [t('gstReportPage.invoice'), t('common.date'), isSalesTab ? t('gstReportPage.customer') : t('gstReportPage.supplier'), t('gstReportPage.state'), t('gstReportPage.gstType'), t('gstReportPage.taxableAmount'), 'CGST', 'SGST', 'IGST', t('gstReportPage.grandTotal')];
      const colWidths = [20, 18, 26, 16, 22, 20, 16, 16, 16, 20];
      const tableRows = fullRows.map((r) => [
        r.no || '-', formatDate(r.date), r.partyName || '-', r.partyState || '-',
        gstTypeBadgeLabel(rowGstType(r), t).replace(/\s*\(.*\)/, ''),
        Number(r.taxableAmount || 0).toFixed(2), Number(r.cgst || 0).toFixed(2), Number(r.sgst || 0).toFixed(2), Number(r.igst || 0).toFixed(2), Number(r.totalAmount || 0).toFixed(2),
      ]);
      drawPdfTable(doc, y, headers, tableRows, colWidths);

      // ─── Page numbers ─────────────────────────────────────────────
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(120);
        doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.getWidth() - 30, doc.internal.pageSize.getHeight() - 8);
      }

      doc.save(`gst-report-${activeTab}-${fileTag()}.pdf`);
      showToast.success(t('toast.pdfExported'));
    } catch (err) {
      showToast.error(t('toast.pdfExportFailed'));
    } finally {
      setExportingPdf(false);
    }
  };

  if (initialLoading) return <GstReportSkeletonLoader />;

  if (error && rows.length === 0 && !refreshing) {
    return (
      <div className="d-flex flex-column justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
        <div className="premium-card p-5 text-center" style={{ maxWidth: '500px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem', color: 'var(--danger)' }}><BiError /></div>
          <h5 className="mb-2" style={{ fontWeight: 700 }}>{t('gstReportPage.loadFailed')}</h5>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>{error}</p>
          <button className="btn-premium btn-premium-primary" onClick={() => { fetchOverview(); fetchDetails(false); }}>
            <BiRefresh /> {t('common.retry')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* ─── Page Header ─────────────────────────────────────────── */}
      <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
        <div>
          <h4 className="mb-1" style={{ fontWeight: 800 }}>{t('gstReportPage.title')}</h4>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>{t('gstReportPage.subtitle')}</p>
        </div>
        <div className="gst-report-tabs">
          <button type="button" className={`gst-report-tab ${isSalesTab ? 'active' : ''}`} onClick={() => handleTabChange('sales')}>
            <BiUpArrowAlt /> {t('gstReportPage.salesGstTab')}
          </button>
          <button type="button" className={`gst-report-tab ${!isSalesTab ? 'active' : ''}`} onClick={() => handleTabChange('purchases')}>
            <BiDownArrowAlt /> {t('gstReportPage.purchaseGstTab')}
          </button>
        </div>
      </div>

      {/* ─── Company GST Info (from Settings — never hardcoded) ──── */}
      <div className="gst-company-info-bar">
        <span className="gst-company-info-bar__item">
          <BiBuilding /> {t('gstReportPage.businessState')}: <strong>{companyState}</strong>
        </span>
        <span className="gst-company-info-bar__item">
          <BiRupee />
          {gstEnabled ? (
            <>{t('gstReportPage.configuredGstRate')}: <strong>CGST {cgstRate}% + SGST {sgstRate}%</strong> · <strong>IGST {igstRate}%</strong></>
          ) : (
            <strong>{t('gstReportPage.gstDisabled')}</strong>
          )}
        </span>
      </div>

      {/* ─── Dashboard Cards (2 rows × 3 columns) ──────────────────── */}
      <div className="row g-3 mb-3">
        {dashboardCards.slice(0, 3).map((card, idx) => (
          <div key={idx} className="col-6 col-md-4">
            <StatCard icon={card.icon} label={card.label} value={card.value} color={card.color} rawValue={card.rawValue} isCurrency={card.isCurrency} />
          </div>
        ))}
      </div>
      <div className="row g-3 mb-3">
        {dashboardCards.slice(3, 6).map((card, idx) => (
          <div key={idx + 3} className="col-6 col-md-4">
            <StatCard icon={card.icon} label={card.label} value={card.value} color={card.color} rawValue={card.rawValue} isCurrency={card.isCurrency} />
          </div>
        ))}
      </div>

      {/* ─── GST Summary: Output / Input / Net ───────────────────── */}
      <div className="gst-summary-section">
        <div className="gst-summary-group gst-summary-group--output">
          <div className="gst-summary-group__title">{t('gstReportPage.outputGst')}</div>
          <div className="gst-summary-group__row"><span className="gst-summary-group__row-label">CGST</span><span className="gst-summary-group__row-value">{money(overview.sales.summary.totalCgst)}</span></div>
          <div className="gst-summary-group__row"><span className="gst-summary-group__row-label">SGST</span><span className="gst-summary-group__row-value">{money(overview.sales.summary.totalSgst)}</span></div>
          <div className="gst-summary-group__row"><span className="gst-summary-group__row-label">IGST</span><span className="gst-summary-group__row-value">{money(overview.sales.summary.totalIgst)}</span></div>
          <div className="gst-summary-group__total"><span>{t('gstReportPage.outputGst')}</span><span className="gst-summary-group__total-value">{money(overview.summary.outputGst)}</span></div>
        </div>

        <div className="gst-summary-group gst-summary-group--input">
          <div className="gst-summary-group__title">{t('gstReportPage.inputGst')}</div>
          <div className="gst-summary-group__row"><span className="gst-summary-group__row-label">CGST</span><span className="gst-summary-group__row-value">{money(overview.purchases.summary.totalCgst)}</span></div>
          <div className="gst-summary-group__row"><span className="gst-summary-group__row-label">SGST</span><span className="gst-summary-group__row-value">{money(overview.purchases.summary.totalSgst)}</span></div>
          <div className="gst-summary-group__row"><span className="gst-summary-group__row-label">IGST</span><span className="gst-summary-group__row-value">{money(overview.purchases.summary.totalIgst)}</span></div>
          <div className="gst-summary-group__total"><span>{t('gstReportPage.inputGst')}</span><span className="gst-summary-group__total-value">{money(overview.summary.inputGst)}</span></div>
        </div>

        <div className={`gst-summary-group ${isNetPayable ? 'gst-summary-group--net-payable' : 'gst-summary-group--net-credit'}`}>
          <div className="gst-summary-group__title">{t('gstReportPage.netGst')}</div>
          <div className="gst-summary-group__row"><span className="gst-summary-group__row-label">{t('gstReportPage.outputGst')}</span><span className="gst-summary-group__row-value">{money(overview.summary.outputGst)}</span></div>
          <div className="gst-summary-group__row"><span className="gst-summary-group__row-label">{t('gstReportPage.inputGst')}</span><span className="gst-summary-group__row-value">-{money(overview.summary.inputGst)}</span></div>
          <div className="gst-summary-group__total">
            <span>{isNetPayable ? t('gstReportPage.netGstPayable') : t('gstReportPage.netGstCredit')}</span>
            <span className="gst-summary-group__total-value">{money(Math.abs(overview.summary.netGst))}</span>
          </div>
        </div>
      </div>
      <div className="gst-net-formula">
        <span>{t('gstReportPage.outputGst')}</span><span>−</span><span>{t('gstReportPage.inputGst')}</span><span>=</span><span>{t('gstReportPage.netGst')}</span>
      </div>

      {/* ─── Filter Bar ───────────────────────────────────────────── */}
      <div className="premium-card mb-3">
        <div className="premium-card-body reports-filter-card-body">
          <div className="reports-filter-bar">
            <div className="sales-filter search-box">
              <BiSearch className="search-icon" />
              <input
                className="form-control sales-filter-input"
                placeholder={t('gstReportPage.searchPlaceholder')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="sales-date-filters-scroll">
              <div className="sales-date-segmented" role="tablist" aria-label={t('gstReportPage.reportPeriod')}>
                {DATE_PRESETS.map((p, idx) => (
                  <React.Fragment key={p.key}>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={filters.preset === p.key}
                      className={`sales-date-pill ${filters.preset === p.key ? 'active' : ''}`}
                      onClick={() => handlePresetChange(p.key)}
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
                  <input type="date" className="form-control sales-filter-input" style={{ paddingLeft: '30px' }} value={filters.customStart} onChange={(e) => setFilters((f) => ({ ...f, customStart: e.target.value }))} />
                </div>
                <div className="sales-filter">
                  <BiCalendar size={14} className="sales-filter-icon-abs" />
                  <input type="date" className="form-control sales-filter-input" style={{ paddingLeft: '30px' }} value={filters.customEnd} onChange={(e) => setFilters((f) => ({ ...f, customEnd: e.target.value }))} />
                </div>
              </>
            )}

            <div className="sales-date-segmented" role="tablist" aria-label={t('gstReportPage.gstType')}>
              {GST_TYPE_OPTIONS.map((o) => (
                <button
                  key={o.key}
                  type="button"
                  role="tab"
                  aria-selected={filters.gstType === o.key}
                  className={`sales-date-pill ${filters.gstType === o.key ? 'active' : ''}`}
                  onClick={() => handleGstTypeChange(o.key)}
                >
                  <span>{o.label}</span>
                </button>
              ))}
            </div>

            <div className="reports-export-group">
              <button type="button" className="btn-premium btn-premium-secondary btn-premium-sm" onClick={exportCSV} disabled={exportingCsv} title={`${t('common.export')} ${t('common.csv')}`}>
                {exportingCsv ? <span className="spinner-border spinner-border-sm" /> : <BiFile />} {t('gstReportPage.exportCsv')}
              </button>
              <button type="button" className="btn-premium btn-premium-secondary btn-premium-sm" onClick={exportPDF} disabled={exportingPdf} title={`${t('common.export')} ${t('common.pdf')}`}>
                {exportingPdf ? <span className="spinner-border spinner-border-sm" /> : <BiFileBlank />} {t('gstReportPage.exportPdf')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Desktop Table ────────────────────────────────────────── */}
      <div className={`table-container gst-report-table desktop-table ${refreshing ? 'is-refreshing' : 'content-visible'}`}>
        <div className="sales-table-scroll">
          <table className="sales-table">
            <thead>
              <tr>
                {columns.map((c, i) => (
                  <th key={i} className={i >= 5 ? 'gst-cell-amount' : ''}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {refreshing ? (
                <TableSkeletonRows cols={columns.length} />
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length}>
                    <div className="sales-empty-state">
                      <span className="sales-empty-icon">🧾</span>
                      <p>{t('gstReportPage.noRecordsFound')}</p>
                    </div>
                  </td>
                </tr>
              ) : rows.map((r) => {
                const type = rowGstType(r);
                const cgstAmount = Number(r.cgst || 0);
                const sgstAmount = Number(r.sgst || 0);
                const igstAmount = Number(r.igst || 0);
                return (
                  <tr key={r._id}>
                    <td><span className="sales-invoice-badge">{r.no || '-'}</span></td>
                    <td>{formatDate(r.date)}</td>
                    <td>{r.partyName || '-'}</td>
                    <td style={{ color: '#475569', fontWeight: 500 }}>{r.partyState || '-'}</td>
                    <td><span className={`gst-type-badge gst-type-badge--${type}`}>{gstTypeBadgeLabel(type, t)}</span></td>
                    <td className="gst-cell-amount">{money(r.taxableAmount)}</td>
                    <td className="gst-cell-amount" style={{ color: cgstAmount > 0 ? '#2563EB' : '#94A3B8', fontWeight: cgstAmount > 0 ? 600 : 500 }}>{money(r.cgst)}</td>
                    <td className="gst-cell-amount" style={{ color: sgstAmount > 0 ? '#2563EB' : '#94A3B8', fontWeight: sgstAmount > 0 ? 600 : 500 }}>{money(r.sgst)}</td>
                    <td className="gst-cell-amount" style={{ color: igstAmount > 0 ? '#EA580C' : '#94A3B8', fontWeight: igstAmount > 0 ? 600 : 500 }}>{money(r.igst)}</td>
                    <td className="gst-cell-amount" style={{ color: '#059669', fontWeight: 700 }}>{money(r.totalAmount)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── Mobile Cards ─────────────────────────────────────────── */}
      <div className="mobile-cards">
        {refreshing ? (
          <div className="text-center py-5" style={{ color: 'var(--text-muted)' }}>
            <div className="spinner-border spinner-border-sm me-2" /> {t('common.loading')}
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-5" style={{ color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem', opacity: 0.35 }}>🧾</div>
            <h5 style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{t('gstReportPage.noRecordsFound')}</h5>
          </div>
        ) : rows.map((r) => {
          const type = rowGstType(r);
          const cgstAmount = Number(r.cgst || 0);
          const sgstAmount = Number(r.sgst || 0);
          const igstAmount = Number(r.igst || 0);
          return (
            <ExpandableCard
              key={r._id}
              compact={
                <>
                  <div className="expandable-card__compact-row">
                    <span className="expandable-card__name">{r.no || '-'}</span>
                    <span className="expandable-card__price" style={{ color: '#059669', fontWeight: 700 }}>{money(r.totalAmount)}</span>
                  </div>
                  <div className="expandable-card__meta">
                    <span className="expandable-card__meta-item"><BiCalendar /><span>{formatDate(r.date)}</span></span>
                    <span className={`gst-type-badge gst-type-badge--${type}`}>{gstTypeBadgeLabel(type, t)}</span>
                  </div>
                </>
              }
              expanded={
                <div className="expandable-card__rows">
                  <div className="expandable-card__row"><span className="expandable-card__row-label">{isSalesTab ? t('gstReportPage.customer') : t('gstReportPage.supplier')}</span><span className="expandable-card__row-dots" /><span className="expandable-card__row-value">{r.partyName || '-'}</span></div>
                  <div className="expandable-card__row"><span className="expandable-card__row-label">{t('gstReportPage.state')}</span><span className="expandable-card__row-dots" /><span className="expandable-card__row-value" style={{ color: '#475569', fontWeight: 500 }}>{r.partyState || '-'}</span></div>
                  <div className="expandable-card__row"><span className="expandable-card__row-label">{t('gstReportPage.taxableAmount')}</span><span className="expandable-card__row-dots" /><span className="expandable-card__row-value">{money(r.taxableAmount)}</span></div>
                  <div className="expandable-card__row"><span className="expandable-card__row-label">CGST</span><span className="expandable-card__row-dots" /><span className="expandable-card__row-value" style={{ color: cgstAmount > 0 ? '#2563EB' : '#94A3B8', fontWeight: cgstAmount > 0 ? 600 : 500 }}>{money(r.cgst)}</span></div>
                  <div className="expandable-card__row"><span className="expandable-card__row-label">SGST</span><span className="expandable-card__row-dots" /><span className="expandable-card__row-value" style={{ color: sgstAmount > 0 ? '#2563EB' : '#94A3B8', fontWeight: sgstAmount > 0 ? 600 : 500 }}>{money(r.sgst)}</span></div>
                  <div className="expandable-card__row"><span className="expandable-card__row-label">IGST</span><span className="expandable-card__row-dots" /><span className="expandable-card__row-value" style={{ color: igstAmount > 0 ? '#EA580C' : '#94A3B8', fontWeight: igstAmount > 0 ? 600 : 500 }}>{money(r.igst)}</span></div>
                  <div className="expandable-card__row"><span className="expandable-card__row-label">{t('gstReportPage.grandTotal')}</span><span className="expandable-card__row-dots" /><span className="expandable-card__row-value" style={{ color: '#059669', fontWeight: 700 }}>{money(r.totalAmount)}</span></div>
                </div>
              }
            />
          );
        })}
      </div>

      <Pagination page={page} totalPages={totalPages} totalCount={totalCount} pageSize={20} onPageChange={setPage} />
    </div>
  );
};

export default GstReport;
