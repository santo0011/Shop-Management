import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import SAPageHeader from '../../components/common/SAPageHeader';
import { BiRefresh, BiStore, BiCheckCircle, BiTime, BiDollar } from 'react-icons/bi';

// ─── Skeleton Loader ──────────────────────────────────────────
const BusinessReportsSkeletonLoader = () => (
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

    {/* Stat cards skeleton */}
    <div className="row g-3 mb-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="col-md-3 col-6">
          <div className="sa-stat-card" style={{ padding: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
                backgroundSize: '200% 100%',
                animation: 'shimmer 1.5s infinite',
              }} />
              <div style={{ flex: 1 }}>
                <div style={{
                  height: 18, width: '60%', marginBottom: 6,
                  background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
                  backgroundSize: '200% 100%', borderRadius: 4,
                  animation: 'shimmer 1.5s infinite',
                }} />
                <div style={{
                  height: 12, width: '40%',
                  background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
                  backgroundSize: '200% 100%', borderRadius: 4,
                  animation: 'shimmer 1.5s infinite',
                }} />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>

    {/* Table skeleton */}
    <div className="table-container" style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-lg)', overflow: 'hidden', background: 'var(--bg-card)' }}>
      <div className="table-header">
        <div style={{
          height: 22, width: '30%',
          background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
          backgroundSize: '200% 100%', borderRadius: 6,
          animation: 'shimmer 1.5s infinite',
        }} />
      </div>
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

// ─── Inline Content Skeleton ─────────────────────────────────
const BusinessContentSkeleton = () => (
  <>
    <div className="row g-3 mb-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="col-md-3 col-6">
          <div className="sa-stat-card" style={{ padding: '1rem', opacity: 0.5 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
                backgroundSize: '200% 100%',
                animation: 'shimmer 1.5s infinite',
              }} />
              <div style={{ flex: 1 }}>
                <div style={{
                  height: 18, width: '60%', marginBottom: 6,
                  background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
                  backgroundSize: '200% 100%', borderRadius: 4,
                  animation: 'shimmer 1.5s infinite',
                }} />
                <div style={{
                  height: 12, width: '40%',
                  background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
                  backgroundSize: '200% 100%', borderRadius: 4,
                  animation: 'shimmer 1.5s infinite',
                }} />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
    <div className="table-container">
      <div className="table-header">
        <div style={{
          height: 22, width: '30%',
          background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
          backgroundSize: '200% 100%', borderRadius: 6,
          animation: 'shimmer 1.5s infinite',
        }} />
      </div>
      <div className="table-responsive">
        <table className="table-custom">
          <thead>
            <tr>
              <th>Shop</th>
              <th>Business Type</th>
              <th>Status</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3, 4].map((r) => (
              <tr key={r} style={{ opacity: 0.5 }}>
                {[1, 2, 3, 4].map((c) => (
                  <td key={c} style={{ padding: '0.75rem 1rem' }}>
                    <div style={{
                      height: 10, width: c === 1 ? 100 : '35%',
                      background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
                      backgroundSize: '200% 100%', borderRadius: 4,
                      animation: 'shimmer 1.5s infinite',
                    }} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </>
);

const BusinessReports = () => {
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const isFirstLoad = useRef(true);

  const fetchData = useCallback(async () => {
    if (isFirstLoad.current) {
      setInitialLoading(true);
    } else {
      setRefreshing(true);
    }
    try {
      const { data: result } = await api.get('/super-admin/business-reports', { _skipLoading: true });
      setData(result);
    } catch (err) {
      console.error(err);
    } finally {
      setInitialLoading(false);
      setRefreshing(false);
      if (isFirstLoad.current) isFirstLoad.current = false;
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (initialLoading) return <BusinessReportsSkeletonLoader />;

  return (
    <div>
      <SAPageHeader
        title={t('nav.businessReports')}
        subtitle="Overview of all businesses on the platform"
        actions={
          <button className="btn-premium btn-premium-secondary btn-premium-sm" onClick={fetchData}>
            <BiRefresh /> {t('common.refresh')}
          </button>
        }
      />

      {refreshing ? (
        <BusinessContentSkeleton />
      ) : (
        <>
          <div className="row g-3 mb-4">
            <div className="col-md-3 col-6">
              <div className="sa-stat-card sa-stat-primary">
                <div className="sa-stat-icon"><BiStore /></div>
                <div className="sa-stat-info">
                  <div className="sa-stat-value">{data?.totalShops || 0}</div>
                  <div className="sa-stat-label">{t('saDashboardPage.totalShops')}</div>
                </div>
              </div>
            </div>
            <div className="col-md-3 col-6">
              <div className="sa-stat-card sa-stat-success">
                <div className="sa-stat-icon"><BiCheckCircle /></div>
                <div className="sa-stat-info">
                  <div className="sa-stat-value">{data?.activeShops || 0}</div>
                  <div className="sa-stat-label">{t('saDashboardPage.activeShops')}</div>
                </div>
              </div>
            </div>
            <div className="col-md-3 col-6">
              <div className="sa-stat-card sa-stat-warning">
                <div className="sa-stat-icon"><BiTime /></div>
                <div className="sa-stat-info">
                  <div className="sa-stat-value">{data?.trialShops || 0}</div>
                  <div className="sa-stat-label">{t('saDashboardPage.trialShops')}</div>
                </div>
              </div>
            </div>
            <div className="col-md-3 col-6">
              <div className="sa-stat-card sa-stat-info">
                <div className="sa-stat-icon"><BiDollar /></div>
                <div className="sa-stat-info">
                  <div className="sa-stat-value">₹{Number(data?.totalRevenue || 0).toLocaleString('en-IN')}</div>
                  <div className="sa-stat-label">{t('saDashboardPage.totalRevenue')}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="table-container">
            <div className="table-header">
              <h5>{t('manageShopsPage.shop')} Summary</h5>
            </div>
            <div className="table-responsive">
              <table className="table-custom">
                <thead>
                  <tr>
                    <th>{t('manageShopsPage.shop')}</th>
                    <th>{t('manageShopsPage.businessType')}</th>
                    <th>{t('common.status')}</th>
                    <th>{t('common.date')}</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.shops?.length > 0 ? data.shops.map((shop) => (
                    <tr key={shop._id}>
                      <td style={{ fontWeight: 600 }}>{shop.name}</td>
                      <td>{shop.businessType || 'N/A'}</td>
                      <td><span className={`badge ${shop.isActive ? 'badge-success' : 'badge-danger'}`}>{shop.isActive ? t('common.active') : t('common.inactive')}</span></td>
                      <td style={{ color: 'var(--text-secondary)' }}>{shop.createdAt ? new Date(shop.createdAt).toLocaleDateString() : 'N/A'}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan={4} className="text-center" style={{ color: 'var(--text-muted)' }}>{t('common.noData')}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default BusinessReports;