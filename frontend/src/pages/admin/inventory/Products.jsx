import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import api from '../../../services/api';
import Swal from 'sweetalert2';
import {
  BiSearch, BiPlus, BiEdit, BiTrash, BiX, BiCheck,
  BiUpload, BiDownload, BiFile, BiPaste, BiTable,
  BiError, BiRefresh, BiInfoCircle, BiLoader
} from 'react-icons/bi';
import * as XLSX from 'xlsx';

const emptyForm = {
  name: '', nameBn: '', sku: '', barcode: '', category: '',
  unit: 'piece', purchasePrice: '', sellingPrice: '', wholesalePrice: '',
  stock: '', minStock: '10', trackStock: true, discount: 0, tax: 0,
};

const REQUIRED_FIELDS = ['name', 'category', 'purchasePrice', 'sellingPrice', 'stock'];

const validateField = (name, value) => {
  switch (name) {
    case 'name': return String(value || '').trim() ? '' : 'Product name is required';
    case 'category': return value ? '' : 'Category is required';
    case 'purchasePrice': return value !== '' && value !== null && Number(value) >= 0 ? '' : 'Enter a valid purchase price';
    case 'sellingPrice': return value !== '' && value !== null && Number(value) >= 0 ? '' : 'Enter a valid selling price';
    case 'stock': return value !== '' && value !== null && Number(value) >= 0 ? '' : 'Enter a valid stock quantity';
    default: return '';
  }
};

