import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../../services/api';
import ProductDrawer from '../../../components/common/ProductDrawer';
import ProductSearchField from '../../../components/common/ProductSearchField';
import ExpandableCard from '../../../components/common/ExpandableCard';
import Pagination from '../../../components/common/Pagination';
import StatCard from '../../../components/common/StatCard';
import { showToast } from '../../../utils/toast';
import {
  BiSearch, BiPlus, BiTrash, BiX, BiCheck, BiShow, BiCalendar, BiNote,
  BiCreditCard, BiHash, BiUser, BiChevronDown, BiChevronUp,
  BiUpload, BiDownload, BiFile, BiPaste, BiTable, BiError, BiRefresh, BiInfoCircle,
  BiImage, BiUndo, BiZoomIn, BiDollar, BiWallet, BiTrendingUp, BiCart,
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

const ROW_FIELDS = ['batchNumber', 'expiryDate', 'quantity', 'purchasePrice', 'sellingPrice', 'discount'];

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
const rowTaxAmt = (row) => Number(row.tax || 0);
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
                <div className="purchase-mobile-product-card__hint purchase-stock-hint">
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
              {row.returnedQty > 0 && (
                <div className="purchase-row-hint purchase-row-hint--returned">
                  {t('purchasesPage.returnedQtyHint', { qty: row.returnedQty })}
                </div>
              )}
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

// ─── Full-screen Invoice Image Viewer ──────────────────────────────────
const InvoiceImageViewer = ({ src, alt, onClose }) => {
  const [scale, setScale] = useState(1);
  const imgRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const zoomIn = () => setScale((s) => Math.min(s + 0.25, 3));
  const zoomOut = () => setScale((s) => Math.max(s - 0.25, 0.25));
  const resetZoom = () => setScale(1);

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = src;
    a.download = 'invoice-image.jpg';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div
      className="purchase-invoice-zoom-overlay"
      onClick={onClose}
      style={{
        position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
        background: 'rgba(0,0,0,0.85)', zIndex: 10000, display: 'flex',
        alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out',
        animation: 'fadeIn 0.2s ease',
      }}
    >
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
      {/* Close button - always visible */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        style={{
          position: 'fixed', top: 16, right: 16, zIndex: 10001,
          width: 40, height: 40, borderRadius: '50%',
          background: 'rgba(255,255,255,0.15)', border: 'none',
          color: '#fff', fontSize: 24, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(4px)', transition: 'background 0.15s',
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
        onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
      >
        <BiX />
      </button>

      {/* Image */}
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '92vw', maxHeight: '85vh', objectFit: 'contain',
          transform: `scale(${scale})`, transition: 'transform 0.2s ease',
          borderRadius: 8, cursor: 'default', userSelect: 'none',
        }}
      />

      {/* Toolbar */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          display: 'flex', gap: 8, padding: '8px 16px',
          background: 'rgba(255,255,255,0.12)', borderRadius: 12,
          backdropFilter: 'blur(8px)', zIndex: 10001,
        }}
      >
        <button type="button" onClick={zoomOut} title="Zoom Out"
          style={toolbarBtnStyle}>
          <BiZoomIn size={16} style={{ transform: 'scaleX(-1)' }} />
        </button>
        <button type="button" onClick={resetZoom} title="Reset Zoom"
          style={{ ...toolbarBtnStyle, fontSize: 12, fontFamily: 'var(--font-family)' }}>
          {Math.round(scale * 100)}%
        </button>
        <button type="button" onClick={zoomIn} title="Zoom In"
          style={toolbarBtnStyle}>
          <BiZoomIn size={16} />
        </button>
        <div style={{ width: 1, background: 'rgba(255,255,255,0.2)', margin: '0 4px' }} />
        <button type="button" onClick={handleDownload} title="Download"
          style={toolbarBtnStyle}>
          <BiDownload size={16} />
        </button>
      </div>
    </div>
  );
};

const toolbarBtnStyle = {
  width: 36, height: 36, borderRadius: 8, border: 'none',
  background: 'rgba(255,255,255,0.08)', color: '#fff',
  cursor: 'pointer', display: 'flex', alignItems: 'center',
  justifyContent: 'center', transition: 'background 0.15s',
};

