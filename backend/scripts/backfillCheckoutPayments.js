// One-time backfill for historical data.
//
// Root cause of "Payment History shows nothing even though payments exist":
// createSale never used to record the amount collected at checkout
// (sale.paidAmount) as its own CustomerPayment document — only money
// collected later via the separate "Receive Payment" flow ever did. That gap
// is now fixed in controllers/saleController.js for every NEW sale, but sales
// created before that fix still have no corresponding CustomerPayment record,
// so they still won't show up in Payment History until backfilled.
//
// This script creates the missing CustomerPayment record for every existing
// sale that (a) belongs to a customer and (b) collected money at checkout.
// It is safe to re-run: a sale is skipped if it already has a CustomerPayment
// linked via the `sale` field, so nothing gets duplicated.
//
// Usage:
//   node scripts/backfillCheckoutPayments.js

require('dotenv').config();
const connectDB = require('../config/db');
const Sale = require('../models/Sale');
const CustomerPayment = require('../models/CustomerPayment');

const run = async () => {
  try {
    await connectDB();

    const sales = await Sale.find({ customer: { $ne: null }, paidAmount: { $gt: 0 } })
      .select('customer shop paidAmount paymentMethod invoiceNo posType createdBy');

    let created = 0;
    let skipped = 0;

    for (const sale of sales) {
      const alreadyLinked = await CustomerPayment.exists({ sale: sale._id });
      if (alreadyLinked) {
        skipped++;
        continue;
      }

      await CustomerPayment.create({
        customer: sale.customer,
        shop: sale.shop,
        amount: sale.paidAmount,
        paymentMethod: sale.paymentMethod,
        notes: `Payment at checkout for invoice ${sale.invoiceNo}`,
        collectedBy: sale.createdBy || undefined,
        sale: sale._id,
        source: sale.posType === 'regular' ? 'sale' : 'pos',
      });
      created++;
    }

    console.log(`Backfill complete — created ${created} payment record(s), skipped ${skipped} sale(s) that already had one.`);
    process.exit(0);
  } catch (error) {
    console.error('Backfill failed:', error);
    process.exit(1);
  }
};

run();
