import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../../services/api';
import ProductDrawer from '../../../components/common/ProductDrawer';
import ProductSearchField from '../../../components/common/ProductSearchField';
import ExpandableCard from '../../../components/common/ExpandableCard';
import Pagination from '../../../components/common/Pagination';
import { showToast } from '../../../utils/toast';
import {
  BiSearch, BiPlus, BiTrash, BiX, BiCheck, BiShow, BiCalendar, BiNote,
  BiCreditCard, BiHash, BiUser, BiChevronDown,
  BiUpload, BiDownload, BiFile, BiPaste, BiTable, BiError, BiRefresh, BiInfoCircle,
} from 'react-icons/bi';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';

// ─── Constants ────────────────────────────────────────────────────────────
const getPaymentMethods = (t) => [
  { value: 'cash', label: t('sale.cash') },
  { value: 'card', label: t('sale.card') },
  { value: 'bank_transfer', label: t('purchasesPage.bankTransfer') },
  { value: 'mobile_banking', label: t('sale.mobileBanking') },
  { value: 'due', label: t('common.due') },
];

const paymentMethodLabel = (method, t) => {
  const map = {
    cash: t('sale.cash'),
    card: t('sale.card'),
    bank_transfer: t('purchasesPage.bankTransfer'),
    mobile_banking: t('sale.mobileBanking'),
    due: t('common.due'),
  };
  return map[method] || '-';
};

const ROW_FIELDS = ['batchNumber', 'expiryDate', 'quantity', 'purchasePrice', 'sellingPrice', 'discount', 'tax'];

let rowKeySeq = 0;
const makeRowKey = () => `row-${Date.now()}-${rowKeySeq++}`;

const emptyRow = () => ({
  key: makeRowKey(),
  product: null,
  batchNumber: '',
  expiryDate: '',
  quantity: '',
  purchasePrice: '',
  sellingPrice: '',
  discount: '',
  tax: '',
});

const emptyHeader = () => ({
  supplier: '',
  supplierInvoiceNo: '',
  purchaseDate: new Date().toISOString().slice(0, 10),
  paymentMethod: 'cash',
  notes: '',
});

const rowBase = (row) => Number(row.purchasePrice || 0) * Number(row.quantity || 0);
const rowDiscountAmt = (row) => rowBase(row) * (Number(row.discount || 0) / 100);
const rowTaxAmt = (row) => (rowBase(row) - rowDiscountAmt(row)) * (Number(row.tax || 0) / 100);
const rowTotal = (row) => rowBase(row) - rowDiscountAmt(row) + rowTaxAmt(row);

