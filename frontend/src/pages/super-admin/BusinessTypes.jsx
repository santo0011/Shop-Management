import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import SAPageHeader from '../../components/common/SAPageHeader';
import { BiSearch, BiCategory, BiCheck, BiX, BiRefresh } from 'react-icons/bi';

// ─── Skeleton Loader ──────────────────────────────────────────
const BusinessTypesSkeletonLoader = () => (
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

    {/* Cards grid skeleton */}
    <div className="row g-3">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="col-md-4 col-sm-6">
          <div className="premium-card">
            <div className="premium-card-body">
              <div style={{
                height: 20, width: '60%', marginBottom: 12,
                background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
                backgroundSize: '200% 100%', borderRadius: 6,
                animation: 'shimmer 1.5s infinite',
              }} />
              <div style={{
                height: 12, width: '80%', marginBottom: 12,
                background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
                backgroundSize: '200% 100%', borderRadius: 4,
                animation: 'shimmer 1.5s infinite',
              }} />
              <div style={{
                height: 22, width: 60,
                background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
                backgroundSize: '200% 100%', borderRadius: 20,
                animation: 'shimmer 1.5s infinite',
              }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

// ─── Inline Card Skeleton ─────────────────────────────────────
const CardSkeletonGrid = () => (
  <div className="row g-3">
    {[1, 2, 3, 4, 5, 6].map((i) => (
      <div key={i} className="col-md-4 col-sm-6">
        <div className="premium-card">
          <div className="premium-card-body" style={{ opacity: 0.5 }}>
            <div style={{
              height: 20, width: '60%', marginBottom: 12,
              background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
              backgroundSize: '200% 100%', borderRadius: 6,
              animation: 'shimmer 1.5s infinite',
            }} />
            <div style={{
              height: 12, width: '80%', marginBottom: 12,
              background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
              backgroundSize: '200% 100%', borderRadius: 4,
              animation: 'shimmer 1.5s infinite',
            }} />
            <div style={{
              height: 22, width: 60,
              background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
              backgroundSize: '200% 100%', borderRadius: 20,
              animation: 'shimmer 1.5s infinite',
            }} />
          </div>
        </div>
      </div>
    ))}
  </div>
);

const BusinessTypes = () => {
  const { t } = useTranslation();
  const [types, setTypes] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const isFirstLoad = useRef(true);

  const fetchTypes = useCallback(async () => {
    if (isFirstLoad.current) {
      setInitialLoading(true);
    } else {
      setRefreshing(true);
    }
    try {
      const { data } = await api.get('/business-types', { _skipLoading: true });
      setTypes(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setInitialLoading(false);
      setRefreshing(false);
      if (isFirstLoad.current) isFirstLoad.current = false;
    }
  }, []);

  useEffect(() => { fetchTypes(); }, [fetchTypes]);

  const toggleStatus = async (id, currentStatus) => {
    try {
      await api.put(`/business-types/${id}`, { active: !currentStatus }, { _skipLoading: true });
      fetchTypes();
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = types.filter((t) =>
    t.name?.toLowerCase().includes(search.toLowerCase())
  );

  if (initialLoading) return <BusinessTypesSkeletonLoader />;

  return (
    <div>
      <SAPageHeader
        title={t('nav.businessTypes')}
        subtitle="Manage business types for shops"
        actions={
          <button className="btn-premium btn-premium-secondary btn-premium-sm" onClick={fetchTypes}>
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
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {refreshing ? (
        <CardSkeletonGrid />
      ) : filtered.length === 0 ? (
        <div className="text-center py-5" style={{ color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.5rem', opacity: 0.5 }}><BiCategory /></div>
          <p>{t('common.noResults')}</p>
        </div>
      ) : (
        <div className="row g-3">
          {filtered.map((type) => (
            <div key={type._id} className="col-md-4 col-sm-6">
              <div className="premium-card">
                <div className="premium-card-body">
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <h6 className="mb-0" style={{ fontWeight: 700 }}>{type.name}</h6>
                    <button
                      className={`btn-action ${type.active ? 'btn-action-toggle' : 'btn-action-delete'}`}
                      onClick={() => toggleStatus(type._id, type.active)}
                      title={type.active ? t('common.active') : t('common.inactive')}
                    >
                      {type.active ? <BiCheck /> : <BiX />}
                    </button>
                  </div>
                  {type.description && (
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', margin: 0 }}>
                      {type.description}
                    </p>
                  )}
                  <div className="mt-2">
                    <span className={`badge ${type.active ? 'badge-success' : 'badge-danger'}`}>
                      {type.active ? t('common.active') : t('common.inactive')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BusinessTypes;