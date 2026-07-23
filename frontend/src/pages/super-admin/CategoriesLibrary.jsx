import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import SAPageHeader from '../../components/common/SAPageHeader';
import { BiSearch, BiBookBookmark, BiCheck, BiX, BiRefresh, BiTrash } from 'react-icons/bi';

// ─── Skeleton Loader ──────────────────────────────────────────
const CategoriesLibrarySkeletonLoader = () => (
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
                height: 12, width: '40%', marginBottom: 12,
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
              height: 12, width: '40%', marginBottom: 12,
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

const CategoriesLibrary = () => {
  const { t } = useTranslation();
  const [categories, setCategories] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(new Set());
  const isFirstLoad = useRef(true);

  const fetchCategories = useCallback(async () => {
    if (isFirstLoad.current) {
      setInitialLoading(true);
    } else {
      setRefreshing(true);
    }
    try {
      const { data } = await api.get('/categories/all', { _skipLoading: true });
      setCategories(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setInitialLoading(false);
      setRefreshing(false);
      if (isFirstLoad.current) isFirstLoad.current = false;
    }
  }, []);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  const toggleStatus = async (id, currentStatus) => {
    try {
      await api.put(`/categories/${id}`, { active: !currentStatus }, { _skipLoading: true });
      fetchCategories();
    } catch (err) {
      console.error(err);
    }
  };

  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const bulkDelete = async () => {
    if (!selected.size) return;
    try {
      await api.post('/categories/bulk-delete', { ids: [...selected] }, { _skipLoading: true });
      setSelected(new Set());
      fetchCategories();
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = categories.filter((c) =>
    c.name?.toLowerCase().includes(search.toLowerCase())
  );

  if (initialLoading) return <CategoriesLibrarySkeletonLoader />;

  return (
    <div>
      <SAPageHeader
        title={t('nav.categoriesLibrary')}
        subtitle="Manage global categories library"
        actions={
          <button className="btn-premium btn-premium-secondary btn-premium-sm" onClick={fetchCategories}>
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
        {selected.size > 0 && (
          <button className="btn-premium btn-premium-danger btn-premium-sm" onClick={bulkDelete}>
            <BiTrash /> {t('common.delete')} ({selected.size})
          </button>
        )}
      </div>

      {refreshing ? (
        <CardSkeletonGrid />
      ) : filtered.length === 0 ? (
        <div className="text-center py-5" style={{ color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.5rem', opacity: 0.5 }}><BiBookBookmark /></div>
          <p>{t('common.noResults')}</p>
        </div>
      ) : (
        <div className="row g-3">
          {filtered.map((cat) => (
            <div key={cat._id} className="col-md-4 col-sm-6">
              <div className="premium-card">
                <div className="premium-card-body">
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <div className="d-flex align-items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selected.has(cat._id)}
                        onChange={() => toggleSelect(cat._id)}
                        style={{ accentColor: 'var(--primary)' }}
                      />
                      <h6 className="mb-0" style={{ fontWeight: 700 }}>{cat.name}</h6>
                    </div>
                    <button
                      className={`btn-action ${cat.active ? 'btn-action-toggle' : 'btn-action-delete'}`}
                      onClick={() => toggleStatus(cat._id, cat.active)}
                    >
                      {cat.active ? <BiCheck /> : <BiX />}
                    </button>
                  </div>
                  {cat.nameBn && (
                    <small style={{ color: 'var(--text-muted)' }}>{cat.nameBn}</small>
                  )}
                  <div className="mt-2">
                    <span className={`badge ${cat.active ? 'badge-success' : 'badge-danger'}`}>
                      {cat.active ? t('common.active') : t('common.inactive')}
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

export default CategoriesLibrary;