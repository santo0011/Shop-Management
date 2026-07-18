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
  BiStore, BiQr, BiIdCard, BiUserCircle, BiCalendar,
  BiNote
} from 'react-icons/bi';

const PRINTER_SIZES = [
  { key: 'a4', label: 'A4 Invoice', icon: <BiFile size={18} />, width: '210mm' },
  { key: '80mm', label: '80mm Thermal', icon: <BiGridSmall size={18} />, width: '80mm' },
  { key: '58mm', label: '58mm Thermal', icon: <BiGridSmall size={18} />, width: '58mm' },
];

const INVOICE_TEMPLATES = [
  { key: 'classic', label: 'Classic', icon: <BiLayout size={18} /> },
  { key: 'modern', label: 'Modern', icon: <BiFile size={18} /> },
  { key: 'minimal', label: 'Minimal', icon: <BiGridSmall size={18} /> },
  { key: 'grocery', label: 'Grocery Store', icon: <BiStore size={18} /> },
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

const getPrinterSettings = () => {
  try {
    const saved = localStorage.getItem('pos_printer_settings');
    if (saved) return JSON.parse(saved);
  } catch {}
  return { size: '80mm', template: 'modern' };
};

const savePrinterSettings = (settings) => {
  try {
    localStorage.setItem('pos_printer_settings', JSON.stringify(settings));
  } catch {}
};

const getLastPayment = () => {
  try { return localStorage.getItem('pos_last_payment') || 'cash'; } catch { return 'cash'; }
};

const InvoiceQR = ({ invoiceNo, size = 60 }) => {
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

const PrinterSettingsModal = ({ currentSettings, onSelect, onClose }) => {
  const [size, setSize] = useState(currentSettings.size);
  const [template, setTemplate] = useState(currentSettings.template);
  const handleApply = () => { savePrinterSettings({ size, template }); onSelect({ size, template }); onClose(); };
  return (
    <div className="printer-settings-overlay" onClick={onClose}>
      <div className="printer-settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="printer-settings-header">
          <div className="printer-settings-header-left">
            <div className="printer-settings-icon"><BiPrinter size={22} /></div>
            <h3>Printer Settings</h3>
          </div>
          <button className="printer-settings-close" onClick={onClose}><BiX size={20} /></button>
        </div>
        <div className="printer-settings-body">
          <div className="printer-settings-group">
            <label className="printer-settings-label">Paper Size</label>
            <div className="printer-settings-options">
              {PRINTER_SIZES.map(s => (
                <button key={s.key} className={`printer-settings-option ${size === s.key ? 'active' : ''}`} onClick={() => setSize(s.key)}>{s.icon}<span>{s.label}</span></button>
              ))}
            </div>
          </div>
          <div className="printer-settings-group">
            <label className="printer-settings-label">Invoice Template</label>
            <div className="printer-settings-options">
              {INVOICE_TEMPLATES.map(t => (
                <button key={t.key} className={`printer-settings-option ${template === t.key ? 'active' : ''}`} onClick={() => setTemplate(t.key)}>{t.icon}<span>{t.label}</span></button>
              ))}
            </div>
          </div>
          <div className="printer-settings-preview-hint"><BiQr size={16} /><span>Invoice will include a QR code for easy tracking</span></div>
        </div>
        <div className="printer-settings-footer">
          <button className="printer-settings-btn printer-settings-btn-cancel" onClick={onClose}>Cancel</button>
          <button className="printer-settings-btn printer-settings-btn-apply" onClick={handleApply}><BiCheck size={16} /> Apply Settings</button>
        </div>
      </div>
    </div>
  );
};

const Invoice = React.forwardRef(({ sale, shopInfo, onClose, onPrint, onDownload, printerSettings, onSettingsChange }, ref) => {
  const { t } = useTranslation();
  const invoiceRef = useRef(null);
  const { size = '80mm', template = 'modern' } = printerSettings || {};
  const isThermal = size === '58mm' || size === '80mm';
  const isA4 = size === 'a4';
  const combinedRef = (node) => { invoiceRef.current = node; if (typeof ref === 'function') ref(node); else if (ref) ref.current = node; };
  const cashierName = shopInfo?.cashierName || 'Cashier';
  const footerMsg = shopInfo?.settings?.receiptFooter || 'Thank you for your purchase!';
  const taxName = shopInfo?.settings?.taxName || 'VAT';

  const renderClassic = () => (
    <div className={`receipt receipt-classic ${isA4 ? 'receipt-a4' : ''}`} style={isThermal ? { maxWidth: size === '58mm' ? '48mm' : '72mm' } : {}}>
      <div className="receipt-header">
        <div className="receipt-logo">{shopInfo?.logo ? <img src={shopInfo.logo} alt="Logo" className="receipt-logo-img" /> : <div className="receipt-logo-placeholder"><BiPackage size={isThermal ? 24 : 32} /></div>}</div>
        <h2 className="receipt-shop-name">{shopInfo?.shopName || 'Shop Name'}</h2>
        <p className="receipt-shop-address">{formatAddress(shopInfo?.address)}</p>
        {shopInfo?.phone && <p className="receipt-shop-address">Tel: {shopInfo.phone}</p>}
        {shopInfo?.email && <p className="receipt-shop-address">{shopInfo.email}</p>}
        {shopInfo?.gst && <p className="receipt-shop-address">GST: {shopInfo.gst}</p>}
        <div className="receipt-divider" />
      </div>
      <div className="receipt-info">
        <div className="receipt-info-row"><span className="receipt-label">Invoice No:</span><span className="receipt-value">{sale?.invoiceNo || 'N/A'}</span></div>
        <div className="receipt-info-row"><span className="receipt-label">Date:</span><span className="receipt-value">{formatDate(sale?.createdAt)}</span></div>
        <div className="receipt-info-row"><span className="receipt-label">Cashier:</span><span className="receipt-value">{cashierName}</span></div>
        <div className="receipt-info-row"><span className="receipt-label">Customer:</span><span className="receipt-value">{sale?.customer?.name || 'Walk-in Customer'}</span></div>
        {sale?.customer?.phone && <div className="receipt-info-row"><span className="receipt-label">Phone:</span><span className="receipt-value">{sale.customer.phone}</span></div>}
        {sale?.notes && <div className="receipt-info-row"><span className="receipt-label">Note:</span><span className="receipt-value">{sale.notes}</span></div>}
        <div className="receipt-divider" />
      </div>
      <div className="receipt-items">
        <div className="receipt-items-header"><span className="receipt-col-item">Item</span><span className="receipt-col-qty">Qty</span><span className="receipt-col-price">Price</span><span className="receipt-col-total">Total</span></div>
        {sale?.items?.map((item, idx) => (
          <div key={idx} className="receipt-item-row">
            <span className="receipt-col-item"><span className="receipt-item-name">{item.product?.name || item.name || 'Item'}</span>{item.discount > 0 && <span className="receipt-item-discount">-{item.discount}% off</span>}</span>
            <span className="receipt-col-qty">{item.quantity} {item.unit || ''}</span>
            <span className="receipt-col-price">₹{Number(item.price).toFixed(2)}</span>
            <span className="receipt-col-total">₹{Number(item.total).toFixed(2)}</span>
          </div>
        ))}
      </div>
      <div className="receipt-divider" />
      <div className="receipt-totals">
        <div className="receipt-total-row"><span>Subtotal</span><span>₹{Number(sale?.subtotal || 0).toFixed(2)}</span></div>
        {Number(sale?.discount || 0) > 0 && <div className="receipt-total-row receipt-discount"><span>Discount</span><span>-₹{Number(sale.discount).toFixed(2)}</span></div>}
        {Number(sale?.tax || 0) > 0 && <div className="receipt-total-row"><span>{taxName}</span><span>₹{Number(sale.tax).toFixed(2)}</span></div>}
        <div className="receipt-divider" />
        <div className="receipt-total-row receipt-grand-total"><span>Grand Total</span><span>₹{Number(sale?.totalAmount || sale?.grandTotal || 0).toFixed(2)}</span></div>
        <div className="receipt-total-row"><span>Paid</span><span>₹{Number(sale?.paidAmount || 0).toFixed(2)}</span></div>
        {Number(sale?.dueAmount || 0) > 0 && <div className="receipt-total-row receipt-due"><span>Due</span><span>₹{Number(sale.dueAmount).toFixed(2)}</span></div>}
        <div className="receipt-total-row"><span>Payment</span><span className="receipt-payment-method">{sale?.paymentMethod?.toUpperCase() || 'CASH'}</span></div>
      </div>
      <div className="receipt-divider" />
      <div className="receipt-footer">
        <p>{footerMsg}</p>
        <p className="receipt-footer-small">Visit us again!</p>
        {!isThermal && <div className="receipt-qr"><InvoiceQR invoiceNo={sale?.invoiceNo} size={isA4 ? 80 : 50} /></div>}
      </div>
    </div>
  );

  const renderModern = () => (
    <div className={`receipt receipt-modern ${isA4 ? 'receipt-a4' : ''}`} style={isThermal ? { maxWidth: size === '58mm' ? '48mm' : '72mm' } : {}}>
      <div className="receipt-modern-header">
        <div className="receipt-modern-brand">
          {shopInfo?.logo ? <img src={shopInfo.logo} alt="Logo" className="receipt-modern-logo" /> : <div className="receipt-modern-logo-placeholder"><BiPackage size={isThermal ? 20 : 28} /></div>}
          <div><h2 className="receipt-modern-shop-name">{shopInfo?.shopName || 'Shop Name'}</h2><p className="receipt-modern-address">{formatAddress(shopInfo?.address)}</p></div>
        </div>
        <div className="receipt-modern-badge"><span className="receipt-modern-invoice-badge">#{sale?.invoiceNo || 'N/A'}</span></div>
      </div>
      <div className="receipt-modern-meta">
        <div className="receipt-modern-meta-item"><BiCalendar size={12} /> {formatDate(sale?.createdAt)}</div>
        <div className="receipt-modern-meta-item"><BiUserCircle size={12} /> {cashierName}</div>
        <div className="receipt-modern-meta-item"><BiUser size={12} /> {sale?.customer?.name || 'Walk-in Customer'}</div>
        {shopInfo?.gst && <div className="receipt-modern-meta-item"><BiIdCard size={12} /> GST: {shopInfo.gst}</div>}
      </div>
      <div className="receipt-modern-divider" />
      <div className="receipt-modern-items">
        <div className="receipt-modern-items-header"><span>Item</span><span>Qty</span><span>Price</span><span>Total</span></div>
        {sale?.items?.map((item, idx) => (
          <div key={idx} className="receipt-modern-item">
            <div className="receipt-modern-item-name">{item.product?.name || item.name || 'Item'}</div>
            <div className="receipt-modern-item-details"><span>{item.quantity} {item.unit || ''}</span><span>₹{Number(item.price).toFixed(2)}</span><span className="receipt-modern-item-total">₹{Number(item.total).toFixed(2)}</span></div>
            {item.discount > 0 && <div className="receipt-modern-item-discount">-{item.discount}% off</div>}
          </div>
        ))}
      </div>
      <div className="receipt-modern-divider" />
      <div className="receipt-modern-totals">
        <div className="receipt-modern-total-row"><span>Subtotal</span><span>₹{Number(sale?.subtotal || 0).toFixed(2)}</span></div>
        {Number(sale?.discount || 0) > 0 && <div className="receipt-modern-total-row receipt-modern-discount"><span>Discount</span><span>-₹{Number(sale.discount).toFixed(2)}</span></div>}
        {Number(sale?.tax || 0) > 0 && <div className="receipt-modern-total-row"><span>{taxName}</span><span>₹{Number(sale.tax).toFixed(2)}</span></div>}
        <div className="receipt-modern-grand-total"><span>Grand Total</span><span className="receipt-modern-grand-amount">₹{Number(sale?.totalAmount || sale?.grandTotal || 0).toFixed(2)}</span></div>
        <div className="receipt-modern-total-row"><span>Paid</span><span className="receipt-modern-paid">₹{Number(sale?.paidAmount || 0).toFixed(2)}</span></div>
        {Number(sale?.dueAmount || 0) > 0 && <div className="receipt-modern-total-row"><span>Due</span><span className="receipt-modern-due">₹{Number(sale.dueAmount).toFixed(2)}</span></div>}
        <div className="receipt-modern-total-row"><span>Payment</span><span className="receipt-modern-payment-badge">{sale?.paymentMethod?.toUpperCase() || 'CASH'}</span></div>
      </div>
      <div className="receipt-modern-footer"><p>{footerMsg}</p>{!isThermal && <div className="receipt-qr"><InvoiceQR invoiceNo={sale?.invoiceNo} size={isA4 ? 80 : 50} /></div>}</div>
    </div>
  );

  const renderMinimal = () => (
    <div className={`receipt receipt-minimal ${isA4 ? 'receipt-a4' : ''}`} style={isThermal ? { maxWidth: size === '58mm' ? '48mm' : '72mm' } : {}}>
      <div className="receipt-minimal-header"><h2 className="receipt-minimal-shop-name">{shopInfo?.shopName || 'Shop Name'}</h2><p className="receipt-minimal-address">{formatAddress(shopInfo?.address)}</p>{shopInfo?.phone && <p className="receipt-minimal-address">{shopInfo.phone}</p>}</div>
      <div className="receipt-minimal-divider" />
      <div className="receipt-minimal-info">
        <div className="receipt-minimal-info-row"><span>Invoice</span><span>{sale?.invoiceNo || 'N/A'}</span></div>
        <div className="receipt-minimal-info-row"><span>Date</span><span>{formatDate(sale?.createdAt)}</span></div>
        <div className="receipt-minimal-info-row"><span>Customer</span><span>{sale?.customer?.name || 'Walk-in'}</span></div>
      </div>
      <div className="receipt-minimal-divider" />
      <div className="receipt-minimal-items">{sale?.items?.map((item, idx) => (
        <div key={idx} className="receipt-minimal-item"><div className="receipt-minimal-item-name">{item.product?.name || item.name || 'Item'}</div><div className="receipt-minimal-item-line"><span>{item.quantity} x ₹{Number(item.price).toFixed(2)}</span><span className="receipt-minimal-item-total">₹{Number(item.total).toFixed(2)}</span></div></div>
      ))}</div>
      <div className="receipt-minimal-divider" />
      <div className="receipt-minimal-totals">
        <div className="receipt-minimal-total-row"><span>Subtotal</span><span>₹{Number(sale?.subtotal || 0).toFixed(2)}</span></div>
        {Number(sale?.discount || 0) > 0 && <div className="receipt-minimal-total-row receipt-minimal-discount"><span>Discount</span><span>-₹{Number(sale.discount).toFixed(2)}</span></div>}
        <div className="receipt-minimal-total-row receipt-minimal-grand"><span>Total</span><span>₹{Number(sale?.totalAmount || sale?.grandTotal || 0).toFixed(2)}</span></div>
        <div className="receipt-minimal-total-row"><span>Paid</span><span>₹{Number(sale?.paidAmount || 0).toFixed(2)}</span></div>
        {Number(sale?.dueAmount || 0) > 0 && <div className="receipt-minimal-total-row receipt-minimal-due"><span>Due</span><span>₹{Number(sale.dueAmount).toFixed(2)}</span></div>}
      </div>
      <div className="receipt-minimal-footer"><p>{footerMsg}</p>{!isThermal && <div className="receipt-qr"><InvoiceQR invoiceNo={sale?.invoiceNo} size={isA4 ? 70 : 40} /></div>}</div>
    </div>
  );

  const renderGrocery = () => (
    <div className={`receipt receipt-grocery ${isA4 ? 'receipt-a4' : ''}`} style={isThermal ? { maxWidth: size === '58mm' ? '48mm' : '72mm' } : {}}>
      <div className="receipt-grocery-header">
        <div className="receipt-grocery-logo">{shopInfo?.logo ? <img src={shopInfo.logo} alt="Logo" className="receipt-grocery-logo-img" /> : <div className="receipt-grocery-logo-placeholder"><BiStore size={isThermal ? 20 : 28} /></div>}</div>
        <h2 className="receipt-grocery-shop-name">{shopInfo?.shopName || 'Grocery Store'}</h2>
        <p className="receipt-grocery-address">{formatAddress(shopInfo?.address)}</p>
        {shopInfo?.phone && <p className="receipt-grocery-phone">📞 {shopInfo.phone}</p>}
        {shopInfo?.gst && <p className="receipt-grocery-gst">GST: {shopInfo.gst}</p>}
      </div>
      <div className="receipt-grocery-divider" />
      <div className="receipt-grocery-info">
        <div className="receipt-grocery-info-row"><span>🧾 {sale?.invoiceNo || 'N/A'}</span><span>📅 {formatDate(sale?.createdAt)}</span></div>
        <div className="receipt-grocery-info-row"><span>👤 {sale?.customer?.name || 'Walk-in Customer'}</span><span>👨‍💼 {cashierName}</span></div>
      </div>
      <div className="receipt-grocery-divider" />
      <div className="receipt-grocery-items">
        <div className="receipt-grocery-items-header"><span>Item</span><span>Qty</span><span>₹</span><span>Total</span></div>
        {sale?.items?.map((item, idx) => (
          <div key={idx} className="receipt-grocery-item"><span className="receipt-grocery-item-name">{item.product?.name || item.name || 'Item'}</span><span className="receipt-grocery-item-qty">{item.quantity}{item.unit || ''}</span><span className="receipt-grocery-item-price">₹{Number(item.price).toFixed(2)}</span><span className="receipt-grocery-item-total">₹{Number(item.total).toFixed(2)}</span></div>
        ))}
      </div>
      <div className="receipt-grocery-divider" />
      <div className="receipt-grocery-totals">
        <div className="receipt-grocery-total-row"><span>Subtotal</span><span>₹{Number(sale?.subtotal || 0).toFixed(2)}</span></div>
        {Number(sale?.discount || 0) > 0 && <div className="receipt-grocery-total-row receipt-grocery-discount"><span>Discount</span><span>-₹{Number(sale.discount).toFixed(2)}</span></div>}
        <div className="receipt-grocery-total-row receipt-grocery-grand"><span>Total</span><span>₹{Number(sale?.totalAmount || sale?.grandTotal || 0).toFixed(2)}</span></div>
        <div className="receipt-grocery-total-row"><span>Paid</span><span>₹{Number(sale?.paidAmount || 0).toFixed(2)}</span></div>
        {Number(sale?.dueAmount || 0) > 0 && <div className="receipt-grocery-total-row receipt-grocery-due"><span>Due</span><span>₹{Number(sale.dueAmount).toFixed(2)}</span></div>}
        <div className="receipt-grocery-total-row"><span>Payment</span><span className="receipt-grocery-payment">{sale?.paymentMethod?.toUpperCase() || 'CASH'}</span></div>
      </div>
      <div className="receipt-grocery-divider" />
      <div className="receipt-grocery-footer"><p>🛒 {footerMsg}</p><p className="receipt-grocery-footer-small">Visit again for fresh groceries 🥦🍎</p>{!isThermal && <div className="receipt-qr"><InvoiceQR invoiceNo={sale?.invoiceNo} size={isA4 ? 80 : 50} /></div>}</div>
    </div>
  );

  const renderTemplate = () => { switch (template) { case 'classic': return renderClassic(); case 'modern': return renderModern(); case 'minimal': return renderMinimal(); case 'grocery': return renderGrocery(); default: return renderModern(); } };

  return (
    <div className="invoice-modal-overlay" onClick={onClose}>
      <div className="invoice-modal invoice-theme" onClick={(e) => e.stopPropagation()}>
        <div className="invoice-actions no-print">
          <button className="invoice-action-btn" onClick={onSettingsChange} title="Printer Settings"><BiPrinter size={16} /> {size.toUpperCase()} | {template.charAt(0).toUpperCase() + template.slice(1)}</button>
          <div className="invoice-actions-right">
            <button className="btn btn-premium btn-premium-primary btn-premium-sm" onClick={onPrint}><BiPrinter /> Print</button>
            <button className="btn btn-premium btn-premium-secondary btn-premium-sm" onClick={onDownload}><BiDownload /> PDF</button>
            <button className="btn-close-premium" onClick={onClose}><BiX /></button>
          </div>
        </div>
        <div className={`invoice-content invoice-content-${size}`} ref={combinedRef}>{renderTemplate()}</div>
      </div>
    </div>
  );
});
Invoice.displayName = 'Invoice';

const ConfirmSaleModal = ({ data, onConfirm, onCancel, loading }) => {
  const { t } = useTranslation();
  const [selectedPayment, setSelectedPayment] = useState(data.paymentMethod || 'cash');
  const formatDateTime = () => { const now = new Date(); return now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }); };
  const paymentMethods = [
    { key: 'cash', icon: <BiMoney size={18} />, label: 'Cash', color: '#2ecc71' },
    { key: 'card', icon: <BiCreditCard size={18} />, label: 'Card', color: '#6C63FF' },
    { key: 'upi', icon: <BiMobile size={18} />, label: 'UPI', color: '#00D9A6' },
    { key: 'mobile_banking', icon: <BiBookmark size={18} />, label: 'Mobile Banking', color: '#FF6B9D' },
  ];
  const summaryCards = [
    { icon: <BiShoppingBag size={16} />, label: 'Total Items', value: `${data.totalItems} items`, color: '#6C63FF' },
    { icon: <BiDollar size={16} />, label: 'Subtotal', value: `₹${data.subtotal.toFixed(2)}`, color: '#17A2B8' },
    { icon: <BiTag size={16} />, label: 'Discount', value: `-₹${data.discount.toFixed(2)}`, color: data.discount > 0 ? '#FF6B6B' : '#9a9ab0' },
    { icon: <BiCrown size={16} />, label: 'Grand Total', value: `₹${data.grandTotal.toFixed(2)}`, color: '#6C63FF', highlight: true },
    { icon: <BiCheckCircle size={16} />, label: 'Paid Amount', value: `₹${data.paidAmount.toFixed(2)}`, color: '#2ecc71' },
    { icon: <BiErrorCircle size={16} />, label: 'Due Amount', value: `₹${data.dueAmount.toFixed(2)}`, color: data.dueAmount > 0 ? '#FF6B6B' : '#2ecc71' },
    { icon: <BiWallet size={16} />, label: 'Payment Method', value: selectedPayment.toUpperCase(), badge: true, color: '#6C63FF' },
  ];
  return (
    <div className="confirm-sale-overlay" onClick={onCancel}>
      <div className="confirm-sale-modal" onClick={(e) => e.stopPropagation()}>
        <div className="confirm-sale-header">
          <div className="confirm-sale-header-left"><div className="confirm-sale-header-icon"><BiReceipt size={24} /></div><div><h3 className="confirm-sale-title">Confirm Sale</h3><span className="confirm-sale-datetime">{formatDateTime()}</span></div></div>
          <button className="confirm-sale-close" onClick={onCancel}><BiX size={22} /></button>
        </div>
        <div className="confirm-sale-body">
          <div className="confirm-sale-cards">{summaryCards.map((card, idx) => (
            <div key={idx} className={`confirm-sale-card ${card.highlight ? 'confirm-sale-card-highlight' : ''}`} style={{ '--card-accent': card.color }}>
              <div className="confirm-sale-card-icon" style={{ color: card.color }}>{card.icon}</div>
              <div className="confirm-sale-card-info"><span className="confirm-sale-card-label">{card.label}</span>{card.badge ? <span className="confirm-sale-card-badge" style={{ background: card.color }}>{card.value}</span> : <span className={`confirm-sale-card-value ${card.label === 'Paid Amount' && data.paidAmount > 0 ? 'confirm-sale-value-green' : ''} ${card.label === 'Due Amount' ? (data.dueAmount > 0 ? 'confirm-sale-value-red' : 'confirm-sale-value-green') : ''} ${card.highlight ? 'confirm-sale-value-grand' : ''}`}>{card.value}</span>}</div>
            </div>
          ))}</div>
 
          <div className="confirm-sale-actions">
            <button className="confirm-sale-btn confirm-sale-btn-primary" onClick={() => onConfirm(selectedPayment)} disabled={loading}>{loading ? <span className="confirm-sale-btn-loading"><span className="spinner-border spinner-border-sm" /> Processing...</span> : <><BiPrinter size={18} /><span>Generate & Print Bill</span></>}</button>
          </div>
        </div>
      </div>
    </div>
  );
};

