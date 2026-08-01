// One-time backfill for historical data.
//
// Root cause of "GST shows ₹0.00 in Supplier Ledger → Purchase Details":
// createPurchase used to derive each line item's GST rate from item.gstRate,
// but the Add Purchase drawer never sends a per-item rate — it only applies
// GST once at invoice level, from Settings. So the rate always fell back to
// 0, and every purchase was stored with cgst = sgst = igst = 0. That's now
// fixed in controllers/purchaseController.js for every NEW purchase, but
// purchases created before that fix still have zero GST stored, so they
// still show ₹0.00 until backfilled.
//
// This script recomputes cgst/sgst/igst/taxableAmount/gstAmount for every
// existing purchase whose stored GST is all-zero, using the rate on the
// purchase (if it happens to be set) or the shop's Settings → Tax & GST
// defaultGstRate, and the CGST+SGST vs IGST split based on the shop's
// businessState vs the supplier's state at the time.
//
// IMPORTANT — this only redistributes each item's ALREADY-STORED total
// (item.total) into a taxable-amount + GST split. It deliberately does NOT
// change item.total, purchase.totalAmount, paidAmount, dueAmount,
// paymentStatus, or any Supplier due/ledger balance — those already reflect
// what was actually charged and paid, and must not move. This is a display
// backfill only, matching "do not change purchase calculations".
//
// Safe to re-run: a purchase is skipped once its stored cgst/sgst/igst are
// no longer all zero (which includes purchases with genuinely 0% GST, e.g.
// gstEnabled off at the time — those stay all-zero and get skipped every run,
// which is the correct outcome for them too).
//
// Usage:
//   node scripts/backfillPurchaseGst.js

require('dotenv').config();
const connectDB = require('../config/db');
const Purchase = require('../models/Purchase');
const Supplier = require('../models/Supplier');
const Shop = require('../models/Shop');

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

const run = async () => {
  try {
    await connectDB();

    // Match purchases where cgst/sgst/igst are either explicitly 0 (the
    // creation-time bug) OR entirely absent from the stored document (very
    // old purchases predating these fields being added to the schema at
    // all) — a raw query for `{ cgst: 0 }` alone misses the latter, since a
    // missing field is not the same as a stored 0 at the MongoDB level.
    const zeroOrMissing = (field) => ({ $or: [{ [field]: 0 }, { [field]: { $exists: false } }] });
    const purchases = await Purchase.find({
      $and: [zeroOrMissing('cgst'), zeroOrMissing('sgst'), zeroOrMissing('igst')],
    });

    const shopCache = new Map();
    const supplierCache = new Map();

    let updated = 0;
    let skippedNoRate = 0;
    let skippedNoItems = 0;

    for (const purchase of purchases) {
      if (!purchase.items || purchase.items.length === 0) {
        skippedNoItems++;
        continue;
      }

      const shopId = String(purchase.shop);
      if (!shopCache.has(shopId)) {
        shopCache.set(shopId, await Shop.findById(purchase.shop).select('settings'));
      }
      const shop = shopCache.get(shopId);
      const gstEnabled = shop?.settings?.gstEnabled !== false;
      const defaultGstRate = gstEnabled ? (shop?.settings?.defaultGstRate ?? 18) : 0;
      const businessState = shop?.settings?.businessState || 'West Bengal';

      const supplierId = String(purchase.supplier);
      if (!supplierCache.has(supplierId)) {
        supplierCache.set(supplierId, await Supplier.findById(purchase.supplier).select('state'));
      }
      const supplierState = supplierCache.get(supplierId)?.state || '';

      const rate = Number(purchase.gstRate) || defaultGstRate;
      if (!rate) {
        skippedNoRate++;
        continue;
      }

      const isIntrastate = businessState && supplierState &&
        businessState.toLowerCase().trim() === supplierState.toLowerCase().trim();

      let sumTaxable = 0, sumCgst = 0, sumSgst = 0, sumIgst = 0, sumGst = 0;

      const newItems = purchase.items.map((item) => {
        const total = Number(item.total) || 0;
        const taxableAmount = round2(total / (1 + rate / 100));
        const gstAmount = round2(total - taxableAmount);

        let cgst = 0, sgst = 0, igst = 0;
        if (isIntrastate) {
          cgst = round2(gstAmount / 2);
          sgst = round2(gstAmount - cgst);
        } else {
          igst = gstAmount;
        }

        sumTaxable = round2(sumTaxable + taxableAmount);
        sumCgst = round2(sumCgst + cgst);
        sumSgst = round2(sumSgst + sgst);
        sumIgst = round2(sumIgst + igst);
        sumGst = round2(sumGst + gstAmount);

        return {
          ...item.toObject(),
          gstRate: rate,
          taxableAmount,
          gstAmount,
          cgst,
          sgst,
          igst,
        };
      });

      await Purchase.updateOne(
        { _id: purchase._id },
        {
          $set: {
            items: newItems,
            gstRate: rate,
            taxableAmount: sumTaxable,
            gstAmount: sumGst,
            cgst: sumCgst,
            sgst: sumSgst,
            igst: sumIgst,
          },
        }
      );
      updated++;
    }

    console.log(
      `Backfill complete — updated ${updated} purchase(s), skipped ${skippedNoRate} (no GST rate available) ` +
      `and ${skippedNoItems} (no items).`
    );
    process.exit(0);
  } catch (error) {
    console.error('Backfill failed:', error);
    process.exit(1);
  }
};

run();
