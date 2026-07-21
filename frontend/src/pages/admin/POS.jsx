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
  BiNote
} from 'react-icons/bi';
import PrintPreview from '../../components/common/PrintPreview';

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

const ConfirmSaleModal = ({ data, onConfirm, onCancel, loading }) => {
  const { t } = useTranslation();
  const [selectedPayment, setSelectedPayment] = useState(data.paymentMethod || 'cash');
  const formatDateTime = () => { const now = new Date(); return now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }); };
  const paymentMethods = [
    { key: 'cash', icon: <BiMoney size={18} />, label: t('sale.cash'), color: '#2ecc71' },
    { key: 'card', icon: <BiCreditCard size={18} />, label: t('sale.card'), color: '#6C63FF' },
    { key: 'upi', icon: <BiMobile size={18} />, label: t('sale.upi'), color: '#00D9A6' },
    { key: 'mobile_banking', icon: <BiBookmark size={18} />, label: t('sale.mobileBanking'), color: '#FF6B9D' },
  ];
  const includesPreviousDue = data.includePreviousDue && data.previousDueAmount > 0;
  // Required calculation/display order: Subtotal → Tax → Discount →
  // Grand Total → Round Off → Final Payable.
  const summaryCards = [
    { key: 'totalItems', icon: <BiShoppingBag size={16} />, label: t('posPage.confirmSale.totalItems'), value: t('posPage.confirmSale.itemsCount', { count: data.totalItems }), color: '#6C63FF' },
    { key: 'subtotal', icon: <BiDollar size={16} />, label: t('sale.subtotal'), value: `₹${data.subtotal.toFixed(2)}`, color: '#17A2B8' },
    { key: 'tax', icon: <BiFile size={16} />, label: t('sale.tax'), value: `₹${data.tax.toFixed(2)}`, color: '#6C63FF' },
    { key: 'discount', icon: <BiTag size={16} />, label: t('sale.discount'), value: `-₹${data.discount.toFixed(2)}`, color: data.discount > 0 ? '#FF6B6B' : '#9a9ab0' },
    { key: 'grandTotal', icon: <BiCrown size={16} />, label: t('posPage.totals.grandTotal'), value: `₹${data.grandTotal.toFixed(2)}`, color: '#6C63FF' },
    { key: 'roundOff', icon: <BiRefresh size={16} />, label: t('posPage.totals.roundOff'), value: `${data.roundOff < 0 ? '-' : ''}₹${Math.abs(data.roundOff).toFixed(2)}`, color: '#9a9ab0' },
    { key: 'payableAmount', icon: <BiCrown size={16} />, label: t('posPage.totals.payable'), value: `₹${data.payableAmount.toFixed(2)}`, color: '#6C63FF', highlight: !includesPreviousDue },
    ...(includesPreviousDue ? [
      { key: 'previousDue', icon: <BiErrorCircle size={16} />, label: t('posPage.previousDue.title'), value: `₹${data.previousDueAmount.toFixed(2)}`, color: '#F39C12' },
      { key: 'totalPayable', icon: <BiCrown size={16} />, label: t('posPage.previousDue.totalPayable'), value: `₹${data.totalPayable.toFixed(2)}`, color: '#6C63FF', highlight: true },
    ] : []),
    { key: 'paidAmount', icon: <BiCheckCircle size={16} />, label: t('sale.paidAmount'), value: `₹${data.paidAmount.toFixed(2)}`, color: '#2ecc71' },
    { key: 'dueAmount', icon: <BiErrorCircle size={16} />, label: t('sale.dueAmount'), value: `₹${data.dueAmount.toFixed(2)}`, color: data.dueAmount > 0 ? '#FF6B6B' : '#2ecc71' },
    { key: 'paymentMethod', icon: <BiWallet size={16} />, label: t('sale.paymentMethod'), value: (paymentMethods.find((pm) => pm.key === selectedPayment)?.label || selectedPayment).toUpperCase(), badge: true, color: '#6C63FF' },
  ];
  return (
    <div className="confirm-sale-overlay" onClick={onCancel}>
      <div className="confirm-sale-modal" onClick={(e) => e.stopPropagation()}>
        <div className="confirm-sale-header">
          <div className="confirm-sale-header-left"><div className="confirm-sale-header-icon"><BiReceipt size={24} /></div><div><h3 className="confirm-sale-title">{t('posPage.confirmSale.title')}</h3><span className="confirm-sale-datetime">{formatDateTime()}</span></div></div>
          <button className="confirm-sale-close" onClick={onCancel}><BiX size={22} /></button>
        </div>
        <div className="confirm-sale-body">
          <div className="confirm-sale-cards">{summaryCards.map((card, idx) => (
            <div key={idx} className={`confirm-sale-card ${card.highlight ? 'confirm-sale-card-highlight' : ''}`} style={{ '--card-accent': card.color }}>
              <div className="confirm-sale-card-icon" style={{ color: card.color }}>{card.icon}</div>
              <div className="confirm-sale-card-info"><span className="confirm-sale-card-label">{card.label}</span>{card.badge ? <span className="confirm-sale-card-badge" style={{ background: card.color }}>{card.value}</span> : <span className={`confirm-sale-card-value ${card.key === 'paidAmount' && data.paidAmount > 0 ? 'confirm-sale-value-green' : ''} ${card.key === 'dueAmount' ? (data.dueAmount > 0 ? 'confirm-sale-value-red' : 'confirm-sale-value-green') : ''} ${card.highlight ? 'confirm-sale-value-grand' : ''}`}>{card.value}</span>}</div>
            </div>
          ))}</div>

          <div className="confirm-sale-actions">
            <button className="confirm-sale-btn confirm-sale-btn-primary" onClick={() => onConfirm(selectedPayment)} disabled={loading}>{loading ? <span className="confirm-sale-btn-loading"><span className="spinner-border spinner-border-sm" /> {t('posPage.confirmSale.processing')}</span> : <><BiPrinter size={18} /><span>{t('posPage.confirmSale.generateAndPrint')}</span></>}</button>
          </div>
        </div>
      </div>
    </div>
  );
};

