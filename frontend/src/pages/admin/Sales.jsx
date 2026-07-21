import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import { showToast } from '../../utils/toast';
import StatCard from '../../components/common/StatCard';
import ExpandableCard from '../../components/common/ExpandableCard';
import {
  BiSearch, BiPrinter, BiTrash, BiX, BiCheck, BiShow,
  BiFilter, BiCalendar, BiDollar, BiCreditCard,
  BiPackage, BiUser, BiReceipt,
  BiRefresh, BiChevronLeft, BiChevronRight, BiCopy,
  BiStore, BiMoney, BiTrendingUp, BiWallet,
  BiHash, BiPhone, BiNote,
  BiTime, BiUserCircle, BiCart, BiUndo,
  BiFile, BiGridSmall, BiLayout, BiDownload,
  BiQr, BiIdCard,
} from 'react-icons/bi';
import PrintPreview from '../../components/common/PrintPreview';

// ─── Format helpers ─────────────────────────────────────────
const formatDate = (dateStr) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true
  });
};

const formatTime = (dateStr) => {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', hour12: true
  });
};

const formatAddress = (addr) => {
  if (!addr) return '';
  if (typeof addr === 'string') return addr;
  if (typeof addr === 'object') return Object.values(addr).filter(Boolean).join(', ');
  return String(addr);
};

const getStatusStyles = (t) => ({
  paid: { bg: 'rgba(46, 204, 113, 0.12)', color: '#2ecc71', label: t('common.paid') },
  partial: { bg: 'rgba(255, 181, 69, 0.12)', color: '#F39C12', label: t('common.partial') },
  unpaid: { bg: 'rgba(255, 107, 107, 0.12)', color: '#FF6B6B', label: t('common.due') },
});

const getReturnStyles = (t) => ({
  none: { bg: 'rgba(158, 158, 158, 0.1)', color: '#9e9e9e', label: t('salesPage.returnStatusLabels.none') },
  partial: { bg: 'rgba(255, 181, 69, 0.12)', color: '#F39C12', label: t('salesPage.returnStatusLabels.partial') },
  full: { bg: 'rgba(108, 99, 255, 0.12)', color: '#6C63FF', label: t('salesPage.returnStatusLabels.full') },
});

const PAYMENT_ICONS = {
  cash: '💵', card: '💳', upi: '📱', mobile_banking: '🏦',
};

const getStatusOptions = (t) => [
  { key: '', label: t('salesPage.status.all') },
  { key: 'paid', label: t('common.paid') },
  { key: 'partial', label: t('common.partial') },
  { key: 'unpaid', label: t('common.due') },
];

// ─── Date Quick Filters ───────────────────────────────────────
const getDatePresets = (t) => [
  { key: 'today', label: t('common.today') },
  { key: '7d', label: t('common.last7Days') },
  { key: '30d', label: t('common.last30Days') },
  { key: 'month', label: t('common.thisMonth') },
  { key: 'custom', label: t('common.customRange') },
];

// Local calendar date (no timezone shift) — matches what <input type="date"> produces
const toDateInputValue = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

// ─── Invoice QR Component ────────────────────────────────────
const SalesInvoiceQR = ({ invoiceNo, size = 60 }) => {
  const chars = (invoiceNo || 'INV').split('');
  const cellSize = Math.max(2, Math.floor(size / (chars.length + 4)));
  const padding = cellSize * 2;
  const totalSize = padding * 2 + chars.length * cellSize;
  return (
    <svg width={totalSize} height={totalSize} viewBox={`0 0 ${totalSize} ${totalSize}`} style={{ display: 'block' }}>
      <rect width={totalSize} height={totalSize} fill="white" rx="2" />
      <rect x={padding} y={padding} width={cellSize * 7} height={cellSize * 7} fill="black" rx="1" />
      <rect x={padding + cellSize} y={padding + cellSize} width={cellSize * 5} height={cellSize * 5} fill="white" />
      <rect x={padding + cellSize * 2} y={padding + cellSize * 2} width={cellSize * 3} height={cellSize * 3} fill="black" />
      {chars.map((ch, i) => (
        <rect key={i} x={padding + (i % chars.length) * cellSize} y={padding + Math.floor(i / chars.length) * cellSize + cellSize * 8} width={cellSize} height={cellSize} fill={ch.charCodeAt(0) % 2 === 0 ? 'black' : 'white'} opacity={0.8} />
      ))}
    </svg>
  );
};

