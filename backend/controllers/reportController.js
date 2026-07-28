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
        { $group: { _id: null, totalSales: { $sum: '$totalAmount' }, totalRefunds: { $sum: '$refundAmount' }, count: { $sum: 1 }, totalDue: { $sum: '$dueAmount' } } },
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
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$saleDate' } }, cost: { $sum: { $multiply: [{ $subtract: ['$items.quantity', { $ifNull: ['$items.returnedQty', 0] }] }, '$product.purchasePrice'] } } } },
      ]),
    ]);

    const totalSales = totalsAgg[0]?.totalSales || 0;
    const totalOrders = totalsAgg[0]?.count || 0;
    // totalAmount is ALREADY reduced by refunds on the sale documents.
    // Subtracting totalRefunds again would double-count the reduction.
    // totalSales is the correct revenue figure (post-refund).
    // This matches the Sales page's aggregateSalesStats calculation.
    const totalRevenue = totalSales;
    // totalDue from the date-scoped aggregation (matches Sales page behavior)
    const totalDue = totalsAgg[0]?.totalDue || 0;

    const costByDate = Object.fromEntries(dailyCostAgg.map(d => [d._id, d.cost]));
    const totalCost = dailyCostAgg.reduce((sum, d) => sum + d.cost, 0);
    const totalProfit = totalRevenue - totalCost;

    const daily = dailySalesAgg.map(d => ({
      date: d._id,
      orders: d.orders,
      sales: d.sales,
      profit: d.sales - (costByDate[d._id] || 0),
    }));

    // Count distinct customers within date range (lightweight)
    const distinctCustomers = await Sale.distinct('customer', { ...match, customer: { $ne: null } });

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

// GST type reflects what was actually charged on each transaction — its own
// stored cgst/sgst/igst (set by splitGst at creation time), not a
// retroactive recompute against today's Settings. A GST report has to
// reflect what each historical invoice actually says.
const gstTypeMatch = (gstType) => {
  if (gstType === 'intra') return { $or: [{ cgst: { $gt: 0 } }, { sgst: { $gt: 0 } }] };
  if (gstType === 'inter') return { igst: { $gt: 0 } };
  return {};
};