const POS = () => {
  const { t, i18n } = useTranslation();
  const isBn = i18n.language === 'bn';
  const [products, setProducts] = useState([]);
  const [topSelling, setTopSelling] = useState([]);
  const [categories, setCategories] = useState([]);
  const [categorySalesRank, setCategorySalesRank] = useState({}); // { [categoryId]: totalQuantitySold }
  const [productSoldCounts, setProductSoldCounts] = useState({}); // { [productId]: totalSold }
  const [selectedCategory, setSelectedCategory] = useState('');
  // Category browsing: shows only the shop's configured "products per
  // category" limit (Settings → POS Settings), ranked by total quantity
  // sold — no infinite scroll, no loading everything. `categoryProducts`
  // also doubles as "whatever was last shown", kept on screen while a
  // not-yet-cached category loads in the background (see categoryCache below).
  const [categoryProducts, setCategoryProducts] = useState([]);
  // Per-category cache — { [categoryId]: products[] } — a category that's
  // already been visited is applied instantly on the same render, exactly
  // like Top Selling (which never re-fetches on click either). Reset
  // whenever the configured display limit changes or after a new sale.
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
  const [previousDue, setPreviousDue] = useState(null); // { dueAmount, unpaidInvoiceCount, oldestDueDate } | null
  const [loadingPreviousDue, setLoadingPreviousDue] = useState(false);
  const [includePreviousDue, setIncludePreviousDue] = useState(false); // never defaults to true — explicit opt-in only
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [addCustomerForm, setAddCustomerForm] = useState({ name: '', phone: '', address: '' });
  const customerSearchRef = useRef(null);
  const customerDropdownRef = useRef(null);
  const [paymentMethod, setPaymentMethod] = useState(getLastPayment);
  const [paidAmount, setPaidAmount] = useState('');
  const [showInvoice, setShowInvoice] = useState(false);
  const [lastSale, setLastSale] = useState(null);
  const [shopInfo, setShopInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showTopSelling, setShowTopSelling] = useState(true);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmData, setConfirmData] = useState(null);
  const [discountMode, setDiscountMode] = useState('percent');
  const [discountValue, setDiscountValue] = useState('');
  const [customerNote, setCustomerNote] = useState('');
  const searchRef = useRef(null);

  // Close customer dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(e.target)) {
        setCustomerDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Whenever the selected customer changes, check for previous outstanding due.
  // The choice to include it is never carried over — every new selection starts
  // from "Current Bill Only" and the cashier must explicitly opt in again.
  useEffect(() => {
    setIncludePreviousDue(false);
    if (!customer || !(selectedCustomerData?.dueAmount > 0)) {
      setPreviousDue(null);
      return undefined;
    }
    let cancelled = false;
    setLoadingPreviousDue(true);
    api.get(`/customers/${customer}/due-summary`, { _skipLoading: true })
      .then(({ data }) => { if (!cancelled) setPreviousDue(data?.dueAmount > 0 ? data : null); })
      .catch(() => { if (!cancelled) setPreviousDue(null); })
      .finally(() => { if (!cancelled) setLoadingPreviousDue(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer]);

  const handleAddCustomer = async () => {
    if (!addCustomerForm.name || !addCustomerForm.phone) {
      showToast.error(t('posPage.customer.nameRequired'));
      return;
    }
    try {
      const { data } = await api.post('/customers', addCustomerForm);
      setCustomers(prev => [...prev, data]);
      setCustomer(data._id);
      setSelectedCustomerData(data);
      setShowAddCustomer(false);
      setAddCustomerForm({ name: '', phone: '', address: '' });
      showToast.success(t('posPage.customer.addSuccess'));
    } catch (err) {
      showToast.error(err.response?.data?.message || t('posPage.customer.addFailed'));
    }
  };

  useEffect(() => { searchRef.current?.focus(); }, []);

  // Tracks whether we're currently at a mobile viewport, so the POS Display
  // Settings' desktop/mobile product limits are applied to the right one —
  // matches the same 991.98px breakpoint the layout itself switches at.
  const [isMobileViewport, setIsMobileViewport] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 991.98px)').matches
  );
  useEffect(() => {
    const mql = window.matchMedia('(max-width: 991.98px)');
    const handler = (e) => setIsMobileViewport(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  // Number(...) strips out missing/null/undefined/non-numeric values (NaN
  // and 0 are both falsy) so a bad or absent setting always falls back to a
  // safe default instead of quietly asking the backend for 0 products.
  const desktopProductLimit = Number(shopInfo?.settings?.posDisplayLimit?.desktop) || 20;
  const mobileProductLimit = Number(shopInfo?.settings?.posDisplayLimit?.mobile) || 10;
  const activeProductLimit = isMobileViewport ? mobileProductLimit : desktopProductLimit;

  useEffect(() => {
    loadRecentSales();
    loadCategorySalesRank();
    loadProductSoldCounts();
    api.get('/customers?limit=50', { _skipLoading: true }).then(({ data }) => setCustomers(data.customers || [])).catch(() => {});
    api.get('/shops/my', { _skipLoading: true }).then(({ data }) => setShopInfo(data.shop || data)).catch(() => {});
    api.get('/categories', { _skipLoading: true }).then(({ data }) => setCategories(Array.isArray(data) ? data : data.categories || [])).catch(() => {});
  }, []);

  // Re-fetches Top Selling whenever the applicable display limit changes —
  // on first load (once shopInfo's configured limit arrives) and whenever
  // the viewport crosses the desktop/mobile breakpoint.
  useEffect(() => {
    loadTopSelling(activeProductLimit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProductLimit]);

  useEffect(() => {
    if (!search.trim()) { setShowTopSelling(true); setProducts([]); return; }
    setShowTopSelling(false);
    const timer = setTimeout(() => searchProducts(), 200);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, selectedCategory]);

  // A stale-limit cache is worse than no cache — every previously-visited
  // category's list was fetched for the old count, so a limit change
  // (POS Display Settings edit, or crossing the desktop/mobile breakpoint)
  // invalidates all of it at once.
  const lastCachedLimitRef = useRef(activeProductLimit);
  useEffect(() => {
    if (lastCachedLimitRef.current !== activeProductLimit) {
      categoryCache.current = {};
      lastCachedLimitRef.current = activeProductLimit;
    }
  }, [activeProductLimit]);

  // Shared by both the category-switch effect and the post-sale refresh —
  // fetches one category's top-sellers and populates the cache.
  const fetchCategoryProducts = useCallback(async (categoryId, limit) => {
    try {
      const { data } = await api.get(`/sales/top-selling?limit=${limit}&category=${categoryId}`, { _skipLoading: true });
      const list = Array.isArray(data) ? data : [];
      categoryCache.current[categoryId] = list;
      return list;
    } catch (err) {
      return null;
    }
  }, []);

  // Loads the selected category's products whenever a category becomes
  // selected, the search box is cleared while a category is still selected,
  // or the configured display limit changes — always just the top N
  // (ranked by total quantity sold), never the full category and never
  // paginated further.
  //
  // Cache-first, exactly like Top Selling: a cache hit is applied on this
  // same render via categoryCache (read directly below, in the display
  // variables) — no fetch, no spinner, no flicker. A cache miss keeps
  // whatever's already on screen and fetches quietly in the background,
  // swapping the result in once it lands.
  useEffect(() => {
    if (!showTopSelling || !selectedCategory) return undefined;
    if (categoryCache.current[selectedCategory]) return undefined;

    let cancelled = false;
    fetchCategoryProducts(selectedCategory, activeProductLimit).then((list) => {
      if (cancelled || list === null) return;
      setCategoryProducts(list);
    });
    return () => { cancelled = true; };
  }, [selectedCategory, showTopSelling, activeProductLimit, fetchCategoryProducts]);

  const isCategoryBrowsing = showTopSelling && !!selectedCategory;
  // Prefer the cache (zero-latency) — falls back to categoryProducts (the
  // last thing shown, updated by the background fetch above) only while the
  // currently-selected category hasn't been cached yet.
  const cachedSelectedCategoryProducts = selectedCategory ? categoryCache.current[selectedCategory] : undefined;
  const effectiveCategoryProducts = cachedSelectedCategoryProducts || categoryProducts;
  const hasResolvedSelectedCategory = !!cachedSelectedCategoryProducts;

  // Guards against a stale response clobbering a fresher one: on mount this
  // fires once with the default limit (before shopInfo's real setting has
  // loaded) and again moments later with the configured limit — network
  // timing doesn't guarantee the second call resolves last, so only the
  // response matching the most recently *issued* request is ever applied.
  const topSellingRequestRef = useRef(0);
  const loadTopSelling = async (limit = 20) => {
    const requestId = ++topSellingRequestRef.current;
    try {
      const { data } = await api.get(`/sales/top-selling?limit=${limit}`, { _skipLoading: true });
      if (requestId !== topSellingRequestRef.current) return;
      setTopSelling(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    }
  };
  const loadRecentSales = async () => { try { const { data } = await api.get('/sales/recent?limit=5', { _skipLoading: true }); setRecentSales(data.sales || []); } catch (err) { console.error(err); } };
  // Powers the category chip ordering — same net-quantity-sold basis as Top
  // Selling Products, just grouped by category. Re-fetched after every sale/
  // return so the chip order always reflects current sales standing.
  const loadCategorySalesRank = async () => {
    try {
      const { data } = await api.get('/sales/top-categories', { _skipLoading: true });
      const rank = {};
      (Array.isArray(data) ? data : []).forEach((c) => { rank[c._id] = c.totalQuantity; });
      setCategorySalesRank(rank);
    } catch (err) { console.error(err); }
  };
  // Powers the "Sold: N" count on every product card — net quantity sold
  // (returns already subtracted), for every product, not only the Top
  // Selling subset. Re-fetched after every sale so it's always current.
  const loadProductSoldCounts = async () => {
    try {
      const { data } = await api.get('/sales/product-sold-counts', { _skipLoading: true });
      const counts = {};
      (Array.isArray(data) ? data : []).forEach((p) => { counts[p._id] = p.totalSold; });
      setProductSoldCounts(counts);
    } catch (err) { console.error(err); }
  };
  const searchProducts = async () => {
    setSearching(true);
    try {
      const categoryParam = selectedCategory ? `&category=${selectedCategory}` : '';
      const { data } = await api.get(`/products/search?q=${search}${categoryParam}`, { _skipLoading: true });
      setProducts(Array.isArray(data) ? data : data.products || []);
    } catch (err) {
      console.error(err);
      setProducts([]);
    } finally {
      setSearching(false);
    }
  };

  const addToCart = useCallback((product) => {
    if (product.stock <= 0) { showToast.warning(t('posPage.stockWarnings.outOfStock', { name: product.name })); return; }
    setCart(prev => {
      const existing = prev.find(item => item.product._id === product._id);
      if (existing) {
        if (existing.quantity >= product.stock) { showToast.warning(t('posPage.stockWarnings.onlyAvailable', { count: product.stock, unit: product.unit || t('product.piece') })); return prev; }
        return prev.map(item => item.product._id === product._id ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.price } : item);
      }
      return [...prev, { product, quantity: 1, price: product.sellingPrice, discount: product.discount || 0, total: product.sellingPrice }];
    });
  }, [t]);

  const updateQty = useCallback((id, delta) => {
    setCart(prev => prev.map(item => {
      if (item.product._id === id) {
        const newQty = Math.max(1, item.quantity + delta);
        if (newQty > item.product.stock) { showToast.warning(t('posPage.stockWarnings.onlyAvailable', { count: item.product.stock, unit: item.product.unit || t('product.piece') })); return item; }
        return { ...item, quantity: newQty, total: newQty * item.price };
      }
      return item;
    }));
  }, [t]);

  const removeItem = useCallback((id) => { setCart(prev => prev.filter(item => item.product._id !== id)); }, []);

  // Resets the cart/inputs for the next transaction WITHOUT touching lastSale —
  // used right after a successful checkout, where we still want the Print
  // Invoice / Reprint buttons (gated on lastSale) to stay visible.
  const resetCartFieldsForNextSale = () => {
    setCart([]);
    setPaidAmount('');
    setCustomer('');
    setSelectedCustomerData(null);
    setCustomerSearch('');
    setDiscountValue('');
    setDiscountMode('percent');
    setCustomerNote('');
    setPaymentMethod(getLastPayment());
  };

  // Full reset for the explicit "Clear Cart" action / F2 shortcut — also
  // drops lastSale, hiding Print Invoice / Reprint until another bill is generated.
  const clearCart = () => {
    resetCartFieldsForNextSale();
    setLastSale(null);
  };

  const taxRate = shopInfo?.settings?.taxRate ?? 0;
  const taxName = shopInfo?.settings?.taxName || t('posPage.receipt.defaultTaxName');
  const receiptFooter = shopInfo?.settings?.receiptFooter || t('posPage.receipt.defaultFooter');
  const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
  const itemDiscount = cart.reduce((sum, item) => sum + ((item.price * item.discount / 100) * item.quantity), 0);
  const extraDiscount = discountMode === 'percent' ? (subtotal - itemDiscount) * ((discountValue || 0) / 100) : (discountValue || 0);
  const totalDiscount = itemDiscount + extraDiscount;
  const taxableAmount = subtotal - totalDiscount;
  const tax = taxableAmount > 0 ? taxableAmount * (taxRate / 100) : 0;
  const grandTotal = subtotal + tax - totalDiscount;
  // Round Off — always rounds DOWN to the nearest whole currency unit, per
  // the required calculation order (Subtotal → Tax → Discount → Grand Total
  // → Round Off → Final Payable). This floored value is the "Payable"
  // amount used everywhere below (due, change, payment clamping) and is
  // what actually gets sent to/stored by the backend as totalAmount.
  const payableAmount = Math.floor(grandTotal);
  const roundOff = payableAmount - grandTotal; // always <= 0
  // Current-bill due — formula is unchanged regardless of the previous-due
  // toggle, since paying against the current bill is always allocated first.
  const dueAmount = Math.max(0, payableAmount - Number(paidAmount || 0));
  const change = Math.max(0, Number(paidAmount || 0) - payableAmount);
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  const hasPreviousDue = !!(previousDue && previousDue.dueAmount > 0);
  const previousDueAmount = hasPreviousDue ? previousDue.dueAmount : 0;
  // The amount the cashier is actually being asked to collect right now —
  // the current bill alone, or current bill + previous due once opted in.
  const totalPayable = includePreviousDue && hasPreviousDue ? payableAmount + previousDueAmount : payableAmount;
  // Any amount paid beyond the current bill is applied to the previous due
  // (current bill is always settled first), capped so it never exceeds it.
  const paidTowardPreviousDue = includePreviousDue && hasPreviousDue
    ? Math.min(Math.max(0, Number(paidAmount || 0) - payableAmount), previousDueAmount)
    : 0;

  // Paid Amount is intentionally never auto-filled as the bill total changes —
  // it stays exactly what the cashier typed (or empty) until they either type
  // something themselves or click "Exact" (see pos-paid-exact-btn below).
  useEffect(() => { try { localStorage.setItem('pos_last_payment', paymentMethod); } catch {} }, [paymentMethod]);

  const isPaidOverTotal = paidAmount !== '' && Number(paidAmount) > totalPayable;
  // Once there's an outstanding due, the sale must be traceable back to a real
  // customer (walk-in has no name/phone to collect the due from later).
  const hasValidCustomerInfo = !!(selectedCustomerData?.name && selectedCustomerData?.phone);
  const customerRequiredForDue = dueAmount > 0 && !hasValidCustomerInfo;

  const handleOpenConfirm = () => {
    if (cart.length === 0) return;
    if (isPaidOverTotal) return;
    if (customerRequiredForDue) {
      showToast.error(t('posPage.validation.customerRequiredForDue'));
      return;
    }
    setConfirmData({ totalItems, subtotal, discount: totalDiscount, grandTotal, roundOff, payableAmount, paidAmount, dueAmount, paymentMethod, tax, taxRate, taxName, extraDiscount, customerNote, includePreviousDue, previousDueAmount, totalPayable });
    setShowConfirmModal(true);
  };

  const handleProcessSale = async (selectedPayment) => {
    if (cart.length === 0) return;
    if (customerRequiredForDue) {
      showToast.error(t('posPage.validation.customerRequiredForDue'));
      return;
    }
    setLoading(true);
    try {
      // The amount actually entered/confirmed by the cashier — clamped to
      // [0, payableAmount] (the rounded-down total) so it can never
      // manufacture a fake full payment (previously this was force-raised to
      // the total, which made every sale look fully paid and silently erased
      // the due amount). The current bill is always settled first; anything
      // paid beyond it is a separate payment against the previous due (see
      // paidTowardPreviousDue below) — the sale itself never knows about the
      // customer's older invoices.
      const confirmedPaidAmount = Math.min(Math.max(0, Number(paidAmount) || 0), payableAmount);
      const previousDuePayment = paidTowardPreviousDue; // snapshot before cart/customer reset
      const targetCustomerId = customer;
      const payload = {
        customer: customer || null,
        items: cart.map(item => ({ product: item.product._id, quantity: item.quantity, unit: item.product.unit, price: item.price, discount: item.discount, tax: item.product.tax || 0, total: item.total })),
        // subtotal/discount/tax are sent as the raw (pre-round) figures — the
        // backend independently derives Grand Total from these and floors it
        // to get totalAmount/roundOff, so the stored Round Off always matches
        // exactly what was shown here at checkout.
        subtotal, discount: totalDiscount, tax, totalAmount: payableAmount, paidAmount: confirmedPaidAmount, dueAmount: Math.max(0, payableAmount - confirmedPaidAmount), paymentMethod: selectedPayment, posType: 'pos', notes: customerNote,
      };
      const { data } = await api.post('/sales', payload);
      const saleDetail = await api.get(`/sales/${data._id || data.sale}`);
      const saleData = saleDetail.data.sale || saleDetail.data;
      setLastSale({ ...saleData, invoiceNo: data.invoiceNo || saleData.invoiceNo, totalAmount: data.totalAmount || saleData.totalAmount || payableAmount, roundOff: data.roundOff ?? saleData.roundOff ?? roundOff, paidAmount: data.paidAmount || saleData.paidAmount || paidAmount, dueAmount: data.dueAmount || saleData.dueAmount || dueAmount, paymentMethod: selectedPayment, notes: customerNote });

      // The current sale is safely recorded at this point. If the cashier chose
      // to also settle some/all of the previous due, record that as a normal
      // customer payment (same endpoint used by "Receive Payment" elsewhere) so
      // it shows up correctly in the customer ledger and payment history.
      if (previousDuePayment > 0 && targetCustomerId) {
        try {
          await api.post(`/customers/${targetCustomerId}/payment`, {
            amount: previousDuePayment,
            paymentMethod: selectedPayment,
            notes: `Previous due settled during POS checkout (Invoice ${data.invoiceNo || ''})`,
          });
        } catch (payErr) {
          showToast.warning(t('posPage.previousDue.paymentRecordFailed'));
        }
      }

      setShowConfirmModal(false);
      setShowInvoice(true);
      resetCartFieldsForNextSale();
      loadTopSelling(activeProductLimit);
      loadRecentSales();
      loadCategorySalesRank();
      loadProductSoldCounts();
      // Quantity-sold rankings just shifted — every cached category list is
      // now potentially stale. Drop the cache and, if a category is
      // currently open, quietly refresh it in place (same no-spinner swap
      // as any other cache miss).
      categoryCache.current = {};
      if (selectedCategory) {
        fetchCategoryProducts(selectedCategory, activeProductLimit).then((list) => {
          if (list !== null) setCategoryProducts(list);
        });
      }
      showToast.success(t('posPage.toast.invoiceGenerated', { invoiceNo: data.invoiceNo || '' }));
    } catch (err) { showToast.error(err.response?.data?.message || t('posPage.toast.checkoutFailed')); }
    finally { setLoading(false); }
  };

  const handleReprint = () => { if (lastSale) setShowInvoice(true); else showToast.warning(t('posPage.totals.noPreviousInvoice')); };
  const quickAmounts = [100, 200, 500, 1000];
  const quickDiscounts = [
    { label: '5%', value: 5, mode: 'percent' },
    { label: '10%', value: 10, mode: 'percent' },
    { label: '₹50', value: 50, mode: 'fixed' },
    { label: '₹100', value: 100, mode: 'fixed' },
  ];

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'F1') { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key === 'F2') { e.preventDefault(); if (cart.length > 0) clearCart(); }
      if (e.key === 'F8') { e.preventDefault(); if (cart.length > 0) handleOpenConfirm(); }
      if (e.key === 'Escape') { setSearch(''); setShowTopSelling(true); searchRef.current?.focus(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart]);

  // "showTopSelling" really just means "the search box is empty" — within
  // that, a selected category shows that category's top sellers (up to the
  // configured display limit), and no category selected shows the overall
  // Top Selling list (same limit). Search always searches everything and
  // ignores the display limit entirely.
  const isActualTopSelling = showTopSelling && !selectedCategory;
  const displayProducts = !showTopSelling ? products : (isCategoryBrowsing ? effectiveCategoryProducts : topSelling);
  // No artificial cap — both topSelling and categoryProducts are already
  // fetched at exactly the configured limit, ranked by quantity sold.
  const desktopDisplayLimit = !showTopSelling ? 30 : displayProducts.length;
  const mobileListProducts = displayProducts;
  const showMobileList = mobileListProducts.length > 0;
  // Chip order: highest total quantity sold first; categories with no sales
  // yet (0, i.e. absent from the rank map) fall to the end, in their
  // original list order among themselves.
  const sortedCategories = [...categories].sort(
    (a, b) => (categorySalesRank[b._id] || 0) - (categorySalesRank[a._id] || 0)
  );

  return (
    <div className="pos-modern">
      <div className="pos-products-panel">
        <div className="pos-search-section">
          <div className="pos-search-wrapper">
            <BiSearch className="pos-search-icon" />
            <input ref={searchRef} className="pos-search-input" placeholder={t('product.searchByNameBarcodeSku')} value={search} onChange={(e) => setSearch(e.target.value)} />
            {search && <button className="pos-search-clear" onClick={() => { setSearch(''); setShowTopSelling(true); }}><BiX /></button>}
          </div>
          <div className="pos-search-hints">
            <small><BiBarcode /> {t('posPage.search.hint')}</small>
            <small className="pos-kbd-hint"><span className="pos-kbd-f1"><kbd>F1</kbd> {t('posPage.search.shortcutSearch')} </span><kbd>F8</kbd> {t('posPage.search.shortcutBill')}</small>
          </div>
        </div>
        {categories.length > 0 && (
          <div className="pos-category-filter">
            <button
              type="button"
              className={`pos-category-chip ${!selectedCategory ? 'active' : ''}`}
              onClick={() => setSelectedCategory('')}
            >
              {t('posPage.category.topSelling')}
            </button>
            {sortedCategories.map((cat) => (
              <button
                key={cat._id}
                type="button"
                className={`pos-category-chip ${selectedCategory === cat._id ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat._id)}
              >
                {isBn && cat.nameBn ? cat.nameBn : cat.name}
              </button>
            ))}
          </div>
        )}
        {/* {showTopSelling && displayProducts.length > 0 && (
          <div className="pos-section-header"><BiTrendingUp /> {t('dashboard.topSellingProducts')}</div>
        )} */}
        {showMobileList && (
          <div className="pos-top-selling-mobile">
            <div className="pos-top-selling-mobile-list">
              {mobileListProducts.map((product, idx) => {
                const isOutOfStock = product.stock <= 0;
                const soldQty = productSoldCounts[product._id] ?? product.totalSold ?? 0;
                return (
                  <div key={product._id} className={`pos-top-selling-mobile-item ${isOutOfStock ? 'pos-product-out-of-stock' : ''}`} onClick={() => !isOutOfStock && addToCart(product)}>
                    <div className="pos-top-selling-mobile-rank">{showTopSelling ? idx + 1 : <BiPackage size={11} />}</div>
                    <div className="pos-top-selling-mobile-info">
                      <div className="pos-top-selling-mobile-name">{product.name}</div>
                      <div className="pos-top-selling-mobile-stats">
                        <div className="pos-top-selling-mobile-stat">
                          <span className="pos-top-selling-mobile-stat-label">{t('common.price')}</span>
                          <span className="pos-top-selling-mobile-stat-value pos-top-selling-mobile-stat-value--price">₹{product.sellingPrice || 0}</span>
                        </div>
                        <div className="pos-top-selling-mobile-stat">
                          <span className="pos-top-selling-mobile-stat-label">{t('posPage.product.sold')}</span>
                          <span className="pos-top-selling-mobile-stat-value pos-top-selling-mobile-stat-value--sold">{soldQty}</span>
                        </div>
                      </div>
                    </div>
                    <button className="pos-top-selling-mobile-add" disabled={isOutOfStock} onClick={(e) => { e.stopPropagation(); !isOutOfStock && addToCart(product); }}><BiPlus /></button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        <div className="pos-product-grid">
          {!showTopSelling && products.length === 0 && search && <div className="pos-empty-state"><BiPackage size={48} /><p>{t('product.noProductsFoundFor', { query: search })}</p></div>}
          {/* No spinner here on purpose — a category switch behaves exactly
              like Top Selling: cached data (or the previous category's list)
              stays on screen with zero loading UI while a background fetch
              (if any) quietly resolves. The "no products" message only ever
              shows once we've definitively confirmed it's actually empty. */}
          {isCategoryBrowsing && hasResolvedSelectedCategory && effectiveCategoryProducts.length === 0 && (
            <div className="pos-empty-state"><BiPackage size={48} /><p>{t('posPage.category.noProductsInCategory')}</p></div>
          )}
          {displayProducts.slice(0, desktopDisplayLimit).map(product => {
            const isOutOfStock = product.stock <= 0;
            const isLowStock = product.stock > 0 && product.stock <= 10;
            const soldQty = productSoldCounts[product._id] ?? product.totalSold ?? 0;
            return (
              <div key={product._id} className={`pos-product-card ${isOutOfStock ? 'pos-product-out-of-stock' : ''}`} onClick={() => !isOutOfStock && addToCart(product)}>
                <div className="pos-product-icon"><BiPackage /></div>
                <div className="pos-product-info">
                  <div className="pos-product-name">{product.name}</div>
                  <div className="pos-product-price">₹{product.sellingPrice}</div>
                  <div className="pos-product-stock">
                    {isOutOfStock ? <span className="stock-badge out-of-stock">{t('product.outOfStock')}</span> : isLowStock ? <span className="stock-badge low-stock">{product.stock} {product.unit || t('product.piece')}</span> : <span className="stock-badge in-stock">{product.stock} {product.unit || t('product.piece')}</span>}
                    <span className="pos-product-sold-count">{t('posPage.product.soldCount', { count: soldQty })}</span>
                  </div>
                </div>
                <button className="pos-add-btn" disabled={isOutOfStock} onClick={(e) => { e.stopPropagation(); addToCart(product); }}><BiPlus /></button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="pos-cart-panel">
        <div className="pos-customer-modern-header">
          <div className="pos-customer-search-area" ref={customerDropdownRef}>
            <div className="pos-customer-search-inner">
              <BiUser className="pos-customer-search-icon" />
              <input
                ref={customerSearchRef}
                className="pos-customer-search-input"
                placeholder={t('posPage.customer.searchPlaceholder')}
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                onFocus={() => setCustomerDropdownOpen(true)}
              />
              {customerSearch && (
                <button className="pos-customer-search-clear" onClick={() => { setCustomerSearch(''); setCustomerDropdownOpen(true); }}>
                  <BiX />
                </button>
              )}
              {customer ? (
                <button className="pos-customer-search-clear" onClick={() => { setCustomer(''); setSelectedCustomerData(null); setCustomerSearch(''); }} title={t('posPage.customer.clear')}>
                  <BiTrash />
                </button>
              ) : (
                <button className="pos-customer-btn-walkin" onClick={() => { setCustomer(''); setSelectedCustomerData(null); setCustomerSearch(''); setCustomerDropdownOpen(false); }} title={t('posPage.customer.walkInCustomer')}>
                  {t('posPage.customer.walkIn')}
                </button>
              )}
            </div>

            {customerDropdownOpen && (
              <div className="pos-customer-dropdown-modern">
                <div className="pos-customer-dropdown-header">
                  <span>{t('posPage.customer.customersCount', { count: customers.length })}</span>
                  <button className="pos-customer-add-btn" onClick={() => setShowAddCustomer(true)} title={t('posPage.customer.add')}>
                    <BiPlus /> {t('posPage.customer.add')}
                  </button>
                </div>
                <div className="pos-customer-dropdown-list">
                  <div
                    className={`pos-customer-option ${!customer ? 'active' : ''}`}
                    onClick={() => { setCustomer(''); setSelectedCustomerData(null); setCustomerSearch(''); setCustomerDropdownOpen(false); }}
                  >
                    <div className="pos-customer-option-avatar walkin">
                      <BiUser size={16} />
                    </div>
                    <div className="pos-customer-option-info">
                      <span className="pos-customer-option-name">{t('posPage.customer.walkInCustomer')}</span>
                      <span className="pos-customer-option-phone">{t('posPage.customer.noAccountNeeded')}</span>
                    </div>
                  </div>
                  {customers
                    .filter(c =>
                      !customerSearch ||
                      c.name?.toLowerCase().includes(customerSearch.toLowerCase()) ||
                      c.phone?.includes(customerSearch)
                    )
                    .slice(0, 20)
                    .map(c => {
                      const isSelected = customer === c._id;
                      const due = c.dueAmount || 0;
                      return (
                        <div
                          key={c._id}
                          className={`pos-customer-option ${isSelected ? 'active' : ''}`}
                          onClick={() => { setCustomer(c._id); setSelectedCustomerData(c); setCustomerSearch(''); setCustomerDropdownOpen(false); }}
                        >
                          <div className="pos-customer-option-avatar" style={{ background: isSelected ? 'var(--primary)' : 'var(--bg-input)' }}>
                            {c.name?.charAt(0)?.toUpperCase() || <BiUser size={16} />}
                          </div>
                          <div className="pos-customer-option-info">
                            <span className="pos-customer-option-name">{c.name}</span>
                            <span className="pos-customer-option-phone">{c.phone || t('posPage.customer.noPhone')}</span>
                          </div>
                          {due > 0 && (
                            <span className="pos-customer-option-due">₹{Number(due).toFixed(2)}</span>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
          <div className="pos-customer-header-right">
            <button className="pos-customer-add-btn-icon" onClick={() => setShowAddCustomer(true)} title={t('posPage.customer.add')}>
              <BiPlus size={18} />
            </button>
          </div>
        </div>

        {selectedCustomerData && (
          <div className="pos-customer-selected-card">
            <div className="pos-customer-selected-avatar">
              {selectedCustomerData.name?.charAt(0)?.toUpperCase() || <BiUser size={18} />}
            </div>
            <div className="pos-customer-selected-info">
              <span className="pos-customer-selected-name">{selectedCustomerData.name}</span>
              <span className="pos-customer-selected-phone">{selectedCustomerData.phone || t('posPage.customer.noPhone')}</span>
              {selectedCustomerData.dueAmount > 0 && (
                <div className="pos-customer-selected-due-row">
                  <span className="pos-customer-selected-due-label">{t('posPage.totals.dueAmount')}</span>
                  <span className="pos-customer-selected-due-value" style={{ color: 'var(--danger)' }}>₹{Number(selectedCustomerData.dueAmount).toFixed(2)}</span>
                </div>
              )}
            </div>
            <button className="pos-customer-selected-remove" onClick={() => { setCustomer(''); setSelectedCustomerData(null); setCustomerSearch(''); }}>
              <BiX size={16} />
            </button>
          </div>
        )}

        {loadingPreviousDue && (
          <div className="pos-prev-due-card pos-prev-due-loading">
            <span className="spinner-border spinner-border-sm" /> {t('posPage.previousDue.checking')}
          </div>
        )}

        {!loadingPreviousDue && hasPreviousDue && (
          <div className="pos-prev-due-card">
            <div className="pos-prev-due-line">
              <BiErrorCircle size={13} className="pos-prev-due-icon-inline" />
              <span className="pos-prev-due-label">{t('posPage.previousDue.title')}</span>
              <span className="pos-prev-due-amount">₹{previousDueAmount.toFixed(2)}</span>
              <span className="pos-prev-due-dot">•</span>
              <span className="pos-prev-due-meta-item">{t('posPage.previousDue.unpaidInvoices', { count: previousDue.unpaidInvoiceCount || 0 })}</span>
              {previousDue.oldestDueDate && (
                <>
                  <span className="pos-prev-due-dot">•</span>
                  <span className="pos-prev-due-meta-item">{t('posPage.previousDue.oldest')}: {formatShortDate(previousDue.oldestDueDate)}</span>
                </>
              )}
            </div>

            <div className="pos-prev-due-toggle">
              <button
                type="button"
                className={`pos-prev-due-option ${!includePreviousDue ? 'active' : ''}`}
                onClick={() => setIncludePreviousDue(false)}
              >
                {t('posPage.previousDue.currentBillOnly')}
              </button>
              <button
                type="button"
                className={`pos-prev-due-option ${includePreviousDue ? 'active' : ''}`}
                onClick={() => setIncludePreviousDue(true)}
              >
                {t('posPage.previousDue.includePreviousDue')}
              </button>
            </div>

            <div className={`pos-prev-due-breakdown ${includePreviousDue ? 'expanded' : ''}`}>
              <div className="pos-prev-due-breakdown-inner">
                <div className="pos-prev-due-breakdown-line">
                  <span>{t('posPage.previousDue.currentBill')} ₹{grandTotal.toFixed(2)}</span>
                  <span className="pos-prev-due-op">+</span>
                  <span>{t('posPage.previousDue.title')} ₹{previousDueAmount.toFixed(2)}</span>
                  <span className="pos-prev-due-op">=</span>
                  <span className="pos-prev-due-total-inline">{t('posPage.previousDue.totalPayable')} ₹{totalPayable.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="pos-cart-items">
          {cart.length === 0 ? (
            <div className="pos-cart-empty">
              <BiCart size={48} />
              <h5>{t('posPage.cart.empty')}</h5>
              <p>{t('posPage.cart.emptyHint')}</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.product._id} className="pos-cart-item">
                <div className="pos-cart-item-info">
                  <div className="pos-cart-item-name">{item.product.name}</div>
                  <div className="pos-cart-item-price">₹{item.price} / {item.product.unit || t('product.piece')}</div>
                </div>
                <div className="pos-cart-item-controls">
                  <div className="pos-qty-control">
                    <button className="pos-qty-btn pos-qty-minus" onClick={() => updateQty(item.product._id, -1)} disabled={item.quantity <= 1}><BiMinus /></button>
                    <span className="pos-qty-value">{item.quantity}</span>
                    <button className="pos-qty-btn pos-qty-plus" onClick={() => updateQty(item.product._id, 1)}><BiPlus /></button>
                  </div>
                  <div className="pos-cart-item-total">₹{item.total.toFixed(2)}</div>
                  <button className="pos-cart-item-remove" onClick={() => removeItem(item.product._id)}><BiTrash /></button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="pos-checkout-section">
          <div className="pos-payment-section">
            <label className="pos-payment-label">{t('sale.paymentMethod')}</label>
            <div className="pos-payment-options">
              {[
                { key: 'cash', icon: <BiMoney size={16} />, label: t('sale.cash') },
                { key: 'card', icon: <BiCreditCard size={16} />, label: t('sale.card') },
                { key: 'upi', icon: <BiMobile size={16} />, label: t('sale.upi') },
                { key: 'mobile_banking', icon: <BiBookmark size={16} />, label: t('posPage.payment.mobileBankingShort') },
              ].map(m => (
                <button key={m.key} className={`pos-payment-option ${paymentMethod === m.key ? 'active' : ''}`} onClick={() => setPaymentMethod(m.key)}>
                  {m.icon} {m.label}
                </button>
              ))}
            </div>
          </div>

          <div className="pos-discount-section">
            <label className="pos-payment-label">{t('posPage.discount.extraLabel')}</label>
            <div className="pos-discount-input-row">
              <div className="pos-discount-mode-toggle">
                <button className={`pos-discount-mode-btn ${discountMode === 'percent' ? 'active' : ''}`} onClick={() => setDiscountMode('percent')}>%</button>
                <button className={`pos-discount-mode-btn ${discountMode === 'fixed' ? 'active' : ''}`} onClick={() => setDiscountMode('fixed')}>₹</button>
              </div>
              <input type="number" className="pos-discount-input" value={discountValue} onChange={(e) => setDiscountValue(e.target.value === '' ? '' : Number(e.target.value))} min={0} placeholder={t('posPage.discount.extraLabel')} />
            </div>
          </div>

          <div className="pos-paid-section">
            <label className="pos-payment-label">{t('sale.paidAmount')}</label>
            <div className="pos-paid-row">
              <div className="pos-paid-input-group">
                <span className="pos-paid-currency">₹</span>
                <input type="number" className="pos-paid-input" value={paidAmount} onChange={(e) => setPaidAmount(e.target.value === '' ? '' : Number(e.target.value))} min={0} step="any" placeholder="Enter amount" />
              </div>
              <button className={`pos-paid-exact-btn ${paidAmount === totalPayable ? 'active' : ''}`} onClick={() => setPaidAmount(totalPayable)} title={t('posPage.payment.exact')}>
                {t('posPage.payment.exact')}
              </button>
            </div>
            {isPaidOverTotal && cart.length > 0 && (
              <div className="pos-paid-error">
                <BiErrorCircle size={14} />
                <span>
                  {includePreviousDue && hasPreviousDue
                    ? t('posPage.previousDue.paidOverTotalPayable')
                    : t('posPage.payment.paidOverGrandTotal')}
                </span>
              </div>
            )}
          </div>

          {dueAmount > 0 && (
            <div className="pos-due-alert">
              <BiErrorCircle size={16} />
              <span>{t('posPage.totals.dueAmount')} ₹{dueAmount.toFixed(2)}</span>
            </div>
          )}

          <div className="pos-summary-section">
            <div className="pos-summary-cards">
              <div className="pos-summary-card pos-summary-subtotal">
                <span className="pos-summary-label">{t('sale.subtotal')}</span>
                <span className="pos-summary-value">₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="pos-summary-card pos-summary-tax">
                <span className="pos-summary-label">{taxName}</span>
                <span className="pos-summary-value">₹{tax.toFixed(2)}</span>
              </div>
              <div className="pos-summary-card pos-summary-discount">
                <span className="pos-summary-label">{t('sale.discount')}</span>
                <span className="pos-summary-value">-₹{totalDiscount.toFixed(2)}</span>
              </div>
            </div>

            <div className="pos-round-off-row">
              <span>{t('posPage.totals.roundOff')}</span>
              <span>{roundOff < 0 ? '-' : ''}₹{Math.abs(roundOff).toFixed(2)}</span>
            </div>

            <div className="pos-grand-total">
              <span>{t('posPage.totals.payable')}</span>
              <span className="pos-grand-total-amount">₹{payableAmount.toFixed(2)}</span>
            </div>
          </div>

          <div className="pos-action-buttons">
            <div className="pos-action-row">
              {lastSale && (
                <button className="pos-action-btn pos-reprint-btn" onClick={handleReprint}><BiPrinter size={16} /> {t('posPage.actions.reprint')}</button>
              )}
            </div>
            <button className="pos-checkout-btn" onClick={handleOpenConfirm} disabled={cart.length === 0}>
              <BiReceipt size={18} />
              {t('posPage.search.shortcutBill')}
            </button>
            <button className="pos-clear-btn" onClick={clearCart} disabled={cart.length === 0}>
              <BiTrash size={14} /> {t('posPage.actions.clearCart')}
            </button>
          </div>
        </div>
      </div>

      {showConfirmModal && confirmData && (
        <ConfirmSaleModal data={confirmData} onConfirm={handleProcessSale} onCancel={() => setShowConfirmModal(false)} loading={loading} />
      )}
      {showInvoice && lastSale && (
        <PrintPreview
          sale={lastSale}
          shopInfo={shopInfo}
          onClose={() => setShowInvoice(false)}
        />
      )}
      {showAddCustomer && (
        <div className="pos-add-customer-overlay" onClick={() => setShowAddCustomer(false)}>
          <div className="pos-add-customer-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pos-add-customer-header">
              <div className="pos-add-customer-header-left">
                <div className="pos-add-customer-header-icon"><BiUserCircle size={20} /></div>
                <h3>{t('posPage.addCustomerModal.title')}</h3>
              </div>
              <button className="pos-add-customer-close" onClick={() => setShowAddCustomer(false)}><BiX size={20} /></button>
            </div>
            <div className="pos-add-customer-body">
              <div className="pos-add-customer-field">
                <label>{t('posPage.addCustomerModal.nameLabel')}</label>
                <input type="text" value={addCustomerForm.name} onChange={(e) => setAddCustomerForm({ ...addCustomerForm, name: e.target.value })} placeholder={t('posPage.addCustomerModal.namePlaceholder')} />
              </div>
              <div className="pos-add-customer-field">
                <label>{t('posPage.addCustomerModal.phoneLabel')}</label>
                <input type="text" value={addCustomerForm.phone} onChange={(e) => setAddCustomerForm({ ...addCustomerForm, phone: e.target.value })} placeholder={t('posPage.addCustomerModal.phonePlaceholder')} />
              </div>
              <div className="pos-add-customer-field">
                <label>{t('posPage.addCustomerModal.addressLabel')}</label>
                <input type="text" value={addCustomerForm.address} onChange={(e) => setAddCustomerForm({ ...addCustomerForm, address: e.target.value })} placeholder={t('posPage.addCustomerModal.addressPlaceholder')} />
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