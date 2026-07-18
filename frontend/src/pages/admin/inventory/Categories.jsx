import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../../services/api';
import Swal from 'sweetalert2';
import {
  BiSearch, BiPlus, BiEdit, BiTrash, BiX, BiCheck,
  BiUpload, BiDownload, BiFile, BiPaste, BiTable,
  BiError, BiRefresh, BiInfoCircle
} from 'react-icons/bi';
import * as XLSX from 'xlsx';
import { showToast } from '../../../utils/toast';

const emptyForm = { name: '', nameBn: '' };
const REQUIRED_FIELDS = ['name'];

const validateField = (name, value) => {
  switch (name) {
    case 'name': return String(value || '').trim() ? '' : 'Category name is required';
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
        showToast.success('Category updated successfully.');
      } else {
        await api.post('/categories', form);
        showToast.success('Category added successfully.');
      }
      onSuccess();
      onClose();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to save category';
      setSubmitError(msg);
      showToast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const field = (name) => ({
    className: `form-control ${errors[name] ? 'is-invalid' : ''}`,
    value: form[name],
    onChange: (e) => handleChange(name, e.target.value),
  });

  return (
    <>
      <div className={`drawer-overlay ${open ? 'open' : ''}`} onClick={onClose} />
      <div className={`drawer ${open ? 'open' : ''}`}>
        <div className="drawer-header">
          <h5>{editing ? 'Edit Category' : 'Add Category'}</h5>
          <button className="btn-close-premium" onClick={onClose}><BiX /></button>
        </div>
        <div className="drawer-body">
          {submitError && (
            <div style={{
              padding: '0.75rem 1rem',
              borderRadius: 'var(--border-radius-md)',
              background: 'var(--glow-danger)',
              color: 'var(--danger)',
              fontWeight: 500,
              marginBottom: '1.25rem',
              fontSize: '0.85rem',
            }}>
              {submitError}
            </div>
          )}
          <form onSubmit={handleSubmit} id="category-form" noValidate>
            <div className="row g-3">
              <div className="col-12">
                <div className="form-group mb-0">
                  <label className="form-label">{t('product.productName')} (EN) <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input {...field('name')} placeholder="Enter category name" />
                  {errors.name && <div className="invalid-feedback-premium">{errors.name}</div>}
                </div>
              </div>
              <div className="col-12">
                <div className="form-group mb-0">
                  <label className="form-label">{t('product.productName')} (BN)</label>
                  <input {...field('nameBn')} placeholder="বিভাগের নাম লিখুন" />
                </div>
              </div>
            </div>
          </form>
        </div>
        <div className="drawer-footer">
          <button type="button" className="btn-premium btn-premium-secondary" onClick={onClose}>{t('common.cancel')}</button>
          <button type="submit" form="category-form" className="btn-premium btn-premium-primary" disabled={saving}>
            {saving ? <><span className="spinner-border spinner-border-sm" /> Saving...</> : <><BiCheck /> {t('common.save')}</>}
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
      if (!row.name?.trim()) rowErrors.push('Name is required');

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
  }, [existingCategories]);

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
          Swal.fire({ icon: 'warning', title: 'Empty File', text: 'The file contains no data.', confirmButtonColor: '#6C63FF' });
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
        Swal.fire({ icon: 'error', title: 'Parse Error', text: 'Failed to parse the file. Please check the format.', confirmButtonColor: '#6C63FF' });
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
      Swal.fire({ icon: 'warning', title: 'Empty Data', text: 'Please paste category data first.', confirmButtonColor: '#6C63FF' });
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
      Swal.fire({ icon: 'warning', title: 'No Data', text: 'Could not parse any rows from the pasted data.', confirmButtonColor: '#6C63FF' });
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
    const validRows = parsedRows.filter((row, idx) => {
      if (errors[idx] && errors[idx].length > 0) return false;
      if (skipDuplicates && duplicates[idx]) return false;
      return true;
    });

    if (validRows.length === 0) {
      Swal.fire({ icon: 'warning', title: 'No Valid Rows', text: 'All rows have errors or are duplicates. Fix them or disable skip duplicates.', confirmButtonColor: '#6C63FF' });
      return;
    }

    setImporting(true);
    let imported = 0;
    let updated = 0;
    let failed = 0;
    const failedDetails = [];

    for (const row of validRows) {
      try {
        const existing = existingCategories.find(s =>
          s.name?.toLowerCase() === row.name?.trim()?.toLowerCase()
        );

        const payload = {
          name: row.name,
          nameBn: row.nameBn || '',
        };

        if (existing && !skipDuplicates) {
          await api.put(`/categories/${existing._id}`, payload);
          updated++;
        } else {
          await api.post('/categories', payload);
          imported++;
        }
      } catch (err) {
        failed++;
        failedDetails.push(`${row.name}: ${err.response?.data?.message || err.message}`);
      }
    }

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
          <h5><BiUpload className="me-2" />Bulk Import Categories</h5>
          <button className="btn-close-premium" onClick={onClose}><BiX /></button>
        </div>
        <div className="drawer-body" style={{ padding: 0, display: 'flex', flexDirection: 'column' }}>
          {/* Tabs */}
          <div className="bulk-import-tabs">
            <button
              className={`bulk-import-tab ${activeTab === 'excel' ? 'active' : ''}`}
              onClick={() => { setActiveTab('excel'); setShowPreview(false); setParsedRows([]); }}
            >
              <BiFile /> Excel / CSV Import
            </button>
            <button
              className={`bulk-import-tab ${activeTab === 'paste' ? 'active' : ''}`}
              onClick={() => { setActiveTab('paste'); setShowPreview(false); setParsedRows([]); }}
            >
              <BiPaste /> Copy & Paste Import
            </button>
          </div>

          <div style={{ padding: '1.25rem', flex: 1, overflowY: 'auto' }}>
            {/* ─── Tab 1: Excel/CSV ────────────────────────────────────────── */}
            {activeTab === 'excel' && !showPreview && (
              <div className="bulk-import-upload-area">
                <div className="bulk-import-upload-box">
                  <BiUpload size={48} />
                  <h6>Upload Excel or CSV File</h6>
                  <p>Supports .xlsx, .xls, and .csv files</p>
                  <div className="d-flex gap-2 justify-content-center flex-wrap">
                    <button
                      className="btn-premium btn-premium-primary"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <BiUpload /> Select File
                    </button>
                    <button
                      className="btn-premium btn-premium-secondary"
                      onClick={handleDownloadTemplate}
                    >
                      <BiDownload /> Download Template
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
                    <small>Expected columns: Name, Name (Bangla), Description</small>
                  </div>
                </div>
              </div>
            )}

            {/* ─── Tab 2: Paste ────────────────────────────────────────────── */}
            {activeTab === 'paste' && !showPreview && (
              <div className="bulk-import-paste-area">
                <div className="bulk-import-paste-header">
                  <BiPaste size={28} />
                  <h6>Paste Category Data</h6>
                </div>
                <p className="bulk-import-paste-desc">
                  Paste comma-separated values. One category per line.
                </p>
                <div className="bulk-import-format-example">
                  <strong>Format:</strong> Category Name, Description, Name (Bangla)
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
                  <BiTable /> Parse & Preview
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
                    <span className="bulk-import-stat-label">Total Rows</span>
                  </div>
                  <div className="bulk-import-stat bulk-import-stat-valid">
                    <span className="bulk-import-stat-value">{validCount}</span>
                    <span className="bulk-import-stat-label">Valid</span>
                  </div>
                  <div className="bulk-import-stat bulk-import-stat-error">
                    <span className="bulk-import-stat-value">{errorCount}</span>
                    <span className="bulk-import-stat-label">Errors</span>
                  </div>
                  <div className="bulk-import-stat bulk-import-stat-dup">
                    <span className="bulk-import-stat-value">{duplicateCount}</span>
                    <span className="bulk-import-stat-label">Duplicates</span>
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
                      <span>Skip duplicate categories ({duplicateCount} found)</span>
                    </label>
                    <span className="bulk-import-toggle-hint">
                      Uncheck to update existing records instead
                    </span>
                  </div>
                )}

                {/* Import Result */}
                {importResult && (
                  <div className="bulk-import-result">
                    <div className="bulk-import-result-icon">
                      <BiCheck size={32} />
                    </div>
                    <h6>Import Complete</h6>
                    <div className="bulk-import-result-stats">
                      <span>Imported: <strong>{importResult.imported}</strong></span>
                      <span>Updated: <strong>{importResult.updated}</strong></span>
                      <span>Failed: <strong style={{ color: importResult.failed > 0 ? 'var(--danger)' : undefined }}>{importResult.failed}</strong></span>
                    </div>
                    {importResult.failedDetails.length > 0 && (
                      <div className="bulk-import-result-failures">
                        <small>Failed rows:</small>
                        {importResult.failedDetails.map((detail, i) => (
                          <div key={i} className="bulk-import-failure-item">{detail}</div>
                        ))}
                      </div>
                    )}
                    <button
                      className="btn-premium btn-premium-primary mt-3"
                      onClick={() => { setShowPreview(false); setImportResult(null); setParsedRows([]); }}
                    >
                      <BiRefresh /> Import More
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
                            <th>Name</th>
                            <th>Name (BN)</th>
                            <th>Description</th>
                            <th style={{ width: '80px' }}>Status</th>
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
                                      <BiError /> Error
                                    </span>
                                  )}
                                  {status === 'duplicate-skip' && (
                                    <span className="bulk-import-status-badge status-dup-skip" title={`Duplicate of ${duplicates[idx]?.name}`}>
                                      <BiX /> Skip
                                    </span>
                                  )}
                                  {status === 'duplicate-update' && (
                                    <span className="bulk-import-status-badge status-dup-update" title={`Will update ${duplicates[idx]?.name}`}>
                                      <BiRefresh /> Update
                                    </span>
                                  )}
                                  {status === 'valid' && (
                                    <span className="bulk-import-status-badge status-valid">
                                      <BiCheck /> Valid
                                    </span>
                                  )}
                                </td>
                                <td>
                                  <button
                                    className="bulk-import-remove-row"
                                    onClick={() => removeRow(idx)}
                                    title="Remove row"
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
    </>
  );
};

