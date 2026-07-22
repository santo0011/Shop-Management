import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import SAPageHeader from '../../components/common/SAPageHeader';
import { BiSearch, BiHistory, BiRefresh, BiUser, BiTime, BiGlobe } from 'react-icons/bi';

const ActivityLogs = () => {
  const { t } = useTranslation();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const perPage = 15;

  useEffect(() => { fetchLogs(); }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/super-admin/activity-logs', { _skipLoading: true });
      setLogs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = logs.filter((log) =>
    log.user?.name?.toLowerCase().includes(search.toLowerCase()) ||
    log.action?.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

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

      {loading ? (
        <div className="text-center py-5"><div className="spinner-border spinner-border-sm me-2" /> {t('common.loading')}</div>
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