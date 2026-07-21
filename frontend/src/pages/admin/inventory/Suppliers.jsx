import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../../services/api';
import Swal from 'sweetalert2';
import ExpandableCard from '../../../components/common/ExpandableCard';
import SupplierDetailsDrawer from './SupplierDetailsDrawer';
import Pagination from '../../../components/common/Pagination';
import {
  BiSearch, BiPlus, BiEdit, BiTrash, BiX, BiCheck,
  BiUpload, BiDownload, BiFile, BiPaste, BiTable,
  BiError, BiMessageSquare, BiRefresh, BiInfoCircle,
  BiPhone, BiEnvelope, BiMapPin, BiBuilding, BiDollar,
  BiCalendar, BiUser, BiShow
} from 'react-icons/bi';
import * as XLSX from 'xlsx';

const emptyForm = { name: '', nameBn: '', company: '', email: '', phone: '', address: '' };
const REQUIRED_FIELDS = ['name', 'phone'];
const IMPORT_TEMPLATE_COLS = ['name', 'phone', 'email', 'address', 'company', 'nameBn'];

const validateField = (name, value, t) => {
  switch (name) {
    case 'name': return String(value || '').trim() ? '' : t('suppliersPage.form.nameRequired');
    case 'phone': return String(value || '').trim() ? '' : t('suppliersPage.form.phoneRequired');
    default: return '';
  }
};

