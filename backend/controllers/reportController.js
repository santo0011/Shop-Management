const Sale = require('../models/Sale');
const Purchase = require('../models/Purchase');
const Expense = require('../models/Expense');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const Supplier = require('../models/Supplier');

const getSalesReport = async (req, res) => {
  try {
    const { startDate, endDate, groupBy = 'daily' } = req.query;
    const shopId = req.user.shop;
    let dateFilter = {};

    if (startDate && endDate) {
      dateFilter = { saleDate: { $gte: new Date(startDate), $lte: new Date(endDate) } };
    }

    const groupFormat = groupBy === 'daily'
      ? { $dateToString: { format: '%Y-%m-%d', date: '$saleDate' } }
      : { $dateToString: { format: '%Y-%m', date: '$saleDate' } };

    const report = await Sale.aggregate([
      { $match: { shop: shopId, ...dateFilter } },
      {
        $group: {
          _id: groupFormat,
          totalSales: { $sum: '$totalAmount' },
          totalDiscount: { $sum: '$discount' },
          totalTax: { $sum: '$tax' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const totals = await Sale.aggregate([
      { $match: { shop: shopId, ...dateFilter } },
      {
        $group: {
          _id: null,
          totalSales: { $sum: '$totalAmount' },
          totalDiscount: { $sum: '$discount' },
          totalTax: { $sum: '$tax' },
          count: { $sum: 1 },
        },
      },
    ]);

    res.json({
      report,
      totals: totals[0] || { totalSales: 0, totalDiscount: 0, totalTax: 0, count: 0 },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getProfitReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const shopId = req.user.shop;
    let dateFilter = {};

    if (startDate && endDate) {
      dateFilter = { createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) } };
    }

    const totalSales = await Sale.aggregate([
      { $match: { shop: shopId, ...dateFilter } },
      { $group: { _id: null, total: { $sum: '$totalAmount' }, cost: { $sum: 0 } } },
    ]);

    // Calculate cost of goods sold (purchase prices of sold items)
    const soldItems = await Sale.aggregate([
      { $match: { shop: shopId, ...dateFilter } },
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
        $group: {
          _id: null,
          totalCost: { $sum: { $multiply: ['$items.quantity', '$product.purchasePrice'] } },
        },
      },
    ]);

    const totalExpenses = await Expense.aggregate([
      { $match: { shop: shopId, ...dateFilter } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    const revenue = totalSales[0]?.total || 0;
    const cogs = soldItems[0]?.totalCost || 0;
    const expenses = totalExpenses[0]?.total || 0;
    const grossProfit = revenue - cogs;
    const netProfit = revenue - cogs - expenses;

    res.json({
      revenue,
      cogs,
      expenses,
      grossProfit,
      netProfit,
      profitMargin: revenue > 0 ? ((netProfit / revenue) * 100).toFixed(2) : 0,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getExpenseReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const shopId = req.user.shop;
    let dateFilter = {};

    if (startDate && endDate) {
      dateFilter = { expenseDate: { $gte: new Date(startDate), $lte: new Date(endDate) } };
    }

    const report = await Expense.aggregate([
      { $match: { shop: shopId, ...dateFilter } },
      {
        $group: {
          _id: '$category',
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { total: -1 } },
    ]);

    const total = await Expense.aggregate([
      { $match: { shop: shopId, ...dateFilter } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    res.json({ report, total: total[0]?.total || 0 });
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

module.exports = { getSalesReport, getProfitReport, getExpenseReport, getStockReport, getCustomerDueReport, getSupplierDueReport, getTaxReport };