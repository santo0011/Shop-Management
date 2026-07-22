import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../../services/api';
import Swal from 'sweetalert2';
import ExpandableCard from '../../../components/common/ExpandableCard';
import CategoryDetailsDrawer from './CategoryDetailsDrawer';
import ConfirmModal from '../../../components/common/ConfirmModal';
import Pagination from '../../../components/common/Pagination';
import BulkImportProgressModal from '../../../components/common/BulkImportProgressModal';
import {
  BiSearch, BiPlus, BiEdit, BiTrash, BiX, BiCheck, BiShow,
  BiUpload, BiDownload, BiFile, BiPaste, BiTable,
  BiError, BiRefresh, BiInfoCircle, BiCategory,
  BiCalendar, BiMessageSquare, BiCheckCircle,
} from 'react-icons/bi';
import * as XLSX from 'xlsx';
import { showToast } from '../../../utils/toast';

const emptyForm = { name: '', nameBn: '' };
const REQUIRED_FIELDS = ['name'];

const validateField = (name, value) => {
  switch (name) {
    case 'name': return String(value || '').trim() ? '' : 'categoriesPage.nameRequired';
    default: return '';
  }
};

// ─── Add/Edit Category Drawer ────────────────────────────────────────────────
const CategoryDrawer = ({ open, onClose, onSuccess, editing, t }) => {
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setSubmitError(null);
    setForm(editing ? {
      name: editing.name || '',
      nameBn: editing.nameBn || '',
    } : emptyForm);
  }, [open, editing]);

  const handleChange = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => {
      if (!(name in prev)) return prev;
      const msg = validateField(name, value);
      const next = { ...prev };
      if (msg) next[name] = msg; else delete next[name];
      return next;
    });
    if (submitError) setSubmitError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};
    REQUIRED_FIELDS.forEach((field) => {
      const msg = validateField(field, form[field]);
      if (msg) newErrors[field] = msg;
    });
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setSaving(true);
    setSubmitError(null);
    try {
      if (editing) {
        await api.put(`/categories/${editing._id}`, form);
        showToast.success(t('categoriesPage.updateSuccess'));
      } else {
        await api.post('/categories', form);
        showToast.success(t('categoriesPage.addSuccess'));
      }
      onSuccess();
      onClose();
    } catch (err) {
      const msg = err.response?.data?.message || t('categoriesPage.saveFailed');
      setSubmitError(msg);
      showToast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = { padding: '0.45rem 0.75rem', fontSize: '0.82rem', minHeight: '40px', height: '40px' };
  const labelStyle = { fontSize: '0.72rem', marginBottom: '0.2rem' };
  const errorStyle = { fontSize: '0.7rem', marginTop: '0.1rem' };

  const field = (name) => ({
    className: `form-control ${errors[name] ? 'is-invalid' : ''}`,
    value: form[name],
    onChange: (e) => handleChange(name, e.target.value),
    style: inputStyle,
  });

  return (
    <>
      <div className={`drawer-overlay ${open ? 'open' : ''}`} onClick={onClose} />
      <div className={`drawer ${open ? 'open' : ''}`}>
        <div className="drawer-header" style={{ padding: '0.85rem 1.25rem', minHeight: 'auto' }}>
          <h5 style={{ fontSize: '1rem', margin: 0 }}>{editing ? t('categoriesPage.editCategory') : t('categoriesPage.addCategory')}</h5>
          <button className="btn-close-premium" onClick={onClose} style={{ width: '32px', height: '32px' }}><BiX /></button>
        </div>
        <div className="drawer-body category-drawer-body" style={{ padding: '0.85rem 1rem 0.4rem 1rem' }}>
          {submitError && (
            <div style={{
              padding: '0.5rem 0.75rem',
              borderRadius: 'var(--border-radius-sm)',
              background: 'var(--glow-danger)',
              color: 'var(--danger)',
              fontWeight: 500,
              marginBottom: '0.6rem',
              fontSize: '0.78rem',
            }}>
              {submitError}
            </div>
          )}
          <form onSubmit={handleSubmit} id="category-form" noValidate>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <div>
                <label className="form-label" style={labelStyle}>{t('product.productName')} (EN) <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input {...field('name')} placeholder={t('categoriesPage.enterCategoryName')} />
                {errors.name && <div className="invalid-feedback-premium" style={errorStyle}>{t(errors.name)}</div>}
              </div>
              <div>
                <label className="form-label" style={labelStyle}>{t('product.productName')} (BN)</label>
                <input {...field('nameBn')} placeholder={t('categoriesPage.enterCategoryNameBn')} />
              </div>
            </div>
          </form>
        </div>
        <div className="drawer-footer category-drawer-footer" style={{ padding: '0.7rem 1rem', gap: '0.5rem' }}>
          <button type="button" className="btn-premium btn-premium-secondary" onClick={onClose} style={{ padding: '0.5rem 1.25rem', fontSize: '0.82rem', flex: 1, justifyContent: 'center' }}>{t('common.cancel')}</button>
          <button type="submit" form="category-form" className="btn-premium btn-premium-primary" disabled={saving} style={{ padding: '0.5rem 1.25rem', fontSize: '0.82rem', flex: 1, justifyContent: 'center' }}>
            {saving ? <><span className="spinner-border spinner-border-sm" /> {t('common.saving')}</> : <><BiCheck /> {t('common.save')}</>}
          </button>
        </div>
      </div>
    </>
  );
};

