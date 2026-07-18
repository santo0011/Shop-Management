import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../../services/api';
import ProductDrawer from '../../../components/common/ProductDrawer';
import ProductSearchField from '../../../components/common/ProductSearchField';
import ExpandableCard from '../../../components/common/ExpandableCard';
import { showToast } from '../../../utils/toast';
import {
  BiSearch, BiPlus, BiTrash, BiX, BiCheck, BiShow, BiCalendar, BiNote,
  BiCreditCard, BiHash, BiUser, BiChevronDown,
} from 'react-icons/bi';
import Swal from 'sweetalert2';

// ─── Constants ────────────────────────────────────────────────────────────
const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'mobile_banking', label: 'Mobile Banking' },
  { value: 'due', label: 'Due' },
];

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
const ProductCard = ({ row, index, isViewMode, isOpen, onToggle, setFieldRef, updateRow, removeRow, handleSelectProduct, handleCreateNewProduct, handleRowFieldEnter, rowTotal, money, rows }) => {
  return (
    <div className={`purchase-mobile-product-card ${isOpen ? 'purchase-mobile-product-card--open' : ''}`}>
      <div className="purchase-mobile-product-card__header" onClick={onToggle}>
        <div className="purchase-mobile-product-card__header-left">
          <span className="purchase-mobile-product-card__header-index">#{index + 1}</span>
          <span className="purchase-mobile-product-card__header-name">
            {row.product?.name || (isViewMode ? 'Unknown product' : 'Select product')}
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
              <label className="purchase-mobile-product-card__label">Product</label>
              <ProductSearchField
                ref={setFieldRef(row.key, 'product')}
                value={row.product}
                onSelect={(p) => handleSelectProduct(row.key, p)}
                onCreateNew={(q) => handleCreateNewProduct(row.key, q)}
                onEnter={() => handleRowFieldEnter(row.key, 'product')}
              />
              {row.product && (
                <div className="purchase-mobile-product-card__hint">
                  Unit: {row.product.unit} · Stock: {row.product.stock ?? 0}
                </div>
              )}
            </div>
          )}
          {isViewMode && row.product && (
            <div className="purchase-mobile-product-card__field">
              <label className="purchase-mobile-product-card__label">Product</label>
              <span className="purchase-mobile-product-card__value">{row.product?.name || 'Unknown product'}</span>
            </div>
          )}

          <div className="purchase-mobile-product-card__row-fields">
            <div className="purchase-mobile-product-card__field">
              <label className="purchase-mobile-product-card__label">Batch No.</label>
              <input
                ref={setFieldRef(row.key, 'batchNumber')}
                className="purchase-mobile-product-card__input"
                value={row.batchNumber}
                onChange={(e) => updateRow(row.key, { batchNumber: e.target.value })}
                disabled={isViewMode}
                placeholder="Batch"
              />
            </div>
            <div className="purchase-mobile-product-card__field">
              <label className="purchase-mobile-product-card__label">Expiry Date</label>
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
              <label className="purchase-mobile-product-card__label">Qty</label>
              <input
                ref={setFieldRef(row.key, 'quantity')}
                type="number"
                min="1"
                className="purchase-mobile-product-card__input"
                placeholder="Qty"
                value={row.quantity}
                onChange={(e) => updateRow(row.key, { quantity: e.target.value })}
                disabled={isViewMode}
              />
            </div>
            <div className="purchase-mobile-product-card__field">
              <label className="purchase-mobile-product-card__label">Purchase Price</label>
              <input
                ref={setFieldRef(row.key, 'purchasePrice')}
                type="number"
                min="0"
                className="purchase-mobile-product-card__input"
                placeholder="Price"
                value={row.purchasePrice}
                onChange={(e) => updateRow(row.key, { purchasePrice: e.target.value })}
                disabled={isViewMode}
              />
            </div>
            <div className="purchase-mobile-product-card__field">
              <label className="purchase-mobile-product-card__label">Selling Price</label>
              <input
                ref={setFieldRef(row.key, 'sellingPrice')}
                type="number"
                min="0"
                className="purchase-mobile-product-card__input"
                placeholder="S.Price"
                value={row.sellingPrice}
                onChange={(e) => updateRow(row.key, { sellingPrice: e.target.value })}
                disabled={isViewMode}
              />
            </div>
          </div>

          <div className="purchase-mobile-product-card__row-fields">
            <div className="purchase-mobile-product-card__field">
              <label className="purchase-mobile-product-card__label">Discount %</label>
              <input
                ref={setFieldRef(row.key, 'discount')}
                type="number"
                min="0"
                className="purchase-mobile-product-card__input"
                placeholder="Disc %"
                value={row.discount}
                onChange={(e) => updateRow(row.key, { discount: e.target.value })}
                disabled={isViewMode}
              />
            </div>
            <div className="purchase-mobile-product-card__field">
              <label className="purchase-mobile-product-card__label">Tax %</label>
              <input
                ref={setFieldRef(row.key, 'tax')}
                type="number"
                min="0"
                className="purchase-mobile-product-card__input"
                placeholder="Tax %"
                value={row.tax}
                onChange={(e) => updateRow(row.key, { tax: e.target.value })}
                disabled={isViewMode}
              />
            </div>
          </div>

          <div className="purchase-mobile-product-card__total">
            <span>Line Total</span>
            <strong>{money(rowTotal(row))}</strong>
          </div>

          {!isViewMode && (
            <button
              type="button"
              className="purchase-mobile-product-card__remove"
              onClick={() => removeRow(row.key)}
              disabled={rows.length <= 1}
            >
              <BiTrash /> Remove Item
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
  const [paidAmount, setPaidAmount] = useState();
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
        product: i.product && typeof i.product === 'object' ? i.product : { _id: i.product, name: 'Unknown product' },
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
      setPaidAmount(0);
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
      purchasePrice: product.purchasePrice || 0,
      sellingPrice: product.sellingPrice || 0,
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
    if (!header.supplier) newErrors.supplier = 'Supplier is required';
    if (validRows.length === 0) newErrors.items = 'Add at least one product';
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
      showToast.success(`Purchase ${data.purchaseNo} created`);
      onSuccess();
      onClose();
    } catch (err) {
      setSubmitError(err.response?.data?.message || 'Failed to save purchase');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className={`drawer-overlay ${open ? 'open' : ''}`} onClick={onClose} />
      <div className={`drawer purchase-drawer ${open ? 'open' : ''}`}>
        <div className="drawer-header">
          <h5>{isViewMode ? `Purchase ${viewing?.purchaseNo || ''}` : 'New Purchase'}</h5>
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
                <option value="">Select Supplier</option>
                {suppliers.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
              </select>
              {errors.supplier && <div className="invalid-feedback-premium">{errors.supplier}</div>}
            </div>

            <div className="form-group mb-0">
              <label className="form-label"><BiHash style={{ marginRight: 4 }} />Purchase No</label>
              <input
                className="form-control"
                value={isViewMode ? viewing?.purchaseNo || '' : 'Auto-generated on save'}
                readOnly
                disabled
                style={{ color: 'var(--text-muted)', background: 'var(--bg-primary)' }}
              />
            </div>

            <div className="form-group mb-0">
              <label className="form-label">Supplier Invoice No</label>
              <input
                className="form-control"
                placeholder="Optional"
                value={header.supplierInvoiceNo}
                onChange={(e) => handleHeaderChange('supplierInvoiceNo', e.target.value)}
                disabled={isViewMode}
              />
            </div>

            <div className="form-group mb-0">
              <label className="form-label"><BiCalendar style={{ marginRight: 4 }} />Purchase Date</label>
              <input
                type="date"
                className="form-control"
                value={header.purchaseDate}
                onChange={(e) => handleHeaderChange('purchaseDate', e.target.value)}
                disabled={isViewMode}
              />
            </div>

            <div className="form-group mb-0">
              <label className="form-label"><BiCreditCard style={{ marginRight: 4 }} />Payment Method</label>
              <select
                className="form-select"
                value={header.paymentMethod}
                onChange={(e) => handleHeaderChange('paymentMethod', e.target.value)}
                disabled={isViewMode}
              >
                {PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>

            <div className="form-group mb-0 purchase-header-notes">
              <label className="form-label"><BiNote style={{ marginRight: 4 }} />Notes</label>
              <input
                className="form-control"
                placeholder="Optional notes"
                value={header.notes}
                onChange={(e) => handleHeaderChange('notes', e.target.value)}
                disabled={isViewMode}
              />
            </div>
          </div>

          {/* ─── Desktop Product Table ─────────────────────────────── */}
          <div className="purchase-desktop-section">
            <div className="purchase-items-header">
              <label className="form-label mb-0" style={{ fontWeight: 600 }}>Products</label>
              {!isViewMode && (
                <button type="button" className="purchase-add-row-btn" onClick={addRow}>
                  <BiPlus /> Add Row
                </button>
              )}
            </div>
            {errors.items && <div className="invalid-feedback-premium mb-2">{errors.items}</div>}

            <div className="purchase-items-scroll">
              <table className="purchase-items-table">
                <thead>
                  <tr>
                    <th style={{ minWidth: 180, width: '22%' }}>Product</th>
                    <th style={{ width: 85 }}>Batch No.</th>
                    <th style={{ width: 105 }}>Expiry Date</th>
                    <th style={{ width: 55 }}>Qty</th>
                    <th style={{ width: 80 }}>Purchase Price</th>
                    <th style={{ width: 80 }}>Selling Price</th>
                    <th style={{ width: 65 }}>Discount %</th>
                    <th style={{ width: 55 }}>Tax %</th>
                    <th style={{ width: 75 }}>Total</th>
                    {!isViewMode && <th style={{ width: 32 }} />}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.key}>
                      <td>
                        {isViewMode ? (
                          <span style={{ fontWeight: 600 }}>{row.product?.name || 'Unknown product'}</span>
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
                                Unit: {row.product.unit} · Stock: {row.product.stock ?? 0}
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
                            title="Remove row"
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
              <label className="form-label mb-0" style={{ fontWeight: 600 }}>Products ({rows.length})</label>
              {!isViewMode && (
                <button type="button" className="purchase-add-row-btn" onClick={addRow}>
                  <BiPlus /> Add Item
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
                />
              ))}
            </div>
          </div>
        </div>

        {/* ─── Summary ───────────────────────────────────────────────── */}
        <div className="purchase-summary-card">
          <div className="purchase-summary-card__body">
            <div className="purchase-summary-row">
              <span className="purchase-summary-row__label">Total Items</span>
              <span className="purchase-summary-row__value">{totalItems}</span>
            </div>
            <div className="purchase-summary-row">
              <span className="purchase-summary-row__label">Discount</span>
              <span className="purchase-summary-row__value purchase-summary-row__value--danger">-{money(discountTotal)}</span>
            </div>
            <div className="purchase-summary-row">
              <span className="purchase-summary-row__label">Tax</span>
              <span className="purchase-summary-row__value purchase-summary-row__value--success">+{money(taxTotal)}</span>
            </div>
            <div className="purchase-summary-divider" />
            <div className="purchase-summary-row purchase-summary-row--grand">
              <span className="purchase-summary-row__label purchase-summary-row__label--grand">Grand Total</span>
              <span className="purchase-summary-row__value purchase-summary-row__value--grand">{money(grandTotal)}</span>
            </div>
            <div className="purchase-summary-divider" />
            <div className="purchase-summary-row">
              <span className="purchase-summary-row__label">Previous Due</span>
              <span className="purchase-summary-row__value">{money(previousDue)}</span>
            </div>
            <div className="purchase-summary-row purchase-summary-row--paid">
              <span className="purchase-summary-row__label">Paid Amount</span>
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
              <span className="purchase-summary-row__label purchase-summary-row__label--due">Current Due</span>
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
                Cancel
              </button>
              <button type="button" className="btn-premium btn-premium-primary" onClick={handleSubmit} disabled={saving}>
                {saving ? <><span className="spinner-border spinner-border-sm" /> Saving...</> : <><BiCheck /> Save Purchase</>}
              </button>
            </>
          )}
          {isViewMode && (
            <button type="button" className="btn-premium btn-premium-secondary" onClick={onClose}>
              Close
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

// ─── Main Purchases Page ───────────────────────────────────────────────────
const Purchases = () => {
  const { t } = useTranslation();
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [search, setSearch] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const isFirstLoad = useRef(true);

  useEffect(() => {
    fetchPurchases();
  }, []);

  const fetchPurchases = useCallback(async () => {
    const silent = !isFirstLoad.current;
    if (silent) setSearching(true); else setLoading(true);
    try {
      const { data } = await api.get(`/purchases?search=${search}`, { _skipLoading: silent });
      setPurchases(data.purchases);
    } catch (err) {
      console.error(err);
    } finally {
      if (silent) setSearching(false); else setLoading(false);
      isFirstLoad.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(() => fetchPurchases(), 300);
    return () => clearTimeout(timer);
  }, [fetchPurchases]);

  const handleView = async (purchase) => {
    try {
      const { data } = await api.get(`/purchases/${purchase._id}`);
      setViewing(data);
      setDrawerOpen(true);
    } catch (err) {
      showToast.error('Failed to load purchase details');
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/purchases/${id}`);
      setDeleteConfirm(null);
      fetchPurchases();
    } catch (err) {
      console.error(err);
    }
  };

  const confirmDelete = (purchase) => {
    Swal.fire({
      title: 'Delete Purchase?',
      text: `Are you sure you want to delete purchase "${purchase.purchaseNo}"? This action cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#FF6B6B',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel',
      background: 'var(--bg-card)',
      color: 'var(--text-primary)',
      reverseButtons: true,
    }).then((result) => {
      if (result.isConfirmed) {
        handleDelete(purchase._id);
        Swal.fire({
          title: 'Deleted!',
          text: 'Purchase has been deleted.',
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
      paid: { cls: 'badge-success', label: 'Paid' },
      partial: { cls: 'badge-warning', label: 'Partial' },
      unpaid: { cls: 'badge-danger', label: 'Unpaid' },
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
            Manage your purchase orders
          </p>
        </div>
        <button className="btn-premium btn-premium-primary" onClick={() => { setViewing(null); setDrawerOpen(true); }}>
          <BiPlus /> Add <span className="purchase-btn-full-label">Purchase</span>
        </button>
      </div>

      {/* Search */}
      <div className="mb-3" style={{ maxWidth: '400px' }}>
        <div className="search-box">
          <BiSearch className="search-icon" />
          <input
            className="form-control"
            placeholder="Search by purchase no, supplier invoice or supplier..."
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
                <th>Purchase No</th>
                <th>Supplier Invoice</th>
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
                  <td colSpan={8} className="text-center py-5" style={{ color: 'var(--text-muted)' }}>
                    <div className="spinner-border spinner-border-sm me-2" /> Loading...
                  </td>
                </tr>
              ) : purchases.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-5" style={{ color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem', opacity: 0.5 }}>📄</div>
                    No purchases found
                  </td>
                </tr>
              ) : purchases.map((purchase) => (
                <tr key={purchase._id}>
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
                      <button className="btn-action btn-action-view" data-tooltip="View" onClick={() => handleView(purchase)}>
                        <BiShow />
                      </button>
                      <button className="btn-action btn-action-delete" data-tooltip="Delete" onClick={() => confirmDelete(purchase)}>
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
        ) : purchases.length === 0 ? (
          <div className="text-center py-5" style={{ color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem', opacity: 0.5 }}>📄</div>
            No purchases found
          </div>
        ) : purchases.map((purchase) => (
          <ExpandableCard
            key={purchase._id}
            compact={
              <>
                <div className="expandable-card__compact-row">
                  <span className="expandable-card__name">{purchase.supplier?.name || 'Unknown'}</span>
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
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Payment Status</span>
                  <span>{getStatusBadge(purchase.paymentStatus)}</span>
                </div>
              </>
            }
            expanded={
              <div className="expandable-card__rows">
                <div className="expandable-card__row">
                  <span className="expandable-card__row-label">Supplier Invoice No.</span>
                  <span className="expandable-card__row-dots" />
                  <span className="expandable-card__row-value">{purchase.supplierInvoiceNo || '-'}</span>
                </div>
                <div className="expandable-card__row">
                  <span className="expandable-card__row-label">Total Items</span>
                  <span className="expandable-card__row-dots" />
                  <span className="expandable-card__row-value">{purchase.totalItems || purchase.items?.length || 0}</span>
                </div>
                <div className="expandable-card__row">
                  <span className="expandable-card__row-label">Paid Amount</span>
                  <span className="expandable-card__row-dots" />
                  <span className="expandable-card__row-value">{money(purchase.paidAmount)}</span>
                </div>
                <div className="expandable-card__row">
                  <span className="expandable-card__row-label">Due Amount</span>
                  <span className="expandable-card__row-dots" />
                  <span className="expandable-card__row-value" style={purchase.dueAmount > 0 ? { color: 'var(--danger)' } : undefined}>{money(purchase.dueAmount)}</span>
                </div>
                <div className="expandable-card__row">
                  <span className="expandable-card__row-label">Payment Method</span>
                  <span className="expandable-card__row-dots" />
                  <span className="expandable-card__row-value" style={{ textTransform: 'capitalize' }}>{(purchase.paymentMethod || '-').replace(/_/g, ' ')}</span>
                </div>
                <div className="expandable-card__row">
                  <span className="expandable-card__row-label">Notes</span>
                  <span className="expandable-card__row-dots" />
                  <span className="expandable-card__row-value">{purchase.notes || '-'}</span>
                </div>
                <div className="expandable-card__row">
                  <span className="expandable-card__row-label">Created By</span>
                  <span className="expandable-card__row-dots" />
                  <span className="expandable-card__row-value">{purchase.createdBy?.name || purchase.createdBy || '-'}</span>
                </div>
                <div className="expandable-card__row">
                  <span className="expandable-card__row-label">Created Date</span>
                  <span className="expandable-card__row-dots" />
                  <span className="expandable-card__row-value">{new Date(purchase.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            }
            actions={
              <>
                <button className="btn-action btn-action-view" data-tooltip="View" onClick={() => handleView(purchase)}>
                  <BiShow />
                </button>
                <button className="btn-action btn-action-edit" data-tooltip="Edit" onClick={() => { setViewing(purchase); setDrawerOpen(true); }}>
                  <BiCheck />
                </button>
                <button className="btn-action btn-action-delete" data-tooltip="Delete" onClick={() => confirmDelete(purchase)}>
                  <BiTrash />
                </button>
              </>
            }
          />
        ))}
      </div>

      {/* Add Purchase / View Purchase Drawer */}
      <PurchaseDrawer
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setViewing(null); }}
        onSuccess={fetchPurchases}
        viewing={viewing}
        t={t}
      />

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="modal-premium" onClick={() => setDeleteConfirm(null)}>
          <div className="modal-premium-content" style={{ maxWidth: '420px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-premium-header">
              <h5>Delete Purchase</h5>
              <button className="btn-close-premium" onClick={() => setDeleteConfirm(null)}><BiX /></button>
            </div>
            <div className="modal-premium-body text-center">
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--glow-danger)', color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', margin: '0 auto 1.25rem' }}><BiTrash /></div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>Are you sure you want to delete this purchase? This action cannot be undone.</p>
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

export default Purchases;