const money = (val) => `₹${Number(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// ─── Mobile Product Card for drawer ──────────────────────────────────────
const ProductCard = ({ row, index, isViewMode, isOpen, onToggle, setFieldRef, updateRow, removeRow, handleSelectProduct, handleCreateNewProduct, handleRowFieldEnter, rowTotal, money, rows, t }) => {
  return (
    <div className={`purchase-mobile-product-card ${isOpen ? 'purchase-mobile-product-card--open' : ''}`}>
      <div className="purchase-mobile-product-card__header" onClick={onToggle}>
        <div className="purchase-mobile-product-card__header-left">
          <span className="purchase-mobile-product-card__header-index">#{index + 1}</span>
          <span className="purchase-mobile-product-card__header-name">
            {row.product?.name || (isViewMode ? t('purchasesPage.unknownProduct') : t('purchasesPage.selectProduct'))}
          </span>
        </div>
        <div className="purchase-mobile-product-card__header-right">
          <span className="purchase-mobile-product-card__header-total">{money(rowTotal(row))}</span>
          <button className={`purchase-mobile-product-card__toggle ${isOpen ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); onToggle(); }}>
            <BiChevronDown />
          </button>
        </div>
      </div>

      <div
        className="purchase-mobile-product-card__body-wrapper"
        style={{ maxHeight: isOpen ? 800 : 0 }}
      >
        <div className="purchase-mobile-product-card__body">
          {!isViewMode && (
            <div className="purchase-mobile-product-card__field">
              <label className="purchase-mobile-product-card__label">{t('purchasesPage.product')}</label>
              <ProductSearchField
                ref={setFieldRef(row.key, 'product')}
                value={row.product}
                onSelect={(p) => handleSelectProduct(row.key, p)}
                onCreateNew={(q) => handleCreateNewProduct(row.key, q)}
                onEnter={() => handleRowFieldEnter(row.key, 'product')}
              />
              {row.product && (
                <div className="purchase-mobile-product-card__hint">
                  {t('purchasesPage.unitStockHint', { unit: row.product.unit, stock: row.product.stock ?? 0 })}
                </div>
              )}
            </div>
          )}
          {isViewMode && row.product && (
            <div className="purchase-mobile-product-card__field">
              <label className="purchase-mobile-product-card__label">{t('purchasesPage.product')}</label>
              <span className="purchase-mobile-product-card__value">{row.product?.name || t('purchasesPage.unknownProduct')}</span>
            </div>
          )}

          <div className="purchase-mobile-product-card__row-fields">
            <div className="purchase-mobile-product-card__field">
              <label className="purchase-mobile-product-card__label">{t('purchasesPage.batchNo')}</label>
              <input
                ref={setFieldRef(row.key, 'batchNumber')}
                className="purchase-mobile-product-card__input"
                value={row.batchNumber}
                onChange={(e) => updateRow(row.key, { batchNumber: e.target.value })}
                disabled={isViewMode}
                placeholder={t('purchasesPage.batchPlaceholder')}
              />
            </div>
            <div className="purchase-mobile-product-card__field">
              <label className="purchase-mobile-product-card__label">{t('product.expiryDate')}</label>
              <input
                ref={setFieldRef(row.key, 'expiryDate')}
                type="date"
                className="purchase-mobile-product-card__input"
                value={row.expiryDate}
                onChange={(e) => updateRow(row.key, { expiryDate: e.target.value })}
                disabled={isViewMode}
              />
            </div>
          </div>

          <div className="purchase-mobile-product-card__row-fields purchase-mobile-product-card__row-fields--3col">
            <div className="purchase-mobile-product-card__field">
              <label className="purchase-mobile-product-card__label">{t('purchasesPage.qty')}</label>
              <input
                ref={setFieldRef(row.key, 'quantity')}
                type="number"
                min="1"
                className="purchase-mobile-product-card__input"
                placeholder={t('purchasesPage.qty')}
                value={row.quantity}
                onChange={(e) => updateRow(row.key, { quantity: e.target.value })}
                disabled={isViewMode}
              />
            </div>
            <div className="purchase-mobile-product-card__field">
              <label className="purchase-mobile-product-card__label">{t('product.purchasePrice')}</label>
              <input
                ref={setFieldRef(row.key, 'purchasePrice')}
                type="number"
                min="0"
                className="purchase-mobile-product-card__input"
                placeholder={t('common.price')}
                value={row.purchasePrice}
                onChange={(e) => updateRow(row.key, { purchasePrice: e.target.value })}
                disabled={isViewMode}
              />
            </div>
            <div className="purchase-mobile-product-card__field">
              <label className="purchase-mobile-product-card__label">{t('product.sellingPrice')}</label>
              <input
                ref={setFieldRef(row.key, 'sellingPrice')}
                type="number"
                min="0"
                className="purchase-mobile-product-card__input"
                placeholder={t('product.sellingPrice')}
                value={row.sellingPrice}
                onChange={(e) => updateRow(row.key, { sellingPrice: e.target.value })}
                disabled={isViewMode}
              />
            </div>
          </div>

          <div className="purchase-mobile-product-card__row-fields">
            <div className="purchase-mobile-product-card__field">
              <label className="purchase-mobile-product-card__label">{t('purchasesPage.discountPercent')}</label>
              <input
                ref={setFieldRef(row.key, 'discount')}
                type="number"
                min="0"
                className="purchase-mobile-product-card__input"
                placeholder={t('purchasesPage.discountPercent')}
                value={row.discount}
                onChange={(e) => updateRow(row.key, { discount: e.target.value })}
                disabled={isViewMode}
              />
            </div>
            <div className="purchase-mobile-product-card__field">
              <label className="purchase-mobile-product-card__label">{t('purchasesPage.taxPercent')}</label>
              <input
                ref={setFieldRef(row.key, 'tax')}
                type="number"
                min="0"
                className="purchase-mobile-product-card__input"
                placeholder={t('purchasesPage.taxPercent')}
                value={row.tax}
                onChange={(e) => updateRow(row.key, { tax: e.target.value })}
                disabled={isViewMode}
              />
            </div>
          </div>

          <div className="purchase-mobile-product-card__total">
            <span>{t('purchasesPage.lineTotal')}</span>
            <strong>{money(rowTotal(row))}</strong>
          </div>

          {!isViewMode && (
            <button
              type="button"
              className="purchase-mobile-product-card__remove"
              onClick={() => removeRow(row.key)}
              disabled={rows.length <= 1}
            >
              <BiTrash /> {t('purchasesPage.removeItem')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Purchase Entry Drawer (create) / Detail Drawer (view) ────────────────
const PurchaseDrawer = ({ open, onClose, onSuccess, viewing, t }) => {
  const isViewMode = !!viewing;

  const [header, setHeader] = useState(emptyHeader);
  const [rows, setRows] = useState([emptyRow()]);
  const [paidAmount, setPaidAmount] = useState('');
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [suppliers, setSuppliers] = useState([]);
  const [categories, setCategories] = useState([]);

  const [productDrawer, setProductDrawer] = useState({ open: false, rowKey: null, initialName: '' });
  const [mobileOpenCards, setMobileOpenCards] = useState({});

  const fieldRefs = useRef({});
  const setFieldRef = (rowKey, field) => (el) => { fieldRefs.current[`${rowKey}::${field}`] = el; };
  const focusField = (rowKey, field) => { fieldRefs.current[`${rowKey}::${field}`]?.focus(); };

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

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setSubmitError(null);
    fetchSuppliers();
    fetchCategories();
    setMobileOpenCards({});

    if (viewing) {
      setHeader({
        supplier: viewing.supplier?._id || viewing.supplier || '',
        supplierInvoiceNo: viewing.supplierInvoiceNo || '',
        purchaseDate: viewing.purchaseDate ? viewing.purchaseDate.slice(0, 10) : '',
        paymentMethod: viewing.paymentMethod || 'cash',
        notes: viewing.notes || '',
      });
      setRows((viewing.items || []).map((i) => ({
        key: makeRowKey(),
        product: i.product && typeof i.product === 'object' ? i.product : { _id: i.product, name: t('purchasesPage.unknownProduct') },
        batchNumber: i.batchNumber || '',
        expiryDate: i.expiryDate ? String(i.expiryDate).slice(0, 10) : '',
        quantity: i.quantity,
        purchasePrice: i.purchasePrice,
        sellingPrice: i.sellingPrice,
        discount: i.discount || 0,
        tax: i.tax || 0,
      })));
      setPaidAmount(viewing.paidAmount || 0);
    } else {
      setHeader(emptyHeader());
      setRows([emptyRow()]);
      setPaidAmount('');
    }
  }, [open, viewing]);

  const toggleMobileCard = (key) => {
    setMobileOpenCards((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const fetchSuppliers = async () => {
    try {
      const { data } = await api.get('/suppliers?limit=10000');
      setSuppliers(Array.isArray(data) ? data : data.suppliers || []);
    } catch (err) { console.error(err); }
  };

  const fetchCategories = async () => {
    try {
      const { data } = await api.get('/categories');
      setCategories(Array.isArray(data) ? data : data.categories || []);
    } catch (err) { console.error(err); }
  };

  const selectedSupplierData = useMemo(
    () => suppliers.find((s) => s._id === header.supplier) || (viewing?.supplier && typeof viewing.supplier === 'object' ? viewing.supplier : null),
    [suppliers, header.supplier, viewing]
  );

  const handleHeaderChange = (name, value) => {
    setHeader((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => {
      if (!(name in prev)) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
    if (submitError) setSubmitError(null);
  };

  const updateRow = (key, patch) => {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  };

  const addRow = () => {
    const row = emptyRow();
    setRows((prev) => [...prev, row]);
    setMobileOpenCards((prev) => ({ ...prev, [row.key]: true }));
    setTimeout(() => focusField(row.key, 'product'), 0);
    return row.key;
  };

  const removeRow = (key) => {
    setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.key !== key) : prev));
  };

  const handleSelectProduct = (rowKey, product) => {
    updateRow(rowKey, {
      product,
      purchasePrice: product.purchasePrice || '',
      sellingPrice: product.sellingPrice || '',
    });
    setTimeout(() => focusField(rowKey, 'batchNumber'), 0);
  };

  const handleCreateNewProduct = (rowKey, query) => {
    setProductDrawer({ open: true, rowKey, initialName: query });
  };

  const handleProductCreated = (product) => {
    if (productDrawer.rowKey) {
      handleSelectProduct(productDrawer.rowKey, product);
    }
    setProductDrawer({ open: false, rowKey: null, initialName: '' });
  };

  const handleRowFieldEnter = (rowKey, field) => {
    const idx = ROW_FIELDS.indexOf(field);
    if (idx < ROW_FIELDS.length - 1) {
      focusField(rowKey, ROW_FIELDS[idx + 1]);
    } else {
      addRow();
    }
  };

  // ─── Totals ─────────────────────────────────────────────────────────
  const validRows = useMemo(() => rows.filter((r) => r.product), [rows]);
  const totalItems = useMemo(() => validRows.reduce((sum, r) => sum + Number(r.quantity || 0), 0), [validRows]);
  const subtotal = useMemo(() => validRows.reduce((sum, r) => sum + rowBase(r), 0), [validRows]);
  const discountTotal = useMemo(() => validRows.reduce((sum, r) => sum + rowDiscountAmt(r), 0), [validRows]);
  const taxTotal = useMemo(() => validRows.reduce((sum, r) => sum + rowTaxAmt(r), 0), [validRows]);
  const grandTotal = subtotal - discountTotal + taxTotal;
  const previousDue = selectedSupplierData?.dueAmount || 0;
  const currentDue = Math.max(0, grandTotal - Number(paidAmount || 0));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!header.supplier) newErrors.supplier = t('purchasesPage.supplierRequired');
    if (validRows.length === 0) newErrors.items = t('purchasesPage.itemsRequired');
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setSaving(true);
    setSubmitError(null);
    try {
      const payload = {
        supplier: header.supplier,
        supplierInvoiceNo: header.supplierInvoiceNo.trim(),
        purchaseDate: header.purchaseDate,
        paymentMethod: header.paymentMethod,
        notes: header.notes,
        items: validRows.map((r) => ({
          product: r.product._id,
          batchNumber: r.batchNumber || '',
          expiryDate: r.expiryDate || undefined,
          quantity: Number(r.quantity) || 1,
          unit: r.product.unit,
          purchasePrice: Number(r.purchasePrice) || 0,
          sellingPrice: Number(r.sellingPrice) || 0,
          discount: Number(r.discount) || 0,
          tax: Number(r.tax) || 0,
          total: rowTotal(r),
        })),
        subtotal,
        discount: discountTotal,
        tax: taxTotal,
        totalAmount: grandTotal,
        paidAmount: Number(paidAmount) || 0,
      };
      const { data } = await api.post('/purchases', payload);
      showToast.success(t('purchasesPage.purchaseCreated', { no: data.purchaseNo }));
      onSuccess();
      onClose();
    } catch (err) {
      setSubmitError(err.response?.data?.message || t('purchasesPage.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className={`drawer-overlay ${open ? 'open' : ''}`} onClick={onClose} />
      <div className={`drawer purchase-drawer ${open ? 'open' : ''}`}>
        <div className="drawer-header">
          <h5>{isViewMode ? t('purchasesPage.purchaseTitle', { no: viewing?.purchaseNo || '' }) : t('purchase.newPurchase')}</h5>
          <button className="btn-close-premium" onClick={onClose}><BiX /></button>
        </div>

        <div className="drawer-body purchase-drawer-body">
          {submitError && (
            <div className="purchase-alert-error">{submitError}</div>
          )}

          {/* ─── Header Fields ─────────────────────────────────────── */}
          <div className="purchase-header-grid">
            <div className="form-group mb-0">
              <label className="form-label"><BiUser style={{ marginRight: 4 }} />{t('purchase.supplier')} <span style={{ color: 'var(--danger)' }}>*</span></label>
              <select
                className={`form-select ${errors.supplier ? 'is-invalid' : ''}`}
                value={header.supplier}
                onChange={(e) => handleHeaderChange('supplier', e.target.value)}
                disabled={isViewMode}
              >
                <option value="">{t('purchasesPage.selectSupplier')}</option>
                {suppliers.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
              </select>
              {errors.supplier && <div className="invalid-feedback-premium">{errors.supplier}</div>}
            </div>

            <div className="form-group mb-0">
              <label className="form-label"><BiHash style={{ marginRight: 4 }} />{t('purchasesPage.purchaseNo')}</label>
              <input
                className="form-control"
                value={isViewMode ? viewing?.purchaseNo || '' : t('purchasesPage.autoGenerated')}
                readOnly
                disabled
                style={{ color: 'var(--text-muted)', background: 'var(--bg-primary)' }}
              />
            </div>

            <div className="form-group mb-0">
              <label className="form-label">{t('purchasesPage.supplierInvoiceNo')}</label>
              <input
                className="form-control"
                placeholder={t('common.optional')}
                value={header.supplierInvoiceNo}
                onChange={(e) => handleHeaderChange('supplierInvoiceNo', e.target.value)}
                disabled={isViewMode}
              />
            </div>

            <div className="form-group mb-0">
              <label className="form-label"><BiCalendar style={{ marginRight: 4 }} />{t('purchasesPage.purchaseDate')}</label>
              <input
                type="date"
                className="form-control"
                value={header.purchaseDate}
                onChange={(e) => handleHeaderChange('purchaseDate', e.target.value)}
                disabled={isViewMode}
              />
            </div>

            <div className="form-group mb-0">
              <label className="form-label"><BiCreditCard style={{ marginRight: 4 }} />{t('sale.paymentMethod')}</label>
              <select
                className="form-select"
                value={header.paymentMethod}
                onChange={(e) => handleHeaderChange('paymentMethod', e.target.value)}
                disabled={isViewMode}
              >
                {getPaymentMethods(t).map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>

            <div className="form-group mb-0 purchase-header-notes">
              <label className="form-label"><BiNote style={{ marginRight: 4 }} />{t('common.notes')}</label>
              <input
                className="form-control"
                placeholder={t('purchasesPage.optionalNotes')}
                value={header.notes}
                onChange={(e) => handleHeaderChange('notes', e.target.value)}
                disabled={isViewMode}
              />
            </div>
          </div>

          {/* ─── Desktop Product Table ─────────────────────────────── */}
          <div className="purchase-desktop-section">
            <div className="purchase-items-header">
              <label className="form-label mb-0" style={{ fontWeight: 600 }}>{t('purchasesPage.products')}</label>
              {!isViewMode && (
                <button type="button" className="purchase-add-row-btn" onClick={addRow}>
                  <BiPlus /> {t('purchasesPage.addRow')}
                </button>
              )}
            </div>
            {errors.items && <div className="invalid-feedback-premium mb-2">{errors.items}</div>}

            <div className="purchase-items-scroll">
              <table className="purchase-items-table">
                <thead>
                  <tr>
                    <th style={{ minWidth: 180, width: '22%' }}>{t('purchasesPage.product')}</th>
                    <th style={{ width: 85 }}>{t('purchasesPage.batchNo')}</th>
                    <th style={{ width: 105 }}>{t('product.expiryDate')}</th>
                    <th style={{ width: 55 }}>{t('purchasesPage.qty')}</th>
                    <th style={{ width: 80 }}>{t('product.purchasePrice')}</th>
                    <th style={{ width: 80 }}>{t('product.sellingPrice')}</th>
                    <th style={{ width: 65 }}>{t('purchasesPage.discountPercent')}</th>
                    <th style={{ width: 55 }}>{t('purchasesPage.taxPercent')}</th>
                    <th style={{ width: 75 }}>{t('common.total')}</th>
                    {!isViewMode && <th style={{ width: 32 }} />}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.key}>
                      <td>
                        {isViewMode ? (
                          <span style={{ fontWeight: 600 }}>{row.product?.name || t('purchasesPage.unknownProduct')}</span>
                        ) : (
                          <>
                            <ProductSearchField
                              ref={setFieldRef(row.key, 'product')}
                              value={row.product}
                              onSelect={(p) => handleSelectProduct(row.key, p)}
                              onCreateNew={(q) => handleCreateNewProduct(row.key, q)}
                              onEnter={() => handleRowFieldEnter(row.key, 'product')}
                            />
                            {row.product && (
                              <div className="purchase-row-hint">
                                {t('purchasesPage.unitStockHint', { unit: row.product.unit, stock: row.product.stock ?? 0 })}
                              </div>
                            )}
                          </>
                        )}
                      </td>
                      <td>
                        <input
                          ref={setFieldRef(row.key, 'batchNumber')}
                          className="form-control form-control-sm"
                          value={row.batchNumber}
                          onChange={(e) => updateRow(row.key, { batchNumber: e.target.value })}
                          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleRowFieldEnter(row.key, 'batchNumber'))}
                          disabled={isViewMode}
                        />
                      </td>
                      <td>
                        <input
                          ref={setFieldRef(row.key, 'expiryDate')}
                          type="date"
                          className="form-control form-control-sm"
                          value={row.expiryDate}
                          onChange={(e) => updateRow(row.key, { expiryDate: e.target.value })}
                          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleRowFieldEnter(row.key, 'expiryDate'))}
                          disabled={isViewMode}
                        />
                      </td>
                      <td>
                        <input
                          ref={setFieldRef(row.key, 'quantity')}
                          type="number"
                          min="1"
                          className="form-control form-control-sm"
                          value={row.quantity}
                          onChange={(e) => updateRow(row.key, { quantity: e.target.value })}
                          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleRowFieldEnter(row.key, 'quantity'))}
                          disabled={isViewMode}
                        />
                      </td>
                      <td>
                        <input
                          ref={setFieldRef(row.key, 'purchasePrice')}
                          type="number"
                          min="0"
                          className="form-control form-control-sm"
                          value={row.purchasePrice}
                          onChange={(e) => updateRow(row.key, { purchasePrice: e.target.value })}
                          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleRowFieldEnter(row.key, 'purchasePrice'))}
                          disabled={isViewMode}
                        />
                      </td>
                      <td>
                        <input
                          ref={setFieldRef(row.key, 'sellingPrice')}
                          type="number"
                          min="0"
                          className="form-control form-control-sm"
                          value={row.sellingPrice}
                          onChange={(e) => updateRow(row.key, { sellingPrice: e.target.value })}
                          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleRowFieldEnter(row.key, 'sellingPrice'))}
                          disabled={isViewMode}
                        />
                      </td>
                      <td>
                        <input
                          ref={setFieldRef(row.key, 'discount')}
                          type="number"
                          min="0"
                          className="form-control form-control-sm"
                          value={row.discount}
                          onChange={(e) => updateRow(row.key, { discount: e.target.value })}
                          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleRowFieldEnter(row.key, 'discount'))}
                          disabled={isViewMode}
                        />
                      </td>
                      <td>
                        <input
                          ref={setFieldRef(row.key, 'tax')}
                          type="number"
                          min="0"
                          className="form-control form-control-sm"
                          value={row.tax}
                          onChange={(e) => updateRow(row.key, { tax: e.target.value })}
                          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleRowFieldEnter(row.key, 'tax'))}
                          disabled={isViewMode}
                        />
                      </td>
                      <td className="purchase-row-total">{money(rowTotal(row))}</td>
                      {!isViewMode && (
                        <td>
                          <button
                            type="button"
                            className="purchase-remove-row-btn"
                            onClick={() => removeRow(row.key)}
                            disabled={rows.length <= 1}
                            title={t('purchasesPage.removeRow')}
                          >
                            <BiTrash size={14} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ─── Mobile Product Cards ──────────────────────────────── */}
          <div className="purchase-mobile-section">
            <div className="purchase-items-header">
              <label className="form-label mb-0" style={{ fontWeight: 600 }}>{t('purchasesPage.productsCount', { count: rows.length })}</label>
              {!isViewMode && (
                <button type="button" className="purchase-add-row-btn" onClick={addRow}>
                  <BiPlus /> {t('purchasesPage.addItem')}
                </button>
              )}
            </div>
            {errors.items && <div className="invalid-feedback-premium mb-2">{errors.items}</div>}

            <div className="purchase-mobile-product-cards">
              {rows.map((row, idx) => (
                <ProductCard
                  key={row.key}
                  row={row}
                  index={idx}
                  isViewMode={isViewMode}
                  isOpen={!!mobileOpenCards[row.key]}
                  onToggle={() => toggleMobileCard(row.key)}
                  setFieldRef={setFieldRef}
                  updateRow={updateRow}
                  removeRow={removeRow}
                  handleSelectProduct={handleSelectProduct}
                  handleCreateNewProduct={handleCreateNewProduct}
                  handleRowFieldEnter={handleRowFieldEnter}
                  rowTotal={rowTotal}
                  money={money}
                  rows={rows}
                  t={t}
                />
              ))}
            </div>
          </div>
        </div>

        {/* ─── Summary ───────────────────────────────────────────────── */}
        <div className="purchase-summary-card">
          <div className="purchase-summary-card__body">
            <div className="purchase-summary-row">
              <span className="purchase-summary-row__label">{t('purchasesPage.totalItems')}</span>
              <span className="purchase-summary-row__value">{totalItems}</span>
            </div>
            <div className="purchase-summary-row">
              <span className="purchase-summary-row__label">{t('sale.discount')}</span>
              <span className="purchase-summary-row__value purchase-summary-row__value--danger">-{money(discountTotal)}</span>
            </div>
            <div className="purchase-summary-row">
              <span className="purchase-summary-row__label">{t('sale.tax')}</span>
              <span className="purchase-summary-row__value purchase-summary-row__value--success">+{money(taxTotal)}</span>
            </div>
            <div className="purchase-summary-divider" />
            <div className="purchase-summary-row purchase-summary-row--grand">
              <span className="purchase-summary-row__label purchase-summary-row__label--grand">{t('purchasesPage.grandTotal')}</span>
              <span className="purchase-summary-row__value purchase-summary-row__value--grand">{money(grandTotal)}</span>
            </div>
            <div className="purchase-summary-divider" />
            <div className="purchase-summary-row">
              <span className="purchase-summary-row__label">{t('purchasesPage.previousDue')}</span>
              <span className="purchase-summary-row__value">{money(previousDue)}</span>
            </div>
            <div className="purchase-summary-row purchase-summary-row--paid">
              <span className="purchase-summary-row__label">{t('sale.paidAmount')}</span>
              {isViewMode ? (
                <span className="purchase-summary-row__value purchase-summary-row__value--success">{money(paidAmount)}</span>
              ) : (
                <input
                  type="number"
                  className="purchase-summary-paid-input"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                />
              )}
            </div>
            <div className="purchase-summary-divider" />
            <div className={`purchase-summary-row purchase-summary-row--due ${currentDue > 0 ? 'purchase-summary-row--due-warning' : ''}`}>
              <span className="purchase-summary-row__label purchase-summary-row__label--due">{t('purchasesPage.currentDue')}</span>
              <span className={`purchase-summary-row__value purchase-summary-row__value--due ${currentDue > 0 ? 'purchase-summary-row__value--danger' : 'purchase-summary-row__value--success'}`}>
                {money(currentDue)}
              </span>
            </div>
          </div>
        </div>

        {/* ─── Footer with buttons ──────────────────────────────────── */}
        <div className="drawer-footer purchase-drawer-footer">
          {!isViewMode && (
            <>
              <button type="button" className="btn-premium btn-premium-secondary" onClick={onClose}>
                {t('common.cancel')}
              </button>
              <button type="button" className="btn-premium btn-premium-primary" onClick={handleSubmit} disabled={saving}>
                {saving ? <><span className="spinner-border spinner-border-sm" /> {t('common.saving')}</> : <><BiCheck /> {t('purchasesPage.savePurchase')}</>}
              </button>
            </>
          )}
          {isViewMode && (
            <button type="button" className="btn-premium btn-premium-secondary" onClick={onClose}>
              {t('common.close')}
            </button>
          )}
        </div>
      </div>

      {/* Nested Add Product drawer, for "+ Create New Product" from the search field */}
      <ProductDrawer
        open={productDrawer.open}
        onClose={() => setProductDrawer({ open: false, rowKey: null, initialName: '' })}
        onSuccess={handleProductCreated}
        editing={null}
        categories={categories}
        units={units}
        t={t}
        initialName={productDrawer.initialName}
      />
    </>
  );
};

