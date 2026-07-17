import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import { showToast } from '../../utils/toast';
import StatCard from '../../components/common/StatCard';
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

// ─── Printer helpers ─────────────────────────────────────────
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

const getSalesPrinterSettings = () => {
  try {
    const saved = localStorage.getItem('sales_printer_settings');
    if (saved) return JSON.parse(saved);
  } catch {}
  return { size: '80mm', template: 'modern', quickPrint: false };
};

const saveSalesPrinterSettings = (settings) => {
  try {
    localStorage.setItem('sales_printer_settings', JSON.stringify(settings));
  } catch {}
};

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

const STATUS_STYLES = {
  paid: { bg: 'rgba(46, 204, 113, 0.12)', color: '#2ecc71', label: 'Paid' },
  partial: { bg: 'rgba(255, 181, 69, 0.12)', color: '#F39C12', label: 'Partial' },
  unpaid: { bg: 'rgba(255, 107, 107, 0.12)', color: '#FF6B6B', label: 'Due' },
};

const RETURN_STYLES = {
  none: { bg: 'rgba(158, 158, 158, 0.1)', color: '#9e9e9e', label: 'No Return' },
  partial: { bg: 'rgba(255, 181, 69, 0.12)', color: '#F39C12', label: 'Partial Return' },
  full: { bg: 'rgba(108, 99, 255, 0.12)', color: '#6C63FF', label: 'Fully Returned' },
};

const PAYMENT_ICONS = {
  cash: '💵', card: '💳', upi: '📱', mobile_banking: '🏦',
};

const STATUS_OPTIONS = [
  { key: '', label: 'All Status' },
  { key: 'paid', label: 'Paid' },
  { key: 'partial', label: 'Partial' },
  { key: 'unpaid', label: 'Due' },
];

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

