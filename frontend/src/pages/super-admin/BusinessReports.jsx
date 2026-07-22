import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import SAPageHeader from '../../components/common/SAPageHeader';
import { BiRefresh, BiStore, BiCheckCircle, BiTime, BiDollar } from 'react-icons/bi';

const BusinessReports = () => {
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: result } = await api.get('/super-admin/business-reports', { _skipLoading: true });
      setData(result);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

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

      {loading ? (
        <div className="text-center py-5"><div className="spinner-border spinner-border-sm me-2" /> {t('common.loading')}</div>
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