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

    // Today's sales
    const todaySales = await Sale.aggregate([
      { $match: { shop: shopId, saleDate: { $gte: today } } },
      { $group: { _id: null, total: { $sum: '$totalAmount' }, count: { $sum: 1 } } },
    ]);

    // Monthly sales
    const monthlySales = await Sale.aggregate([
      { $match: { shop: shopId, saleDate: { $gte: startOfMonth } } },
      { $group: { _id: null, total: { $sum: '$totalAmount' }, count: { $sum: 1 } } },
    ]);

    // Monthly purchases
    const monthlyPurchases = await Purchase.aggregate([
      { $match: { shop: shopId, purchaseDate: { $gte: startOfMonth } } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]);

    // Profit = (monthly sales - monthly purchases)
    const totalSales = monthlySales[0]?.total || 0;
    const totalPurchases = monthlyPurchases[0]?.total || 0;
    const profit = totalSales - totalPurchases;

    // Low stock products
    const lowStockProducts = await Product.countDocuments({
      shop: shopId,
      $expr: { $lte: ['$stock', '$minStock'] },
    });

    // Total products
    const totalProducts = await Product.countDocuments({ shop: shopId });

    // Total customers
    const totalCustomers = await Customer.countDocuments({ shop: shopId });

    // Total suppliers
    const totalSuppliers = await Supplier.countDocuments({ shop: shopId });

    // Customer due
    const customerDue = await Customer.aggregate([
      { $match: { shop: shopId } },
      { $group: { _id: null, total: { $sum: '$dueAmount' } } },
    ]);

    // Supplier due
    const supplierDue = await Supplier.aggregate([
      { $match: { shop: shopId } },
      { $group: { _id: null, total: { $sum: '$dueAmount' } } },
    ]);

    res.json({
      todaySales: todaySales[0]?.total || 0,
      todaySalesCount: todaySales[0]?.count || 0,
      monthlySales: totalSales,
      monthlySalesCount: monthlySales[0]?.count || 0,
      monthlyPurchases: totalPurchases,
      profit,
      lowStockProducts,
      totalProducts,
      totalCustomers,
      totalSuppliers,
      customerDue: customerDue[0]?.total || 0,
      supplierDue: supplierDue[0]?.total || 0,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getSalesChart = async (req, res) => {
  try {
    const shopId = req.user.shop;
    const { period = 'daily' } = req.query;
    let startDate;

    if (period === 'daily') {
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
    } else if (period === 'monthly') {
      startDate = new Date();
      startDate.setFullYear(startDate.getFullYear() - 1);
    }

    const groupFormat = period === 'daily'
      ? { $dateToString: { format: '%Y-%m-%d', date: '$saleDate' } }
      : { $dateToString: { format: '%Y-%m', date: '$saleDate' } };

    const salesData = await Sale.aggregate([
      {
        $match: {
          shop: shopId,
          saleDate: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: groupFormat,
          total: { $sum: '$totalAmount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json(salesData);
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

module.exports = { getDashboardStats, getSalesChart, getTopProducts, getRecentTransactions };