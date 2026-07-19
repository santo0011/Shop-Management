import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import api from '../../../services/api';
import Swal from 'sweetalert2';
import ProductDrawer from '../../../components/common/ProductDrawer';
import ExpandableCard from '../../../components/common/ExpandableCard';
import {
  BiSearch, BiPlus, BiEdit, BiTrash, BiX, BiCheck,
  BiUpload, BiDownload, BiFile, BiPaste, BiTable,
  BiError, BiRefresh, BiInfoCircle, BiLoader,
  BiShow, BiCategory, BiBarcode, BiCart, BiPackage,
  BiCalendar, BiDollar, BiStore
} from 'react-icons/bi';
import * as XLSX from 'xlsx';

// ─── Bulk Import Drawer ──────────────────────────────────────────────────────
const BulkImportDrawer = ({ open, onClose, onSuccess, t }) => {
  const [activeTab, setActiveTab] = useState('excel');
  const [pasteData, setPasteData] = useState('');
  const [parsedRows, setParsedRows] = useState([]);
  const [errors, setErrors] = useState({});
  const [duplicates, setDuplicates] = useState({});
  const [existingProducts, setExistingProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const [showPreview, setShowPreview] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const fileInputRef = useRef(null);

  const units = ['kg', 'gram', 'liter', 'ml', 'piece', 'packet', 'box', 'carton'];

  useEffect(() => {
    if (!open) return;
    resetState();
    loadReferenceData();
  }, [open]);

  const resetState = () => {
    setPasteData('');
    setParsedRows([]);
    setErrors({});
    setDuplicates({});
    setShowPreview(false);
    setImportResult(null);
    setImportProgress({ current: 0, total: 0 });
    setActiveTab('excel');
  };

  const loadReferenceData = async () => {
    try {
      const [catRes, supRes, prodRes] = await Promise.all([
        api.get('/categories?limit=10000', { _skipLoading: true }),
        api.get('/suppliers?limit=10000', { _skipLoading: true }),
        api.get('/products?limit=10000', { _skipLoading: true }),
      ]);
      setCategories(Array.isArray(catRes.data) ? catRes.data : catRes.data.categories || []);
      setSuppliers(supRes.data.suppliers || []);
      setExistingProducts(prodRes.data.products || []);
    } catch (err) {
      console.error(err);
    }
  };

  // ─── Detect Duplicates & Validate ──────────────────────────────────────
  const detectDuplicates = useCallback((rows) => {
    const dupMap = {};
    const errorMap = {};
    rows.forEach((row, idx) => {
      const rowErrors = [];

      // Required fields (category validation removed - uses global selection)
      if (!row.name?.trim()) rowErrors.push(t('validation.nameRequired'));
      if (row.purchasePrice === '' || row.purchasePrice === null || isNaN(Number(row.purchasePrice)) || Number(row.purchasePrice) < 0)
        rowErrors.push(t('validation.invalidPurchasePrice'));
      if (row.sellingPrice === '' || row.sellingPrice === null || isNaN(Number(row.sellingPrice)) || Number(row.sellingPrice) < 0)
        rowErrors.push(t('validation.invalidSellingPrice'));
      if (row.stock === '' || row.stock === null || isNaN(Number(row.stock)) || Number(row.stock) < 0)
        rowErrors.push(t('validation.invalidStockQuantity'));

      // Validate unit
      if (row.unit && !units.includes(row.unit?.toLowerCase())) {
        rowErrors.push(t('productsPage.bulkImport.invalidUnit', { unit: row.unit, validUnits: units.join(', ') }));
      }

      // Validate expiry date
      if (row.expiryDate) {
        const d = new Date(row.expiryDate);
        if (isNaN(d.getTime())) rowErrors.push(t('productsPage.bulkImport.invalidExpiryDate'));
      }

      // Check duplicates by barcode or name
      if (row.barcode?.trim()) {
        const existing = existingProducts.find(p =>
          p.barcode?.toLowerCase() === row.barcode.trim().toLowerCase()
        );
        if (existing) dupMap[idx] = { ...dupMap[idx], type: 'barcode', existing };
      }
      if (row.name?.trim()) {
        const existing = existingProducts.find(p =>
          p.name?.toLowerCase() === row.name.trim().toLowerCase()
        );
        if (existing) {
          if (!dupMap[idx] || dupMap[idx].existing._id !== existing._id) {
            dupMap[idx] = { ...dupMap[idx], type: dupMap[idx] ? 'both' : 'name', existing };
          }
        }
      }

      if (rowErrors.length > 0) {
        errorMap[idx] = rowErrors;
      }
    });
    setErrors(errorMap);
    setDuplicates(dupMap);
    return { errorMap, dupMap };
  }, [existingProducts]);

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
          Swal.fire({ icon: 'warning', title: t('productsPage.bulkImport.emptyFileTitle'), text: t('productsPage.bulkImport.emptyFileText'), confirmButtonColor: '#6C63FF' });
          return;
        }

        const mapped = jsonData.map(row => {
          const keys = Object.keys(row).reduce((acc, key) => {
            acc[key.toLowerCase().trim()] = row[key];
            return acc;
          }, {});
          return {
            name: keys.name || keys['product name'] || keys['product_name'] || keys['productname'] || '',
            supplier: keys.supplier || keys['supplier name'] || keys['supplier_name'] || keys['suppliername'] || '',
            purchasePrice: parseFloat(keys.purchaseprice || keys['purchase price'] || keys['purchase_price'] || 0) || 0,
            sellingPrice: parseFloat(keys.sellingprice || keys['selling price'] || keys['selling_price'] || keys['sale price'] || 0) || 0,
            stock: parseInt(keys.stock || keys['stock quantity'] || keys['stock_quantity'] || keys['quantity'] || 0) || 0,
            unit: (keys.unit || 'piece').toLowerCase(),
            barcode: keys.barcode || keys['bar code'] || keys['bar_code'] || '',
            expiryDate: keys.expirydate || keys['expiry date'] || keys['expiry_date'] || keys['exp date'] || '',
            nameBn: keys.namebn || keys['name_bn'] || keys['bangla name'] || keys['bangla_name'] || '',
            wholesalePrice: parseFloat(keys.wholesaleprice || keys['wholesale price'] || keys['wholesale_price'] || 0) || 0,
            minStock: parseInt(keys.minstock || keys['min stock'] || keys['min_stock'] || 10) || 10,
            discount: parseFloat(keys.discount || 0) || 0,
            tax: parseFloat(keys.tax || 0) || 0,
          };
        });

        setParsedRows(mapped);
        setShowPreview(true);
        detectDuplicates(mapped);
      } catch (err) {
        Swal.fire({ icon: 'error', title: t('productsPage.bulkImport.parseErrorTitle'), text: t('productsPage.bulkImport.parseErrorText'), confirmButtonColor: '#6C63FF' });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // ─── Download Sample Template ───────────────────────────────────────────
  const handleDownloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([
      {
        name: 'Rice 25kg',
        supplier: 'ABC Suppliers',
        purchasePrice: 1200,
        sellingPrice: 1400,
        stock: 50,
        unit: 'Bag',
        barcode: '8901234567890',
        expiryDate: '2027-12-31',
      },
      {
        name: 'Coca Cola 500ml',
        supplier: 'XYZ Foods',
        purchasePrice: 25,
        sellingPrice: 35,
        stock: 200,
        unit: 'Bottle',
        barcode: '8901234567891',
        expiryDate: '2027-06-30',
      },
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Products');
    XLSX.writeFile(wb, 'product_import_template.xlsx');
  };

  // ─── Paste Import ───────────────────────────────────────────────────────
  const handleParsePaste = () => {
    if (!pasteData.trim()) {
      Swal.fire({ icon: 'warning', title: t('productsPage.bulkImport.emptyDataTitle'), text: t('productsPage.bulkImport.emptyDataText'), confirmButtonColor: '#6C63FF' });
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
        supplier: cleanParts[1] || '',
        purchasePrice: parseFloat(cleanParts[2]) || 0,
        sellingPrice: parseFloat(cleanParts[3]) || 0,
        stock: parseInt(cleanParts[4]) || 0,
        unit: (cleanParts[5] || 'piece').toLowerCase(),
        barcode: cleanParts[6] || '',
        expiryDate: cleanParts[7] || '',
        nameBn: cleanParts[8] || '',
        wholesalePrice: parseFloat(cleanParts[9]) || 0,
        minStock: parseInt(cleanParts[10]) || 10,
        discount: parseFloat(cleanParts[11]) || 0,
        tax: parseFloat(cleanParts[12]) || 0,
      };
    });

    if (parsed.length === 0) {
      Swal.fire({ icon: 'warning', title: t('productsPage.bulkImport.noDataTitle'), text: t('productsPage.bulkImport.noDataText'), confirmButtonColor: '#6C63FF' });
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
    // Validate category is selected
    if (!selectedCategory) {
      Swal.fire({ icon: 'warning', title: t('productsPage.bulkImport.categoryRequiredTitle'), text: t('productsPage.bulkImport.categoryRequiredText'), confirmButtonColor: '#6C63FF' });
      return;
    }

    const validRows = parsedRows.filter((row, idx) => {
      if (errors[idx] && errors[idx].length > 0) return false;
      if (skipDuplicates && duplicates[idx]) return false;
      return true;
    });

    if (validRows.length === 0) {
      Swal.fire({ icon: 'warning', title: t('productsPage.bulkImport.noValidRowsTitle'), text: t('productsPage.bulkImport.noValidRowsText'), confirmButtonColor: '#6C63FF' });
      return;
    }

    setImporting(true);
    setImportProgress({ current: 0, total: validRows.length });
    let imported = 0;
    let updated = 0;
    let skipped = 0;
    let failed = 0;
    const failedDetails = [];

    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];
      setImportProgress({ current: i + 1, total: validRows.length });

      try {
        // Use the globally selected category for all products
        const categoryId = selectedCategory;

        // Check if duplicate (update existing)
        const dupInfo = duplicates[parsedRows.indexOf(row)];
        const existing = dupInfo?.existing;

        const payload = {
          name: row.name,
          nameBn: row.nameBn || '',
          category: categoryId,
          unit: units.includes(row.unit?.toLowerCase()) ? row.unit.toLowerCase() : 'piece',
          purchasePrice: Number(row.purchasePrice) || 0,
          sellingPrice: Number(row.sellingPrice) || 0,
          wholesalePrice: Number(row.wholesalePrice) || 0,
          stock: parseInt(row.stock) || 0,
          minStock: parseInt(row.minStock) || 10,
          barcode: row.barcode || '',
          discount: Number(row.discount) || 0,
          tax: Number(row.tax) || 0,
          expiryDate: row.expiryDate ? new Date(row.expiryDate) : undefined,
        };

        if (existing && !skipDuplicates) {
          await api.put(`/products/${existing._id}`, payload);
          updated++;
        } else {
          await api.post('/products', payload);
          imported++;
        }
      } catch (err) {
        failed++;
        failedDetails.push(`${row.name}: ${err.response?.data?.message || err.message}`);
      }
    }

    setImportResult({ total: validRows.length, imported, updated, skipped, failed, failedDetails });
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
      <div className={`drawer ${open ? 'open' : ''}`} style={{ width: '720px', maxWidth: '100vw' }}>
        <div className="drawer-header">
          <h5><BiUpload className="me-2" />{t('productsPage.bulkImport.title')}</h5>
          <button className="btn-close-premium" onClick={onClose}><BiX /></button>
        </div>
        <div className="drawer-body" style={{ padding: 0, display: 'flex', flexDirection: 'column' }}>
          {/* Tabs */}
          <div className="bulk-import-tabs">
            <button
              className={`bulk-import-tab ${activeTab === 'excel' ? 'active' : ''}`}
              onClick={() => { setActiveTab('excel'); setShowPreview(false); setParsedRows([]); }}
            >
              <BiFile /> {t('productsPage.bulkImport.tabExcel')}
            </button>
            <button
              className={`bulk-import-tab ${activeTab === 'paste' ? 'active' : ''}`}
              onClick={() => { setActiveTab('paste'); setShowPreview(false); setParsedRows([]); }}
            >
              <BiPaste /> {t('productsPage.bulkImport.tabPaste')}
            </button>
          </div>

          <div style={{ padding: '1.25rem', flex: 1, overflowY: 'auto' }}>
            {/* ─── Category Selection (Mandatory - Gates all import actions) ── */}
            <div className="bulk-import-category-select">
              <label className="bulk-import-category-label">
                <BiInfoCircle /> {t('productsPage.bulkImport.step1SelectCategory')} <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <select
                className="form-select"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="">{t('productsPage.bulkImport.selectCategoryOption')}</option>
                {categories.map((cat) => (
                  <option key={cat._id} value={cat._id}>{cat.name}</option>
                ))}
              </select>
              {!selectedCategory && (
                <div className="bulk-import-category-hint">
                  <BiInfoCircle /> {t('productsPage.bulkImport.selectCategoryHint')}
                </div>
              )}
            </div>

            {/* ─── Tab 1: Excel/CSV ────────────────────────────────────────── */}
            {activeTab === 'excel' && !showPreview && (
              <div className={`bulk-import-upload-area ${!selectedCategory ? 'bulk-import-disabled' : ''}`}>
                <div className="bulk-import-upload-box">
                  <BiUpload size={48} />
                  <h6>{t('productsPage.bulkImport.uploadTitle')}</h6>
                  <p>{t('productsPage.bulkImport.uploadSubtitle')}</p>
                  <div className="d-flex gap-2 justify-content-center flex-wrap">
                    <button
                      className="btn-premium btn-premium-primary"
                      onClick={() => selectedCategory && fileInputRef.current?.click()}
                      disabled={!selectedCategory}
                    >
                      <BiUpload /> {t('productsPage.bulkImport.selectFile')}
                    </button>
                    <button
                      className="btn-premium btn-premium-secondary"
                      onClick={handleDownloadTemplate}
                    >
                      <BiDownload /> {t('productsPage.bulkImport.downloadTemplate')}
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
                    <small>{t('productsPage.bulkImport.expectedFormat')}</small>
                  </div>
                </div>
              </div>
            )}

            {/* ─── Tab 2: Paste ────────────────────────────────────────────── */}
            {activeTab === 'paste' && !showPreview && (
              <div className={`bulk-import-paste-area ${!selectedCategory ? 'bulk-import-disabled' : ''}`}>
                <div className="bulk-import-paste-header">
                  <BiPaste size={28} />
                  <h6>{t('productsPage.bulkImport.pasteTitle')}</h6>
                </div>
                <p className="bulk-import-paste-desc">
                  {t('productsPage.bulkImport.pasteDesc')}
                </p>
                <div className="bulk-import-format-example">
                  <strong>{t('productsPage.bulkImport.formatLabel')}</strong> {t('productsPage.bulkImport.formatExample')}
                </div>
                <textarea
                  className="bulk-import-textarea"
                  rows={8}
                  value={pasteData}
                  onChange={(e) => setPasteData(e.target.value)}
                  disabled={!selectedCategory}
                  placeholder={selectedCategory ? t('productsPage.bulkImport.pastePlaceholderReady') : t('productsPage.bulkImport.pastePlaceholderDisabled')}
                />
                <button
                  className="btn-premium btn-premium-primary w-100 mt-2"
                  onClick={handleParsePaste}
                  disabled={!selectedCategory}
                >
                  <BiTable /> {t('productsPage.bulkImport.parsePreview')}
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
                    <span className="bulk-import-stat-label">{t('productsPage.bulkImport.totalRows')}</span>
                  </div>
                  <div className="bulk-import-stat bulk-import-stat-valid">
                    <span className="bulk-import-stat-value">{validCount}</span>
                    <span className="bulk-import-stat-label">{t('productsPage.bulkImport.valid')}</span>
                  </div>
                  <div className="bulk-import-stat bulk-import-stat-error">
                    <span className="bulk-import-stat-value">{errorCount}</span>
                    <span className="bulk-import-stat-label">{t('productsPage.bulkImport.errors')}</span>
                  </div>
                  <div className="bulk-import-stat bulk-import-stat-dup">
                    <span className="bulk-import-stat-value">{duplicateCount}</span>
                    <span className="bulk-import-stat-label">{t('productsPage.bulkImport.duplicates')}</span>
                  </div>
                </div>

                {/* Category Selection */}
                <div className="bulk-import-category-select">
                  <label className="bulk-import-category-label">
                    <BiInfoCircle /> {t('productsPage.bulkImport.selectCategoryForAll')}
                  </label>
                  <select
                    className="form-select"
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                  >
                    <option value="">{t('productsPage.bulkImport.selectCategoryOptionShort')}</option>
                    {categories.map((cat) => (
                      <option key={cat._id} value={cat._id}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                {/* Duplicate handling */}
                {duplicateCount > 0 && (
                  <div className="bulk-import-dup-toggle">
                    <label className="bulk-import-toggle-label">
                      <input
                        type="checkbox"
                        checked={skipDuplicates}
                        onChange={(e) => setSkipDuplicates(e.target.checked)}
                      />
                      <span>{t('productsPage.bulkImport.skipExisting', { count: duplicateCount })}</span>
                    </label>
                    <span className="bulk-import-toggle-hint">
                      {t('productsPage.bulkImport.skipExistingHint')}
                    </span>
                  </div>
                )}

                {/* Import Progress */}
                {importing && (
                  <div className="bulk-import-progress">
                    <div className="bulk-import-progress-bar">
                      <div
                        className="bulk-import-progress-fill"
                        style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                      />
                    </div>
                    <span className="bulk-import-progress-text">
                      <BiLoader className="spin" /> {t('productsPage.bulkImport.importingProgress', { current: importProgress.current, total: importProgress.total })}
                    </span>
                  </div>
                )}

                {/* Import Result */}
                {importResult && (
                  <div className="bulk-import-result">
                    <div className="bulk-import-result-icon">
                      <BiCheck size={32} />
                    </div>
                    <h6>{t('productsPage.bulkImport.importComplete')}</h6>
                    <div className="bulk-import-result-stats">
                      <span>{t('productsPage.bulkImport.imported')} <strong>{importResult.imported}</strong></span>
                      <span>{t('productsPage.bulkImport.updated')} <strong>{importResult.updated}</strong></span>
                      <span>{t('productsPage.bulkImport.skipped')} <strong>{importResult.skipped}</strong></span>
                      <span>{t('productsPage.bulkImport.failed')} <strong style={{ color: importResult.failed > 0 ? 'var(--danger)' : undefined }}>{importResult.failed}</strong></span>
                    </div>
                    {importResult.failedDetails.length > 0 && (
                      <div className="bulk-import-result-failures">
                        <small>{t('productsPage.bulkImport.details')}</small>
                        {importResult.failedDetails.map((detail, i) => (
                          <div key={i} className="bulk-import-failure-item">{detail}</div>
                        ))}
                      </div>
                    )}
                    <button
                      className="btn-premium btn-premium-primary mt-3"
                      onClick={() => { setShowPreview(false); setImportResult(null); setParsedRows([]); }}
                    >
                      <BiRefresh /> {t('productsPage.bulkImport.importMore')}
                    </button>
                  </div>
                )}

                {/* Preview Table */}
                {!importResult && !importing && (
                  <>
                    <div className="bulk-import-preview-scroll">
                      <table className="bulk-import-table">
                        <thead>
                          <tr>
                            <th style={{ width: '36px' }}>#</th>
                            <th>{t('common.name')}</th>
                            <th>{t('purchase.supplier')}</th>
                            <th>{t('productsPage.bulkImport.colPurchase')}</th>
                            <th>{t('productsPage.bulkImport.colSelling')}</th>
                            <th>{t('product.stock')}</th>
                            <th>{t('product.unit')}</th>
                            <th>{t('product.barcode')}</th>
                            <th>{t('productsPage.bulkImport.colExpiry')}</th>
                            <th style={{ width: '70px' }}>{t('common.status')}</th>
                            <th style={{ width: '36px' }}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {parsedRows.map((row, idx) => {
                            const status = getRowStatus(idx);
                            return (
                              <tr key={idx} className={`bulk-import-row-${status}`}>
                                <td style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{idx + 1}</td>
                                <td>
                                  <div style={{ fontWeight: 600, fontSize: '0.8rem' }}>{row.name || '-'}</div>
                                </td>
                                <td style={{ fontSize: '0.78rem' }}>{row.supplier || '-'}</td>
                                <td style={{ fontSize: '0.78rem' }}>₹{Number(row.purchasePrice).toFixed(2)}</td>
                                <td style={{ fontSize: '0.78rem' }}>₹{Number(row.sellingPrice).toFixed(2)}</td>
                                <td style={{ fontSize: '0.78rem' }}>{row.stock}</td>
                                <td style={{ fontSize: '0.78rem' }}>{row.unit || '-'}</td>
                                <td style={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>{row.barcode || '-'}</td>
                                <td style={{ fontSize: '0.75rem' }}>{row.expiryDate || '-'}</td>
                                <td>
                                  {status === 'error' && (
                                    <span className="bulk-import-status-badge status-error" title={errors[idx]?.join(', ')}>
                                      <BiError /> {t('common.error')}
                                    </span>
                                  )}
                                  {status === 'duplicate-skip' && (
                                    <span className="bulk-import-status-badge status-dup-skip" title={t('productsPage.bulkImport.duplicateOf', { name: duplicates[idx]?.existing?.name })}>
                                      <BiX /> {t('productsPage.bulkImport.statusSkip')}
                                    </span>
                                  )}
                                  {status === 'duplicate-update' && (
                                    <span className="bulk-import-status-badge status-dup-update" title={t('productsPage.bulkImport.willUpdate', { name: duplicates[idx]?.existing?.name })}>
                                      <BiRefresh /> {t('common.update')}
                                    </span>
                                  )}
                                  {status === 'valid' && (
                                    <span className="bulk-import-status-badge status-valid">
                                      <BiCheck /> {t('productsPage.bulkImport.valid')}
                                    </span>
                                  )}
                                </td>
                                <td>
                                  <button
                                    className="bulk-import-remove-row"
                                    onClick={() => removeRow(idx)}
                                    title={t('productsPage.bulkImport.removeRow')}
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
                        <h6><BiError /> {t('productsPage.bulkImport.rowErrorsHeading')}</h6>
                        {Object.entries(errors).map(([idx, errs]) => (
                          <div key={idx} className="bulk-import-error-item">
                            <strong>{t('productsPage.bulkImport.rowLabel', { number: parseInt(idx) + 1 })}</strong> {parsedRows[parseInt(idx)]?.name} — {errs.join(', ')}
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
                          <><span className="spinner-border spinner-border-sm" /> {t('productsPage.bulkImport.importingButton')}</>
                        ) : (
                          <><BiUpload /> {t('productsPage.bulkImport.importProducts', { count: validCount })}</>
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

// ─── Main Products Page ──────────────────────────────────────────────────────
const Products = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [search, setSearch] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [bulkImportOpen, setBulkImportOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const isFirstLoad = useRef(true);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  // Deep-link: open a specific product's drawer when navigated here from Global Search.
  useEffect(() => {
    const openId = location.state?.openProductId;
    if (!openId) return;
    window.history.replaceState({}, document.title);
    // Fetch single product — no global loader needed, drawer handles its own loading
    api.get(`/products/${openId}`, { _skipLoading: true })
      .then(({ data }) => { setEditing(data); setDrawerOpen(true); })
      .catch((err) => console.error(err));
  }, [location.state]);

  const fetchProducts = async () => {
    // Only the very first load shows the full-page loader; searches/refreshes
    // stay silent and use the inline search spinner + table indicator instead.
    const silent = !isFirstLoad.current;
    // Always skip global loading overlay — this page uses its own table loader
    if (silent) setSearching(true); else setLoading(true);
    try {
      const { data } = await api.get(`/products?search=${search}`, { _skipLoading: true });
      setProducts(data.products);
    } catch (err) {
      console.error(err);
    } finally {
      if (silent) setSearching(false); else setLoading(false);
      isFirstLoad.current = false;
    }
  };

  const fetchCategories = async () => {
    try {
      const { data } = await api.get('/categories', { _skipLoading: true });
      setCategories(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => fetchProducts(), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleEdit = (product) => {
    setEditing(product);
    setDrawerOpen(true);
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/products/${id}`);
      setDeleteConfirm(null);
      fetchProducts();
    } catch (err) {
      console.error(err);
    }
  };

  const units = [
    { value: 'kg', label: t('units.kg') },
    { value: 'gram', label: t('units.gram') },
    { value: 'liter', label: t('units.liter') },
    { value: 'ml', label: t('units.ml') },
    { value: 'piece', label: t('units.piece') },
    { value: 'packet', label: t('units.packet') },
    { value: 'box', label: t('units.box') },
    { value: 'carton', label: t('units.carton') },
  ];

  return (
    <div>
      {/* Page Header */}
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
        <div>
          <h4 className="mb-1" style={{ fontWeight: 800 }}>{t('nav.products')}</h4>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
            {t('productsPage.subtitle')}
          </p>
        </div>
        <div className="d-flex gap-2">
          <button className="btn-premium btn-premium-secondary" onClick={() => { setBulkImportOpen(true); }}>
            <BiUpload /> {t('productsPage.bulkImportButton')}
          </button>
          <button className="btn-premium btn-premium-primary" onClick={() => { setEditing(null); setDrawerOpen(true); }}>
            <BiPlus /> {t('product.addProduct')}
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="mb-3" style={{ maxWidth: '400px' }}>
        <div className="search-box">
          <BiSearch className="search-icon" />
          <input
            className="form-control"
            placeholder={t('product.searchProductsPlaceholder')}
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
                <th>{t('product.productName')}</th>
                <th>{t('product.category')}</th>
                <th>{t('product.sellingPrice')}</th>
                <th>{t('product.stock')}</th>
                <th>{t('common.status')}</th>
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
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-5" style={{ color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem', opacity: 0.5 }}>📦</div>
                    {t('empty.noProducts')}
                  </td>
                </tr>
              ) : products.map((product) => (
                <tr key={product._id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{product.name}</div>
                    {product.nameBn && <small style={{ color: 'var(--text-muted)' }}>{product.nameBn}</small>}
                  </td>
                  <td>{product.category?.name || '-'}</td>
                  <td>₹{product.sellingPrice}</td>
                  <td>
                    <span style={product.stock <= product.minStock ? { color: 'var(--danger)', fontWeight: 700 } : undefined}>
                      {product.stock} {product.unit}
                    </span>
                  </td>
                  <td>
                    {product.stock <= product.minStock ? (
                      <span className="badge badge-danger">{t('product.lowStock')}</span>
                    ) : (
                      <span className="badge badge-success">{t('common.active')}</span>
                    )}
                  </td>
                  <td>
                    <div className="d-flex gap-1">
                      <button className="btn-action btn-action-edit" data-tooltip={t('common.edit')} onClick={() => handleEdit(product)}>
                        <BiEdit />
                      </button>
                      <button className="btn-action btn-action-delete" data-tooltip={t('common.delete')} onClick={() => setDeleteConfirm(product._id)}>
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
        ) : products.length === 0 ? (
          <div className="text-center py-5" style={{ color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem', opacity: 0.5 }}>📦</div>
            {t('empty.noProducts')}
          </div>
        ) : products.map((product) => (
          <ExpandableCard
            key={product._id}
            compact={
              <>
                <div className="expandable-card__compact-row">
                  <span className="expandable-card__name">{product.name}</span>
                  <span className="expandable-card__price">₹{product.sellingPrice}</span>
                </div>
                <div className="expandable-card__meta">
                  <span className="expandable-card__meta-item">
                    <BiPackage />
                    <strong>{product.stock}</strong> {product.unit}
                  </span>
                  <span className={`expandable-card__stock ${product.stock <= product.minStock ? 'expandable-card__stock--low' : 'expandable-card__stock--ok'}`}>
                    {product.stock <= product.minStock ? t('product.lowStock') : t('product.inStock')}
                  </span>
                </div>
              </>
            }
            expanded={
              <div className="expandable-card__rows">
                <div className="expandable-card__row">
                  <span className="expandable-card__row-label">{t('product.category')}</span>
                  <span className="expandable-card__row-dots" />
                  <span className="expandable-card__row-value">{product.category?.name || '-'}</span>
                </div>
                <div className="expandable-card__row">
                  <span className="expandable-card__row-label">{t('product.barcode')}</span>
                  <span className="expandable-card__row-dots" />
                  <span className="expandable-card__row-value expandable-card__row-value--mono">{product.barcode || '-'}</span>
                </div>
                <div className="expandable-card__row">
                  <span className="expandable-card__row-label">{t('product.purchasePrice')}</span>
                  <span className="expandable-card__row-dots" />
                  <span className="expandable-card__row-value">₹{product.purchasePrice || 0}</span>
                </div>
                <div className="expandable-card__row">
                  <span className="expandable-card__row-label">{t('product.wholesalePrice')}</span>
                  <span className="expandable-card__row-dots" />
                  <span className="expandable-card__row-value">₹{product.wholesalePrice || 0}</span>
                </div>
                <div className="expandable-card__row">
                  <span className="expandable-card__row-label">{t('product.unit')}</span>
                  <span className="expandable-card__row-dots" />
                  <span className="expandable-card__row-value">{product.unit || '-'}</span>
                </div>
                <div className="expandable-card__row">
                  <span className="expandable-card__row-label">{t('product.minStock')}</span>
                  <span className="expandable-card__row-dots" />
                  <span className="expandable-card__row-value">{product.minStock || 0}</span>
                </div>
                <div className="expandable-card__row">
                  <span className="expandable-card__row-label">{t('common.status')}</span>
                  <span className="expandable-card__row-dots" />
                  <span className="expandable-card__row-value">
                    {product.stock <= product.minStock ? (
                      <span className="badge badge-danger">{t('product.lowStock')}</span>
                    ) : (
                      <span className="badge badge-success">{t('common.active')}</span>
                    )}
                  </span>
                </div>
                <div className="expandable-card__row">
                  <span className="expandable-card__row-label">{t('productsPage.created')}</span>
                  <span className="expandable-card__row-dots" />
                  <span className="expandable-card__row-value">{new Date(product.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            }
            actions={
              <>
                <button className="btn-action btn-action-edit" data-tooltip={t('common.edit')} onClick={() => handleEdit(product)}>
                  <BiEdit />
                </button>
                <button className="btn-action btn-action-delete" data-tooltip={t('common.delete')} onClick={() => setDeleteConfirm(product._id)}>
                  <BiTrash />
                </button>
              </>
            }
          />
        ))}
      </div>

      {/* Add / Edit Product Drawer */}
      <ProductDrawer
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setEditing(null); }}
        onSuccess={fetchProducts}
        editing={editing}
        categories={categories}
        units={units}
        t={t}
      />

      {/* Bulk Import Drawer */}
      <BulkImportDrawer
        open={bulkImportOpen}
        onClose={() => { setBulkImportOpen(false); }}
        onSuccess={fetchProducts}
        t={t}
      />

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="modal-premium" onClick={() => setDeleteConfirm(null)}>
          <div className="modal-premium-content" style={{ maxWidth: '420px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-premium-header">
              <h5>{t('confirm.deleteTitle')}</h5>
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
                {t('confirm.deleteMessage')}
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

export default Products;