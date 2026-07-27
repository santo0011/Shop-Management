import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import { showToast } from '../../utils/toast';
import {
  BiSearch, BiPlus, BiMinus, BiTrash, BiPrinter, BiUser, BiCart,
  BiX, BiDownload, BiReceipt, BiPackage,
  BiCheck, BiRefresh, BiTrendingUp, BiHistory, BiBarcode,
  BiStar, BiCreditCard, BiMoney, BiMobile, BiBookmark,
  BiDollar, BiShoppingBag, BiTag, BiCrown, BiCheckCircle,
  BiErrorCircle, BiWallet, BiFile, BiGridSmall, BiLayout,
  BiStore, BiQr, BiIdCard, BiUserCircle,
  BiNote, BiEdit
} from 'react-icons/bi';
import PrintPreview from '../../components/common/PrintPreview';
import useBusinessConfig from '../../hooks/useBusinessConfig';
import { getCompatibleUnitKeys, convertToBaseUnit } from '../../config/unitConversions';

const INDIAN_STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat',
  'Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh',
  'Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab',
  'Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh',
  'Uttarakhand','West Bengal','Andaman and Nicobar Islands','Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu','Delhi','Jammu and Kashmir',
  'Ladakh','Lakshadweep','Puducherry',
];

const formatAddress = (addr) => {
  if (!addr) return '';
  if (typeof addr === 'string') return addr;
  if (typeof addr === 'object') return Object.values(addr).filter(Boolean).join(', ');
  return String(addr);
};

const formatDate = (dateStr) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true
  });
};

const getLastPayment = () => {
  try { return localStorage.getItem('pos_last_payment') || 'cash'; } catch { return 'cash'; }
};

const formatShortDate = (dateStr) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const PROGRESS_STEPS = [
  { key: 'preparing', icon: '📦' },
  { key: 'saving', icon: '💾' },
  { key: 'generating', icon: '📄' },
];

const PremiumGeneratingOverlay = ({ t, progressStep, isFadingOut, lastSale }) => {
  const isSuccess = progressStep >= PROGRESS_STEPS.length - 1;
  return (
    <div className={`pos-premium-overlay ${isFadingOut ? 'pos-premium-fade-out' : ''}`}>
      <svg width="0" height="0" style={{position:'absolute'}}>
        <defs>
          <linearGradient id="posGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--primary)" />
            <stop offset="100%" stopColor="var(--secondary)" />
          </linearGradient>
        </defs>
      </svg>
      <div className="pos-premium-modal">
        {!isSuccess ? (
          <>
            <div className="pos-premium-spinner-ring">
              <svg viewBox="0 0 60 60" className="pos-premium-svg">
                <circle cx="30" cy="30" r="26" fill="none" strokeWidth="3" className="pos-premium-track" />
                <circle cx="30" cy="30" r="26" fill="none" strokeWidth="3" className="pos-premium-arc" />
              </svg>
              <div className="pos-premium-spinner-icon"><BiReceipt size={22} /></div>
            </div>
            <h4 className="pos-premium-title">{t('posPage.generating.title')}</h4>
            <p className="pos-premium-subtitle">{t('posPage.generating.subtitle')}</p>
            <div className="pos-premium-steps">
              {PROGRESS_STEPS.map((step, idx) => {
                const isActive = idx <= progressStep;
                const isCurrent = idx === progressStep;
                return (
                  <div key={step.key} className={`pos-premium-step ${isActive ? 'active' : ''} ${isCurrent ? 'current' : ''}`}>
                    <div className="pos-premium-step-dot">
                      {isCurrent ? <span className="pos-premium-step-spinner-sm" /> : isActive ? <BiCheck size={14} /> : <span className="pos-premium-step-dot-empty" />}
                    </div>
                    <span className="pos-premium-step-label">{t(`posPage.confirmSale.${step.key}Sale`)}</span>
                    {idx < PROGRESS_STEPS.length - 1 && <div className={`pos-premium-step-line ${isActive ? 'active' : ''}`} />}
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <>
            <div className="pos-premium-success-icon">
              <div className="pos-premium-success-glow" />
              <svg viewBox="0 0 60 60">
                <circle cx="30" cy="30" r="26" className="pos-premium-success-circle" />
                <polyline points="20,30 27,37 40,23" className="pos-premium-check" />
              </svg>
            </div>
            <h4 className="pos-premium-success-title">{t('posPage.generating.successTitle') || 'Sale Completed Successfully'}</h4>
            <p className="pos-premium-success-subtitle">{t('posPage.generating.successSubtitle') || 'Invoice has been generated'}</p>
            {lastSale?.invoiceNo && (
              <div className="pos-premium-invoice-badge">
                <BiReceipt size={14} />
                <span>{t('posPage.generating.invoiceNo') || 'Invoice'}: #{lastSale.invoiceNo}</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

const ConfirmSaleModal = ({ data, onConfirm, onCancel, loading }) => {
  const { t } = useTranslation();
  const [selectedPayment, setSelectedPayment] = useState(data.paymentMethod || 'cash');
  const formatDateTime = () => { const now = new Date(); return now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }); };
  const paymentMethods = [
    { key: 'cash', icon: <BiMoney size={12} />, label: t('sale.cash'), color: '#2ecc71' },
    { key: 'card', icon: <BiCreditCard size={12} />, label: t('sale.card'), color: '#6C63FF' },
    { key: 'upi', icon: <BiMobile size={12} />, label: t('sale.upi'), color: '#00D9A6' },
    { key: 'mobile_banking', icon: <BiBookmark size={12} />, label: t('sale.mobileBanking'), color: '#FF6B9D' },
  ];
  const isIntra = data.isIntrastate;
  return (
    <div className="confirm-sale-overlay" onClick={onCancel}>
      <div className="confirm-sale-modal" onClick={(e) => e.stopPropagation()} style={{maxWidth:'420px'}}>
        <div className="confirm-sale-header" style={{padding:'14px 18px'}}>
          <div className="confirm-sale-header-left"><div className="confirm-sale-header-icon" style={{width:36,height:36}}><BiReceipt size={18} /></div><div><h3 className="confirm-sale-title" style={{fontSize:'0.95rem'}}>{t('posPage.confirmSale.title')}</h3><span className="confirm-sale-datetime" style={{fontSize:'0.68rem'}}>{formatDateTime()}</span></div></div>
          <button className="confirm-sale-close" onClick={onCancel}><BiX size={18} /></button>
        </div>
        <div className="confirm-sale-body" style={{padding:'8px 18px 12px'}}>
          <div style={{display:'flex',flexDirection:'column',gap:'6px',marginBottom:'10px'}}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:'5px'}}>
              {[
                { label: 'Items', value: `₹${Number(data.subtotal||0).toFixed(2)}`, sub: data.totalItems, color: '#6C63FF' },
                { label: 'GST', value: `₹${Number(data.gstAmount||0).toFixed(2)}`, sub: `${data.gstRate||0}%`, color: '#6C63FF' },
                { label: 'Discount', value: `-₹${Number(data.discount||0).toFixed(2)}`, sub: '0%', color: Number(data.discount)>0?'#FF6B6B':'#9a9ab0' },
                { label: 'Payable', value: `₹${Number(data.payableAmount||0).toFixed(2)}`, sub: 'Total', color: '#6C63FF' },
              ].map((c,i) => (
                <div key={i} style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'8px 4px',borderRadius:'8px',background:'var(--bg-input)',border:'1px solid var(--border-color)'}}>
                  <span style={{fontSize:'0.58rem',fontWeight:600,color:'var(--text-muted)',textTransform:'uppercase',marginBottom:'2px'}}>{c.label}</span>
                  <span style={{fontSize:'0.78rem',fontWeight:700,color:c.color}}>{c.value}</span>
                  <span style={{fontSize:'0.5rem',color:'var(--text-muted)'}}>{c.sub}</span>
                </div>
              ))}
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'5px'}}>
              {[
                { label: 'CGST', value: `₹${Number(data.cgst||0).toFixed(2)}`, color: isIntra ? '#17A2B8' : 'var(--text-muted)' },
                { label: 'SGST', value: `₹${Number(data.sgst||0).toFixed(2)}`, color: isIntra ? '#17A2B8' : 'var(--text-muted)' },
                { label: 'IGST', value: `₹${Number(data.igst||0).toFixed(2)}`, color: !isIntra ? '#6C63FF' : 'var(--text-muted)' },
              ].map((c,i) => (
                <div key={i} style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'5px 4px',borderRadius:'6px',background:'var(--bg-input)',border:'1px solid var(--border-color)'}}>
                  <span style={{fontSize:'0.55rem',fontWeight:600,color:'var(--text-muted)',textTransform:'uppercase',marginBottom:'1px'}}>{c.label}</span>
                  <span style={{fontSize:'0.72rem',fontWeight:700,color:c.color}}>{c.value}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{borderTop:'1px solid var(--border-color)',paddingTop:'8px',marginBottom:'10px'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'4px 8px',borderRadius:'8px',background:'rgba(108,99,255,0.06)',border:'1px solid rgba(108,99,255,0.15)',marginBottom:'6px'}}>
              <span style={{fontSize:'0.75rem',fontWeight:600,color:'var(--text-secondary)'}}>{t('posPage.totals.grandTotal')}</span>
              <span style={{fontSize:'0.85rem',fontWeight:800,color:'#6C63FF'}}>₹{Number(data.payableAmount||0).toFixed(2)}</span>
            </div>
          </div>
          {data.dueAmount > 0 && (
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'6px 10px',borderRadius:'8px',background:'rgba(255,107,107,0.08)',border:'1px solid rgba(255,107,107,0.2)',marginBottom:'8px'}}>
              <span style={{fontSize:'0.75rem',fontWeight:600,color:'var(--danger)'}}>Due Amount</span>
              <span style={{fontSize:'0.85rem',fontWeight:800,color:'var(--danger)'}}>₹{Number(data.dueAmount||0).toFixed(2)}</span>
            </div>
          )}
          {data.includePreviousDue && data.previousDueAmount > 0 && (
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'6px 10px',borderRadius:'8px',background:'rgba(243,156,18,0.08)',border:'1px solid rgba(243,156,18,0.2)',marginBottom:'8px'}}>
              <span style={{fontSize:'0.72rem',fontWeight:600,color:'#F39C12'}}>Total Payable (with Prev Due)</span>
              <span style={{fontSize:'0.82rem',fontWeight:800,color:'#F39C12'}}>₹{Number(data.totalPayable||0).toFixed(2)}</span>
            </div>
          )}
          <button className="confirm-sale-btn confirm-sale-btn-primary" onClick={() => onConfirm(data.paymentMethod)} disabled={loading} style={{width:'100%',padding:'10px 16px'}}>
            {loading ? <span className="confirm-sale-btn-loading"><span className="spinner-border spinner-border-sm" style={{marginRight:6}} />{t('posPage.confirmSale.generating')}</span>
            : <><BiPrinter size={16} /><span>{t('posPage.confirmSale.generateAndPrint')}</span></>}
          </button>
        </div>
      </div>
    </div>
  );
};