// ─── Main Categories Page ────────────────────────────────────────────────────
const Categories = () => {
  const { t } = useTranslation();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [search, setSearch] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [bulkImportOpen, setBulkImportOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const isFirstLoad = useRef(true);

  useEffect(() => { fetchCategories(); }, []);

  const fetchCategories = async () => {
    const silent = !isFirstLoad.current;
    if (silent) setSearching(true); else setLoading(true);
    try {
      const { data } = await api.get('/categories', { _skipLoading: silent });
      setCategories(data);
    } catch (err) {
      console.error(err);
    } finally {
      if (silent) setSearching(false); else setLoading(false);
      isFirstLoad.current = false;
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => fetchCategories(), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleEdit = (category) => {
    setEditing(category);
    setDrawerOpen(true);
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/categories/${id}`);
      setDeleteConfirm(null);
      fetchCategories();
      showToast.success('Category deleted successfully.');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to delete category';
      showToast.error(msg);
      setDeleteConfirm(null);
    }
  };

  return (
    <div>
      {/* Page Header */}
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
        <div>
          <h4 className="mb-1" style={{ fontWeight: 800 }}>{t('nav.categories')}</h4>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
            Manage your product categories
          </p>
        </div>
        <div className="d-flex gap-2">
          <button className="btn-premium btn-premium-secondary" onClick={() => { setBulkImportOpen(true); }}>
            <BiUpload /> Bulk Import
          </button>
          <button className="btn-premium btn-premium-primary" onClick={() => { setEditing(null); setDrawerOpen(true); }}>
            <BiPlus /> Add Category
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="mb-3" style={{ maxWidth: '400px' }}>
        <div className="search-box">
          <BiSearch className="search-icon" />
          <input
            className="form-control"
            placeholder={`${t('common.search')} categories...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Categories Table */}
      <div className={`table-container ${searching ? 'is-refreshing' : ''}`}>
        <div className="table-responsive">
          <table className="table-custom mb-0">
            <thead>
              <tr>
                <th>{t('product.productName')} (EN)</th>
                <th>{t('product.productName')} (BN)</th>
                <th style={{ width: '120px' }}>{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={3} className="text-center py-5" style={{ color: 'var(--text-muted)' }}>
                    <div className="spinner-border spinner-border-sm me-2" /> Loading...
                  </td>
                </tr>
              ) : categories.length === 0 ? (
                <tr>
                  <td colSpan={3} className="text-center py-5" style={{ color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem', opacity: 0.5 }}>📂</div>
                    No categories found
                  </td>
                </tr>
              ) : categories.map((category) => (
                <tr key={category._id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{category.name}</div>
                  </td>
                  <td>{category.nameBn || '-'}</td>
                  <td>
                    <div className="d-flex gap-1">
                      <button className="btn-action btn-action-edit" data-tooltip="Edit" onClick={() => handleEdit(category)}>
                        <BiEdit />
                      </button>
                      <button className="btn-action btn-action-delete" data-tooltip="Delete" onClick={() => setDeleteConfirm(category._id)}>
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

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="modal-premium" onClick={() => setDeleteConfirm(null)}>
          <div className="modal-premium-content" style={{ maxWidth: '420px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-premium-header">
              <h5>Delete Category</h5>
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
                Are you sure you want to delete this category? This action cannot be undone.
              </p>
            </div>
            <div className="modal-premium-footer" style={{ justifyContent: 'center' }}>
              <button className="btn-premium btn-premium-secondary" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="btn-premium btn-premium-danger" onClick={() => handleDelete(deleteConfirm)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Categories;