// @desc    GST summary (sales + purchase totals, output/input/net, monthly
//          breakdown) for the GST Reports page. Transaction-level detail is
//          served separately (paginated) by getGstReportDetails below.
// @route   GET /api/reports/gst
const getGstReport = async (req, res) => {
  try {
    const shopId = req.user.shop;
    const { startDate, endDate, gstType, gstRate, state, customer, supplier } = req.query;

    // Default to the last 30 days when no range is given, matching
    // getReportsAnalytics — previously this endpoint silently returned
    // all-time data with no date filter at all.
    const end = endDate ? new Date(endDate) : new Date();
    if (!endDate) end.setHours(23, 59, 59, 999);
    const start = startDate ? new Date(startDate) : new Date(end.getTime() - 29 * 24 * 60 * 60 * 1000);
    if (!startDate) start.setHours(0, 0, 0, 0);
    const dateFilter = { $gte: start, $lte: end };

    const typeFilter = gstTypeMatch(gstType);

    // ─── Sales GST ────────────────────────────────────────────────
    const salesMatch = { shop: shopId, saleDate: dateFilter, ...typeFilter };
    if (gstRate) salesMatch.gstRate = Number(gstRate);
    if (customer) salesMatch.customer = customer;

    const salesGstAgg = await Sale.aggregate([
      { $match: salesMatch },
      {
        $lookup: {
          from: 'customers',
          localField: 'customer',
          foreignField: '_id',
          as: 'customerData',
        },
      },
      { $unwind: { path: '$customerData', preserveNullAndEmptyArrays: true } },
      { $match: state ? { 'customerData.state': state } : {} },
      {
        $group: {
          _id: null,
          totalTaxable: { $sum: '$taxableAmount' },
          totalCgst: { $sum: '$cgst' },
          totalSgst: { $sum: '$sgst' },
          totalIgst: { $sum: '$igst' },
          totalGst: { $sum: '$gstAmount' },
          totalSales: { $sum: '$totalAmount' },
          count: { $sum: 1 },
        },
      },
    ]);

    // ─── Purchase GST ──────────────────────────────────────────────
    const purchaseMatch = { shop: shopId, purchaseDate: dateFilter, ...typeFilter };
    if (gstRate) purchaseMatch.gstRate = Number(gstRate);
    if (supplier) purchaseMatch.supplier = supplier;

    const purchaseGstAgg = await Purchase.aggregate([
      { $match: purchaseMatch },
      {
        $lookup: {
          from: 'suppliers',
          localField: 'supplier',
          foreignField: '_id',
          as: 'supplierData',
        },
      },
      { $unwind: { path: '$supplierData', preserveNullAndEmptyArrays: true } },
      { $match: state ? { 'supplierData.state': state } : {} },
      {
        $group: {
          _id: null,
          totalTaxable: { $sum: '$taxableAmount' },
          totalCgst: { $sum: '$cgst' },
          totalSgst: { $sum: '$sgst' },
          totalIgst: { $sum: '$igst' },
          totalGst: { $sum: '$gstAmount' },
          totalPurchases: { $sum: '$totalAmount' },
          count: { $sum: 1 },
        },
      },
    ]);

    // ─── Summary ───────────────────────────────────────────────────
    const salesSummary = salesGstAgg[0] || { totalTaxable: 0, totalCgst: 0, totalSgst: 0, totalIgst: 0, totalGst: 0, totalSales: 0, count: 0 };
    const purchaseSummary = purchaseGstAgg[0] || { totalTaxable: 0, totalCgst: 0, totalSgst: 0, totalIgst: 0, totalGst: 0, totalPurchases: 0, count: 0 };

    const summary = {
      totalTaxableValue: salesSummary.totalTaxable + purchaseSummary.totalTaxable,
      totalCgst: salesSummary.totalCgst + purchaseSummary.totalCgst,
      totalSgst: salesSummary.totalSgst + purchaseSummary.totalSgst,
      totalIgst: salesSummary.totalIgst + purchaseSummary.totalIgst,
      totalGst: salesSummary.totalGst + purchaseSummary.totalGst,
      outputGst: salesSummary.totalGst,
      inputGst: purchaseSummary.totalGst,
      netGst: salesSummary.totalGst - purchaseSummary.totalGst,
    };

    // ─── Monthly GST ───────────────────────────────────────────────
    const monthlySalesGst = await Sale.aggregate([
      { $match: salesMatch },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$saleDate' } },
          taxableAmount: { $sum: '$taxableAmount' },
          cgst: { $sum: '$cgst' },
          sgst: { $sum: '$sgst' },
          igst: { $sum: '$igst' },
          gstAmount: { $sum: '$gstAmount' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const monthlyPurchaseGst = await Purchase.aggregate([
      { $match: purchaseMatch },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$purchaseDate' } },
          taxableAmount: { $sum: '$taxableAmount' },
          cgst: { $sum: '$cgst' },
          sgst: { $sum: '$sgst' },
          igst: { $sum: '$igst' },
          gstAmount: { $sum: '$gstAmount' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json({
      range: { startDate: start.toISOString(), endDate: end.toISOString() },
      sales: { summary: salesSummary },
      purchases: { summary: purchaseSummary },
      summary,
      monthly: {
        sales: monthlySalesGst,
        purchases: monthlyPurchaseGst,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Paginated, searchable transaction-level GST detail table for
//          the GST Reports page — served separately from getGstReport so
//          switching pages/searching doesn't re-run the (heavier) summary
//          aggregation, and so the response includes a real total count
//          instead of a raw capped dump.
// @route   GET /api/reports/gst/details
const getGstReportDetails = async (req, res) => {
  try {
    const shopId = req.user.shop;
    const { reportType, startDate, endDate, gstType, search, page, limit } = req.query;

    if (reportType !== 'sales' && reportType !== 'purchases') {
      return res.status(400).json({ message: 'reportType must be "sales" or "purchases"' });
    }

    const end = endDate ? new Date(endDate) : new Date();
    if (!endDate) end.setHours(23, 59, 59, 999);
    const start = startDate ? new Date(startDate) : new Date(end.getTime() - 29 * 24 * 60 * 60 * 1000);
    if (!startDate) start.setHours(0, 0, 0, 0);
    const dateFilter = { $gte: start, $lte: end };

    const typeFilter = gstTypeMatch(gstType);
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const pageSize = Math.min(5000, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * pageSize;
    const searchRegex = search ? new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') : null;

    const isSales = reportType === 'sales';
    const Model = isSales ? Sale : Purchase;
    const dateField = isSales ? 'saleDate' : 'purchaseDate';
    const joinCollection = isSales ? 'customers' : 'suppliers';
    const joinField = isSales ? 'customer' : 'supplier';
    const joinAlias = isSales ? 'partyData' : 'partyData';
    const noField = isSales ? 'invoiceNo' : 'purchaseNo';

    const match = { shop: shopId, [dateField]: dateFilter, ...typeFilter };

    const pipeline = [
      { $match: match },
      {
        $lookup: {
          from: joinCollection,
          localField: joinField,
          foreignField: '_id',
          as: joinAlias,
        },
      },
      { $unwind: { path: `$${joinAlias}`, preserveNullAndEmptyArrays: true } },
    ];

    if (searchRegex) {
      pipeline.push({
        $match: {
          $or: [
            { [noField]: searchRegex },
            { [`${joinAlias}.name`]: searchRegex },
          ],
        },
      });
    }

    pipeline.push(
      { $sort: { [dateField]: -1 } },
      {
        $facet: {
          rows: [
            { $skip: skip },
            { $limit: pageSize },
            {
              $project: {
                _id: 1,
                no: `$${noField}`,
                date: `$${dateField}`,
                partyName: { $ifNull: [`$${joinAlias}.name`, isSales ? 'Walk-in' : ''] },
                partyState: { $ifNull: [`$${joinAlias}.state`, ''] },
                gstRate: 1,
                taxableAmount: 1,
                cgst: 1,
                sgst: 1,
                igst: 1,
                gstAmount: 1,
                totalAmount: 1,
              },
            },
          ],
          totalCount: [{ $count: 'count' }],
        },
      }
    );

    const [result] = await Model.aggregate(pipeline);
    const rows = result?.rows || [];
    const totalCount = result?.totalCount?.[0]?.count || 0;

    res.json({
      rows,
      totalCount,
      page: pageNum,
      pages: Math.max(1, Math.ceil(totalCount / pageSize)),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getReportsAnalytics, getStockReport, getCustomerDueReport, getSupplierDueReport, getGstReport, getGstReportDetails };
