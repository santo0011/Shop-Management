const Sale = require('../models/Sale');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const CustomerPayment = require('../models/CustomerPayment');

// ─── Shared filter builder ──────────────────────────────────────
// Single source of truth for turning the Sales page's filters (search,
// date range, customer, payment method/status) into a Mongo query — used by
// BOTH getSales (the table) and the stats aggregation below, so the summary
// cards can never drift out of sync with what the table is actually showing.
const buildSalesQuery = async (req) => {
  const { startDate, endDate, customer, paymentMethod, paymentStatus, search } = req.query;

  const query = { shop: req.user.shop };

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      query.createdAt.$gte = start;
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query.createdAt.$lte = end;
    }
  }
  if (customer) query.customer = customer;
  if (paymentMethod) query.paymentMethod = paymentMethod;
  if (paymentStatus) query.paymentStatus = paymentStatus;
  if (search) {
    // Find customer IDs matching name or phone
    const matchingCustomers = await Customer.find({
      shop: req.user.shop,
      $or: [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ],
    }).distinct('_id');

    query.$or = [
      { invoiceNo: { $regex: search, $options: 'i' } },
      { customer: { $in: matchingCustomers } },
    ];
  }

  return query;
};

// Aggregates the 4 Sales-page summary cards (+ due, for completeness) for
// whatever query is passed in — always the same `query` object used to fetch
// the table rows, so cards and table are guaranteed to reflect the same
// filtered dataset. Profit mirrors the existing Reports page formula
// (revenue net of refunds, minus cost of goods sold via Product.purchasePrice).
const aggregateSalesStats = async (query) => {
  const [totalsAgg, costAgg] = await Promise.all([
    Sale.aggregate([
      { $match: query },
      { $addFields: { refundAmount: { $sum: '$returns.totalRefund' } } },
      {
        $group: {
          _id: null,
          totalSales: { $sum: '$totalAmount' },
          totalDue: { $sum: '$dueAmount' },
          totalRefunds: { $sum: '$refundAmount' },
          count: { $sum: 1 },
        },
      },
    ]),
    Sale.aggregate([
      { $match: query },
      { $unwind: '$items' },
      { $lookup: { from: 'products', localField: 'items.product', foreignField: '_id', as: 'product' } },
      { $unwind: '$product' },
      { $group: { _id: null, cost: { $sum: { $multiply: ['$items.quantity', '$product.purchasePrice'] } } } },
    ]),
  ]);

  const totalSales = totalsAgg[0]?.totalSales || 0;
  const totalOrders = totalsAgg[0]?.count || 0;
  const totalRefunds = totalsAgg[0]?.totalRefunds || 0;
  const totalRevenue = Math.max(0, totalSales - totalRefunds);
  const totalDue = totalsAgg[0]?.totalDue || 0;
  const totalCost = costAgg[0]?.cost || 0;
  const totalProfit = totalRevenue - totalCost;

  return { totalSales, totalRevenue, totalProfit, totalOrders, totalDue };
};

