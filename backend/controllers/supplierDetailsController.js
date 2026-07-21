const Supplier = require('../models/Supplier');
const Purchase = require('../models/Purchase');

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

module.exports = { getSupplierDetails };