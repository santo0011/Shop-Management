import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import SAPageHeader from '../../components/common/SAPageHeader';
import { BiSearch, BiCategory, BiCheck, BiX, BiRefresh } from 'react-icons/bi';

const BusinessTypes = () => {
  const { t } = useTranslation();
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => { fetchTypes(); }, []);

  const fetchTypes = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/business-types', { _skipLoading: true });
      setTypes(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

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

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border spinner-border-sm me-2" /> {t('common.loading')}
        </div>
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