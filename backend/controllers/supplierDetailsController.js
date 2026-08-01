const Supplier = require('../models/Supplier');
const Purchase = require('../models/Purchase');
const SupplierPayment = require('../models/SupplierPayment');
const { allocatePreviousDue } = require('./purchaseController');

// ─── Get Supplier Details (view-only) ─────────────────────────────
// Returns full supplier profile + summary stats + purchase history + payment history.
// Read-only — does not create / update / delete anything.
const getSupplierDetails = async (req, res) => {
  try {
    const shopId = req.user.shop;
    const supplierId = req.params.id;

    const supplier = await Supplier.findOne({ _id: supplierId, shop: shopId });
    if (!supplier) return res.status(404).json({ message: 'Supplier not found' });

    // All purchases for this supplier (newest first)
    const purchases = await Purchase.find({ supplier: supplierId, shop: shopId })
      .sort({ purchaseDate: -1 })
      .select('purchaseNo purchaseDate totalAmount paidAmount dueAmount paymentStatus paymentMethod createdAt');

    // Summary stats
    const totalPurchases = purchases.length;
    const totalPurchaseAmount = purchases.reduce((sum, p) => sum + (p.totalAmount || 0), 0);
    const currentDue = supplier.dueAmount || 0;

    // Payment history — derived from purchases where money was actually paid
    // Each time a purchase had a paidAmount, we treat it as a payment event.
    // We also capture payment method and timestamps from the purchase record.
    const paymentHistory = purchases
      .filter((p) => (p.paidAmount || 0) > 0)
      .map((p) => ({
        _id: p._id,
        purchaseNo: p.purchaseNo,
        date: p.createdAt || p.purchaseDate,
        paymentMethod: p.paymentMethod || 'cash',
        paidAmount: p.paidAmount || 0,
        remainingDue: p.dueAmount || 0,
        status: p.paymentStatus,
      }))
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json({
      supplier,
      summary: {
        totalPurchases,
        totalPurchaseAmount,
        currentDue,
      },
      purchaseHistory: purchases,
      paymentHistory,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── Previous Due Summary (used by the Add Purchase "Previous Due" card) ──
// Read-only — does not touch purchase/supplier data at all.
const getSupplierDueSummary = async (req, res) => {
  try {
    const shopId = req.user.shop;
    const supplierId = req.params.id;

    const supplier = await Supplier.findOne({ _id: supplierId, shop: shopId });
    if (!supplier) return res.status(404).json({ message: 'Supplier not found' });

    const unpaidPurchases = await Purchase.find({ shop: shopId, supplier: supplierId, dueAmount: { $gt: 0.001 } })
      .sort({ purchaseDate: 1, createdAt: 1 })
      .select('purchaseNo supplierInvoiceNo purchaseDate totalAmount paidAmount dueAmount paymentStatus createdAt');

    const lastPurchase = await Purchase.findOne({ shop: shopId, supplier: supplierId })
      .sort({ purchaseDate: -1, createdAt: -1 })
      .select('purchaseDate createdAt');

    // `dueAmount` is computed fresh from the unpaid purchases themselves —
    // it's what FIFO allocation will actually see and act on. `supplierDueAmount`
    // is the separately-stored aggregate on the Supplier doc; both are returned
    // so any drift between them is visible rather than silently hidden.
    const dueAmount = Math.round(unpaidPurchases.reduce((sum, p) => sum + p.dueAmount, 0) * 100) / 100;

    res.json({
      dueAmount,
      supplierDueAmount: supplier.dueAmount || 0,
      unpaidInvoiceCount: unpaidPurchases.length,
      lastPurchaseDate: lastPurchase ? (lastPurchase.purchaseDate || lastPurchase.createdAt) : null,
      oldestDueDate: unpaidPurchases.length > 0 ? (unpaidPurchases[0].purchaseDate || unpaidPurchases[0].createdAt) : null,
      unpaidInvoices: unpaidPurchases,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── Supplier Ledger ────────────────────────────────────────────────────
// A true chronological ledger built directly from Purchase docs — each
// purchase IS a ledger row (no separate payment-record collection exists
// for suppliers). "Previous Due Used" for a given purchase is derived by
// scanning every purchase's previousDueAllocations for entries that target
// it (cheap — all purchases for this supplier are already fetched).
// Running balance walks oldest→newest using each purchase's current
// (possibly since-topped-up) paidAmount/dueAmount, so the final entry's
// balance always equals the supplier's live dueAmount.
const getSupplierLedger = async (req, res) => {
  try {
    const shopId = req.user.shop;
    const supplierId = req.params.id;

    const supplier = await Supplier.findOne({ _id: supplierId, shop: shopId });
    if (!supplier) return res.status(404).json({ message: 'Supplier not found' });

    const purchases = await Purchase.find({ shop: shopId, supplier: supplierId })
      .sort({ purchaseDate: 1, createdAt: 1 });

    const previousDueUsedMap = {};
    purchases.forEach((p) => {
      (p.previousDueAllocations || []).forEach((a) => {
        const key = a.purchase.toString();
        previousDueUsedMap[key] = (previousDueUsedMap[key] || 0) + a.amountApplied;
      });
    });

    let runningBalance = 0;
    const entries = purchases.map((p) => {
      runningBalance = Math.round((runningBalance + (p.totalAmount - p.paidAmount)) * 100) / 100;
      return {
        purchaseId: p._id,
        purchaseNo: p.purchaseNo,
        supplierInvoiceNo: p.supplierInvoiceNo || '',
        date: p.purchaseDate || p.createdAt,
        purchaseAmount: p.totalAmount,
        previousDueUsed: Math.round((previousDueUsedMap[p._id.toString()] || 0) * 100) / 100,
        paymentReceived: p.paidAmount,
        remainingInvoiceDue: p.dueAmount,
        previousDueIncluded: p.previousDueIncluded,
        status: p.paymentStatus,
        runningBalance,
      };
    });

    const totalPurchases = purchases.length;
    const totalPurchaseAmount = purchases.reduce((sum, p) => sum + (p.totalAmount || 0), 0);
    const totalPaid = purchases.reduce((sum, p) => sum + (p.paidAmount || 0), 0);

    res.json({
      supplier: { _id: supplier._id, name: supplier.name, phone: supplier.phone, company: supplier.company, isActive: supplier.isActive, createdAt: supplier.createdAt },
      summary: { totalPurchases, totalPurchaseAmount, totalPaid, currentDue: supplier.dueAmount || 0 },
      entries,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── Pay Supplier (standalone due payment) ─────────────────────────────
// Applies the payment via the exact same FIFO allocatePreviousDue helper
// used when a new purchase's "previous due" payment is applied — every
// rupee still lands on a real Purchase.paidAmount/dueAmount, so the
// supplier ledger (built purely by re-reading Purchase docs) automatically
// stays correct with no changes needed there. A SupplierPayment record is
// created purely as an audit trail (payment method/notes/which invoices it
// covered), mirroring CustomerPayment's role for customer due collection.
const payToSupplier = async (req, res) => {
  try {
    const shopId = req.user.shop;
    const supplierId = req.params.id;
    const { amount, paymentMethod, notes } = req.body;

    const supplier = await Supplier.findOne({ _id: supplierId, shop: shopId });
    if (!supplier) return res.status(404).json({ message: 'Supplier not found' });

    const amt = Number(amount);
    if (!amt || amt <= 0) {
      return res.status(400).json({ message: 'Invalid payment amount' });
    }
    if (amt > (supplier.dueAmount || 0)) {
      return res.status(400).json({ message: 'Payment amount exceeds due amount' });
    }

    const allocation = await allocatePreviousDue(shopId, supplierId, amt, true);

    supplier.dueAmount = Math.max(0, Math.round((supplier.dueAmount - allocation.appliedToPreviousDue) * 100) / 100);
    supplier.totalPaid = Math.round(((supplier.totalPaid || 0) + allocation.appliedToPreviousDue) * 100) / 100;
    await supplier.save();

    const payment = await SupplierPayment.create({
      supplier: supplier._id,
      shop: shopId,
      amount: allocation.appliedToPreviousDue,
      paymentMethod: paymentMethod || 'cash',
      notes: notes || '',
      paidBy: req.user._id,
      allocations: allocation.previousDueAllocations,
    });

    res.json({ payment, supplier });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getSupplierDetails, getSupplierDueSummary, getSupplierLedger, payToSupplier };