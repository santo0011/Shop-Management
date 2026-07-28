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
import Pagination from '../../components/common/Pagination';
  
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
  full: { bg: 'rgba(108, 99, 255, 0.1)', color: '#6C63FF', label: t('salesPage.returnStatusLabels.full') },
});

const getStatusOptions = (t) => [
  { key: '', label: t('salesPage.status.all') },
  { key: 'paid', label: t('common.paid') },
  { key: 'partial', label: t('common.partial') },
  { key: 'unpaid', label: t('common.due') },
];

const getDatePresets = (t) => [
  { key: 'today', label: t('common.today') },
  { key: '7d', label: t('common.last7Days') },
  { key: '30d', label: t('common.last30Days') },
  { key: 'month', label: t('common.thisMonth') },
  { key: 'custom', label: t('common.customRange') },
];

const PAYMENT_METHOD_ICONS = { cash: '💵', card: '💳', upi: '📱', mobile_banking: '🏦' };

const toDateInputValue = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

// ─── Sale View Drawer ────────────────────────────────────────
const SaleViewDrawer = ({ open, onClose, sale, shopInfo, onPrint, onCopyInvoice }) => {
  const { t } = useTranslation();
  const pmtIcon = PAYMENT_METHOD_ICONS[sale?.paymentMethod] || '💵';
  const pmtLabel = sale?.paymentMethod ? t(`sale.${sale.paymentMethod}`) : '-';

  // ─── GST Logic ──────────────────────────────────────────────
  const businessState = shopInfo?.settings?.businessState || shopInfo?.state || '';
  const customerState = sale?.customer?.state || '';
  const isIntrastate = !customerState || (businessState && customerState && businessState.toLowerCase().trim() === customerState.toLowerCase().trim());
  const gstRate = sale?.gstRate || 0;

  const totalDiscount = sale?.discount || 0;
  const saleSubtotal = sale?.subtotal || 0;
  const discountPct = saleSubtotal > 0 ? ((totalDiscount / saleSubtotal) * 100).toFixed(2) : '0.00';

  return (
    <>
      <div className={`drawer-overlay ${open ? 'open' : ''}`} onClick={onClose} />
      <div className={`drawer ${open ? 'open' : ''}`}>
        <div className="drawer-header">
          <h5><BiShow size={18} style={{ marginRight: 8, verticalAlign: 'middle' }} />{t('salesPage.drawer.title')}</h5>
          <button className="btn-close-premium" onClick={onClose}><BiX /></button>
        </div>
        <div className="drawer-body">
          {sale && (
            <>
              {/* Invoice Hero + Info in one unified card */}
              <div style={{
                marginBottom: '1.25rem',
                borderRadius: 'var(--border-radius-lg)',
                border: '1px solid var(--border-color)',
                overflow: 'hidden',
                background: 'var(--bg-card)',
              }}>
                {/* Invoice Number + Date */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '0.7rem 1rem',
                  background: 'linear-gradient(135deg, rgba(108,99,255,0.06), rgba(0,217,166,0.03))',
                  borderBottom: '1px solid var(--border-color)',
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: 'linear-gradient(135deg, #6C63FF, #00D9A6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, boxShadow: '0 3px 10px rgba(108,99,255,0.25)',
                  }}>
                    <BiReceipt size={18} style={{ color: '#fff' }} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                      {sale.invoiceNo || t('common.notAvailable')}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      <BiTime size={11} style={{ verticalAlign: 'middle', marginRight: 2 }} />{formatDate(sale.createdAt)}
                    </div>
                  </div>
                </div>

                {/* 3 Cards Row */}
                <div style={{ display: 'flex', gap: 8, padding: '0.6rem 0.75rem', flexWrap: 'wrap' }}>
                  {shopInfo && (
                    <div style={{
                      flex: 1, minWidth: 130,
                      background: 'var(--bg-card)',
                      borderRadius: 'var(--border-radius-md)',
                      border: '1px solid var(--border-color)',
                      padding: '0.5rem 0.7rem',
                      borderLeft: '3px solid var(--primary)',
                    }}>
                      <div style={{ fontSize: '0.58rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                        <BiStore size={11} style={{ color: 'var(--primary)' }} /> {t('salesPage.drawer.shop')}
                      </div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>{shopInfo?.name || '-'}</div>
                      {shopInfo?.phone && <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>📞 {shopInfo.phone}</div>}
                    </div>
                  )}

                  <div style={{
                    flex: 1, minWidth: 130,
                    background: 'var(--bg-card)',
                    borderRadius: 'var(--border-radius-md)',
                    border: '1px solid var(--border-color)',
                    padding: '0.5rem 0.7rem',
                    borderLeft: '3px solid #00D9A6',
                  }}>
                    <div style={{ fontSize: '0.58rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                      <BiUser size={11} style={{ color: '#00D9A6' }} /> {t('sale.customer')}
                    </div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>{sale.customer?.name || t('salesPage.invoice.walkIn')}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap', marginTop: 1 }}>
                      {sale.customer?.phone && <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>📞 {sale.customer.phone}</span>}
                      {sale.customer?.state && (
                        <span style={{ fontSize: '0.6rem', color: '#6C63FF', background: 'rgba(108,99,255,0.08)', padding: '0 5px', borderRadius: 3, fontWeight: 600 }}>
                          {sale.customer.state}
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{
                    flex: 1, minWidth: 130,
                    background: 'var(--bg-card)',
                    borderRadius: 'var(--border-radius-md)',
                    border: '1px solid var(--border-color)',
                    padding: '0.5rem 0.7rem',
                    borderLeft: '3px solid #F39C12',
                  }}>
                    <div style={{ fontSize: '0.58rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                      <BiCreditCard size={11} style={{ color: '#F39C12' }} /> {t('salesPage.drawer.payment')}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 700 }}>{pmtIcon}</span>
                      <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{pmtLabel}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 1, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#2ecc71' }}>₹{Number(sale.paidAmount || 0).toFixed(2)}</span>
                      {sale.dueAmount > 0 && (
                        <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#FF6B6B' }}>Due: ₹{Number(sale.dueAmount || 0).toFixed(2)}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Items Table - Enhanced */}
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.6rem' }}>
                  <BiCart size={16} /><span>{t('salesPage.drawer.itemsCount', { count: sale.items?.length || 0 })}</span>
                </div>
                <div style={{ borderRadius: 'var(--border-radius-md)', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', padding: '0.35rem 0.5rem', background: 'var(--bg-primary)', fontSize: '0.58rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.2px', borderBottom: '1px solid var(--border-color)' }}>
                    <span style={{ flex: 1.6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t('salesPage.invoice.item')}</span>
                    <span style={{ flex: 0.35, textAlign: 'center' }}>{t('salesPage.invoice.qty')}</span>
                    <span style={{ flex: 0.3, textAlign: 'center' }}>{t('salesPage.drawer.rtn')}</span>
                    <span style={{ flex: 0.5, textAlign: 'right' }}>{t('sale.discount')}</span>
                    {isIntrastate ? (
                      <>
                        <span style={{ flex: 0.6, textAlign: 'center' }}>CGST {gstRate > 0 ? `(${(gstRate/2)}%)` : ''}</span>
                        <span style={{ flex: 0.6, textAlign: 'center' }}>SGST {gstRate > 0 ? `(${(gstRate/2)}%)` : ''}</span>
                      </>
                    ) : (
                      <span style={{ flex: 0.6, textAlign: 'center' }}>IGST {gstRate > 0 ? `(${gstRate}%)` : ''}</span>
                    )}
                    <span style={{ flex: 0.5, textAlign: 'right' }}>{t('common.total')}</span>
                  </div>
                  {sale.items?.map((item, idx) => {
                    const itemGstRate = item.gstRate || gstRate;
                    const itemCgst = item.cgst || 0;
                    const itemSgst = item.sgst || 0;
                    const itemIgst = item.igst || 0;
                    const itemGstAmt = item.gstAmount || 0;
                    const baseTotal = (item.price * item.quantity);
                    const itemTaxable = item.taxableAmount || baseTotal;
                    const itemDiscountAmt = Math.max(0, baseTotal - itemTaxable);
                    return (
                      <div key={idx} style={{ display: 'flex', padding: '0.35rem 0.5rem', fontSize: '0.72rem', borderBottom: idx < sale.items.length - 1 ? '1px solid var(--border-light)' : 'none', background: 'var(--bg-card)' }}>
                        <span style={{ flex: 1.6, fontWeight: 600, wordBreak: 'break-word', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {item.product?.name || item.name || t('salesPage.invoice.item')}
                        </span>
                        <span style={{ flex: 0.35, textAlign: 'center', color: 'var(--text-secondary)' }}>{item.quantity}</span>
                        <span style={{ flex: 0.3, textAlign: 'center', color: (item.returnedQty || 0) > 0 ? '#6C63FF' : 'var(--text-muted)', fontWeight: (item.returnedQty || 0) > 0 ? 700 : 400 }}>
                          {item.returnedQty || '-'}
                        </span>
                        <span style={{ flex: 0.5, textAlign: 'right', color: itemDiscountAmt > 0 ? '#e74c3c' : 'var(--text-muted)', fontWeight: itemDiscountAmt > 0 ? 600 : 400 }}>
                          ₹{itemDiscountAmt.toFixed(2)}
                        </span>
                        {isIntrastate ? (
                          <>
                            <span style={{ flex: 0.6, textAlign: 'center', color: itemCgst > 0 ? '#17A2B8' : 'var(--text-muted)', fontWeight: itemCgst > 0 ? 600 : 400, fontSize: '0.65rem' }}>
                              {itemCgst > 0 ? `₹${itemCgst.toFixed(2)}` : '-'}
                            </span>
                            <span style={{ flex: 0.6, textAlign: 'center', color: itemSgst > 0 ? '#17A2B8' : 'var(--text-muted)', fontWeight: itemSgst > 0 ? 600 : 400, fontSize: '0.65rem' }}>
                              {itemSgst > 0 ? `₹${itemSgst.toFixed(2)}` : '-'}
                            </span>
                          </>
                        ) : (
                          <span style={{ flex: 0.6, textAlign: 'center', color: itemIgst > 0 ? '#6C63FF' : 'var(--text-muted)', fontWeight: itemIgst > 0 ? 600 : 400, fontSize: '0.65rem' }}>
                            {itemIgst > 0 ? `₹${itemIgst.toFixed(2)}` : '-'}
                          </span>
                        )}
                        <span style={{ flex: 0.5, textAlign: 'right', fontWeight: 700 }}>₹{Number(item.total).toFixed(2)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Billing Summary Card */}
              <div style={{
                marginBottom: '1rem',
                borderRadius: 'var(--border-radius-lg)',
                border: '1px solid rgba(108,99,255,0.2)',
                overflow: 'hidden',
                background: 'var(--bg-card)',
                boxShadow: '0 2px 12px rgba(108,99,255,0.08)',
              }}>
                <div style={{
                  padding: '0.6rem 1rem',
                  background: 'linear-gradient(135deg, rgba(108,99,255,0.08), rgba(0,217,166,0.05))',
                  borderBottom: '1px solid rgba(108,99,255,0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}>
                  <BiReceipt size={16} style={{ color: 'var(--primary)' }} />
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {t('salesPage.drawer.billingSummary')}
                  </span>
                </div>
                <div style={{ padding: '0.5rem 1rem', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0', fontSize: '0.8rem', color: 'var(--text-primary)' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{t('sale.subtotal')}</span>
                    <span style={{ fontWeight: 600 }}>₹{Number(sale.subtotal || 0).toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0', fontSize: '0.8rem', color: totalDiscount > 0 ? '#e74c3c' : 'var(--text-muted)', borderTop: '1px solid var(--border-light)' }}>
                    <span>{t('sale.discount')} ({discountPct}%)</span>
                    <span style={{ fontWeight: totalDiscount > 0 ? 600 : 400 }}>₹{Number(totalDiscount).toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0', fontSize: '0.8rem', color: 'var(--text-primary)', borderTop: '1px solid var(--border-light)' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{t('salesPage.drawer.taxableAmount')}</span>
                    <span style={{ fontWeight: 600 }}>₹{Number(sale.taxableAmount || 0).toFixed(2)}</span>
                  </div>
                  {isIntrastate && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0', fontSize: '0.8rem', color: sale.cgst > 0 ? '#17A2B8' : 'var(--text-muted)', borderTop: '1px solid var(--border-light)' }}>
                      <span>CGST <span style={{ fontSize: '0.7rem', fontWeight: 500 }}>({gstRate > 0 ? `${(gstRate / 2)}%` : ''})</span></span>
                      <span style={{ fontWeight: sale.cgst > 0 ? 600 : 400 }}>₹{Number(sale.cgst || 0).toFixed(2)}</span>
                    </div>
                  )}
                  {isIntrastate && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0', fontSize: '0.8rem', color: sale.sgst > 0 ? '#17A2B8' : 'var(--text-muted)', borderTop: '1px solid var(--border-light)' }}>
                      <span>SGST <span style={{ fontSize: '0.7rem', fontWeight: 500 }}>({gstRate > 0 ? `${(gstRate / 2)}%` : ''})</span></span>
                      <span style={{ fontWeight: sale.sgst > 0 ? 600 : 400 }}>₹{Number(sale.sgst || 0).toFixed(2)}</span>
                    </div>
                  )}
                  {!isIntrastate && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0', fontSize: '0.8rem', color: sale.igst > 0 ? '#6C63FF' : 'var(--text-muted)', borderTop: '1px solid var(--border-light)' }}>
                      <span>IGST <span style={{ fontSize: '0.7rem', fontWeight: 500 }}>({gstRate > 0 ? `${gstRate}%` : ''})</span></span>
                      <span style={{ fontWeight: sale.igst > 0 ? 600 : 400 }}>₹{Number(sale.igst || 0).toFixed(2)}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0', fontSize: '0.8rem', color: 'var(--text-primary)', borderTop: '1px solid var(--border-light)' }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{t('salesPage.drawer.totalGst')}</span>
                    <span style={{ fontWeight: 700, color: sale.gstAmount > 0 ? '#6C63FF' : 'var(--text-muted)' }}>₹{Number(sale.gstAmount || 0).toFixed(2)}</span>
                  </div>
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', padding: '0.55rem 0',
                    fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 700,
                    borderTop: '2px solid rgba(108,99,255,0.2)',
                    marginTop: 2,
                  }}>
                    <span>{t('salesPage.invoice.grandTotal')}</span>
                    <span style={{ fontSize: '1.05rem', color: 'var(--primary)' }}>₹{Number(sale.totalAmount || sale.grandTotal || 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {shopInfo?.address && (
                <div style={{ textAlign: 'center', padding: '0.6rem 0', borderTop: '1px dashed var(--border-color)', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  {formatAddress(shopInfo.address)}
                </div>
              )}
            </>
          )}
        </div>
        <div className="drawer-footer">
          <button className="btn-premium btn-premium-secondary btn-premium-sm" onClick={onClose}>{t('common.close')}</button>
          <button className="btn-premium btn-premium-primary btn-premium-sm" onClick={() => onPrint(sale)}><BiPrinter size={15} /> {t('common.print')}</button>
        </div>
      </div>
    </>
  );
};

// ─── Return Drawer ────────────────────────────────────────────
const ReturnDrawer = ({ open, onClose, sale, onReturnProcessed }) => {
  const { t } = useTranslation();
  const [returnItems, setReturnItems] = useState([]);
  const [reason, setReason] = useState('');
  const [refundMethod, setRefundMethod] = useState('cash');
  const [processing, setProcessing] = useState(false);
  const [showConfirmReturnAll, setShowConfirmReturnAll] = useState(false);
  const [returnHistory, setReturnHistory] = useState([]);

  useEffect(() => {
    if (sale) {
      // Calculate the effective refund ratio to match what backend will compute
      // item.total = GST-inclusive price without round-off
      // sale.totalAmount = what customer actually paid (includes round-off)
      const rawItemTotal = (sale.items || []).reduce((sum, i) => sum + (i.total || 0), 0);
      const effectiveTotal = sale.totalAmount || rawItemTotal;
      const refundRatio = rawItemTotal > 0 ? effectiveTotal / rawItemTotal : 1;

      setReturnItems(sale.items?.map((item) => {
        const finalUnitPrice = item.quantity > 0 ? (item.total || 0) / item.quantity : 0;
        // Apply refund ratio so frontend display matches backend calculation
        const effectiveUnitPrice = finalUnitPrice * refundRatio;
        return {
          productId: item.product?._id || item.productId,
          productName: item.product?.name || item.name || '',
          soldQty: item.quantity,
          returnedQty: item.returnedQty || 0,
          maxReturnable: item.quantity - (item.returnedQty || 0),
          returnQty: 0,
          refundAmount: 0,
          price: effectiveUnitPrice,
          itemReason: '',
        };
      }) || []);
      setReturnHistory(sale.returns || []);
      setReason('');
      setRefundMethod('cash');
      setShowConfirmReturnAll(false);
    }
  }, [sale]);

  const totalRefund = returnItems.reduce((sum, i) => sum + (i.refundAmount || 0), 0);
  const hasItems = returnItems.some(i => i.returnQty > 0);
  const allFullyReturned = returnItems.every(i => i.maxReturnable <= 0);

  const currentDue = sale?.dueAmount || 0;
  const currentPaid = sale?.paidAmount || 0;
  const willReduceDue = totalRefund > 0 && currentDue > 0 && totalRefund <= currentDue;
  const willReduceBoth = totalRefund > 0 && currentDue > 0 && totalRefund > currentDue;
  const cashRefundAmount = willReduceBoth ? totalRefund - currentDue : (currentDue === 0 ? totalRefund : 0);
  const dueReductionAmount = Math.min(totalRefund, currentDue);

  const handleQtyChange = (idx, val) => {
    const next = [...returnItems];
    const clamped = Math.max(0, Math.min(val, next[idx].maxReturnable));
    next[idx].returnQty = clamped;
    next[idx].refundAmount = clamped * next[idx].price;
    setReturnItems(next);
  };

  const handleReturnAllClick = () => {
    const next = returnItems.map(i => ({
      ...i,
      returnQty: i.maxReturnable,
      refundAmount: i.maxReturnable * i.price,
    }));
    setReturnItems(next);
    setShowConfirmReturnAll(true);
  };

  const executeReturnAll = () => {
    setShowConfirmReturnAll(false);
  };

  const handleSubmit = async () => {
    if (!sale || !hasItems || processing) return;
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

              {/* Items to return */}
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.6rem' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><BiCart size={16} /><span>{t('salesPage.returnDrawer.selectItemsToReturn', { count: returnItems.length })}</span></span>
                  <button onClick={handleReturnAllClick} disabled={processing || allFullyReturned} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid var(--primary)', background: 'transparent', color: 'var(--primary)', fontWeight: 600, fontSize: '0.7rem', cursor: 'pointer', whiteSpace: 'nowrap', opacity: allFullyReturned ? 0.5 : 1 }}>
                    <BiUndo size={13} style={{ verticalAlign: 'middle' }} /> {t('salesPage.returnDrawer.returnAllProducts')}
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {returnItems.map((item, idx) => {
                    const netUnitPrice = item.price;
                    return item.maxReturnable <= 0 ? null : (
                      <div key={idx} style={{
                        padding: '0.6rem',
                        borderRadius: 'var(--border-radius-md)',
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-color)',
                      }}>
                        {/* Product header - compact */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{ width: 24, height: 24, borderRadius: 6, background: 'rgba(255,107,107,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <BiUndo size={12} style={{ color: '#FF6B6B' }} />
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: '0.75rem', color: 'var(--text-primary)', lineHeight: 1.2 }}>{item.productName}</div>
                              <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>₹{Number(netUnitPrice).toFixed(2)} × {item.soldQty}</div>
                            </div>
                          </div>
                          {item.returnedQty > 0 && (
                            <span style={{ fontSize: '0.55rem', fontWeight: 600, padding: '1px 6px', borderRadius: 8, background: 'rgba(108,99,255,0.1)', color: '#6C63FF' }}>{item.returnedQty} ret</span>
                          )}
                        </div>

                        {/* Qty stats + Price row in one line */}
                        <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                          {[
                            { label: 'Sold', value: item.soldQty, bg: 'var(--bg-input)', color: 'var(--text-primary)' },
                            { label: 'Ret.', value: item.returnedQty, bg: 'var(--bg-input)', color: item.returnedQty > 0 ? '#6C63FF' : 'var(--text-muted)' },
                            { label: 'Avail', value: item.maxReturnable, bg: 'rgba(46,204,113,0.08)', color: '#2ecc71' },
                          ].map((s, si) => (
                            <div key={si} style={{ flex: 1, textAlign: 'center', padding: '3px 2px', borderRadius: 4, background: s.bg }}>
                              <div style={{ fontSize: '0.45rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{s.label}</div>
                              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: s.color }}>{s.value}</div>
                            </div>
                          ))}
                          <div style={{ flex: 1, textAlign: 'center', padding: '3px 2px', borderRadius: 4, background: 'rgba(108,99,255,0.04)' }}>
                            <div style={{ fontSize: '0.45rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>₹/Unit</div>
                            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#6C63FF' }}>₹{Number(netUnitPrice).toFixed(2)}</div>
                          </div>
                        </div>

                        {/* Qty control + Refund */}
                        <div style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '0.5rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 2 }}>Return Qty</div>
                            <div style={{ display: 'flex', alignItems: 'center', border: '1.5px solid var(--border-color)', borderRadius: 'var(--border-radius-sm)', overflow: 'hidden', background: 'var(--bg-card)' }}>
                              <button onClick={() => handleQtyChange(idx, item.returnQty - 1)} disabled={item.returnQty <= 0} style={{ width: 26, height: 26, flexShrink: 0, border: 'none', background: item.returnQty > 0 ? 'var(--bg-input)' : 'transparent', color: item.returnQty > 0 ? 'var(--text-secondary)' : 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 700, cursor: item.returnQty > 0 ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>-</button>
                              <input type="number" value={item.returnQty} onChange={(e) => handleQtyChange(idx, parseInt(e.target.value) || 0)} min="0" max={item.maxReturnable} style={{ flex: 1, border: 'none', outline: 'none', textAlign: 'center', fontSize: '0.78rem', fontWeight: 700, fontFamily: 'var(--font-family)', background: 'transparent', color: 'var(--text-primary)', width: 30, padding: '2px 0', MozAppearance: 'textfield' }} />
                              <button onClick={() => handleQtyChange(idx, item.returnQty + 1)} disabled={item.returnQty >= item.maxReturnable} style={{ width: 26, height: 26, flexShrink: 0, border: 'none', background: item.returnQty < item.maxReturnable ? 'var(--bg-input)' : 'transparent', color: item.returnQty < item.maxReturnable ? 'var(--text-secondary)' : 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 700, cursor: item.returnQty < item.maxReturnable ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                            </div>
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '0.5rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 2 }}>Refund</div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 26, borderRadius: 'var(--border-radius-sm)', fontWeight: 700, fontSize: '0.78rem', background: 'rgba(108,99,255,0.06)', border: '1.5px solid rgba(108,99,255,0.2)', color: '#6C63FF' }}>
                              ₹{(item.returnQty > 0 ? item.refundAmount : 0).toFixed(2)}
                            </div>
                          </div>
                        </div>

                        {/* Reason */}
                        <input type="text" placeholder="Reason (optional)" value={item.itemReason} onChange={(e) => { const n = [...returnItems]; n[idx].itemReason = e.target.value; setReturnItems(n); }} style={{ width: '100%', padding: '3px 8px', fontSize: '0.65rem', fontFamily: 'var(--font-family)', border: '1.5px solid var(--border-color)', borderRadius: 'var(--border-radius-sm)', background: 'var(--bg-card)', color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box' }} />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Refund Summary */}
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.6rem' }}>
                  <BiWallet size={16} /><span>Summary</span>
                </div>
                <div style={{ padding: '0.7rem 0.85rem', borderRadius: 'var(--border-radius-md)', background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Total Refund</span>
                    <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--primary)' }}>₹{Number(totalRefund || 0).toFixed(2)}</span>
                  </div>
                  {dueReductionAmount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, padding: '4px 6px', borderRadius: 4, background: 'rgba(255,107,107,0.06)' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#FF6B6B' }}>Due Reduced</span>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#FF6B6B' }}>-₹{Number(dueReductionAmount).toFixed(2)}</span>
                    </div>
                  )}
                  {cashRefundAmount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, padding: '4px 6px', borderRadius: 4, background: 'rgba(46,204,113,0.06)' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#2ecc71' }}>Cash Refund</span>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#2ecc71' }}>₹{Number(cashRefundAmount).toFixed(2)}</span>
                    </div>
                  )}
                  <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: 8, marginTop: 4 }}>
                    <select value={refundMethod} onChange={(e) => setRefundMethod(e.target.value)} style={{ width: '100%', padding: '6px 8px', fontSize: '0.75rem', fontFamily: 'var(--font-family)', border: '1.5px solid var(--border-color)', borderRadius: 'var(--border-radius-sm)', background: 'var(--bg-input)', color: 'var(--text-primary)', outline: 'none', marginBottom: 6 }}>
                      <option value="cash">{t('sale.cash')}</option>
                      <option value="card">{t('sale.card')}</option>
                      <option value="upi">{t('sale.upi')}</option>
                      <option value="mobile_banking">{t('sale.mobileBanking')}</option>
                    </select>
                    <input type="text" placeholder="Overall return reason" value={reason} onChange={(e) => setReason(e.target.value)} style={{ width: '100%', padding: '6px 8px', fontSize: '0.75rem', fontFamily: 'var(--font-family)', border: '1.5px solid var(--border-color)', borderRadius: 'var(--border-radius-sm)', background: 'var(--bg-card)', color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                </div>
              </div>

              {/* Return History */}
              {returnHistory.length > 0 && (
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.6rem' }}>
                    <BiFile size={16} /><span>Return History ({returnHistory.length})</span>
                  </div>
                  {returnHistory.map((ret, ri) => (
                    <div key={ri} style={{ padding: '0.5rem 0.7rem', borderRadius: 'var(--border-radius-sm)', background: 'var(--bg-input)', border: '1px solid var(--border-light)', marginBottom: 6, fontSize: '0.72rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontWeight: 600 }}>{formatDate(ret.returnDate)}</span>
                        <span style={{ fontWeight: 700, color: '#e74c3c' }}>-₹{Number(ret.totalRefund || 0).toFixed(2)}</span>
                      </div>
                      <div style={{ color: 'var(--text-secondary)' }}>
                        {ret.items?.map((ritem, rii) => (
                          <span key={rii}>{ritem.productName} x{ritem.quantity}{rii < ret.items.length - 1 ? ', ' : ''}</span>
                        ))}
                      </div>
                      {ret.reason && <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 2 }}>{ret.reason}</div>}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
        {sale && !allFullyReturned && (
          <div className="drawer-footer">
            <button className="btn-premium btn-premium-secondary btn-premium-sm" onClick={onClose}>{t('common.cancel')}</button>
            <button className="btn-premium btn-premium-primary btn-premium-sm" onClick={handleSubmit} disabled={!hasItems || processing}>
              {processing ? <><span className="spinner-border spinner-border-sm" /> Processing...</> : <><BiUndo size={16} /> Process Return (₹{Number(totalRefund || 0).toFixed(2)})</>}
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
                Return All Products?
              </h5>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                This will return all remaining returnable quantities for every item.
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
                Cancel
              </button>
              <button
                className="btn-premium btn-premium-primary btn-premium-sm"
                onClick={executeReturnAll}
              >
                <BiCheck size={16} /> Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// ─── Skeleton Loading ────────────────────────────────────────
const SalesSkeletonLoader = () => (
  <div>
    <style>{`@keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }`}</style>
    <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
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
        height: 36, width: 180,
        background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
        backgroundSize: '200% 100%', borderRadius: 8,
        animation: 'shimmer 1.5s infinite',
      }} />
    </div>
    <div className="row g-3 mb-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="col-6 col-md-3">
          <div className="premium-card" style={{ padding: '1rem', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
                backgroundSize: '200% 100%',
                animation: 'shimmer 1.5s infinite',
              }} />
              <div style={{ flex: 1 }}>
                <div style={{ height: 10, width: '60%', marginBottom: 6, background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)', backgroundSize: '200% 100%', borderRadius: 4, animation: 'shimmer 1.5s infinite' }} />
                <div style={{ height: 20, width: '80%', background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)', backgroundSize: '200% 100%', borderRadius: 6, animation: 'shimmer 1.5s infinite' }} />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
    <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} style={{ height: 36, width: i === 1 ? 200 : 90, background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)', backgroundSize: '200% 100%', borderRadius: 8, animation: 'shimmer 1.5s infinite' }} />
      ))}
    </div>
  </div>
);

const TableSkeletonRows = () => (
  <>
    {[1, 2, 3, 4, 5].map((r) => (
      <tr key={r} style={{ opacity: 0.5 }}>
        {[1, 2, 3, 4, 5, 6, 7].map((c) => (
          <td key={c} style={{ padding: '0.75rem 1rem' }}>
            <div style={{ height: 10, width: c === 3 ? '50%' : c === 2 ? '70%' : '40%', background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)', backgroundSize: '200% 100%', borderRadius: 4, animation: 'shimmer 1.5s infinite' }} />
          </td>
        ))}
      </tr>
    ))}
  </>
);

// ─── Main Sales Component ────────────────────────────────────
const Sales = () => {
  const { t } = useTranslation();
  const STATUS_STYLES = getStatusStyles(t);
  const RETURN_STYLES = getReturnStyles(t);
  const STATUS_OPTIONS = getStatusOptions(t);
  const DATE_PRESETS = getDatePresets(t);
  const [sales, setSales] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searching, setSearching] = useState(false);
  const [search, setSearch] = useState('');
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
  const dataVersionRef = useRef(0);

  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => setDebouncedSearch(search), 300);
    return () => { if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current); };
  }, [search]);

  useEffect(() => {
    api.get('/shops/my', { _skipLoading: true }).then(({ data }) => setShopInfo(data.shop || data)).catch(() => {});
  }, []);

  const fetchSales = useCallback(async ({ page: p = 1, isSearch = false } = {}) => {
    if (isFirstLoad.current) setInitialLoading(true);
    else setRefreshing(true);
    if (isSearch) setSearching(true);
    try {
      const params = new URLSearchParams({
        page: p, limit: 20, startDate, endDate,
        ...(paymentStatus ? { paymentStatus } : {}),
        ...(debouncedSearch ? { search: debouncedSearch } : {}),
      });
      const { data } = await api.get(`/sales?${params.toString()}`, { _skipLoading: true });
      setSales(data.sales || []);
      setTotalPages(data.pages || 1);
      setTotal(data.total || 0);
      setStats(data.stats || null);
      setPage(p);
    } catch (err) {
      console.error(err);
    } finally {
      setInitialLoading(false);
      setRefreshing(false);
      setSearching(false);
      if (isFirstLoad.current) isFirstLoad.current = false;
      dataVersionRef.current += 1;
    }
  }, [startDate, endDate, paymentStatus, debouncedSearch]);

  useEffect(() => {
    fetchSales({ page: 1, isSearch: false });
  }, [fetchSales, debouncedSearch, startDate, endDate, paymentStatus]);

  const refreshAll = useCallback(() => {
    fetchSales({ page: page, isSearch: false });
  }, [fetchSales, page]);

  const applyDatePreset = (key) => {
    setDatePreset(key);
    if (key === 'custom') return;
    const now = new Date();
    let start = new Date(now);
    const end = new Date(now);
    if (key === '7d') start.setDate(start.getDate() - 6);
    else if (key === '30d') start.setDate(start.getDate() - 29);
    else if (key === 'month') start = new Date(now.getFullYear(), now.getMonth(), 1);
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

  const statCards = [
    { label: t('salesPage.stats.totalSales'), value: stats?.totalSales || 0, icon: BiDollar, color: 'primary', isCurrency: true },
    { label: t('salesPage.stats.totalRevenue'), value: stats?.totalRevenue || 0, icon: BiWallet, color: 'success', isCurrency: true },
    { label: t('salesPage.stats.totalProfit'), value: stats?.totalProfit || 0, icon: BiTrendingUp, color: 'warning', isCurrency: true },
    { label: t('salesPage.stats.totalOrders'), value: stats?.totalOrders || 0, icon: BiCart, color: 'danger', isCurrency: false },
  ];

  if (initialLoading) return <SalesSkeletonLoader />;

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
                  <button type="button" role="tab" aria-selected={datePreset === p.key} className={`sales-date-pill ${datePreset === p.key ? 'active' : ''}`} onClick={() => applyDatePreset(p.key)}>
                    <BiCalendar /><span>{p.label}</span>
                  </button>
                  {idx === 2 && <span className="sales-date-break" aria-hidden="true" />}
                </React.Fragment>
              ))}
            </div>
          </div>
          {datePreset === 'custom' && (
            <>
              <div className="sales-filter"><BiCalendar size={14} className="sales-filter-icon-abs" /><input type="date" className="form-control sales-filter-input" style={{ paddingLeft: '30px' }} value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
              <div className="sales-filter"><BiCalendar size={14} className="sales-filter-icon-abs" /><input type="date" className="form-control sales-filter-input" style={{ paddingLeft: '30px' }} value={endDate} onChange={(e) => setEndDate(e.target.value)} /></div>
            </>
          )}
          <div className="sales-filter">
            <select className="form-control sales-filter-input" value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)}>
              {STATUS_OPTIONS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className={`sales-table-container table-container desktop-table ${searching || refreshing ? 'is-refreshing' : 'content-visible'}`} style={{ overflow: 'visible' }}>
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
              {refreshing ? (
                <TableSkeletonRows />
              ) : searching ? (
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
                      <div className="sales-customer-badge">
                        <BiUserCircle size={16} />
                        <span>{sale.customer?.name || t('salesPage.invoice.walkIn')}</span>
                      </div>
                    </td>
                    <td><span className="sales-amount">₹{Number(sale.totalAmount || sale.grandTotal || 0).toFixed(2)}</span></td>
                    <td>
                      <div className="sales-status-badge" style={{ background: st.bg, color: st.color }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: st.color, display: 'inline-block' }} />{st.label}
                      </div>
                    </td>
                    <td>
                      <div className="sales-return-badge" style={{ background: rs.bg, color: rs.color }}>{rs.label}</div>
                    </td>
                    <td className="sales-actions-cell" style={{ width: '120px', whiteSpace: 'nowrap' }}>
                      <button className="btn-action btn-action-view" data-tooltip={t('salesPage.actions.view')} title={t('salesPage.actions.view')} onClick={() => handleView(sale)}><BiShow /></button>
                      <button className="btn-action btn-action-toggle" data-tooltip={t('salesPage.actions.print')} title={t('salesPage.actions.print')} onClick={() => handlePrintClick(sale)}><BiPrinter /></button>
                      <button className="btn-action btn-action-edit" data-tooltip={t('salesPage.actions.return')} title={t('salesPage.actions.return')} onClick={() => handleReturn(sale)}><BiUndo /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mobile-cards">
        {refreshing ? (
          <>{[1, 2, 3].map((i) => (<div key={i} className="expandable-card" style={{ padding: '1rem', marginBottom: '0.75rem' }}><div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}><div style={{ height: 14, width: '35%', background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)', backgroundSize: '200% 100%', borderRadius: 4, animation: 'shimmer 1.5s infinite' }} /><div style={{ height: 14, width: '25%', background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)', backgroundSize: '200% 100%', borderRadius: 4, animation: 'shimmer 1.5s infinite' }} /></div></div>))}</>
        ) : searching ? (
          <div className="text-center py-4" style={{ color: 'var(--text-muted)' }}><div className="spinner-border spinner-border-sm me-2" /> {t('common.loading')}</div>
        ) : sales.length === 0 ? (
          <div className="text-center py-5" style={{ color: 'var(--text-muted)' }}><div style={{ fontSize: '2.5rem', marginBottom: '0.75rem', opacity: 0.35 }}>🧾</div><h5 style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{t('salesPage.noSalesFound')}</h5></div>
        ) : sales.map((sale) => {
          const st = STATUS_STYLES[sale.paymentStatus] || STATUS_STYLES.paid;
          const rs = RETURN_STYLES[sale.returnStatus] || RETURN_STYLES.none;
          const hasReturn = (sale.returnStatus && sale.returnStatus !== 'none');
          return (
            <ExpandableCard key={sale._id}
              compact={<>
                <div className="expandable-card__compact-row"><span className="expandable-card__name"><BiHash size={12} style={{ marginRight: 2 }} /> {sale.invoiceNo || t('common.notAvailable')}</span><span className="expandable-card__price">₹{Number(sale.totalAmount || sale.grandTotal || 0).toFixed(2)}</span></div>
                <div className="expandable-card__meta"><span className="expandable-card__meta-item"><BiUser /><span>{sale.customer?.name || t('salesPage.invoice.walkIn')}</span></span><div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>{hasReturn ? (<span className="sales-status-badge" style={{ background: rs.bg, color: rs.color, padding: '2px 8px', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 600 }}>{rs.label}</span>) : (<span className="sales-status-badge" style={{ background: st.bg, color: st.color, padding: '2px 8px', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 600 }}>{st.label}</span>)}</div></div>
              </>}
              expanded={<div className="expandable-card__rows">
                <div className="expandable-card__row"><span className="expandable-card__row-label">{t('sale.invoice')}</span><span className="expandable-card__row-dots" /><span className="expandable-card__row-value">{sale.invoiceNo || t('common.notAvailable')}</span></div>
                <div className="expandable-card__row"><span className="expandable-card__row-label">{t('sale.customer')}</span><span className="expandable-card__row-dots" /><span className="expandable-card__row-value">{sale.customer?.name || t('salesPage.invoice.walkIn')}</span></div>
                <div className="expandable-card__row"><span className="expandable-card__row-label">{t('common.date')}</span><span className="expandable-card__row-dots" /><span className="expandable-card__row-value">{formatDate(sale.createdAt)}</span></div>
                <div className="expandable-card__row"><span className="expandable-card__row-label">{t('salesPage.table.totalAmount')}</span><span className="expandable-card__row-dots" /><span className="expandable-card__row-value">₹{Number(sale.totalAmount || sale.grandTotal || 0).toFixed(2)}</span></div>
                <div className="expandable-card__row"><span className="expandable-card__row-label">{t('salesPage.table.paidAmount')}</span><span className="expandable-card__row-dots" /><span className="expandable-card__row-value">₹{Number(sale.paidAmount || 0).toFixed(2)}</span></div>
                <div className="expandable-card__row"><span className="expandable-card__row-label">{t('salesPage.table.dueAmount')}</span><span className="expandable-card__row-dots" /><span className="expandable-card__row-value" style={sale.dueAmount > 0 ? { color: 'var(--danger)' } : undefined}>₹{Number(sale.dueAmount || 0).toFixed(2)}</span></div>
                <div className="expandable-card__row"><span className="expandable-card__row-label">{t('salesPage.table.paymentStatus')}</span><span className="expandable-card__row-dots" /><span className="expandable-card__row-value"><span className="sales-status-badge" style={{ background: st.bg, color: st.color, padding: '2px 8px', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 600 }}>{st.label}</span></span></div>
                <div className="expandable-card__row"><span className="expandable-card__row-label">{t('salesPage.table.returnStatus')}</span><span className="expandable-card__row-dots" /><span className="expandable-card__row-value"><span className="sales-return-badge" style={{ background: rs.bg, color: rs.color, padding: '2px 8px', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 600 }}>{rs.label}</span></span></div>
              </div>}
              actions={<><button className="btn-action btn-action-view" title={t('salesPage.actions.view')} onClick={() => handleView(sale)}><BiShow /></button><button className="btn-action btn-action-toggle" title={t('salesPage.actions.print')} onClick={() => handlePrintClick(sale)}><BiPrinter /></button><button className="btn-action btn-action-edit" title={t('salesPage.actions.return')} onClick={() => handleReturn(sale)}><BiUndo /></button></>}
            />
          );
        })}
      </div>

      <Pagination page={page} totalPages={totalPages} totalCount={total} pageSize={20} onPageChange={setPage} />

      <SaleViewDrawer open={drawerOpen} onClose={() => { setDrawerOpen(false); setViewingSale(null); }} sale={viewingSale} shopInfo={shopInfo} onPrint={handlePrintClick} onCopyInvoice={handleCopyInvoice} />
      <ReturnDrawer open={returnDrawerOpen} onClose={() => { setReturnDrawerOpen(false); setReturningSale(null); }} sale={returningSale} onReturnProcessed={handleReturnProcessed} />
      {showPrintPreview && printingSale && (
        <PrintPreview sale={printingSale} shopInfo={shopInfo} onClose={() => { setShowPrintPreview(false); setPrintingSale(null); }} />
      )}
    </div>
  );
};

export default Sales;