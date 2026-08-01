/**
 * Payment Allocation Service
 * 
 * Allocates a payment across a customer's unpaid invoices in FIFO order
 * (oldest invoice settled first). Updates per-invoice paidAmount/dueAmount
 * fields so the Sales List / Sales Details always show the correct outstanding
 * balance per invoice.
 * 
 * This is the SINGLE source of truth for payment allocation — both
 * checkout payments (POS) and standalone due collections must use
 * this service so every page always sees consistent numbers.
 */

const Sale = require('../models/Sale');

/**
 * Allocate a payment amount across the customer's unpaid invoices.
 * Invoices are processed from oldest to newest (FIFO).
 *
 * @param {ObjectId} customerId  - The customer's _id
 * @param {ObjectId} shopId      - The shop's _id
 * @param {number}   amount      - Total payment amount to allocate
 * @param {Object}   [opts]      - Optional overrides
 * @param {ObjectId} [opts.excludeSaleId] - If set, this sale is skipped (it's
 *   the one currently being created — its due was already factored in).
 * @returns {Promise<{ allocated: number, remaining: number, updatedInvoices: number }>}
 */
async function allocatePayment(customerId, shopId, amount, opts = {}) {
  if (!amount || amount <= 0) return { allocated: 0, remaining: amount, updatedInvoices: 0 };

  // Fetch unpaid invoices oldest-first
  const query = {
    customer: customerId,
    shop: shopId,
    dueAmount: { $gt: 0 },
  };
  if (opts.excludeSaleId) {
    query._id = { $ne: opts.excludeSaleId };
  }

  const unpaidInvoices = await Sale.find(query)
    .sort({ createdAt: 1 })
    .select('_id invoiceNo totalAmount paidAmount dueAmount');

  let remaining = amount;
  let updatedCount = 0;

  for (const invoice of unpaidInvoices) {
    if (remaining <= 0) break;

    const invoiceDue = invoice.dueAmount || 0;
    const allocation = Math.min(remaining, invoiceDue);

    if (allocation > 0) {
      const newDueAmount = invoiceDue - allocation;
      const newPaidAmount = (invoice.paidAmount || 0) + allocation;
      // Determine the new payment status based on the remaining due
      let newStatus = invoice.paymentStatus;
      if (newDueAmount <= 0) {
        newStatus = 'paid';
      } else if (newPaidAmount > 0) {
        newStatus = 'partial';
      } else {
        newStatus = 'unpaid';
      }

      await Sale.findByIdAndUpdate(invoice._id, {
        $set: {
          paidAmount: newPaidAmount,
          dueAmount: newDueAmount,
          paymentStatus: newStatus,
        },
      });
      remaining -= allocation;
      updatedCount++;
    }
  }

  return {
    allocated: amount - remaining,
    remaining,
    updatedInvoices: updatedCount,
  };
}

/**
 * Recalculate a customer's total due amount from scratch by summing
 * the dueAmount of all their unpaid invoices. Call this after any
 * payment allocation to keep the customer-level dueAmount in sync.
 *
 * @param {Object} customer   - Mongoose Customer document
 * @param {ObjectId} shopId   - Shop _id
 * @returns {Promise<number>} The recalculated total due
 */
async function recalculateCustomerDue(customer, shopId) {
  const sales = await Sale.find({
    customer: customer._id,
    shop: shopId,
  }).select('dueAmount');

  const totalDue = sales.reduce((sum, s) => sum + (s.dueAmount || 0), 0);
  customer.dueAmount = totalDue;
  await customer.save();
  return totalDue;
}

module.exports = { allocatePayment, recalculateCustomerDue };