const CustomQuantityModal = ({ product, initial, reservedBaseQty, onConfirm, onCancel }) => {
  const { t } = useTranslation();
  const { units } = useBusinessConfig();
  const unitLabel = (key) => units.find((u) => u.value === key)?.label || key;
  const compatibleUnits = getCompatibleUnitKeys(product.unit);
  const [qty, setQty] = useState(initial?.enteredQuantity ?? '');
  const [unit, setUnit] = useState(initial?.enteredUnit ?? product.unit);
  const [extraCharge, setExtraCharge] = useState(initial?.extraCharge || '');
  const enteredQty = Number(qty) || 0;
  const baseQty = convertToBaseUnit(enteredQty, unit, product.unit);
  const autoPrice = baseQty * (product.sellingPrice || 0);
  const extra = Number(extraCharge) || 0;
  const finalPrice = autoPrice + extra;
  const availableForThis = Math.max(0, (product.stock || 0) - reservedBaseQty);
  const invalidQty = !(enteredQty > 0);
  const exceedsStock = !invalidQty && baseQty > availableForThis;
  const handleConfirm = () => {
    if (invalidQty) { showToast.error(t('posPage.customQty.invalidQuantity')); return; }
    if (exceedsStock) { showToast.error(t('posPage.customQty.exceedsStock', { available: availableForThis, unit: unitLabel(product.unit) })); return; }
    onConfirm({ quantity: baseQty, unit: product.unit, price: product.sellingPrice, enteredQuantity: enteredQty, enteredUnit: unit, extraCharge: extra, total: finalPrice });
  };
  return (
    <div className="confirm-sale-overlay" onClick={onCancel}>
      <div className="confirm-sale-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px' }}>
        <div className="confirm-sale-header">
          <div className="confirm-sale-header-left"><div className="confirm-sale-header-icon"><BiPackage size={22} /></div><div><h3 className="confirm-sale-title">{product.name}</h3><span className="confirm-sale-datetime">{t('posPage.customQty.title')}</span></div></div>
          <button className="confirm-sale-close" onClick={onCancel}><BiX size={22} /></button>
        </div>
        <div className="confirm-sale-body">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '0.25rem 0 1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-secondary)' }}><span>{t('posPage.customQty.baseUnitPrice')}</span><strong>₹{product.sellingPrice} / {unitLabel(product.unit)}</strong></div>
            <div><label className="pos-payment-label">{t('posPage.customQty.quantityLabel')}</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input type="number" min="0" step="any" autoFocus className="form-control" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="0" style={{ flex: 1 }} />
                <select className="form-select" value={unit} onChange={(e) => setUnit(e.target.value)} style={{ flex: 1 }}>{compatibleUnits.map((u) => <option key={u} value={u}>{unitLabel(u)}</option>)}</select>
              </div>
              {exceedsStock && <div className="pos-paid-error"><BiErrorCircle size={14} /><span>{t('posPage.customQty.exceedsStock', { available: availableForThis, unit: unitLabel(product.unit) })}</span></div>}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}><span>{t('posPage.customQty.autoPrice')}</span><strong>₹{autoPrice.toFixed(2)}</strong></div>
            <div><label className="pos-payment-label">{t('posPage.customQty.extraCharge')}</label><input type="number" min="0" step="any" className="form-control" value={extraCharge} onChange={(e) => setExtraCharge(e.target.value)} placeholder="0" /></div>
            <div className="pos-grand-total" style={{ marginTop: '0.25rem' }}><span>{t('posPage.customQty.finalPrice')}</span><span className="pos-grand-total-amount">₹{finalPrice.toFixed(2)}</span></div>
          </div>
          <div className="confirm-sale-actions"><button className="confirm-sale-btn confirm-sale-btn-primary" onClick={handleConfirm} disabled={invalidQty || exceedsStock}><BiCheck size={18} /><span>{t('posPage.customQty.addToCart')}</span></button></div>
        </div>
      </div>
    </div>
  );
};