// ─── Add/Edit Supplier Drawer ─────────────────────────────────────────────────
const SupplierDrawer = ({ open, onClose, onSuccess, editing, t }) => {
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
      company: editing.company || '',
      email: editing.email || '',
      phone: editing.phone || '',
      address: editing.address || '',
    } : emptyForm);
  }, [open, editing]);

  const handleChange = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => {
      if (!(name in prev)) return prev;
      const msg = validateField(name, value, t);
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
      const msg = validateField(field, form[field], t);
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
        await api.put(`/suppliers/${editing._id}`, form);
      } else {
        await api.post('/suppliers', form);
      }
      onSuccess();
      onClose();
    } catch (err) {
      setSubmitError(err.response?.data?.message || t('suppliersPage.form.saveFailed'));
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
          <h5 style={{ fontSize: '1rem', margin: 0 }}>{editing ? t('suppliersPage.editSupplier') : t('suppliersPage.addSupplier')}</h5>
          <button className="btn-close-premium" onClick={onClose} style={{ width: '32px', height: '32px' }}><BiX /></button>
        </div>
        <div className="drawer-body supplier-drawer-body" style={{ padding: '0.85rem 1rem 0.4rem 1rem' }}>
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
          <form onSubmit={handleSubmit} id="supplier-form" noValidate>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {/* Supplier Name - full width */}
              <div>
                <label className="form-label" style={labelStyle}>{t('auth.name')} ({t('suppliersPage.form.enSuffix')}) <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input {...field('name')} placeholder={t('suppliersPage.form.namePlaceholder')} />
                {errors.name && <div className="invalid-feedback-premium" style={errorStyle}>{errors.name}</div>}
              </div>
              {/* 2-col row: Name (BN) + Phone */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div>
                  <label className="form-label" style={labelStyle}>{t('auth.name')} ({t('suppliersPage.form.bnSuffix')})</label>
                  <input {...field('nameBn')} placeholder={t('suppliersPage.form.nameBnPlaceholder')} />
                </div>
                <div>
                  <label className="form-label" style={labelStyle}>{t('auth.phone')} <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input {...field('phone')} placeholder={t('suppliersPage.form.phonePlaceholder')} />
                  {errors.phone && <div className="invalid-feedback-premium" style={errorStyle}>{errors.phone}</div>}
                </div>
              </div>
              {/* 2-col row: Email + Company */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div>
                  <label className="form-label" style={labelStyle}>{t('auth.email')}</label>
                  <input type="email" {...field('email')} placeholder={t('suppliersPage.form.emailPlaceholder')} />
                </div>
                <div>
                  <label className="form-label" style={labelStyle}>{t('suppliersPage.form.company')}</label>
                  <input {...field('company')} placeholder={t('suppliersPage.form.companyPlaceholder')} />
                </div>
              </div>
              {/* 2-col row: Address (full width span) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label" style={labelStyle}>{t('suppliersPage.form.address')}</label>
                  <input {...field('address')} placeholder={t('suppliersPage.form.addressPlaceholder')} />
                </div>
              </div>
            </div>
          </form>
        </div>
        <div className="drawer-footer supplier-drawer-footer" style={{ padding: '0.7rem 1rem', gap: '0.5rem' }}>
          <button type="button" className="btn-premium btn-premium-secondary" onClick={onClose} style={{ padding: '0.5rem 1.25rem', fontSize: '0.82rem', flex: 1, justifyContent: 'center' }}>{t('common.cancel')}</button>
          <button type="submit" form="supplier-form" className="btn-premium btn-premium-primary" disabled={saving} style={{ padding: '0.5rem 1.25rem', fontSize: '0.82rem', flex: 1, justifyContent: 'center' }}>
            {saving ? <><span className="spinner-border spinner-border-sm" /> {t('common.saving')}</> : <><BiCheck /> {t('common.save')}</>}
          </button>
        </div>
      </div>
    </>
  );
};

// ─── Bulk Import Drawer ──────────────────────────────────────────────────────
const BulkImportDrawer = ({ open, onClose, onSuccess, t }) => {
  const [activeTab, setActiveTab] = useState('excel'); // 'excel' | 'paste'
  const [excelData, setExcelData] = useState([]);
  const [pasteData, setPasteData] = useState('');
  const [parsedRows, setParsedRows] = useState([]);
  const [errors, setErrors] = useState({});
  const [duplicates, setDuplicates] = useState({});
  const [existingSuppliers, setExistingSuppliers] = useState([]);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [importing, setImporting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const fileInputRef = useRef(null);

  // Reset state when drawer opens
  useEffect(() => {
    if (!open) return;
    resetState();
    loadExistingSuppliers();
  }, [open]);

  const resetState = () => {
    setExcelData([]);
    setPasteData('');
    setParsedRows([]);
    setErrors({});
    setDuplicates({});
    setShowPreview(false);
    setImportResult(null);
    setActiveTab('excel');
  };

  const loadExistingSuppliers = async () => {
    try {
      const { data } = await api.get('/suppliers?limit=10000');
      setExistingSuppliers(data.suppliers || []);
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
      // Validate required fields
      if (!row.name?.trim()) rowErrors.push(t('suppliersPage.bulkImport.nameRequired'));
      if (!row.phone?.trim()) rowErrors.push(t('suppliersPage.bulkImport.phoneRequired'));

      // Check duplicates against existing
      const existing = existingSuppliers.find(s =>
        s.phone === row.phone?.trim() || s.email?.toLowerCase() === row.email?.trim()?.toLowerCase()
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
  }, [existingSuppliers]);

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
          Swal.fire({ icon: 'warning', title: t('suppliersPage.bulkImport.emptyFileTitle'), text: t('suppliersPage.bulkImport.emptyFileText'), confirmButtonColor: '#6C63FF' });
          return;
        }

        // Map column names (case-insensitive)
        const mapped = jsonData.map(row => {
          const keys = Object.keys(row).reduce((acc, key) => {
            acc[key.toLowerCase().trim()] = row[key];
            return acc;
          }, {});
          return {
            name: keys.name || keys['supplier name'] || keys['supplier_name'] || '',
            phone: String(keys.phone || keys['phone number'] || keys['phone_number'] || keys.mobile || ''),
            email: keys.email || keys['e-mail'] || keys['email address'] || '',
            address: keys.address || keys['address'] || '',
            company: keys.company || keys['company name'] || keys['company_name'] || '',
            nameBn: keys.namebn || keys['name_bn'] || keys['bangla name'] || keys['bangla_name'] || '',
            previousDue: parseFloat(keys.previousdue || keys['previous due'] || keys['previous_due'] || keys.due || 0) || 0,
          };
        });

        setExcelData(mapped);
        setParsedRows(mapped);
        setShowPreview(true);
        detectDuplicates(mapped);
      } catch (err) {
        Swal.fire({ icon: 'error', title: t('suppliersPage.bulkImport.parseErrorTitle'), text: t('suppliersPage.bulkImport.parseErrorText'), confirmButtonColor: '#6C63FF' });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // ─── Download Sample Template ───────────────────────────────────────────
  const handleDownloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([
      { name: 'ABC Traders', phone: '01711111111', email: 'abc@gmail.com', address: 'Dhaka', company: 'ABC Group', nameBn: 'এবিসি ট্রেডার্স' },
      { name: 'XYZ Foods', phone: '01822222222', email: 'xyz@gmail.com', address: 'Kolkata', company: 'XYZ Ltd', nameBn: 'এক্সওয়াইজেড ফুডস' },
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Suppliers');
    XLSX.writeFile(wb, 'supplier_import_template.xlsx');
  };

  // ─── Paste Import ───────────────────────────────────────────────────────
  const handleParsePaste = () => {
    if (!pasteData.trim()) {
      Swal.fire({ icon: 'warning', title: t('suppliersPage.bulkImport.emptyDataTitle'), text: t('suppliersPage.bulkImport.emptyDataText'), confirmButtonColor: '#6C63FF' });
      return;
    }

    const lines = pasteData.split('\n').filter(line => line.trim());
    const parsed = lines.map((line, idx) => {
      // Support comma, tab, or pipe separated
      const parts = line.includes('\t') ? line.split('\t') :
                    line.includes('|') ? line.split('|') :
                    line.split(',');
      const cleanParts = parts.map(p => p.trim());
      return {
        name: cleanParts[0] || '',
        phone: cleanParts[1] || '',
        email: cleanParts[2] || '',
        address: cleanParts[3] || '',
        previousDue: parseFloat(cleanParts[4]) || 0,
        company: cleanParts[5] || '',
        nameBn: cleanParts[6] || '',
      };
    });

    if (parsed.length === 0) {
      Swal.fire({ icon: 'warning', title: t('suppliersPage.bulkImport.noDataTitle'), text: t('suppliersPage.bulkImport.noDataText'), confirmButtonColor: '#6C63FF' });
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
    const newErrors = { ...errors };
    const newDups = { ...duplicates };
    // Re-index errors and duplicates
    const reIndexedErrors = {};
    const reIndexedDups = {};
    updated.forEach((_, i) => {
      // Map old indices
      let oldIdx = -1;
      let count = -1;
      for (let j = 0; j < parsedRows.length; j++) {
        if (j !== idx) count++;
        if (count === i) { oldIdx = j; break; }
      }
      // Simplified: just re-detect
    });
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
      Swal.fire({ icon: 'warning', title: t('suppliersPage.bulkImport.noValidRowsTitle'), text: t('suppliersPage.bulkImport.noValidRowsText'), confirmButtonColor: '#6C63FF' });
      return;
    }

    setImporting(true);
    let imported = 0;
    let updated = 0;
    let failed = 0;
    const failedDetails = [];

    for (const row of validRows) {
      try {
        // Check if duplicate (update existing)
        const existing = existingSuppliers.find(s =>
          s.phone === row.phone?.trim() || (row.email && s.email?.toLowerCase() === row.email.toLowerCase())
        );

        const payload = {
          name: row.name,
          nameBn: row.nameBn || '',
          company: row.company || '',
          email: row.email || '',
          phone: row.phone,
          address: row.address || '',
        };

        if (existing && !skipDuplicates) {
          // Update existing
          await api.put(`/suppliers/${existing._id}`, payload);
          updated++;
        } else {
          // Create new
          await api.post('/suppliers', payload);
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

  // ─── Get error count ────────────────────────────────────────────────────
  const errorCount = Object.keys(errors).length;
  const duplicateCount = Object.keys(duplicates).length;
  const validCount = parsedRows.length - errorCount - (skipDuplicates ? duplicateCount : 0);

  // ─── Render Row Status ──────────────────────────────────────────────────
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
          <h5><BiUpload className="me-2" />{t('suppliersPage.bulkImport.title')}</h5>
          <button className="btn-close-premium" onClick={onClose}><BiX /></button>
        </div>
        <div className="drawer-body" style={{ padding: 0, display: 'flex', flexDirection: 'column' }}>
          {/* Tabs */}
          <div className="bulk-import-tabs">
            <button
              className={`bulk-import-tab ${activeTab === 'excel' ? 'active' : ''}`}
              onClick={() => { setActiveTab('excel'); setShowPreview(false); setParsedRows([]); }}
            >
              <BiFile /> {t('suppliersPage.bulkImport.tabExcel')}
            </button>
            <button
              className={`bulk-import-tab ${activeTab === 'paste' ? 'active' : ''}`}
              onClick={() => { setActiveTab('paste'); setShowPreview(false); setParsedRows([]); }}
            >
              <BiPaste /> {t('suppliersPage.bulkImport.tabPaste')}
            </button>
          </div>

          <div style={{ padding: '1.25rem', flex: 1, overflowY: 'auto' }}>
            {/* ─── Tab 1: Excel/CSV ────────────────────────────────────────── */}
            {activeTab === 'excel' && !showPreview && (
              <div className="bulk-import-upload-area">
                <div className="bulk-import-upload-box">
                  <BiUpload size={48} />
                  <h6>{t('suppliersPage.bulkImport.uploadTitle')}</h6>
                  <p>{t('suppliersPage.bulkImport.uploadDesc')}</p>
                  <div className="d-flex gap-2 justify-content-center flex-wrap">
                    <button
                      className="btn-premium btn-premium-primary"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <BiUpload /> {t('suppliersPage.bulkImport.selectFile')}
                    </button>
                    <button
                      className="btn-premium btn-premium-secondary"
                      onClick={handleDownloadTemplate}
                    >
                      <BiDownload /> {t('suppliersPage.bulkImport.downloadTemplate')}
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
                    <small>{t('suppliersPage.bulkImport.formatInfo')}</small>
                  </div>
                </div>
              </div>
            )}

            {/* ─── Tab 2: Paste ────────────────────────────────────────────── */}
            {activeTab === 'paste' && !showPreview && (
              <div className="bulk-import-paste-area">
                <div className="bulk-import-paste-header">
                  <BiPaste size={28} />
                  <h6>{t('suppliersPage.bulkImport.pasteTitle')}</h6>
                </div>
                <p className="bulk-import-paste-desc">
                  {t('suppliersPage.bulkImport.pasteDesc')}
                </p>
                <div className="bulk-import-format-example">
                  <strong>{t('suppliersPage.bulkImport.formatLabel')}</strong> {t('suppliersPage.bulkImport.formatExample')}
                </div>
                <textarea
                  className="bulk-import-textarea"
                  rows={8}
                  value={pasteData}
                  onChange={(e) => setPasteData(e.target.value)}
                  placeholder={t('suppliersPage.bulkImport.pasteExample')}
                />
                <button
                  className="btn-premium btn-premium-primary w-100 mt-2"
                  onClick={handleParsePaste}
                >
                  <BiTable /> {t('suppliersPage.bulkImport.parsePreview')}
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
                    <span className="bulk-import-stat-label">{t('suppliersPage.bulkImport.totalRows')}</span>
                  </div>
                  <div className="bulk-import-stat bulk-import-stat-valid">
                    <span className="bulk-import-stat-value">{validCount}</span>
                    <span className="bulk-import-stat-label">{t('suppliersPage.bulkImport.valid')}</span>
                  </div>
                  <div className="bulk-import-stat bulk-import-stat-error">
                    <span className="bulk-import-stat-value">{errorCount}</span>
                    <span className="bulk-import-stat-label">{t('suppliersPage.bulkImport.errors')}</span>
                  </div>
                  <div className="bulk-import-stat bulk-import-stat-dup">
                    <span className="bulk-import-stat-value">{duplicateCount}</span>
                    <span className="bulk-import-stat-label">{t('suppliersPage.bulkImport.duplicates')}</span>
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
                      <span>{t('suppliersPage.bulkImport.skipDuplicates', { count: duplicateCount })}</span>
                    </label>
                    <span className="bulk-import-toggle-hint">
                      {t('suppliersPage.bulkImport.skipDuplicatesHint')}
                    </span>
                  </div>
                )}

                {/* Import Result */}
                {importResult && (
                  <div className="bulk-import-result">
                    <div className="bulk-import-result-icon">
                      <BiCheck size={32} />
                    </div>
                    <h6>{t('suppliersPage.bulkImport.importComplete')}</h6>
                    <div className="bulk-import-result-stats">
                      <span>{t('suppliersPage.bulkImport.imported')} <strong>{importResult.imported}</strong></span>
                      <span>{t('suppliersPage.bulkImport.updated')} <strong>{importResult.updated}</strong></span>
                      <span>{t('suppliersPage.bulkImport.failed')} <strong style={{ color: importResult.failed > 0 ? 'var(--danger)' : undefined }}>{importResult.failed}</strong></span>
                    </div>
                    {importResult.failedDetails.length > 0 && (
                      <div className="bulk-import-result-failures">
                        <small>{t('suppliersPage.bulkImport.failedRows')}</small>
                        {importResult.failedDetails.map((detail, i) => (
                          <div key={i} className="bulk-import-failure-item">{detail}</div>
                        ))}
                      </div>
                    )}
                    <button
                      className="btn-premium btn-premium-primary mt-3"
                      onClick={() => { setShowPreview(false); setImportResult(null); setParsedRows([]); }}
                    >
                      <BiRefresh /> {t('suppliersPage.bulkImport.importMore')}
                    </button>
                  </div>
                )}

                {/* Preview Table (hidden when import complete) */}
                {!importResult && (
                  <>
                    <div className="bulk-import-preview-scroll">
                      <table className="bulk-import-table">
                        <thead>
                          <tr>
                            <th style={{ width: '40px' }}>#</th>
                            <th>{t('common.name')}</th>
                            <th>{t('auth.phone')}</th>
                            <th>{t('auth.email')}</th>
                            <th>{t('suppliersPage.form.address')}</th>
                            <th>{t('suppliersPage.form.company')}</th>
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
                                  {row.nameBn && <small style={{ color: 'var(--text-muted)' }}>{row.nameBn}</small>}
                                </td>
                                <td style={{ fontSize: '0.85rem' }}>{row.phone || '-'}</td>
                                <td style={{ fontSize: '0.85rem' }}>{row.email || '-'}</td>
                                <td style={{ fontSize: '0.85rem', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.address || '-'}</td>
                                <td style={{ fontSize: '0.85rem' }}>{row.company || '-'}</td>
                                <td>
                                  {status === 'error' && (
                                    <span className="bulk-import-status-badge status-error" title={errors[idx]?.join(', ')}>
                                      <BiError /> {t('suppliersPage.bulkImport.statusError')}
                                    </span>
                                  )}
                                  {status === 'duplicate-skip' && (
                                    <span className="bulk-import-status-badge status-dup-skip" title={t('suppliersPage.bulkImport.duplicateOf', { name: duplicates[idx]?.name })}>
                                      <BiX /> {t('suppliersPage.bulkImport.statusSkip')}
                                    </span>
                                  )}
                                  {status === 'duplicate-update' && (
                                    <span className="bulk-import-status-badge status-dup-update" title={t('suppliersPage.bulkImport.willUpdate', { name: duplicates[idx]?.name })}>
                                      <BiRefresh /> {t('suppliersPage.bulkImport.statusUpdate')}
                                    </span>
                                  )}
                                  {status === 'valid' && (
                                    <span className="bulk-import-status-badge status-valid">
                                      <BiCheck /> {t('suppliersPage.bulkImport.statusValid')}
                                    </span>
                                  )}
                                </td>
                                <td>
                                  <button
                                    className="bulk-import-remove-row"
                                    onClick={() => removeRow(idx)}
                                    title={t('suppliersPage.bulkImport.removeRow')}
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
                        <h6><BiError /> {t('suppliersPage.bulkImport.rowErrors')}</h6>
                        {Object.entries(errors).map(([idx, errs]) => (
                          <div key={idx} className="bulk-import-error-item">
                            <strong>{t('suppliersPage.bulkImport.rowLabel', { num: parseInt(idx) + 1 })}</strong> {parsedRows[parseInt(idx)]?.name} — {errs.join(', ')}
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
                        <BiX /> {t('common.cancel')}
                      </button>
                      <button
                        className="btn-premium btn-premium-primary"
                        onClick={handleImport}
                        disabled={importing || validCount === 0}
                      >
                        {importing ? (
                          <><span className="spinner-border spinner-border-sm" /> {t('suppliersPage.bulkImport.importing')}</>
                        ) : (
                          <><BiUpload /> {t('suppliersPage.bulkImport.importSupplier', { count: validCount })}</>
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

// Fixed page size for the Suppliers list — server-side pagination via ?page=&limit=.
const SUPPLIERS_PER_PAGE = 10;

// ─── Main Suppliers Page ─────────────────────────────────────────────────────
const Suppliers = () => {
  const { t } = useTranslation();
  const [suppliers, setSuppliers] = useState([]);
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
  const [viewDetailsId, setViewDetailsId] = useState(null);
  const isFirstLoad = useRef(true);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // A new search term invalidates the current page — always land back on page 1.
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const fetchSuppliers = useCallback(async () => {
    const silent = !isFirstLoad.current;
    // Always skip global loading overlay — this page uses its own table loader
    if (silent) setSearching(true); else setLoading(true);
    try {
      const { data } = await api.get(
        `/suppliers?search=${encodeURIComponent(debouncedSearch)}&page=${page}&limit=${SUPPLIERS_PER_PAGE}`,
        { _skipLoading: true }
      );
      setSuppliers(data.suppliers || []);
      setTotalCount(data.total || 0);
      const pages = Math.max(1, data.pages || 1);
      setTotalPages(pages);
      // Self-correct if the current page no longer exists — e.g. the last
      // supplier on the last page was just deleted.
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
    fetchSuppliers();
  }, [fetchSuppliers]);

  const handleEdit = (supplier) => {
    setEditing(supplier);
    setDrawerOpen(true);
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/suppliers/${id}`);
      setDeleteConfirm(null);
      // Deleting the only supplier on a page beyond the first would otherwise
      // fetch that now-empty page first — step back a page up front instead.
      if (suppliers.length === 1 && page > 1) {
        setPage(page - 1);
      } else {
        fetchSuppliers();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div>
      {/* Page Header */}
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
        <div>
          <h4 className="mb-1" style={{ fontWeight: 800 }}>{t('nav.suppliers')}</h4>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
            {t('suppliersPage.subtitle')}
          </p>
        </div>
        <div className="d-flex gap-2">
          <button className="btn-premium btn-premium-secondary" onClick={() => { setBulkImportOpen(true); }}>
            <BiUpload /> {t('suppliersPage.bulkImportButton')}
          </button>
          <button className="btn-premium btn-premium-primary" onClick={() => { setEditing(null); setDrawerOpen(true); }}>
            <BiPlus /> {t('suppliersPage.addSupplier')}
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="mb-3" style={{ maxWidth: '400px' }}>
        <div className="search-box">
          <BiSearch className="search-icon" />
          <input
            className="form-control"
            placeholder={t('suppliersPage.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* ─── Desktop Table ─────────────────────────────────────────────── */}
      <div className={`table-container desktop-table ${searching ? 'is-refreshing' : ''}`}>
        <div className="table-responsive">
          <table className="table-custom mb-0">
            <thead>
              <tr>
                <th style={{ width: '56px' }}>{t('common.sl')}</th>
                <th>{t('auth.name')}</th>
                <th>{t('auth.phone')}</th>
                <th>{t('auth.email')}</th>
                <th>{t('common.due')}</th>
                <th style={{ width: '120px' }}>{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-5" style={{ color: 'var(--text-muted)' }}>
                    <div className="spinner-border spinner-border-sm me-2" /> {t('common.loading')}
                  </td>
                </tr>
              ) : suppliers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-5" style={{ color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem', opacity: 0.5 }}>🤝</div>
                    {t('empty.noSuppliers')}
                  </td>
                </tr>
              ) : suppliers.map((supplier, idx) => (
                <tr key={supplier._id}>
                  <td style={{ color: 'var(--text-muted)', fontWeight: 600 }}>
                    {(page - 1) * SUPPLIERS_PER_PAGE + idx + 1}
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{supplier.name}</div>
                    {supplier.nameBn && <small style={{ color: 'var(--text-muted)' }}>{supplier.nameBn}</small>}
                  </td>
                  <td>{supplier.phone}</td>
                  <td>{supplier.email || '-'}</td>
                  <td>
                    <span style={supplier.dueAmount > 0 ? { color: 'var(--danger)', fontWeight: 700 } : {}}>
                      ₹{supplier.dueAmount || 0}
                    </span>
                  </td>
                  <td>
                    <div className="d-flex gap-1">
                      <button className="btn-action btn-action-view" data-tooltip={t('common.view')} onClick={() => setViewDetailsId(supplier._id)}>
                        <BiShow />
                      </button>
                      <button className="btn-action btn-action-edit" data-tooltip={t('common.edit')} onClick={() => handleEdit(supplier)}>
                        <BiEdit />
                      </button>
                      <button className="btn-action btn-action-delete" data-tooltip={t('common.delete')} onClick={() => setDeleteConfirm(supplier._id)}>
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
            <div className="spinner-border spinner-border-sm me-2" /> {t('common.loading')}
          </div>
        ) : suppliers.length === 0 ? (
          <div className="text-center py-5" style={{ color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem', opacity: 0.5 }}>🤝</div>
            {t('empty.noSuppliers')}
          </div>
        ) : suppliers.map((supplier) => (
          <ExpandableCard
            key={supplier._id}
            compact={
              <>
                <div className="expandable-card__compact-row">
                  <span className="expandable-card__name">{supplier.name}</span>
                  <span className="expandable-card__price">₹{supplier.dueAmount || 0}</span>
                </div>
                <div className="expandable-card__meta">
                  <span className="expandable-card__meta-item">
                    <BiPhone />
                    <strong>{supplier.phone}</strong>
                  </span>
                  {supplier.email && (
                    <span className="expandable-card__meta-item">
                      <BiEnvelope />
                      <span>{supplier.email}</span>
                    </span>
                  )}
                </div>
              </>
            }
            expanded={
              <div className="expandable-card__rows">
                <div className="expandable-card__row">
                  <span className="expandable-card__row-label">{t('auth.phone')}</span>
                  <span className="expandable-card__row-dots" />
                  <span className="expandable-card__row-value">{supplier.phone}</span>
                </div>
                <div className="expandable-card__row">
                  <span className="expandable-card__row-label">{t('auth.email')}</span>
                  <span className="expandable-card__row-dots" />
                  <span className="expandable-card__row-value">{supplier.email || '-'}</span>
                </div>
                <div className="expandable-card__row">
                  <span className="expandable-card__row-label">{t('suppliersPage.form.company')}</span>
                  <span className="expandable-card__row-dots" />
                  <span className="expandable-card__row-value">{supplier.company || '-'}</span>
                </div>
                <div className="expandable-card__row">
                  <span className="expandable-card__row-label">{t('suppliersPage.form.address')}</span>
                  <span className="expandable-card__row-dots" />
                  <span className="expandable-card__row-value">{supplier.address || '-'}</span>
                </div>
                <div className="expandable-card__row">
                  <span className="expandable-card__row-label">{t('suppliersPage.dueAmount')}</span>
                  <span className="expandable-card__row-dots" />
                  <span className="expandable-card__row-value" style={supplier.dueAmount > 0 ? { color: 'var(--danger)' } : undefined}>₹{supplier.dueAmount || 0}</span>
                </div>
                <div className="expandable-card__row">
                  <span className="expandable-card__row-label">{t('suppliersPage.created')}</span>
                  <span className="expandable-card__row-dots" />
                  <span className="expandable-card__row-value">{new Date(supplier.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            }
            actions={
              <>
                <button className="btn-action btn-action-view" data-tooltip={t('common.view')} onClick={() => setViewDetailsId(supplier._id)}>
                  <BiShow />
                </button>
                <button className="btn-action btn-action-edit" data-tooltip={t('common.edit')} onClick={() => handleEdit(supplier)}>
                  <BiEdit />
                </button>
                <button className="btn-action btn-action-delete" data-tooltip={t('common.delete')} onClick={() => setDeleteConfirm(supplier._id)}>
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
        pageSize={SUPPLIERS_PER_PAGE}
        onPageChange={setPage}
      />

      {/* Add / Edit Supplier Drawer */}
      <SupplierDrawer
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setEditing(null); }}
        onSuccess={fetchSuppliers}
        editing={editing}
        t={t}
      />

      {/* Bulk Import Drawer */}
      <BulkImportDrawer
        open={bulkImportOpen}
        onClose={() => { setBulkImportOpen(false); }}
        onSuccess={fetchSuppliers}
        t={t}
      />

      {/* Supplier Details Drawer */}
      <SupplierDetailsDrawer
        open={!!viewDetailsId}
        supplierId={viewDetailsId}
        onClose={() => setViewDetailsId(null)}
        t={t}
      />

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="modal-premium" onClick={() => setDeleteConfirm(null)}>
          <div className="modal-premium-content" style={{ maxWidth: '420px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-premium-header">
              <h5>{t('suppliersPage.delete.title')}</h5>
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
                {t('suppliersPage.delete.message')}
              </p>
            </div>
            <div className="modal-premium-footer" style={{ justifyContent: 'center' }}>
              <button className="btn-premium btn-premium-secondary" onClick={() => setDeleteConfirm(null)}>{t('common.cancel')}</button>
              <button className="btn-premium btn-premium-danger" onClick={() => handleDelete(deleteConfirm)}>{t('common.delete')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Suppliers;