import React, { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { BiPrinter, BiX } from 'react-icons/bi';

const PrintPreview = ({ sale, shopInfo, onClose }) => {
  const { t } = useTranslation();
  const previewRef = useRef(null);

  // ─── Read ALL settings from the global Shop Information ─────────────────
  const size = shopInfo?.settings?.paperSize || '80mm';
  const template = shopInfo?.settings?.invoiceTemplate || 'modern';
  const printMode = shopInfo?.settings?.printMode || 'thermal';
  const isA4 = size === 'a4';
  // "Normal" print mode always uses the wide/desktop layout even on
  // thermal-sized paper; otherwise thermal formatting follows paper size.
  const isThermal = printMode === 'normal' ? false : !isA4;

  const showLogo = shopInfo?.settings?.showLogo !== false;
  const showQR = shopInfo?.settings?.showQR !== false;
  const showBarcode = shopInfo?.settings?.showBarcode || false;
  const showHeader = shopInfo?.settings?.showHeader !== false;
  const showFooter = shopInfo?.settings?.showFooter !== false;

  const marginTop = shopInfo?.settings?.marginTop || 0;
  const marginBottom = shopInfo?.settings?.marginBottom || 0;
  const marginLeft = shopInfo?.settings?.marginLeft || 0;
  const marginRight = shopInfo?.settings?.marginRight || 0;

  const printCopies = Math.max(1, shopInfo?.settings?.printCopies || 1);
  const footerMsg = shopInfo?.settings?.receiptFooter || t('posPage.receipt.defaultFooter');
  const taxName = shopInfo?.settings?.taxName || t('posPage.receipt.defaultTaxName');

  // sale.totalAmount is already the floored Final Payable amount (rounding
  // happens once, at sale creation) — reconstruct the pre-round Grand Total
  // from the stored roundOff delta so every template below can show the
  // full Subtotal → Tax → Discount → Grand Total → Round Off → Payable
  // breakdown without re-deriving anything.
  const payableAmount = Number(sale?.totalAmount ?? sale?.grandTotal ?? 0);
  const roundOff = Number(sale?.roundOff || 0);
  const rawGrandTotal = payableAmount - roundOff;

  // Translated display label for a payment method key — printing the raw
  // stored value (e.g. "MOBILE_BANKING") would bypass the rename to "Other".
  const PAYMENT_METHOD_LABELS = {
    cash: t('sale.cash'), card: t('sale.card'), upi: t('sale.upi'),
    mobile_banking: t('sale.mobileBanking'), due: t('common.due'),
  };
  const paymentMethodLabel = (method) => (PAYMENT_METHOD_LABELS[method] || method || t('sale.cash')).toUpperCase();

  // ─── Helpers ────────────────────────────────────────────────────────────
  const formatAddress = (addr) => {
    if (!addr) return '';
    if (typeof addr === 'string') return addr;
    if (typeof addr === 'object') {
      if (addr.street || addr.city || addr.state || addr.zipCode || addr.country) {
        const parts = [];
        if (addr.street) parts.push(addr.street);
        if (addr.city) parts.push(addr.city);
        if (addr.state) parts.push(addr.state);
        if (addr.zipCode) parts.push(addr.zipCode);
        if (addr.country) {
          if (typeof addr.country === 'string') parts.push(addr.country);
          else if (addr.country?.name) parts.push(addr.country.name);
          else if (addr.country?.label) parts.push(addr.country.label);
        }
        return parts.join(', ');
      }
      const values = Object.values(addr).filter(v => typeof v === 'string');
      return values.length > 0 ? values.join('') : '';
    }
    return String(addr);
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true
    });
  };

  // A Custom Quantity line item stores what the cashier actually entered
  // (enteredQuantity/enteredUnit, e.g. "200 ml") separately from the Base
  // Unit amount used for stock/pricing (quantity/unit, e.g. "0.2 liter") —
  // the invoice must always show what the customer was sold, not the
  // internal Base Unit conversion. Ordinary line items have no
  // enteredQuantity, so this just falls back to quantity/unit unchanged.
  const displayQty = (item) => item.enteredQuantity ?? item.quantity;
  const displayUnit = (item) => item.enteredUnit ?? item.unit ?? '';

  // ─── Single source of truth for receipt styling ──────────────────────────
  // This exact CSS text is used both for the on-screen preview (injected via
  // a <style> tag) and for the print window's <head>. They must never diverge
  // — that divergence (preview using stale CSS from index.css while print
  // used its own embedded stylesheet) was the original bug.
  const buildReceiptCss = () => {
    const contentWidth = isA4 ? '190mm' : isThermal ? (size === '58mm' ? '48mm' : '72mm') : '100%';
    const fontFamily = isThermal ? "'Courier New', monospace" : "'Inter', -apple-system, sans-serif";
    const fontSize = isThermal ? (size === '58mm' ? '10px' : '11px') : '13px';
    const basePad = isThermal ? 3 : 10;

    return `
    .receipt-canvas {
      width: ${contentWidth};
      max-width: 100%;
      margin: 0 auto;
      box-sizing: border-box;
      padding: calc(${basePad}mm + ${marginTop}mm) calc(${basePad}mm + ${marginRight}mm) calc(${basePad}mm + ${marginBottom}mm) calc(${basePad}mm + ${marginLeft}mm);
      font-family: ${fontFamily};
      font-size: ${fontSize};
      line-height: 1.4;
      color: #000;
      background: #fff;
    }
    .receipt { width: 100%; }
    .receipt-header, .receipt-modern-header, .receipt-minimal-header, .receipt-grocery-header {
      text-align: center;
      margin-bottom: ${isThermal ? '4px' : '12px'};
    }
    .receipt-logo { margin-bottom: ${isThermal ? '3px' : '8px'}; }
    .receipt-logo-img { max-width: ${isThermal ? '50px' : '80px'}; max-height: ${isThermal ? '50px' : '80px'}; }
    .receipt-logo-placeholder, .receipt-modern-logo-placeholder, .receipt-grocery-logo-placeholder {
      width: ${isThermal ? '36px' : '60px'}; height: ${isThermal ? '36px' : '60px'};
      margin: 0 auto; border-radius: 50%;
      background: linear-gradient(135deg, #6C63FF, #00D9A6);
      display: flex; align-items: center; justify-content: center;
      color: #fff; font-size: ${isThermal ? '14px' : '24px'};
    }
    .receipt-shop-name { font-size: ${isThermal ? '13px' : '18px'}; font-weight: 800; margin-bottom: 2px; }
    .receipt-shop-address { font-size: ${isThermal ? '9px' : '11px'}; color: #555; line-height: 1.3; }
    .receipt-divider { border-top: 1px dashed #999; margin: ${isThermal ? '4px' : '8px'} 0; }
    .receipt-info { margin-bottom: ${isThermal ? '4px' : '8px'}; }
    .receipt-info-row { display: flex; justify-content: space-between; font-size: ${isThermal ? '10px' : '12px'}; margin-bottom: 2px; }
    .receipt-label { color: #888; }
    .receipt-value { font-weight: 700; }
    .receipt-items { margin-bottom: ${isThermal ? '4px' : '8px'}; }
    .receipt-items-header {
      display: flex; font-weight: 700; font-size: ${isThermal ? '9px' : '11px'};
      border-bottom: 1px solid #333; padding-bottom: 3px; margin-bottom: 3px;
    }
    .receipt-col-item { flex: 2; overflow: hidden; text-overflow: ellipsis; white-space: ${isThermal ? 'nowrap' : 'normal'}; }
    .receipt-col-qty { flex: 0.6; text-align: center; }
    .receipt-col-price { flex: 0.8; text-align: right; }
    .receipt-col-total { flex: 0.8; text-align: right; }
    .receipt-item-row { display: flex; font-size: ${isThermal ? '9px' : '11px'}; margin-bottom: 2px; padding-bottom: 2px; border-bottom: 1px dotted #ddd; }
    .receipt-item-name { display: block; word-break: break-word; }
    .receipt-item-discount { font-size: 8px; color: #e74c3c; }
    .receipt-totals { margin-bottom: ${isThermal ? '4px' : '8px'}; }
    .receipt-total-row { display: flex; justify-content: space-between; font-size: ${isThermal ? '10px' : '12px'}; margin-bottom: 2px; }
    .receipt-discount { color: #e74c3c; }
    .receipt-due { color: #e74c3c; font-weight: 700; }
    .receipt-grand-total { font-size: ${isThermal ? '12px' : '16px'}; font-weight: 800; }
    .receipt-payment-method { font-weight: 800; color: #2ecc71; }
    .receipt-footer { text-align: center; font-size: ${isThermal ? '9px' : '11px'}; color: #888; margin-top: ${isThermal ? '4px' : '8px'}; }
    .receipt-footer-small { font-size: 8px; }
    .receipt-qr, .receipt-barcode { display: flex; justify-content: center; margin-top: ${isThermal ? '4px' : '12px'}; }

    /* Modern template */
    .receipt-modern-header { display: flex; justify-content: space-between; align-items: flex-start; text-align: left; margin-bottom: 8px; }
    .receipt-modern-brand { display: flex; align-items: center; gap: 8px; }
    .receipt-modern-logo { max-width: 50px; max-height: 50px; border-radius: 8px; }
    .receipt-modern-shop-name { font-size: ${isThermal ? '12px' : '16px'}; font-weight: 800; }
    .receipt-modern-address { font-size: ${isThermal ? '8px' : '10px'}; color: #666; }
    .receipt-modern-invoice-badge { background: #6C63FF; color: #fff; padding: 2px 8px; border-radius: 4px; font-size: ${isThermal ? '9px' : '11px'}; font-weight: 700; }
    .receipt-modern-meta { display: flex; flex-wrap: wrap; gap: 4px 12px; font-size: ${isThermal ? '9px' : '11px'}; color: #555; margin-bottom: 6px; }
    .receipt-modern-meta-item { display: flex; align-items: center; gap: 3px; }
    .receipt-modern-divider { border-top: 2px solid #6C63FF; margin: 6px 0; }
    .receipt-modern-items { margin-bottom: 6px; }
    .receipt-modern-items-header { display: flex; justify-content: space-between; font-weight: 700; font-size: ${isThermal ? '9px' : '11px'}; padding: 4px 0; border-bottom: 1px solid #ddd; }
    .receipt-modern-item { padding: 4px 0; border-bottom: 1px dotted #eee; }
    .receipt-modern-item-name { font-weight: 600; font-size: ${isThermal ? '10px' : '12px'}; }
    .receipt-modern-item-details { display: flex; justify-content: space-between; font-size: ${isThermal ? '9px' : '11px'}; color: #555; }
    .receipt-modern-item-total { font-weight: 700; color: #333; }
    .receipt-modern-item-discount { font-size: 8px; color: #e74c3c; }
    .receipt-grocery-item-discount { font-size: 8px; color: #e74c3c; }
    .receipt-modern-totals { margin-bottom: 6px; }
    .receipt-modern-total-row { display: flex; justify-content: space-between; font-size: ${isThermal ? '10px' : '12px'}; margin-bottom: 2px; }
    .receipt-modern-grand-total { display: flex; justify-content: space-between; font-size: ${isThermal ? '13px' : '18px'}; font-weight: 800; padding: 4px 0; border-top: 2px solid #6C63FF; margin-top: 4px; }
    .receipt-modern-grand-amount { color: #6C63FF; }
    .receipt-modern-paid { color: #2ecc71; font-weight: 700; }
    .receipt-modern-due { color: #e74c3c; font-weight: 700; }
    .receipt-modern-payment-badge { background: #2ecc71; color: #fff; padding: 1px 6px; border-radius: 3px; font-size: ${isThermal ? '9px' : '11px'}; font-weight: 700; }
    .receipt-modern-footer { text-align: center; font-size: ${isThermal ? '9px' : '11px'}; color: #888; margin-top: 6px; }

    /* Minimal template */
    .receipt-minimal-header { text-align: center; margin-bottom: 6px; }
    .receipt-minimal-shop-name { font-size: ${isThermal ? '14px' : '20px'}; font-weight: 300; letter-spacing: 1px; text-transform: uppercase; }
    .receipt-minimal-address { font-size: ${isThermal ? '8px' : '10px'}; color: #999; }
    .receipt-minimal-divider { border-top: 1px solid #333; margin: 4px 0; }
    .receipt-minimal-info { margin-bottom: 4px; }
    .receipt-minimal-info-row { display: flex; justify-content: space-between; font-size: ${isThermal ? '9px' : '11px'}; color: #555; margin-bottom: 1px; }
    .receipt-minimal-items { margin-bottom: 4px; }
    .receipt-minimal-item { padding: 3px 0; border-bottom: 1px dotted #eee; }
    .receipt-minimal-item-name { font-size: ${isThermal ? '10px' : '12px'}; font-weight: 500; }
    .receipt-minimal-item-line { display: flex; justify-content: space-between; font-size: ${isThermal ? '9px' : '11px'}; color: #666; }
    .receipt-minimal-item-total { font-weight: 600; color: #333; }
    .receipt-minimal-totals { margin-bottom: 4px; }
    .receipt-minimal-total-row { display: flex; justify-content: space-between; font-size: ${isThermal ? '10px' : '12px'}; margin-bottom: 2px; }
    .receipt-minimal-grand { font-size: ${isThermal ? '13px' : '16px'}; font-weight: 800; border-top: 1px solid #333; padding-top: 4px; margin-top: 4px; }
    .receipt-minimal-due { color: #e74c3c; }
    .receipt-minimal-footer { text-align: center; font-size: ${isThermal ? '9px' : '11px'}; color: #999; margin-top: 6px; font-style: italic; }

    /* Grocery template */
    .receipt-grocery-header { text-align: center; margin-bottom: 6px; }
    .receipt-grocery-logo { margin-bottom: 4px; }
    .receipt-grocery-logo-img { max-width: ${isThermal ? '40px' : '70px'}; max-height: ${isThermal ? '40px' : '70px'}; }
    .receipt-grocery-shop-name { font-size: ${isThermal ? '13px' : '18px'}; font-weight: 800; color: #2ecc71; }
    .receipt-grocery-address { font-size: ${isThermal ? '8px' : '10px'}; color: #666; }
    .receipt-grocery-phone { font-size: ${isThermal ? '9px' : '11px'}; color: #333; }
    .receipt-grocery-divider { border-top: 2px solid #2ecc71; margin: 4px 0; }
    .receipt-grocery-info { margin-bottom: 4px; }
    .receipt-grocery-info-row { display: flex; justify-content: space-between; font-size: ${isThermal ? '9px' : '11px'}; color: #555; margin-bottom: 2px; }
    .receipt-grocery-items { margin-bottom: 4px; }
    .receipt-grocery-items-header { display: flex; font-weight: 700; font-size: ${isThermal ? '9px' : '11px'}; border-bottom: 1px solid #2ecc71; padding-bottom: 3px; margin-bottom: 3px; color: #2ecc71; }
    .receipt-grocery-item { display: flex; font-size: ${isThermal ? '9px' : '11px'}; padding: 2px 0; border-bottom: 1px dotted #eee; }
    .receipt-grocery-item-name { flex: 2; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .receipt-grocery-item-qty { flex: 0.6; text-align: center; }
    .receipt-grocery-item-price { flex: 0.7; text-align: right; }
    .receipt-grocery-item-total { flex: 0.7; text-align: right; font-weight: 600; }
    .receipt-grocery-totals { margin-bottom: 4px; }
    .receipt-grocery-total-row { display: flex; justify-content: space-between; font-size: ${isThermal ? '10px' : '12px'}; margin-bottom: 2px; }
    .receipt-grocery-grand { font-size: ${isThermal ? '13px' : '16px'}; font-weight: 800; color: #2ecc71; border-top: 1px solid #2ecc71; padding-top: 4px; margin-top: 4px; }
    .receipt-grocery-due { color: #e74c3c; }
    .receipt-grocery-payment { background: #2ecc71; color: #fff; padding: 1px 6px; border-radius: 3px; font-weight: 700; }
    .receipt-grocery-footer { text-align: center; font-size: ${isThermal ? '9px' : '11px'}; color: #2ecc71; margin-top: 6px; }
    .receipt-grocery-footer-small { font-size: 8px; color: #888; }
    `;
  };

  // ─── Build the complete printable HTML — reuses buildReceiptCss() so the
  // print output can never drift from what's on screen. ────────────────────
  const getPrintHtml = () => {
    const content = previewRef.current?.innerHTML || '';
    const pageWidth = size === '58mm' ? '58mm' : size === '80mm' ? '80mm' : '210mm';

    return `<!DOCTYPE html>
<html>
<head>
  <title>Invoice - ${sale?.invoiceNo || ''}</title>
  <style>
    @page { size: ${pageWidth} auto; margin: 0; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: #fff; }
    .no-print { display: none !important; }
    ${buildReceiptCss()}
  </style>
</head>
<body>
  ${content}
</body>
</html>`;
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(getPrintHtml());
    printWindow.document.close();
    setTimeout(() => {
      printWindow.focus();
      for (let i = 0; i < printCopies; i++) printWindow.print();
    }, 500);
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

  const InvoiceBarcode = ({ value, width = 130, height = 34 }) => {
    const code = (value || 'INV').toString();
    const bars = [];
    let x = 2;
    for (let i = 0; i < code.length; i++) {
      const c = code.charCodeAt(i);
      const w1 = 1 + (c % 3);
      const w2 = 1 + ((c >> 2) % 3);
      bars.push({ x, w: w1 }); x += w1 + 1;
      bars.push({ x, w: w2 }); x += w2 + 2;
    }
    const totalWidth = x + 2;
    return (
      <svg width={width} height={height} viewBox={`0 0 ${totalWidth} 40`} preserveAspectRatio="none" style={{ display: 'block' }}>
        <rect width={totalWidth} height={40} fill="white" />
        {bars.map((b, i) => <rect key={i} x={b.x} y={2} width={b.w} height={27} fill="black" />)}
        <text x={totalWidth / 2} y={38} fontSize="6" textAnchor="middle" fontFamily="monospace" fill="#000">{code}</text>
      </svg>
    );
  };

  // ─── Template renderers ─────────────────────────────────────────────────
  const renderClassic = () => (
    <div className="receipt">
      <div className="receipt-header">
        {showLogo && (
          <div className="receipt-logo">
            {shopInfo?.logo ? (
              <img src={shopInfo.logo} alt="Logo" className="receipt-logo-img" />
            ) : (
              <div className="receipt-logo-placeholder"><BiPrinter size={isThermal ? 20 : 28} /></div>
            )}
          </div>
        )}
        {showHeader && (
          <>
            <h2 className="receipt-shop-name">{shopInfo?.name || shopInfo?.shopName || t('posPage.receipt.shopNameFallback')}</h2>
            <p className="receipt-shop-address">{formatAddress(shopInfo?.address)}</p>
            {shopInfo?.phone && <p className="receipt-shop-address">📞 {shopInfo.phone}</p>}
            {shopInfo?.email && <p className="receipt-shop-address">📧 {shopInfo.email}</p>}
          </>
        )}
      </div>
      <div className="receipt-divider" />
      <div className="receipt-info">
        <div className="receipt-info-row"><span className="receipt-label">{t('sale.invoice')}</span><span className="receipt-value">{sale?.invoiceNo || t('common.notAvailable')}</span></div>
        <div className="receipt-info-row"><span className="receipt-label">{t('common.date')}</span><span className="receipt-value">{formatDate(sale?.createdAt)}</span></div>
        <div className="receipt-info-row"><span className="receipt-label">{t('sale.customer')}</span><span className="receipt-value">{sale?.customer?.name || t('posPage.customer.walkIn')}</span></div>
        <div className="receipt-info-row"><span className="receipt-label">{t('posPage.receipt.cashier')}</span><span className="receipt-value">{t('posPage.receipt.cashier')}</span></div>
      </div>
      <div className="receipt-divider" />
      <div className="receipt-items">
        <div className="receipt-items-header">
          <span className="receipt-col-item">{t('posPage.receipt.item')}</span>
          <span className="receipt-col-qty">{t('posPage.receipt.qty')}</span>
          <span className="receipt-col-price">{t('common.price')}</span>
          <span className="receipt-col-total">{t('common.total')}</span>
        </div>
        {sale?.items?.map((item, idx) => (
          <div key={idx} className="receipt-item-row">
            <div className="receipt-col-item">
              <span className="receipt-item-name">{item.product?.name || item.name || t('posPage.receipt.item')}</span>
              {item.discount > 0 && <span className="receipt-item-discount">-{t('posPage.receipt.percentOff', { discount: item.discount })}</span>}
            </div>
            <div className="receipt-col-qty">{displayQty(item)} {displayUnit(item)}</div>
            <div className="receipt-col-price">₹{Number(item.price).toFixed(2)}</div>
            <div className="receipt-col-total">₹{Number(item.total).toFixed(2)}</div>
          </div>
        ))}
      </div>
      <div className="receipt-divider" />
      <div className="receipt-totals">
        <div className="receipt-total-row"><span>{t('sale.subtotal')}</span><span>₹{Number(sale?.subtotal || 0).toFixed(2)}</span></div>
        {Number(sale?.tax || 0) > 0 && <div className="receipt-total-row"><span>{taxName}</span><span>₹{Number(sale?.tax || 0).toFixed(2)}</span></div>}
        {Number(sale?.discount || 0) > 0 && <div className="receipt-total-row receipt-discount"><span>{t('sale.discount')}</span><span>-₹{Number(sale?.discount || 0).toFixed(2)}</span></div>}
        <div className="receipt-total-row"><span>{t('posPage.totals.grandTotal')}</span><span>₹{Number(rawGrandTotal || 0).toFixed(2)}</span></div>
        {roundOff !== 0 && <div className="receipt-total-row"><span>{t('posPage.totals.roundOff')}</span><span>-₹{Number(Math.abs(roundOff) || 0).toFixed(2)}</span></div>}
        <div className="receipt-total-row"><span className="receipt-grand-total">{t('posPage.totals.payable')}</span><span className="receipt-grand-total">₹{Number(payableAmount || 0).toFixed(2)}</span></div>
        <div className="receipt-total-row"><span>{t('common.paid')}</span><span>₹{Number(sale?.paidAmount || 0).toFixed(2)}</span></div>
        {Number(sale?.dueAmount || 0) > 0 && <div className="receipt-total-row receipt-due"><span>{t('common.due')}</span><span>₹{Number(sale?.dueAmount || 0).toFixed(2)}</span></div>}
        <div className="receipt-total-row"><span>{t('posPage.receipt.payment')}</span><span className="receipt-payment-method">{paymentMethodLabel(sale?.paymentMethod)}</span></div>
      </div>
      {showFooter && (
        <div className="receipt-footer">
          <p>{footerMsg}</p>
          {showBarcode && <div className="receipt-barcode"><InvoiceBarcode value={sale?.invoiceNo} width={isThermal ? (size === '58mm' ? 90 : 120) : 160} height={isThermal ? 28 : 36} /></div>}
          {showQR && !isThermal && <div className="receipt-qr"><InvoiceQR invoiceNo={sale?.invoiceNo} size={isA4 ? 80 : 50} /></div>}
        </div>
      )}
    </div>
  );

  const renderModern = () => (
    <div className="receipt receipt-modern">
      <div className="receipt-modern-header">
        <div className="receipt-modern-brand">
          {showLogo && (shopInfo?.logo ? (
            <img src={shopInfo.logo} alt="Logo" className="receipt-modern-logo" />
          ) : (
            <div className="receipt-modern-logo-placeholder"><BiPrinter size={isThermal ? 18 : 24} /></div>
          ))}
          {showHeader && (
            <div>
              <h2 className="receipt-modern-shop-name">{shopInfo?.name || shopInfo?.shopName || t('posPage.receipt.shopNameFallback')}</h2>
              <p className="receipt-modern-address">{formatAddress(shopInfo?.address)}</p>
            </div>
          )}
        </div>
        <div className="receipt-modern-invoice-badge">#{sale?.invoiceNo || t('common.notAvailable')}</div>
      </div>
      <div className="receipt-modern-meta">
        <span className="receipt-modern-meta-item">📅 {formatDate(sale?.createdAt)}</span>
        <span className="receipt-modern-meta-item">👤 {sale?.customer?.name || t('posPage.customer.walkIn')}</span>
        <span className="receipt-modern-meta-item">👨‍💼 {t('posPage.receipt.cashier')}</span>
      </div>
      <div className="receipt-modern-divider" />
      <div className="receipt-modern-items">
        <div className="receipt-modern-items-header">
          <span>{t('posPage.receipt.item')}</span><span>{t('posPage.receipt.qty')}</span><span>{t('common.price')}</span><span>{t('common.total')}</span>
        </div>
        {sale?.items?.map((item, idx) => (
          <div key={idx} className="receipt-modern-item">
            <div className="receipt-modern-item-name">{item.product?.name || item.name || t('posPage.receipt.item')}</div>
            <div className="receipt-modern-item-details">
              <span>{displayQty(item)} {displayUnit(item)}</span>
              <span>₹{Number(item.price).toFixed(2)}</span>
              <span className="receipt-modern-item-total">₹{Number(item.total).toFixed(2)}</span>
            </div>
            {item.discount > 0 && <div className="receipt-modern-item-discount">-{t('posPage.receipt.percentOff', { discount: item.discount })}</div>}
          </div>
        ))}
      </div>
      <div className="receipt-modern-divider" />
      <div className="receipt-modern-totals">
        <div className="receipt-modern-total-row"><span>{t('sale.subtotal')}</span><span>₹{Number(sale?.subtotal || 0).toFixed(2)}</span></div>
        {Number(sale?.tax || 0) > 0 && <div className="receipt-modern-total-row"><span>{taxName}</span><span>₹{Number(sale?.tax || 0).toFixed(2)}</span></div>}
        {Number(sale?.discount || 0) > 0 && <div className="receipt-modern-total-row receipt-modern-discount"><span>{t('sale.discount')}</span><span>-₹{Number(sale?.discount || 0).toFixed(2)}</span></div>}
        <div className="receipt-modern-total-row"><span>{t('posPage.totals.grandTotal')}</span><span>₹{Number(rawGrandTotal || 0).toFixed(2)}</span></div>
        {roundOff !== 0 && <div className="receipt-modern-total-row"><span>{t('posPage.totals.roundOff')}</span><span>-₹{Number(Math.abs(roundOff) || 0).toFixed(2)}</span></div>}
        <div className="receipt-modern-grand-total"><span>{t('posPage.totals.payable')}</span><span className="receipt-modern-grand-amount">₹{Number(payableAmount || 0).toFixed(2)}</span></div>
        <div className="receipt-modern-total-row"><span>{t('common.paid')}</span><span className="receipt-modern-paid">₹{Number(sale?.paidAmount || 0).toFixed(2)}</span></div>
        {Number(sale?.dueAmount || 0) > 0 && <div className="receipt-modern-total-row"><span>{t('common.due')}</span><span className="receipt-modern-due">₹{Number(sale?.dueAmount || 0).toFixed(2)}</span></div>}
        <div className="receipt-modern-total-row"><span>{t('posPage.receipt.payment')}</span><span className="receipt-modern-payment-badge">{paymentMethodLabel(sale?.paymentMethod)}</span></div>
      </div>
      {showFooter && (
        <div className="receipt-modern-footer">
          <p>{footerMsg}</p>
          {showBarcode && <div className="receipt-barcode"><InvoiceBarcode value={sale?.invoiceNo} width={isThermal ? (size === '58mm' ? 90 : 120) : 160} height={isThermal ? 28 : 36} /></div>}
          {showQR && !isThermal && <div className="receipt-qr"><InvoiceQR invoiceNo={sale?.invoiceNo} size={isA4 ? 80 : 50} /></div>}
        </div>
      )}
    </div>
  );

  const renderMinimal = () => (
    <div className="receipt receipt-minimal">
      {showHeader && (
        <div className="receipt-minimal-header">
          {showLogo && shopInfo?.logo && <img src={shopInfo.logo} alt="Logo" className="receipt-logo-img" style={{ maxWidth: isThermal ? '40px' : '70px', maxHeight: isThermal ? '40px' : '70px', marginBottom: '4px' }} />}
          <h2 className="receipt-minimal-shop-name">{shopInfo?.name || shopInfo?.shopName || t('posPage.receipt.shopNameFallback')}</h2>
          <p className="receipt-minimal-address">{formatAddress(shopInfo?.address)}</p>
          {shopInfo?.phone && <p className="receipt-minimal-address">{shopInfo.phone}</p>}
        </div>
      )}
      <div className="receipt-minimal-divider" />
      <div className="receipt-minimal-info">
        <div className="receipt-minimal-info-row"><span>{t('sale.invoice')}</span><span>{sale?.invoiceNo || t('common.notAvailable')}</span></div>
        <div className="receipt-minimal-info-row"><span>{t('common.date')}</span><span>{formatDate(sale?.createdAt)}</span></div>
        <div className="receipt-minimal-info-row"><span>{t('sale.customer')}</span><span>{sale?.customer?.name || t('posPage.customer.walkIn')}</span></div>
      </div>
      <div className="receipt-minimal-divider" />
      <div className="receipt-minimal-items">
        {sale?.items?.map((item, idx) => (
          <div key={idx} className="receipt-minimal-item">
            <div className="receipt-minimal-item-name">{item.product?.name || item.name || t('posPage.receipt.item')}</div>
            <div className="receipt-minimal-item-line">
              <span>{displayQty(item)} {displayUnit(item)} x ₹{Number(item.price).toFixed(2)}</span>
              <span className="receipt-minimal-item-total">₹{Number(item.total).toFixed(2)}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="receipt-minimal-divider" />
      <div className="receipt-minimal-totals">
        <div className="receipt-minimal-total-row"><span>{t('sale.subtotal')}</span><span>₹{Number(sale?.subtotal || 0).toFixed(2)}</span></div>
        {Number(sale?.tax || 0) > 0 && <div className="receipt-minimal-total-row"><span>{taxName}</span><span>₹{Number(sale?.tax || 0).toFixed(2)}</span></div>}
        {Number(sale?.discount || 0) > 0 && <div className="receipt-minimal-total-row receipt-minimal-discount"><span>{t('sale.discount')}</span><span>-₹{Number(sale?.discount || 0).toFixed(2)}</span></div>}
        <div className="receipt-minimal-total-row"><span>{t('posPage.totals.grandTotal')}</span><span>₹{Number(rawGrandTotal || 0).toFixed(2)}</span></div>
        {roundOff !== 0 && <div className="receipt-minimal-total-row"><span>{t('posPage.totals.roundOff')}</span><span>-₹{Number(Math.abs(roundOff) || 0).toFixed(2)}</span></div>}
        <div className="receipt-minimal-total-row receipt-minimal-grand"><span>{t('posPage.totals.payable')}</span><span>₹{Number(payableAmount || 0).toFixed(2)}</span></div>
        <div className="receipt-minimal-total-row"><span>{t('common.paid')}</span><span>₹{Number(sale?.paidAmount || 0).toFixed(2)}</span></div>
        {Number(sale?.dueAmount || 0) > 0 && <div className="receipt-minimal-total-row receipt-minimal-due"><span>{t('common.due')}</span><span>₹{Number(sale?.dueAmount || 0).toFixed(2)}</span></div>}
      </div>
      {showFooter && (
        <div className="receipt-minimal-footer">
          <p>{footerMsg}</p>
          {showBarcode && <div className="receipt-barcode"><InvoiceBarcode value={sale?.invoiceNo} width={isThermal ? (size === '58mm' ? 80 : 110) : 150} height={isThermal ? 26 : 32} /></div>}
          {showQR && !isThermal && <div className="receipt-qr"><InvoiceQR invoiceNo={sale?.invoiceNo} size={isA4 ? 70 : 40} /></div>}
        </div>
      )}
    </div>
  );

  const renderGrocery = () => (
    <div className="receipt receipt-grocery">
      <div className="receipt-grocery-header">
        {showLogo && (shopInfo?.logo ? (
          <img src={shopInfo.logo} alt="Logo" className="receipt-grocery-logo-img" />
        ) : (
          <div className="receipt-grocery-logo-placeholder"><BiPrinter size={isThermal ? 20 : 28} /></div>
        ))}
        {showHeader && (
          <>
            <h2 className="receipt-grocery-shop-name">{shopInfo?.name || shopInfo?.shopName || t('posPage.printer.templateGrocery')}</h2>
            <p className="receipt-grocery-address">{formatAddress(shopInfo?.address)}</p>
            {shopInfo?.phone && <p className="receipt-grocery-phone">📞 {shopInfo.phone}</p>}
          </>
        )}
      </div>
      <div className="receipt-grocery-divider" />
      <div className="receipt-grocery-info">
        <div className="receipt-grocery-info-row"><span>🧾 {sale?.invoiceNo || t('common.notAvailable')}</span><span>📅 {formatDate(sale?.createdAt)}</span></div>
        <div className="receipt-grocery-info-row"><span>👤 {sale?.customer?.name || t('posPage.customer.walkInCustomer')}</span><span>👨‍💼 {t('posPage.receipt.cashier')}</span></div>
      </div>
      <div className="receipt-grocery-divider" />
      <div className="receipt-grocery-items">
        <div className="receipt-grocery-items-header"><span>{t('posPage.receipt.item')}</span><span>{t('posPage.receipt.qty')}</span><span>₹</span><span>{t('common.total')}</span></div>
        {sale?.items?.map((item, idx) => (
          <div key={idx} className="receipt-grocery-item">
            <span className="receipt-grocery-item-name">{item.product?.name || item.name || t('posPage.receipt.item')}</span>
            <span className="receipt-grocery-item-qty">{displayQty(item)}{displayUnit(item)}</span>
            <span className="receipt-grocery-item-price">₹{Number(item.price).toFixed(2)}</span>
            <span className="receipt-grocery-item-total">₹{Number(item.total).toFixed(2)}</span>
          </div>
        ))}
      </div>
      <div className="receipt-grocery-divider" />
      <div className="receipt-grocery-totals">
        <div className="receipt-grocery-total-row"><span>{t('sale.subtotal')}</span><span>₹{Number(sale?.subtotal || 0).toFixed(2)}</span></div>
        {Number(sale?.tax || 0) > 0 && <div className="receipt-grocery-total-row"><span>{taxName}</span><span>₹{Number(sale?.tax || 0).toFixed(2)}</span></div>}
        {Number(sale?.discount || 0) > 0 && <div className="receipt-grocery-total-row receipt-grocery-discount"><span>{t('sale.discount')}</span><span>-₹{Number(sale?.discount || 0).toFixed(2)}</span></div>}
        <div className="receipt-grocery-total-row"><span>{t('posPage.totals.grandTotal')}</span><span>₹{Number(rawGrandTotal || 0).toFixed(2)}</span></div>
        {roundOff !== 0 && <div className="receipt-grocery-total-row"><span>{t('posPage.totals.roundOff')}</span><span>-₹{Number(Math.abs(roundOff) || 0).toFixed(2)}</span></div>}
        <div className="receipt-grocery-total-row receipt-grocery-grand"><span>{t('posPage.totals.payable')}</span><span>₹{Number(payableAmount || 0).toFixed(2)}</span></div>
        <div className="receipt-grocery-total-row"><span>{t('common.paid')}</span><span>₹{Number(sale?.paidAmount || 0).toFixed(2)}</span></div>
        {Number(sale?.dueAmount || 0) > 0 && <div className="receipt-grocery-total-row receipt-grocery-due"><span>{t('common.due')}</span><span>₹{Number(sale?.dueAmount || 0).toFixed(2)}</span></div>}
        <div className="receipt-grocery-total-row"><span>{t('posPage.receipt.payment')}</span><span className="receipt-grocery-payment">{paymentMethodLabel(sale?.paymentMethod)}</span></div>
      </div>
      <div className="receipt-grocery-divider" />
      {showFooter && (
        <div className="receipt-grocery-footer">
          <p>🛒 {footerMsg}</p>
          <p className="receipt-grocery-footer-small">{t('posPage.receipt.visitAgain')} 🥦🍎</p>
          {showBarcode && <div className="receipt-barcode"><InvoiceBarcode value={sale?.invoiceNo} width={isThermal ? (size === '58mm' ? 90 : 120) : 160} height={isThermal ? 28 : 36} /></div>}
          {showQR && !isThermal && <div className="receipt-qr"><InvoiceQR invoiceNo={sale?.invoiceNo} size={isA4 ? 80 : 50} /></div>}
        </div>
      )}
    </div>
  );

  const renderTemplate = () => {
    switch (template) {
      case 'classic': return renderClassic();
      case 'modern': return renderModern();
      case 'minimal': return renderMinimal();
      case 'grocery': return renderGrocery();
      default: return renderModern();
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '10px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: '12px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          width: '100%',
          maxWidth: isA4 ? '800px' : '500px',
          maxHeight: '95vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 16px',
            borderBottom: '1px solid #e0e0e0',
            background: '#f8f9fa',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <BiPrinter size={16} style={{ color: '#6C63FF' }} />
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#333' }}>
              {t('common.print')} - {sale?.invoiceNo || ''}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span
              style={{
                fontSize: '0.6rem',
                fontWeight: 600,
                color: '#888',
                background: '#e9ecef',
                padding: '2px 6px',
                borderRadius: '4px',
              }}
            >
              {size.toUpperCase()} | {template.charAt(0).toUpperCase() + template.slice(1)}
            </span>
            <button
              onClick={onClose}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 28, height: 28, border: 'none', borderRadius: '50%',
                background: 'transparent', color: '#888', cursor: 'pointer', fontSize: '1rem',
              }}
            >
              <BiX size={18} />
            </button>
          </div>
        </div>

        {/* Preview Content — the exact same markup + CSS is sent to the printer */}
        <div
          style={{
            flex: 1,
            overflow: 'auto',
            padding: '16px',
            background: '#e9e9ef',
            display: 'flex',
            justifyContent: 'center',
            minHeight: '200px',
          }}
        >
          {/* Scoped to buildReceiptCss() — identical rules are embedded in the print window */}
          <style>{buildReceiptCss()}</style>
          <div ref={previewRef}>
            <div className="receipt-canvas">
              {renderTemplate()}
            </div>
          </div>
        </div>

        {/* Bottom Actions */}
        <div
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8,
            padding: '10px 16px', borderTop: '1px solid #e0e0e0', background: '#f8f9fa', flexShrink: 0,
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px', border: '1px solid #d0d0d0', borderRadius: '6px',
              background: '#fff', color: '#555', fontSize: '0.85rem', fontWeight: 600,
              fontFamily: 'inherit', cursor: 'pointer',
            }}
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handlePrint}
            title={t('posPage.printer.copies', { count: printCopies })}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '8px 20px', border: 'none', borderRadius: '6px',
              background: '#6C63FF', color: '#fff', fontSize: '0.85rem',
              fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer',
            }}
          >
            <BiPrinter size={16} /> {t('common.print')} ({printCopies})
          </button>
        </div>
      </div>
    </div>
  );
};

export default PrintPreview;