// ─── View Drawer (uses standard drawer classes with smooth animation) ─────────
const SaleViewDrawer = ({ open, onClose, sale, shopInfo, onPrint, onCopyInvoice }) => {
  const { t } = useTranslation();
  const statusStyles = getStatusStyles(t);
  const returnStyles = getReturnStyles(t);

  const st = sale ? (statusStyles[sale.paymentStatus] || statusStyles.paid) : null;
  const rs = sale ? (returnStyles[sale.returnStatus] || returnStyles.none) : null;
  const pmtIcon = sale ? (PAYMENT_ICONS[sale.paymentMethod] || '💵') : null;
  const allReturns = sale?.returns || [];
  const totalRefunded = allReturns.reduce((sum, r) => sum + (r.totalRefund || 0), 0);

  return (
    <>
      <div className={`drawer-overlay ${open ? 'open' : ''}`} onClick={onClose} />
      <div className={`drawer ${open ? 'open' : ''}`}>
        <div className="drawer-header">
          <h5><BiReceipt size={18} style={{ marginRight: 8, verticalAlign: 'middle' }} />{t('salesPage.drawer.title')}</h5>
          <button className="btn-close-premium" onClick={onClose}><BiX /></button>
        </div>
        <div className="drawer-body">
          {sale && (
            <>
              {/* Invoice Hero */}
              <div style={{
                textAlign: 'center', marginBottom: '1.25rem', padding: '1.25rem',
                background: 'linear-gradient(135deg, rgba(108,99,255,0.05), rgba(0,217,166,0.05))',
                borderRadius: 'var(--border-radius-lg)',
                border: '1px solid rgba(108,99,255,0.1)',
              }}>
                <div style={{
                  width: 52, height: 52, borderRadius: '50%',
                  background: 'var(--gradient-primary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', margin: '0 auto 0.6rem',
                  boxShadow: '0 4px 15px rgba(108,99,255,0.3)',
                }}>
                  <BiReceipt size={28} />
                </div>
                <h4 style={{ margin: '0 0 4px', fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                  {sale.invoiceNo || t('common.notAvailable')}
                </h4>
                <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                  {formatDate(sale.createdAt)}
                </span>
                <div style={{ display: 'inline-block', padding: '3px 14px', borderRadius: 20, background: st.bg, color: st.color, fontSize: '0.72rem', fontWeight: 700 }}>
                  {st.label}
                </div>
                <div style={{ display: 'inline-block', padding: '3px 14px', borderRadius: 20, background: rs.bg, color: rs.color, fontSize: '0.72rem', fontWeight: 700, marginTop: 6 }}>
                  {rs.label}
                </div>
              </div>

              {/* Info Cards */}
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0.7rem 0.85rem', borderRadius: 'var(--border-radius-md)', background: 'var(--bg-input)', border: '1px solid var(--border-light)' }}>
                    <div style={{ width: 36, height: 36, borderRadius: 'var(--border-radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: 'rgba(108,99,255,0.1)', color: '#6C63FF' }}><BiUser size={18} /></div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
                      <span style={{ fontSize: '0.65rem', fontWeight: 500, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>{t('sale.customer')}</span>
                      <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>{sale.customer?.name || t('dashboard.walkInCustomer')}</span>
                      {sale.customer?.phone && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: '0.7rem', color: 'var(--text-secondary)' }}><BiPhone size={12} /> {sale.customer.phone}</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0.7rem 0.85rem', borderRadius: 'var(--border-radius-md)', background: 'var(--bg-input)', border: '1px solid var(--border-light)' }}>
                    <div style={{ width: 36, height: 36, borderRadius: 'var(--border-radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: 'rgba(0,217,166,0.1)', color: '#00D9A6' }}><BiStore size={18} /></div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
                      <span style={{ fontSize: '0.65rem', fontWeight: 500, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>{t('salesPage.drawer.shop')}</span>
                      <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>{shopInfo?.name || shopInfo?.shopName || t('salesPage.invoice.shopNamePlaceholder')}</span>
                      {shopInfo?.phone && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: '0.7rem', color: 'var(--text-secondary)' }}><BiPhone size={12} /> {shopInfo.phone}</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0.7rem 0.85rem', borderRadius: 'var(--border-radius-md)', background: 'var(--bg-input)', border: '1px solid var(--border-light)' }}>
                    <div style={{ width: 36, height: 36, borderRadius: 'var(--border-radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: 'rgba(255,181,69,0.1)', color: '#F39C12' }}><BiCreditCard size={18} /></div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
                      <span style={{ fontSize: '0.65rem', fontWeight: 500, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>{t('salesPage.drawer.payment')}</span>
                      <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>{pmtIcon} {sale.paymentMethod ? sale.paymentMethod.toUpperCase() : t('sale.cash').toUpperCase()}</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                        {t('common.paid')}: <strong style={{ color: '#2ecc71' }}>₹{Number(sale.paidAmount || 0).toFixed(2)}</strong>
                        {sale.dueAmount > 0 && <> | {t('common.due')}: <strong style={{ color: '#FF6B6B' }}>₹{Number(sale.dueAmount).toFixed(2)}</strong></>}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Items */}
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.6rem' }}>
                  <BiCart size={16} /><span>{t('salesPage.drawer.itemsCount', { count: sale.items?.length || 0 })}</span>
                </div>
                <div style={{ borderRadius: 'var(--border-radius-md)', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', padding: '0.45rem 0.7rem', background: 'var(--bg-primary)', fontSize: '0.62rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid var(--border-color)' }}>
                    <span style={{ flex: 2 }}>{t('salesPage.invoice.item')}</span>
                    <span style={{ flex: 0.5, textAlign: 'center' }}>{t('salesPage.invoice.qty')}</span>
                    <span style={{ flex: 0.6, textAlign: 'center' }}>{t('salesPage.drawer.rtn')}</span>
                    <span style={{ flex: 0.7, textAlign: 'right' }}>{t('common.price')}</span>
                    <span style={{ flex: 0.7, textAlign: 'right' }}>{t('common.total')}</span>
                  </div>
                  {sale.items?.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', padding: '0.45rem 0.7rem', fontSize: '0.78rem', borderBottom: idx < sale.items.length - 1 ? '1px solid var(--border-light)' : 'none', background: 'var(--bg-card)' }}>
                      <span style={{ flex: 2, fontWeight: 600, wordBreak: 'break-word' }}>
                        {item.product?.name || item.name || t('salesPage.invoice.item')}
                        {item.discount > 0 && <span style={{ display: 'block', color: '#e74c3c', fontSize: '0.6rem', fontWeight: 600 }}>-{item.discount}% {t('salesPage.invoice.off')}</span>}
                      </span>
                      <span style={{ flex: 0.5, textAlign: 'center', color: 'var(--text-secondary)' }}>{item.quantity}</span>
                      <span style={{ flex: 0.6, textAlign: 'center', color: (item.returnedQty || 0) > 0 ? '#6C63FF' : 'var(--text-muted)', fontWeight: (item.returnedQty || 0) > 0 ? 700 : 400 }}>
                        {item.returnedQty || '-'}
                      </span>
                      <span style={{ flex: 0.7, textAlign: 'right', color: 'var(--text-secondary)' }}>₹{Number(item.price).toFixed(2)}</span>
                      <span style={{ flex: 0.7, textAlign: 'right', fontWeight: 700 }}>₹{Number(item.total).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals */}
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.45rem 0.85rem', borderRadius: 'var(--border-radius-sm)', background: 'var(--bg-input)', border: '1px solid var(--border-light)', fontSize: '0.8rem', color: 'var(--text-primary)' }}>
                    <span>{t('sale.subtotal')}</span><span>₹{Number(sale.subtotal || 0).toFixed(2)}</span>
                  </div>
                  {Number(sale.discount || 0) > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.45rem 0.85rem', borderRadius: 'var(--border-radius-sm)', background: 'var(--bg-input)', border: '1px solid var(--border-light)', fontSize: '0.8rem', color: '#e74c3c' }}>
                      <span>{t('sale.discount')}</span><span>-₹{Number(sale.discount).toFixed(2)}</span>
                    </div>
                  )}
                  {Number(sale.tax || 0) > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.45rem 0.85rem', borderRadius: 'var(--border-radius-sm)', background: 'var(--bg-input)', border: '1px solid var(--border-light)', fontSize: '0.8rem', color: 'var(--text-primary)' }}>
                      <span>{t('sale.tax')}</span><span>₹{Number(sale.tax).toFixed(2)}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0.85rem', borderRadius: 'var(--border-radius-md)', background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))', fontSize: '0.9rem', color: '#fff', fontWeight: 700, boxShadow: '0 2px 10px rgba(108,99,255,0.2)' }}>
                    <span>{t('salesPage.invoice.grandTotal')}</span><span style={{ fontSize: '1.05rem', fontWeight: 800 }}>₹{Number(sale.totalAmount || sale.grandTotal || 0).toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.45rem 0.85rem', borderRadius: 'var(--border-radius-sm)', background: 'var(--bg-input)', border: '1px solid var(--border-light)', fontSize: '0.8rem', color: '#2ecc71', fontWeight: 600 }}>
                    <span>{t('common.paid')}</span><span>₹{Number(sale.paidAmount || 0).toFixed(2)}</span>
                  </div>
                  {Number(sale.dueAmount || 0) > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.45rem 0.85rem', borderRadius: 'var(--border-radius-sm)', background: 'var(--bg-input)', border: '1px solid var(--border-light)', fontSize: '0.8rem', color: '#FF6B6B', fontWeight: 600 }}>
                      <span>{t('common.due')}</span><span>₹{Number(sale.dueAmount).toFixed(2)}</span>
                    </div>
                  )}
                  {totalRefunded > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.45rem 0.85rem', borderRadius: 'var(--border-radius-sm)', background: 'var(--bg-input)', border: '1px solid var(--border-light)', fontSize: '0.8rem', color: '#6C63FF', fontWeight: 600 }}>
                      <span>{t('salesPage.totalRefund')}</span><span>₹{Number(totalRefunded).toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Return History */}
              {allReturns.length > 0 && (
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.6rem' }}>
                    <BiUndo size={16} /><span>{t('salesPage.drawer.returnHistory', { count: allReturns.length })}</span>
                  </div>
                  {allReturns.map((ret, rIdx) => (
                    <div key={rIdx} style={{ padding: '10px 12px', borderRadius: 'var(--border-radius-md)', background: 'rgba(108,99,255,0.04)', border: '1px solid rgba(108,99,255,0.1)', marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, paddingBottom: 6, borderBottom: '1px solid rgba(108,99,255,0.1)' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.7rem', color: 'var(--text-muted)' }}><BiTime size={12} /> {formatDate(ret.returnDate)}</span>
                        <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#6C63FF', background: 'rgba(108,99,255,0.1)', padding: '2px 8px', borderRadius: 4 }}>{ret.refundMethod?.toUpperCase()}</span>
                      </div>
                      {ret.items.map((ritem, riIdx) => (
                        <div key={riIdx} style={{ padding: '4px 0', borderBottom: riIdx < ret.items.length - 1 ? '1px solid var(--border-light)' : 'none' }}>
                          <span style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)' }}>{ritem.productName || t('salesPage.invoice.item')}</span>
                          <div style={{ display: 'flex', gap: 12, fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: 1 }}>
                            <span>{t('salesPage.invoice.qty')}: {ritem.quantity}</span>
                            <span>{t('salesPage.refund')}: ₹{Number(ritem.refundAmount).toFixed(2)}</span>
                          </div>
                          {ritem.reason && <span style={{ display: 'block', fontSize: '0.68rem', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: 2 }}>{ritem.reason}</span>}
                        </div>
                      ))}
                      <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 6, paddingTop: 6, borderTop: '1px solid rgba(108,99,255,0.1)' }}>
                        {t('salesPage.totalRefund')}: <strong style={{ color: 'var(--primary)', marginLeft: 4 }}>₹{Number(ret.totalRefund).toFixed(2)}</strong>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {sale.notes && (
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.6rem' }}>
                    <BiNote size={16} /><span>{t('common.notes')}</span>
                  </div>
                  <p style={{ padding: '0.65rem 0.85rem', borderRadius: 'var(--border-radius-md)', background: 'rgba(255,181,69,0.06)', border: '1px solid rgba(255,181,69,0.12)', fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>{sale.notes}</p>
                </div>
              )}
            </>
          )}
        </div>
        <div className="drawer-footer">
          <button className="btn-premium btn-premium-secondary btn-premium-sm" onClick={onClose}>{t('common.close')}</button>
          {sale && (
            <>
              <button className="btn-premium btn-premium-primary btn-premium-sm" onClick={() => onCopyInvoice?.(sale.invoiceNo)} title={t('salesPage.copyInvoiceNumber')}><BiCopy size={16} /></button>
              <button className="btn-premium btn-premium-primary btn-premium-sm" onClick={() => onPrint?.(sale)}><BiPrinter size={16} /> {t('salesPage.reprint')}</button>
            </>
          )}
        </div>
      </div>
    </>
  );
};

// ─── Return Drawer (uses standard drawer classes with smooth animation) ──────
const ReturnDrawer = ({ open, onClose, sale, onReturnProcessed }) => {
  const { t } = useTranslation();
  const [returnItems, setReturnItems] = useState([]);
  const [refundMethod, setRefundMethod] = useState('cash');
  const [reason, setReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [showConfirmReturnAll, setShowConfirmReturnAll] = useState(false);

  useEffect(() => {
    if (sale && open) {
      setReturnItems((sale.items || []).map(item => ({
        productId: item.product?._id || item.product,
        productName: item.product?.name || item.name || t('salesPage.invoice.item'),
        soldQty: item.quantity || 0,
        returnedQty: item.returnedQty || 0,
        maxReturnable: Math.max(0, (item.quantity || 0) - (item.returnedQty || 0)),
        price: item.price || 0,
        returnQty: 0,
        refundAmount: 0,
        itemReason: '',
      })));
      setRefundMethod('cash');
      setReason('');
      setShowConfirmReturnAll(false);
    }
  }, [sale, open]);

  const handleQtyChange = (idx, val) => {
    const newItems = [...returnItems];
    const qty = Math.max(0, Math.min(val, newItems[idx].maxReturnable));
    newItems[idx].returnQty = qty;
    newItems[idx].refundAmount = qty * newItems[idx].price;
    setReturnItems(newItems);
  };

  const totalRefund = returnItems.reduce((s, i) => s + (i.refundAmount || 0), 0);
  const hasItems = returnItems.some(i => i.returnQty > 0);

  // Check if all returnable items are already at max
  const returnableItems = returnItems.filter(i => i.maxReturnable > 0);
  const allSelected = returnableItems.length > 0 && returnableItems.every(i => i.returnQty === i.maxReturnable);

  const handleReturnAll = () => {
    if (allSelected) {
      // Clear all
      setReturnItems(prev => prev.map(i => ({ ...i, returnQty: 0, refundAmount: 0 })));
    } else {
      // Show confirmation first
      setShowConfirmReturnAll(true);
    }
  };

  const executeReturnAll = () => {
    setReturnItems(prev => prev.map(i => ({
      ...i,
      returnQty: i.maxReturnable,
      refundAmount: i.maxReturnable * i.price,
    })));
    setShowConfirmReturnAll(false);
  };

  const handleSubmit = async () => {
    if (!hasItems) { showToast.error(t('salesPage.returnDrawer.selectAtLeastOneItem')); return; }
    setProcessing(true);
    try {
      const { data } = await api.post(`/sales/${sale._id}/return`, {
        items: returnItems.filter(i => i.returnQty > 0).map(i => ({
          productId: i.productId, productName: i.productName,
          quantity: i.returnQty, refundAmount: i.refundAmount,
          reason: i.itemReason || reason,
        })),
        reason, refundMethod,
      });
      showToast.success(t('salesPage.returnDrawer.returnProcessedSuccess'));
      onReturnProcessed?.(data.sale);
      onClose();
    } catch (err) {
      showToast.error(err.response?.data?.message || t('salesPage.returnDrawer.returnFailed'));
    } finally { setProcessing(false); }
  };

  const allFullyReturned = returnItems.every(i => i.maxReturnable <= 0);

  return (
    <>
      <div className={`drawer-overlay ${open ? 'open' : ''}`} onClick={onClose} />
      <div className={`drawer ${open ? 'open' : ''}`}>
        <div className="drawer-header">
          <h5><BiUndo size={18} style={{ marginRight: 8, verticalAlign: 'middle' }} />{t('salesPage.returnDrawer.title')}</h5>
          <button className="btn-close-premium" onClick={onClose}><BiX /></button>
        </div>
        <div className="drawer-body">
          {sale && (
            <>
              {/* Invoice Hero */}
              <div style={{
                textAlign: 'center', marginBottom: '1.25rem', padding: '1.25rem',
                background: 'linear-gradient(135deg, rgba(255,107,107,0.05), rgba(255,181,69,0.05))',
                borderRadius: 'var(--border-radius-lg)',
                border: '1px solid rgba(255,107,107,0.1)',
              }}>
                <div style={{
                  width: 52, height: 52, borderRadius: '50%',
                  background: 'linear-gradient(135deg, #FF6B6B, #FFB545)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', margin: '0 auto 0.6rem',
                  boxShadow: '0 4px 15px rgba(255,107,107,0.3)',
                }}>
                  <BiUndo size={28} />
                </div>
                <h4 style={{ margin: '0 0 4px', fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                  {sale.invoiceNo || t('common.notAvailable')}
                </h4>
                <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {formatDate(sale.createdAt)}
                </span>
              </div>

              {allFullyReturned ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <BiCheck size={48} style={{ color: 'var(--secondary)', marginBottom: 12 }} />
                  <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{t('salesPage.returnDrawer.allReturnedTitle')}</h4>
                  <p style={{ fontSize: '0.85rem', margin: 0 }}>{t('salesPage.returnDrawer.allReturnedDesc')}</p>
                </div>
              ) : (
                <>
                  {/* Return All / Clear All Button */}
                  {returnableItems.length > 0 && (
                    <div style={{ marginBottom: '0.75rem' }}>
                      <button
                        onClick={handleReturnAll}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '7px 14px',
                          border: 'none',
                          borderRadius: 'var(--border-radius-sm)',
                          background: allSelected ? 'rgba(255,107,107,0.1)' : 'rgba(108,99,255,0.1)',
                          color: allSelected ? 'var(--danger)' : 'var(--primary)',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          fontFamily: 'var(--font-family)',
                          cursor: 'pointer',
                          transition: 'all var(--transition-fast)',
                          width: '100%',
                          justifyContent: 'center',
                        }}
                      >
                        {allSelected ? <><BiTrash size={16} /> {t('salesPage.returnDrawer.clearAll')}</> : <><BiCheck size={16} /> {t('salesPage.returnDrawer.returnAllProducts')}</>}
                      </button>
                    </div>
                  )}

                  {/* Items to return */}
                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.6rem' }}>
                      <BiPackage size={16} /><span>{t('salesPage.returnDrawer.selectItemsToReturn')}</span>
                    </div>
                    {returnItems.map((item, idx) => (
                      <div key={idx} style={{ padding: '10px 12px', borderRadius: 'var(--border-radius-md)', background: 'var(--bg-input)', border: '1px solid var(--border-light)', marginBottom: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>{item.productName}</span>
                          {item.maxReturnable <= 0 && <span style={{ fontSize: '0.65rem', fontWeight: 600, color: '#6C63FF', background: 'rgba(108,99,255,0.1)', padding: '2px 8px', borderRadius: 10 }}>{t('salesPage.returnStatusLabels.full')}</span>}
                        </div>
                        <div style={{ display: 'flex', gap: 12, fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: 8 }}>
                          <span>{t('salesPage.returnDrawer.sold')} <strong style={{ color: 'var(--text-primary)' }}>{item.soldQty}</strong></span>
                          <span>{t('salesPage.returnDrawer.returned')} <strong style={{ color: 'var(--text-primary)' }}>{item.returnedQty}</strong></span>
                          <span>{t('salesPage.returnDrawer.available')} <strong style={{ color: 'var(--text-primary)' }}>{item.maxReturnable}</strong></span>
                        </div>
                        {item.maxReturnable > 0 && (
                          <>
                            <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
                                <label style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>{t('salesPage.returnDrawer.qtyToReturn')}</label>
                                <div style={{ display: 'flex', alignItems: 'center', border: '1.5px solid var(--border-color)', borderRadius: 'var(--border-radius-sm)', overflow: 'hidden', background: 'var(--bg-card)' }}>
                                  <button onClick={() => handleQtyChange(idx, item.returnQty - 1)} disabled={item.returnQty <= 0} style={{ width: 30, height: 30, border: 'none', background: 'var(--bg-input)', color: 'var(--text-secondary)', fontSize: '1rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>-</button>
                                  <input type="number" value={item.returnQty} onChange={(e) => handleQtyChange(idx, parseInt(e.target.value) || 0)} min="0" max={item.maxReturnable} style={{ flex: 1, border: 'none', outline: 'none', textAlign: 'center', fontSize: '0.85rem', fontWeight: 700, fontFamily: 'var(--font-family)', background: 'transparent', color: 'var(--text-primary)', width: 50, padding: '4px 0', MozAppearance: 'textfield' }} />
                                  <button onClick={() => handleQtyChange(idx, item.returnQty + 1)} disabled={item.returnQty >= item.maxReturnable} style={{ width: 30, height: 30, border: 'none', background: 'var(--bg-input)', color: 'var(--text-secondary)', fontSize: '1rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                                </div>
                              </div>
                              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
                                <label style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>{t('salesPage.returnDrawer.refundAmount')}</label>
                                <div style={{ display: 'flex', alignItems: 'center', border: '1.5px solid var(--border-color)', borderRadius: 'var(--border-radius-sm)', overflow: 'hidden', background: 'var(--bg-card)' }}>
                                  <span style={{ padding: '0 6px 0 10px', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', background: 'var(--bg-input)', lineHeight: '30px', borderRight: '1px solid var(--border-color)' }}>₹</span>
                                  <input type="number" value={item.refundAmount} onChange={(e) => { const n = [...returnItems]; n[idx].refundAmount = Math.max(0, Number(e.target.value)); setReturnItems(n); }} min="0" style={{ flex: 1, border: 'none', outline: 'none', padding: '4px 8px', fontSize: '0.85rem', fontWeight: 700, fontFamily: 'var(--font-family)', background: 'transparent', color: 'var(--text-primary)', minWidth: 0, MozAppearance: 'textfield' }} />
                                </div>
                              </div>
                            </div>
                            <div style={{ marginTop: 4 }}>
                              <input type="text" placeholder={t('salesPage.returnDrawer.reasonPlaceholder')} value={item.itemReason} onChange={(e) => { const n = [...returnItems]; n[idx].itemReason = e.target.value; setReturnItems(n); }} style={{ width: '100%', padding: '6px 10px', fontSize: '0.75rem', fontFamily: 'var(--font-family)', border: '1.5px solid var(--border-color)', borderRadius: 'var(--border-radius-sm)', background: 'var(--bg-card)', color: 'var(--text-primary)', outline: 'none' }} />
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Refund Details */}
                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.6rem' }}>
                      <BiWallet size={16} /><span>{t('salesPage.returnDrawer.refundDetails')}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderRadius: 'var(--border-radius-sm)', background: 'rgba(var(--primary-rgb), 0.06)', border: '1px solid rgba(var(--primary-rgb), 0.12)', fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                        <span>{t('salesPage.totalRefund')}</span>
                        <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary)' }}>₹{totalRefund.toFixed(2)}</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <label style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>{t('salesPage.returnDrawer.refundMethod')}</label>
                        <select value={refundMethod} onChange={(e) => setRefundMethod(e.target.value)} style={{ padding: '8px 10px', fontSize: '0.82rem', fontFamily: 'var(--font-family)', border: '1.5px solid var(--border-color)', borderRadius: 'var(--border-radius-sm)', background: 'var(--bg-input)', color: 'var(--text-primary)', outline: 'none' }}>
                          <option value="cash">{t('sale.cash')}</option>
                          <option value="card">{t('sale.card')}</option>
                          <option value="upi">{t('sale.upi')}</option>
                          <option value="mobile_banking">{t('sale.mobileBanking')}</option>
                        </select>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <label style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>{t('salesPage.returnDrawer.overallReasonLabel')}</label>
                        <input type="text" placeholder={t('salesPage.returnDrawer.reasonExamplePlaceholder')} value={reason} onChange={(e) => setReason(e.target.value)} style={{ padding: '8px 10px', fontSize: '0.82rem', fontFamily: 'var(--font-family)', border: '1.5px solid var(--border-color)', borderRadius: 'var(--border-radius-sm)', background: 'var(--bg-input)', color: 'var(--text-primary)', outline: 'none' }} />
                      </div>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>
        {sale && !allFullyReturned && (
          <div className="drawer-footer">
            <button className="btn-premium btn-premium-secondary btn-premium-sm" onClick={onClose}>{t('common.cancel')}</button>
            <button className="btn-premium btn-premium-primary btn-premium-sm" onClick={handleSubmit} disabled={!hasItems || processing}>
              {processing ? <><span className="spinner-border spinner-border-sm" /> {t('salesPage.returnDrawer.processing')}</> : <><BiUndo size={16} /> {t('salesPage.returnDrawer.processReturn', { amount: totalRefund.toFixed(2) })}</>}
            </button>
          </div>
        )}
      </div>

      {/* Return All Confirmation Dialog */}
      {showConfirmReturnAll && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 1200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
          onClick={() => setShowConfirmReturnAll(false)}
        >
          <div
            style={{
              background: 'var(--bg-modal)',
              borderRadius: 'var(--border-radius-xl)',
              boxShadow: 'var(--shadow-xl)',
              width: '100%',
              maxWidth: 400,
              animation: 'modalFadeIn 0.2s ease',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: '1.25rem 1.5rem', textAlign: 'center' }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  background: 'rgba(108,99,255,0.1)',
                  color: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 0.75rem',
                }}
              >
                <BiUndo size={24} />
              </div>
              <h5 style={{ fontWeight: 700, fontSize: '1rem', margin: '0 0 0.5rem', color: 'var(--text-primary)' }}>
                {t('salesPage.returnDrawer.confirmReturnAllTitle')}
              </h5>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                {t('salesPage.returnDrawer.confirmReturnAllDesc')}
              </p>
            </div>
            <div
              style={{
                display: 'flex',
                gap: 8,
                padding: '0.85rem 1.5rem',
                borderTop: '1px solid var(--border-color)',
                justifyContent: 'flex-end',
              }}
            >
              <button
                className="btn-premium btn-premium-secondary btn-premium-sm"
                onClick={() => setShowConfirmReturnAll(false)}
              >
                {t('common.cancel')}
              </button>
              <button
                className="btn-premium btn-premium-primary btn-premium-sm"
                onClick={executeReturnAll}
              >
                <BiCheck size={16} /> {t('salesPage.returnDrawer.confirmReturnAllBtn')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// ─── Main Sales Component ────────────────────────────────────
const Sales = () => {
  const { t } = useTranslation();
  const STATUS_STYLES = getStatusStyles(t);
  const RETURN_STYLES = getReturnStyles(t);
  const STATUS_OPTIONS = getStatusOptions(t);
  const DATE_PRESETS = getDatePresets(t);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [search, setSearch] = useState('');
  // Default to last 30 days on initial load
  const getDefaultDateRange = () => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 29);
    return { start: toDateInputValue(start), end: toDateInputValue(end) };
  };
  const defaultRange = getDefaultDateRange();
  const [startDate, setStartDate] = useState(defaultRange.start);
  const [endDate, setEndDate] = useState(defaultRange.end);
  const [datePreset, setDatePreset] = useState('30d');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [viewingSale, setViewingSale] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [returningSale, setReturningSale] = useState(null);
  const [returnDrawerOpen, setReturnDrawerOpen] = useState(false);
  const [printingSale, setPrintingSale] = useState(null);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [shopInfo, setShopInfo] = useState(null);
  const [stats, setStats] = useState(null);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const filtersRef = useRef(null);
  const searchTimeoutRef = useRef(null);
  const isFirstLoad = useRef(true);

  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => setDebouncedSearch(search), 300);
    return () => { if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current); };
  }, [search]);

  useEffect(() => {
    api.get('/shops/my', { _skipLoading: true }).then(({ data }) => setShopInfo(data.shop || data)).catch(() => {});
  }, []);

  // Only the very first load shows the full-page loader; subsequent fetches
  // caused by search/filter/pagination stay silent and use the table indicator.
  // The summary cards are read straight off this same response's `stats`
  // field — one request, one query on the backend, so the table and the
  // cards can never disagree about what "the current filter" means, and
  // there's no separate /sales/stats round-trip to keep in sync or forget.
  const fetchSales = useCallback(async () => {
    const silent = !isFirstLoad.current;
    if (silent) setSearching(true); else setLoading(true);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.append('search', debouncedSearch);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (paymentStatus) params.append('paymentStatus', paymentStatus);
      params.append('page', page);
      params.append('limit', 20);
      const { data } = await api.get(`/sales?${params.toString()}`, { _skipLoading: true });
      setSales(data.sales || []);
      setTotalPages(data.pages || 1);
      setTotal(data.total || 0);
      setStats(data.stats || null);
    } catch (err) { console.error(err); }
    finally {
      if (silent) setSearching(false); else setLoading(false);
      isFirstLoad.current = false;
    }
  }, [debouncedSearch, startDate, endDate, paymentStatus, page]);

  useEffect(() => { fetchSales(); }, [fetchSales]);
  useEffect(() => { setPage(1); }, [debouncedSearch, startDate, endDate, paymentStatus]);

  // ESC key closes drawers
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        if (drawerOpen) { setDrawerOpen(false); setViewingSale(null); }
        if (returnDrawerOpen) { setReturnDrawerOpen(false); setReturningSale(null); }
      }
    };
    if (drawerOpen || returnDrawerOpen) {
      document.addEventListener('keydown', handleEsc);
      return () => document.removeEventListener('keydown', handleEsc);
    }
  }, [drawerOpen, returnDrawerOpen]);

  const refreshAll = () => {
    fetchSales();
  };

  const applyDatePreset = (key) => {
    setDatePreset(key);
    if (key === 'custom') return; // just reveal the manual pickers below; leave existing dates as-is

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
    // 'today' needs no adjustment — start and end are both "now"

    setStartDate(toDateInputValue(start));
    setEndDate(toDateInputValue(end));
  };

  const handleView = (sale) => { setViewingSale(sale); setDrawerOpen(true); };

  const handleReturn = (sale) => { setReturningSale(sale); setReturnDrawerOpen(true); };

  const handleReturnProcessed = (updatedSale) => {
    setSales(prev => prev.map(s => s._id === updatedSale._id ? updatedSale : s));
    refreshAll();
  };

  const handleCopyInvoice = (invoiceNo) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(invoiceNo || '');
      showToast.success(t('salesPage.invoiceNumberCopied'));
    }
  };

  const handlePrintClick = (sale) => {
    setPrintingSale(sale);
    setShowPrintPreview(true);
  };

  // All four read from `stats`, which comes from the same filtered response
  // as `sales`/`total` (see fetchSales) — always the currently selected date
  // range + payment status + search, same as the table below.
  const statCards = [
    { label: t('salesPage.stats.totalSales'), value: stats?.totalSales || 0, icon: BiDollar, color: 'primary', isCurrency: true },
    { label: t('salesPage.stats.totalRevenue'), value: stats?.totalRevenue || 0, icon: BiWallet, color: 'success', isCurrency: true },
    { label: t('salesPage.stats.totalProfit'), value: stats?.totalProfit || 0, icon: BiTrendingUp, color: 'warning', isCurrency: true },
    { label: t('salesPage.stats.totalOrders'), value: stats?.totalOrders || 0, icon: BiCart, color: 'danger', isCurrency: false },
  ];

  return (
    <div>
      <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
        <div>
          <h4 className="mb-1" style={{ fontWeight: 800 }}>{t('nav.sales')}</h4>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>{t('salesPage.subtitle')}</p>
        </div>
        <div className="d-flex gap-2">
          <button className="btn-premium btn-premium-secondary" onClick={refreshAll}><BiRefresh size={18} /> {t('common.refresh')}</button>
          <button className="btn-premium btn-premium-primary" onClick={() => window.location.href = '/pos'}><BiDollar size={18} /> {t('salesPage.newSale')}</button>
        </div>
      </div>

      <div className="row g-3 mb-4">
        {statCards.map((card, idx) => (
          <div key={idx} className="col-6 col-md-3">
            <StatCard icon={card.icon} label={card.label} value={card.value} color={card.color} rawValue={card.value} isCurrency={card.isCurrency} />
          </div>
        ))}
      </div>

      <div className="sales-filters-wrapper" ref={filtersRef}>
        <div className="sales-filters">
          <div className="sales-filter search-box">
            <BiSearch className="search-icon" />
            <input className="form-control sales-filter-input" placeholder={t('salesPage.searchPlaceholder')} value={search} onChange={(e) => setSearch(e.target.value)} />
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
                    <span>{p.label}</span>
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
            <select className="form-control sales-filter-input" value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)}>
              {STATUS_OPTIONS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className={`sales-table-container table-container desktop-table ${searching ? 'is-refreshing' : ''}`}>
        <div className="sales-table-scroll">
          <table className="sales-table">
            <thead>
              <tr>
                <th>{t('sale.invoice')}</th>
                <th>{t('salesPage.table.dateTime')}</th>
                <th>{t('sale.customer')}</th>
                <th>{t('salesPage.table.totalAmount')}</th>
                <th>{t('salesPage.table.paymentStatus')}</th>
                <th>{t('salesPage.table.returnStatus')}</th>
                <th style={{ width: '110px' }}>{t('salesPage.table.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7}><div className="sales-empty-state"><div className="spinner-border spinner-border-sm me-2" /> {t('common.loading')}</div></td></tr>
              ) : sales.length === 0 ? (
                <tr><td colSpan={7}><div className="sales-empty-state"><span className="sales-empty-icon">🧾</span><p>{t('salesPage.noSalesFound')}</p></div></td></tr>
              ) : sales.map((sale, idx) => {
                const st = STATUS_STYLES[sale.paymentStatus] || STATUS_STYLES.paid;
                const rs = RETURN_STYLES[sale.returnStatus] || RETURN_STYLES.none;
                return (
                  <tr key={sale._id} className={idx % 2 === 0 ? 'sales-row-even' : 'sales-row-odd'}>
                    <td><span className="sales-invoice-badge"><BiHash size={12} />{sale.invoiceNo || t('common.notAvailable')}</span></td>
                    <td>
                      <div className="sales-date-cell">
                        <span className="sales-date-text">{formatDate(sale.createdAt)}</span>
                        <span className="sales-time-text"><BiTime size={12} /> {formatTime(sale.createdAt)}</span>
                      </div>
                    </td>
                    <td>
                      <div className="sales-customer-cell">
                        <span className="sales-customer-name">{sale.customer?.name || t('salesPage.invoice.walkIn')}</span>
                        {sale.customer?.phone && <span className="sales-customer-phone">{sale.customer.phone}</span>}
                      </div>
                    </td>
                    <td><span className="sales-amount">₹{Number(sale.totalAmount || sale.grandTotal || 0).toFixed(2)}</span></td>
                    <td><span className="sales-status-badge" style={{ background: st.bg, color: st.color }}>{st.label}</span></td>
                    <td><span className="sales-return-badge" style={{ background: rs.bg, color: rs.color }}>{rs.label}</span></td>
                    <td>
                      <div className="sales-actions">
                        <button className="sales-action-btn sales-action-view" title={t('salesPage.actions.view')} onClick={() => handleView(sale)}><BiShow size={16} /></button>
                        <button className="sales-action-btn sales-action-print" title={t('salesPage.actions.print')} onClick={() => handlePrintClick(sale)}><BiPrinter size={16} /></button>
                        <button className="sales-action-btn sales-action-return" title={t('salesPage.actions.return')} onClick={() => handleReturn(sale)}><BiUndo size={16} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
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
        ) : sales.length === 0 ? (
          <div className="text-center py-5" style={{ color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem', opacity: 0.5 }}>🧾</div>
            {t('salesPage.noSalesFound')}
          </div>
        ) : sales.map((sale) => {
          const st = STATUS_STYLES[sale.paymentStatus] || STATUS_STYLES.paid;
          const rs = RETURN_STYLES[sale.returnStatus] || RETURN_STYLES.none;
          const hasReturn = sale.returnStatus && sale.returnStatus !== 'none';
          return (
            <ExpandableCard
              key={sale._id}
              compact={
                <>
                  <div className="expandable-card__compact-row">
                    <span className="expandable-card__name" style={{ fontSize: '0.75rem' }}>{sale.invoiceNo || t('common.notAvailable')}</span>
                    <span className="expandable-card__price" style={{ fontSize: '0.85rem' }}>₹{Number(sale.totalAmount || sale.grandTotal || 0).toFixed(2)}</span>
                  </div>
                  <div className="expandable-card__meta">
                    <span className="expandable-card__meta-item">
                      <BiUser />
                      <span>{sale.customer?.name || t('salesPage.invoice.walkIn')}</span>
                    </span>
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                      {hasReturn ? (
                        <span className="sales-status-badge" style={{ background: rs.bg, color: rs.color, padding: '2px 8px', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 600 }}>{rs.label}</span>
                      ) : (
                        <span className="sales-status-badge" style={{ background: st.bg, color: st.color, padding: '2px 8px', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 600 }}>{st.label}</span>
                      )}
                    </div>
                  </div>
                </>
              }
              expanded={
                <div className="expandable-card__rows">
                  <div className="expandable-card__row">
                    <span className="expandable-card__row-label">{t('sale.invoice')}</span>
                    <span className="expandable-card__row-dots" />
                    <span className="expandable-card__row-value">{sale.invoiceNo || t('common.notAvailable')}</span>
                  </div>
                  <div className="expandable-card__row">
                    <span className="expandable-card__row-label">{t('sale.customer')}</span>
                    <span className="expandable-card__row-dots" />
                    <span className="expandable-card__row-value">{sale.customer?.name || t('salesPage.invoice.walkIn')}</span>
                  </div>
                  <div className="expandable-card__row">
                    <span className="expandable-card__row-label">{t('common.date')}</span>
                    <span className="expandable-card__row-dots" />
                    <span className="expandable-card__row-value">{formatDate(sale.createdAt)}</span>
                  </div>
                  <div className="expandable-card__row">
                    <span className="expandable-card__row-label">{t('salesPage.table.totalAmount')}</span>
                    <span className="expandable-card__row-dots" />
                    <span className="expandable-card__row-value">₹{Number(sale.totalAmount || sale.grandTotal || 0).toFixed(2)}</span>
                  </div>
                  <div className="expandable-card__row">
                    <span className="expandable-card__row-label">{t('salesPage.table.paidAmount')}</span>
                    <span className="expandable-card__row-dots" />
                    <span className="expandable-card__row-value">₹{Number(sale.paidAmount || 0).toFixed(2)}</span>
                  </div>
                  <div className="expandable-card__row">
                    <span className="expandable-card__row-label">{t('salesPage.table.dueAmount')}</span>
                    <span className="expandable-card__row-dots" />
                    <span className="expandable-card__row-value" style={sale.dueAmount > 0 ? { color: 'var(--danger)' } : undefined}>₹{Number(sale.dueAmount || 0).toFixed(2)}</span>
                  </div>
                  <div className="expandable-card__row">
                    <span className="expandable-card__row-label">{t('salesPage.table.paymentStatus')}</span>
                    <span className="expandable-card__row-dots" />
                    <span className="expandable-card__row-value"><span className="sales-status-badge" style={{ background: st.bg, color: st.color, padding: '2px 8px', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 600 }}>{st.label}</span></span>
                  </div>
                  <div className="expandable-card__row">
                    <span className="expandable-card__row-label">{t('salesPage.table.returnStatus')}</span>
                    <span className="expandable-card__row-dots" />
                    <span className="expandable-card__row-value"><span className="sales-return-badge" style={{ background: rs.bg, color: rs.color, padding: '2px 8px', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 600 }}>{rs.label}</span></span>
                  </div>
                </div>
              }
              actions={
                <>
                  <button className="btn-action btn-action-view" data-tooltip={t('salesPage.actions.view')} onClick={() => handleView(sale)}>
                    <BiShow />
                  </button>
                  <button className="btn-action btn-action-toggle" data-tooltip={t('salesPage.actions.print')} onClick={() => handlePrintClick(sale)}>
                    <BiPrinter />
                  </button>
                  <button className="btn-action btn-action-edit" data-tooltip={t('salesPage.actions.return')} onClick={() => handleReturn(sale)}>
                    <BiUndo />
                  </button>
                </>
              }
            />
          );
        })}
      </div>

      {totalPages > 1 && (
        <div className="sales-pagination">
          <span className="sales-pagination-info">{t('salesPage.pagination.info', { page, totalPages, total })}</span>
          <div className="sales-pagination-btns">
            <button className="sales-btn sales-btn-secondary sales-btn-sm" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}><BiChevronLeft size={16} /> {t('salesPage.pagination.previous')}</button>
            <button className="sales-btn sales-btn-secondary sales-btn-sm" disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>{t('salesPage.pagination.next')} <BiChevronRight size={16} /></button>
          </div>
        </div>
      )}

      <SaleViewDrawer open={drawerOpen} onClose={() => { setDrawerOpen(false); setViewingSale(null); }} sale={viewingSale} shopInfo={shopInfo} onPrint={handlePrintClick} onCopyInvoice={handleCopyInvoice} />
      <ReturnDrawer open={returnDrawerOpen} onClose={() => { setReturnDrawerOpen(false); setReturningSale(null); }} sale={returningSale} onReturnProcessed={handleReturnProcessed} />
      {showPrintPreview && printingSale && (
        <PrintPreview
          sale={printingSale}
          shopInfo={shopInfo}
          onClose={() => { setShowPrintPreview(false); setPrintingSale(null); }}
        />
      )}
    </div>
  );
};

export default Sales;