// ─── Print Settings Modal ────────────────────────────────────
const PrintSettingsModal = ({ currentSettings, sale, shopInfo, onPrint, onDownload, onClose }) => {
  const [size, setSize] = useState(currentSettings.size);
  const [template, setTemplate] = useState(currentSettings.template);
  const [quickPrint, setQuickPrint] = useState(currentSettings.quickPrint || false);
  const invoiceRef = useRef(null);

  const handleApplyAndPrint = () => {
    const settings = { size, template, quickPrint };
    saveSalesPrinterSettings(settings);
    onPrint(sale, settings);
    onClose();
  };

  const handleDownload = async () => {
    try {
      const html2canvas = (await import('html2canvas')).default;
      const jsPDF = (await import('jspdf')).default;
      const element = invoiceRef.current;
      if (!element) return;
      const canvas = await html2canvas(element, { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const isA4 = size === 'a4';
      const imgWidth = isA4 ? 190 : 80;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const pdf = new jsPDF('p', 'mm', isA4 ? 'a4' : [imgWidth, Math.max(imgHeight + 10, 50)]);
      pdf.addImage(imgData, 'PNG', isA4 ? 10 : 0, isA4 ? 10 : 5, imgWidth, imgHeight);
      pdf.save(`Invoice-${sale?.invoiceNo || 'sale'}.pdf`);
      showToast.success('PDF downloaded successfully');
    } catch (err) {
      showToast.error('Failed to generate PDF');
    }
  };

  const isThermal = size === '58mm' || size === '80mm';
  const isA4 = size === 'a4';
  const cashierName = shopInfo?.cashierName || 'Cashier';
  const footerMsg = shopInfo?.settings?.receiptFooter || 'Thank you for your purchase!';
  const taxName = shopInfo?.settings?.taxName || 'VAT';

  const renderPreview = () => {
    if (!sale) return null;
    const itemsHtml = sale.items?.map((item, idx) => {
      if (template === 'grocery') {
        return `<div class="receipt-grocery-item"><span class="receipt-grocery-item-name">${item.product?.name || item.name || 'Item'}</span><span class="receipt-grocery-item-qty">${item.quantity}${item.unit || ''}</span><span class="receipt-grocery-item-price">₹${Number(item.price).toFixed(2)}</span><span class="receipt-grocery-item-total">₹${Number(item.total).toFixed(2)}</span></div>`;
      }
      if (template === 'minimal') {
        return `<div class="receipt-minimal-item"><div class="receipt-minimal-item-name">${item.product?.name || item.name || 'Item'}</div><div class="receipt-minimal-item-line"><span>${item.quantity} x ₹${Number(item.price).toFixed(2)}</span><span class="receipt-minimal-item-total">₹${Number(item.total).toFixed(2)}</span></div></div>`;
      }
      return `<tr><td style="padding:4px 6px;border-bottom:1px dotted #ddd;font-size:11px">${item.product?.name || item.name || 'Item'}</td><td style="padding:4px 6px;border-bottom:1px dotted #ddd;font-size:11px;text-align:center">${item.quantity} ${item.unit || ''}</td><td style="padding:4px 6px;border-bottom:1px dotted #ddd;font-size:11px;text-align:right">₹${Number(item.price).toFixed(2)}</td><td style="padding:4px 6px;border-bottom:1px dotted #ddd;font-size:11px;text-align:right">₹${Number(item.total).toFixed(2)}</td></tr>`;
    }).join('') || '';

    const discountHtml = Number(sale.discount || 0) > 0 ? `<div class="${template === 'modern' ? 'receipt-modern-discount' : template === 'minimal' ? 'receipt-minimal-discount' : template === 'grocery' ? 'receipt-grocery-discount' : ''} total-row"><span>Discount</span><span>-₹${Number(sale.discount).toFixed(2)}</span></div>` : '';
    const taxHtml = Number(sale.tax || 0) > 0 ? `<div class="total-row"><span>${taxName}</span><span>₹${Number(sale.tax).toFixed(2)}</span></div>` : '';
    const dueHtml = Number(sale.dueAmount || 0) > 0 ? `<div class="total-row"><span>Due</span><span style="color:#e74c3c;font-weight:700">₹${Number(sale.dueAmount).toFixed(2)}</span></div>` : '';

    if (template === 'classic') {
      return `
        <div class="receipt receipt-classic" style="max-width:${isA4 ? '100%' : isThermal ? '72mm' : '100%'};${isA4 ? 'padding:10mm' : ''}">
          <div class="receipt-header" style="text-align:center;margin-bottom:8px">
            <div class="receipt-logo" style="margin-bottom:4px">
              ${shopInfo?.logo ? `<img src="${shopInfo.logo}" style="max-width:60px;max-height:60px;border-radius:50%" />` : `<div style="width:50px;height:50px;margin:0 auto;border-radius:50%;background:linear-gradient(135deg,#6C63FF,#00D9A6);display:flex;align-items:center;justify-content:center;color:#fff">🛒</div>`}
            </div>
            <h2 style="font-size:${isThermal?'13px':'18px'};font-weight:800;margin-bottom:2px">${shopInfo?.shopName || 'Shop Name'}</h2>
            <p style="font-size:${isThermal?'9px':'11px'};color:#666">${formatAddress(shopInfo?.address)}</p>
            ${shopInfo?.phone ? `<p style="font-size:9px;color:#555">Tel: ${shopInfo.phone}</p>` : ''}
            <div style="border-top:1px dashed #999;margin:6px 0"></div>
          </div>
          <div style="margin-bottom:6px">
            <div style="display:flex;justify-content:space-between;font-size:${isThermal?'10px':'12px'};margin-bottom:2px"><span style="color:#888">Invoice:</span><span style="font-weight:700">${sale.invoiceNo || 'N/A'}</span></div>
            <div style="display:flex;justify-content:space-between;font-size:${isThermal?'10px':'12px'};margin-bottom:2px"><span style="color:#888">Date:</span><span style="font-weight:700">${formatDate(sale.createdAt)}</span></div>
            <div style="display:flex;justify-content:space-between;font-size:${isThermal?'10px':'12px'};margin-bottom:2px"><span style="color:#888">Customer:</span><span style="font-weight:700">${sale.customer?.name || 'Walk-in Customer'}</span></div>
            <div style="border-top:1px dashed #999;margin:6px 0"></div>
          </div>
          <table style="width:100%;border-collapse:collapse;margin:6px 0;font-size:${isThermal?'10px':'12px'}">
            <tr><th style="text-align:left;border-bottom:1px solid #333;padding:4px 6px">Item</th><th style="text-align:center;border-bottom:1px solid #333;padding:4px 6px">Qty</th><th style="text-align:right;border-bottom:1px solid #333;padding:4px 6px">Price</th><th style="text-align:right;border-bottom:1px solid #333;padding:4px 6px">Total</th></tr>
            ${itemsHtml}
          </table>
          <div style="border-top:1px dashed #999;margin:6px 0"></div>
          <div style="font-size:${isThermal?'11px':'13px'}">
            <div class="total-row" style="display:flex;justify-content:space-between;margin-bottom:2px"><span>Subtotal</span><span>₹${Number(sale.subtotal || 0).toFixed(2)}</span></div>
            ${discountHtml}${taxHtml}
            <div class="total-row grand-total" style="display:flex;justify-content:space-between;font-size:${isThermal?'12px':'16px'};font-weight:800;border-top:1px dashed #999;padding-top:4px;margin-top:4px"><span>Grand Total</span><span>₹${Number(sale.totalAmount || sale.grandTotal || 0).toFixed(2)}</span></div>
            <div class="total-row" style="display:flex;justify-content:space-between;margin-bottom:2px"><span>Paid</span><span style="color:#2ecc71;font-weight:700">₹${Number(sale.paidAmount || 0).toFixed(2)}</span></div>
            ${dueHtml}
            <div class="total-row" style="display:flex;justify-content:space-between;margin-bottom:2px"><span>Payment</span><span style="color:#2ecc71;font-weight:800">${sale.paymentMethod?.toUpperCase() || 'CASH'}</span></div>
          </div>
          <div style="border-top:1px dashed #999;margin:6px 0"></div>
          <div style="text-align:center;font-size:${isThermal?'9px':'11px'};color:#888;margin-top:6px">
            <p>${footerMsg}</p>
            <p style="font-size:${isThermal?'8px':'9px'}">Visit us again!</p>
            ${!isThermal ? `<div style="display:flex;justify-content:center;margin-top:8px"><SalesInvoiceQR invoiceNo="${sale.invoiceNo}" size="${isA4 ? 70 : 50}" /></div>` : ''}
          </div>
        </div>`;
    }

    if (template === 'modern') {
      return `
        <div class="receipt receipt-modern" style="max-width:${isA4 ? '100%' : isThermal ? '72mm' : '100%'};${isA4 ? 'padding:10mm' : ''}">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
            <div style="display:flex;align-items:center;gap:8px">
              ${shopInfo?.logo ? `<img src="${shopInfo.logo}" style="max-width:40px;max-height:40px;border-radius:8px" />` : `<div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#6C63FF,#00D9A6);display:flex;align-items:center;justify-content:center;color:#fff">🛒</div>`}
              <div><h2 style="font-size:${isThermal?'12px':'16px'};font-weight:800;margin:0">${shopInfo?.shopName || 'Shop Name'}</h2><p style="font-size:${isThermal?'8px':'10px'};color:#666;margin:0">${formatAddress(shopInfo?.address)}</p></div>
            </div>
            <span style="background:#6C63FF;color:#fff;padding:2px 8px;border-radius:4px;font-size:${isThermal?'8px':'11px'};font-weight:700">#${sale.invoiceNo || 'N/A'}</span>
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:4px 12px;font-size:${isThermal?'9px':'11px'};color:#555;margin-bottom:6px">
            <span>📅 ${formatDate(sale.createdAt)}</span>
            <span>👤 ${cashierName}</span>
            <span>👥 ${sale.customer?.name || 'Walk-in Customer'}</span>
          </div>
          <div style="border-top:2px solid #6C63FF;margin:6px 0"></div>
          <div style="margin-bottom:6px">
            <div style="display:flex;justify-content:space-between;font-weight:700;font-size:${isThermal?'9px':'11px'};padding:4px 0;border-bottom:1px solid #ddd"><span>Item</span><span>Qty</span><span>Price</span><span>Total</span></div>
            ${sale.items?.map(item => `
              <div style="padding:4px 0;border-bottom:1px dotted #eee">
                <div style="font-weight:600;font-size:${isThermal?'9px':'11px'}">${item.product?.name || item.name || 'Item'}</div>
                <div style="display:flex;justify-content:space-between;font-size:${isThermal?'8px':'10px'};color:#555"><span>${item.quantity} ${item.unit || ''}</span><span>₹${Number(item.price).toFixed(2)}</span><span style="font-weight:700;color:#333">₹${Number(item.total).toFixed(2)}</span></div>
                ${item.discount > 0 ? `<div style="font-size:8px;color:#e74c3c">-${item.discount}% off</div>` : ''}
              </div>
            `).join('')}
          </div>
          <div style="border-top:2px solid #6C63FF;margin:6px 0"></div>
          <div style="margin-bottom:6px">
            <div style="display:flex;justify-content:space-between;font-size:${isThermal?'9px':'11px'};margin-bottom:2px"><span>Subtotal</span><span>₹${Number(sale.subtotal || 0).toFixed(2)}</span></div>
            ${discountHtml}${taxHtml}
            <div style="display:flex;justify-content:space-between;font-size:${isThermal?'13px':'18px'};font-weight:800;border-top:2px solid #6C63FF;padding-top:4px;margin-top:4px"><span>Grand Total</span><span style="color:#6C63FF">₹${Number(sale.totalAmount || sale.grandTotal || 0).toFixed(2)}</span></div>
            <div style="display:flex;justify-content:space-between;font-size:${isThermal?'9px':'11px'};margin-bottom:2px"><span>Paid</span><span style="color:#2ecc71;font-weight:700">₹${Number(sale.paidAmount || 0).toFixed(2)}</span></div>
            ${dueHtml}
            <div style="display:flex;justify-content:space-between;font-size:${isThermal?'9px':'11px'};margin-bottom:2px"><span>Payment</span><span style="background:#2ecc71;color:#fff;padding:1px 6px;border-radius:3px;font-weight:700">${sale.paymentMethod?.toUpperCase() || 'CASH'}</span></div>
          </div>
          <div style="text-align:center;font-size:${isThermal?'9px':'11px'};color:#888;margin-top:6px">
            <p>${footerMsg}</p>
            ${!isThermal ? `<div style="display:flex;justify-content:center;margin-top:8px"><SalesInvoiceQR invoiceNo="${sale.invoiceNo}" size="${isA4 ? 70 : 50}" /></div>` : ''}
          </div>
        </div>`;
    }

    if (template === 'minimal') {
      return `
        <div class="receipt receipt-minimal" style="max-width:${isA4 ? '100%' : isThermal ? '72mm' : '100%'};${isA4 ? 'padding:10mm' : ''}">
          <div style="text-align:center;margin-bottom:6px">
            <h2 style="font-size:${isThermal?'14px':'20px'};font-weight:300;letter-spacing:1px;text-transform:uppercase;margin:0">${shopInfo?.shopName || 'Shop Name'}</h2>
            <p style="font-size:${isThermal?'8px':'10px'};color:#999;margin:0">${formatAddress(shopInfo?.address)}</p>
            ${shopInfo?.phone ? `<p style="font-size:8px;color:#999">${shopInfo.phone}</p>` : ''}
          </div>
          <div style="border-top:1px solid #333;margin:4px 0"></div>
          <div style="margin-bottom:4px">
            <div style="display:flex;justify-content:space-between;font-size:${isThermal?'9px':'11px'};color:#555;margin-bottom:1px"><span>Invoice</span><span>${sale.invoiceNo || 'N/A'}</span></div>
            <div style="display:flex;justify-content:space-between;font-size:${isThermal?'9px':'11px'};color:#555;margin-bottom:1px"><span>Date</span><span>${formatDate(sale.createdAt)}</span></div>
            <div style="display:flex;justify-content:space-between;font-size:${isThermal?'9px':'11px'};color:#555;margin-bottom:1px"><span>Customer</span><span>${sale.customer?.name || 'Walk-in'}</span></div>
          </div>
          <div style="border-top:1px solid #333;margin:4px 0"></div>
          <div style="margin-bottom:4px">${sale.items?.map(item => `
            <div style="padding:3px 0;border-bottom:1px dotted #eee">
              <div style="font-size:${isThermal?'9px':'11px'};font-weight:500">${item.product?.name || item.name || 'Item'}</div>
              <div style="display:flex;justify-content:space-between;font-size:${isThermal?'8px':'10px'};color:#666"><span>${item.quantity} x ₹${Number(item.price).toFixed(2)}</span><span style="font-weight:600;color:#333">₹${Number(item.total).toFixed(2)}</span></div>
            </div>
          `).join('')}</div>
          <div style="border-top:1px solid #333;margin:4px 0"></div>
          <div style="margin-bottom:4px">
            <div style="display:flex;justify-content:space-between;font-size:${isThermal?'10px':'12px'};margin-bottom:2px"><span>Subtotal</span><span>₹${Number(sale.subtotal || 0).toFixed(2)}</span></div>
            ${discountHtml}${taxHtml}
            <div style="display:flex;justify-content:space-between;font-size:${isThermal?'13px':'16px'};font-weight:800;border-top:1px solid #333;padding-top:4px;margin-top:4px"><span>Total</span><span>₹${Number(sale.totalAmount || sale.grandTotal || 0).toFixed(2)}</span></div>
            <div style="display:flex;justify-content:space-between;font-size:${isThermal?'10px':'12px'};margin-bottom:2px"><span>Paid</span><span>₹${Number(sale.paidAmount || 0).toFixed(2)}</span></div>
            ${dueHtml}
          </div>
          <div style="text-align:center;font-size:${isThermal?'9px':'11px'};color:#999;margin-top:6px;font-style:italic"><p>${footerMsg}</p></div>
        </div>`;
    }

    // Grocery
    return `
      <div class="receipt receipt-grocery" style="max-width:${isA4 ? '100%' : isThermal ? '72mm' : '100%'};${isA4 ? 'padding:10mm' : ''}">
        <div style="text-align:center;margin-bottom:6px">
          ${shopInfo?.logo ? `<img src="${shopInfo.logo}" style="max-width:40px;max-height:40px;border-radius:50%;margin-bottom:4px" />` : `<div style="width:40px;height:40px;margin:0 auto 4px;border-radius:50%;background:linear-gradient(135deg,#2ecc71,#00D9A6);display:flex;align-items:center;justify-content:center;color:#fff">🛒</div>`}
          <h2 style="font-size:${isThermal?'13px':'18px'};font-weight:800;color:#2ecc71;margin:0">${shopInfo?.shopName || 'Grocery Store'}</h2>
          <p style="font-size:${isThermal?'8px':'10px'};color:#666;margin:0">${formatAddress(shopInfo?.address)}</p>
          ${shopInfo?.phone ? `<p style="font-size:9px;color:#333">📞 ${shopInfo.phone}</p>` : ''}
        </div>
        <div style="border-top:2px solid #2ecc71;margin:4px 0"></div>
        <div style="margin-bottom:4px">
          <div style="display:flex;justify-content:space-between;font-size:${isThermal?'9px':'11px'};color:#555;margin-bottom:2px"><span>🧾 ${sale.invoiceNo || 'N/A'}</span><span>📅 ${formatDate(sale.createdAt)}</span></div>
          <div style="display:flex;justify-content:space-between;font-size:${isThermal?'9px':'11px'};color:#555;margin-bottom:2px"><span>👤 ${sale.customer?.name || 'Walk-in Customer'}</span><span>👨‍💼 ${cashierName}</span></div>
        </div>
        <div style="border-top:2px solid #2ecc71;margin:4px 0"></div>
        <div style="margin-bottom:4px">
          <div style="display:flex;font-weight:700;font-size:${isThermal?'9px':'11px'};border-bottom:1px solid #2ecc71;padding-bottom:3px;margin-bottom:3px;color:#2ecc71"><span style="flex:2">Item</span><span style="flex:0.6;text-align:center">Qty</span><span style="flex:0.7;text-align:right">₹</span><span style="flex:0.7;text-align:right">Total</span></div>
          ${itemsHtml}
        </div>
        <div style="border-top:2px solid #2ecc71;margin:4px 0"></div>
        <div style="margin-bottom:4px">
          <div style="display:flex;justify-content:space-between;font-size:${isThermal?'10px':'12px'};margin-bottom:2px"><span>Subtotal</span><span>₹${Number(sale.subtotal || 0).toFixed(2)}</span></div>
          ${discountHtml}${taxHtml}
          <div style="display:flex;justify-content:space-between;font-size:${isThermal?'13px':'16px'};font-weight:800;color:#2ecc71;border-top:1px solid #2ecc71;padding-top:4px;margin-top:4px"><span>Total</span><span>₹${Number(sale.totalAmount || sale.grandTotal || 0).toFixed(2)}</span></div>
          <div style="display:flex;justify-content:space-between;font-size:${isThermal?'10px':'12px'};margin-bottom:2px"><span>Paid</span><span>₹${Number(sale.paidAmount || 0).toFixed(2)}</span></div>
          ${dueHtml}
          <div style="display:flex;justify-content:space-between;font-size:${isThermal?'10px':'12px'};margin-bottom:2px"><span>Payment</span><span style="background:#2ecc71;color:#fff;padding:1px 6px;border-radius:3px;font-weight:700">${sale.paymentMethod?.toUpperCase() || 'CASH'}</span></div>
        </div>
        <div style="border-top:2px solid #2ecc71;margin:4px 0"></div>
        <div style="text-align:center;font-size:${isThermal?'9px':'11px'};color:#2ecc71;margin-top:6px">
          <p>🛒 ${footerMsg}</p>
          <p style="font-size:8px;color:#888">Visit again for fresh groceries 🥦🍎</p>
          ${!isThermal ? `<div style="display:flex;justify-content:center;margin-top:8px"><SalesInvoiceQR invoiceNo="${sale.invoiceNo}" size="${isA4 ? 70 : 50}" /></div>` : ''}
        </div>
      </div>`;
  };

  if (!sale) return null;

  return (
    <div className="printer-settings-overlay" onClick={onClose}>
      <div className="printer-settings-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 680 }}>
        <div className="printer-settings-header">
          <div className="printer-settings-header-left">
            <div className="printer-settings-icon"><BiPrinter size={22} /></div>
            <h3>Print Invoice</h3>
          </div>
          <button className="printer-settings-close" onClick={onClose}><BiX size={20} /></button>
        </div>
        <div className="printer-settings-body">
          <div className="row g-3">
            <div className="col-md-4">
              {/* Settings */}
              <div className="printer-settings-group">
                <label className="printer-settings-label">Paper Size</label>
                <div className="printer-settings-options" style={{ gridTemplateColumns: 'repeat(1, 1fr)' }}>
                  {PRINTER_SIZES.map(s => (
                    <button key={s.key} className={`printer-settings-option ${size === s.key ? 'active' : ''}`} onClick={() => setSize(s.key)}>
                      {s.icon}<span>{s.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="printer-settings-group">
                <label className="printer-settings-label">Invoice Design</label>
                <div className="printer-settings-options" style={{ gridTemplateColumns: 'repeat(1, 1fr)' }}>
                  {INVOICE_TEMPLATES.map(t => (
                    <button key={t.key} className={`printer-settings-option ${template === t.key ? 'active' : ''}`} onClick={() => setTemplate(t.key)}>
                      {t.icon}<span>{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="printer-settings-group">
                <label className="printer-settings-checkbox">
                  <input
                    type="checkbox"
                    checked={quickPrint}
                    onChange={(e) => setQuickPrint(e.target.checked)}
                  />
                  <span>Use saved settings & skip popup</span>
                </label>
              </div>
            </div>
            <div className="col-md-8">
              <label className="printer-settings-label">Preview</label>
              <div
                className="sales-print-preview invoice-theme"
                style={{
                  background: '#fff',
                  borderRadius: 'var(--border-radius-md)',
                  border: '1px solid #e0e0e0',
                  overflow: 'auto',
                  maxHeight: 420,
                  padding: isA4 ? '5mm' : isThermal ? '2mm' : '0',
                  fontFamily: isThermal ? "'Courier New', monospace" : "'Inter', sans-serif",
                  fontSize: isThermal ? '10px' : '13px',
                  color: '#222',
                  lineHeight: 1.4,
                }}
              >
                <div ref={invoiceRef} style={{ margin: '0 auto', maxWidth: isA4 ? '190mm' : isThermal ? '72mm' : '100%' }}>
                  <div dangerouslySetInnerHTML={{ __html: renderPreview() }} />
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="printer-settings-footer">
          <button className="printer-settings-btn printer-settings-btn-cancel" onClick={onClose}>Cancel</button>
          <button className="printer-settings-btn printer-settings-btn-apply" onClick={handleDownload}><BiDownload size={16} /> PDF</button>
          <button className="printer-settings-btn printer-settings-btn-apply" onClick={handleApplyAndPrint}><BiPrinter size={16} /> Print</button>
        </div>
      </div>
    </div>
  );
};

// ─── View Drawer (uses standard drawer classes with smooth animation) ─────────
const SaleViewDrawer = ({ open, onClose, sale, shopInfo, onPrint, onCopyInvoice }) => {
  const { t } = useTranslation();

  const st = sale ? (STATUS_STYLES[sale.paymentStatus] || STATUS_STYLES.paid) : null;
  const rs = sale ? (RETURN_STYLES[sale.returnStatus] || RETURN_STYLES.none) : null;
  const pmtIcon = sale ? (PAYMENT_ICONS[sale.paymentMethod] || '💵') : null;
  const allReturns = sale?.returns || [];
  const totalRefunded = allReturns.reduce((sum, r) => sum + (r.totalRefund || 0), 0);

  return (
    <>
      <div className={`drawer-overlay ${open ? 'open' : ''}`} onClick={onClose} />
      <div className={`drawer ${open ? 'open' : ''}`}>
        <div className="drawer-header">
          <h5><BiReceipt size={18} style={{ marginRight: 8, verticalAlign: 'middle' }} />Invoice Details</h5>
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
                  {sale.invoiceNo || 'N/A'}
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
                      <span style={{ fontSize: '0.65rem', fontWeight: 500, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Customer</span>
                      <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>{sale.customer?.name || 'Walk-in Customer'}</span>
                      {sale.customer?.phone && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: '0.7rem', color: 'var(--text-secondary)' }}><BiPhone size={12} /> {sale.customer.phone}</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0.7rem 0.85rem', borderRadius: 'var(--border-radius-md)', background: 'var(--bg-input)', border: '1px solid var(--border-light)' }}>
                    <div style={{ width: 36, height: 36, borderRadius: 'var(--border-radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: 'rgba(0,217,166,0.1)', color: '#00D9A6' }}><BiStore size={18} /></div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
                      <span style={{ fontSize: '0.65rem', fontWeight: 500, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Shop</span>
                      <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>{shopInfo?.shopName || 'Shop Name'}</span>
                      {shopInfo?.phone && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: '0.7rem', color: 'var(--text-secondary)' }}><BiPhone size={12} /> {shopInfo.phone}</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0.7rem 0.85rem', borderRadius: 'var(--border-radius-md)', background: 'var(--bg-input)', border: '1px solid var(--border-light)' }}>
                    <div style={{ width: 36, height: 36, borderRadius: 'var(--border-radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: 'rgba(255,181,69,0.1)', color: '#F39C12' }}><BiCreditCard size={18} /></div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
                      <span style={{ fontSize: '0.65rem', fontWeight: 500, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Payment</span>
                      <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>{pmtIcon} {sale.paymentMethod?.toUpperCase() || 'CASH'}</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                        Paid: <strong style={{ color: '#2ecc71' }}>₹{Number(sale.paidAmount || 0).toFixed(2)}</strong>
                        {sale.dueAmount > 0 && <> | Due: <strong style={{ color: '#FF6B6B' }}>₹{Number(sale.dueAmount).toFixed(2)}</strong></>}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Items */}
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.6rem' }}>
                  <BiCart size={16} /><span>Items ({sale.items?.length || 0})</span>
                </div>
                <div style={{ borderRadius: 'var(--border-radius-md)', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', padding: '0.45rem 0.7rem', background: 'var(--bg-primary)', fontSize: '0.62rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid var(--border-color)' }}>
                    <span style={{ flex: 2 }}>Item</span>
                    <span style={{ flex: 0.5, textAlign: 'center' }}>Qty</span>
                    <span style={{ flex: 0.6, textAlign: 'center' }}>Rtn</span>
                    <span style={{ flex: 0.7, textAlign: 'right' }}>Price</span>
                    <span style={{ flex: 0.7, textAlign: 'right' }}>Total</span>
                  </div>
                  {sale.items?.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', padding: '0.45rem 0.7rem', fontSize: '0.78rem', borderBottom: idx < sale.items.length - 1 ? '1px solid var(--border-light)' : 'none', background: 'var(--bg-card)' }}>
                      <span style={{ flex: 2, fontWeight: 600, wordBreak: 'break-word' }}>
                        {item.product?.name || item.name || 'Item'}
                        {item.discount > 0 && <span style={{ display: 'block', color: '#e74c3c', fontSize: '0.6rem', fontWeight: 600 }}>-{item.discount}% off</span>}
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
                    <span>Subtotal</span><span>₹{Number(sale.subtotal || 0).toFixed(2)}</span>
                  </div>
                  {Number(sale.discount || 0) > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.45rem 0.85rem', borderRadius: 'var(--border-radius-sm)', background: 'var(--bg-input)', border: '1px solid var(--border-light)', fontSize: '0.8rem', color: '#e74c3c' }}>
                      <span>Discount</span><span>-₹{Number(sale.discount).toFixed(2)}</span>
                    </div>
                  )}
                  {Number(sale.tax || 0) > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.45rem 0.85rem', borderRadius: 'var(--border-radius-sm)', background: 'var(--bg-input)', border: '1px solid var(--border-light)', fontSize: '0.8rem', color: 'var(--text-primary)' }}>
                      <span>Tax</span><span>₹{Number(sale.tax).toFixed(2)}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0.85rem', borderRadius: 'var(--border-radius-md)', background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))', fontSize: '0.9rem', color: '#fff', fontWeight: 700, boxShadow: '0 2px 10px rgba(108,99,255,0.2)' }}>
                    <span>Grand Total</span><span style={{ fontSize: '1.05rem', fontWeight: 800 }}>₹{Number(sale.totalAmount || sale.grandTotal || 0).toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.45rem 0.85rem', borderRadius: 'var(--border-radius-sm)', background: 'var(--bg-input)', border: '1px solid var(--border-light)', fontSize: '0.8rem', color: '#2ecc71', fontWeight: 600 }}>
                    <span>Paid</span><span>₹{Number(sale.paidAmount || 0).toFixed(2)}</span>
                  </div>
                  {Number(sale.dueAmount || 0) > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.45rem 0.85rem', borderRadius: 'var(--border-radius-sm)', background: 'var(--bg-input)', border: '1px solid var(--border-light)', fontSize: '0.8rem', color: '#FF6B6B', fontWeight: 600 }}>
                      <span>Due</span><span>₹{Number(sale.dueAmount).toFixed(2)}</span>
                    </div>
                  )}
                  {totalRefunded > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.45rem 0.85rem', borderRadius: 'var(--border-radius-sm)', background: 'var(--bg-input)', border: '1px solid var(--border-light)', fontSize: '0.8rem', color: '#6C63FF', fontWeight: 600 }}>
                      <span>Total Refunded</span><span>₹{Number(totalRefunded).toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Return History */}
              {allReturns.length > 0 && (
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.6rem' }}>
                    <BiUndo size={16} /><span>Return History ({allReturns.length})</span>
                  </div>
                  {allReturns.map((ret, rIdx) => (
                    <div key={rIdx} style={{ padding: '10px 12px', borderRadius: 'var(--border-radius-md)', background: 'rgba(108,99,255,0.04)', border: '1px solid rgba(108,99,255,0.1)', marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, paddingBottom: 6, borderBottom: '1px solid rgba(108,99,255,0.1)' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.7rem', color: 'var(--text-muted)' }}><BiTime size={12} /> {formatDate(ret.returnDate)}</span>
                        <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#6C63FF', background: 'rgba(108,99,255,0.1)', padding: '2px 8px', borderRadius: 4 }}>{ret.refundMethod?.toUpperCase()}</span>
                      </div>
                      {ret.items.map((ritem, riIdx) => (
                        <div key={riIdx} style={{ padding: '4px 0', borderBottom: riIdx < ret.items.length - 1 ? '1px solid var(--border-light)' : 'none' }}>
                          <span style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)' }}>{ritem.productName || 'Item'}</span>
                          <div style={{ display: 'flex', gap: 12, fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: 1 }}>
                            <span>Qty: {ritem.quantity}</span>
                            <span>Refund: ₹{Number(ritem.refundAmount).toFixed(2)}</span>
                          </div>
                          {ritem.reason && <span style={{ display: 'block', fontSize: '0.68rem', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: 2 }}>{ritem.reason}</span>}
                        </div>
                      ))}
                      <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 6, paddingTop: 6, borderTop: '1px solid rgba(108,99,255,0.1)' }}>
                        Total Refund: <strong style={{ color: 'var(--primary)', marginLeft: 4 }}>₹{Number(ret.totalRefund).toFixed(2)}</strong>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {sale.notes && (
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.6rem' }}>
                    <BiNote size={16} /><span>Notes</span>
                  </div>
                  <p style={{ padding: '0.65rem 0.85rem', borderRadius: 'var(--border-radius-md)', background: 'rgba(255,181,69,0.06)', border: '1px solid rgba(255,181,69,0.12)', fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>{sale.notes}</p>
                </div>
              )}
            </>
          )}
        </div>
        <div className="drawer-footer">
          <button className="btn-premium btn-premium-secondary btn-premium-sm" onClick={onClose}>Close</button>
          {sale && (
            <>
              <button className="btn-premium btn-premium-primary btn-premium-sm" onClick={() => onCopyInvoice?.(sale.invoiceNo)} title="Copy Invoice Number"><BiCopy size={16} /></button>
              <button className="btn-premium btn-premium-primary btn-premium-sm" onClick={() => onPrint?.(sale)}><BiPrinter size={16} /> Reprint</button>
            </>
          )}
        </div>
      </div>
    </>
  );
};

// ─── Return Drawer (uses standard drawer classes with smooth animation) ──────
const ReturnDrawer = ({ open, onClose, sale, onReturnProcessed }) => {
  const [returnItems, setReturnItems] = useState([]);
  const [refundMethod, setRefundMethod] = useState('cash');
  const [reason, setReason] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (sale && open) {
      setReturnItems((sale.items || []).map(item => ({
        productId: item.product?._id || item.product,
        productName: item.product?.name || item.name || 'Item',
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

  const handleSubmit = async () => {
    if (!hasItems) { showToast.error('Select at least one item to return'); return; }
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
      showToast.success('Return processed successfully');
      onReturnProcessed?.(data.sale);
      onClose();
    } catch (err) {
      showToast.error(err.response?.data?.message || 'Return failed');
    } finally { setProcessing(false); }
  };

  const allFullyReturned = returnItems.every(i => i.maxReturnable <= 0);

  return (
    <>
      <div className={`drawer-overlay ${open ? 'open' : ''}`} onClick={onClose} />
      <div className={`drawer ${open ? 'open' : ''}`}>
        <div className="drawer-header">
          <h5><BiUndo size={18} style={{ marginRight: 8, verticalAlign: 'middle' }} />Process Return</h5>
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
                  {sale.invoiceNo || 'N/A'}
                </h4>
                <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {formatDate(sale.createdAt)}
                </span>
              </div>

              {allFullyReturned ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <BiCheck size={48} style={{ color: 'var(--secondary)', marginBottom: 12 }} />
                  <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>All Items Returned</h4>
                  <p style={{ fontSize: '0.85rem', margin: 0 }}>All items in this invoice have been fully returned.</p>
                </div>
              ) : (
                <>
                  {/* Items to return */}
                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.6rem' }}>
                      <BiPackage size={16} /><span>Select Items to Return</span>
                    </div>
                    {returnItems.map((item, idx) => (
                      <div key={idx} style={{ padding: '10px 12px', borderRadius: 'var(--border-radius-md)', background: 'var(--bg-input)', border: '1px solid var(--border-light)', marginBottom: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>{item.productName}</span>
                          {item.maxReturnable <= 0 && <span style={{ fontSize: '0.65rem', fontWeight: 600, color: '#6C63FF', background: 'rgba(108,99,255,0.1)', padding: '2px 8px', borderRadius: 10 }}>Fully Returned</span>}
                        </div>
                        <div style={{ display: 'flex', gap: 12, fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: 8 }}>
                          <span>Sold: <strong style={{ color: 'var(--text-primary)' }}>{item.soldQty}</strong></span>
                          <span>Returned: <strong style={{ color: 'var(--text-primary)' }}>{item.returnedQty}</strong></span>
                          <span>Available: <strong style={{ color: 'var(--text-primary)' }}>{item.maxReturnable}</strong></span>
                        </div>
                        {item.maxReturnable > 0 && (
                          <>
                            <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
                                <label style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Qty to Return</label>
                                <div style={{ display: 'flex', alignItems: 'center', border: '1.5px solid var(--border-color)', borderRadius: 'var(--border-radius-sm)', overflow: 'hidden', background: 'var(--bg-card)' }}>
                                  <button onClick={() => handleQtyChange(idx, item.returnQty - 1)} disabled={item.returnQty <= 0} style={{ width: 30, height: 30, border: 'none', background: 'var(--bg-input)', color: 'var(--text-secondary)', fontSize: '1rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>-</button>
                                  <input type="number" value={item.returnQty} onChange={(e) => handleQtyChange(idx, parseInt(e.target.value) || 0)} min="0" max={item.maxReturnable} style={{ flex: 1, border: 'none', outline: 'none', textAlign: 'center', fontSize: '0.85rem', fontWeight: 700, fontFamily: 'var(--font-family)', background: 'transparent', color: 'var(--text-primary)', width: 50, padding: '4px 0', MozAppearance: 'textfield' }} />
                                  <button onClick={() => handleQtyChange(idx, item.returnQty + 1)} disabled={item.returnQty >= item.maxReturnable} style={{ width: 30, height: 30, border: 'none', background: 'var(--bg-input)', color: 'var(--text-secondary)', fontSize: '1rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                                </div>
                              </div>
                              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
                                <label style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Refund Amount</label>
                                <div style={{ display: 'flex', alignItems: 'center', border: '1.5px solid var(--border-color)', borderRadius: 'var(--border-radius-sm)', overflow: 'hidden', background: 'var(--bg-card)' }}>
                                  <span style={{ padding: '0 6px 0 10px', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', background: 'var(--bg-input)', lineHeight: '30px', borderRight: '1px solid var(--border-color)' }}>₹</span>
                                  <input type="number" value={item.refundAmount} onChange={(e) => { const n = [...returnItems]; n[idx].refundAmount = Math.max(0, Number(e.target.value)); setReturnItems(n); }} min="0" style={{ flex: 1, border: 'none', outline: 'none', padding: '4px 8px', fontSize: '0.85rem', fontWeight: 700, fontFamily: 'var(--font-family)', background: 'transparent', color: 'var(--text-primary)', minWidth: 0, MozAppearance: 'textfield' }} />
                                </div>
                              </div>
                            </div>
                            <div style={{ marginTop: 4 }}>
                              <input type="text" placeholder="Reason (optional)" value={item.itemReason} onChange={(e) => { const n = [...returnItems]; n[idx].itemReason = e.target.value; setReturnItems(n); }} style={{ width: '100%', padding: '6px 10px', fontSize: '0.75rem', fontFamily: 'var(--font-family)', border: '1.5px solid var(--border-color)', borderRadius: 'var(--border-radius-sm)', background: 'var(--bg-card)', color: 'var(--text-primary)', outline: 'none' }} />
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Refund Details */}
                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.6rem' }}>
                      <BiWallet size={16} /><span>Refund Details</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderRadius: 'var(--border-radius-sm)', background: 'rgba(var(--primary-rgb), 0.06)', border: '1px solid rgba(var(--primary-rgb), 0.12)', fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                        <span>Total Refund</span>
                        <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary)' }}>₹{totalRefund.toFixed(2)}</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <label style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Refund Method</label>
                        <select value={refundMethod} onChange={(e) => setRefundMethod(e.target.value)} style={{ padding: '8px 10px', fontSize: '0.82rem', fontFamily: 'var(--font-family)', border: '1.5px solid var(--border-color)', borderRadius: 'var(--border-radius-sm)', background: 'var(--bg-input)', color: 'var(--text-primary)', outline: 'none' }}>
                          <option value="cash">Cash</option>
                          <option value="card">Card</option>
                          <option value="upi">UPI</option>
                          <option value="mobile_banking">Mobile Banking</option>
                        </select>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <label style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Overall Reason (optional)</label>
                        <input type="text" placeholder="e.g. Damaged product" value={reason} onChange={(e) => setReason(e.target.value)} style={{ padding: '8px 10px', fontSize: '0.82rem', fontFamily: 'var(--font-family)', border: '1.5px solid var(--border-color)', borderRadius: 'var(--border-radius-sm)', background: 'var(--bg-input)', color: 'var(--text-primary)', outline: 'none' }} />
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
            <button className="btn-premium btn-premium-secondary btn-premium-sm" onClick={onClose}>Cancel</button>
            <button className="btn-premium btn-premium-primary btn-premium-sm" onClick={handleSubmit} disabled={!hasItems || processing}>
              {processing ? <><span className="spinner-border spinner-border-sm" /> Processing...</> : <><BiUndo size={16} /> Process Return — ₹{totalRefund.toFixed(2)}</>}
            </button>
          </div>
        )}
      </div>
    </>
  );
};

// ─── Main Sales Component ────────────────────────────────────
const Sales = () => {
  const { t } = useTranslation();
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [viewingSale, setViewingSale] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [returningSale, setReturningSale] = useState(null);
  const [returnDrawerOpen, setReturnDrawerOpen] = useState(false);
  const [printingSale, setPrintingSale] = useState(null);
  const [showPrintSettings, setShowPrintSettings] = useState(false);
  const [printerSettings, setPrinterSettings] = useState(getSalesPrinterSettings);
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
    api.get('/shops/my').then(({ data }) => setShopInfo(data.shop || data)).catch(() => {});
  }, []);

  useEffect(() => {
    api.get('/sales/stats', { _skipLoading: !isFirstLoad.current }).then(({ data }) => setStats(data)).catch(() => {});
  }, []);

  // Only the very first load shows the full-page loader; subsequent fetches
  // caused by search/filter/pagination stay silent and use the table indicator.
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
      const { data } = await api.get(`/sales?${params.toString()}`, { _skipLoading: silent });
      setSales(data.sales || []);
      setTotalPages(data.pages || 1);
      setTotal(data.total || 0);
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
    api.get('/sales/stats', { _skipLoading: true }).then(({ data }) => setStats(data)).catch(() => {});
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
      showToast.success('Invoice number copied');
    }
  };

  const handlePrintClick = (sale) => {
    const saved = getSalesPrinterSettings();
    if (saved.quickPrint) {
      // Quick print - execute directly
      executePrint(sale, saved);
    } else {
      setPrintingSale(sale);
      setPrinterSettings(saved);
      setShowPrintSettings(true);
    }
  };

  const handlePrintFromModal = (sale, settings) => {
    executePrint(sale, settings);
  };

  const executePrint = (sale, settings) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const isThermal = settings.size === '58mm' || settings.size === '80mm';
    const pageWidth = settings.size === '58mm' ? '58mm' : settings.size === '80mm' ? '80mm' : '210mm';
    const template = settings.template || 'modern';

    const itemsHtml = sale.items?.map(item => {
      if (template === 'grocery') {
        return `<div class="receipt-grocery-item"><span class="receipt-grocery-item-name">${item.product?.name || item.name || 'Item'}</span><span class="receipt-grocery-item-qty">${item.quantity}${item.unit || ''}</span><span class="receipt-grocery-item-price">₹${Number(item.price).toFixed(2)}</span><span class="receipt-grocery-item-total">₹${Number(item.total).toFixed(2)}</span></div>`;
      }
      if (template === 'minimal') {
        return `<div class="receipt-minimal-item"><div class="receipt-minimal-item-name">${item.product?.name || item.name || 'Item'}</div><div class="receipt-minimal-item-line"><span>${item.quantity} x ₹${Number(item.price).toFixed(2)}</span><span class="receipt-minimal-item-total">₹${Number(item.total).toFixed(2)}</span></div></div>`;
      }
      return `<tr><td style="padding:4px 6px;border-bottom:1px dotted #ddd;font-size:11px">${item.product?.name || item.name || 'Item'}</td><td style="padding:4px 6px;border-bottom:1px dotted #ddd;font-size:11px;text-align:center">${item.quantity} ${item.unit || ''}</td><td style="padding:4px 6px;border-bottom:1px dotted #ddd;font-size:11px;text-align:right">₹${Number(item.price).toFixed(2)}</td><td style="padding:4px 6px;border-bottom:1px dotted #ddd;font-size:11px;text-align:right">₹${Number(item.total).toFixed(2)}</td></tr>`;
    }).join('') || '';

    const discountHtml = Number(sale.discount || 0) > 0 ? `<div class="total-row" style="color:#e74c3c"><span>Discount</span><span>-₹${Number(sale.discount).toFixed(2)}</span></div>` : '';
    const taxHtml = Number(sale.tax || 0) > 0 ? `<div class="total-row"><span>Tax</span><span>₹${Number(sale.tax).toFixed(2)}</span></div>` : '';
    const dueHtml = Number(sale.dueAmount || 0) > 0 ? `<div class="total-row"><span>Due</span><span style="color:#e74c3c;font-weight:700">₹${Number(sale.dueAmount).toFixed(2)}</span></div>` : '';
    const footerMsg = shopInfo?.settings?.receiptFooter || 'Thank you for your purchase!';

    printWindow.document.write(`<!DOCTYPE html><html><head><title>Invoice - ${sale.invoiceNo || ''}</title>
    <style>
      @page{width:${pageWidth};margin:${isThermal ? '0' : '10mm'};padding:${isThermal ? '3mm' : '0'}}
      *{margin:0;padding:0;box-sizing:border-box}
      body{font-family:${isThermal ? "'Courier New',monospace" : "'Inter',-apple-system,sans-serif"};width:100%;padding:${isThermal ? '3mm' : '0'};font-size:${isThermal ? (settings.size === '58mm' ? '10px' : '11px') : '14px'};line-height:1.4;color:#000;background:#fff}
      .no-print{display:none!important}
      ${template === 'grocery' ? `
        .receipt-grocery-item{display:flex;font-size:${isThermal ? '9px' : '11px'};padding:2px 0;border-bottom:1px dotted #eee}
        .receipt-grocery-item-name{flex:2;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .receipt-grocery-item-qty{flex:0.6;text-align:center}
        .receipt-grocery-item-price{flex:0.7;text-align:right}
        .receipt-grocery-item-total{flex:0.7;text-align:right;font-weight:600}
      ` : template === 'minimal' ? `
        .receipt-minimal-item{padding:3px 0;border-bottom:1px dotted #eee}
        .receipt-minimal-item-name{font-size:${isThermal ? '9px' : '11px'};font-weight:500}
        .receipt-minimal-item-line{display:flex;justify-content:space-between;font-size:${isThermal ? '8px' : '10px'};color:#666}
        .receipt-minimal-item-total{font-weight:600;color:#333}
      ` : `
        .total-row{display:flex;justify-content:space-between;font-size:${isThermal ? '10px' : '12px'};margin-bottom:2px}
        .grand-total-row{font-size:${isThermal ? '12px' : '16px'};font-weight:800;border-top:1px dashed #999;padding-top:4px;margin-top:4px}
      `}
    </style></head><body>
    ${template === 'grocery' ? `
      <div style="text-align:center;margin-bottom:6px">
        <h2 style="font-size:${isThermal ? '13px' : '18px'};font-weight:800;color:#2ecc71">${shopInfo?.shopName || 'Grocery Store'}</h2>
        <p style="font-size:${isThermal ? '8px' : '10px'};color:#666">${formatAddress(shopInfo?.address)}</p>
        ${shopInfo?.phone ? `<p style="font-size:9px;color:#333">📞 ${shopInfo.phone}</p>` : ''}
      </div>
      <div style="border-top:2px solid #2ecc71;margin:4px 0"></div>
      <div style="margin-bottom:4px">
        <div style="display:flex;justify-content:space-between;font-size:${isThermal ? '9px' : '11px'};color:#555"><span>🧾 ${sale.invoiceNo || 'N/A'}</span><span>📅 ${formatDate(sale.createdAt)}</span></div>
        <div style="display:flex;justify-content:space-between;font-size:${isThermal ? '9px' : '11px'};color:#555"><span>👤 ${sale.customer?.name || 'Walk-in Customer'}</span></div>
      </div>
      <div style="border-top:2px solid #2ecc71;margin:4px 0"></div>
      <div style="display:flex;font-weight:700;font-size:${isThermal ? '9px' : '11px'};color:#2ecc71;border-bottom:1px solid #2ecc71;padding-bottom:3px;margin-bottom:3px"><span style="flex:2">Item</span><span style="flex:0.6;text-align:center">Qty</span><span style="flex:0.7;text-align:right">₹</span><span style="flex:0.7;text-align:right">Total</span></div>
      ${itemsHtml}
      <div style="border-top:2px solid #2ecc71;margin:4px 0"></div>
      <div style="font-size:${isThermal ? '10px' : '12px'}">
        <div class="total-row"><span>Subtotal</span><span>₹${Number(sale.subtotal || 0).toFixed(2)}</span></div>
        ${discountHtml}${taxHtml}
        <div class="total-row" style="font-size:${isThermal ? '13px' : '16px'};font-weight:800;color:#2ecc71"><span>Total</span><span>₹${Number(sale.totalAmount || sale.grandTotal || 0).toFixed(2)}</span></div>
        <div class="total-row"><span>Paid</span><span style="color:#2ecc71;font-weight:700">₹${Number(sale.paidAmount || 0).toFixed(2)}</span></div>
        ${dueHtml}
        <div class="total-row"><span>Payment</span><span style="background:#2ecc71;color:#fff;padding:1px 6px;border-radius:3px;font-weight:700">${sale.paymentMethod?.toUpperCase() || 'CASH'}</span></div>
      </div>
      <div style="text-align:center;font-size:${isThermal ? '9px' : '11px'};color:#2ecc71;margin-top:6px"><p>🛒 ${footerMsg}</p></div>
    ` : template === 'minimal' ? `
      <div style="text-align:center;margin-bottom:6px">
        <h2 style="font-size:${isThermal ? '14px' : '20px'};font-weight:300;letter-spacing:1px;text-transform:uppercase">${shopInfo?.shopName || 'Shop Name'}</h2>
        <p style="font-size:${isThermal ? '8px' : '10px'};color:#999">${formatAddress(shopInfo?.address)}</p>
        ${shopInfo?.phone ? `<p style="font-size:8px;color:#999">${shopInfo.phone}</p>` : ''}
      </div>
      <div style="border-top:1px solid #333;margin:4px 0"></div>
      <div style="font-size:${isThermal ? '9px' : '11px'};color:#555"><div style="display:flex;justify-content:space-between"><span>Invoice</span><span>${sale.invoiceNo || 'N/A'}</span></div><div style="display:flex;justify-content:space-between"><span>Date</span><span>${formatDate(sale.createdAt)}</span></div><div style="display:flex;justify-content:space-between"><span>Customer</span><span>${sale.customer?.name || 'Walk-in'}</span></div></div>
      <div style="border-top:1px solid #333;margin:4px 0"></div>
      ${itemsHtml}
      <div style="border-top:1px solid #333;margin:4px 0"></div>
      <div style="font-size:${isThermal ? '10px' : '12px'}">
        <div class="total-row"><span>Subtotal</span><span>₹${Number(sale.subtotal || 0).toFixed(2)}</span></div>
        ${discountHtml}${taxHtml}
        <div class="total-row" style="font-size:${isThermal ? '13px' : '16px'};font-weight:800;border-top:1px solid #333;padding-top:4px;margin-top:4px"><span>Total</span><span>₹${Number(sale.totalAmount || sale.grandTotal || 0).toFixed(2)}</span></div>
        <div class="total-row"><span>Paid</span><span>₹${Number(sale.paidAmount || 0).toFixed(2)}</span></div>
        ${dueHtml}
      </div>
      <div style="text-align:center;font-size:${isThermal ? '9px' : '11px'};color:#999;margin-top:6px;font-style:italic"><p>${footerMsg}</p></div>
    ` : `
      <div style="text-align:center;margin-bottom:8px">
        <h2 style="font-size:${isThermal ? '13px' : '18px'};font-weight:800">${shopInfo?.shopName || 'Shop Name'}</h2>
        <p style="font-size:${isThermal ? '9px' : '11px'};color:#555">${formatAddress(shopInfo?.address)}</p>
        ${shopInfo?.phone ? `<p style="font-size:9px;color:#555">Tel: ${shopInfo.phone}</p>` : ''}
      </div>
      <div style="border-top:1px dashed #999;margin:6px 0"></div>
      <div style="font-size:${isThermal ? '10px' : '12px'};margin-bottom:6px">
        <div style="display:flex;justify-content:space-between;margin-bottom:2px"><span style="color:#888">Invoice:</span><span style="font-weight:700">${sale.invoiceNo || 'N/A'}</span></div>
        <div style="display:flex;justify-content:space-between;margin-bottom:2px"><span style="color:#888">Date:</span><span style="font-weight:700">${formatDate(sale.createdAt)}</span></div>
        <div style="display:flex;justify-content:space-between;margin-bottom:2px"><span style="color:#888">Customer:</span><span style="font-weight:700">${sale.customer?.name || 'Walk-in Customer'}</span></div>
      </div>
      <div style="border-top:1px dashed #999;margin:6px 0"></div>
      <table style="width:100%;border-collapse:collapse;margin:6px 0;font-size:${isThermal ? '10px' : '12px'}">
        <tr><th style="text-align:left;border-bottom:1px solid #333;padding:4px 6px">Item</th><th style="text-align:center;border-bottom:1px solid #333;padding:4px 6px">Qty</th><th style="text-align:right;border-bottom:1px solid #333;padding:4px 6px">Price</th><th style="text-align:right;border-bottom:1px solid #333;padding:4px 6px">Total</th></tr>
        ${itemsHtml}
      </table>
      <div style="border-top:1px dashed #999;margin:6px 0"></div>
      <div style="font-size:${isThermal ? '11px' : '13px'}">
        <div class="total-row"><span>Subtotal</span><span>₹${Number(sale.subtotal || 0).toFixed(2)}</span></div>
        ${discountHtml}${taxHtml}
        <div class="total-row grand-total-row"><span>Grand Total</span><span>₹${Number(sale.totalAmount || sale.grandTotal || 0).toFixed(2)}</span></div>
        <div class="total-row"><span>Paid</span><span style="color:#2ecc71;font-weight:700">₹${Number(sale.paidAmount || 0).toFixed(2)}</span></div>
        ${dueHtml}
        <div class="total-row"><span>Payment</span><span style="font-weight:800;color:#2ecc71">${sale.paymentMethod?.toUpperCase() || 'CASH'}</span></div>
      </div>
      <div style="border-top:1px dashed #999;margin:6px 0"></div>
      <div style="text-align:center;font-size:${isThermal ? '9px' : '11px'};color:#888;margin-top:6px">
        <p>${footerMsg}</p>
        <p style="font-size:${isThermal ? '8px' : '9px'}">Visit us again!</p>
      </div>
    `}
    </body></html>`);
    printWindow.document.close();
    setTimeout(() => { printWindow.focus(); printWindow.print(); }, 500);
  };

  const statCards = [
    { label: "Today's Sales", value: stats?.todaySales || 0, icon: BiDollar, color: 'primary' },
    { label: "Today's Revenue", value: `₹${Number(stats?.todayRevenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, icon: BiTrendingUp, color: 'success' },
    { label: 'Total Due', value: `₹${Number(stats?.todayDue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, icon: BiWallet, color: 'danger' },
    { label: 'Transactions', value: stats?.count || 0, icon: BiCart, color: 'warning' },
  ];

  return (
    <div>
      <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
        <div>
          <h4 className="mb-1" style={{ fontWeight: 800 }}>{t('nav.sales')}</h4>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>Manage your sales and invoices</p>
        </div>
        <div className="d-flex gap-2">
          <button className="btn-premium btn-premium-secondary" onClick={refreshAll}><BiRefresh size={18} /> Refresh</button>
          <button className="btn-premium btn-premium-primary" onClick={() => window.location.href = '/pos'}><BiDollar size={18} /> New Sale</button>
        </div>
      </div>

      <div className="row g-3 mb-4">
        {statCards.map((card, idx) => (
          <div key={idx} className="col-6 col-md-3">
            <StatCard icon={card.icon} label={card.label} value={card.value} color={card.color} />
          </div>
        ))}
      </div>

      <div className="sales-filters-wrapper" ref={filtersRef}>
        <div className="sales-filters">
          <div className="sales-filter search-box">
            <BiSearch className="search-icon" />
            <input className="form-control sales-filter-input" placeholder="Search by Invoice, Customer Name or Phone..." value={search} onChange={(e) => setSearch(e.target.value)} />
            {searching && <span className="search-box-spinner" aria-hidden="true" />}
          </div>
          <div className="sales-filter">
            <BiCalendar size={14} className="sales-filter-icon-abs" />
            <input type="date" className="form-control sales-filter-input" style={{ paddingLeft: '30px' }} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="sales-filter">
            <BiCalendar size={14} className="sales-filter-icon-abs" />
            <input type="date" className="form-control sales-filter-input" style={{ paddingLeft: '30px' }} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
          <div className="sales-filter">
            <select className="form-control sales-filter-input" value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)}>
              {STATUS_OPTIONS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className={`sales-table-container table-container ${searching ? 'is-refreshing' : ''}`}>
        <div className="sales-table-scroll">
          <table className="sales-table">
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Date & Time</th>
                <th>Customer</th>
                <th>Total Amount</th>
                <th>Payment Status</th>
                <th>Return Status</th>
                <th style={{ width: '110px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7}><div className="sales-empty-state"><div className="spinner-border spinner-border-sm me-2" /> Loading...</div></td></tr>
              ) : sales.length === 0 ? (
                <tr><td colSpan={7}><div className="sales-empty-state"><span className="sales-empty-icon">🧾</span><p>No sales found</p></div></td></tr>
              ) : sales.map((sale, idx) => {
                const st = STATUS_STYLES[sale.paymentStatus] || STATUS_STYLES.paid;
                const rs = RETURN_STYLES[sale.returnStatus] || RETURN_STYLES.none;
                return (
                  <tr key={sale._id} className={idx % 2 === 0 ? 'sales-row-even' : 'sales-row-odd'}>
                    <td><span className="sales-invoice-badge"><BiHash size={12} />{sale.invoiceNo || 'N/A'}</span></td>
                    <td>
                      <div className="sales-date-cell">
                        <span className="sales-date-text">{formatDate(sale.createdAt)}</span>
                        <span className="sales-time-text"><BiTime size={12} /> {formatTime(sale.createdAt)}</span>
                      </div>
                    </td>
                    <td>
                      <div className="sales-customer-cell">
                        <span className="sales-customer-name">{sale.customer?.name || 'Walk-in'}</span>
                        {sale.customer?.phone && <span className="sales-customer-phone">{sale.customer.phone}</span>}
                      </div>
                    </td>
                    <td><span className="sales-amount">₹{Number(sale.totalAmount || sale.grandTotal || 0).toFixed(2)}</span></td>
                    <td><span className="sales-status-badge" style={{ background: st.bg, color: st.color }}>{st.label}</span></td>
                    <td><span className="sales-return-badge" style={{ background: rs.bg, color: rs.color }}>{rs.label}</span></td>
                    <td>
                      <div className="sales-actions">
                        <button className="sales-action-btn sales-action-view" title="View" onClick={() => handleView(sale)}><BiShow size={16} /></button>
                        <button className="sales-action-btn sales-action-print" title="Print" onClick={() => handlePrintClick(sale)}><BiPrinter size={16} /></button>
                        <button className="sales-action-btn sales-action-return" title="Return" onClick={() => handleReturn(sale)}><BiUndo size={16} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="sales-pagination">
          <span className="sales-pagination-info">Page {page} of {totalPages} ({total} total)</span>
          <div className="sales-pagination-btns">
            <button className="sales-btn sales-btn-secondary sales-btn-sm" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}><BiChevronLeft size={16} /> Previous</button>
            <button className="sales-btn sales-btn-secondary sales-btn-sm" disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>Next <BiChevronRight size={16} /></button>
          </div>
        </div>
      )}

      {showPrintSettings && printingSale && (
        <PrintSettingsModal
          currentSettings={printerSettings}
          sale={printingSale}
          shopInfo={shopInfo}
          onPrint={handlePrintFromModal}
          onDownload={() => {}}
          onClose={() => { setShowPrintSettings(false); setPrintingSale(null); }}
        />
      )}

      <SaleViewDrawer open={drawerOpen} onClose={() => { setDrawerOpen(false); setViewingSale(null); }} sale={viewingSale} shopInfo={shopInfo} onPrint={handlePrintClick} onCopyInvoice={handleCopyInvoice} />
      <ReturnDrawer open={returnDrawerOpen} onClose={() => { setReturnDrawerOpen(false); setReturningSale(null); }} sale={returningSale} onReturnProcessed={handleReturnProcessed} />
    </div>
  );
};

export default Sales;