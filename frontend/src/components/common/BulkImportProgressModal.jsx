import React from 'react';
import { useTranslation } from 'react-i18next';
import { BiCheck, BiUpload, BiErrorCircle } from 'react-icons/bi';

/**
 * BulkImportProgressModal — a shared, modern progress dialog for bulk
 * imports (Products / Categories / Suppliers).
 *
 * Purely presentational: the caller still runs its own sequential import
 * loop and decides when each record succeeds/fails — this component only
 * renders whatever counters it's given, smoothly.
 *
 * Usage:
 *   <BulkImportProgressModal
 *     open={showImportModal}
 *     phase={importing ? 'importing' : 'done'}
 *     label={t('productsPage.bulkImportButton')}
 *     current={importStats.current}
 *     total={importStats.total}
 *     success={importStats.success}
 *     failed={importStats.failed}
 *     elapsedMs={importElapsedMs}
 *     onDismiss={() => setShowImportModal(false)}
 *   />
 */
const BulkImportProgressModal = ({
  open,
  phase, // 'importing' | 'done'
  label,
  current = 0,
  total = 0,
  success = 0,
  failed = 0,
  elapsedMs = 0,
  onDismiss,
}) => {
  const { t } = useTranslation();
  if (!open) return null;

  const pct = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;
  const remaining = Math.max(0, total - current);
  const isDone = phase === 'done';
  const elapsedSeconds = (elapsedMs / 1000).toFixed(1);

  return (
    <div className="bip-overlay">
      <div className="bip-modal">
        {!isDone ? (
          <>
            <div className="bip-icon-ring">
              <div className="bip-icon-pulse" />
              <div className="bip-icon-circle"><BiUpload size={26} /></div>
            </div>
            <h5 className="bip-title">{t('bulkImportProgress.importingLabel', { label })}</h5>
            <p className="bip-subtitle">{t('bulkImportProgress.pleaseWait')}</p>

            <div className="bip-progress-track">
              <div className="bip-progress-fill" style={{ width: `${pct}%` }} />
            </div>
            <div className="bip-progress-caption">
              <span>{current} / {total} {t('bulkImportProgress.imported')}</span>
              <span className="bip-progress-pct">{pct}%</span>
            </div>

            <div className="bip-stats-grid">
              <div className="bip-stat">
                <span className="bip-stat-value">{total}</span>
                <span className="bip-stat-label">{t('bulkImportProgress.totalRecords')}</span>
              </div>
              <div className="bip-stat">
                <span className="bip-stat-value">{current}</span>
                <span className="bip-stat-label">{t('bulkImportProgress.imported')}</span>
              </div>
              <div className="bip-stat">
                <span className="bip-stat-value">{remaining}</span>
                <span className="bip-stat-label">{t('bulkImportProgress.remaining')}</span>
              </div>
              <div className="bip-stat">
                <span className="bip-stat-value bip-stat-value--success">{success}</span>
                <span className="bip-stat-label">{t('bulkImportProgress.success')}</span>
              </div>
              {failed > 0 && (
                <div className="bip-stat">
                  <span className="bip-stat-value bip-stat-value--danger">{failed}</span>
                  <span className="bip-stat-label">{t('bulkImportProgress.failed')}</span>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="bip-success-icon">
              <BiCheck size={36} />
            </div>
            <h5 className="bip-title">{t('bulkImportProgress.completeLabel', { label })}</h5>

            <div className="bip-summary-grid">
              <div className="bip-summary-item">
                <span className="bip-summary-value bip-summary-value--success">{success}</span>
                <span className="bip-summary-label">{t('bulkImportProgress.totalImported')}</span>
              </div>
              <div className="bip-summary-item">
                <span className={`bip-summary-value ${failed > 0 ? 'bip-summary-value--danger' : ''}`}>{failed}</span>
                <span className="bip-summary-label">{t('bulkImportProgress.failed')}</span>
              </div>
              <div className="bip-summary-item">
                <span className="bip-summary-value">{elapsedSeconds}s</span>
                <span className="bip-summary-label">{t('bulkImportProgress.timeTaken')}</span>
              </div>
            </div>

            {failed > 0 && (
              <div className="bip-failed-note">
                <BiErrorCircle size={14} /> {t('bulkImportProgress.viewDetailsHint')}
              </div>
            )}

            <button type="button" className="btn-premium btn-premium-primary bip-done-btn" onClick={onDismiss}>
              {t('bulkImportProgress.viewDetails')}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default BulkImportProgressModal;
