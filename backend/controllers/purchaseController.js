const Purchase = require('../models/Purchase');
const Product = require('../models/Product');
const Supplier = require('../models/Supplier');

const getPurchases = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const { startDate, endDate, supplier, status } = req.query;

    let query = { shop: req.user.shop };
    if (startDate && endDate) {
      query.purchaseDate = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }
    if (supplier) query.supplier = supplier;
    if (status) query.paymentStatus = status;

    const purchases = await Purchase.find(query)
      .populate('supplier', 'name phone')
      .populate('items.product', 'name nameBn')
      .sort({ purchaseDate: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Purchase.countDocuments(query);
    res.json({ purchases, page, pages: Math.ceil(total / limit), total });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getPurchase = async (req, res) => {
  try {
    const purchase = await Purchase.findOne({ _id: req.params.id, shop: req.user.shop })
      .populate('supplier', 'name phone address')
      .populate('items.product', 'name nameBn sku');
    if (!purchase) return res.status(404).json({ message: 'Purchase not found' });
    res.json(purchase);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createPurchase = async (req, res) => {
  try {
    const { supplier, items, subtotal, discount, tax, shipping, totalAmount, paidAmount, paymentMethod, notes } = req.body;

    const count = await Purchase.countDocuments({ shop: req.user.shop });
    const invoiceNo = `PUR-${String(count + 1).padStart(6, '0')}`;

    const purchase = await Purchase.create({
      shop: req.user.shop,
      supplier,
      invoiceNo,
      items,
      subtotal,
      discount: discount || 0,
      tax: tax || 0,
      shipping: shipping || 0,
      totalAmount,
      paidAmount: paidAmount || 0,
      dueAmount: totalAmount - (paidAmount || 0),
      paymentStatus: paidAmount >= totalAmount ? 'paid' : paidAmount > 0 ? 'partial' : 'unpaid',
      paymentMethod: paymentMethod || 'cash',
      notes,
      createdBy: req.user._id,
    });

    // Update product stock
    for (const item of items) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: item.quantity },
        purchasePrice: item.purchasePrice,
        sellingPrice: item.sellingPrice,
      });
    }

    // Update supplier due
    const dueAmount = totalAmount - (paidAmount || 0);
    await Supplier.findByIdAndUpdate(supplier, {
      $inc: { totalPurchases: totalAmount, totalPaid: paidAmount || 0, dueAmount: dueAmount },
    });

    res.status(201).json(purchase);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updatePurchasePayment = async (req, res) => {
  try {
    const purchase = await Purchase.findOne({ _id: req.params.id, shop: req.user.shop });
    if (!purchase) return res.status(404).json({ message: 'Purchase not found' });

    const { paidAmount, paymentMethod } = req.body;
    const additionalPaid = paidAmount - purchase.paidAmount;

    purchase.paidAmount = paidAmount;
    purchase.dueAmount = purchase.totalAmount - paidAmount;
    purchase.paymentStatus = paidAmount >= purchase.totalAmount ? 'paid' : paidAmount > 0 ? 'partial' : 'unpaid';
    if (paymentMethod) purchase.paymentMethod = paymentMethod;

    await purchase.save();

    await Supplier.findByIdAndUpdate(purchase.supplier, {
      $inc: { totalPaid: additionalPaid, dueAmount: -additionalPaid },
    });

    res.json(purchase);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getPurchases, getPurchase, createPurchase, updatePurchasePayment };