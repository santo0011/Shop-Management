import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import SAPageHeader from '../../components/common/SAPageHeader';
import { BiSearch, BiHistory, BiRefresh, BiUser, BiTime, BiGlobe } from 'react-icons/bi';

// ─── Skeleton Loader ──────────────────────────────────────────
const ActivityLogsSkeletonLoader = () => (
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

    {/* Search skeleton */}
    <div className="list-filters-card mb-3">
      <div style={{
        height: 36, width: 280,
        background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
        backgroundSize: '200% 100%', borderRadius: 8,
        animation: 'shimmer 1.5s infinite',
      }} />
    </div>

    {/* Table skeleton */}
    <div className="table-container" style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-lg)', overflow: 'hidden', background: 'var(--bg-card)' }}>
      <div style={{ display: 'flex', padding: '0.85rem 1rem', background: 'var(--bg-input)', borderBottom: '1px solid var(--border-color)', gap: '1rem' }}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} style={{
            flex: 1, height: 12,
            background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
            backgroundSize: '200% 100%', borderRadius: 4,
            animation: 'shimmer 1.5s infinite',
          }} />
        ))}
      </div>
      {[1, 2, 3, 4, 5].map((r) => (
        <div key={r} style={{
          display: 'flex', padding: '0.75rem 1rem', gap: '1rem',
          borderTop: '1px solid var(--border-color)',
        }}>
          {[1, 2, 3, 4].map((c) => (
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
);

// ─── Inline Table Skeleton Rows ──────────────────────────────
const TableSkeletonRows = ({ columns = 4 }) => (
  <>
    {[1, 2, 3, 4].map((r) => (
      <tr key={r} style={{ opacity: 0.5 }}>
        {[1, 2, 3, 4].map((c) => (
          <td key={c} style={{ padding: '0.75rem 1rem' }}>
            <div style={{
              height: 10, width: c === 1 ? 100 : c === 4 ? 120 : '35%',
              background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
              backgroundSize: '200% 100%', borderRadius: 4,
              animation: 'shimmer 1.5s infinite',
            }} />
          </td>
        ))}
      </tr>
    ))}
  </>
);

const ActivityLogs = () => {
  const { t } = useTranslation();
  const [logs, setLogs] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const perPage = 15;
  const isFirstLoad = useRef(true);

  const fetchLogs = useCallback(async () => {
    if (isFirstLoad.current) {
      setInitialLoading(true);
    } else {
      setRefreshing(true);
    }
    try {
      const { data } = await api.get('/super-admin/activity-logs', { _skipLoading: true });
      setLogs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setInitialLoading(false);
      setRefreshing(false);
      if (isFirstLoad.current) isFirstLoad.current = false;
    }
  }, []);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const filtered = logs.filter((log) =>
    log.user?.name?.toLowerCase().includes(search.toLowerCase()) ||
    log.action?.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  if (initialLoading) return <ActivityLogsSkeletonLoader />;

  return (
    <div>
      <SAPageHeader
        title={t('nav.activityLogs')}
        subtitle="Track all admin activities"
        actions={
          <button className="btn-premium btn-premium-secondary btn-premium-sm" onClick={fetchLogs}>
            <BiRefresh /> {t('common.refresh')}
          </button>
        }
      />

      <div className="list-filters-card mb-3">
        <div className="list-filter-field list-search-field">
          <div className="search-box">
            <BiSearch className="search-icon" />
            <input
              className="form-control list-filter-input"
              placeholder={t('common.search') + '...'}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
        </div>
      </div>

      {refreshing ? (
        <div className="table-container">
          <div className="table-responsive">
            <table className="table-custom">
              <thead>
                <tr>
                  <th><BiUser style={{ marginRight: 4 }} />{t('common.user')}</th>
                  <th>{t('common.actions')}</th>
                  <th>IP Address</th>
                  <th><BiTime style={{ marginRight: 4 }} />{t('common.dateTime')}</th>
                </tr>
              </thead>
              <tbody>
                <TableSkeletonRows columns={4} />
              </tbody>
            </table>
          </div>
        </div>
      ) : paginated.length === 0 ? (
        <div className="text-center py-5" style={{ color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.5rem', opacity: 0.5 }}><BiHistory /></div>
          <p>{t('common.noResults')}</p>
        </div>
      ) : (
        <>
          <div className="table-container">
            <div className="table-responsive">
              <table className="table-custom">
                <thead>
                  <tr>
                    <th><BiUser style={{ marginRight: 4 }} />{t('common.user')}</th>
                    <th>{t('common.actions')}</th>
                    <th>IP Address</th>
                    <th><BiTime style={{ marginRight: 4 }} />{t('common.dateTime')}</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((log) => (
                    <tr key={log._id}>
                      <td style={{ fontWeight: 600 }}>{log.user?.name || 'N/A'}</td>
                      <td>
                        <span className="badge badge-primary">{log.action}</span>
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                        <BiGlobe style={{ marginRight: 4 }} />{log.ip || 'N/A'}
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                        {log.createdAt ? new Date(log.createdAt).toLocaleString() : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {totalPages > 1 && (
            <div className="d-flex justify-content-between align-items-center mt-3">
              <small style={{ color: 'var(--text-muted)' }}>{t('common.page')} {page} {t('common.of')} {totalPages}</small>
              <div className="d-flex gap-1">
                <button className="btn-premium btn-premium-secondary btn-premium-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>{t('common.previous')}</button>
                <button className="btn-premium btn-premium-secondary btn-premium-sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>{t('common.next')}</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ActivityLogs;