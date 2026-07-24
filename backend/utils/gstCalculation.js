/**
 * GST Calculation Utility
 * 
 * Handles both Intrastate (CGST + SGST) and Interstate (IGST) calculations
 * for Sales and Purchases.
 */

/**
 * Calculate GST components based on business state and customer/supplier state.
 * 
 * @param {number} gstRate - The GST rate percentage (e.g. 18 for 18%)
 * @param {string} businessState - The business's registered state
 * @param {string} counterpartyState - The customer or supplier's state
 * @returns {{ cgst: number, sgst: number, igst: number }}
 */
function splitGst(gstRate, businessState, counterpartyState) {
  const rate = Number(gstRate) || 0;
  
  // Check if states are provided and if it's intrastate
  const isIntrastate = businessState && counterpartyState && 
    businessState.toLowerCase().trim() === counterpartyState.toLowerCase().trim();

  if (isIntrastate) {
    // Intrastate: CGST = GST/2, SGST = GST/2, IGST = 0
    const half = rate / 2;
    return { cgst: half, sgst: half, igst: 0 };
  } else {
    // Interstate: CGST = 0, SGST = 0, IGST = GST
    return { cgst: 0, sgst: 0, igst: rate };
  }
}

/**
 * Calculate GST for a single line item.
 * 
 * @param {number} taxableAmount - The taxable value (subtotal - discount)
 * @param {number} gstRate - The GST rate percentage
 * @param {string} businessState - Business state
 * @param {string} counterpartyState - Customer/Supplier state
 * @returns {{ cgst: number, sgst: number, igst: number, gstAmount: number, taxableAmount: number }}
 */
function calculateLineGst(taxableAmount, gstRate, businessState, counterpartyState) {
  const amount = Number(taxableAmount) || 0;
  const rate = Number(gstRate) || 0;
  
  const { cgst, sgst, igst } = splitGst(rate, businessState, counterpartyState);
  
  const cgstAmount = Math.round(amount * cgst / 100 * 100) / 100;
  const sgstAmount = Math.round(amount * sgst / 100 * 100) / 100;
  const igstAmount = Math.round(amount * igst / 100 * 100) / 100;
  const gstAmount = cgstAmount + sgstAmount + igstAmount;

  return {
    cgst: cgstAmount,
    sgst: sgstAmount,
    igst: igstAmount,
    gstAmount,
    gstRate: rate,
    taxableAmount: amount,
  };
}

/**
 * Calculate GST for the entire invoice (header level).
 * 
 * @param {number} subtotal - The subtotal before discounts and GST
 * @param {number} discountTotal - Total discount amount
 * @param {number} gstRate - The GST rate
 * @param {string} businessState - Business state
 * @param {string} counterpartyState - Customer/Supplier state
 * @returns {{ cgst: number, sgst: number, igst: number, gstAmount: number, taxableAmount: number }}
 */
function calculateInvoiceGst(subtotal, discountTotal, gstRate, businessState, counterpartyState) {
  const taxableAmount = Math.max(0, (Number(subtotal) || 0) - (Number(discountTotal) || 0));
  const rate = Number(gstRate) || 0;
  
  const { cgst, sgst, igst } = splitGst(rate, businessState, counterpartyState);
  
  const cgstAmount = Math.round(taxableAmount * cgst / 100 * 100) / 100;
  const sgstAmount = Math.round(taxableAmount * sgst / 100 * 100) / 100;
  const igstAmount = Math.round(taxableAmount * igst / 100 * 100) / 100;
  const gstAmount = cgstAmount + sgstAmount + igstAmount;

  return {
    cgst: cgstAmount,
    sgst: sgstAmount,
    igst: igstAmount,
    gstAmount,
    taxableAmount,
  };
}

/**
 * Calculate line total with GST breakdown.
 * Returns values suitable for storing in line items.
 */
function calculateItemTotals(quantity, purchasePriceOrSellingPrice, discountPercent, gstRate, businessState, counterpartyState) {
  const qty = Number(quantity) || 0;
  const price = Number(purchasePriceOrSellingPrice) || 0;
  const baseTotal = qty * price;
  const discountAmt = baseTotal * (Number(discountPercent) || 0) / 100;
  const taxableAmount = baseTotal - discountAmt;
  
  const gst = calculateLineGst(taxableAmount, gstRate, businessState, counterpartyState);
  
  return {
    ...gst,
    discount: Number(discountPercent) || 0,
    total: taxableAmount + gst.gstAmount,
  };
}

module.exports = {
  splitGst,
  calculateLineGst,
  calculateInvoiceGst,
  calculateItemTotals,
};