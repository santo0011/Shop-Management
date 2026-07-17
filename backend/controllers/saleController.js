const Sale = require('../models/Sale');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const { getTodayRangeIST } = require('../utils/dateRange');

const getSales = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const { startDate, endDate, customer, paymentMethod, paymentStatus, search } = req.query;

    let query = { shop: req.user.shop };

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
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

    const sales = await Sale.find(query)
      .populate('customer', 'name phone')
      .populate('items.product', 'name nameBn unit')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Sale.countDocuments(query);

    res.json({ sales, page, pages: Math.ceil(total / limit), total });
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
    req.body.shop = req.user.shop;

    // Generate invoice number
    const count = await Sale.countDocuments({ shop: req.user.shop });
    const shopPrefix = req.user.shop?.toString().slice(-4).toUpperCase() || 'INV';
    const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
    req.body.invoiceNo = `${shopPrefix}-${dateStr}-${(count + 1).toString().padStart(4, '0')}`;

    // Calculate totals
    const subtotal = req.body.items.reduce((sum, item) => sum + (item.total || item.price * item.quantity), 0);
    req.body.subtotal = subtotal;
    req.body.totalAmount = subtotal - (req.body.discount || 0) + (req.body.tax || 0);

    // Set paid and due amounts
    const paid = req.body.paidAmount || 0;
    const totalAmt = req.body.totalAmount;
    req.body.paidAmount = Math.min(paid, totalAmt);
    req.body.dueAmount = Math.max(0, totalAmt - paid);

    // Set payment status
    if (req.body.dueAmount === 0) {
      req.body.paymentStatus = 'paid';
    } else if (req.body.paidAmount > 0) {
      req.body.paymentStatus = 'partial';
    } else {
      req.body.paymentStatus = 'unpaid';
    }

    // Validate required fields
    const requiredFields = ['items', 'subtotal', 'totalAmount', 'paidAmount', 'dueAmount', 'paymentMethod'];
    const missing = requiredFields.filter(f => req.body[f] === undefined || req.body[f] === null);
    if (missing.length > 0) {
      return res.status(400).json({ message: `Missing required fields: ${missing.join(', ')}` });
    }
    if (!req.body.items || req.body.items.length === 0) {
      return res.status(400).json({ message: 'Sale must contain at least one item' });
    }

    const sale = await Sale.create(req.body);

    // Update product stock
    for (const item of req.body.items) {
      await Product.findByIdAndUpdate(item.product, { $inc: { stock: -item.quantity } });
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
          totalAmount: { $sum: '$items.total' },
          lastSold: { $max: '$createdAt' },
        },
      },
      { $sort: { totalQuantity: -1 } },
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
          totalSold: '$totalQuantity',
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

// ─── Get Sales Stats (Today's Summary) ──────────────────────────────────────
const getSalesStats = async (req, res) => {
  try {
    const shop = req.user.shop;

    const { start: todayStart, end: todayEnd } = getTodayRangeIST();

    const todaySales = await Sale.find({
      shop,
      createdAt: { $gte: todayStart, $lte: todayEnd },
    });

    const totalTransactions = todaySales.length;
    const todayRevenue = todaySales.reduce((sum, s) => sum + (s.paidAmount || 0), 0);
    const todayDue = todaySales.reduce((sum, s) => sum + (s.dueAmount || 0), 0);
    const todayTotal = todaySales.reduce((sum, s) => sum + (s.totalAmount || 0), 0);

    res.json({
      todaySales: totalTransactions,
      todayRevenue,
      todayDue,
      totalAmount: todayTotal,
      count: totalTransactions,
    });
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

    // If customer exists, update their due
    if (sale.customer) {
      const Customer = require('../models/Customer');
      await Customer.findByIdAndUpdate(sale.customer, { $inc: { totalDue: -sale.dueAmount } });
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
