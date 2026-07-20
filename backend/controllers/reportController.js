const Sale = require('../models/Sale');
const Purchase = require('../models/Purchase');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const Supplier = require('../models/Supplier');

// @desc    Full analytics payload for the Reports dashboard — summary cards,
//          sales-vs-profit trend, top selling products, payment method
//          breakdown, low stock products, and recent transactions — all
//          scoped to one date range + optional payment method filter.
// @route   GET /api/reports/analytics
const getReportsAnalytics = async (req, res) => {
  try {
    const shopId = req.user.shop;
    const { startDate, endDate, paymentMethod } = req.query;

    // The client sends precise, timezone-correct instants (e.g. "today"
    // 00:00:00.000-23:59:59.999 in the shop's local time, already converted
    // to UTC). Re-running .setHours() on them here would reinterpret those
    // instants in the SERVER process's own timezone instead, silently
    // shifting the boundary whenever the server isn't running in the same
    // zone as the shop — most visible on the "Today" filter, where a shift
    // of even a few hours can push the whole day out of range. Only fall
    // back to a padded default when the client didn't supply a date at all.
    const end = endDate ? new Date(endDate) : new Date();
    if (!endDate) end.setHours(23, 59, 59, 999);
    const start = startDate ? new Date(startDate) : new Date(end.getTime() - 29 * 24 * 60 * 60 * 1000);
    if (!startDate) start.setHours(0, 0, 0, 0);

    const match = { shop: shopId, saleDate: { $gte: start, $lte: end } };
    if (paymentMethod && paymentMethod !== 'all') match.paymentMethod = paymentMethod;

    // Run date-scoped queries in parallel, but keep non-date queries separate
    const [
      totalsAgg,
      dailySalesAgg,
      topProductsAgg,
      paymentBreakdownAgg,
      recentTransactions,
      dailyCostAgg,
    ] = await Promise.all([
      // Gross sales + refunds (returns.totalRefund summed per sale via the
      // $sum *expression* operator, which totals an array field in-place).
      Sale.aggregate([
        { $match: match },
        { $addFields: { refundAmount: { $sum: '$returns.totalRefund' } } },
        { $group: { _id: null, totalSales: { $sum: '$totalAmount' }, totalRefunds: { $sum: '$refundAmount' }, count: { $sum: 1 } } },
      ]),
      Sale.aggregate([
        { $match: match },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$saleDate' } }, sales: { $sum: '$totalAmount' }, orders: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      Sale.aggregate([
        { $match: match },
        { $unwind: '$items' },
        { $lookup: { from: 'products', localField: 'items.product', foreignField: '_id', as: 'product' } },
        { $unwind: '$product' },
        { $group: { _id: '$items.product', name: { $first: '$product.name' }, category: { $first: '$product.category' }, quantity: { $sum: '$items.quantity' }, revenue: { $sum: '$items.total' } } },
        { $sort: { quantity: -1 } },
        { $limit: 10 },
        { $lookup: { from: 'categories', localField: 'category', foreignField: '_id', as: 'categoryInfo' } },
        { $unwind: { path: '$categoryInfo', preserveNullAndEmptyArrays: true } },
        { $project: { _id: 0, productId: '$_id', name: 1, quantity: 1, revenue: 1, category: { $ifNull: ['$categoryInfo.name', 'Uncategorized'] } } },
      ]),
      Sale.aggregate([
        { $match: match },
        { $group: { _id: '$paymentMethod', count: { $sum: 1 }, total: { $sum: '$totalAmount' } } },
        { $sort: { total: -1 } },
      ]),
      Sale.find(match)
        .populate('customer', 'name phone')
        .sort({ createdAt: -1 })
        .limit(20)
        .select('invoiceNo totalAmount paidAmount dueAmount paymentStatus paymentMethod createdAt customer'),
      // Cost of goods sold per day — computed as a single aggregation using $lookup
      // with purchasePrice to avoid redundant product lookups.
      Sale.aggregate([
        { $match: match },
        { $unwind: '$items' },
        { $lookup: { from: 'products', localField: 'items.product', foreignField: '_id', as: 'product' } },
        { $unwind: '$product' },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$saleDate' } }, cost: { $sum: { $multiply: ['$items.quantity', '$product.purchasePrice'] } } } },
      ]),
    ]);

    const totalSales = totalsAgg[0]?.totalSales || 0;
    const totalOrders = totalsAgg[0]?.count || 0;
    const totalRefunds = totalsAgg[0]?.totalRefunds || 0;
    const totalRevenue = Math.max(0, totalSales - totalRefunds);

    const costByDate = Object.fromEntries(dailyCostAgg.map(d => [d._id, d.cost]));
    const totalCost = dailyCostAgg.reduce((sum, d) => sum + d.cost, 0);
    const totalProfit = totalRevenue - totalCost;

    const daily = dailySalesAgg.map(d => ({
      date: d._id,
      orders: d.orders,
      sales: d.sales,
      profit: d.sales - (costByDate[d._id] || 0),
    }));

    // Lightweight aggregations for totalDue (customer + supplier)
    const [customerDueAgg, supplierDueAgg] = await Promise.all([
      Customer.aggregate([
        { $match: { shop: shopId } },
        { $group: { _id: null, total: { $sum: '$dueAmount' } } },
      ]),
      Supplier.aggregate([
        { $match: { shop: shopId } },
        { $group: { _id: null, total: { $sum: '$dueAmount' } } },
      ]),
    ]);

    // Count distinct customers within date range (lightweight)
    const distinctCustomers = await Sale.distinct('customer', { ...match, customer: { $ne: null } });

    const totalDue = (customerDueAgg[0]?.total || 0) + (supplierDueAgg[0]?.total || 0);

    res.json({
      range: { startDate: start.toISOString(), endDate: end.toISOString() },
      summary: {
        totalOrders,
        totalSales,
        totalRevenue,
        totalProfit,
        totalCustomers: distinctCustomers.length,
        // lowStockProducts count is provided by the client-side cached data
        lowStockProducts: 0,
        totalDue,
      },
      daily,
      topProducts: topProductsAgg,
      paymentMethods: paymentBreakdownAgg.map(p => ({ method: p._id || 'unknown', count: p.count, total: p.total })),
      recentTransactions,
      lowStockProducts: [],
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getStockReport = async (req, res) => {
  try {
    const shopId = req.user.shop;
    const { lowStock } = req.query;

    let query = { shop: shopId };
    if (lowStock === 'true') {
      query.$expr = { $lte: ['$stock', '$minStock'] };
    }

    const products = await Product.find(query)
      .populate('category', 'name nameBn')
      .sort({ stock: 1 });

    const summary = await Product.aggregate([
      { $match: { shop: shopId } },
      {
        $group: {
          _id: null,
          totalProducts: { $sum: 1 },
          totalStock: { $sum: '$stock' },
          totalValue: { $sum: { $multiply: ['$stock', '$purchasePrice'] } },
          lowStockCount: {
            $sum: { $cond: [{ $lte: ['$stock', '$minStock'] }, 1, 0] },
          },
        },
      },
    ]);

    res.json({
      products,
      summary: summary[0] || { totalProducts: 0, totalStock: 0, totalValue: 0, lowStockCount: 0 },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getCustomerDueReport = async (req, res) => {
  try {
    const customers = await Customer.find({ shop: req.user.shop, dueAmount: { $gt: 0 } })
      .sort({ dueAmount: -1 });

    const totalDue = customers.reduce((sum, c) => sum + c.dueAmount, 0);
    res.json({ customers, totalDue, count: customers.length });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getSupplierDueReport = async (req, res) => {
  try {
    const suppliers = await Supplier.find({ shop: req.user.shop, dueAmount: { $gt: 0 } })
      .sort({ dueAmount: -1 });

    const totalDue = suppliers.reduce((sum, s) => sum + s.dueAmount, 0);
    res.json({ suppliers, totalDue, count: suppliers.length });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getTaxReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const shopId = req.user.shop;
    let dateFilter = {};

    if (startDate && endDate) {
      dateFilter = { saleDate: { $gte: new Date(startDate), $lte: new Date(endDate) } };
    }

    const taxData = await Sale.aggregate([
      { $match: { shop: shopId, ...dateFilter } },
      { $group: { _id: null, totalTax: { $sum: '$tax' }, totalSales: { $sum: '$totalAmount' }, count: { $sum: 1 } } },
    ]);

    res.json(taxData[0] || { totalTax: 0, totalSales: 0, count: 0 });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getReportsAnalytics, getStockReport, getCustomerDueReport, getSupplierDueReport, getTaxReport };