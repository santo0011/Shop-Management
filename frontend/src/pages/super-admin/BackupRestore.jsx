import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import SAPageHeader from '../../components/common/SAPageHeader';
import { BiCloudUpload, BiDownload, BiRefresh, BiHistory } from 'react-icons/bi';

const BackupRestore = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [backups, setBackups] = useState([]);

  const handleBackup = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/super-admin/backup', { responseType: 'blob', _skipLoading: true });
      const url = window.URL.createObjectURL(new Blob([data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRestoring(true);
    try {
      const formData = new FormData();
      formData.append('backup', file);
      await api.post('/super-admin/restore', formData, { _skipLoading: true });
      alert('Backup restored successfully');
    } catch (err) {
      console.error(err);
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div>
      <SAPageHeader
        title={t('nav.backupRestore')}
        subtitle="Backup and restore platform data"
        actions={
          <button className="btn-premium btn-premium-secondary btn-premium-sm" onClick={() => setBackups([])}>
            <BiRefresh /> {t('common.refresh')}
          </button>
        }
      />

      <div className="row g-3">
        <div className="col-md-6">
          <div className="premium-card">
            <div className="premium-card-header">
              <div className="d-flex align-items-center gap-2">
                <BiDownload style={{ color: 'var(--primary)', fontSize: '1.2rem' }} />
                <h6 className="mb-0" style={{ fontWeight: 700 }}>{t('settingsPage.downloadBackup')}</h6>
              </div>
            </div>
            <div className="premium-card-body">
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                {t('settingsPage.downloadBackupBody')}
              </p>
              <button className="btn-premium btn-premium-primary" onClick={handleBackup} disabled={loading}>
                {loading ? <><span className="spinner-border spinner-border-sm" /> {t('common.loading')}</> : <><BiDownload /> {t('settingsPage.downloadBackup')}</>}
              </button>
            </div>
          </div>
        </div>
        <div className="col-md-6">
          <div className="premium-card">
            <div className="premium-card-header">
              <div className="d-flex align-items-center gap-2">
                <BiCloudUpload style={{ color: 'var(--primary)', fontSize: '1.2rem' }} />
                <h6 className="mb-0" style={{ fontWeight: 700 }}>{t('settingsPage.restoreFromBackup')}</h6>
              </div>
            </div>
            <div className="premium-card-body">
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                {t('settingsPage.restoreDesc')}
              </p>
              <div>
                <label className="btn-premium btn-premium-primary" style={{ cursor: 'pointer' }}>
                  {restoring ? <><span className="spinner-border spinner-border-sm" /> {t('settingsPage.restoring')}</> : <><BiCloudUpload /> {t('settingsPage.restore')}</>}
                  <input type="file" hidden accept=".json" onChange={handleRestore} disabled={restoring} />
                </label>
              </div>
            </div>
          </div>
        </div>
        <div className="col-12">
          <div className="premium-card">
            <div className="premium-card-header">
              <div className="d-flex align-items-center gap-2">
                <BiHistory style={{ color: 'var(--primary)', fontSize: '1.2rem' }} />
                <h6 className="mb-0" style={{ fontWeight: 700 }}>Backup History</h6>
              </div>
            </div>
            <div className="premium-card-body">
              {backups.length === 0 ? (
                <p className="text-center py-4" style={{ color: 'var(--text-muted)' }}>{t('common.noData')}</p>
              ) : (
                <div className="table-responsive">
                  <table className="table-custom">
                    <thead>
                      <tr>
                        <th>{t('common.date')}</th>
                        <th>Size</th>
                        <th>{t('common.actions')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {backups.map((b, i) => (
                        <tr key={i}>
                          <td>{b.date}</td>
                          <td>{b.size}</td>
                          <td><button className="btn-premium btn-premium-secondary btn-premium-sm"><BiDownload /> {t('common.download')}</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BackupRestore;