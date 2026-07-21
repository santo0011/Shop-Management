import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { BiFilter, BiX, BiPrinter, BiDownload, BiDollar, BiCart, BiCreditCard, BiUndo } from 'react-icons/bi';
import api from '../../../services/api';

// ─── Helpers ───────────────────────────────────────────────────
const formatCurrency = (val) => `₹${(val || 0).toFixed(2)}`;
const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const formatDateTime = (d) =>
  d
    ? new Date(d).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

const datePresets = (t) => [
  { label: t('customersPage.today'), value: 'today' },
  { label: t('common.last7Days'), value: '7d' },
  { label: t('common.last30Days'), value: '30d' },
  { label: t('common.thisMonth'), value: 'month' },
  { label: t('common.customRange'), value: 'custom' },
];

const getDateRange = (preset) => {
  const now = new Date();
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  switch (preset) {
    case 'today':
      return { startDate: start, endDate: now };
    case '7d':
      start.setDate(start.getDate() - 7);
      return { startDate: start, endDate: now };
    case '30d':
      start.setDate(start.getDate() - 30);
      return { startDate: start, endDate: now };
    case 'month':
      start.setDate(1);
      return { startDate: start, endDate: now };
    default:
      return { startDate: null, endDate: null };
  }
};

const typeStyles = {
  sale: { bg: 'rgba(108,99,255,0.12)', color: '#6C63FF', labelKey: 'customer.sale' },
  payment: { bg: 'rgba(0,217,166,0.12)', color: '#00D9A6', labelKey: 'customersPage.pay' },
  return: { bg: 'rgba(255,181,69,0.12)', color: '#F39C12', labelKey: 'sale.return' },
};