const POS = () => {
  const { t } = useTranslation();
  const [products, setProducts] = useState([]);
  const [topSelling, setTopSelling] = useState([]);
  const [recentSales, setRecentSales] = useState([]);
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState('');
  const [searching, setSearching] = useState(false);
  const [customer, setCustomer] = useState('');
  const [customers, setCustomers] = useState([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false);
  const [selectedCustomerData, setSelectedCustomerData] = useState(null);
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [addCustomerForm, setAddCustomerForm] = useState({ name: '', phone: '', address: '' });
  const customerSearchRef = useRef(null);
  const customerDropdownRef = useRef(null);
  const [paymentMethod, setPaymentMethod] = useState(getLastPayment);
  const [paidAmount, setPaidAmount] = useState(0);
  const [showInvoice, setShowInvoice] = useState(false);
  const [lastSale, setLastSale] = useState(null);
  const [shopInfo, setShopInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showTopSelling, setShowTopSelling] = useState(true);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmData, setConfirmData] = useState(null);
  const [printerSettings, setPrinterSettings] = useState(getPrinterSettings);
  const [showPrinterSettings, setShowPrinterSettings] = useState(false);
  const [discountMode, setDiscountMode] = useState('percent');
  const [discountValue, setDiscountValue] = useState(0);
  const [customerNote, setCustomerNote] = useState('');
  const searchRef = useRef(null);
  const invoiceRef = useRef(null);

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

  const handleAddCustomer = async () => {
    if (!addCustomerForm.name || !addCustomerForm.phone) {
      showToast.error('Name and phone are required');
      return;
    }
    try {
      const { data } = await api.post('/customers', addCustomerForm);
      setCustomers(prev => [...prev, data]);
      setCustomer(data._id);
      setSelectedCustomerData(data);
      setShowAddCustomer(false);
      setAddCustomerForm({ name: '', phone: '', address: '' });
      showToast.success('Customer added successfully');
    } catch (err) {
      showToast.error(err.response?.data?.message || 'Failed to add customer');
    }
  };

  useEffect(() => { searchRef.current?.focus(); }, []);

  useEffect(() => {
    loadTopSelling();
    loadRecentSales();
    api.get('/customers?limit=50').then(({ data }) => setCustomers(data.customers || [])).catch(() => {});
    api.get('/shops/my').then(({ data }) => setShopInfo(data.shop || data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!search.trim()) { setShowTopSelling(true); setProducts([]); return; }
    setShowTopSelling(false);
    const timer = setTimeout(() => searchProducts(), 200);
    return () => clearTimeout(timer);
  }, [search]);

  const loadTopSelling = async () => { try { const { data } = await api.get('/sales/top-selling?limit=20'); setTopSelling(Array.isArray(data) ? data : []); } catch (err) { console.error(err); } };
  const loadRecentSales = async () => { try { const { data } = await api.get('/sales/recent?limit=5'); setRecentSales(data.sales || []); } catch (err) { console.error(err); } };
  const searchProducts = async () => {
    setSearching(true);
    try {
      const { data } = await api.get(`/products/search?q=${search}`, { _skipLoading: true });
      setProducts(Array.isArray(data) ? data : data.products || []);
    } catch (err) {
      console.error(err);
      setProducts([]);
    } finally {
      setSearching(false);
    }
  };

  const addToCart = useCallback((product) => {
    if (product.stock <= 0) { showToast.warning(`${product.name} is out of stock`); return; }
    setCart(prev => {
      const existing = prev.find(item => item.product._id === product._id);
      if (existing) {
        if (existing.quantity >= product.stock) { showToast.warning(`Only ${product.stock} ${product.unit || 'pcs'} available`); return prev; }
        return prev.map(item => item.product._id === product._id ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.price } : item);
      }
      return [...prev, { product, quantity: 1, price: product.sellingPrice, discount: product.discount || 0, total: product.sellingPrice }];
    });
  }, []);

  const updateQty = useCallback((id, delta) => {
    setCart(prev => prev.map(item => {
      if (item.product._id === id) {
        const newQty = Math.max(1, item.quantity + delta);
        if (newQty > item.product.stock) { showToast.warning(`Only ${item.product.stock} ${item.product.unit || 'pcs'} available`); return item; }
        return { ...item, quantity: newQty, total: newQty * item.price };
      }
      return item;
    }));
  }, []);

  const removeItem = useCallback((id) => { setCart(prev => prev.filter(item => item.product._id !== id)); }, []);

  const clearCart = () => {
    setCart([]);
    setPaidAmount(0);
    setCustomer('');
    setDiscountValue(0);
    setDiscountMode('percent');
    setCustomerNote('');
    setPaymentMethod(getLastPayment());
  };

  const taxRate = shopInfo?.settings?.taxRate ?? 0;
  const taxName = shopInfo?.settings?.taxName || 'VAT';
  const receiptFooter = shopInfo?.settings?.receiptFooter || 'Thank you for your purchase!';
  const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
  const itemDiscount = cart.reduce((sum, item) => sum + ((item.price * item.discount / 100) * item.quantity), 0);
  const extraDiscount = discountMode === 'percent' ? (subtotal - itemDiscount) * (discountValue / 100) : discountValue;
  const totalDiscount = itemDiscount + extraDiscount;
  const taxableAmount = subtotal - totalDiscount;
  const tax = taxableAmount > 0 ? taxableAmount * (taxRate / 100) : 0;
  const grandTotal = subtotal + tax - totalDiscount;
  const dueAmount = Math.max(0, grandTotal - paidAmount);
  const change = Math.max(0, paidAmount - grandTotal);
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  useEffect(() => { if (paidAmount === 0 && grandTotal > 0) setPaidAmount(grandTotal); }, [grandTotal]);
  useEffect(() => { try { localStorage.setItem('pos_last_payment', paymentMethod); } catch {} }, [paymentMethod]);

  const handleOpenConfirm = () => {
    if (cart.length === 0) return;
    setConfirmData({ totalItems, subtotal, discount: totalDiscount, grandTotal, paidAmount, dueAmount, paymentMethod, tax, taxRate, taxName, extraDiscount, customerNote });
    setShowConfirmModal(true);
  };

  const handleProcessSale = async (selectedPayment) => {
    if (cart.length === 0) return;
    setLoading(true);
    try {
      const payload = {
        customer: customer || null,
        items: cart.map(item => ({ product: item.product._id, quantity: item.quantity, unit: item.product.unit, price: item.price, discount: item.discount, tax: item.product.tax || 0, total: item.total })),
        subtotal, discount: totalDiscount, tax, totalAmount: grandTotal, paidAmount: Math.max(paidAmount, grandTotal), dueAmount, paymentMethod: selectedPayment, posType: 'pos', notes: customerNote,
      };
      const { data } = await api.post('/sales', payload);
      const saleDetail = await api.get(`/sales/${data._id || data.sale}`);
      const saleData = saleDetail.data.sale || saleDetail.data;
      setLastSale({ ...saleData, invoiceNo: data.invoiceNo || saleData.invoiceNo, totalAmount: data.totalAmount || saleData.totalAmount || grandTotal, paidAmount: data.paidAmount || saleData.paidAmount || paidAmount, dueAmount: data.dueAmount || saleData.dueAmount || dueAmount, paymentMethod: selectedPayment, notes: customerNote });
      setShowConfirmModal(false);
      setShowInvoice(true);
      clearCart();
      loadTopSelling();
      loadRecentSales();
      showToast.success(`Invoice ${data.invoiceNo || ''} generated successfully`);
    } catch (err) { showToast.error(err.response?.data?.message || 'Checkout failed'); }
    finally { setLoading(false); }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const content = invoiceRef.current?.innerHTML || '';
    const isThermal = printerSettings.size === '58mm' || printerSettings.size === '80mm';
    const pageWidth = printerSettings.size === '58mm' ? '58mm' : printerSettings.size === '80mm' ? '80mm' : '210mm';
    printWindow.document.write(`<!DOCTYPE html><html><head><title>Invoice - ${lastSale?.invoiceNo || ''}</title><style>@page{width:${pageWidth};margin:${isThermal?'0':'10mm'};padding:${isThermal?'3mm':'0'}}*{margin:0;padding:0;box-sizing:border-box}body{font-family:${isThermal?"'Courier New',monospace":"'Inter',-apple-system,sans-serif"};width:100%;padding:${isThermal?'3mm':'0'};font-size:${isThermal?(printerSettings.size==='58mm'?'10px':'11px'):'14px'};line-height:1.4;color:#000;background:#fff}.receipt{max-width:100%;margin:0 auto}.receipt-a4{max-width:190mm;padding:10mm}.receipt-header,.receipt-modern-header,.receipt-minimal-header,.receipt-grocery-header{text-align:center;margin-bottom:${isThermal?'4px':'12px'}}.receipt-logo{margin-bottom:${isThermal?'3px':'8px'}}.receipt-logo-img{max-width:${isThermal?'50px':'80px'};max-height:${isThermal?'50px':'80px'}}.receipt-logo-placeholder,.receipt-modern-logo-placeholder,.receipt-grocery-logo-placeholder{width:${isThermal?'36px':'60px'};height:${isThermal?'36px':'60px'};margin:0 auto;border-radius:50%;background:linear-gradient(135deg,#6C63FF,#00D9A6);display:flex;align-items:center;justify-content:center;color:#fff;font-size:${isThermal?'14px':'24px'}}.receipt-shop-name{font-size:${isThermal?'13px':'18px'};font-weight:800;margin-bottom:2px}.receipt-shop-address{font-size:${isThermal?'9px':'11px'};color:#555;line-height:1.3}.receipt-divider{border-top:1px dashed #999;margin:${isThermal?'4px':'8px'}0}.receipt-info{margin-bottom:${isThermal?'4px':'8px'}}.receipt-info-row{display:flex;justify-content:space-between;font-size:${isThermal?'10px':'12px'};margin-bottom:2px}.receipt-label{color:#888}.receipt-value{font-weight:700}.receipt-items{margin-bottom:${isThermal?'4px':'8px'}}.receipt-items-header{display:flex;font-weight:700;font-size:${isThermal?'9px':'11px'};border-bottom:1px solid #333;padding-bottom:3px;margin-bottom:3px}.receipt-col-item{flex:2;overflow:hidden;text-overflow:ellipsis;white-space:${isThermal?'nowrap':'normal'}}.receipt-col-qty{flex:0.6;text-align:center}.receipt-col-price{flex:0.8;text-align:right}.receipt-col-total{flex:0.8;text-align:right}.receipt-item-row{display:flex;font-size:${isThermal?'9px':'11px'};margin-bottom:2px;padding-bottom:2px;border-bottom:1px dotted #ddd}.receipt-item-name{display:block;word-break:break-word}.receipt-item-discount{font-size:8px;color:#e74c3c}.receipt-totals{margin-bottom:${isThermal?'4px':'8px'}}.receipt-total-row{display:flex;justify-content:space-between;font-size:${isThermal?'10px':'12px'};margin-bottom:2px}.receipt-discount{color:#e74c3c}.receipt-due{color:#e74c3c;font-weight:700}.receipt-grand-total{font-size:${isThermal?'12px':'16px'};font-weight:800}.receipt-payment-method{font-weight:800;color:#2ecc71}.receipt-footer{text-align:center;font-size:${isThermal?'9px':'11px'};color:#888;margin-top:${isThermal?'4px':'8px'}}.receipt-footer-small{font-size:8px}.receipt-qr{display:flex;justify-content:center;margin-top:${isThermal?'4px':'12px'}}.no-print{display:none!important}.receipt-modern-header{display:flex;justify-content:space-between;align-items:flex-start;text-align:left;margin-bottom:8px}.receipt-modern-brand{display:flex;align-items:center;gap:8px}.receipt-modern-logo{max-width:50px;max-height:50px;border-radius:8px}.receipt-modern-shop-name{font-size:${isThermal?'12px':'16px'};font-weight:800}.receipt-modern-address{font-size:${isThermal?'8px':'10px'};color:#666}.receipt-modern-invoice-badge{background:#6C63FF;color:#fff;padding:2px 8px;border-radius:4px;font-size:${isThermal?'9px':'11px'};font-weight:700}.receipt-modern-meta{display:flex;flex-wrap:wrap;gap:4px 12px;font-size:${isThermal?'9px':'11px'};color:#555;margin-bottom:6px}.receipt-modern-meta-item{display:flex;align-items:center;gap:3px}.receipt-modern-divider{border-top:2px solid #6C63FF;margin:6px 0}.receipt-modern-items{margin-bottom:6px}.receipt-modern-items-header{display:flex;justify-content:space-between;font-weight:700;font-size:${isThermal?'9px':'11px'};padding:4px 0;border-bottom:1px solid #ddd}.receipt-modern-item{padding:4px 0;border-bottom:1px dotted #eee}.receipt-modern-item-name{font-weight:600;font-size:${isThermal?'10px':'12px'}}.receipt-modern-item-details{display:flex;justify-content:space-between;font-size:${isThermal?'9px':'11px'};color:#555}.receipt-modern-item-total{font-weight:700;color:#333}.receipt-modern-item-discount{font-size:8px;color:#e74c3c}.receipt-modern-totals{margin-bottom:6px}.receipt-modern-total-row{display:flex;justify-content:space-between;font-size:${isThermal?'10px':'12px'};margin-bottom:2px}.receipt-modern-discount{color:#e74c3c}.receipt-modern-grand-total{display:flex;justify-content:space-between;font-size:${isThermal?'13px':'18px'};font-weight:800;padding:4px 0;border-top:2px solid #6C63FF;margin-top:4px}.receipt-modern-grand-amount{color:#6C63FF}.receipt-modern-paid{color:#2ecc71;font-weight:700}.receipt-modern-due{color:#e74c3c;font-weight:700}.receipt-modern-payment-badge{background:#2ecc71;color:#fff;padding:1px 6px;border-radius:3px;font-size:${isThermal?'9px':'11px'};font-weight:700}.receipt-modern-footer{text-align:center;font-size:${isThermal?'9px':'11px'};color:#888;margin-top:6px}.receipt-minimal-header{text-align:center;margin-bottom:6px}.receipt-minimal-shop-name{font-size:${isThermal?'14px':'20px'};font-weight:300;letter-spacing:1px;text-transform:uppercase}.receipt-minimal-address{font-size:${isThermal?'8px':'10px'};color:#999}.receipt-minimal-divider{border-top:1px solid #333;margin:4px 0}.receipt-minimal-info{margin-bottom:4px}.receipt-minimal-info-row{display:flex;justify-content:space-between;font-size:${isThermal?'9px':'11px'};color:#555;margin-bottom:1px}.receipt-minimal-items{margin-bottom:4px}.receipt-minimal-item{padding:3px 0;border-bottom:1px dotted #eee}.receipt-minimal-item-name{font-size:${isThermal?'10px':'12px'};font-weight:500}.receipt-minimal-item-line{display:flex;justify-content:space-between;font-size:${isThermal?'9px':'11px'};color:#666}.receipt-minimal-item-total{font-weight:600;color:#333}.receipt-minimal-totals{margin-bottom:4px}.receipt-minimal-total-row{display:flex;justify-content:space-between;font-size:${isThermal?'10px':'12px'};margin-bottom:2px}.receipt-minimal-discount{color:#e74c3c}.receipt-minimal-grand{font-size:${isThermal?'13px':'16px'};font-weight:800;border-top:1px solid #333;padding-top:4px;margin-top:4px}.receipt-minimal-due{color:#e74c3c}.receipt-minimal-footer{text-align:center;font-size:${isThermal?'9px':'11px'};color:#999;margin-top:6px;font-style:italic}.receipt-grocery-header{text-align:center;margin-bottom:6px}.receipt-grocery-logo{margin-bottom:4px}.receipt-grocery-logo-img{max-width:${isThermal?'40px':'70px'};max-height:${isThermal?'40px':'70px'}}.receipt-grocery-shop-name{font-size:${isThermal?'13px':'18px'};font-weight:800;color:#2ecc71}.receipt-grocery-address{font-size:${isThermal?'8px':'10px'};color:#666}.receipt-grocery-phone{font-size:${isThermal?'9px':'11px'};color:#333}.receipt-grocery-gst{font-size:${isThermal?'8px':'10px'};color:#999}.receipt-grocery-divider{border-top:2px solid #2ecc71;margin:4px 0}.receipt-grocery-info{margin-bottom:4px}.receipt-grocery-info-row{display:flex;justify-content:space-between;font-size:${isThermal?'9px':'11px'};color:#555;margin-bottom:2px}.receipt-grocery-items{margin-bottom:4px}.receipt-grocery-items-header{display:flex;font-weight:700;font-size:${isThermal?'9px':'11px'};border-bottom:1px solid #2ecc71;padding-bottom:3px;margin-bottom:3px;color:#2ecc71}.receipt-grocery-item{display:flex;font-size:${isThermal?'9px':'11px'};padding:2px 0;border-bottom:1px dotted #eee}.receipt-grocery-item-name{flex:2;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.receipt-grocery-item-qty{flex:0.6;text-align:center}.receipt-grocery-item-price{flex:0.7;text-align:right}.receipt-grocery-item-total{flex:0.7;text-align:right;font-weight:600}.receipt-grocery-totals{margin-bottom:4px}.receipt-grocery-total-row{display:flex;justify-content:space-between;font-size:${isThermal?'10px':'12px'};margin-bottom:2px}.receipt-grocery-discount{color:#e74c3c}.receipt-grocery-grand{font-size:${isThermal?'13px':'16px'};font-weight:800;color:#2ecc71;border-top:1px solid #2ecc71;padding-top:4px;margin-top:4px}.receipt-grocery-due{color:#e74c3c}.receipt-grocery-payment{background:#2ecc71;color:#fff;padding:1px 6px;border-radius:3px;font-weight:700}.receipt-grocery-footer{text-align:center;font-size:${isThermal?'9px':'11px'};color:#2ecc71;margin-top:6px}.receipt-grocery-footer-small{font-size:8px;color:#888}</style></head><body>${content}</body></html>`);
    printWindow.document.close();
    setTimeout(() => { printWindow.focus(); printWindow.print(); }, 500);
  };

  const handleDownloadPDF = async () => {
    try {
      const html2canvas = (await import('html2canvas')).default;
      const jsPDF = (await import('jspdf')).default;
      const element = invoiceRef.current;
      if (!element) return;
      const canvas = await html2canvas(element, { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const isA4 = printerSettings.size === 'a4';
      const imgWidth = isA4 ? 190 : 80;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const pdf = new jsPDF('p', 'mm', isA4 ? 'a4' : [imgWidth, Math.max(imgHeight + 10, 50)]);
      pdf.addImage(imgData, 'PNG', isA4 ? 10 : 0, isA4 ? 10 : 5, imgWidth, imgHeight);
      pdf.save(`Invoice-${lastSale?.invoiceNo || 'sale'}.pdf`);
    } catch (err) { showToast.error('Failed to generate PDF'); }
  };

  const handleReprint = () => { if (lastSale) setShowInvoice(true); else showToast.warning('No previous invoice to reprint'); };
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

  const displayProducts = showTopSelling ? topSelling : products;

  return (
    <div className="pos-modern">
      <div className="pos-products-panel">
        <div className="pos-search-section">
          <div className="pos-search-wrapper">
            <BiSearch className="pos-search-icon" />
            <input ref={searchRef} className="pos-search-input" placeholder={`${t('common.search', 'Search')} by name, barcode or SKU...`} value={search} onChange={(e) => setSearch(e.target.value)} />
            {search && <button className="pos-search-clear" onClick={() => { setSearch(''); setShowTopSelling(true); }}><BiX /></button>}
          </div>
          <div className="pos-search-hints">
            <small><BiBarcode /> Scan barcode or type to search</small>
            <small className="pos-kbd-hint"><kbd>F1</kbd> Search <kbd>F8</kbd> Bill</small>
          </div>
        </div>
        {showTopSelling && topSelling.length > 0 && <div className="pos-section-header"><BiTrendingUp /> Top Selling Products</div>}
        <div className="pos-product-grid">
          {!showTopSelling && products.length === 0 && search && <div className="pos-empty-state"><BiPackage size={48} /><p>No products found for "{search}"</p></div>}
          {displayProducts.slice(0, 30).map(product => {
            const isOutOfStock = product.stock <= 0;
            const isLowStock = product.stock > 0 && product.stock <= 10;
            return (
              <div key={product._id} className={`pos-product-card ${isOutOfStock ? 'pos-product-out-of-stock' : ''}`} onClick={() => !isOutOfStock && addToCart(product)}>
                <div className="pos-product-icon"><BiPackage /></div>
                <div className="pos-product-info">
                  <div className="pos-product-name">{product.name}</div>
                  <div className="pos-product-price">₹{product.sellingPrice}</div>
                  <div className="pos-product-stock">
                    {isOutOfStock ? <span className="stock-badge out-of-stock">Out of Stock</span> : isLowStock ? <span className="stock-badge low-stock">{product.stock} {product.unit || 'pcs'}</span> : <span className="stock-badge in-stock">{product.stock} {product.unit || 'pcs'}</span>}
                  </div>
                  {product.totalSold > 0 && <div className="pos-product-sold"><BiStar /> {product.totalSold} sold</div>}
                </div>
                <button className="pos-add-btn" disabled={isOutOfStock} onClick={(e) => { e.stopPropagation(); addToCart(product); }}><BiPlus /></button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="pos-cart-panel">
        {/* Modern Customer Search Header */}
        <div className="pos-customer-modern-header">
          <div className="pos-customer-search-area" ref={customerDropdownRef}>
            <div className="pos-customer-search-inner">
              <BiUser className="pos-customer-search-icon" />
              <input
                ref={customerSearchRef}
                className="pos-customer-search-input"
                placeholder="Search customer..."
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
                <button className="pos-customer-search-clear" onClick={() => { setCustomer(''); setSelectedCustomerData(null); setCustomerSearch(''); }} title="Clear customer">
                  <BiTrash />
                </button>
              ) : (
                <button className="pos-customer-btn-walkin" onClick={() => { setCustomer(''); setSelectedCustomerData(null); setCustomerSearch(''); setCustomerDropdownOpen(false); }} title="Walk-in Customer">
                  Walk-in
                </button>
              )}
            </div>

            {/* Searchable Dropdown */}
            {customerDropdownOpen && (
              <div className="pos-customer-dropdown-modern">
                <div className="pos-customer-dropdown-header">
                  <span>Customers ({customers.length})</span>
                  <button className="pos-customer-add-btn" onClick={() => setShowAddCustomer(true)} title="Add Customer">
                    <BiPlus /> Add Customer
                  </button>
                </div>
                <div className="pos-customer-dropdown-list">
                  {/* Walk-in option always on top */}
                  <div
                    className={`pos-customer-option ${!customer ? 'active' : ''}`}
                    onClick={() => { setCustomer(''); setSelectedCustomerData(null); setCustomerSearch(''); setCustomerDropdownOpen(false); }}
                  >
                    <div className="pos-customer-option-avatar walkin">
                      <BiUser size={16} />
                    </div>
                    <div className="pos-customer-option-info">
                      <span className="pos-customer-option-name">Walk-in Customer</span>
                      <span className="pos-customer-option-phone">No account needed</span>
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
                      const due = c.totalDue || 0;
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
                            <span className="pos-customer-option-phone">{c.phone || 'No phone'}</span>
                          </div>
                          {due > 0 && (
                            <span className="pos-customer-option-due">₹{Number(due).toFixed(2)}</span>
                          )}
                        </div>
                      );
                    })}
                  {customers.filter(c =>
                    !customerSearch ||
                    c.name?.toLowerCase().includes(customerSearch.toLowerCase()) ||
                    c.phone?.includes(customerSearch)
                  ).length === 0 && (
                    <div className="pos-customer-dropdown-empty">
                      <BiUser size={20} />
                      <p>No customers found</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="pos-customer-header-right">
            <span className="pos-cart-count"><BiCart /> {cart.reduce((s, i) => s + i.quantity, 0)}</span>
            <button className="pos-customer-add-btn-icon" onClick={() => setShowAddCustomer(true)} title="Add Customer">
              <BiPlus size={18} />
            </button>
          </div>
        </div>

        {/* Selected Customer Info Card */}
        {selectedCustomerData && (
          <div className="pos-customer-selected-card">
            <div className="pos-customer-selected-avatar">
              {selectedCustomerData.name?.charAt(0)?.toUpperCase() || <BiUser size={18} />}
            </div>
            <div className="pos-customer-selected-info">
              <span className="pos-customer-selected-name">{selectedCustomerData.name}</span>
              <span className="pos-customer-selected-phone">{selectedCustomerData.phone || 'No phone'}</span>
              <div className="pos-customer-selected-due-row">
                <span className="pos-customer-selected-due-label">Previous Due:</span>
                <span className="pos-customer-selected-due-value" style={{ color: (selectedCustomerData.totalDue || 0) > 0 ? '#FF6B6B' : '#2ecc71' }}>
                  ₹{Number(selectedCustomerData.totalDue || 0).toFixed(2)}
                </span>
              </div>
            </div>
            <button className="pos-customer-selected-remove" onClick={() => { setCustomer(''); setSelectedCustomerData(null); setCustomerSearch(''); }} title="Remove customer">
              <BiX size={18} />
            </button>
          </div>
        )}

        <div className="pos-cart-items">
          {cart.length === 0 ? (
            <div className="pos-cart-empty">
              <BiCart size={56} /><h5>Cart is empty</h5><p>Search & add products to start billing</p>
              {recentSales.length > 0 && (
                <div className="pos-recent-sales">
                  <h6><BiHistory /> Recent Sales</h6>
                  {recentSales.map(sale => (
                    <div key={sale._id} className="pos-recent-sale-item" onClick={() => { if (lastSale?._id === sale._id) setShowInvoice(true); }}>
                      <span className="pos-recent-invoice">{sale.invoiceNo}</span>
                      <span className="pos-recent-amount">₹{sale.grandTotal || sale.totalAmount}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.product._id} className="pos-cart-item">
                <div className="pos-cart-item-info">
                  <div className="pos-cart-item-name">{item.product.name}</div>
                  <div className="pos-cart-item-price">₹{item.price} x {item.quantity}</div>
                </div>
                <div className="pos-cart-item-controls">
                  <div className="pos-qty-control">
                    <button className="pos-qty-btn pos-qty-minus" onClick={() => updateQty(item.product._id, -1)} disabled={item.quantity <= 1}><BiMinus /></button>
                    <span className="pos-qty-value">{item.quantity}</span>
                    <button className="pos-qty-btn pos-qty-plus" onClick={() => updateQty(item.product._id, 1)}><BiPlus /></button>
                  </div>
                  <span className="pos-cart-item-total">₹{item.total.toFixed(2)}</span>
                  <button className="pos-cart-item-remove" onClick={() => removeItem(item.product._id)}><BiTrash /></button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="pos-checkout-section">
          {/* Order Summary */}
          <div className="pos-order-summary">
            <div className="pos-order-summary-row"><span>Subtotal</span><span>₹{subtotal.toFixed(2)}</span></div>
            {itemDiscount > 0 && <div className="pos-order-summary-row pos-order-discount"><span>Item Discount</span><span>-₹{itemDiscount.toFixed(2)}</span></div>}
            {extraDiscount > 0 && <div className="pos-order-summary-row pos-order-discount"><span>Extra Discount</span><span>-₹{extraDiscount.toFixed(2)}</span></div>}
            {taxRate > 0 && <div className="pos-order-summary-row"><span>{taxName} ({taxRate}%)</span><span>₹{tax.toFixed(2)}</span></div>}
            <div className="pos-order-summary-row pos-order-grand"><span>Grand Total</span><span>₹{grandTotal.toFixed(2)}</span></div>
            <div className="pos-order-summary-row pos-order-paid"><span>Paid</span><span>₹{paidAmount.toFixed(2)}</span></div>
            {dueAmount > 0 && <div className="pos-order-summary-row pos-order-due"><span>Due</span><span>₹{dueAmount.toFixed(2)}</span></div>}
          </div>

          {/* Discount Section */}
          <div className="pos-discount-section">
            <label className="pos-payment-label"><BiTag /> Discount</label>
            <div className="pos-discount-input-row">
              <div className="pos-discount-mode-toggle">
                <button className={`pos-discount-mode-btn ${discountMode === 'percent' ? 'active' : ''}`} onClick={() => setDiscountMode('percent')}>%</button>
                <button className={`pos-discount-mode-btn ${discountMode === 'fixed' ? 'active' : ''}`} onClick={() => setDiscountMode('fixed')}>₹</button>
              </div>
              <input type="number" className="pos-discount-input" value={discountValue} onChange={(e) => setDiscountValue(Math.max(0, Number(e.target.value)))} min="0" placeholder="0" />
            </div>
            <div className="pos-quick-amounts">
              {quickDiscounts.map(d => (
                <button key={d.label} className={`pos-quick-amt-btn ${discountValue === d.value && discountMode === d.mode ? 'active' : ''}`} onClick={() => { setDiscountValue(d.value); setDiscountMode(d.mode); }}>{d.label}</button>
              ))}
              <button className="pos-quick-amt-btn" onClick={() => { setDiscountValue(0); }}>Clear</button>
            </div>
          </div>

          {/* Customer Note */}
          <div className="pos-note-section">
            <label className="pos-payment-label"><BiNote /> Note (optional)</label>
            <input type="text" className="pos-note-input" value={customerNote} onChange={(e) => setCustomerNote(e.target.value)} placeholder="Home delivery, special instructions..." maxLength="200" />
          </div>

          <div className="pos-grand-total"><span>Grand Total</span><span className="pos-grand-total-amount">₹{grandTotal.toFixed(2)}</span></div>
          {dueAmount > 0 && <div className="pos-due-alert">Due Amount: ₹{dueAmount.toFixed(2)}</div>}
          <div className="pos-payment-section">
            <label className="pos-payment-label">Payment Method</label>
            <div className="pos-payment-options">
              {[{ key: 'cash', icon: '💵', label: 'Cash' }, { key: 'card', icon: '💳', label: 'Card' }, { key: 'upi', icon: '📱', label: 'UPI' }, { key: 'mobile_banking', icon: '🏦', label: 'Mobile' }].map(method => (
                <button key={method.key} className={`pos-payment-option ${paymentMethod === method.key ? 'active' : ''}`} onClick={() => setPaymentMethod(method.key)}><span>{method.icon}</span><span>{method.label}</span></button>
              ))}
            </div>
          </div>
          <div className="pos-paid-section">
            <label className="pos-payment-label">Paid Amount</label>
            <div className="pos-paid-input-group"><span className="pos-paid-currency">₹</span><input type="number" className="pos-paid-input" value={paidAmount} onChange={(e) => setPaidAmount(Number(e.target.value))} placeholder="0.00" /></div>
            <div className="pos-quick-amounts">
              <button className="pos-quick-amt-btn pos-quick-amt-exact" onClick={() => setPaidAmount(grandTotal)}><BiCheck /> Exact</button>
              {quickAmounts.map(amt => <button key={amt} className={`pos-quick-amt-btn ${paidAmount === amt ? 'active' : ''}`} onClick={() => setPaidAmount(amt)}>₹{amt}</button>)}
            </div>
          </div>
          {change > 0 && <div className="pos-change-display"><BiRefresh /> Change: <strong>₹{change.toFixed(2)}</strong></div>}
          <div className="pos-action-buttons">
            <button className="pos-checkout-btn" onClick={handleOpenConfirm} disabled={cart.length === 0 || loading}>
              {loading ? <span className="pos-checkout-loading"><span className="spinner-border spinner-border-sm" /> Processing...</span> : <><BiReceipt size={20} /><span>Generate Bill — ₹{grandTotal.toFixed(2)}</span></>}
            </button>
            <div className="pos-action-row">
              {lastSale && <button className="pos-action-btn pos-reprint-btn" onClick={handleReprint}><BiPrinter /> Reprint</button>}
              {cart.length > 0 && <button className="pos-action-btn pos-clear-btn" onClick={clearCart}><BiTrash /> Clear</button>}
            </div>
          </div>
        </div>
      </div>

      {showConfirmModal && confirmData && <ConfirmSaleModal data={confirmData} onConfirm={handleProcessSale} onCancel={() => setShowConfirmModal(false)} loading={loading} />}
      {showInvoice && lastSale && (
        <Invoice ref={invoiceRef} sale={lastSale} shopInfo={shopInfo} onClose={() => setShowInvoice(false)} onPrint={handlePrint} onDownload={handleDownloadPDF} printerSettings={printerSettings} onSettingsChange={() => setShowPrinterSettings(true)} />
      )}
      {showPrinterSettings && <PrinterSettingsModal currentSettings={printerSettings} onSelect={setPrinterSettings} onClose={() => setShowPrinterSettings(false)} />}

      {/* Add Customer Modal */}
      {showAddCustomer && (
        <div className="pos-add-customer-overlay" onClick={() => setShowAddCustomer(false)}>
          <div className="pos-add-customer-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pos-add-customer-header">
              <div className="pos-add-customer-header-left">
                <div className="pos-add-customer-header-icon"><BiUser size={22} /></div>
                <h3>Add New Customer</h3>
              </div>
              <button className="pos-add-customer-close" onClick={() => setShowAddCustomer(false)}><BiX size={20} /></button>
            </div>
            <div className="pos-add-customer-body">
              <div className="pos-add-customer-field">
                <label>Customer Name *</label>
                <input
                  type="text"
                  placeholder="Enter customer name"
                  value={addCustomerForm.name}
                  onChange={(e) => setAddCustomerForm(prev => ({ ...prev, name: e.target.value }))}
                  autoFocus
                />
              </div>
              <div className="pos-add-customer-field">
                <label>Phone Number *</label>
                <input
                  type="tel"
                  placeholder="Enter phone number"
                  value={addCustomerForm.phone}
                  onChange={(e) => setAddCustomerForm(prev => ({ ...prev, phone: e.target.value }))}
                />
              </div>
              <div className="pos-add-customer-field">
                <label>Address (optional)</label>
                <input
                  type="text"
                  placeholder="Enter address"
                  value={addCustomerForm.address}
                  onChange={(e) => setAddCustomerForm(prev => ({ ...prev, address: e.target.value }))}
                />
              </div>
            </div>
            <div className="pos-add-customer-footer">
              <button className="pos-add-customer-btn-cancel" onClick={() => setShowAddCustomer(false)}>Cancel</button>
              <button className="pos-add-customer-btn-save" onClick={handleAddCustomer}>
                <BiCheck size={16} /> Add Customer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default POS;