// ─── Purchase Entry Drawer (create) / Detail Drawer (view) ────────────────
const PurchaseDrawer = ({ open, onClose, onSuccess, viewing, t }) => {
  const isViewMode = !!viewing;

  const [header, setHeader] = useState(emptyHeader);
  const [rows, setRows] = useState([emptyRow()]);
  const [paidAmount, setPaidAmount] = useState('');
  const [previousDuePaymentAmount, setPreviousDuePaymentAmount] = useState('');
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [suppliers, setSuppliers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [shopSettings, setShopSettings] = useState(null);
  const [dueSummary, setDueSummary] = useState(null);
  const [includePreviousDue, setIncludePreviousDue] = useState(false);
  const [invoiceImage, setInvoiceImage] = useState('');
  const [savingInvoiceImage, setSavingInvoiceImage] = useState(false);
  const [zoomImage, setZoomImage] = useState(null);
  const [viewingOverride, setViewingOverride] = useState(null);
  const [returnPanelOpen, setReturnPanelOpen] = useState(false);
  const [returnQuantities, setReturnQuantities] = useState({});
  const [returnReason, setReturnReason] = useState('');
  const [submittingReturn, setSubmittingReturn] = useState(false);

  const [productDrawer, setProductDrawer] = useState({ open: false, rowKey: null, initialName: '' });
  const [mobileOpenCards, setMobileOpenCards] = useState({});
  const invoiceImageInputRef = useRef(null);

  const fieldRefs = useRef({});
  const setFieldRef = (rowKey, field) => (el) => { fieldRefs.current[`${rowKey}::${field}`] = el; };
  const focusField = (rowKey, field) => { fieldRefs.current[`${rowKey}::${field}`]?.focus(); };

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setSubmitError(null);
    fetchSuppliers();
    fetchCategories();
    fetchShopSettings();
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
        returnedQty: i.returnedQty || 0,
        // Carried through only for the Return Panel's live refund preview —
        // already net of any prior returns, matching what the backend uses.
        total: i.total,
      })));
      setPaidAmount(viewing.paidAmount || 0);
      setInvoiceImage(viewing.invoiceImage || '');
    } else {
      setHeader(emptyHeader());
      setRows([emptyRow()]);
      setPaidAmount('');
      setInvoiceImage('');
    }
    // Never carry the previous-due toggle across drawer sessions or suppliers —
    // it must always be an explicit, per-purchase opt-in.
    setDueSummary(null);
    setIncludePreviousDue(false);
    setPreviousDuePaymentAmount('');
    setViewingOverride(null);
    setReturnPanelOpen(false);
    setReturnQuantities({});
    setReturnReason('');
    setZoomImage(null);
  }, [open, viewing]);

  // The purchase doc as currently known — either the prop from the parent,
  // or (after processing a return in this drawer session) the fresher copy
  // returned by the return endpoint, without needing a round-trip through
  // the parent's own state.
  const effectiveViewing = viewingOverride || viewing;

  const toggleMobileCard = (key) => {
    setMobileOpenCards((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const fetchSuppliers = async () => {
    try {
      const { data } = await api.get('/suppliers?limit=10000', { _skipLoading: true });
      setSuppliers(Array.isArray(data) ? data : data.suppliers || []);
    } catch (err) { console.error(err); }
  };

  // Fetch the selected supplier's outstanding due whenever it changes, so the
  // "Previous Due" card can appear. Create-mode only — view mode shows the
  // frozen snapshot recorded on the purchase itself, not today's live due.
  useEffect(() => {
    if (isViewMode || !open || !header.supplier) {
      setDueSummary(null);
      setIncludePreviousDue(false);
      setPreviousDuePaymentAmount('');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get(`/suppliers/${header.supplier}/due-summary`, { _skipLoading: true });
        if (!cancelled) setDueSummary(data);
      } catch (err) {
        if (!cancelled) setDueSummary(null);
        console.error(err);
      }
    })();
    setIncludePreviousDue(false);
    setPreviousDuePaymentAmount('');
    return () => { cancelled = true; };
  }, [header.supplier, isViewMode, open]);

  const fetchCategories = async () => {
    try {
      const { data } = await api.get('/categories', { _skipLoading: true });
      setCategories(Array.isArray(data) ? data : data.categories || []);
    } catch (err) { console.error(err); }
  };

  const fetchShopSettings = async () => {
    try {
      const { data } = await api.get('/shops/my', { _skipLoading: true });
      const s = data.shop || data;
      setShopSettings(s.settings || {});
    } catch (err) { console.error(err); }
  };

  // Downscale + JPEG-compress before encoding, so a phone photo of an
  // invoice doesn't balloon the stored document (no file-storage infra in
  // this app — see the model comment — so the image lives as a data URI).
  const MAX_INVOICE_IMAGE_DIM = 1400;
  const readAndCompressImage = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('read failed'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('decode failed'));
      img.onload = () => {
        const scale = Math.min(1, MAX_INVOICE_IMAGE_DIM / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.75));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });

  // Handles both the create-mode "attach invoice photo" flow (stays local
  // until Save) and the view-mode "replace invoice photo" flow (saves
  // immediately via PUT, since that purchase already exists).
  const handleInvoiceImageFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const dataUrl = await readAndCompressImage(file);
      if (isViewMode && viewing?._id) {
        setSavingInvoiceImage(true);
        const { data } = await api.put(`/purchases/${viewing._id}/invoice-image`, { invoiceImage: dataUrl }, { _skipLoading: true });
        setInvoiceImage(data.invoiceImage || '');
        showToast.success(t('purchasesPage.invoiceImageUpdated'));
      } else {
        setInvoiceImage(dataUrl);
      }
    } catch (err) {
      console.error(err);
      showToast.error(t('purchasesPage.invoiceImageSaveFailed'));
    } finally {
      setSavingInvoiceImage(false);
    }
  };

  const handleRemoveInvoiceImage = async () => {
    if (isViewMode && viewing?._id) {
      try {
        setSavingInvoiceImage(true);
        await api.put(`/purchases/${viewing._id}/invoice-image`, { invoiceImage: '' }, { _skipLoading: true });
        setInvoiceImage('');
        showToast.success(t('purchasesPage.invoiceImageUpdated'));
      } catch (err) {
        showToast.error(t('purchasesPage.invoiceImageSaveFailed'));
      } finally {
        setSavingInvoiceImage(false);
      }
    } else {
      setInvoiceImage('');
    }
  };

  // ─── Purchase Return (view mode only) ────────────────────────────────
  // Inline panel inside this same drawer — no separate confirmation modal.
  const toggleReturnPanel = () => {
    setReturnQuantities({});
    setReturnReason('');
    setReturnPanelOpen((prev) => !prev);
  };

  const handleReturnQtyChange = (productId, value, maxReturnable) => {
    const num = Number(value);
    if (value !== '' && num > maxReturnable) {
      setReturnQuantities((prev) => ({ ...prev, [productId]: String(maxReturnable) }));
    } else {
      setReturnQuantities((prev) => ({ ...prev, [productId]: value }));
    }
  };

  // Client-side preview only — mirrors the backend's own proration
  // (purchaseController.processPurchaseReturn) so the panel shows an
  // accurate refund estimate, but the server always recomputes and is the
  // source of truth for what actually gets saved.
  const previewReturnAmount = (row, qty) => {
    const maxReturnable = Number(row.quantity || 0) - Number(row.returnedQty || 0);
    if (!qty || qty <= 0 || maxReturnable <= 0) return 0;
    const unitTotal = Number(row.total || 0) / maxReturnable;
    return Math.round(unitTotal * qty * 100) / 100;
  };

  const returnableRows = rows.filter((r) => r.product && (Number(r.quantity || 0) - Number(r.returnedQty || 0)) > 0);
  const totalReturnPreview = Object.entries(returnQuantities).reduce((sum, [productId, qty]) => {
    const row = rows.find((r) => r.product?._id === productId);
    return row ? sum + previewReturnAmount(row, Number(qty) || 0) : sum;
  }, 0);
  const hasValidReturnQty = Object.values(returnQuantities).some((v) => Number.isFinite(Number(v)) && Number(v) > 0);

  const handleSubmitReturn = async () => {
    const items = Object.entries(returnQuantities)
      .filter(([, qty]) => Number.isFinite(Number(qty)) && Number(qty) > 0)
      .map(([productId, qty]) => {
        const row = rows.find((r) => r.product?._id === productId);
        return { productId, productName: row?.product?.name || '', quantity: Number(qty) };
      });
    if (items.length === 0 || !effectiveViewing?._id) return;

    setSubmittingReturn(true);
    try {
      const { data } = await api.post(`/purchases/${effectiveViewing._id}/return`, { items, reason: returnReason }, { _skipLoading: true });
      setRows((prev) => prev.map((r) => {
        const updated = (data.items || []).find((i) => (i.product?._id || i.product) === r.product?._id);
        return updated ? { ...r, returnedQty: updated.returnedQty || 0, total: updated.total } : r;
      }));
      setViewingOverride(data);
      showToast.success(t('purchasesPage.returnProcessed'));
      setReturnPanelOpen(false);
      setReturnQuantities({});
      setReturnReason('');
      onSuccess();
    } catch (err) {
      showToast.error(err.response?.data?.message || t('purchasesPage.returnFailed'));
    } finally {
      setSubmittingReturn(false);
    }
  };

  const selectedSupplierData = useMemo(
    () => suppliers.find((s) => s._id === header.supplier) || (viewing?.supplier && typeof viewing.supplier === 'object' ? viewing.supplier : null),
    [suppliers, header.supplier, viewing]
  );

  // The schema only ever stores one invoice image today (a single base64
  // string), but normalizing to an array here means this display never needs
  // to change if that's extended later — it already renders "all of them".
  const invoiceImages = Array.isArray(invoiceImage)
    ? invoiceImage.filter(Boolean)
    : (invoiceImage ? [invoiceImage] : []);

  // ─── GST Logic ──────────────────────────────────────────────────────
  // All GST percentages come from Settings → Tax & GST. Never hardcoded.
  const companyState = shopSettings?.businessState || 'West Bengal';
  const supplierState = selectedSupplierData?.state || '';
  const isIntraState = supplierState && companyState && supplierState === companyState;
  const gstEnabled = shopSettings?.gstEnabled !== false;

  // Derive individual rates from the saved settings. If the newer
  // cgstRate/sgstRate/igstRate fields don't exist yet (e.g. after upgrade),
  // fall back to defaultGstRate / 2 for CGST/SGST and defaultGstRate for IGST.
  const defaultGstRate = shopSettings?.defaultGstRate ?? 18;
  const cgstRate = gstEnabled ? (shopSettings?.cgstRate ?? (defaultGstRate / 2)) : 0;
  const sgstRate = gstEnabled ? (shopSettings?.sgstRate ?? (defaultGstRate / 2)) : 0;
  const igstRate = gstEnabled ? (shopSettings?.igstRate ?? defaultGstRate) : 0;

  const gstType = isIntraState ? 'intra' : (supplierState ? 'inter' : 'none');

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
  const taxableAmount = subtotal - discountTotal;

  // GST calculations
  const cgstAmount = gstType === 'intra' ? taxableAmount * (cgstRate / 100) : 0;
  const sgstAmount = gstType === 'intra' ? taxableAmount * (sgstRate / 100) : 0;
  const igstAmount = gstType === 'inter' ? taxableAmount * (igstRate / 100) : 0;
  const totalGst = cgstAmount + sgstAmount + igstAmount;

  const grandTotal = taxableAmount + totalGst;
  // In view mode this is the frozen snapshot from when the purchase was made
  // (not today's live supplier due); in create mode it's the live fetched due.
  const previousDue = isViewMode ? (viewing?.previousDueAmountAtCreation || 0) : (dueSummary?.dueAmount || 0);
  const totalOutstanding = grandTotal + (includePreviousDue ? previousDue : 0);
  // Paid Amount and Due Amount to Pay are two independent, explicitly typed
  // figures — neither is inferred from the other, so what the user sees is
  // exactly what gets applied. "Current Due" stays scoped to this purchase
  // only; the previous due's own remainder is shown separately.
  const currentDue = Math.max(0, grandTotal - Number(paidAmount || 0));
  const remainingPreviousDue = includePreviousDue ? Math.max(0, previousDue - Number(previousDuePaymentAmount || 0)) : previousDue;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!header.supplier) newErrors.supplier = t('purchasesPage.supplierRequired');
    if (validRows.length === 0) newErrors.items = t('purchasesPage.itemsRequired');
    if (gstEnabled && !supplierState) {
      newErrors.supplierState = t('purchasesPage.gstStateRequiredError');
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const confirmResult = await Swal.fire({
      title: t('purchasesPage.confirmSaveTitle'),
      text: t('purchasesPage.confirmSaveText'),
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#6C63FF',
      cancelButtonColor: '#6c757d',
      confirmButtonText: t('purchasesPage.yesSavePurchase'),
      cancelButtonText: t('common.cancel'),
      background: 'var(--bg-card)',
      color: 'var(--text-primary)',
      reverseButtons: true,
    });
    if (!confirmResult.isConfirmed) return;

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
          total: rowTotal(r),
        })),
        subtotal,
        discount: discountTotal,
        gstType: gstType === 'intra' ? 'intra' : (gstType === 'inter' ? 'inter' : 'none'),
        cgstRate: cgstRate,
        sgstRate: sgstRate,
        igstRate: igstRate,
        cgstAmount,
        sgstAmount,
        igstAmount,
        totalGst,
        totalAmount: grandTotal,
        paidAmount: Number(paidAmount) || 0,
        includePreviousDue,
        previousDuePaymentAmount: includePreviousDue ? (Number(previousDuePaymentAmount) || 0) : 0,
        invoiceImage,
      };
      const { data } = await api.post('/purchases', payload, { _skipLoading: true });
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
              {errors.supplierState && <div className="invalid-feedback-premium">{errors.supplierState}</div>}
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

            {isViewMode ? (
              <div className="form-group mb-0 purchase-header-notes">
                <label className="form-label"><BiImage style={{ marginRight: 4 }} />{t('purchasesPage.invoiceImage')}</label>
                <div className="purchase-invoice-section">
                  {invoiceImages.length > 0 ? (
                    <>
                      <div className="purchase-invoice-gallery">
                        {invoiceImages.map((src, idx) => (
                          <button
                            type="button"
                            key={idx}
                            className="purchase-invoice-gallery__thumb"
                            onClick={() => setZoomImage(src)}
                          >
                            <img src={src} alt={t('purchasesPage.invoiceImage')} />
                            <span className="purchase-invoice-gallery__zoom-hint"><BiZoomIn /></span>
                          </button>
                        ))}
                      </div>
                      <div className="purchase-invoice-section__actions">
                        <button
                          type="button"
                          className="btn-premium btn-premium-secondary"
                          onClick={() => invoiceImageInputRef.current?.click()}
                          disabled={savingInvoiceImage}
                        >
                          <BiImage /> {t('purchasesPage.changeInvoiceImage')}
                        </button>
                        <button
                          type="button"
                          className="btn-premium btn-premium-secondary"
                          onClick={handleRemoveInvoiceImage}
                          disabled={savingInvoiceImage}
                        >
                          <BiTrash /> {t('purchasesPage.removeInvoiceImage')}
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="purchase-invoice-section__empty">
                      <span>{t('purchasesPage.noInvoiceUploaded')}</span>
                      <button
                        type="button"
                        className="btn-premium btn-premium-secondary"
                        onClick={() => invoiceImageInputRef.current?.click()}
                        disabled={savingInvoiceImage}
                      >
                        <BiUpload /> {t('purchasesPage.uploadInvoiceImage')}
                      </button>
                    </div>
                  )}
                  <input
                    ref={invoiceImageInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleInvoiceImageFile}
                  />
                </div>
              </div>
            ) : (
              <div className="form-group mb-0 purchase-header-notes">
                <label className="form-label"><BiImage style={{ marginRight: 4 }} />{t('purchasesPage.invoiceImage')}</label>
                <div className="purchase-invoice-image-field">
                  {invoiceImage ? (
                    <div className="purchase-invoice-image-preview">
                      <img src={invoiceImage} alt={t('purchasesPage.invoiceImage')} />
                      <div className="purchase-invoice-image-preview__actions">
                        <button
                          type="button"
                          className="btn-premium btn-premium-secondary"
                          onClick={() => invoiceImageInputRef.current?.click()}
                          disabled={savingInvoiceImage}
                        >
                          <BiImage /> {t('purchasesPage.changeInvoiceImage')}
                        </button>
                        <button
                          type="button"
                          className="btn-premium btn-premium-secondary"
                          onClick={handleRemoveInvoiceImage}
                          disabled={savingInvoiceImage}
                        >
                          <BiTrash /> {t('purchasesPage.removeInvoiceImage')}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="btn-premium btn-premium-secondary"
                      onClick={() => invoiceImageInputRef.current?.click()}
                      disabled={savingInvoiceImage}
                    >
                      <BiUpload /> {t('purchasesPage.uploadInvoiceImage')}
                    </button>
                  )}
                  <input
                    ref={invoiceImageInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleInvoiceImageFile}
                  />
                </div>
              </div>
            )}
          </div>

          {/* ─── Invoice Image Zoom Lightbox (view mode) ───────────────── */}
          {zoomImage && (
            <InvoiceImageViewer
              src={zoomImage}
              alt={t('purchasesPage.invoiceImage')}
              onClose={() => setZoomImage(null)}
            />
          )}

          {/* ─── Previous Due Card ──────────────────────────────────── */}
          {!isViewMode && dueSummary && dueSummary.dueAmount > 0 && (
            <div className="purchase-previous-due-card">
              <div className="purchase-previous-due-card__header">
                <span className="purchase-previous-due-card__title">{t('purchasesPage.previousDue')}</span>
                <span className="purchase-previous-due-card__amount">{money(dueSummary.dueAmount)}</span>
              </div>
              <div className="purchase-previous-due-card__meta">
                {dueSummary.lastPurchaseDate && (
                  <span className="purchase-previous-due-card__meta-item">
                    {t('purchasesPage.lastPurchase')}: {new Date(dueSummary.lastPurchaseDate).toLocaleDateString()}
                  </span>
                )}
                <span className="purchase-previous-due-card__meta-item">
                  {t('purchasesPage.unpaidInvoicesCount', { count: dueSummary.unpaidInvoiceCount })}
                </span>
              </div>
              <label className="purchase-previous-due-card__toggle-row">
                <span className="mob-inv-switch">
                  <input
                    type="checkbox"
                    checked={includePreviousDue}
                    onChange={(e) => { setIncludePreviousDue(e.target.checked); if (!e.target.checked) setPreviousDuePaymentAmount(''); }}
                  />
                  <span className="mob-inv-switch-slider" />
                </span>
                <span className="purchase-previous-due-card__toggle-label">{t('purchasesPage.includePreviousDue')}</span>
              </label>
            </div>
          )}

          {/* ─── GST Info Banner ────────────────────────────────────── */}
          {!isViewMode && gstEnabled && selectedSupplierData && (
            <div style={{
              marginTop: '0.75rem', padding: '0.5rem 0.75rem', borderRadius: 'var(--border-radius-sm)',
              width: '70%', background: 'rgba(23, 162, 184, 0.7)',
              color: '#ffffff', fontSize: '0.8rem', fontWeight: 600,
            }}>
              {!supplierState ? (
                <span style={{ color: 'var(--danger)' }}>{t('purchasesPage.gstBannerStateRequired')}</span>
              ) : isIntraState ? (
                <span>{t('purchasesPage.gstIntraStateInfo', { cgst: cgstRate, sgst: sgstRate, state: supplierState })}</span>
              ) : (
                <span>{t('purchasesPage.gstInterStateInfo', { igst: igstRate, state: supplierState })}</span>
              )}
            </div>
          )}

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
                              <div className="purchase-row-hint purchase-stock-hint">
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
                        {row.returnedQty > 0 && (
                          <div className="purchase-row-hint purchase-row-hint--returned">
                            {t('purchasesPage.returnedQtyHint', { qty: row.returnedQty })}
                          </div>
                        )}
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

          {/* ─── Summary ───────────────────────────────────────────────── */}
          <div className="purchase-summary-card">
            <div className="purchase-summary-card__body">
              <div className="purchase-summary-row">
                <span className="purchase-summary-row__label">{t('purchasesPage.totalItems')}</span>
                <span className="purchase-summary-row__value">{totalItems}</span>
              </div>
              <div className="purchase-summary-row">
                <span className="purchase-summary-row__label">{t('sale.subtotal')}</span>
                <span className="purchase-summary-row__value">{money(subtotal)}</span>
              </div>
              <div className="purchase-summary-row">
                <span className="purchase-summary-row__label">{t('sale.discount')}</span>
                <span className="purchase-summary-row__value purchase-summary-row__value--danger">-{money(discountTotal)}</span>
              </div>
              <div className="purchase-summary-row">
                <span className="purchase-summary-row__label">{t('purchasesPage.taxableAmount')}</span>
                <span className="purchase-summary-row__value">{money(taxableAmount)}</span>
              </div>
              {gstType === 'intra' && (
                <>
                  <div className="purchase-summary-row">
                    <span className="purchase-summary-row__label">{t('purchasesPage.cgstLabel', { rate: cgstRate })}</span>
                    <span className="purchase-summary-row__value purchase-summary-row__value--success">+{money(cgstAmount)}</span>
                  </div>
                  <div className="purchase-summary-row">
                    <span className="purchase-summary-row__label">{t('purchasesPage.sgstLabel', { rate: sgstRate })}</span>
                    <span className="purchase-summary-row__value purchase-summary-row__value--success">+{money(sgstAmount)}</span>
                  </div>
                </>
              )}
              {gstType === 'inter' && (
                <div className="purchase-summary-row">
                  <span className="purchase-summary-row__label">{t('purchasesPage.igstLabel', { rate: igstRate })}</span>
                  <span className="purchase-summary-row__value purchase-summary-row__value--success">+{money(igstAmount)}</span>
                </div>
              )}
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
              {previousDue > 0 && (
                <div className="purchase-summary-row">
                  <span className="purchase-summary-row__label">{t('purchasesPage.totalOutstanding')}</span>
                  <span className="purchase-summary-row__value">{money(totalOutstanding)}</span>
                </div>
              )}
              {includePreviousDue && previousDue > 0 && (
                <div className="purchase-summary-row purchase-summary-row--paid">
                  <span className="purchase-summary-row__label">{t('purchasesPage.dueAmountToPay')}</span>
                  {isViewMode ? (
                    <span className="purchase-summary-row__value purchase-summary-row__value--success">{money(previousDuePaymentAmount)}</span>
                  ) : (
                    <input
                      type="number"
                      className="purchase-summary-paid-input"
                      value={previousDuePaymentAmount}
                      min="0"
                      max={previousDue}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        if (e.target.value !== '' && val > previousDue) {
                          setPreviousDuePaymentAmount(String(previousDue));
                        } else {
                          setPreviousDuePaymentAmount(e.target.value);
                        }
                      }}
                    />
                  )}
                </div>
              )}
              <div className="purchase-summary-row purchase-summary-row--paid">
                <span className="purchase-summary-row__label">{t('sale.paidAmount')}</span>
                {isViewMode ? (
                  <span className="purchase-summary-row__value purchase-summary-row__value--success">{money(paidAmount)}</span>
                ) : (
                  <input
                    type="number"
                    className="purchase-summary-paid-input"
                    value={paidAmount}
                    min="0"
                    max={grandTotal}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      if (e.target.value !== '' && val > grandTotal) {
                        setPaidAmount(String(grandTotal));
                      } else {
                        setPaidAmount(e.target.value);
                      }
                    }}
                  />
                )}
              </div>
              {Number(paidAmount || 0) > grandTotal && (
                <div className="purchase-summary-row" style={{ color: 'var(--danger, #e5484d)', fontSize: '0.8rem' }}>
                  <span>{t('common.paymentExceedsRemaining')}</span>
                </div>
              )}
              <div className="purchase-summary-divider" />
              <div className={`purchase-summary-row purchase-summary-row--due ${currentDue > 0 ? 'purchase-summary-row--due-warning' : ''}`}>
                <span className="purchase-summary-row__label purchase-summary-row__label--due">{t('purchasesPage.currentDue')}</span>
                <span className={`purchase-summary-row__value purchase-summary-row__value--due ${currentDue > 0 ? 'purchase-summary-row__value--danger' : 'purchase-summary-row__value--success'}`}>
                  {money(currentDue)}
                </span>
              </div>
              {includePreviousDue && previousDue > 0 && (
                <div className={`purchase-summary-row purchase-summary-row--due ${remainingPreviousDue > 0 ? 'purchase-summary-row--due-warning' : ''}`}>
                  <span className="purchase-summary-row__label purchase-summary-row__label--due">{t('purchasesPage.remainingPreviousDue')}</span>
                  <span className={`purchase-summary-row__value purchase-summary-row__value--due ${remainingPreviousDue > 0 ? 'purchase-summary-row__value--danger' : 'purchase-summary-row__value--success'}`}>
                    {money(remainingPreviousDue)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* ─── Payment Summary (Purchase Details / view mode only) ── */}
          {isViewMode && effectiveViewing && (
            <div className="purchase-payment-summary-card">
              <div className="purchase-payment-summary-card__title-row">
                <div className="purchase-payment-summary-card__title">{t('purchasesPage.paymentSummary')}</div>
                {returnableRows.length > 0 && (
                  <button type="button" className="btn-premium btn-premium-secondary" onClick={toggleReturnPanel}>
                    {returnPanelOpen ? <><BiChevronUp /> {t('common.close')}</> : <><BiUndo /> {t('purchasesPage.processReturn')}</>}
                  </button>
                )}
              </div>

              {/* ─── Inline Return Panel — no separate confirmation modal ── */}
              <div className={`purchase-return-panel-wrap ${returnPanelOpen ? 'is-expanded' : ''}`}>
                <div className="purchase-return-panel-wrap__inner">
                  <div className="purchase-return-panel">
                    <div className="purchase-return-panel__rows">
                      {rows.filter((r) => r.product).map((row) => {
                        const purchasedQty = Number(row.quantity || 0);
                        const alreadyReturnedQty = Number(row.returnedQty || 0);
                        const availableQty = purchasedQty - alreadyReturnedQty;
                        const qtyValue = returnQuantities[row.product._id] || '';
                        const returnAmount = previewReturnAmount(row, Number(qtyValue) || 0);
                        return (
                          <div
                            key={row.key}
                            className={`purchase-return-panel__row ${availableQty <= 0 ? 'purchase-return-panel__row--done' : ''}`}
                          >
                            <div className="purchase-return-panel__row-name">
                              {row.product?.name || t('purchasesPage.unknownProduct')}
                              {availableQty <= 0 && (
                                <span className="purchase-return-panel__badge">{t('purchasesPage.fullyReturned')}</span>
                              )}
                            </div>
                            <div className="purchase-return-panel__row-stats">
                              <div className="purchase-return-panel__stat">
                                <span className="purchase-return-panel__stat-label">{t('purchasesPage.purchasedQty')}</span>
                                <span className="purchase-return-panel__stat-value">{purchasedQty}</span>
                              </div>
                              <div className="purchase-return-panel__stat">
                                <span className="purchase-return-panel__stat-label">{t('purchasesPage.alreadyReturnedQty')}</span>
                                <span className="purchase-return-panel__stat-value">{alreadyReturnedQty}</span>
                              </div>
                              <div className="purchase-return-panel__stat">
                                <span className="purchase-return-panel__stat-label">{t('purchasesPage.availableToReturn')}</span>
                                <span className="purchase-return-panel__stat-value">{availableQty}</span>
                              </div>
                              <div className="purchase-return-panel__stat">
                                <span className="purchase-return-panel__stat-label">{t('purchasesPage.returnQty')}</span>
                                <input
                                  type="number"
                                  min="0"
                                  max={availableQty}
                                  className="purchase-return-panel__qty-input"
                                  placeholder="0"
                                  value={qtyValue}
                                  disabled={availableQty <= 0 || submittingReturn}
                                  onChange={(e) => handleReturnQtyChange(row.product._id, e.target.value, availableQty)}
                                />
                              </div>
                              <div className="purchase-return-panel__stat">
                                <span className="purchase-return-panel__stat-label">{t('purchasesPage.returnAmount')}</span>
                                <span className="purchase-return-panel__stat-value purchase-return-panel__stat-value--danger">
                                  {returnAmount > 0 ? `-${money(returnAmount)}` : money(0)}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="form-group mt-3 mb-0">
                      <label className="form-label">{t('purchasesPage.returnReason')}</label>
                      <textarea
                        className="form-control"
                        rows={2}
                        value={returnReason}
                        onChange={(e) => setReturnReason(e.target.value)}
                        placeholder={t('purchasesPage.returnReasonPlaceholder')}
                        disabled={submittingReturn}
                      />
                    </div>

                    <div className="purchase-return-panel__footer">
                      <div className="purchase-return-panel__total">
                        <span>{t('purchasesPage.totalRefund')}</span>
                        <span className="purchase-return-panel__total-value">{money(totalReturnPreview)}</span>
                      </div>
                      <div className="purchase-return-panel__actions">
                        <button
                          type="button"
                          className="btn-premium btn-premium-secondary"
                          onClick={toggleReturnPanel}
                          disabled={submittingReturn}
                        >
                          {t('common.cancel')}
                        </button>
                        <button
                          type="button"
                          className="btn-premium btn-premium-primary"
                          onClick={handleSubmitReturn}
                          disabled={submittingReturn || !hasValidReturnQty}
                        >
                          {submittingReturn ? (
                            <><span className="spinner-border spinner-border-sm" /> {t('common.saving')}</>
                          ) : (
                            <><BiUndo /> {t('purchasesPage.submitReturn')}</>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="purchase-summary-row">
                <span className="purchase-summary-row__label">{t('common.total')}</span>
                <span className="purchase-summary-row__value">{money(effectiveViewing.totalAmount)}</span>
              </div>
              <div className="purchase-summary-row">
                <span className="purchase-summary-row__label">{t('purchasesPage.previousDueIncludedLabel')}</span>
                <span className="purchase-summary-row__value">{effectiveViewing.previousDueIncluded ? t('common.yes') : t('common.no')}</span>
              </div>
              <div className="purchase-summary-row">
                <span className="purchase-summary-row__label">{t('purchasesPage.previousDue')}</span>
                <span className="purchase-summary-row__value">{money(effectiveViewing.previousDueAmountAtCreation)}</span>
              </div>
              <div className="purchase-summary-row">
                <span className="purchase-summary-row__label">{t('purchasesPage.paymentReceived')}</span>
                <span className="purchase-summary-row__value purchase-summary-row__value--success">{money(effectiveViewing.paidAmount)}</span>
              </div>
              <div className="purchase-summary-row">
                <span className="purchase-summary-row__label">{t('purchasesPage.currentDue')}</span>
                <span className="purchase-summary-row__value" style={{ color: effectiveViewing.dueAmount > 0 ? 'var(--danger)' : undefined }}>
                  {money(effectiveViewing.dueAmount)}
                </span>
              </div>
              {effectiveViewing.previousDueIncluded && effectiveViewing.previousDueAllocations?.length > 0 && (
                <div className="purchase-payment-summary-card__allocations">
                  <div className="purchase-payment-summary-card__allocations-title">{t('purchasesPage.allocationBreakdown')}</div>
                  {effectiveViewing.previousDueAllocations.map((a, i) => (
                    <div key={i} className="purchase-payment-summary-card__allocation-row">
                      <span>{a.purchaseNo}</span>
                      <span>{money(a.amountApplied)}</span>
                    </div>
                  ))}
                </div>
              )}
              {effectiveViewing.returns?.length > 0 && (
                <div className="purchase-payment-summary-card__allocations">
                  <div className="purchase-payment-summary-card__allocations-title">{t('purchasesPage.returnHistory')}</div>
                  {effectiveViewing.returns.map((ret, i) => (
                    <div key={i} className="purchase-return-history-entry">
                      <div className="purchase-payment-summary-card__allocation-row">
                        <span>{new Date(ret.returnDate).toLocaleDateString()}</span>
                        <span className="purchase-summary-row__value--danger">-{money(ret.totalReturnValue)}</span>
                      </div>
                      {ret.items.map((it, j) => (
                        <div key={j} className="purchase-return-history-entry__item">
                          {it.productName} × {it.quantity}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

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
      </div>

      {/* Nested Add Product drawer, for "+ Create New Product" from the search field */}
      <ProductDrawer
        open={productDrawer.open}
        onClose={() => setProductDrawer({ open: false, rowKey: null, initialName: '' })}
        onSuccess={handleProductCreated}
        editing={null}
        categories={categories}
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

// ─── Skeleton Loading ────────────────────────────────────────────────────────
const PurchasesSkeletonLoader = () => (
  <div>
    <style>{`@keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }`}</style>
    {/* Page Header */}
    <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
      <div style={{ flex: 1 }}>
        <div style={{
          height: 28, width: '25%', marginBottom: 8,
          background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
          backgroundSize: '200% 100%', borderRadius: 8,
          animation: 'shimmer 1.5s infinite',
        }} />
        <div style={{
          height: 14, width: '18%',
          background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
          backgroundSize: '200% 100%', borderRadius: 6,
          animation: 'shimmer 1.5s infinite',
        }} />
      </div>
      <div style={{
        height: 36, width: 160,
        background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
        backgroundSize: '200% 100%', borderRadius: 8,
        animation: 'shimmer 1.5s infinite',
      }} />
    </div>

    {/* Filter Bar */}
    <div style={{ marginBottom: '1rem' }}>
      <div style={{
        height: 36, width: 280,
        background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
        backgroundSize: '200% 100%', borderRadius: 8,
        animation: 'shimmer 1.5s infinite',
      }} />
    </div>

    {/* Table skeleton */}
    <div className="table-container desktop-table" style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-lg)', overflow: 'hidden', background: 'var(--bg-card)' }}>
      {/* Table header */}
      <div style={{ display: 'flex', padding: '0.85rem 1rem', background: 'var(--bg-input)', borderBottom: '1px solid var(--border-color)', gap: '1rem' }}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
          <div key={i} style={{
            flex: 1, height: 12,
            background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
            backgroundSize: '200% 100%', borderRadius: 4,
            animation: 'shimmer 1.5s infinite',
          }} />
        ))}
      </div>
      {/* Table rows */}
      {[1, 2, 3, 4, 5].map((r) => (
        <div key={r} style={{
          display: 'flex', padding: '0.75rem 1rem', gap: '1rem',
          borderTop: '1px solid var(--border-color)',
        }}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((c) => (
            <div key={c} style={{
              flex: 1, height: 10,
              background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
              backgroundSize: '200% 100%', borderRadius: 4,
              animation: 'shimmer 1.5s infinite',
            }} />
          ))}
        </div>
      ))}
    </div>
  </div>
);

// ─── Table Inline Skeleton (for filter/search refreshes) ─────────────────────
const TableSkeletonRows = () => (
  <>
    {[1, 2, 3, 4, 5].map((r) => (
      <tr key={r} style={{ opacity: 0.5 }}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((c) => (
          <td key={c} style={{ padding: '0.75rem 1rem' }}>
            <div style={{
              height: 10, width: c === 1 ? 24 : c === 3 ? '50%' : c === 4 ? '55%' : c === 9 ? '60%' : '40%',
              background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
              backgroundSize: '200% 100%', borderRadius: 4,
              animation: 'shimmer 1.5s infinite',
            }} />
          </td>
        ))}
      </tr>
    ))}
  </>
);

// ─── Payment method config (icons & colors matching POS / Customer payment) ─
const supplierPaymentMethodConfig = (t) => [
  { key: 'cash', icon: '💵', label: t('sale.cash'), color: '#2ecc71' },
  { key: 'card', icon: '💳', label: t('sale.card'), color: '#6C63FF' },
  { key: 'upi', icon: '📱', label: t('sale.upi'), color: '#00D9A6' },
  { key: 'mobile_banking', icon: '🏦', label: t('sale.mobileBanking'), color: '#FF6B9D' },
];

// ─── Supplier Payment Drawer ────────────────────────────────────────────
// Mirrors Customers.jsx's "Receive Payment" drawer exactly (same layout,
// same Exact-amount button, same card-style payment method picker) but pays
// DOWN a supplier's due via POST /suppliers/:id/payment, which FIFO-
// allocates the amount across their oldest unpaid purchases server-side.
const SupplierPaymentDrawer = ({ open, onClose, supplier, onSuccess, t }) => {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('cash');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const dueAmount = supplier?.dueAmount || 0;
  const methods = supplierPaymentMethodConfig(t);

  useEffect(() => {
    if (open) {
      setAmount('');
      setMethod('cash');
      setNote('');
      setError('');
    }
  }, [open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const val = parseFloat(amount);
    if (!val || val <= 0) { setError(t('suppliersPage.invalidAmount')); return; }
    if (val > dueAmount) { setError(t('suppliersPage.amountExceedsDue')); return; }
    setSaving(true);
    setError('');
    try {
      await api.post(`/suppliers/${supplier._id}/payment`, { amount: val, paymentMethod: method, notes: note });
      showToast.success(t('suppliersPage.paymentSuccess'));
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className={`drawer-overlay ${open ? 'open' : ''}`} onClick={onClose} />
      <div className={`drawer ${open ? 'open' : ''}`}>
        <div className="drawer-header">
          <h5 style={{ fontSize: '1rem', margin: 0 }}>{t('suppliersPage.makePayment')}</h5>
          <button className="btn-close-premium" onClick={onClose}><BiX /></button>
        </div>
        <div className="drawer-body" style={{ padding: '1rem' }}>
          {supplier && (
            <div style={{
              padding: '0.75rem 1rem',
              borderRadius: 'var(--border-radius-md)',
              background: 'rgba(108,99,255,0.06)',
              border: '1px solid rgba(108,99,255,0.12)',
              marginBottom: '1rem',
            }}>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{supplier.name}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{supplier.phone}</div>
              <div style={{ marginTop: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{t('suppliersPage.currentDue')}:</span>
                <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--danger)' }}>{money(dueAmount)}</span>
              </div>
            </div>
          )}
          {error && (
            <div style={{
              padding: '0.5rem 0.75rem', borderRadius: 'var(--border-radius-sm)',
              background: 'var(--glow-danger)', color: 'var(--danger)',
              fontWeight: 500, marginBottom: '0.6rem', fontSize: '0.78rem',
            }}>{error}</div>
          )}
          <form id="supplier-payment-form" onSubmit={handleSubmit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {/* Payment Amount with Exact button */}
              <div>
                <label className="form-label" style={{ fontSize: '0.72rem', marginBottom: '0.2rem' }}>
                  {t('suppliersPage.paymentAmount')} <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'stretch' }}>
                  <input
                    type="number" step="0.01" className="form-control"
                    value={amount} onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    style={{ padding: '0.45rem 0.75rem', fontSize: '0.82rem', minHeight: '40px', flex: 1 }}
                  />
                  {dueAmount > 0 && (
                    <button
                      type="button"
                      onClick={() => setAmount(String(dueAmount))}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: '4px',
                        padding: '0.45rem 0.85rem', fontSize: '0.78rem', fontWeight: 600,
                        borderRadius: 'var(--border-radius-md)',
                        border: '1.5px solid var(--primary)',
                        background: 'transparent',
                        color: 'var(--primary)',
                        cursor: 'pointer', whiteSpace: 'nowrap',
                        transition: 'all 0.15s ease',
                        fontFamily: 'var(--font-family)',
                        minHeight: '40px',
                      }}
                      onMouseEnter={(e) => { e.target.style.background = 'rgba(108,99,255,0.08)'; }}
                      onMouseLeave={(e) => { e.target.style.background = 'transparent'; }}
                    >
                      <BiCheck style={{ fontSize: '1rem' }} /> {t('posPage.payment.exact')}
                    </button>
                  )}
                </div>
              </div>

              {/* Card-style Payment Method selector (matching POS / Customer payment) */}
              <div>
                <label className="form-label" style={{ fontSize: '0.72rem', marginBottom: '0.4rem' }}>
                  {t('sale.paymentMethod')}
                </label>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
                  gap: '0.5rem',
                }}>
                  {methods.map((pm) => (
                    <button
                      key={pm.key}
                      type="button"
                      onClick={() => setMethod(pm.key)}
                      style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                        padding: '0.6rem 0.4rem',
                        borderRadius: 'var(--border-radius-md)',
                        border: `1.5px solid ${method === pm.key ? pm.color : 'var(--border-color)'}`,
                        background: method === pm.key ? `${pm.color}10` : 'var(--bg-card)',
                        color: method === pm.key ? pm.color : 'var(--text-secondary)',
                        cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600,
                        transition: 'all 0.15s ease',
                        fontFamily: 'var(--font-family)',
                        minHeight: '60px',
                        boxShadow: method === pm.key ? `0 2px 8px ${pm.color}30` : 'none',
                      }}
                    >
                      <span style={{ fontSize: '1.3rem', lineHeight: 1 }}>{pm.icon}</span>
                      <span>{pm.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '0.72rem', marginBottom: '0.2rem' }}>
                  {t('common.notes')} ({t('common.optional')})
                </label>
                <textarea
                  className="form-control"
                  value={note} onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  placeholder={t('suppliersPage.paymentNotePlaceholder')}
                  style={{ padding: '0.45rem 0.75rem', fontSize: '0.82rem', resize: 'vertical' }}
                />
              </div>
            </div>
          </form>
        </div>
        <div className="drawer-footer" style={{ padding: '0.7rem 1rem', gap: '0.5rem' }}>
          <button type="button" className="btn-premium btn-premium-secondary" onClick={onClose}
            style={{ padding: '0.5rem 1.25rem', fontSize: '0.82rem', flex: 1, justifyContent: 'center' }}>
            {t('common.cancel')}
          </button>
          <button type="submit" form="supplier-payment-form" onClick={handleSubmit}
            className="btn-premium btn-premium-primary" disabled={saving}
            style={{ padding: '0.5rem 1.25rem', fontSize: '0.82rem', flex: 1, justifyContent: 'center' }}>
            {saving ? <span className="spinner-border spinner-border-sm" /> : <BiCheck />} {t('suppliersPage.pay')}
          </button>
        </div>
      </div>
    </>
  );
};

// ─── Date helpers ─────────────────────────────────────────────
const toDateInputValue = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const DATE_PRESETS = [
  { key: 'today', labelKey: 'common.today' },
  { key: '7d', labelKey: 'common.last7Days' },
  { key: '30d', labelKey: 'common.last30Days' },
  { key: 'month', labelKey: 'common.thisMonth' },
  { key: 'custom', labelKey: 'common.customRange' },
];

const PAYMENT_STATUS_OPTIONS = (t) => [
  { key: '', label: t('common.all') },
  { key: 'paid', label: t('common.paid') },
  { key: 'partial', label: t('common.partial') },
  { key: 'unpaid', label: t('purchasesPage.unpaid') },
];

// ─── Main Purchases Page ───────────────────────────────────────────────────
// Fixed page size for the Purchases list — server-side pagination via ?page=&limit=.
const PURCHASES_PER_PAGE = 10;

const Purchases = () => {
  const { t } = useTranslation();
  const [purchases, setPurchases] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
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
  const [payingSupplier, setPayingSupplier] = useState(null);
  const [stats, setStats] = useState(null);
  const [suppliers, setSuppliers] = useState([]);
  const [supplierFilter, setSupplierFilter] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('');
  const [datePreset, setDatePreset] = useState('today');
  const [startDate, setStartDate] = useState(() => toDateInputValue(new Date()));
  const [endDate, setEndDate] = useState(() => toDateInputValue(new Date()));
  const isFirstLoad = useRef(true);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Any filter change invalidates the current page — always land back on page 1.
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, supplierFilter, paymentStatusFilter, startDate, endDate]);

  useEffect(() => {
    api.get('/suppliers?limit=10000', { _skipLoading: true }).then(({ data }) => {
      setSuppliers(Array.isArray(data) ? data : data.suppliers || []);
    }).catch(() => {});
  }, []);

  const applyDatePreset = (key) => {
    setDatePreset(key);
    if (key === 'custom') return;
    const now = new Date();
    let start = new Date(now);
    const end = new Date(now);
    if (key === '7d') {
      start.setDate(start.getDate() - 6);
    } else if (key === '30d') {
      start.setDate(start.getDate() - 29);
    } else if (key === 'month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
    }
    setStartDate(toDateInputValue(start));
    setEndDate(toDateInputValue(end));
  };

  const fetchPurchases = useCallback(async () => {
    if (isFirstLoad.current) {
      setInitialLoading(true);
    } else {
      setRefreshing(true);
    }
    setSearching(true);
    try {
      const params = new URLSearchParams({
        page, limit: PURCHASES_PER_PAGE,
        startDate, endDate,
        ...(debouncedSearch ? { search: debouncedSearch } : {}),
        ...(supplierFilter ? { supplier: supplierFilter } : {}),
        ...(paymentStatusFilter ? { status: paymentStatusFilter } : {}),
      });
      const { data } = await api.get(`/purchases?${params.toString()}`, { _skipLoading: true });
      setPurchases(data.purchases || []);
      setTotalCount(data.total || 0);
      setStats(data.stats || null);
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
      setInitialLoading(false);
      setRefreshing(false);
      setSearching(false);
      if (isFirstLoad.current) isFirstLoad.current = false;
    }
  }, [debouncedSearch, page, startDate, endDate, supplierFilter, paymentStatusFilter]);

  useEffect(() => {
    fetchPurchases();
  }, [fetchPurchases]);

  const handleView = async (purchase) => {
    try {
      const { data } = await api.get(`/purchases/${purchase._id}`, { _skipLoading: true });
      setViewing(data);
      setDrawerOpen(true);
    } catch (err) {
      showToast.error(t('purchasesPage.loadDetailFailed'));
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/purchases/${id}`, { _skipLoading: true });
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
      throw err;
    }
  };

  const confirmDelete = async (purchase) => {
    const result = await Swal.fire({
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
    });
    if (!result.isConfirmed) return;
    try {
      await handleDelete(purchase._id);
      Swal.fire({
        title: t('purchasesPage.deletedTitle'),
        text: t('purchasesPage.purchaseDeletedText'),
        icon: 'success',
        timer: 1500,
        showConfirmButton: false,
        background: 'var(--bg-card)',
        color: 'var(--text-primary)',
      });
    } catch (err) {
      showToast.error(err.response?.data?.message || t('purchasesPage.deleteFailed'));
    }
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

  if (initialLoading) return <PurchasesSkeletonLoader />;

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
          <button className="btn-premium btn-premium-primary" onClick={() => { setViewing(null); setDrawerOpen(true); }}>
            <BiPlus /> {t('common.add')} <span className="purchase-btn-full-label">{t('purchasesPage.purchase')}</span>
          </button>
        </div>
      </div>

      {/* ─── Stat Cards ──────────────────────────────────────────────── */}
      <div className="row g-3 mb-4">
        <div className="col-6 col-md-3">
          <StatCard icon={BiDollar} label={t('purchasesPage.totalPurchases')} value={stats?.totalPurchases || 0} color="primary" rawValue={stats?.totalPurchases || 0} isCurrency={false} />
        </div>
        <div className="col-6 col-md-3">
          <StatCard icon={BiWallet} label={t('common.total')} value={stats?.totalAmount || 0} color="success" rawValue={stats?.totalAmount || 0} isCurrency={true} />
        </div>
        <div className="col-6 col-md-3">
          <StatCard icon={BiTrendingUp} label={t('common.paid')} value={stats?.totalPaid || 0} color="warning" rawValue={stats?.totalPaid || 0} isCurrency={true} />
        </div>
        <div className="col-6 col-md-3">
          <StatCard icon={BiCart} label={t('common.due')} value={stats?.totalDue || 0} color="danger" rawValue={stats?.totalDue || 0} isCurrency={true} />
        </div>
      </div>

      {/* ─── Filters ─────────────────────────────────────────────────── */}
      <div className="sales-filters-wrapper">
        <div className="sales-filters">
          <div className="sales-filter search-box">
            <BiSearch className="search-icon" />
            <input className="form-control sales-filter-input" placeholder={t('purchasesPage.searchPlaceholder')} value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>

          <div className="sales-date-filters-scroll">
            <div className="sales-date-segmented" role="tablist" aria-label="Date filter">
              {DATE_PRESETS.map((p, idx) => (
                <React.Fragment key={p.key}>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={datePreset === p.key}
                    className={`sales-date-pill ${datePreset === p.key ? 'active' : ''}`}
                    onClick={() => applyDatePreset(p.key)}
                  >
                    <BiCalendar />
                    <span>{t(p.labelKey)}</span>
                  </button>
                  {idx === 2 && <span className="sales-date-break" aria-hidden="true" />}
                </React.Fragment>
              ))}
            </div>
          </div>

          {datePreset === 'custom' && (
            <>
              <div className="sales-filter">
                <BiCalendar size={14} className="sales-filter-icon-abs" />
                <input type="date" className="form-control sales-filter-input" style={{ paddingLeft: '30px' }} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="sales-filter">
                <BiCalendar size={14} className="sales-filter-icon-abs" />
                <input type="date" className="form-control sales-filter-input" style={{ paddingLeft: '30px' }} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </>
          )}

          <div className="sales-filter">
            <select className="form-control sales-filter-input" value={supplierFilter} onChange={(e) => setSupplierFilter(e.target.value)}>
              <option value="">{t('purchasesPage.selectSupplier')}</option>
              {suppliers.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
          </div>

          <div className="sales-filter">
            <select className="form-control sales-filter-input" value={paymentStatusFilter} onChange={(e) => setPaymentStatusFilter(e.target.value)}>
              {PAYMENT_STATUS_OPTIONS(t).map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* ─── Desktop Table ─────────────────────────────────────────────── */}
      <div className={`sales-table-container table-container desktop-table ${searching || refreshing ? 'is-refreshing' : 'content-visible'}`} style={{ overflow: 'visible' }}>
        <div className="sales-table-scroll">
          <table className="sales-table">
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
                <th style={{ width: '110px' }}>{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {refreshing ? (
                <TableSkeletonRows />
              ) : searching ? (
                <tr><td colSpan={9}><div className="sales-empty-state"><div className="spinner-border spinner-border-sm me-2" /> {t('common.loading')}</div></td></tr>
              ) : purchases.length === 0 ? (
                <tr><td colSpan={9}><div className="sales-empty-state"><span className="sales-empty-icon">📄</span><p>{t('purchasesPage.noPurchasesFound')}</p></div></td></tr>
              ) : purchases.map((purchase, idx) => (
                <tr key={purchase._id} className={idx % 2 === 0 ? 'sales-row-even' : 'sales-row-odd'}>
                  <td style={{ color: 'var(--text-muted)', fontWeight: 600 }}>
                    {(page - 1) * PURCHASES_PER_PAGE + idx + 1}
                  </td>
                  <td><span className="sales-invoice-badge"><BiHash size={12} />{purchase.purchaseNo}</span></td>
                  <td>{purchase.supplierInvoiceNo || '-'}</td>
                  <td>
                    <div className="sales-customer-badge">
                      <BiUser size={14} />
                      <span>{purchase.supplier?.name || '-'}</span>
                    </div>
                  </td>
                  <td><span className="sales-amount">₹{Number(purchase.totalAmount || 0).toFixed(2)}</span></td>
                  <td><span className="sales-amount" style={{ color: 'var(--text-secondary)' }}>₹{Number(purchase.paidAmount || 0).toFixed(2)}</span></td>
                  <td>
                    <span className="sales-amount" style={purchase.dueAmount > 0 ? { color: 'var(--danger)', fontWeight: 700 } : { color: 'var(--text-secondary)' }}>
                      ₹{Number(purchase.dueAmount || 0).toFixed(2)}
                    </span>
                  </td>
                  <td>{getStatusBadge(purchase.paymentStatus)}</td>
                  <td className="sales-actions-cell" style={{ width: '120px', whiteSpace: 'nowrap' }}>
                    <button className="btn-action btn-action-view" data-tooltip={t('common.view')} title={t('common.view')} onClick={() => handleView(purchase)}>
                      <BiShow />
                    </button>
                    {purchase.supplier?.dueAmount > 0 && (
                      <button className="btn-action btn-action-payment" data-tooltip={t('suppliersPage.makePayment')} title={t('suppliersPage.makePayment')} onClick={() => setPayingSupplier(purchase.supplier)}>
                        <BiCreditCard />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── Mobile Cards ──────────────────────────────────────────────── */}
      <div className={`mobile-cards ${searching || refreshing ? 'is-refreshing' : ''}`}>
        {refreshing ? (
          <>
            {[1, 2, 3].map((i) => (
              <div key={i} className="expandable-card" style={{ padding: '1rem', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <div style={{
                    height: 14, width: '35%',
                    background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
                    backgroundSize: '200% 100%', borderRadius: 4,
                    animation: 'shimmer 1.5s infinite',
                  }} />
                  <div style={{
                    height: 14, width: '25%',
                    background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
                    backgroundSize: '200% 100%', borderRadius: 4,
                    animation: 'shimmer 1.5s infinite',
                  }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div style={{
                    height: 10, width: '40%',
                    background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
                    backgroundSize: '200% 100%', borderRadius: 4,
                    animation: 'shimmer 1.5s infinite',
                  }} />
                  <div style={{
                    height: 10, width: '20%',
                    background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
                    backgroundSize: '200% 100%', borderRadius: 4,
                    animation: 'shimmer 1.5s infinite',
                  }} />
                </div>
              </div>
            ))}
          </>
        ) : searching ? (
          <div className="text-center py-4" style={{ color: 'var(--text-muted)' }}>
            <div className="spinner-border spinner-border-sm me-2" /> {t('common.loading')}
          </div>
        ) : purchases.length === 0 ? (
          <div className="text-center py-5" style={{ color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem', opacity: 0.35 }}>📄</div>
            <h5 style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{t('purchasesPage.noPurchasesFound')}</h5>
          </div>
        ) : purchases.map((purchase) => (
          <ExpandableCard
            key={purchase._id}
            compact={
              <>
                <div className="expandable-card__compact-row">
                  <span className="expandable-card__name"><BiHash size={12} style={{ marginRight: 2 }} /> {purchase.purchaseNo}</span>
                  <span className="expandable-card__price">{money(purchase.totalAmount)}</span>
                </div>
                <div className="expandable-card__meta">
                  <span className="expandable-card__meta-item">
                    <BiUser />
                    <span>{purchase.supplier?.name || t('common.unknown')}</span>
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
                {purchase.supplier?.dueAmount > 0 && (
                  <button className="btn-action btn-action-payment" data-tooltip={t('suppliersPage.makePayment')} onClick={() => setPayingSupplier(purchase.supplier)}>
                    <BiCreditCard />
                  </button>
                )}
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

      {/* Supplier Payment Drawer */}
      <SupplierPaymentDrawer
        open={!!payingSupplier}
        supplier={payingSupplier}
        onClose={() => setPayingSupplier(null)}
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