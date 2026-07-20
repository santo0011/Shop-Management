const Sale = require('../models/Sale');
const Purchase = require('../models/Purchase');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const Supplier = require('../models/Supplier');
const { getTodayRangeIST } = require('../utils/dateRange');

const getDashboardStats = async (req, res) => {
  try {
    const shopId = req.user.shop;
    const { start: today } = getTodayRangeIST();

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // Run all independent queries in parallel
    const [
      todaySalesAgg,
      monthlySalesAgg,
      monthlyPurchasesAgg,
      lowStockCount,
      totalProducts,
      totalCustomers,
      totalSuppliers,
      customerDueAgg,
      supplierDueAgg,
    ] = await Promise.all([
      Sale.aggregate([
        { $match: { shop: shopId, saleDate: { $gte: today } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' }, count: { $sum: 1 } } },
      ]),
      Sale.aggregate([
        { $match: { shop: shopId, saleDate: { $gte: startOfMonth } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' }, count: { $sum: 1 } } },
      ]),
      Purchase.aggregate([
        { $match: { shop: shopId, purchaseDate: { $gte: startOfMonth } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]),
      Product.countDocuments({
        shop: shopId,
        $expr: { $lte: ['$stock', '$minStock'] },
      }),
      Product.countDocuments({ shop: shopId }),
      Customer.countDocuments({ shop: shopId }),
      Supplier.countDocuments({ shop: shopId }),
      Customer.aggregate([
        { $match: { shop: shopId } },
        { $group: { _id: null, total: { $sum: '$dueAmount' } } },
      ]),
      Supplier.aggregate([
        { $match: { shop: shopId } },
        { $group: { _id: null, total: { $sum: '$dueAmount' } } },
      ]),
    ]);

    const totalSales = monthlySalesAgg[0]?.total || 0;
    const totalPurchases = monthlyPurchasesAgg[0]?.total || 0;
    const profit = totalSales - totalPurchases;

    res.json({
      todaySales: todaySalesAgg[0]?.total || 0,
      todaySalesCount: todaySalesAgg[0]?.count || 0,
      monthlySales: totalSales,
      monthlySalesCount: monthlySalesAgg[0]?.count || 0,
      monthlyPurchases: totalPurchases,
      profit,
      lowStockProducts: lowStockCount,
      totalProducts,
      totalCustomers,
      totalSuppliers,
      customerDue: customerDueAgg[0]?.total || 0,
      supplierDue: supplierDueAgg[0]?.total || 0,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getSalesChart = async (req, res) => {
  try {
    const shopId = req.user.shop;
    const { period = 'daily', days } = req.query;
    let startDate;

    const numDays = days ? parseInt(days) : 30;
    startDate = new Date();
    startDate.setDate(startDate.getDate() - numDays);

    const salesData = await Sale.aggregate([
      {
        $match: {
          shop: shopId,
          saleDate: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$saleDate' } },
          total: { $sum: '$totalAmount' },
          count: { $sum: 1 },
          profit: { $sum: { $subtract: ['$totalAmount', '$discount'] } },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Generate date range with zeros for missing days
    const result = [];
    const current = new Date(startDate);
    const today = new Date();
    while (current <= today) {
      const dateStr = current.toISOString().split('T')[0];
      const found = salesData.find(d => d._id === dateStr);
      result.push({
        date: dateStr,
        sales: found ? found.total : 0,
        orders: found ? found.count : 0,
        profit: found ? found.profit : 0,
      });
      current.setDate(current.getDate() + 1);
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getTopProducts = async (req, res) => {
  try {
    const shopId = req.user.shop;
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const topProducts = await Sale.aggregate([
      { $match: { shop: shopId, saleDate: { $gte: startOfMonth } } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          totalQuantity: { $sum: '$items.quantity' },
          totalRevenue: { $sum: '$items.total' },
        },
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: 10 },
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
          name: '$product.name',
          nameBn: '$product.nameBn',
          totalQuantity: 1,
          totalRevenue: 1,
        },
      },
    ]);

    res.json(topProducts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getProfitExpense = async (req, res) => {
  try {
    const shopId = req.user.shop;
    const months = 6;

    // Build all month queries upfront and run in parallel
    const monthQueries = [];
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);

      monthQueries.push(
        Sale.aggregate([
          { $match: { shop: shopId, saleDate: { $gte: monthStart, $lte: monthEnd } } },
          { $group: { _id: null, total: { $sum: '$totalAmount' } } },
        ]),
        Purchase.aggregate([
          { $match: { shop: shopId, purchaseDate: { $gte: monthStart, $lte: monthEnd } } },
          { $group: { _id: null, total: { $sum: '$totalAmount' } } },
        ])
      );
    }

    const allResults = await Promise.all(monthQueries);
    const result = [];

    for (let i = 0; i < months; i++) {
      const salesAgg = allResults[i * 2];
      const purchasesAgg = allResults[i * 2 + 1];

      const d = new Date();
      d.setMonth(d.getMonth() - (months - 1 - i));
      const sales = salesAgg[0]?.total || 0;
      const expenses = purchasesAgg[0]?.total || 0;
      const profit = sales - expenses;

      result.push({
        month: d.toLocaleString('default', { month: 'short' }),
        profit: Math.round(profit * 100) / 100,
        expenses: Math.round(expenses * 100) / 100,
        revenue: Math.round(sales * 100) / 100,
      });
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getPaymentDistribution = async (req, res) => {
  try {
    const shopId = req.user.shop;
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const distribution = await Sale.aggregate([
      { $match: { shop: shopId, saleDate: { $gte: startOfMonth } } },
      {
        $group: {
          _id: '$paymentMethod',
          total: { $sum: '$totalAmount' },
          count: { $sum: 1 },
        },
      },
    ]);

    const paymentLabels = {
      cash: 'Cash',
      card: 'Card',
      upi: 'UPI',
      mobile_banking: 'Bank',
      due: 'Other',
    };

    const result = distribution.map(d => ({
      method: d._id,
      name: paymentLabels[d._id] || d._id,
      value: d.total,
      count: d.count,
    }));

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getSalesByCategory = async (req, res) => {
  try {
    const shopId = req.user.shop;
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const salesByCategory = await Sale.aggregate([
      { $match: { shop: shopId, saleDate: { $gte: startOfMonth } } },
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'products',
          localField: 'items.product',
          foreignField: '_id',
          as: 'product',
        },
      },
      { $unwind: '$product' },
      {
        $lookup: {
          from: 'categories',
          localField: 'product.category',
          foreignField: '_id',
          as: 'category',
        },
      },
      { $unwind: '$category' },
      {
        $group: {
          _id: '$category.name',
          total: { $sum: '$items.total' },
          quantity: { $sum: '$items.quantity' },
        },
      },
      { $sort: { total: -1 } },
    ]);

    const result = salesByCategory.map(c => ({
      name: c._id,
      revenue: Math.round(c.total * 100) / 100,
      quantity: c.quantity,
    }));

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getRecentTransactions = async (req, res) => {
  try {
    const shopId = req.user.shop;

    const recentSales = await Sale.find({ shop: shopId })
      .populate('customer', 'name phone')
      .sort({ createdAt: -1 })
      .limit(7)
      .select('invoiceNo totalAmount paidAmount dueAmount paymentStatus paymentMethod createdAt customer');

    res.json(recentSales);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getDashboardStats, getSalesChart, getTopProducts, getProfitExpense, getPaymentDistribution, getSalesByCategory, getRecentTransactions };