const PAYMENT_METHOD_VALUES = ['cash', 'card', 'bank_transfer', 'mobile_banking', 'due'];

// ─── Bulk Import Drawer ─────────────────────────────────────────────────────
// Each imported row creates one purchase with a single line item — the same
// shape PurchaseDrawer's handleSubmit posts to /purchases, just one row at a
// time instead of built up interactively. Supplier and product are matched
// by exact (case-insensitive) name against the shop's existing records;
// unmatched names are a row error, not an auto-create, since suppliers and
// products are managed on their own pages.
const BulkImportDrawer = ({ open, onClose, onSuccess, t }) => {
  const [activeTab, setActiveTab] = useState('excel');
  const [pasteData, setPasteData] = useState('');
  const [parsedRows, setParsedRows] = useState([]);
  const [errors, setErrors] = useState({});
  const [existingSuppliers, setExistingSuppliers] = useState([]);
  const [existingProducts, setExistingProducts] = useState([]);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const [showPreview, setShowPreview] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    resetState();
    loadReferenceData();
  }, [open]);

  const resetState = () => {
    setPasteData('');
    setParsedRows([]);
    setErrors({});
    setShowPreview(false);
    setImportResult(null);
    setImportProgress({ current: 0, total: 0 });
    setActiveTab('excel');
  };

  const loadReferenceData = async () => {
    try {
      const [supRes, prodRes] = await Promise.all([
        api.get('/suppliers?limit=10000', { _skipLoading: true }),
        api.get('/products?limit=10000', { _skipLoading: true }),
      ]);
      setExistingSuppliers(Array.isArray(supRes.data) ? supRes.data : supRes.data.suppliers || []);
      setExistingProducts(Array.isArray(prodRes.data) ? prodRes.data : prodRes.data.products || []);
    } catch (err) {
      console.error(err);
    }
  };

  const findSupplier = useCallback((name) => {
    const q = name?.trim().toLowerCase();
    if (!q) return null;
    return existingSuppliers.find((s) => s.name?.trim().toLowerCase() === q) || null;
  }, [existingSuppliers]);

  const findProduct = useCallback((name) => {
    const q = name?.trim().toLowerCase();
    if (!q) return null;
    return existingProducts.find((p) => p.name?.trim().toLowerCase() === q) || null;
  }, [existingProducts]);

  // ─── Validate ───────────────────────────────────────────────────────────
  const validateRows = useCallback((rows) => {
    const errorMap = {};
    rows.forEach((row, idx) => {
      const rowErrors = [];

      if (!row.supplier?.trim()) rowErrors.push(t('purchasesPage.bulkImport.supplierRequired'));
      else if (!findSupplier(row.supplier)) rowErrors.push(t('purchasesPage.bulkImport.supplierNotFound', { name: row.supplier }));

      if (!row.product?.trim()) rowErrors.push(t('purchasesPage.bulkImport.productRequired'));
      else if (!findProduct(row.product)) rowErrors.push(t('purchasesPage.bulkImport.productNotFound', { name: row.product }));

      if (row.quantity === '' || row.quantity === null || isNaN(Number(row.quantity)) || Number(row.quantity) <= 0)
        rowErrors.push(t('purchasesPage.bulkImport.invalidQuantity'));
      if (row.purchasePrice === '' || row.purchasePrice === null || isNaN(Number(row.purchasePrice)) || Number(row.purchasePrice) < 0)
        rowErrors.push(t('validation.invalidPurchasePrice'));
      if (row.sellingPrice === '' || row.sellingPrice === null || isNaN(Number(row.sellingPrice)) || Number(row.sellingPrice) < 0)
        rowErrors.push(t('validation.invalidSellingPrice'));

      if (row.paymentMethod && !PAYMENT_METHOD_VALUES.includes(row.paymentMethod)) {
        rowErrors.push(t('purchasesPage.bulkImport.invalidPaymentMethod', { method: row.paymentMethod, valid: PAYMENT_METHOD_VALUES.join(', ') }));
      }

      if (row.expiryDate && isNaN(new Date(row.expiryDate).getTime())) rowErrors.push(t('purchasesPage.bulkImport.invalidExpiryDate'));
      if (row.purchaseDate && isNaN(new Date(row.purchaseDate).getTime())) rowErrors.push(t('purchasesPage.bulkImport.invalidPurchaseDate'));

      if (rowErrors.length > 0) errorMap[idx] = rowErrors;
    });
    setErrors(errorMap);
    return errorMap;
  }, [t, findSupplier, findProduct]);

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
          Swal.fire({ icon: 'warning', title: t('purchasesPage.bulkImport.emptyFileTitle'), text: t('purchasesPage.bulkImport.emptyFileText'), confirmButtonColor: '#6C63FF' });
          return;
        }

        const mapped = jsonData.map((row) => {
          const keys = Object.keys(row).reduce((acc, key) => {
            acc[key.toLowerCase().trim()] = row[key];
            return acc;
          }, {});
          return {
            supplier: keys.supplier || keys['supplier name'] || keys['supplier_name'] || '',
            product: keys.product || keys['product name'] || keys['product_name'] || '',
            quantity: keys.quantity || keys.qty || '',
            purchasePrice: keys.purchaseprice || keys['purchase price'] || keys['purchase_price'] || '',
            sellingPrice: keys.sellingprice || keys['selling price'] || keys['selling_price'] || '',
            batchNumber: keys.batchnumber || keys['batch number'] || keys['batch no'] || keys['batch_no'] || '',
            expiryDate: keys.expirydate || keys['expiry date'] || keys['expiry_date'] || '',
            discount: keys.discount || 0,
            tax: keys.tax || 0,
            supplierInvoiceNo: keys.supplierinvoiceno || keys['supplier invoice no'] || keys['supplier invoice'] || keys['invoice no'] || '',
            purchaseDate: keys.purchasedate || keys['purchase date'] || keys['purchase_date'] || '',
            paymentMethod: (keys.paymentmethod || keys['payment method'] || keys['payment_method'] || '').toLowerCase(),
            paidAmount: keys.paidamount || keys['paid amount'] || keys['paid_amount'] || 0,
            notes: keys.notes || '',
          };
        });

        setParsedRows(mapped);
        setShowPreview(true);
        validateRows(mapped);
      } catch (err) {
        Swal.fire({ icon: 'error', title: t('purchasesPage.bulkImport.parseErrorTitle'), text: t('purchasesPage.bulkImport.parseErrorText'), confirmButtonColor: '#6C63FF' });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // ─── Download Sample Template ───────────────────────────────────────────
  const handleDownloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([
      {
        supplier: 'ABC Traders', product: 'Rice 25kg', quantity: 10,
        purchasePrice: 1200, sellingPrice: 1400, batchNumber: 'B-001',
        expiryDate: '2027-12-31', discount: 0, tax: 0,
        supplierInvoiceNo: 'INV-1001', purchaseDate: '2026-07-21',
        paymentMethod: 'cash', paidAmount: 12000, notes: '',
      },
      {
        supplier: 'XYZ Foods', product: 'Coca Cola 500ml', quantity: 50,
        purchasePrice: 25, sellingPrice: 35, batchNumber: '',
        expiryDate: '2027-06-30', discount: 5, tax: 0,
        supplierInvoiceNo: 'INV-2002', purchaseDate: '2026-07-21',
        paymentMethod: 'due', paidAmount: 0, notes: 'Partial delivery',
      },
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Purchases');
    XLSX.writeFile(wb, 'purchase_import_template.xlsx');
  };

  // ─── Paste Import ───────────────────────────────────────────────────────
  const handleParsePaste = () => {
    if (!pasteData.trim()) {
      Swal.fire({ icon: 'warning', title: t('purchasesPage.bulkImport.emptyDataTitle'), text: t('purchasesPage.bulkImport.emptyDataText'), confirmButtonColor: '#6C63FF' });
      return;
    }

    const lines = pasteData.split('\n').filter((line) => line.trim());
    const parsed = lines.map((line) => {
      const parts = line.includes('\t') ? line.split('\t') :
                    line.includes('|') ? line.split('|') :
                    line.split(',');
      const c = parts.map((p) => p.trim());
      return {
        supplier: c[0] || '',
        product: c[1] || '',
        quantity: c[2] || '',
        purchasePrice: c[3] || '',
        sellingPrice: c[4] || '',
        batchNumber: c[5] || '',
        expiryDate: c[6] || '',
        discount: c[7] || 0,
        tax: c[8] || 0,
        supplierInvoiceNo: c[9] || '',
        purchaseDate: c[10] || '',
        paymentMethod: (c[11] || '').toLowerCase(),
        paidAmount: c[12] || 0,
        notes: c[13] || '',
      };
    });

    if (parsed.length === 0) {
      Swal.fire({ icon: 'warning', title: t('purchasesPage.bulkImport.noDataTitle'), text: t('purchasesPage.bulkImport.noDataText'), confirmButtonColor: '#6C63FF' });
      return;
    }

    setParsedRows(parsed);
    setShowPreview(true);
    validateRows(parsed);
  };

  // ─── Remove Row ─────────────────────────────────────────────────────────
  const removeRow = (idx) => {
    const updated = parsedRows.filter((_, i) => i !== idx);
    setParsedRows(updated);
    validateRows(updated);
  };

  // ─── Import All ─────────────────────────────────────────────────────────
  const handleImport = async () => {
    const validRows = parsedRows.filter((_, idx) => !(errors[idx] && errors[idx].length > 0));

    if (validRows.length === 0) {
      Swal.fire({ icon: 'warning', title: t('purchasesPage.bulkImport.noValidRowsTitle'), text: t('purchasesPage.bulkImport.noValidRowsText'), confirmButtonColor: '#6C63FF' });
      return;
    }

    setImporting(true);
    setImportProgress({ current: 0, total: validRows.length });
    let imported = 0;
    let failed = 0;
    const failedDetails = [];

    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];
      setImportProgress({ current: i + 1, total: validRows.length });

      try {
        const supplier = findSupplier(row.supplier);
        const product = findProduct(row.product);

        const item = {
          product: product._id,
          batchNumber: row.batchNumber || '',
          expiryDate: row.expiryDate || undefined,
          quantity: Number(row.quantity) || 1,
          unit: product.unit,
          purchasePrice: Number(row.purchasePrice) || 0,
          sellingPrice: Number(row.sellingPrice) || 0,
          discount: Number(row.discount) || 0,
          tax: Number(row.tax) || 0,
          total: rowTotal(row),
        };

        const payload = {
          supplier: supplier._id,
          supplierInvoiceNo: (row.supplierInvoiceNo || '').trim(),
          purchaseDate: row.purchaseDate || new Date().toISOString().slice(0, 10),
          paymentMethod: row.paymentMethod || 'cash',
          notes: row.notes || '',
          items: [item],
          subtotal: rowBase(row),
          discount: rowDiscountAmt(row),
          tax: rowTaxAmt(row),
          totalAmount: rowTotal(row),
          paidAmount: Number(row.paidAmount) || 0,
        };

        await api.post('/purchases', payload, { _skipLoading: true });
        imported++;
      } catch (err) {
        failed++;
        failedDetails.push(`${row.supplier} / ${row.product}: ${err.response?.data?.message || err.message}`);
      }
    }

    setImportResult({ total: validRows.length, imported, failed, failedDetails });
    setImporting(false);
    onSuccess();
  };

  const errorCount = Object.keys(errors).length;
  const validRowsList = useMemo(
    () => parsedRows.filter((_, idx) => !(errors[idx] && errors[idx].length > 0)),
    [parsedRows, errors]
  );
  const validCount = validRowsList.length;
  const validTotalAmount = useMemo(
    () => validRowsList.reduce((sum, row) => sum + rowTotal(row), 0),
    [validRowsList]
  );

  const getRowStatus = (idx) => (errors[idx] && errors[idx].length > 0 ? 'error' : 'valid');

  return (
    <>
      <div className={`drawer-overlay ${open ? 'open' : ''}`} onClick={onClose} />
      <div className={`drawer ${open ? 'open' : ''}`} style={{ width: '760px', maxWidth: '100vw' }}>
        <div className="drawer-header">
          <h5><BiUpload className="me-2" />{t('purchasesPage.bulkImport.title')}</h5>
          <button className="btn-close-premium" onClick={onClose}><BiX /></button>
        </div>
        <div className="drawer-body" style={{ padding: 0, display: 'flex', flexDirection: 'column' }}>
          {/* Tabs */}
          <div className="bulk-import-tabs">
            <button
              className={`bulk-import-tab ${activeTab === 'excel' ? 'active' : ''}`}
              onClick={() => { setActiveTab('excel'); setShowPreview(false); setParsedRows([]); }}
            >
              <BiFile /> {t('purchasesPage.bulkImport.tabExcel')}
            </button>
            <button
              className={`bulk-import-tab ${activeTab === 'paste' ? 'active' : ''}`}
              onClick={() => { setActiveTab('paste'); setShowPreview(false); setParsedRows([]); }}
            >
              <BiPaste /> {t('purchasesPage.bulkImport.tabPaste')}
            </button>
          </div>

          <div style={{ padding: '1.25rem', flex: 1, overflowY: 'auto' }}>
            {/* ─── Tab 1: Excel/CSV ────────────────────────────────────────── */}
            {activeTab === 'excel' && !showPreview && (
              <div className="bulk-import-upload-area">
                <div className="bulk-import-upload-box">
                  <BiUpload size={48} />
                  <h6>{t('purchasesPage.bulkImport.uploadTitle')}</h6>
                  <p>{t('purchasesPage.bulkImport.uploadSubtitle')}</p>
                  <div className="d-flex gap-2 justify-content-center flex-wrap">
                    <button className="btn-premium btn-premium-primary" onClick={() => fileInputRef.current?.click()}>
                      <BiUpload /> {t('purchasesPage.bulkImport.selectFile')}
                    </button>
                    <button className="btn-premium btn-premium-secondary" onClick={handleDownloadTemplate}>
                      <BiDownload /> {t('purchasesPage.bulkImport.downloadTemplate')}
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
                    <small>{t('purchasesPage.bulkImport.expectedFormat')}</small>
                  </div>
                </div>
              </div>
            )}

            {/* ─── Tab 2: Paste ────────────────────────────────────────────── */}
            {activeTab === 'paste' && !showPreview && (
              <div className="bulk-import-paste-area">
                <div className="bulk-import-paste-header">
                  <BiPaste size={28} />
                  <h6>{t('purchasesPage.bulkImport.pasteTitle')}</h6>
                </div>
                <p className="bulk-import-paste-desc">{t('purchasesPage.bulkImport.pasteDesc')}</p>
                <div className="bulk-import-format-example">
                  <strong>{t('purchasesPage.bulkImport.formatLabel')}</strong> {t('purchasesPage.bulkImport.formatExample')}
                </div>
                <textarea
                  className="bulk-import-textarea"
                  rows={8}
                  value={pasteData}
                  onChange={(e) => setPasteData(e.target.value)}
                  placeholder={t('purchasesPage.bulkImport.pastePlaceholder')}
                />
                <button className="btn-premium btn-premium-primary w-100 mt-2" onClick={handleParsePaste}>
                  <BiTable /> {t('purchasesPage.bulkImport.parsePreview')}
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
                    <span className="bulk-import-stat-label">{t('purchasesPage.bulkImport.totalRows')}</span>
                  </div>
                  <div className="bulk-import-stat bulk-import-stat-valid">
                    <span className="bulk-import-stat-value">{validCount}</span>
                    <span className="bulk-import-stat-label">{t('purchasesPage.bulkImport.valid')}</span>
                  </div>
                  <div className="bulk-import-stat bulk-import-stat-error">
                    <span className="bulk-import-stat-value">{errorCount}</span>
                    <span className="bulk-import-stat-label">{t('purchasesPage.bulkImport.errors')}</span>
                  </div>
                  <div className="bulk-import-stat">
                    <span className="bulk-import-stat-value">{money(validTotalAmount)}</span>
                    <span className="bulk-import-stat-label">{t('purchasesPage.bulkImport.totalValue')}</span>
                  </div>
                </div>

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
                      {t('purchasesPage.bulkImport.importingProgress', { current: importProgress.current, total: importProgress.total })}
                    </span>
                  </div>
                )}

                {/* Import Result */}
                {importResult && (
                  <div className="bulk-import-result">
                    <div className="bulk-import-result-icon">
                      <BiCheck size={32} />
                    </div>
                    <h6>{t('purchasesPage.bulkImport.importComplete')}</h6>
                    <div className="bulk-import-result-stats">
                      <span>{t('purchasesPage.bulkImport.imported')} <strong>{importResult.imported}</strong></span>
                      <span>{t('purchasesPage.bulkImport.failed')} <strong style={{ color: importResult.failed > 0 ? 'var(--danger)' : undefined }}>{importResult.failed}</strong></span>
                    </div>
                    {importResult.failedDetails.length > 0 && (
                      <div className="bulk-import-result-failures">
                        <small>{t('purchasesPage.bulkImport.details')}</small>
                        {importResult.failedDetails.map((detail, i) => (
                          <div key={i} className="bulk-import-failure-item">{detail}</div>
                        ))}
                      </div>
                    )}
                    <button
                      className="btn-premium btn-premium-primary mt-3"
                      onClick={() => { setShowPreview(false); setImportResult(null); setParsedRows([]); }}
                    >
                      <BiRefresh /> {t('purchasesPage.bulkImport.importMore')}
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
                            <th>{t('purchase.supplier')}</th>
                            <th>{t('purchasesPage.product')}</th>
                            <th>{t('purchasesPage.qty')}</th>
                            <th>{t('product.purchasePrice')}</th>
                            <th>{t('product.sellingPrice')}</th>
                            <th>{t('purchasesPage.lineTotal')}</th>
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
                                <td style={{ fontSize: '0.8rem' }}>{row.supplier || '-'}</td>
                                <td>
                                  <div style={{ fontWeight: 600, fontSize: '0.8rem' }}>{row.product || '-'}</div>
                                </td>
                                <td style={{ fontSize: '0.78rem' }}>{row.quantity || '-'}</td>
                                <td style={{ fontSize: '0.78rem' }}>₹{Number(row.purchasePrice || 0).toFixed(2)}</td>
                                <td style={{ fontSize: '0.78rem' }}>₹{Number(row.sellingPrice || 0).toFixed(2)}</td>
                                <td style={{ fontSize: '0.78rem', fontWeight: 600 }}>{money(rowTotal(row))}</td>
                                <td>
                                  {status === 'error' ? (
                                    <span className="bulk-import-status-badge status-error" title={errors[idx]?.join(', ')}>
                                      <BiError /> {t('common.error')}
                                    </span>
                                  ) : (
                                    <span className="bulk-import-status-badge status-valid">
                                      <BiCheck /> {t('purchasesPage.bulkImport.valid')}
                                    </span>
                                  )}
                                </td>
                                <td>
                                  <button
                                    className="bulk-import-remove-row"
                                    onClick={() => removeRow(idx)}
                                    title={t('purchasesPage.bulkImport.removeRow')}
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
                        <h6><BiError /> {t('purchasesPage.bulkImport.rowErrorsHeading')}</h6>
                        {Object.entries(errors).map(([idx, errs]) => (
                          <div key={idx} className="bulk-import-error-item">
                            <strong>{t('purchasesPage.bulkImport.rowLabel', { number: parseInt(idx) + 1 })}</strong> {parsedRows[parseInt(idx)]?.supplier} / {parsedRows[parseInt(idx)]?.product} — {errs.join(', ')}
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
                          <><span className="spinner-border spinner-border-sm" /> {t('purchasesPage.bulkImport.importingButton')}</>
                        ) : (
                          <><BiUpload /> {t('purchasesPage.bulkImport.importPurchases', { count: validCount })}</>
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

// ─── Main Purchases Page ───────────────────────────────────────────────────
// Fixed page size for the Purchases list — server-side pagination via ?page=&limit=.
const PURCHASES_PER_PAGE = 10;

const Purchases = () => {
  const { t } = useTranslation();
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [bulkImportOpen, setBulkImportOpen] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const isFirstLoad = useRef(true);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // A new search term invalidates the current page — always land back on page 1.
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const fetchPurchases = useCallback(async () => {
    const silent = !isFirstLoad.current;
    // Always skip global loading overlay — this page uses its own table loader
    if (silent) setSearching(true); else setLoading(true);
    try {
      const { data } = await api.get(
        `/purchases?search=${encodeURIComponent(debouncedSearch)}&page=${page}&limit=${PURCHASES_PER_PAGE}`,
        { _skipLoading: true }
      );
      setPurchases(data.purchases || []);
      setTotalCount(data.total || 0);
      const pages = Math.max(1, data.pages || 1);
      setTotalPages(pages);
      // Self-correct if the current page no longer exists — e.g. the last
      // purchase on the last page was just deleted.
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
    fetchPurchases();
  }, [fetchPurchases]);

  const handleView = async (purchase) => {
    try {
      const { data } = await api.get(`/purchases/${purchase._id}`);
      setViewing(data);
      setDrawerOpen(true);
    } catch (err) {
      showToast.error(t('purchasesPage.loadDetailFailed'));
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/purchases/${id}`);
      setDeleteConfirm(null);
      // Deleting the only purchase on a page beyond the first would otherwise
      // fetch that now-empty page first — step back a page up front instead.
      if (purchases.length === 1 && page > 1) {
        setPage(page - 1);
      } else {
        fetchPurchases();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const confirmDelete = (purchase) => {
    Swal.fire({
      title: t('purchasesPage.deletePurchaseTitle'),
      text: t('purchasesPage.deletePurchaseConfirm', { no: purchase.purchaseNo }),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#FF6B6B',
      cancelButtonColor: '#6c757d',
      confirmButtonText: t('purchasesPage.yesDeleteIt'),
      cancelButtonText: t('common.cancel'),
      background: 'var(--bg-card)',
      color: 'var(--text-primary)',
      reverseButtons: true,
    }).then((result) => {
      if (result.isConfirmed) {
        handleDelete(purchase._id);
        Swal.fire({
          title: t('purchasesPage.deletedTitle'),
          text: t('purchasesPage.purchaseDeletedText'),
          icon: 'success',
          timer: 1500,
          showConfirmButton: false,
          background: 'var(--bg-card)',
          color: 'var(--text-primary)',
        });
      }
    });
  };

  const getStatusBadge = (status) => {
    const map = {
      paid: { cls: 'badge-success', label: t('common.paid') },
      partial: { cls: 'badge-warning', label: t('common.partial') },
      unpaid: { cls: 'badge-danger', label: t('purchasesPage.unpaid') },
    };
    const s = map[status] || map.unpaid;
    return <span className={`badge ${s.cls}`}>{s.label}</span>;
  };

  return (
    <div>
      {/* Page Header */}
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h4 className="mb-1" style={{ fontWeight: 800 }}>{t('nav.purchases')}</h4>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
            {t('purchasesPage.subtitle')}
          </p>
        </div>
        <div className="d-flex gap-2">
          {/* Bulk Import temporarily hidden — re-enable by uncommenting this button.
          <button className="btn-premium btn-premium-secondary" onClick={() => setBulkImportOpen(true)}>
            <BiUpload /> {t('purchasesPage.bulkImportButton')}
          </button>
          */}
          <button className="btn-premium btn-premium-primary" onClick={() => { setViewing(null); setDrawerOpen(true); }}>
            <BiPlus /> {t('common.add')} <span className="purchase-btn-full-label">{t('purchasesPage.purchase')}</span>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="mb-3" style={{ maxWidth: '400px' }}>
        <div className="search-box">
          <BiSearch className="search-icon" />
          <input
            className="form-control"
            placeholder={t('purchasesPage.searchPlaceholder')}
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
                <th>{t('purchasesPage.purchaseNo')}</th>
                <th>{t('purchasesPage.supplierInvoiceNo')}</th>
                <th>{t('purchase.supplier')}</th>
                <th>{t('sale.total')}</th>
                <th>{t('common.paid')}</th>
                <th>{t('common.due')}</th>
                <th>{t('common.status')}</th>
                <th style={{ width: '100px' }}>{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="text-center py-5" style={{ color: 'var(--text-muted)' }}>
                    <div className="spinner-border spinner-border-sm me-2" /> {t('common.loading')}
                  </td>
                </tr>
              ) : purchases.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-5" style={{ color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem', opacity: 0.5 }}>📄</div>
                    {t('purchasesPage.noPurchasesFound')}
                  </td>
                </tr>
              ) : purchases.map((purchase, idx) => (
                <tr key={purchase._id}>
                  <td style={{ color: 'var(--text-muted)', fontWeight: 600 }}>
                    {(page - 1) * PURCHASES_PER_PAGE + idx + 1}
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{purchase.purchaseNo}</div>
                  </td>
                  <td>{purchase.supplierInvoiceNo || '-'}</td>
                  <td>{purchase.supplier?.name || '-'}</td>
                  <td>₹{purchase.totalAmount}</td>
                  <td>₹{purchase.paidAmount}</td>
                  <td>
                    <span style={purchase.dueAmount > 0 ? { color: 'var(--danger)', fontWeight: 700 } : undefined}>
                      ₹{purchase.dueAmount}
                    </span>
                  </td>
                  <td>{getStatusBadge(purchase.paymentStatus)}</td>
                  <td>
                    <div className="d-flex gap-1">
                      <button className="btn-action btn-action-view" data-tooltip={t('common.view')} onClick={() => handleView(purchase)}>
                        <BiShow />
                      </button>
                      <button className="btn-action btn-action-delete" data-tooltip={t('common.delete')} onClick={() => confirmDelete(purchase)}>
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
        ) : purchases.length === 0 ? (
          <div className="text-center py-5" style={{ color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem', opacity: 0.5 }}>📄</div>
            {t('purchasesPage.noPurchasesFound')}
          </div>
        ) : purchases.map((purchase) => (
          <ExpandableCard
            key={purchase._id}
            compact={
              <>
                <div className="expandable-card__compact-row">
                  <span className="expandable-card__name">{purchase.supplier?.name || t('common.unknown')}</span>
                  <span className="expandable-card__price">{money(purchase.totalAmount)}</span>
                </div>
                <div className="expandable-card__meta">
                  <span className="expandable-card__meta-item">
                    <BiHash />
                    <span>{purchase.purchaseNo}</span>
                  </span>
                  <span className="expandable-card__meta-item">
                    <BiCalendar />
                    <span>{new Date(purchase.purchaseDate || purchase.createdAt).toLocaleDateString()}</span>
                  </span>
                </div>
                <div className="expandable-card__compact-row" style={{ marginTop: '0.15rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('purchasesPage.paymentStatus')}</span>
                  <span>{getStatusBadge(purchase.paymentStatus)}</span>
                </div>
              </>
            }
            expanded={
              <div className="expandable-card__rows">
                <div className="expandable-card__row">
                  <span className="expandable-card__row-label">{t('purchasesPage.supplierInvoiceNo')}</span>
                  <span className="expandable-card__row-dots" />
                  <span className="expandable-card__row-value">{purchase.supplierInvoiceNo || '-'}</span>
                </div>
                <div className="expandable-card__row">
                  <span className="expandable-card__row-label">{t('purchasesPage.totalItems')}</span>
                  <span className="expandable-card__row-dots" />
                  <span className="expandable-card__row-value">{purchase.totalItems || purchase.items?.length || 0}</span>
                </div>
                <div className="expandable-card__row">
                  <span className="expandable-card__row-label">{t('sale.paidAmount')}</span>
                  <span className="expandable-card__row-dots" />
                  <span className="expandable-card__row-value">{money(purchase.paidAmount)}</span>
                </div>
                <div className="expandable-card__row">
                  <span className="expandable-card__row-label">{t('purchasesPage.dueAmount')}</span>
                  <span className="expandable-card__row-dots" />
                  <span className="expandable-card__row-value" style={purchase.dueAmount > 0 ? { color: 'var(--danger)' } : undefined}>{money(purchase.dueAmount)}</span>
                </div>
                <div className="expandable-card__row">
                  <span className="expandable-card__row-label">{t('sale.paymentMethod')}</span>
                  <span className="expandable-card__row-dots" />
                  <span className="expandable-card__row-value" style={{ textTransform: 'capitalize' }}>{(purchase.paymentMethod || '-').replace(/_/g, ' ')}</span>
                </div>
                <div className="expandable-card__row">
                  <span className="expandable-card__row-label">{t('common.notes')}</span>
                  <span className="expandable-card__row-dots" />
                  <span className="expandable-card__row-value">{purchase.notes || '-'}</span>
                </div>
                <div className="expandable-card__row">
                  <span className="expandable-card__row-label">{t('purchasesPage.createdBy')}</span>
                  <span className="expandable-card__row-dots" />
                  <span className="expandable-card__row-value">{purchase.createdBy?.name || purchase.createdBy || '-'}</span>
                </div>
                <div className="expandable-card__row">
                  <span className="expandable-card__row-label">{t('purchasesPage.createdDate')}</span>
                  <span className="expandable-card__row-dots" />
                  <span className="expandable-card__row-value">{new Date(purchase.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            }
            actions={
              <>
                <button className="btn-action btn-action-view" data-tooltip={t('common.view')} onClick={() => handleView(purchase)}>
                  <BiShow />
                </button>
                <button className="btn-action btn-action-edit" data-tooltip={t('common.edit')} onClick={() => { setViewing(purchase); setDrawerOpen(true); }}>
                  <BiCheck />
                </button>
                <button className="btn-action btn-action-delete" data-tooltip={t('common.delete')} onClick={() => confirmDelete(purchase)}>
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
        pageSize={PURCHASES_PER_PAGE}
        onPageChange={setPage}
      />

      {/* Add Purchase / View Purchase Drawer */}
      <PurchaseDrawer
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setViewing(null); }}
        onSuccess={fetchPurchases}
        viewing={viewing}
        t={t}
      />

      {/* Bulk Import Drawer */}
      <BulkImportDrawer
        open={bulkImportOpen}
        onClose={() => setBulkImportOpen(false)}
        onSuccess={fetchPurchases}
        t={t}
      />

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="modal-premium" onClick={() => setDeleteConfirm(null)}>
          <div className="modal-premium-content" style={{ maxWidth: '420px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-premium-header">
              <h5>{t('purchasesPage.deletePurchaseTitle')}</h5>
              <button className="btn-close-premium" onClick={() => setDeleteConfirm(null)}><BiX /></button>
            </div>
            <div className="modal-premium-body text-center">
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--glow-danger)', color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', margin: '0 auto 1.25rem' }}><BiTrash /></div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>{t('purchasesPage.deletePurchaseConfirmGeneric')}</p>
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

export default Purchases;