const getSales = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const query = await buildSalesQuery(req);

    const [sales, total, stats] = await Promise.all([
      Sale.find(query)
        .populate('customer', 'name phone')
        .populate('items.product', 'name nameBn unit')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Sale.countDocuments(query),
      aggregateSalesStats(query),
    ]);

    res.json({ sales, page, pages: Math.ceil(total / limit), total, stats });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getSale = async (req, res) => {
  try {
    const sale = await Sale.findOne({ _id: req.params.id, shop: req.user.shop })
      .populate('customer', 'name phone')
      .populate('items.product', 'name nameBn unit sellingPrice');
    if (!sale) return res.status(404).json({ message: 'Sale not found' });
    res.json({ sale });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createSale = async (req, res) => {
  try {
    // Validate items up front — everything below depends on this array existing.
    if (!req.body.items || req.body.items.length === 0) {
      return res.status(400).json({ message: 'Sale must contain at least one item' });
    }
    if (!req.body.paymentMethod) {
      return res.status(400).json({ message: 'Missing required fields: paymentMethod' });
    }

    req.body.shop = req.user.shop;

    // Generate invoice number
    const count = await Sale.countDocuments({ shop: req.user.shop });
    const shopPrefix = req.user.shop?.toString().slice(-4).toUpperCase() || 'INV';
    const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
    req.body.invoiceNo = `${shopPrefix}-${dateStr}-${(count + 1).toString().padStart(4, '0')}`;

    // Calculate totals
    const subtotal = req.body.items.reduce((sum, item) => sum + (item.total || item.price * item.quantity), 0);
    req.body.subtotal = subtotal;
    req.body.totalAmount = Math.max(0, subtotal - (req.body.discount || 0) + (req.body.tax || 0));

    // Set paid and due amounts — dueAmount is always derived from the SAME
    // clamped paidAmount so `Due = Grand Total - Paid Amount` holds exactly,
    // covers full/partial/zero payment, and can never go negative.
    const totalAmt = req.body.totalAmount;
    const requestedPaid = Math.max(0, Number(req.body.paidAmount) || 0);
    req.body.paidAmount = Math.min(requestedPaid, totalAmt);
    req.body.dueAmount = Math.max(0, totalAmt - req.body.paidAmount);

    // Set payment status
    if (req.body.dueAmount === 0) {
      req.body.paymentStatus = 'paid';
    } else if (req.body.paidAmount > 0) {
      req.body.paymentStatus = 'partial';
    } else {
      req.body.paymentStatus = 'unpaid';
    }

    // A due balance must be traceable to a real customer to collect later.
    if (req.body.dueAmount > 0) {
      if (!req.body.customer) {
        return res.status(400).json({ message: 'Customer name and phone number are required for due sales.' });
      }
      const dueCustomer = await Customer.findOne({ _id: req.body.customer, shop: req.user.shop });
      if (!dueCustomer || !dueCustomer.name || !dueCustomer.phone) {
        return res.status(400).json({ message: 'Customer name and phone number are required for due sales.' });
      }
    }

    const sale = await Sale.create(req.body);

    // Update product stock
    for (const item of req.body.items) {
      await Product.findByIdAndUpdate(item.product, { $inc: { stock: -item.quantity } });
    }

    // Keep the customer's aggregate totals (purchases/paid/due) in sync so the
    // Customer list, Customer Ledger, Reports, and Dashboard all reflect this
    // sale immediately — this was previously never updated on sale creation.
    if (sale.customer) {
      await Customer.findByIdAndUpdate(sale.customer, {
        $inc: {
          totalPurchases: sale.totalAmount,
          totalPaid: sale.paidAmount,
          dueAmount: sale.dueAmount,
        },
      });
    }

    // Record the amount collected at checkout as an actual payment so it shows
    // up in the customer's Payment History — previously only money collected
    // later via the separate "Receive Payment" flow ever created a
    // CustomerPayment record, so any customer who only ever paid at checkout
    // had a payment history that looked empty even though they'd clearly paid.
    if (sale.customer && sale.paidAmount > 0) {
      await CustomerPayment.create({
        customer: sale.customer,
        shop: req.user.shop,
        amount: sale.paidAmount,
        paymentMethod: sale.paymentMethod,
        notes: `Payment at checkout for invoice ${sale.invoiceNo}`,
        collectedBy: req.user._id,
        sale: sale._id,
        source: sale.posType === 'regular' ? 'sale' : 'pos',
      });
    }

    res.status(201).json(sale);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateSalePayment = async (req, res) => {
  try {
    const { paidAmount, paymentMethod } = req.body;
    const sale = await Sale.findOne({ _id: req.params.id, shop: req.user.shop });
    if (!sale) return res.status(404).json({ message: 'Sale not found' });

    sale.paidAmount = (sale.paidAmount || 0) + paidAmount;
    sale.dueAmount = Math.max(0, sale.totalAmount - sale.paidAmount);
    if (paymentMethod) sale.paymentMethod = paymentMethod;

    await sale.save();
    res.json(sale);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── Get Top Selling Products ──────────────────────────────────────────────
const getTopSellingProducts = async (req, res) => {
  try {
    const { limit = 20 } = req.query;

    const topProducts = await Sale.aggregate([
      { $match: { shop: req.user.shop } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          totalQuantity: { $sum: '$items.quantity' },
          totalReturned: { $sum: { $ifNull: ['$items.returnedQty', 0] } },
          totalAmount: { $sum: '$items.total' },
          lastSold: { $max: '$createdAt' },
        },
      },
      {
        $addFields: {
          netQuantity: { $subtract: ['$totalQuantity', '$totalReturned'] },
        },
      },
      { $sort: { netQuantity: -1 } },
      { $limit: parseInt(limit) },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product',
        },
      },
      { $unwind: '$product' },
      {
        $project: {
          _id: '$product._id',
          name: '$product.name',
          nameBn: '$product.nameBn',
          sellingPrice: '$product.sellingPrice',
          stock: '$product.stock',
          unit: '$product.unit',
          barcode: '$product.barcode',
          category: '$product.category',
          totalSold: '$netQuantity',
          totalRevenue: '$totalAmount',
          lastSold: 1,
        },
      },
    ]);

    res.json(topProducts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── Get Recently Sold Products ────────────────────────────────────────────
const getRecentSales = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const recentSales = await Sale.find({ shop: req.user.shop })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .populate('items.product', 'name nameBn sellingPrice unit')
      .populate('customer', 'name phone');

    res.json(recentSales);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── Get Sales Stats ─────────────────────────────────────────────────────
// Same filters (search/date range/customer/paymentMethod/paymentStatus) and
// the same aggregation as the stats embedded in getSales — kept as a
// standalone endpoint for API completeness, but the Sales page itself now
// reads `stats` straight off the getSales response instead of calling this
// separately, so the table and cards can never end up on two different
// requests (and therefore two different results) for the same filter change.
const getSalesStats = async (req, res) => {
  try {
    const query = await buildSalesQuery(req);
    const stats = await aggregateSalesStats(query);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── Delete Sale ────────────────────────────────────────────────────────────
const deleteSale = async (req, res) => {
  try {
    const sale = await Sale.findOne({ _id: req.params.id, shop: req.user.shop });
    if (!sale) return res.status(404).json({ message: 'Sale not found' });

    // Restore product stock
    for (const item of sale.items) {
      await Product.findByIdAndUpdate(item.product, { $inc: { stock: +item.quantity } });
    }

    await Sale.findByIdAndDelete(sale._id);
    res.json({ message: 'Sale deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── Process Return ──────────────────────────────────────────────────────────
const processReturn = async (req, res) => {
  try {
    const sale = await Sale.findOne({ _id: req.params.id, shop: req.user.shop });
    if (!sale) return res.status(404).json({ message: 'Sale not found' });

    const { items, reason, refundMethod } = req.body;
    if (!items || items.length === 0) {
      return res.status(400).json({ message: 'At least one item is required for return' });
    }

    let totalRefund = 0;
    const returnItems = [];

    for (const ret of items) {
      const saleItem = sale.items.find(i => i.product.toString() === ret.productId);
      if (!saleItem) {
        return res.status(400).json({ message: `Product ${ret.productId} not found in sale` });
      }

      const alreadyReturned = saleItem.returnedQty || 0;
      const maxReturnable = saleItem.quantity - alreadyReturned;

      if (ret.quantity <= 0 || ret.quantity > maxReturnable) {
        return res.status(400).json({
          message: `Cannot return ${ret.quantity} of "${saleItem.product}". Max returnable: ${maxReturnable}`,
        });
      }

      // Update returned quantity in sale item
      saleItem.returnedQty = alreadyReturned + ret.quantity;

      // Restore stock
      await Product.findByIdAndUpdate(ret.productId, { $inc: { stock: +ret.quantity } });

      const refundAmt = ret.refundAmount || (saleItem.price * ret.quantity);
      totalRefund += refundAmt;

      returnItems.push({
        product: ret.productId,
        productName: ret.productName || saleItem.product?.name || '',
        quantity: ret.quantity,
        refundAmount: refundAmt,
        reason: ret.reason || reason || '',
      });
    }

    // Snapshot pre-return totals so the customer's aggregates can be adjusted
    // by the exact delta below, regardless of how the refund math below plays out.
    const prevTotalAmount = sale.totalAmount || 0;
    const prevPaidAmount = sale.paidAmount || 0;
    const prevDueAmount = sale.dueAmount || 0;

    // Update sale totals
    sale.paidAmount = Math.max(0, (sale.paidAmount || 0) - totalRefund);
    sale.totalAmount = Math.max(0, (sale.totalAmount || 0) - totalRefund);

    // Recalculate due amount
    sale.dueAmount = Math.max(0, sale.totalAmount - sale.paidAmount);

    // Update payment status
    if (sale.dueAmount === 0 && sale.paidAmount > 0) {
      sale.paymentStatus = 'paid';
    } else if (sale.paidAmount > 0) {
      sale.paymentStatus = 'partial';
    } else {
      sale.paymentStatus = 'unpaid';
    }

    // Add return entry
    sale.returns.push({
      items: returnItems,
      totalRefund,
      refundMethod: refundMethod || 'cash',
      reason: reason || '',
      processedBy: req.user._id,
      returnDate: new Date(),
    });

    await sale.save();

    // Keep the customer's aggregate totals in sync by the exact delta this
    // return caused (mirrors the sync done on sale creation).
    if (sale.customer) {
      await Customer.findByIdAndUpdate(sale.customer, {
        $inc: {
          totalPurchases: sale.totalAmount - prevTotalAmount,
          totalPaid: sale.paidAmount - prevPaidAmount,
          dueAmount: sale.dueAmount - prevDueAmount,
        },
      });
    }

    // Populate and return
    const updatedSale = await Sale.findById(sale._id)
      .populate('customer', 'name phone')
      .populate('items.product', 'name nameBn unit');

    res.json({ sale: updatedSale });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getSales, getSale, createSale, updateSalePayment, getTopSellingProducts, getRecentSales, getSalesStats, deleteSale, processReturn };