// ─── Bulk Import Drawer ──────────────────────────────────────────────────────
const BulkImportDrawer = ({ open, onClose, onSuccess, t }) => {
  const [activeTab, setActiveTab] = useState('excel');
  const [pasteData, setPasteData] = useState('');
  const [parsedRows, setParsedRows] = useState([]);
  const [errors, setErrors] = useState({});
  const [duplicates, setDuplicates] = useState({});
  const [existingCategories, setExistingCategories] = useState([]);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0, success: 0, failed: 0 });
  const [showImportModal, setShowImportModal] = useState(false);
  const [importElapsedMs, setImportElapsedMs] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    resetState();
    loadExistingCategories();
  }, [open]);

  const resetState = () => {
    setPasteData('');
    setParsedRows([]);
    setErrors({});
    setDuplicates({});
    setShowPreview(false);
    setImportResult(null);
    setImportProgress({ current: 0, total: 0, success: 0, failed: 0 });
    setShowImportModal(false);
    setImportElapsedMs(0);
    setActiveTab('excel');
  };

  const loadExistingCategories = async () => {
    try {
      const { data } = await api.get('/categories?limit=10000');
      setExistingCategories(Array.isArray(data) ? data : data.categories || []);
    } catch (err) {
      console.error(err);
    }
  };

  // ─── Detect Duplicates ──────────────────────────────────────────────────
  const detectDuplicates = useCallback((rows) => {
    const dupMap = {};
    const errorMap = {};
    rows.forEach((row, idx) => {
      const rowErrors = [];
      if (!row.name?.trim()) rowErrors.push(t('categoriesPage.nameRequired'));

      const existing = existingCategories.find(s =>
        s.name?.toLowerCase() === row.name?.trim()?.toLowerCase()
      );
      if (existing) {
        dupMap[idx] = existing;
      }

      if (rowErrors.length > 0) {
        errorMap[idx] = rowErrors;
      }
    });
    setErrors(errorMap);
    setDuplicates(dupMap);
    return { errorMap, dupMap };
  }, [existingCategories, t]);

  // ─── Excel/CSV Import ───────────────────────────────────────────────────
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { defval: '' });

        if (jsonData.length === 0) {
          Swal.fire({ icon: 'warning', title: t('categoriesPage.emptyFileTitle'), text: t('categoriesPage.emptyFileText'), confirmButtonColor: '#6C63FF' });
          return;
        }

        const mapped = jsonData.map(row => {
          const keys = Object.keys(row).reduce((acc, key) => {
            acc[key.toLowerCase().trim()] = row[key];
            return acc;
          }, {});
          return {
            name: keys.name || keys['category name'] || keys['category_name'] || '',
            nameBn: keys.namebn || keys['name_bn'] || keys['bangla name'] || keys['bangla_name'] || '',
            description: keys.description || keys['desc'] || '',
          };
        });

        setParsedRows(mapped);
        setShowPreview(true);
        detectDuplicates(mapped);
      } catch (err) {
        Swal.fire({ icon: 'error', title: t('categoriesPage.parseErrorTitle'), text: t('categoriesPage.parseErrorText'), confirmButtonColor: '#6C63FF' });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // ─── Download Sample Template ───────────────────────────────────────────
  const handleDownloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([
      { name: 'Grocery', nameBn: 'মুদিখানা', description: 'Daily grocery products' },
      { name: 'Beverages', nameBn: 'পানীয়', description: 'Soft drinks and beverages' },
      { name: 'Snacks', nameBn: 'স্ন্যাকস', description: 'Chips and snack items' },
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Categories');
    XLSX.writeFile(wb, 'category_import_template.xlsx');
  };

  // ─── Paste Import ───────────────────────────────────────────────────────
  const handleParsePaste = () => {
    if (!pasteData.trim()) {
      Swal.fire({ icon: 'warning', title: t('categoriesPage.emptyDataTitle'), text: t('categoriesPage.emptyDataText'), confirmButtonColor: '#6C63FF' });
      return;
    }

    const lines = pasteData.split('\n').filter(line => line.trim());
    const parsed = lines.map((line) => {
      const parts = line.includes('\t') ? line.split('\t') :
                    line.includes('|') ? line.split('|') :
                    line.split(',');
      const cleanParts = parts.map(p => p.trim());
      return {
        name: cleanParts[0] || '',
        description: cleanParts[1] || '',
        nameBn: cleanParts[2] || '',
      };
    });

    if (parsed.length === 0) {
      Swal.fire({ icon: 'warning', title: t('categoriesPage.noDataTitle'), text: t('categoriesPage.noDataText'), confirmButtonColor: '#6C63FF' });
      return;
    }

    setParsedRows(parsed);
    setShowPreview(true);
    detectDuplicates(parsed);
  };

  // ─── Remove Row ─────────────────────────────────────────────────────────
  const removeRow = (idx) => {
    const updated = parsedRows.filter((_, i) => i !== idx);
    setParsedRows(updated);
    detectDuplicates(updated);
  };

  // ─── Import All ─────────────────────────────────────────────────────────
  const handleImport = async () => {
    // Prevent a second import from starting while one is already running.
    if (importing) return;

    const validRows = parsedRows.filter((row, idx) => {
      if (errors[idx] && errors[idx].length > 0) return false;
      if (skipDuplicates && duplicates[idx]) return false;
      return true;
    });

    if (validRows.length === 0) {
      Swal.fire({ icon: 'warning', title: t('categoriesPage.noValidRowsTitle'), text: t('categoriesPage.noValidRowsText'), confirmButtonColor: '#6C63FF' });
      return;
    }

    const startedAt = Date.now();
    setImporting(true);
    setShowImportModal(true);
    setImportProgress({ current: 0, total: validRows.length, success: 0, failed: 0 });
    let imported = 0;
    let updated = 0;
    let failed = 0;
    const failedDetails = [];

    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];
      try {
        const existing = existingCategories.find(s =>
          s.name?.toLowerCase() === row.name?.trim()?.toLowerCase()
        );

        const payload = {
          name: row.name,
          nameBn: row.nameBn || '',
        };

        if (existing && !skipDuplicates) {
          await api.put(`/categories/${existing._id}`, payload, { _skipLoading: true });
          updated++;
        } else {
          await api.post('/categories', payload, { _skipLoading: true });
          imported++;
        }
        setImportProgress({ current: i + 1, total: validRows.length, success: imported + updated, failed });
      } catch (err) {
        failed++;
        failedDetails.push(`${row.name}: ${err.response?.data?.message || err.message}`);
        setImportProgress({ current: i + 1, total: validRows.length, success: imported + updated, failed });
      }
    }

    setImportElapsedMs(Date.now() - startedAt);
    setImportResult({ total: parsedRows.length, imported, updated, failed, failedDetails });
    setImporting(false);
    onSuccess();
  };

  const errorCount = Object.keys(errors).length;
  const duplicateCount = Object.keys(duplicates).length;
  const validCount = parsedRows.length - errorCount - (skipDuplicates ? duplicateCount : 0);

  const getRowStatus = (idx) => {
    const rowErrors = errors[idx];
    const isDup = duplicates[idx];
    if (rowErrors && rowErrors.length > 0) return 'error';
    if (isDup && skipDuplicates) return 'duplicate-skip';
    if (isDup) return 'duplicate-update';
    return 'valid';
  };

  return (
    <>
      <div className={`drawer-overlay ${open ? 'open' : ''}`} onClick={onClose} />
      <div className={`drawer ${open ? 'open' : ''}`} style={{ width: '640px', maxWidth: '100vw' }}>
        <div className="drawer-header">
          <h5><BiUpload className="me-2" />{t('categoriesPage.bulkImportCategories')}</h5>
          <button className="btn-close-premium" onClick={onClose}><BiX /></button>
        </div>
        <div className="drawer-body" style={{ padding: 0, display: 'flex', flexDirection: 'column' }}>
          {/* Tabs */}
          <div className="bulk-import-tabs">
            <button
              className={`bulk-import-tab ${activeTab === 'excel' ? 'active' : ''}`}
              onClick={() => { setActiveTab('excel'); setShowPreview(false); setParsedRows([]); }}
            >
              <BiFile /> {t('categoriesPage.excelCsvImport')}
            </button>
            <button
              className={`bulk-import-tab ${activeTab === 'paste' ? 'active' : ''}`}
              onClick={() => { setActiveTab('paste'); setShowPreview(false); setParsedRows([]); }}
            >
              <BiPaste /> {t('categoriesPage.copyPasteImport')}
            </button>
          </div>

          <div style={{ padding: '1.25rem', flex: 1, overflowY: 'auto' }}>
            {/* ─── Tab 1: Excel/CSV ────────────────────────────────────────── */}
            {activeTab === 'excel' && !showPreview && (
              <div className="bulk-import-upload-area">
                <div className="bulk-import-upload-box">
                  <BiUpload size={48} />
                  <h6>{t('categoriesPage.uploadExcelCsvFile')}</h6>
                  <p>{t('categoriesPage.supportsFileTypes')}</p>
                  <div className="d-flex gap-2 justify-content-center flex-wrap">
                    <button
                      className="btn-premium btn-premium-primary"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <BiUpload /> {t('categoriesPage.selectFile')}
                    </button>
                    <button
                      className="btn-premium btn-premium-secondary"
                      onClick={handleDownloadTemplate}
                    >
                      <BiDownload /> {t('categoriesPage.downloadTemplate')}
                    </button>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    style={{ display: 'none' }}
                    onChange={handleFileUpload}
                  />
                  <div className="bulk-import-format-info">
                    <BiInfoCircle />
                    <small>{t('categoriesPage.expectedColumns')}</small>
                  </div>
                </div>
              </div>
            )}

            {/* ─── Tab 2: Paste ────────────────────────────────────────────── */}
            {activeTab === 'paste' && !showPreview && (
              <div className="bulk-import-paste-area">
                <div className="bulk-import-paste-header">
                  <BiPaste size={28} />
                  <h6>{t('categoriesPage.pasteCategoryData')}</h6>
                </div>
                <p className="bulk-import-paste-desc">
                  {t('categoriesPage.pasteInstructions')}
                </p>
                <div className="bulk-import-format-example">
                  <strong>{t('categoriesPage.formatLabel')}</strong> {t('categoriesPage.formatExample')}
                </div>
                <textarea
                  className="bulk-import-textarea"
                  rows={8}
                  value={pasteData}
                  onChange={(e) => setPasteData(e.target.value)}
                  placeholder={`Grocery,Daily grocery products,মুদিখানা\nBeverages,Soft drinks and beverages,পানীয়\nSnacks,Chips and snack items,স্ন্যাকস`}
                />
                <button
                  className="btn-premium btn-premium-primary w-100 mt-2"
                  onClick={handleParsePaste}
                >
                  <BiTable /> {t('categoriesPage.parseAndPreview')}
                </button>
              </div>
            )}

            {/* ─── Preview Table ───────────────────────────────────────────── */}
            {showPreview && parsedRows.length > 0 && (
              <div className="bulk-import-preview">
                {/* Summary Stats */}
                <div className="bulk-import-summary">
                  <div className="bulk-import-stat">
                    <span className="bulk-import-stat-value">{parsedRows.length}</span>
                    <span className="bulk-import-stat-label">{t('categoriesPage.totalRows')}</span>
                  </div>
                  <div className="bulk-import-stat bulk-import-stat-valid">
                    <span className="bulk-import-stat-value">{validCount}</span>
                    <span className="bulk-import-stat-label">{t('categoriesPage.valid')}</span>
                  </div>
                  <div className="bulk-import-stat bulk-import-stat-error">
                    <span className="bulk-import-stat-value">{errorCount}</span>
                    <span className="bulk-import-stat-label">{t('categoriesPage.errors')}</span>
                  </div>
                  <div className="bulk-import-stat bulk-import-stat-dup">
                    <span className="bulk-import-stat-value">{duplicateCount}</span>
                    <span className="bulk-import-stat-label">{t('categoriesPage.duplicates')}</span>
                  </div>
                </div>

                {/* Duplicate handling toggle */}
                {duplicateCount > 0 && (
                  <div className="bulk-import-dup-toggle">
                    <label className="bulk-import-toggle-label">
                      <input
                        type="checkbox"
                        checked={skipDuplicates}
                        onChange={(e) => setSkipDuplicates(e.target.checked)}
                      />
                      <span>{t('categoriesPage.skipDuplicatesLabel', { count: duplicateCount })}</span>
                    </label>
                    <span className="bulk-import-toggle-hint">
                      {t('categoriesPage.uncheckToUpdateHint')}
                    </span>
                  </div>
                )}

                {/* Import Result */}
                {importResult && (
                  <div className="bulk-import-result">
                    <div className="bulk-import-result-icon">
                      <BiCheck size={32} />
                    </div>
                    <h6>{t('categoriesPage.importComplete')}</h6>
                    <div className="bulk-import-result-stats">
                      <span>{t('categoriesPage.imported')}: <strong>{importResult.imported}</strong></span>
                      <span>{t('categoriesPage.updatedCount')}: <strong>{importResult.updated}</strong></span>
                      <span>{t('categoriesPage.failedCount')}: <strong style={{ color: importResult.failed > 0 ? 'var(--danger)' : undefined }}>{importResult.failed}</strong></span>
                    </div>
                    {importResult.failedDetails.length > 0 && (
                      <div className="bulk-import-result-failures">
                        <small>{t('categoriesPage.failedRows')}</small>
                        {importResult.failedDetails.map((detail, i) => (
                          <div key={i} className="bulk-import-failure-item">{detail}</div>
                        ))}
                      </div>
                    )}
                    <button
                      className="btn-premium btn-premium-primary mt-3"
                      onClick={() => { setShowPreview(false); setImportResult(null); setParsedRows([]); }}
                    >
                      <BiRefresh /> {t('categoriesPage.importMore')}
                    </button>
                  </div>
                )}

                {/* Preview Table */}
                {!importResult && (
                  <>
                    <div className="bulk-import-preview-scroll">
                      <table className="bulk-import-table">
                        <thead>
                          <tr>
                            <th style={{ width: '40px' }}>#</th>
                            <th>{t('common.name')}</th>
                            <th>{t('common.name')} (BN)</th>
                            <th>{t('common.description')}</th>
                            <th style={{ width: '80px' }}>{t('common.status')}</th>
                            <th style={{ width: '40px' }}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {parsedRows.map((row, idx) => {
                            const status = getRowStatus(idx);
                            return (
                              <tr key={idx} className={`bulk-import-row-${status}`}>
                                <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{idx + 1}</td>
                                <td>
                                  <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{row.name || '-'}</div>
                                </td>
                                <td style={{ fontSize: '0.85rem' }}>{row.nameBn || '-'}</td>
                                <td style={{ fontSize: '0.85rem', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.description || '-'}</td>
                                <td>
                                  {status === 'error' && (
                                    <span className="bulk-import-status-badge status-error" title={errors[idx]?.join(', ')}>
                                      <BiError /> {t('categoriesPage.statusError')}
                                    </span>
                                  )}
                                  {status === 'duplicate-skip' && (
                                    <span className="bulk-import-status-badge status-dup-skip" title={t('categoriesPage.duplicateOfTitle', { name: duplicates[idx]?.name })}>
                                      <BiX /> {t('categoriesPage.statusSkip')}
                                    </span>
                                  )}
                                  {status === 'duplicate-update' && (
                                    <span className="bulk-import-status-badge status-dup-update" title={t('categoriesPage.willUpdateTitle', { name: duplicates[idx]?.name })}>
                                      <BiRefresh /> {t('categoriesPage.statusUpdate')}
                                    </span>
                                  )}
                                  {status === 'valid' && (
                                    <span className="bulk-import-status-badge status-valid">
                                      <BiCheck /> {t('categoriesPage.valid')}
                                    </span>
                                  )}
                                </td>
                                <td>
                                  <button
                                    className="bulk-import-remove-row"
                                    onClick={() => removeRow(idx)}
                                    title={t('categoriesPage.removeRowTitle')}
                                  >
                                    <BiX />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Error Details */}
                    {errorCount > 0 && (
                      <div className="bulk-import-errors-section">
                        <h6><BiError /> Row Errors</h6>
                        {Object.entries(errors).map(([idx, errs]) => (
                          <div key={idx} className="bulk-import-error-item">
                            <strong>Row {parseInt(idx) + 1}:</strong> {parsedRows[parseInt(idx)]?.name} — {errs.join(', ')}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="bulk-import-actions">
                      <button
                        className="btn-premium btn-premium-secondary"
                        onClick={() => { setShowPreview(false); setImportResult(null); }}
                      >
                        <BiX /> Cancel
                      </button>
                      <button
                        className="btn-premium btn-premium-primary"
                        onClick={handleImport}
                        disabled={importing || validCount === 0}
                      >
                        {importing ? (
                          <><span className="spinner-border spinner-border-sm" /> Importing...</>
                        ) : (
                          <><BiUpload /> Import {validCount} Categor{validCount !== 1 ? 'ies' : 'y'}</>
                        )}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <BulkImportProgressModal
        open={showImportModal}
        phase={importing ? 'importing' : 'done'}
        label={t('categoriesPage.bulkImportButton') || 'Categories'}
        current={importProgress.current}
        total={importProgress.total}
        success={importProgress.success}
        failed={importProgress.failed}
        elapsedMs={importElapsedMs}
        onDismiss={() => setShowImportModal(false)}
      />
    </>
  );
};

// A plain checkbox that also reflects a third "some, but not all" state —
// React has no `indeterminate` JSX prop, so it's set imperatively on the DOM node.
const SelectAllCheckbox = ({ checked, indeterminate, onChange, ...rest }) => {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);
  return <input ref={ref} type="checkbox" checked={checked} onChange={onChange} {...rest} />;
};

// Fixed page size for the Categories list — server-side pagination via ?page=&limit=.
const CATEGORIES_PER_PAGE = 10;

// ─── Main Categories Page ────────────────────────────────────────────────────
const Categories = () => {
  const { t } = useTranslation();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [bulkImportOpen, setBulkImportOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [viewDrawerOpen, setViewDrawerOpen] = useState(false);
  const [viewCategoryId, setViewCategoryId] = useState(null);
  const [restoringDefaults, setRestoringDefaults] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const isFirstLoad = useRef(true);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // A new search term invalidates the current page — always land back on page 1.
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  // Selection is page-scoped — navigating away from a page (or re-searching)
  // clears it, so nothing gets silently selected out of view.
  useEffect(() => {
    setSelectedIds(new Set());
  }, [page, debouncedSearch]);

  const fetchCategories = useCallback(async () => {
    const silent = !isFirstLoad.current;
    // Always skip global loading overlay — this page uses its own table loader
    if (silent) setSearching(true); else setLoading(true);
    try {
      const { data } = await api.get(
        `/categories?search=${encodeURIComponent(debouncedSearch)}&page=${page}&limit=${CATEGORIES_PER_PAGE}`,
        { _skipLoading: true }
      );
      setCategories(data.categories || []);
      setTotalCount(data.total || 0);
      const pages = Math.max(1, data.pages || 1);
      setTotalPages(pages);
      // Self-correct if the current page no longer exists — e.g. the last
      // category on the last page was just deleted.
      if (page > pages) {
        setPage(pages);
      }
    } catch (err) {
      console.error(err);
    } finally {
      if (silent) setSearching(false); else setLoading(false);
      isFirstLoad.current = false;
    }
  }, [debouncedSearch, page]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleEdit = (category) => {
    setEditing(category);
    setDrawerOpen(true);
  };

  // Additive-only — adds any of this shop's business-type default categories
  // that don't already exist by name; never touches existing ones.
  const handleRestoreDefaults = async () => {
    setRestoringDefaults(true);
    try {
      const { data } = await api.post('/shops/seed-categories', {}, { _skipLoading: true });
      if (data.created > 0) {
        showToast.success(t('categoriesPage.restoreDefaultsSuccess', { count: data.created }));
        fetchCategories();
      } else {
        showToast.success(t('categoriesPage.restoreDefaultsNoneNeeded'));
      }
    } catch (err) {
      showToast.error(err.response?.data?.message || t('categoriesPage.restoreDefaultsFailed'));
    } finally {
      setRestoringDefaults(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/categories/${id}`);
      setDeleteConfirm(null);
      // Deleting the only category on a page beyond the first would otherwise
      // fetch that now-empty page first — step back a page up front instead.
      if (categories.length === 1 && page > 1) {
        setPage(page - 1);
      } else {
        fetchCategories();
      }
      showToast.success(t('categoriesPage.deleteSuccess'));
    } catch (err) {
      const msg = err.response?.data?.message || t('categoriesPage.deleteFailed');
      showToast.error(msg);
      setDeleteConfirm(null);
    }
  };

  // ─── Multi-select & Bulk Delete ─────────────────────────────────────────
  const isSelected = (id) => selectedIds.has(id);

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const allOnPageSelected = categories.length > 0 && categories.every((c) => selectedIds.has(c._id));
  const someOnPageSelected = categories.some((c) => selectedIds.has(c._id));

  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      if (allOnPageSelected) return new Set();
      const next = new Set(prev);
      categories.forEach((c) => next.add(c._id));
      return next;
    });
  };

  const handleBulkDelete = async () => {
    setBulkDeleting(true);
    try {
      const ids = Array.from(selectedIds);
      const { data } = await api.post('/categories/bulk-delete', { ids });
      setBulkConfirmOpen(false);
      setSelectedIds(new Set());

      if (data.blockedCount > 0) {
        const lines = [];
        if (data.deletedCount > 0) lines.push(`✅ ${t('categoriesPage.bulkDeleteSuccessLine', { count: data.deletedCount })}`);
        lines.push(`⚠️ ${t('categoriesPage.bulkDeleteBlockedLine', { count: data.blockedCount })}`);
        Swal.fire({
          icon: data.deletedCount > 0 ? 'warning' : 'error',
          title: t('categoriesPage.bulkDeleteSummaryTitle'),
          html: `<div style="text-align:left; font-size:0.9rem; line-height:1.8;">${lines.map((l) => `<div>${l}</div>`).join('')}</div>`,
          confirmButtonColor: '#6C63FF',
        });
      } else {
        showToast.success(t('categoriesPage.bulkDeleteSuccessLine', { count: data.deletedCount }));
      }

      // Step back a page if this emptied the current page beyond page 1.
      if (ids.length >= categories.length && page > 1) {
        setPage(page - 1);
      } else {
        fetchCategories();
      }
    } catch (err) {
      showToast.error(err.response?.data?.message || t('categoriesPage.bulkDeleteFailed'));
    } finally {
      setBulkDeleting(false);
    }
  };

  return (
    <div>
      {/* Page Header */}
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
        <div>
          <h4 className="mb-1" style={{ fontWeight: 800 }}>{t('nav.categories')}</h4>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
            {t('categoriesPage.subtitle')}
          </p>
        </div>
        <div className="d-flex gap-2 flex-wrap">
          <button className="btn-premium btn-premium-secondary" onClick={handleRestoreDefaults} disabled={restoringDefaults} data-tooltip={t('categoriesPage.restoreDefaultsHint')}>
            {restoringDefaults ? <span className="spinner-border spinner-border-sm" /> : <BiRefresh />} {t('categoriesPage.restoreDefaultsButton')}
          </button>
          <button className="btn-premium btn-premium-secondary" onClick={() => { setBulkImportOpen(true); }}>
            <BiUpload /> {t('categoriesPage.bulkImportButton')}
          </button>
          <button className="btn-premium btn-premium-primary" onClick={() => { setEditing(null); setDrawerOpen(true); }}>
            <BiPlus /> {t('categoriesPage.addCategory')}
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="list-filters-card">
        <div className="list-filter-field list-search-field">
          <div className="search-box">
            <BiSearch className="search-icon" />
            <input
              className="form-control list-filter-input"
              placeholder={t('categoriesPage.searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* ─── Bulk Action Toolbar ─────────────────────────────────────────
          Sticky so it stays reachable while scrolling a long list; only
          rendered once at least one category is selected. */}
      {selectedIds.size > 0 && (
        <div className="bulk-select-toolbar">
          <span className="bulk-select-toolbar__count">
            {t('categoriesPage.categoriesSelected', { count: selectedIds.size })}
          </span>
          <div className="bulk-select-toolbar__actions">
            <button
              type="button"
              className="btn-premium btn-premium-secondary"
              onClick={() => setSelectedIds(new Set())}
            >
              <BiX /> {t('categoriesPage.clearSelection')}
            </button>
            <button
              type="button"
              className="btn-premium btn-premium-danger"
              onClick={() => setBulkConfirmOpen(true)}
            >
              <BiTrash /> {t('categoriesPage.deleteSelected')}
            </button>
          </div>
        </div>
      )}

      {/* Mobile-only Select All bar (no table header on mobile cards) */}
      <div className="bulk-select-mobile-bar">
        <label className="bulk-select-checkbox">
          <SelectAllCheckbox
            checked={allOnPageSelected}
            indeterminate={someOnPageSelected && !allOnPageSelected}
            onChange={toggleSelectAll}
            disabled={categories.length === 0}
          />
          <span className="bulk-select-checkmark" />
          <span>{t('categoriesPage.selectAllCategories')}</span>
        </label>
      </div>

      {/* ─── Desktop Table ─────────────────────────────────────────────── */}
      <div className={`table-container desktop-table ${searching ? 'is-refreshing' : ''}`}>
        <div className="table-responsive">
          <table className="table-custom mb-0">
            <thead>
              <tr>
                <th style={{ width: '44px' }}>
                  <label className="bulk-select-checkbox" title={t('categoriesPage.selectAllCategories')}>
                    <SelectAllCheckbox
                      checked={allOnPageSelected}
                      indeterminate={someOnPageSelected && !allOnPageSelected}
                      onChange={toggleSelectAll}
                      disabled={categories.length === 0}
                    />
                    <span className="bulk-select-checkmark" />
                  </label>
                </th>
                <th style={{ width: '56px' }}>{t('common.sl')}</th>
                <th>{t('product.productName')} (EN)</th>
                <th>{t('product.productName')} (BN)</th>
                <th style={{ width: '120px' }}>{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-5" style={{ color: 'var(--text-muted)' }}>
                    <div className="spinner-border spinner-border-sm me-2" /> {t('common.loading')}
                  </td>
                </tr>
              ) : categories.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-5" style={{ color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem', opacity: 0.5 }}>📂</div>
                    {t('categoriesPage.noCategoriesFound')}
                  </td>
                </tr>
              ) : categories.map((category, idx) => (
                <tr key={category._id} className={isSelected(category._id) ? 'bulk-select-row--selected' : ''}>
                  <td>
                    <label className="bulk-select-checkbox" title={t('categoriesPage.selectCategory')}>
                      <input type="checkbox" checked={isSelected(category._id)} onChange={() => toggleSelect(category._id)} />
                      <span className="bulk-select-checkmark" />
                    </label>
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontWeight: 600 }}>
                    {(page - 1) * CATEGORIES_PER_PAGE + idx + 1}
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{category.name}</div>
                  </td>
                  <td>{category.nameBn || '-'}</td>
                  <td>
                    <div className="d-flex gap-1">
                      <button className="btn-action btn-action-view" data-tooltip={t('common.view')} onClick={() => { setViewCategoryId(category._id); setViewDrawerOpen(true); }}>
                        <BiShow />
                      </button>
                      <button className="btn-action btn-action-edit" data-tooltip={t('common.edit')} onClick={() => handleEdit(category)}>
                        <BiEdit />
                      </button>
                      <button className="btn-action btn-action-delete" data-tooltip={t('common.delete')} onClick={() => setDeleteConfirm(category._id)}>
                        <BiTrash />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── Mobile Cards ──────────────────────────────────────────────── */}
      <div className={`mobile-cards ${searching ? 'is-refreshing' : ''}`}>
        {loading ? (
          <div className="text-center py-5" style={{ color: 'var(--text-muted)' }}>
            <div className="spinner-border spinner-border-sm me-2" /> Loading...
          </div>
        ) : categories.length === 0 ? (
          <div className="text-center py-5" style={{ color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem', opacity: 0.5 }}>📂</div>
            {t('categoriesPage.noCategoriesFound')}
          </div>
        ) : categories.map((category) => (
          <ExpandableCard
            key={category._id}
            className={isSelected(category._id) ? 'bulk-select-mobile-row--selected' : ''}
            checkbox={
              <label className="bulk-select-checkbox bulk-select-checkbox--mobile">
                <input type="checkbox" checked={isSelected(category._id)} onChange={() => toggleSelect(category._id)} />
                <span className="bulk-select-checkmark" />
              </label>
            }
            compact={
              <>
                <div className="expandable-card__compact-row">
                  <span className="expandable-card__name">{category.name}</span>
                  <span className="expandable-card__price">{t('categoriesPage.productsCount', { count: category.productCount || 0 })}</span>
                </div>
                <div className="expandable-card__meta">
                  <span className="expandable-card__meta-item">
                    <BiCategory />
                    <span>{category.nameBn || t('categoriesPage.noBanglaName')}</span>
                  </span>
                  <span className="expandable-card__stock expandable-card__stock--ok">
                    {t('common.active')}
                  </span>
                </div>
              </>
            }
            expanded={
              <div className="expandable-card__rows">
                <div className="expandable-card__row">
                  <span className="expandable-card__row-label">{t('common.description')}</span>
                  <span className="expandable-card__row-dots" />
                  <span className="expandable-card__row-value">{category.description || '-'}</span>
                </div>
                <div className="expandable-card__row">
                  <span className="expandable-card__row-label">{t('categoriesPage.banglaName')}</span>
                  <span className="expandable-card__row-dots" />
                  <span className="expandable-card__row-value">{category.nameBn || '-'}</span>
                </div>
                <div className="expandable-card__row">
                  <span className="expandable-card__row-label">{t('categoriesPage.created')}</span>
                  <span className="expandable-card__row-dots" />
                  <span className="expandable-card__row-value">{new Date(category.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="expandable-card__row">
                  <span className="expandable-card__row-label">{t('common.status')}</span>
                  <span className="expandable-card__row-dots" />
                  <span className="expandable-card__row-value">
                    <span className="badge badge-success">{t('common.active')}</span>
                  </span>
                </div>
              </div>
            }
            actions={
              <>
                <button className="btn-action btn-action-view" data-tooltip={t('common.view')} onClick={() => { setViewCategoryId(category._id); setViewDrawerOpen(true); }}>
                  <BiShow />
                </button>
                <button className="btn-action btn-action-edit" data-tooltip={t('common.edit')} onClick={() => handleEdit(category)}>
                  <BiEdit />
                </button>
                <button className="btn-action btn-action-delete" data-tooltip={t('common.delete')} onClick={() => setDeleteConfirm(category._id)}>
                  <BiTrash />
                </button>
              </>
            }
          />
        ))}
      </div>

      {/* Pagination — shared between desktop table and mobile cards */}
      <Pagination
        page={page}
        totalPages={totalPages}
        totalCount={totalCount}
        pageSize={CATEGORIES_PER_PAGE}
        onPageChange={setPage}
      />

      {/* Add / Edit Category Drawer */}
      <CategoryDrawer
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setEditing(null); }}
        onSuccess={fetchCategories}
        editing={editing}
        t={t}
      />

      {/* Bulk Import Drawer */}
      <BulkImportDrawer
        open={bulkImportOpen}
        onClose={() => { setBulkImportOpen(false); }}
        onSuccess={fetchCategories}
        t={t}
      />

      {/* Category Details Drawer */}
      <CategoryDetailsDrawer
        open={viewDrawerOpen}
        categoryId={viewCategoryId}
        onClose={() => { setViewDrawerOpen(false); setViewCategoryId(null); }}
        t={t}
      />

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="modal-premium" onClick={() => setDeleteConfirm(null)}>
          <div className="modal-premium-content" style={{ maxWidth: '420px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-premium-header">
              <h5>{t('categoriesPage.deleteCategory')}</h5>
              <button className="btn-close-premium" onClick={() => setDeleteConfirm(null)}><BiX /></button>
            </div>
            <div className="modal-premium-body text-center">
              <div style={{
                width: '64px', height: '64px', borderRadius: '50%', background: 'var(--glow-danger)',
                color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.8rem', margin: '0 auto 1.25rem'
              }}>
                <BiTrash />
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
                {t('categoriesPage.deleteCategoryConfirm')}
              </p>
            </div>
            <div className="modal-premium-footer" style={{ justifyContent: 'center' }}>
              <button className="btn-premium btn-premium-secondary" onClick={() => setDeleteConfirm(null)}>{t('common.cancel')}</button>
              <button className="btn-premium btn-premium-danger" onClick={() => handleDelete(deleteConfirm)}>{t('common.delete')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation */}
      <ConfirmModal
        open={bulkConfirmOpen}
        onClose={() => !bulkDeleting && setBulkConfirmOpen(false)}
        onConfirm={handleBulkDelete}
        title={t('categoriesPage.bulkDeleteTitle')}
        message={t('categoriesPage.bulkDeleteConfirm')}
        confirmText={bulkDeleting ? t('common.deleting') : t('common.delete')}
        cancelText={t('common.cancel')}
        variant="danger"
      />
    </div>
  );
};

export default Categories;