const CustomerLedger = ({ customerId, t, refreshKey }) => {
  const [ledgerData, setLedgerData] = useState({ customer: {}, summary: {}, entries: [] });
  const [loading, setLoading] = useState(true);
  const [datePreset, setDatePreset] = useState('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const tableRef = useRef(null);

  const fetchLedger = useCallback(async () => {
    if (!customerId) return;
    setLoading(true);
    try {
      let params = {};
      if (datePreset === 'custom') {
        if (customStart) params.startDate = customStart;
        if (customEnd) params.endDate = customEnd;
      } else if (datePreset !== 'all') {
        const range = getDateRange(datePreset);
        if (range.startDate) params.startDate = range.startDate.toISOString();
        if (range.endDate) params.endDate = range.endDate.toISOString();
      }
      const { data } = await api.get(`/customers/${customerId}/ledger`, {
        params,
        _skipLoading: true,
      });
      setLedgerData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [customerId, datePreset, customStart, customEnd]);

  useEffect(() => {
    fetchLedger();
  }, [fetchLedger, refreshKey]);

  const handlePrint = () => {
    const win = window.open('', '_blank');
    if (!win) return;
    const styles = Array.from(document.styleSheets)
      .map((ss) => {
        try {
          return Array.from(ss.cssRules || []).map((r) => r.cssText).join('');
        } catch { return ''; }
      })
      .join('');

    win.document.write(`
      <html><head><title>Ledger - ${ledgerData.customer?.name || ''}</title>
      <style>${styles}
        body { padding: 20px; font-family: sans-serif; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 8px 10px; border: 1px solid #ddd; text-align: left; font-size: 13px; }
        th { background: #6C63FF; color: #fff; }
        .summary { display: flex; gap: 20px; margin-bottom: 20px; flex-wrap: wrap; }
        .summary-card { padding: 12px 20px; border-radius: 8px; border: 1px solid #eee; min-width: 140px; }
        .badge-type { padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 600; }
        @media print { .no-print { display: none; } }
      </style></head><body>
      <h2>Ledger - ${ledgerData.customer?.name || ''}</h2>
      <p>${ledgerData.customer?.phone || ''}</p>
      <div class="summary">
        <div class="summary-card"><strong>Total Purchase:</strong> ${formatCurrency(ledgerData.summary.totalPurchase)}</div>
        <div class="summary-card"><strong>Total Paid:</strong> ${formatCurrency(ledgerData.summary.totalPaid)}</div>
        <div class="summary-card"><strong>Current Due:</strong> ${formatCurrency(ledgerData.summary.currentDue)}</div>
      </div>
      <table>
        <thead><tr><th>#</th><th>Date & Time</th><th>Invoice</th><th>Type</th><th>Debit</th><th>Credit</th><th>Balance</th><th>Note</th></tr></thead>
        <tbody>
          ${ledgerData.entries.map((e, i) => `
            <tr>
              <td>${i + 1}</td>
              <td>${formatDateTime(e.date)}</td>
              <td>${e.invoiceNo || '—'}</td>
              <td>${e.type.toUpperCase()}</td>
              <td>${e.debit > 0 ? formatCurrency(e.debit) : '—'}</td>
              <td>${e.credit > 0 ? formatCurrency(e.credit) : '—'}</td>
              <td style="font-weight:700;color:${e.balance > 0 ? '#e74c3c' : '#2ecc71'}">${formatCurrency(e.balance)}</td>
              <td>${e.note || '—'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <script>window.print();</script>
      </body></html>
    `);
    win.document.close();
  };

  const handleDownloadCSV = () => {
    const headers = ['#', 'Date & Time', 'Invoice No', 'Type', 'Debit', 'Credit', 'Balance', 'Note'];
    const rows = ledgerData.entries.map((e, i) => [
      i + 1,
      formatDateTime(e.date),
      e.invoiceNo || '',
      e.type.toUpperCase(),
      e.debit || '',
      e.credit || '',
      e.balance,
      e.note || '',
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ledger-${ledgerData.customer?.name || 'customer'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Filter button style
  const filterBtnStyle = (active) => ({
    padding: '0.3rem 0.75rem',
    fontSize: '0.75rem',
    fontWeight: 600,
    border: 'none',
    borderRadius: '8px',
    background: active ? 'var(--primary)' : 'var(--bg-card)',
    color: active ? '#fff' : 'var(--text-secondary)',
    cursor: 'pointer',
    transition: 'all 0.15s',
    whiteSpace: 'nowrap',
  });

  const summary = ledgerData.summary;
  const entries = ledgerData.entries;

  return (
    <div>
      {/* ─── Summary Cards ──────────────────────────────────── */}
      <div className="row g-3 mb-4">
        <div className="col-12 col-sm-6 col-xl-4">
          <div className="stat-card stat-card-modern stat-primary" style={{ padding: '1.15rem 1.25rem', cursor: 'default' }}>
            <div className="d-flex align-items-center gap-3">
              <div className="stat-icon-wrapper" style={{ width: '40px', height: '40px', fontSize: '1.2rem', flexShrink: 0 }}>
                <BiCart />
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="stat-value" style={{ fontSize: '1.3rem', fontWeight: 800, lineHeight: 1.2 }}>
                  {formatCurrency(summary.totalPurchase)}
                </div>
                <div className="stat-label" style={{ fontSize: '0.75rem', fontWeight: 500 }}>
                  {t('customersPage.totalPurchase')}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-12 col-sm-6 col-xl-4">
          <div className="stat-card stat-card-modern stat-success" style={{ padding: '1.15rem 1.25rem', cursor: 'default' }}>
            <div className="d-flex align-items-center gap-3">
              <div className="stat-icon-wrapper" style={{ width: '40px', height: '40px', fontSize: '1.2rem', flexShrink: 0 }}>
                <BiCreditCard />
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="stat-value" style={{ fontSize: '1.3rem', fontWeight: 800, lineHeight: 1.2 }}>
                  {formatCurrency(summary.totalPaid)}
                </div>
                <div className="stat-label" style={{ fontSize: '0.75rem', fontWeight: 500 }}>
                  {t('customersPage.totalPaid')}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-12 col-sm-6 col-xl-4">
          <div className={`stat-card stat-card-modern ${summary.currentDue > 0 ? 'stat-danger' : 'stat-success'}`} style={{ padding: '1.15rem 1.25rem', cursor: 'default' }}>
            <div className="d-flex align-items-center gap-3">
              <div className="stat-icon-wrapper" style={{ width: '40px', height: '40px', fontSize: '1.2rem', flexShrink: 0 }}>
                <BiDollar />
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="stat-value" style={{ fontSize: '1.3rem', fontWeight: 800, lineHeight: 1.2 }}>
                  {formatCurrency(summary.currentDue)}
                </div>
                <div className="stat-label" style={{ fontSize: '0.75rem', fontWeight: 500 }}>
                  {t('common.due')}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Filters & Actions ──────────────────────────────── */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: '10px', marginBottom: '1rem',
      }}>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
          <button style={filterBtnStyle(datePreset === 'all')} onClick={() => { setDatePreset('all'); setShowFilters(false); }}>
            {t('common.all')}
          </button>
          {datePresets(t).map((p) => (
            <button
              key={p.value}
              style={filterBtnStyle(datePreset === p.value)}
              onClick={() => {
                setDatePreset(p.value);
                if (p.value === 'custom') setShowFilters(true);
                else setShowFilters(false);
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button className="btn-premium btn-premium-secondary" onClick={handlePrint}
            style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}>
            <BiPrinter style={{ marginRight: 4 }} /> {t('common.print')}
          </button>
          <button className="btn-premium btn-premium-secondary" onClick={handleDownloadCSV}
            style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}>
            <BiDownload style={{ marginRight: 4 }} /> CSV
          </button>
        </div>
      </div>

      {/* Custom date range */}
      {showFilters && (
        <div style={{
          display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap',
          padding: '0.75rem 1rem', borderRadius: 'var(--border-radius-md)',
          background: 'var(--bg-card)', border: '1px solid var(--border-light)',
          marginBottom: '1rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)' }}>{t('common.from')}:</span>
            <input type="date" className="form-control" value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              style={{ padding: '0.3rem 0.5rem', fontSize: '0.78rem', width: '150px', minHeight: '34px' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)' }}>{t('common.to')}:</span>
            <input type="date" className="form-control" value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              style={{ padding: '0.3rem 0.5rem', fontSize: '0.78rem', width: '150px', minHeight: '34px' }} />
          </div>
          <button className="btn-premium btn-premium-primary" onClick={fetchLedger}
            style={{ padding: '0.3rem 0.8rem', fontSize: '0.75rem' }}>
            <BiFilter style={{ marginRight: 4 }} /> {t('common.filter')}
          </button>
        </div>
      )}

      {/* ─── Ledger Table ───────────────────────────────────── */}
      <div className="table-container" style={{ overflowX: 'auto' }}>
        <div className="table-responsive">
          <table className="table-custom mb-0" ref={tableRef} style={{ minWidth: '700px' }}>
            <thead>
              <tr>
                <th style={{ width: '40px' }}>#</th>
                <th style={{ minWidth: '140px' }}>{t('customersPage.dateTime')}</th>
                <th style={{ minWidth: '110px' }}>{t('sale.invoiceNo')}</th>
                <th style={{ minWidth: '100px' }}>{t('customersPage.transactionType')}</th>
                <th style={{ minWidth: '90px' }}>{t('customersPage.debit')}</th>
                <th style={{ minWidth: '90px' }}>{t('customersPage.credit')}</th>
                <th style={{ minWidth: '100px' }}>{t('customersPage.balance')}</th>
                <th style={{ minWidth: '120px' }}>{t('common.notes')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-4" style={{ color: 'var(--text-muted)' }}>
                    <div className="spinner-border spinner-border-sm me-2" /> {t('common.loading')}
                  </td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-4" style={{ color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: '1.5rem', marginBottom: '0.3rem', opacity: 0.5 }}>📒</div>
                    {t('customersPage.noLedgerEntries')}
                  </td>
                </tr>
              ) : (
                entries.map((entry, idx) => {
                  const ts = typeStyles[entry.type] || typeStyles.sale;
                  return (
                    <tr key={idx} style={{ background: idx % 2 === 0 ? 'var(--bg-card)' : 'transparent' }}>
                      <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{idx + 1}</td>
                      <td style={{ fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                          {formatDate(entry.date)}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          {entry.date ? new Date(entry.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''}
                        </div>
                      </td>
                      <td>
                        {entry.invoiceNo ? (
                          <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {entry.invoiceNo}
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>—</span>
                        )}
                      </td>
                      <td>
                        <span style={{
                          display: 'inline-block',
                          padding: '2px 10px',
                          borderRadius: '10px',
                          background: ts.bg,
                          color: ts.color,
                          fontSize: '0.72rem',
                          fontWeight: 600,
                        }}>
                          {t(ts.labelKey)}
                        </span>
                      </td>
                      <td style={{ fontWeight: 700, color: entry.debit > 0 ? '#6C63FF' : 'var(--text-muted)', fontSize: '0.85rem' }}>
                        {entry.debit > 0 ? formatCurrency(entry.debit) : '—'}
                      </td>
                      <td style={{ fontWeight: 700, color: entry.credit > 0 ? '#00D9A6' : 'var(--text-muted)', fontSize: '0.85rem' }}>
                        {entry.credit > 0 ? formatCurrency(entry.credit) : '—'}
                      </td>
                      <td style={{
                        fontWeight: 800,
                        color: entry.balance > 0 ? '#e74c3c' : '#2ecc71',
                        fontSize: '0.88rem',
                      }}>
                        {formatCurrency(entry.balance)}
                      </td>
                      <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {entry.note || '—'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile card view */}
      {!loading && entries.length > 0 && (
        <div className="mobile-cards" style={{ marginTop: '1rem' }}>
          {entries.map((entry, idx) => {
            const ts = typeStyles[entry.type] || typeStyles.sale;
            return (
              <div key={idx} style={{
                padding: '12px', borderRadius: 'var(--border-radius-md)',
                background: 'var(--bg-card)', border: '1px solid var(--border-light)',
                marginBottom: '8px', fontSize: '0.78rem',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{
                    padding: '2px 10px', borderRadius: '10px',
                    background: ts.bg, color: ts.color,
                    fontSize: '0.72rem', fontWeight: 600,
                  }}>
                    {t(ts.labelKey)}
                  </span>
                  <span style={{
                    fontWeight: 800, fontSize: '0.88rem',
                    color: entry.balance > 0 ? '#e74c3c' : '#2ecc71',
                  }}>
                    {formatCurrency(entry.balance)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  <span>📅 {formatDateTime(entry.date)}</span>
                  {entry.invoiceNo && <span>🧾 {entry.invoiceNo}</span>}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                  <span style={{ color: entry.debit > 0 ? '#6C63FF' : 'var(--text-muted)', fontWeight: 600 }}>
                    {t('customersPage.debit')}: {entry.debit > 0 ? formatCurrency(entry.debit) : '—'}
                  </span>
                  <span style={{ color: entry.credit > 0 ? '#00D9A6' : 'var(--text-muted)', fontWeight: 600 }}>
                    {t('customersPage.credit')}: {entry.credit > 0 ? formatCurrency(entry.credit) : '—'}
                  </span>
                </div>
                {entry.note && (
                  <div style={{ marginTop: '4px', fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    📝 {entry.note}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CustomerLedger;