// ─── Add/Edit Product Drawer ─────────────────────────────────────────────────
const ProductDrawer = ({ open, onClose, onSuccess, editing, categories, units, t }) => {
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
      sku: editing.sku || '',
      barcode: editing.barcode || '',
      category: editing.category?._id || editing.category || '',
      unit: editing.unit || 'piece',
      purchasePrice: editing.purchasePrice,
      sellingPrice: editing.sellingPrice,
      wholesalePrice: editing.wholesalePrice || '',
      stock: editing.stock,
      minStock: editing.minStock,
      trackStock: editing.trackStock,
      discount: editing.discount || 0,
      tax: editing.tax || 0,
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
        await api.put(`/products/${editing._id}`, form);
      } else {
        await api.post('/products', form);
      }
      onSuccess();
      onClose();
    } catch (err) {
      setSubmitError(err.response?.data?.message || 'Failed to save product');
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
          <h5>{editing ? t('product.editProduct') : t('product.addProduct')}</h5>
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
          <form onSubmit={handleSubmit} id="product-form" noValidate>
            <div className="row g-3">
              <div className="col-md-6">
                <div className="form-group mb-0">
                  <label className="form-label">{t('product.productName')} (EN) <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input {...field('name')} />
                  {errors.name && <div className="invalid-feedback-premium">{errors.name}</div>}
                </div>
              </div>
              <div className="col-md-6">
                <div className="form-group mb-0">
                  <label className="form-label">{t('product.productName')} (BN)</label>
                  <input {...field('nameBn')} />
                </div>
              </div>
              <div className="col-md-4">
                <div className="form-group mb-0">
                  <label className="form-label">{t('product.category')} <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <select
                    className={`form-select ${errors.category ? 'is-invalid' : ''}`}
                    value={form.category}
                    onChange={(e) => handleChange('category', e.target.value)}
                  >
                    <option value="">Select</option>
                    {categories.map((cat) => <option key={cat._id} value={cat._id}>{cat.name}</option>)}
                  </select>
                  {errors.category && <div className="invalid-feedback-premium">{errors.category}</div>}
                </div>
              </div>
              <div className="col-md-4">
                <div className="form-group mb-0">
                  <label className="form-label">{t('product.unit')}</label>
                  <select className="form-select" value={form.unit} onChange={(e) => handleChange('unit', e.target.value)}>
                    {units.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="col-md-4">
                <div className="form-group mb-0">
                  <label className="form-label">{t('product.barcode')}</label>
                  <input {...field('barcode')} />
                </div>
              </div>
              <div className="col-md-4">
                <div className="form-group mb-0">
                  <label className="form-label">{t('product.purchasePrice')} <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input type="number" {...field('purchasePrice')} />
                  {errors.purchasePrice && <div className="invalid-feedback-premium">{errors.purchasePrice}</div>}
                </div>
              </div>
              <div className="col-md-4">
                <div className="form-group mb-0">
                  <label className="form-label">{t('product.sellingPrice')} <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input type="number" {...field('sellingPrice')} />
                  {errors.sellingPrice && <div className="invalid-feedback-premium">{errors.sellingPrice}</div>}
                </div>
              </div>
              <div className="col-md-4">
                <div className="form-group mb-0">
                  <label className="form-label">{t('product.wholesalePrice')}</label>
                  <input type="number" {...field('wholesalePrice')} />
                </div>
              </div>
              <div className="col-md-4">
                <div className="form-group mb-0">
                  <label className="form-label">{t('product.stock')} <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input type="number" {...field('stock')} />
                  {errors.stock && <div className="invalid-feedback-premium">{errors.stock}</div>}
                </div>
              </div>
              <div className="col-md-4">
                <div className="form-group mb-0">
                  <label className="form-label">{t('product.minStock')}</label>
                  <input type="number" {...field('minStock')} />
                </div>
              </div>
              <div className="col-md-4">
                <div className="form-group mb-0">
                  <label className="form-label">{t('sale.discount')} (%)</label>
                  <input type="number" {...field('discount')} />
                </div>
              </div>
              <div className="col-md-4">
                <div className="form-group mb-0">
                  <label className="form-label">{t('sale.tax')} (%)</label>
                  <input type="number" {...field('tax')} />
                </div>
              </div>
            </div>
          </form>
        </div>
        <div className="drawer-footer">
          <button type="button" className="btn-premium btn-premium-secondary" onClick={onClose}>{t('common.cancel')}</button>
          <button type="submit" form="product-form" className="btn-premium btn-premium-primary" disabled={saving}>
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
        api.get('/categories?limit=10000'),
        api.get('/suppliers?limit=10000'),
        api.get('/products?limit=10000'),
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
      if (!row.name?.trim()) rowErrors.push('Product name is required');
      if (row.purchasePrice === '' || row.purchasePrice === null || isNaN(Number(row.purchasePrice)) || Number(row.purchasePrice) < 0)
        rowErrors.push('Valid purchase price required');
      if (row.sellingPrice === '' || row.sellingPrice === null || isNaN(Number(row.sellingPrice)) || Number(row.sellingPrice) < 0)
        rowErrors.push('Valid selling price required');
      if (row.stock === '' || row.stock === null || isNaN(Number(row.stock)) || Number(row.stock) < 0)
        rowErrors.push('Valid stock quantity required');

      // Validate unit
      if (row.unit && !units.includes(row.unit?.toLowerCase())) {
        rowErrors.push(`Invalid unit "${row.unit}". Valid: ${units.join(', ')}`);
      }

      // Validate expiry date
      if (row.expiryDate) {
        const d = new Date(row.expiryDate);
        if (isNaN(d.getTime())) rowErrors.push('Invalid expiry date format (use YYYY-MM-DD)');
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
          Swal.fire({ icon: 'warning', title: 'Empty File', text: 'The file contains no data.', confirmButtonColor: '#6C63FF' });
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
        Swal.fire({ icon: 'error', title: 'Parse Error', text: 'Failed to parse the file. Please check the format.', confirmButtonColor: '#6C63FF' });
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
      Swal.fire({ icon: 'warning', title: 'Empty Data', text: 'Please paste product data first.', confirmButtonColor: '#6C63FF' });
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
    // Validate category is selected
    if (!selectedCategory) {
      Swal.fire({ icon: 'warning', title: 'Category Required', text: 'Please select a category before importing.', confirmButtonColor: '#6C63FF' });
      return;
    }

    const validRows = parsedRows.filter((row, idx) => {
      if (errors[idx] && errors[idx].length > 0) return false;
      if (skipDuplicates && duplicates[idx]) return false;
      return true;
    });

    if (validRows.length === 0) {
      Swal.fire({ icon: 'warning', title: 'No Valid Rows', text: 'All rows have errors or are duplicates. Fix them or adjust settings.', confirmButtonColor: '#6C63FF' });
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
          <h5><BiUpload className="me-2" />Bulk Import Products</h5>
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
            {/* ─── Category Selection (Mandatory - Gates all import actions) ── */}
            <div className="bulk-import-category-select">
              <label className="bulk-import-category-label">
                <BiInfoCircle /> Step 1: Select Category <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <select
                className="form-select"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="">— Select a category to enable import —</option>
                {categories.map((cat) => (
                  <option key={cat._id} value={cat._id}>{cat.name}</option>
                ))}
              </select>
              {!selectedCategory && (
                <div className="bulk-import-category-hint">
                  <BiInfoCircle /> Please select a category above to proceed with import
                </div>
              )}
            </div>

            {/* ─── Tab 1: Excel/CSV ────────────────────────────────────────── */}
            {activeTab === 'excel' && !showPreview && (
              <div className={`bulk-import-upload-area ${!selectedCategory ? 'bulk-import-disabled' : ''}`}>
                <div className="bulk-import-upload-box">
                  <BiUpload size={48} />
                  <h6>Upload Excel or CSV File</h6>
                  <p>Supports .xlsx, .xls, and .csv files</p>
                  <div className="d-flex gap-2 justify-content-center flex-wrap">
                    <button
                      className="btn-premium btn-premium-primary"
                      onClick={() => selectedCategory && fileInputRef.current?.click()}
                      disabled={!selectedCategory}
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
                    <small>Expected: Name, Supplier, Purchase Price, Selling Price, Stock, Unit, Barcode, Expiry Date</small>
                  </div>
                </div>
              </div>
            )}

            {/* ─── Tab 2: Paste ────────────────────────────────────────────── */}
            {activeTab === 'paste' && !showPreview && (
              <div className={`bulk-import-paste-area ${!selectedCategory ? 'bulk-import-disabled' : ''}`}>
                <div className="bulk-import-paste-header">
                  <BiPaste size={28} />
                  <h6>Paste Product Data</h6>
                </div>
                <p className="bulk-import-paste-desc">
                  Paste comma-separated values. One product per line.
                </p>
                <div className="bulk-import-format-example">
                  <strong>Format:</strong> Product Name, Supplier, Purchase Price, Selling Price, Stock, Unit, Barcode, Expiry Date
                </div>
                <textarea
                  className="bulk-import-textarea"
                  rows={8}
                  value={pasteData}
                  onChange={(e) => setPasteData(e.target.value)}
                  disabled={!selectedCategory}
                  placeholder={selectedCategory ? `Rice 25kg,ABC Suppliers,1200,1400,50,Bag,8901234567890,2027-12-31\nCoca Cola 500ml,XYZ Foods,25,35,200,Bottle,8901234567891,2027-06-30` : 'Select a category first to enable data entry'}
                />
                <button
                  className="btn-premium btn-premium-primary w-100 mt-2"
                  onClick={handleParsePaste}
                  disabled={!selectedCategory}
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

                {/* Category Selection */}
                <div className="bulk-import-category-select">
                  <label className="bulk-import-category-label">
                    <BiInfoCircle /> Select Category for All Products
                  </label>
                  <select
                    className="form-select"
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                  >
                    <option value="">— Select a category —</option>
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
                      <span>Skip existing products ({duplicateCount} found)</span>
                    </label>
                    <span className="bulk-import-toggle-hint">
                      Uncheck to update existing records instead
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
                      <BiLoader className="spin" /> Importing {importProgress.current} of {importProgress.total}...
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
                      <span>Skipped: <strong>{importResult.skipped}</strong></span>
                      <span>Failed: <strong style={{ color: importResult.failed > 0 ? 'var(--danger)' : undefined }}>{importResult.failed}</strong></span>
                    </div>
                    {importResult.failedDetails.length > 0 && (
                      <div className="bulk-import-result-failures">
                        <small>Details:</small>
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
                {!importResult && !importing && (
                  <>
                    <div className="bulk-import-preview-scroll">
                      <table className="bulk-import-table">
                        <thead>
                          <tr>
                            <th style={{ width: '36px' }}>#</th>
                            <th>Name</th>
                            <th>Supplier</th>
                            <th>Purchase</th>
                            <th>Selling</th>
                            <th>Stock</th>
                            <th>Unit</th>
                            <th>Barcode</th>
                            <th>Expiry</th>
                            <th style={{ width: '70px' }}>Status</th>
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
                                      <BiError /> Error
                                    </span>
                                  )}
                                  {status === 'duplicate-skip' && (
                                    <span className="bulk-import-status-badge status-dup-skip" title={`Duplicate of ${duplicates[idx]?.existing?.name}`}>
                                      <BiX /> Skip
                                    </span>
                                  )}
                                  {status === 'duplicate-update' && (
                                    <span className="bulk-import-status-badge status-dup-update" title={`Will update ${duplicates[idx]?.existing?.name}`}>
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
                          <><BiUpload /> Import {validCount} Product{validCount !== 1 ? 's' : ''}</>
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
    api.get(`/products/${openId}`, { _skipLoading: true })
      .then(({ data }) => { setEditing(data); setDrawerOpen(true); })
      .catch((err) => console.error(err));
  }, [location.state]);

  const fetchProducts = async () => {
    // Only the very first load shows the full-page loader; searches/refreshes
    // stay silent and use the inline search spinner + table indicator instead.
    const silent = !isFirstLoad.current;
    if (silent) setSearching(true); else setLoading(true);
    try {
      const { data } = await api.get(`/products?search=${search}`, { _skipLoading: silent });
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
      const { data } = await api.get('/categories');
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
            Manage your product inventory
          </p>
        </div>
        <div className="d-flex gap-2">
          <button className="btn-premium btn-premium-secondary" onClick={() => { setBulkImportOpen(true); }}>
            <BiUpload /> Bulk Import
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
            placeholder={`${t('common.search')} products...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {searching && <span className="search-box-spinner" aria-hidden="true" />}
        </div>
      </div>

      {/* Products Table */}
      <div className={`table-container ${searching ? 'is-refreshing' : ''}`}>
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
                    <div className="spinner-border spinner-border-sm me-2" /> Loading...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-5" style={{ color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem', opacity: 0.5 }}>📦</div>
                    No products found
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
                      <span className="badge badge-danger">{t('common.lowStock') || 'Low'}</span>
                    ) : (
                      <span className="badge badge-success">{t('common.active')}</span>
                    )}
                  </td>
                  <td>
                    <div className="d-flex gap-1">
                      <button className="btn-action btn-action-edit" data-tooltip="Edit" onClick={() => handleEdit(product)}>
                        <BiEdit />
                      </button>
                      <button className="btn-action btn-action-delete" data-tooltip="Delete" onClick={() => setDeleteConfirm(product._id)}>
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
              <h5>Delete Product</h5>
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
                Are you sure you want to delete this product? This action cannot be undone.
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

export default Products;