const POSSkeletonLoader = () => (
  <div className="pos-modern">
    <style>{`@keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }`}</style>
    <div className="pos-products-panel">
      <div className="pos-search-section"><div className="pos-search-wrapper"><div style={{ width: '100%', height: 42, borderRadius: 'var(--border-radius-lg)', background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} /></div></div>
      <div className="pos-category-filter" style={{ marginBottom: '0.75rem' }}><div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>{[1, 2, 3, 4, 5].map((i) => (<div key={i} style={{ height: 32, width: `${60 + i * 10}px`, borderRadius: 20, background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />))}</div></div>
      <div className="pos-product-grid">{[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (<div key={i} style={{ borderRadius: 'var(--border-radius-lg)', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', overflow: 'hidden' }}><div style={{ height: 80, background: 'var(--bg-input)' }} /><div style={{ padding: '0.5rem' }}><div style={{ height: 12, width: '80%', marginBottom: 6, background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)', backgroundSize: '200% 100%', borderRadius: 4, animation: 'shimmer 1.5s infinite' }} /><div style={{ height: 10, width: '50%', background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)', backgroundSize: '200% 100%', borderRadius: 4, animation: 'shimmer 1.5s infinite' }} /></div></div>))}</div>
    </div>
    <div className="pos-cart-panel" style={{ padding: '1rem' }}>
      <div style={{ marginBottom: '1rem' }}><div style={{ height: 42, width: '100%', borderRadius: 'var(--border-radius-md)', background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} /></div>
      {[1, 2, 3].map((i) => (<div key={i} style={{ height: 60, marginBottom: i < 3 ? '0.5rem' : 0, borderRadius: 'var(--border-radius-md)', background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />))}
      <div style={{ marginTop: '1rem' }}><div style={{ height: 36, marginBottom: '0.5rem', borderRadius: 'var(--border-radius-md)', background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} /><div style={{ height: 36, marginBottom: '0.5rem', borderRadius: 'var(--border-radius-md)', background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} /><div style={{ height: 48, borderRadius: 'var(--border-radius-md)', background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} /></div>
      <div style={{ marginTop: '0.75rem' }}><div style={{ height: 48, width: '100%', borderRadius: 'var(--border-radius-md)', background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} /></div>
    </div>
  </div>
);

// ─── Round-Off Discount Options ─────────────────────────────
const getRoundOffOptions = (grandTotal) => {
  const integer = Math.floor(grandTotal);
  const fractional = grandTotal - integer;

  // Always generate 4 round-off options (no "Exact" card)
  const intPayable = integer;
  let nearest5 = Math.floor(integer / 5) * 5;
  let nearest10 = Math.floor(integer / 10) * 10;
  let nearest100 = Math.floor(integer / 100) * 100;

  // Ensure strictly decreasing unique values
  if (nearest10 >= nearest5) nearest10 = nearest5 - 5;
  if (nearest100 >= nearest10) nearest100 = nearest10 - 5;

  // Build 4 options with labels
  const options = [
    { key: 'int', label: 'Round 1', payable: intPayable, discount: fractional },
    { key: '5', label: 'Round 2', payable: nearest5, discount: grandTotal - nearest5 },
    { key: '10', label: 'Round 3', payable: nearest10, discount: grandTotal - nearest10 },
    { key: '100', label: 'Round 4', payable: nearest100, discount: grandTotal - nearest100 },
  ];

  // Filter out options with zero or negative discount, but ensure we always have at least 1
  const valid = options.filter(o => o.discount > 0);
  return valid.length > 0 ? valid : [options[0]];
};

const POS = () => {
  const { t, i18n } = useTranslation();
  const isBn = i18n.language === 'bn';
  const { units: unitOptions } = useBusinessConfig();
  const unitLabel = useCallback((key) => unitOptions.find((u) => u.value === key)?.label || key, [unitOptions]);
  const [products, setProducts] = useState([]);
  const [topSelling, setTopSelling] = useState([]);
  const [categories, setCategories] = useState([]);
  const [categorySalesRank, setCategorySalesRank] = useState({});
  const [productSoldCounts, setProductSoldCounts] = useState({});
  const [selectedCategory, setSelectedCategory] = useState('');
  const [categoryProducts, setCategoryProducts] = useState([]);
  const categoryCache = useRef({});
  const [recentSales, setRecentSales] = useState([]);
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState('');
  const [searching, setSearching] = useState(false);
  const [customer, setCustomer] = useState('');
  const [customers, setCustomers] = useState([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false);
  const [selectedCustomerData, setSelectedCustomerData] = useState(null);
  const [previousDue, setPreviousDue] = useState(null);
  const [loadingPreviousDue, setLoadingPreviousDue] = useState(false);
  const [includePreviousDue, setIncludePreviousDue] = useState(false);
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [addCustomerForm, setAddCustomerForm] = useState({ name: '', phone: '', address: '', state: 'West Bengal' });
  const customerSearchRef = useRef(null);
  const customerDropdownRef = useRef(null);
  const [paymentMethod, setPaymentMethod] = useState(getLastPayment);
  const [paidAmount, setPaidAmount] = useState('');
  const [showInvoice, setShowInvoice] = useState(false);
  const [lastSale, setLastSale] = useState(null);
  const [shopInfo, setShopInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [showTopSelling, setShowTopSelling] = useState(true);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmData, setConfirmData] = useState(null);
  const [customQtyModal, setCustomQtyModal] = useState(null);
  const [discountMode, setDiscountMode] = useState('percent');
  const [discountValue, setDiscountValue] = useState('');
  const [customerNote, setCustomerNote] = useState('');
  const searchRef = useRef(null);
  const [progressStep, setProgressStep] = useState(0);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const progressTimerRef = useRef(null);
  const fadeTimerRef = useRef(null);
  // ─── Round-Off Discount State ──────────────────────────────
  const [selectedRoundOff, setSelectedRoundOff] = useState(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(e.target)) setCustomerDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setIncludePreviousDue(false);
    if (!customer || !(selectedCustomerData?.dueAmount > 0)) { setPreviousDue(null); return undefined; }
    let cancelled = false;
    setLoadingPreviousDue(true);
    api.get(`/customers/${customer}/due-summary`, { _skipLoading: true })
      .then(({ data }) => { if (!cancelled) setPreviousDue(data?.dueAmount > 0 ? data : null); })
      .catch(() => { if (!cancelled) setPreviousDue(null); })
      .finally(() => { if (!cancelled) setLoadingPreviousDue(false); });
    return () => { cancelled = true; };
  }, [customer, selectedCustomerData]);

  const handleAddCustomer = async () => {
    if (!addCustomerForm.name || !addCustomerForm.phone) { showToast.error(t('posPage.customer.nameRequired')); return; }
    try {
      const { data } = await api.post('/customers', addCustomerForm);
      setCustomers(prev => [...prev, data]);
      setCustomer(data._id);
      setSelectedCustomerData(data);
      setShowAddCustomer(false);
      setAddCustomerForm({ name: '', phone: '', address: '', state: '' });
      showToast.success(t('posPage.customer.addSuccess'));
    } catch (err) { showToast.error(err.response?.data?.message || t('posPage.customer.addFailed')); }
  };

  useEffect(() => { searchRef.current?.focus(); }, []);

  const [isMobileViewport, setIsMobileViewport] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 991.98px)').matches);
  useEffect(() => { const mql = window.matchMedia('(max-width: 991.98px)'); const handler = (e) => setIsMobileViewport(e.matches); mql.addEventListener('change', handler); return () => mql.removeEventListener('change', handler); }, []);

  const desktopProductLimit = Number(shopInfo?.settings?.posDisplayLimit?.desktop) || 20;
  const mobileProductLimit = Number(shopInfo?.settings?.posDisplayLimit?.mobile) || 10;
  const activeProductLimit = isMobileViewport ? mobileProductLimit : desktopProductLimit;

  useEffect(() => {
    (async () => {
      try {
        await Promise.all([
          loadRecentSales(), loadCategorySalesRank(), loadProductSoldCounts(),
          api.get('/customers?limit=50', { _skipLoading: true }).then(({ data }) => setCustomers(data.customers || [])),
          api.get('/shops/my', { _skipLoading: true }).then(({ data }) => setShopInfo(data.shop || data)),
          api.get('/categories', { _skipLoading: true }).then(({ data }) => setCategories(Array.isArray(data) ? data : data.categories || [])),
        ]);
      } catch (err) { console.error(err); } finally { setInitialLoad(false); }
    })();
  }, []);

  useEffect(() => { loadTopSelling(activeProductLimit); }, [activeProductLimit]);
  useEffect(() => { if (!search.trim()) { setShowTopSelling(true); setProducts([]); return; } setShowTopSelling(false); const timer = setTimeout(() => searchProducts(), 200); return () => clearTimeout(timer); }, [search, selectedCategory]);

  const lastCachedLimitRef = useRef(activeProductLimit);
  useEffect(() => { if (lastCachedLimitRef.current !== activeProductLimit) { categoryCache.current = {}; lastCachedLimitRef.current = activeProductLimit; } }, [activeProductLimit]);

  const fetchCategoryProducts = useCallback(async (categoryId, limit) => {
    try { const { data } = await api.get(`/sales/top-selling?limit=${limit}&category=${categoryId}`, { _skipLoading: true }); const list = Array.isArray(data) ? data : []; categoryCache.current[categoryId] = list; return list; } catch (err) { return null; }
  }, []);

  useEffect(() => {
    if (!showTopSelling || !selectedCategory) return undefined;
    if (categoryCache.current[selectedCategory]) return undefined;
    let cancelled = false;
    fetchCategoryProducts(selectedCategory, activeProductLimit).then((list) => { if (cancelled || list === null) return; setCategoryProducts(list); });
    return () => { cancelled = true; };
  }, [selectedCategory, showTopSelling, activeProductLimit, fetchCategoryProducts]);

  const isCategoryBrowsing = showTopSelling && !!selectedCategory;
  const cachedSelectedCategoryProducts = selectedCategory ? categoryCache.current[selectedCategory] : undefined;
  const effectiveCategoryProducts = cachedSelectedCategoryProducts || categoryProducts;
  const hasResolvedSelectedCategory = !!cachedSelectedCategoryProducts;

  const topSellingRequestRef = useRef(0);
  const loadTopSelling = async (limit = 20) => {
    const requestId = ++topSellingRequestRef.current;
    try { const { data } = await api.get(`/sales/top-selling?limit=${limit}`, { _skipLoading: true }); if (requestId !== topSellingRequestRef.current) return; setTopSelling(Array.isArray(data) ? data : []); } catch (err) { console.error(err); }
  };
  const loadRecentSales = async () => { try { const { data } = await api.get('/sales/recent?limit=5', { _skipLoading: true }); setRecentSales(data.sales || []); } catch (err) { console.error(err); } };
  const loadCategorySalesRank = async () => { try { const { data } = await api.get('/sales/top-categories', { _skipLoading: true }); const rank = {}; (Array.isArray(data) ? data : []).forEach((c) => { rank[c._id] = c.totalQuantity; }); setCategorySalesRank(rank); } catch (err) { console.error(err); } };
  const loadProductSoldCounts = async () => { try { const { data } = await api.get('/sales/product-sold-counts', { _skipLoading: true }); const counts = {}; (Array.isArray(data) ? data : []).forEach((p) => { counts[p._id] = p.totalSold; }); setProductSoldCounts(counts); } catch (err) { console.error(err); } };
  const searchProducts = async () => {
    setSearching(true);
    try { const categoryParam = selectedCategory ? `&category=${selectedCategory}` : ''; const { data } = await api.get(`/products/search?q=${search}${categoryParam}`, { _skipLoading: true }); setProducts(Array.isArray(data) ? data : data.products || []); } catch (err) { console.error(err); setProducts([]); } finally { setSearching(false); }
  };

  const addToCart = useCallback((product) => {
    if (product.stock <= 0) { showToast.warning(t('posPage.stockWarnings.outOfStock', { name: product.name })); return; }
    if (product.allowCustomQuantity) { setCustomQtyModal({ product, editingKey: null, initial: null }); return; }
    setCart(prev => {
      const existing = prev.find(item => item.key === product._id);
      if (existing) { if (existing.quantity >= product.stock) { showToast.warning(t('posPage.stockWarnings.onlyAvailable', { count: product.stock, unit: product.unit || t('product.piece') })); return prev; } return prev.map(item => item.key === product._id ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.price } : item); }
      return [...prev, { key: product._id, product, quantity: 1, price: product.sellingPrice, discount: product.discount || 0, total: product.sellingPrice }];
    });
  }, [t]);

  const updateQty = useCallback((key, delta) => {
    setCart(prev => prev.map(item => {
      if (item.key === key) { const newQty = Math.max(1, item.quantity + delta); if (newQty > item.product.stock) { showToast.warning(t('posPage.stockWarnings.onlyAvailable', { count: item.product.stock, unit: item.product.unit || t('product.piece') })); return item; } return { ...item, quantity: newQty, total: newQty * item.price }; }
      return item;
    }));
  }, [t]);

  const removeItem = useCallback((key) => { setCart(prev => prev.filter(item => item.key !== key)); }, []);
  const reservedBaseQtyForProduct = useCallback((productId, excludeKey) => (cart.reduce((sum, item) => (item.product._id === productId && item.key !== excludeKey ? sum + item.quantity : sum), 0)), [cart]);

  const handleConfirmCustomQty = useCallback((payload) => {
    setCart(prev => {
      if (customQtyModal?.editingKey) return prev.map(item => item.key === customQtyModal.editingKey ? { ...item, ...payload } : item);
      const key = `${customQtyModal.product._id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      return [...prev, { key, product: customQtyModal.product, discount: 0, isCustomQty: true, ...payload }];
    });
    setCustomQtyModal(null);
  }, [customQtyModal]);

  const resetCartFieldsForNextSale = () => { setCart([]); setPaidAmount(''); setCustomer(''); setSelectedCustomerData(null); setCustomerSearch(''); setDiscountValue(''); setDiscountMode('percent'); setCustomerNote(''); setPaymentMethod(getLastPayment()); setSelectedRoundOff(null); };
  const clearCart = () => { resetCartFieldsForNextSale(); setLastSale(null); };

  // ─── GST Calculation ─────────────────────────────────────────
  const gstRate = shopInfo?.settings?.defaultGstRate ?? 18;
  const businessState = shopInfo?.settings?.businessState || 'West Bengal';
  const customerState = selectedCustomerData?.state || '';
  // Walk-in customer (no customer selected) — always use Intra-State (CGST + SGST).
  // Only use Inter-State (IGST) when a registered customer from a different state
  // is explicitly selected.
  const hasSelectedCustomer = !!selectedCustomerData;
  const isIntrastate = !hasSelectedCustomer || (businessState && customerState && businessState.toLowerCase().trim() === customerState.toLowerCase().trim());
  const receiptFooter = shopInfo?.settings?.receiptFooter || t('posPage.receipt.defaultFooter');
  const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
  const itemDiscount = cart.reduce((sum, item) => sum + ((item.price * item.discount / 100) * item.quantity), 0);
  const extraDiscount = discountMode === 'percent' ? (subtotal - itemDiscount) * ((discountValue || 0) / 100) : (discountValue || 0);
  const manualDiscount = itemDiscount + extraDiscount;
  const taxableAmount = subtotal - manualDiscount;
  const gstAmount = taxableAmount > 0 ? Math.round(taxableAmount * (gstRate / 100) * 100) / 100 : 0;
  // Walk-in: always show CGST+SGST (isIntrastate=true), no IGST.
  // Registered customer: CGST+SGST if same state, IGST if different state.
  const cgst = isIntrastate ? gstAmount / 2 : 0;
  const sgst = isIntrastate ? gstAmount / 2 : 0;
  const igst = !isIntrastate ? gstAmount : 0;
  const preRoundOffTotal = subtotal + gstAmount - manualDiscount;

  // ─── Round-Off Discount ──────────────────────────────────────
  const roundOffOptions = getRoundOffOptions(preRoundOffTotal);
  // Only apply round-off discount when user explicitly selects a card
  const selectedRoundOffOption = selectedRoundOff !== null
    ? roundOffOptions.find(o => o.key === selectedRoundOff)
    : null;
  const roundOffDiscount = selectedRoundOffOption ? selectedRoundOffOption.discount : 0;
  const payableAmount = selectedRoundOffOption ? selectedRoundOffOption.payable : preRoundOffTotal;

  // ─── Combined Discount (Manual + Round-Off) ──────────────────
  const totalDiscount = manualDiscount + roundOffDiscount;
  const grandTotal = preRoundOffTotal - roundOffDiscount;

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  const hasPreviousDue = !!(previousDue && previousDue.dueAmount > 0);
  const previousDueAmount = hasPreviousDue ? previousDue.dueAmount : 0;
  const totalPayable = includePreviousDue && hasPreviousDue ? payableAmount + previousDueAmount : payableAmount;
  const rawPaid = Number(paidAmount || 0);
  const paidTowardPreviousDue = includePreviousDue && hasPreviousDue ? Math.min(rawPaid, previousDueAmount) : 0;
  const remainingAfterPrevDue = rawPaid - paidTowardPreviousDue;
  const paidTowardCurrentInvoice = Math.min(remainingAfterPrevDue, payableAmount);
  // Current invoice due — only the new sale's unpaid amount (never previous due)
  const currentInvoiceDue = Math.max(0, payableAmount - paidTowardCurrentInvoice);
  // Remaining previous due after any payment toward it
  const remainingPreviousDue = includePreviousDue && hasPreviousDue
    ? Math.max(0, previousDueAmount - paidTowardPreviousDue)
    : 0;
  // Total due customer must pay = current invoice due + any unpaid previous due
  const dueAmount = currentInvoiceDue + remainingPreviousDue;
  const change = Math.max(0, rawPaid - totalPayable);
  const confirmedPaidAmount = paidTowardCurrentInvoice;
  const confirmedPrevDuePayment = paidTowardPreviousDue;

  // The current bill's standalone due (without previous due) — used for
  // the saved Sale document's dueAmount so the invoice only reflects the
  // current sale's unpaid balance.
  const currentBillDueOnly = Math.max(0, payableAmount - paidTowardCurrentInvoice);

  useEffect(() => { try { localStorage.setItem('pos_last_payment', paymentMethod); } catch {} }, [paymentMethod]);

  const isPaidOverTotal = paidAmount !== '' && Number(paidAmount) > totalPayable;
  const hasValidCustomerInfo = !!(selectedCustomerData?.name && selectedCustomerData?.phone);
  const customerRequiredForDue = dueAmount > 0 && !hasValidCustomerInfo;

  const handleOpenConfirm = () => {
    if (cart.length === 0) return;
    if (isPaidOverTotal) return;
    if (customerRequiredForDue) { showToast.error(t('posPage.validation.customerRequiredForDue')); return; }
    setConfirmData({ totalItems, subtotal, discount: totalDiscount, grandTotal, roundOffDiscount, payableAmount, paidAmount, dueAmount, paymentMethod, gstAmount, cgst, sgst, igst, gstRate, isIntrastate, extraDiscount, customerNote, includePreviousDue, previousDueAmount, totalPayable });
    setShowConfirmModal(true);
  };

  const startProgressAnimation = () => { setProgressStep(0); setIsFadingOut(false); progressTimerRef.current = setTimeout(() => setProgressStep(1), 800); };
  const advanceProgressToStep2 = () => { setProgressStep(2); };

  const handleProcessSale = async (selectedPayment) => {
    if (cart.length === 0) return;
    if (customerRequiredForDue) { showToast.error(t('posPage.validation.customerRequiredForDue')); return; }
    setLoading(true);
    setShowConfirmModal(false);
    startProgressAnimation();
    try {
      const targetCustomerId = customer;
      // Use confirmData (the single source of truth shown in the modal)
      // rather than live state values, ensuring the saved Sale document
      // matches exactly what the user saw and confirmed.
      const cData = confirmData;
      const gstRate = cData.gstRate || 0;
      const isIntra = cData.isIntrastate;
      // Calculate per-item GST breakdown so the Sales Details drawer
      // displays correct per-item CGST/SGST/IGST/discount values.
      // First compute each item's base total and per-item discount
      const itemBaseTotals = cart.map(item => item.quantity * item.price);
      const cartSubtotal = itemBaseTotals.reduce((s, v) => s + v, 0);
      // Distribute the total discount (header extra + round-off) proportionally
      // across items so per-item discount reflects the full discount applied.
      const headerDiscountPortion = Math.max(0, cData.discount - cart.reduce((sum, item) => sum + ((item.price * (item.discount || 0) / 100) * item.quantity), 0));
      const itemsWithGst = cart.map((item, idx) => {
        const baseTotal = itemBaseTotals[idx];
        const itemDiscountPct = item.discount || 0;
        const itemPerUnitDiscountAmt = baseTotal * itemDiscountPct / 100;
        // Distribute header discount proportionally by item's share of subtotal
        const itemHeaderDiscountShare = cartSubtotal > 0 ? (baseTotal / cartSubtotal) * headerDiscountPortion : 0;
        const totalItemDiscount = itemPerUnitDiscountAmt + itemHeaderDiscountShare;
        const itemTaxable = Math.max(0, baseTotal - totalItemDiscount);
        const itemGstAmount = itemTaxable > 0 ? Math.round(itemTaxable * (gstRate / 100) * 100) / 100 : 0;
        const itemCgst = isIntra && itemGstAmount > 0 ? itemGstAmount / 2 : 0;
        const itemSgst = isIntra && itemGstAmount > 0 ? itemGstAmount / 2 : 0;
        const itemIgst = !isIntra && itemGstAmount > 0 ? itemGstAmount : 0;
        const itemTotal = itemTaxable + itemGstAmount;
        return {
          product: item.product._id,
          quantity: item.quantity,
          unit: item.product.unit,
          price: item.price,
          discount: itemDiscountPct,
          gstRate,
          taxableAmount: itemTaxable,
          gstAmount: itemGstAmount,
          cgst: itemCgst,
          sgst: itemSgst,
          igst: itemIgst,
          total: itemTotal,
          ...(item.isCustomQty ? {
            enteredQuantity: item.enteredQuantity,
            enteredUnit: item.enteredUnit,
            extraCharge: item.extraCharge || 0,
          } : {}),
        };
      });
      const payload = {
        customer: customer || null,
        items: itemsWithGst,
        subtotal: cData.subtotal,
        discount: cData.discount,
        gstRate,
        gstAmount: cData.gstAmount,
        cgst: cData.cgst,
        sgst: cData.sgst,
        igst: cData.igst,
        taxableAmount: cData.subtotal - (cData.discount - cData.roundOffDiscount),
        totalAmount: cData.payableAmount,
        paidAmount: confirmedPaidAmount,
        // dueAmount should reflect ONLY the current bill's unpaid balance,
        // never the previous due — that stays on the Customer record.
        dueAmount: currentBillDueOnly,
        // Send previous-due payment separately so the backend can allocate
        // it across older unpaid invoices in FIFO order.
        prevDuePayment: confirmedPrevDuePayment,
        roundOffDiscount: cData.roundOffDiscount,
        paymentMethod: selectedPayment,
        posType: 'pos',
        notes: customerNote,
      };
      const { data } = await api.post('/sales', payload, { _skipLoading: true });
      advanceProgressToStep2();
      const saleDetail = await api.get(`/sales/${data._id || data.sale}`, { _skipLoading: true });
      const saleData = saleDetail.data.sale || saleDetail.data;
      // Use stored database values for the invoice preview — never recalculate
      setLastSale({
        ...saleData,
        invoiceNo: data.invoiceNo || saleData.invoiceNo,
        totalAmount: saleData.totalAmount,
        subtotal: saleData.subtotal,
        discount: saleData.discount,
        gstAmount: saleData.gstAmount,
        cgst: saleData.cgst,
        sgst: saleData.sgst,
        igst: saleData.igst,
        paidAmount: saleData.paidAmount || confirmedPaidAmount,
        dueAmount: saleData.dueAmount,
        paymentMethod: selectedPayment,
        notes: customerNote,
      });
      // Previous-due payment is now handled by the backend's createSale
      // via the prevDuePayment field in the payload — it allocates the
      // amount across older unpaid invoices in FIFO order. No separate
      // API call needed, which would double-count the payment.
      setIsFadingOut(true);
      fadeTimerRef.current = setTimeout(() => {
        setLoading(false); setProgressStep(0); setIsFadingOut(false); setShowInvoice(true);
        resetCartFieldsForNextSale(); loadTopSelling(activeProductLimit); loadRecentSales(); loadCategorySalesRank(); loadProductSoldCounts();
        categoryCache.current = {};
        if (selectedCategory) fetchCategoryProducts(selectedCategory, activeProductLimit).then((list) => { if (list !== null) setCategoryProducts(list); });
        showToast.success(t('posPage.toast.invoiceGenerated', { invoiceNo: data.invoiceNo || '' }));
      }, 400);
    } catch (err) {
      if (progressTimerRef.current) clearTimeout(progressTimerRef.current);
      setLoading(false); setProgressStep(0); setIsFadingOut(false);
      showToast.error(err.response?.data?.message || t('posPage.toast.checkoutFailed'));
    }
  };

  useEffect(() => { return () => { if (progressTimerRef.current) clearTimeout(progressTimerRef.current); if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current); }; }, []);

  const handleReprint = () => { if (lastSale) setShowInvoice(true); else showToast.warning(t('posPage.totals.noPreviousInvoice')); };

  useEffect(() => {
    const handleKeyDown = (e) => { if (e.key === 'F1') { e.preventDefault(); searchRef.current?.focus(); } if (e.key === 'F2') { e.preventDefault(); if (cart.length > 0) clearCart(); } if (e.key === 'F8') { e.preventDefault(); if (cart.length > 0) handleOpenConfirm(); } if (e.key === 'Escape') { setSearch(''); setShowTopSelling(true); searchRef.current?.focus(); } };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart]);

  const isActualTopSelling = showTopSelling && !selectedCategory;
  const displayProducts = !showTopSelling ? products : (isCategoryBrowsing ? effectiveCategoryProducts : topSelling);
  const desktopDisplayLimit = !showTopSelling ? 30 : displayProducts.length;
  const mobileListProducts = displayProducts;
  const showMobileList = mobileListProducts.length > 0;
  const sortedCategories = [...categories].sort((a, b) => (categorySalesRank[b._id] || 0) - (categorySalesRank[a._id] || 0));

  if (initialLoad) return <POSSkeletonLoader />;

  return (
    <div className="pos-modern">
      <div className="pos-products-panel">
        <div className="pos-search-section">
          <div className="pos-search-wrapper"><BiSearch className="pos-search-icon" /><input ref={searchRef} className="pos-search-input" placeholder={t('product.searchByNameBarcodeSku')} value={search} onChange={(e) => setSearch(e.target.value)} />{search && <button className="pos-search-clear" onClick={() => { setSearch(''); setShowTopSelling(true); }}><BiX /></button>}</div>
          <div className="pos-search-hints"><small><BiBarcode /> {t('posPage.search.hint')}</small><small className="pos-kbd-hint"><span className="pos-kbd-f1"><kbd>F1</kbd> {t('posPage.search.shortcutSearch')} </span><kbd>F8</kbd> {t('posPage.search.shortcutBill')}</small></div>
        </div>
        {categories.length > 0 && (
          <div className="pos-category-filter">
            <button type="button" className={`pos-category-chip ${!selectedCategory ? 'active' : ''}`} onClick={() => setSelectedCategory('')}>{t('posPage.category.topSelling')}</button>
            {sortedCategories.map((cat) => (<button key={cat._id} type="button" className={`pos-category-chip ${selectedCategory === cat._id ? 'active' : ''}`} onClick={() => setSelectedCategory(cat._id)}>{isBn && cat.nameBn ? cat.nameBn : cat.name}</button>))}
          </div>
        )}
        {showMobileList && (
          <div className="pos-top-selling-mobile"><div className="pos-top-selling-mobile-list">{mobileListProducts.map((product, idx) => { const isOutOfStock = product.stock <= 0; const soldQty = productSoldCounts[product._id] ?? product.totalSold ?? 0; return (<div key={product._id} className={`pos-top-selling-mobile-item ${isOutOfStock ? 'pos-product-out-of-stock' : ''}`} onClick={() => !isOutOfStock && addToCart(product)}><div className="pos-top-selling-mobile-rank">{showTopSelling ? idx + 1 : <BiPackage size={11} />}</div><div className="pos-top-selling-mobile-info"><div className="pos-top-selling-mobile-name">{product.name}</div><div className="pos-top-selling-mobile-stats"><div className="pos-top-selling-mobile-stat"><span className="pos-top-selling-mobile-stat-label">{t('common.price')}</span><span className="pos-top-selling-mobile-stat-value pos-top-selling-mobile-stat-value--price">₹{product.sellingPrice || 0}</span></div><div className="pos-top-selling-mobile-stat"><span className="pos-top-selling-mobile-stat-label">{t('posPage.product.sold')}</span><span className="pos-top-selling-mobile-stat-value pos-top-selling-mobile-stat-value--sold">{soldQty}</span></div></div></div><button className="pos-top-selling-mobile-add" disabled={isOutOfStock} onClick={(e) => { e.stopPropagation(); !isOutOfStock && addToCart(product); }}><BiPlus /></button></div>); })}</div></div>
        )}
        <div className="pos-product-grid" key={selectedCategory || '__all__'}>
          {!showTopSelling && products.length === 0 && search && <div className="pos-empty-state"><BiPackage size={48} /><p>{t('product.noProductsFoundFor', { query: search })}</p></div>}
          {isCategoryBrowsing && hasResolvedSelectedCategory && effectiveCategoryProducts.length === 0 && <div className="pos-empty-state"><BiPackage size={48} /><p>{t('posPage.category.noProductsInCategory')}</p></div>}
          {displayProducts.slice(0, desktopDisplayLimit).map(product => { const isOutOfStock = product.stock <= 0; const isLowStock = product.stock > 0 && product.stock <= 10; const soldQty = productSoldCounts[product._id] ?? product.totalSold ?? 0; return (<div key={product._id} className={`pos-product-card ${isOutOfStock ? 'pos-product-out-of-stock' : ''}`} onClick={() => !isOutOfStock && addToCart(product)}><div className="pos-product-icon"><BiPackage /></div><div className="pos-product-info"><div className="pos-product-name">{product.name}</div><div className="pos-product-price">₹{product.sellingPrice}</div><div className="pos-product-stock">{isOutOfStock ? <span className="stock-badge out-of-stock">{t('product.outOfStock')}</span> : isLowStock ? <span className="stock-badge low-stock">{product.stock} {product.unit || t('product.piece')}</span> : <span className="stock-badge in-stock">{product.stock} {product.unit || t('product.piece')}</span>}<span className="pos-product-sold-count">{t('posPage.product.soldCount', { count: soldQty })}</span></div></div><button className="pos-add-btn" disabled={isOutOfStock} onClick={(e) => { e.stopPropagation(); addToCart(product); }}><BiPlus /></button></div>); })}
        </div>
      </div>

      <div className="pos-cart-panel">
        <div className="pos-customer-modern-header">
          <div className="pos-customer-search-area" ref={customerDropdownRef}>
            <div className="pos-customer-search-inner">
              <BiUser className="pos-customer-search-icon" />
              <input ref={customerSearchRef} className="pos-customer-search-input" placeholder={t('posPage.customer.searchPlaceholder')} value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} onFocus={() => setCustomerDropdownOpen(true)} />
              {customerSearch && <button className="pos-customer-search-clear" onClick={() => { setCustomerSearch(''); setCustomerDropdownOpen(true); }}><BiX /></button>}
              {customer ? <button className="pos-customer-search-clear" onClick={() => { setCustomer(''); setSelectedCustomerData(null); setCustomerSearch(''); }} title={t('posPage.customer.clear')}><BiTrash /></button> : <button className="pos-customer-btn-walkin" onClick={() => { setCustomer(''); setSelectedCustomerData(null); setCustomerSearch(''); setCustomerDropdownOpen(false); }} title={t('posPage.customer.walkInCustomer')}>{t('posPage.customer.walkIn')}</button>}
            </div>
            {customerDropdownOpen && (
              <div className="pos-customer-dropdown-modern">
                <div className="pos-customer-dropdown-header"><span>{t('posPage.customer.customersCount', { count: customers.length })}</span><button className="pos-customer-add-btn" onClick={() => setShowAddCustomer(true)} title={t('posPage.customer.add')}><BiPlus /> {t('posPage.customer.add')}</button></div>
                <div className="pos-customer-dropdown-list">
                  <div className={`pos-customer-option ${!customer ? 'active' : ''}`} onClick={() => { setCustomer(''); setSelectedCustomerData(null); setCustomerSearch(''); setCustomerDropdownOpen(false); }}><div className="pos-customer-option-avatar walkin"><BiUser size={16} /></div><div className="pos-customer-option-info"><span className="pos-customer-option-name">{t('posPage.customer.walkInCustomer')}</span><span className="pos-customer-option-phone">{t('posPage.customer.noAccountNeeded')}</span></div></div>
                  {customers.filter(c => !customerSearch || c.name?.toLowerCase().includes(customerSearch.toLowerCase()) || c.phone?.includes(customerSearch)).slice(0, 20).map(c => { const isSelected = customer === c._id; const due = c.dueAmount || 0; return (<div key={c._id} className={`pos-customer-option ${isSelected ? 'active' : ''}`} onClick={() => { setCustomer(c._id); setSelectedCustomerData(c); setCustomerSearch(''); setCustomerDropdownOpen(false); }}><div className="pos-customer-option-avatar" style={{ background: isSelected ? 'var(--primary)' : 'var(--bg-input)' }}>{c.name?.charAt(0)?.toUpperCase() || <BiUser size={16} />}</div><div className="pos-customer-option-info"><span className="pos-customer-option-name">{c.name}</span><span className="pos-customer-option-phone">{c.phone || t('posPage.customer.noPhone')}</span></div>{due > 0 && <span className="pos-customer-option-due">₹{Number(due).toFixed(2)}</span>}</div>); })}
                </div>
              </div>
            )}
          </div>
          <div className="pos-customer-header-right"><button className="pos-customer-add-btn-icon" onClick={() => setShowAddCustomer(true)} title={t('posPage.customer.add')}><BiPlus size={18} /></button></div>
        </div>

        {selectedCustomerData && (
          <div className="pos-customer-selected-card" style={{display:'flex',alignItems:'center',gap:'10px',padding:'8px 12px',borderRadius:'var(--border-radius-md)',background:'var(--bg-card)',border:'1px solid var(--border-color)',marginBottom:'8px',position:'relative'}}>
            <div style={{width:'34px',height:'34px',borderRadius:'10px',background:'var(--gradient-primary)',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontWeight:700,fontSize:'0.9rem',flexShrink:0}}>
              {selectedCustomerData.name?.charAt(0)?.toUpperCase() || <BiUser size={16} />}
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:'flex',alignItems:'center',gap:'6px',marginBottom:'2px',flexWrap:'wrap'}}>
                <span style={{fontWeight:700,fontSize:'0.82rem',color:'var(--text-primary)',lineHeight:1.2}}>{selectedCustomerData.name}</span>
                {selectedCustomerData.state && <span style={{fontSize:'0.65rem',color:'var(--text-muted)',background:'var(--bg-input)',padding:'1px 6px',borderRadius:'4px'}}>{selectedCustomerData.state}</span>}
                {selectedCustomerData.dueAmount > 0 && <span style={{fontSize:'0.65rem',fontWeight:600,color:'#fff',background:'var(--danger)',padding:'1px 6px',borderRadius:'4px'}}>Due: ₹{Number(selectedCustomerData.dueAmount).toFixed(2)}</span>}
              </div>
              <div style={{fontSize:'0.75rem',color:'var(--text-secondary)'}}>{selectedCustomerData.phone || t('posPage.customer.noPhone')}</div>
            </div>
            <button style={{position:'absolute',top:'4px',right:'4px',width:'22px',height:'22px',borderRadius:'50%',border:'none',background:'var(--bg-input)',color:'var(--text-muted)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',padding:0}} onClick={() => { setCustomer(''); setSelectedCustomerData(null); setCustomerSearch(''); }}><BiX size={14} /></button>
          </div>
        )}

        {loadingPreviousDue && (<div className="pos-prev-due-card pos-prev-due-loading"><span className="spinner-border spinner-border-sm" /> {t('posPage.previousDue.checking')}</div>)}
        {!loadingPreviousDue && hasPreviousDue && (
          <div className="pos-prev-due-card">
            <div className="pos-prev-due-line"><BiErrorCircle size={13} className="pos-prev-due-icon-inline" /><span className="pos-prev-due-label">{t('posPage.previousDue.title')}</span><span className="pos-prev-due-amount">₹{previousDueAmount.toFixed(2)}</span><span className="pos-prev-due-dot">•</span><span className="pos-prev-due-meta-item">{t('posPage.previousDue.unpaidInvoices', { count: previousDue.unpaidInvoiceCount || 0 })}</span>{previousDue.oldestDueDate && (<><span className="pos-prev-due-dot">•</span><span className="pos-prev-due-meta-item">{t('posPage.previousDue.oldest')}: {formatShortDate(previousDue.oldestDueDate)}</span></>)}</div>
            <div className="pos-prev-due-toggle"><button type="button" className={`pos-prev-due-option ${!includePreviousDue ? 'active' : ''}`} onClick={() => setIncludePreviousDue(false)}>{t('posPage.previousDue.currentBillOnly')}</button><button type="button" className={`pos-prev-due-option ${includePreviousDue ? 'active' : ''}`} onClick={() => setIncludePreviousDue(true)}>{t('posPage.previousDue.includePreviousDue')}</button></div>
            <div className={`pos-prev-due-breakdown ${includePreviousDue ? 'expanded' : ''}`}><div className="pos-prev-due-breakdown-inner"><div className="pos-prev-due-breakdown-line"><span>{t('posPage.previousDue.currentBill')} ₹{grandTotal.toFixed(2)}</span><span className="pos-prev-due-op">+</span><span>{t('posPage.previousDue.title')} ₹{previousDueAmount.toFixed(2)}</span><span className="pos-prev-due-op">=</span><span className="pos-prev-due-total-inline">{t('posPage.previousDue.totalPayable')} ₹{totalPayable.toFixed(2)}</span></div></div></div>
          </div>
        )}

        <div className="pos-cart-items">
          {cart.length === 0 ? (<div className="pos-cart-empty"><BiCart size={48} /><h5>{t('posPage.cart.empty')}</h5><p>{t('posPage.cart.emptyHint')}</p></div>) : (
            cart.map(item => (
              <div key={item.key} className="pos-cart-item">
                <div className="pos-cart-item-info"><div className="pos-cart-item-name">{item.product.name}</div><div className="pos-cart-item-price">{item.isCustomQty ? `${item.enteredQuantity} ${unitLabel(item.enteredUnit)} · ₹${item.price}/${unitLabel(item.product.unit)}${item.extraCharge > 0 ? ` +₹${item.extraCharge}` : ''}` : `₹${item.price} / ${item.product.unit || t('product.piece')}`}</div></div>
                <div className="pos-cart-item-controls">
                  {item.isCustomQty ? <button className="pos-qty-btn" onClick={() => setCustomQtyModal({ product: item.product, editingKey: item.key, initial: item })} title={t('common.edit')}><BiEdit /></button> : <div className="pos-qty-control"><button className="pos-qty-btn pos-qty-minus" onClick={() => updateQty(item.key, -1)} disabled={item.quantity <= 1}><BiMinus /></button><span className="pos-qty-value">{item.quantity}</span><button className="pos-qty-btn pos-qty-plus" onClick={() => updateQty(item.key, 1)}><BiPlus /></button></div>}
                  <div className="pos-cart-item-total">₹{Number(item.total || 0).toFixed(2)}</div>
                  <button className="pos-cart-item-remove" onClick={() => removeItem(item.key)}><BiTrash /></button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="pos-checkout-section">
          <div className="pos-payment-section">
            <label className="pos-payment-label">{t('sale.paymentMethod')}</label>
            <div className="pos-payment-options">
              {[{ key: 'cash', icon: <BiMoney size={16} />, label: t('sale.cash') }, { key: 'card', icon: <BiCreditCard size={16} />, label: t('sale.card') }, { key: 'upi', icon: <BiMobile size={16} />, label: t('sale.upi') }, { key: 'mobile_banking', icon: <BiBookmark size={16} />, label: t('posPage.payment.mobileBankingShort') }].map(m => (
                <button key={m.key} className={`pos-payment-option ${paymentMethod === m.key ? 'active' : ''}`} onClick={() => setPaymentMethod(m.key)}>{m.icon} {m.label}</button>
              ))}
            </div>
          </div>

          <div className="pos-discount-section">
            <label className="pos-payment-label">{t('posPage.discount.extraLabel')}</label>
            <div className="pos-discount-input-row">
              <div className="pos-discount-mode-toggle"><button className={`pos-discount-mode-btn ${discountMode === 'percent' ? 'active' : ''}`} onClick={() => setDiscountMode('percent')}>%</button><button className={`pos-discount-mode-btn ${discountMode === 'fixed' ? 'active' : ''}`} onClick={() => setDiscountMode('fixed')}>₹</button></div>
              <input type="number" className="pos-discount-input" value={discountValue} onChange={(e) => setDiscountValue(e.target.value === '' ? '' : Number(e.target.value))} min={0} placeholder={t('posPage.discount.extraLabel')} />
            </div>
          </div>

          {/* ─── Round-Off Discount Cards ─────────────────────────── */}
          {cart.length > 0 && roundOffOptions.length > 0 && (
            <div className="pos-roundoff-section">
              <label className="pos-payment-label">{t('posPage.roundOff.title')}</label>
              <div className="pos-roundoff-cards">
                {roundOffOptions.map((opt) => {
                  const isSelected = selectedRoundOff === opt.key;
                  return (
                    <div
                      key={opt.key}
                      className={`pos-roundoff-card ${isSelected ? 'active' : ''}`}
                      onClick={() => setSelectedRoundOff(opt.key)}
                    >
                      <div className="pos-roundoff-card-check">
                        <BiCheck size={10} />
                      </div>
                      <div className="pos-roundoff-card-discount">-₹{opt.discount.toFixed(2)}</div>
                      <div className="pos-roundoff-card-payable">₹{opt.payable.toFixed(2)}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="pos-paid-section">
            <label className="pos-payment-label">{t('sale.paidAmount')}</label>
            <div className="pos-paid-row">
              <div className="pos-paid-input-group"><span className="pos-paid-currency">₹</span><input type="number" className="pos-paid-input" value={paidAmount} onChange={(e) => setPaidAmount(e.target.value === '' ? '' : Number(e.target.value))} min={0} step="any" placeholder="Enter amount" /></div>
              <button className={`pos-paid-exact-btn ${paidAmount === totalPayable ? 'active' : ''}`} onClick={() => setPaidAmount(totalPayable)} title={t('posPage.payment.exact')}>{t('posPage.payment.exact')}</button>
            </div>
            {isPaidOverTotal && cart.length > 0 && (<div className="pos-paid-error"><BiErrorCircle size={14} /><span>{includePreviousDue && hasPreviousDue ? t('posPage.previousDue.paidOverTotalPayable') : t('posPage.payment.paidOverGrandTotal')}</span></div>)}
          </div>

          {dueAmount > 0 && (<div className="pos-due-alert"><BiErrorCircle size={16} /><span>{t('posPage.totals.dueAmount')} ₹{dueAmount.toFixed(2)}</span></div>)}

          <div className="pos-summary-section">
            <div className="pos-summary-cards" style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'4px',marginBottom:'4px'}}>
              <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'4px 2px',borderRadius:'var(--border-radius-sm)',background:'var(--bg-input)',border:'1px solid var(--border-color)',minHeight:'36px'}}>
                <span style={{fontSize:'0.58rem',fontWeight:600,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.2px',marginBottom:'1px'}}>CGST</span>
                <span style={{fontSize:'0.72rem',fontWeight:700,color:cgst > 0 ? '#17A2B8' : 'var(--text-muted)'}}>{cgst > 0 ? `₹${cgst.toFixed(2)}` : '₹0.00'}</span>
              </div>
              <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'4px 2px',borderRadius:'var(--border-radius-sm)',background:'var(--bg-input)',border:'1px solid var(--border-color)',minHeight:'36px'}}>
                <span style={{fontSize:'0.58rem',fontWeight:600,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.2px',marginBottom:'1px'}}>SGST</span>
                <span style={{fontSize:'0.72rem',fontWeight:700,color:sgst > 0 ? '#17A2B8' : 'var(--text-muted)'}}>{sgst > 0 ? `₹${sgst.toFixed(2)}` : '₹0.00'}</span>
              </div>
              <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'4px 2px',borderRadius:'var(--border-radius-sm)',background:'var(--bg-input)',border:'1px solid var(--border-color)',minHeight:'36px'}}>
                <span style={{fontSize:'0.58rem',fontWeight:600,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.2px',marginBottom:'1px'}}>IGST</span>
                <span style={{fontSize:'0.72rem',fontWeight:700,color:igst > 0 ? '#6C63FF' : 'var(--text-muted)'}}>{igst > 0 ? `₹${igst.toFixed(2)}` : '₹0.00'}</span>
              </div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'4px',marginBottom:'6px'}}>
              <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'4px 2px',borderRadius:'var(--border-radius-sm)',background:'var(--bg-input)',border:'1px solid var(--border-color)',minHeight:'36px'}}>
                <span style={{fontSize:'0.58rem',fontWeight:600,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.2px',marginBottom:'1px'}}>Subtotal</span>
                <span style={{fontSize:'0.72rem',fontWeight:700,color:'#17A2B8'}}>₹{subtotal.toFixed(2)}</span>
              </div>
              <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'4px 2px',borderRadius:'var(--border-radius-sm)',background:'var(--bg-input)',border:'1px solid var(--border-color)',minHeight:'36px'}}>
                <span style={{fontSize:'0.58rem',fontWeight:600,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.2px',marginBottom:'1px'}}>GST ({gstRate}%)</span>
                <span style={{fontSize:'0.72rem',fontWeight:700,color:'#6C63FF'}}>₹{gstAmount.toFixed(2)}</span>
              </div>
              <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'4px 2px',borderRadius:'var(--border-radius-sm)',background:'var(--bg-input)',border:'1px solid var(--border-color)',minHeight:'36px'}}>
                <span style={{fontSize:'0.58rem',fontWeight:600,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.2px',marginBottom:'1px'}}>Discount</span>
                <span style={{fontSize:'0.72rem',fontWeight:700,color:totalDiscount > 0 ? '#FF6B6B' : 'var(--text-muted)'}}>{totalDiscount > 0 ? `-₹${totalDiscount.toFixed(2)}` : '₹0.00'}</span>
              </div>
            </div>
            <div className="pos-grand-total"><span>{includePreviousDue && hasPreviousDue ? t('posPage.previousDue.totalPayable') : t('posPage.totals.payable')}</span><span className="pos-grand-total-amount">₹{(includePreviousDue && hasPreviousDue ? totalPayable : payableAmount).toFixed(2)}</span></div>
          </div>

          <div className="pos-action-buttons">
            <div className="pos-action-row">{lastSale && (<button className="pos-action-btn pos-reprint-btn" onClick={handleReprint}><BiPrinter size={16} /> {t('posPage.actions.reprint')}</button>)}</div>
            <button className="pos-checkout-btn" onClick={handleOpenConfirm} disabled={cart.length === 0}><BiReceipt size={18} />{t('posPage.search.shortcutBill')}</button>
            <button className="pos-clear-btn" onClick={clearCart} disabled={cart.length === 0}><BiTrash size={14} /> {t('posPage.actions.clearCart')}</button>
          </div>
        </div>
      </div>

      {loading && <PremiumGeneratingOverlay t={t} progressStep={progressStep} isFadingOut={isFadingOut} lastSale={lastSale} />}
      {showConfirmModal && confirmData && <ConfirmSaleModal data={confirmData} onConfirm={handleProcessSale} onCancel={() => setShowConfirmModal(false)} loading={loading} />}
      {customQtyModal && <CustomQuantityModal product={customQtyModal.product} initial={customQtyModal.initial} reservedBaseQty={reservedBaseQtyForProduct(customQtyModal.product._id, customQtyModal.editingKey)} onConfirm={handleConfirmCustomQty} onCancel={() => setCustomQtyModal(null)} />}
      {showInvoice && lastSale && <PrintPreview sale={lastSale} shopInfo={shopInfo} onClose={() => setShowInvoice(false)} />}
      {showAddCustomer && (
        <div className="pos-add-customer-overlay" onClick={() => setShowAddCustomer(false)}>
          <div className="pos-add-customer-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pos-add-customer-header">
              <div className="pos-add-customer-header-left"><div className="pos-add-customer-header-icon"><BiUserCircle size={20} /></div><h3>{t('posPage.addCustomerModal.title')}</h3></div>
              <button className="pos-add-customer-close" onClick={() => setShowAddCustomer(false)}><BiX size={20} /></button>
            </div>
            <div className="pos-add-customer-body">
              <div className="pos-add-customer-field"><label>{t('posPage.addCustomerModal.nameLabel')}</label><input type="text" value={addCustomerForm.name} onChange={(e) => setAddCustomerForm({ ...addCustomerForm, name: e.target.value })} placeholder={t('posPage.addCustomerModal.namePlaceholder')} /></div>
              <div className="pos-add-customer-field"><label>{t('posPage.addCustomerModal.phoneLabel')}</label><input type="text" value={addCustomerForm.phone} onChange={(e) => setAddCustomerForm({ ...addCustomerForm, phone: e.target.value })} placeholder={t('posPage.addCustomerModal.phonePlaceholder')} /></div>
              <div className="pos-add-customer-field"><label>{t('posPage.addCustomerModal.addressLabel')}</label><input type="text" value={addCustomerForm.address} onChange={(e) => setAddCustomerForm({ ...addCustomerForm, address: e.target.value })} placeholder={t('posPage.addCustomerModal.addressPlaceholder')} /></div>
              <div className="pos-add-customer-field"><label>State</label>
                <select value={addCustomerForm.state} onChange={(e) => setAddCustomerForm({ ...addCustomerForm, state: e.target.value })} style={{width:'100%',padding:'8px 10px',borderRadius:'var(--border-radius-sm)',border:'1.5px solid var(--border-color)',background:'var(--bg-input)',color:'var(--text-primary)',fontSize:'0.82rem',fontFamily:'var(--font-family)'}}>
                  {INDIAN_STATES.map(st => <option key={st} value={st}>{st}</option>)}
                </select>
              </div>
            </div>
            <div className="pos-add-customer-footer">
              <button className="pos-add-customer-btn-cancel" onClick={() => setShowAddCustomer(false)}>{t('common.cancel')}</button>
              <button className="pos-add-customer-btn-save" onClick={handleAddCustomer}><BiCheck size={18} /> {t('common.save')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default POS;