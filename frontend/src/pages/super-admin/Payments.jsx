import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import SAPageHeader from '../../components/common/SAPageHeader';
import { BiSearch, BiDollar, BiRefresh, BiStore, BiCreditCard, BiCalendar } from 'react-icons/bi';

const Payments = () => {
  const { t } = useTranslation();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const perPage = 10;

  useEffect(() => { fetchPayments(); }, []);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/payments', { _skipLoading: true });
      setPayments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = payments.filter((p) =>
    p.shop?.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.plan?.name?.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  return (
    <div>
      <SAPageHeader
        title={t('nav.payments')}
        subtitle="View payment history from all shops"
        actions={
          <button className="btn-premium btn-premium-secondary btn-premium-sm" onClick={fetchPayments}>
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
          <div style={{ fontSize: '3rem', marginBottom: '0.5rem', opacity: 0.5 }}><BiDollar /></div>
          <p>{t('common.noResults')}</p>
        </div>
      ) : (
        <>
          <div className="table-container">
            <div className="table-responsive">
              <table className="table-custom">
                <thead>
                  <tr>
                    <th>{t('manageShopsPage.shop')}</th>
                    <th>{t('managePlansPage.planName')}</th>
                    <th>{t('common.amount')}</th>
                    <th>{t('sale.paymentMethod')}</th>
                    <th>{t('common.status')}</th>
                    <th>{t('common.date')}</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((p) => (
                    <tr key={p._id}>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <BiStore style={{ color: 'var(--primary)' }} />
                          <span style={{ fontWeight: 600 }}>{p.shop?.name || 'N/A'}</span>
                        </div>
                      </td>
                      <td>{p.plan?.name || 'N/A'}</td>
                      <td style={{ fontWeight: 700 }}>₹{Number(p.amount || 0).toLocaleString('en-IN')}</td>
                      <td>
                        <div className="d-flex align-items-center gap-1">
                          <BiCreditCard style={{ color: 'var(--text-muted)' }} />
                          {p.method || 'N/A'}
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${p.status === 'completed' ? 'badge-success' : p.status === 'pending' ? 'badge-warning' : 'badge-danger'}`}>
                          {p.status || 'N/A'}
                        </span>
                      </td>
                      <td>
                        <div className="d-flex align-items-center gap-1" style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                          <BiCalendar /> {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : 'N/A'}
                        </div>
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

export default Payments;