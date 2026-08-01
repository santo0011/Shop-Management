const mongoose = require('mongoose');
const Sale = require('../models/Sale');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const CustomerPayment = require('../models/CustomerPayment');
const Shop = require('../models/Shop');
const { calculateItemTotals } = require('../utils/gstCalculation');
const { allocatePayment, recalculateCustomerDue } = require('../services/paymentAllocation');

// ─── Shared filter builder ──────────────────────────────────────
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
      {
        $group: {
          _id: null,
          cost: { $sum: { $multiply: [{ $subtract: ['$items.quantity', { $ifNull: ['$items.returnedQty', 0] }] }, '$product.purchasePrice'] } },
        },
      },
    ]),
  ]);

  const totalSales = totalsAgg[0]?.totalSales || 0;
  const totalOrders = totalsAgg[0]?.count || 0;
  const totalRefunds = totalsAgg[0]?.totalRefunds || 0;
  // totalAmount is ALREADY reduced by refunds on the sale documents.
  // Subtracting totalRefunds again would double-count the reduction.
  // totalSales is the correct revenue figure (post-refund).
  const totalRevenue = totalSales;
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
        .populate('customer', 'name phone state')
        .populate('items.product', 'name nameBn unit')
        .populate('returns.processedBy', 'name')
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
      .populate('customer', 'name phone state')
      .populate('items.product', 'name nameBn unit sellingPrice')
      .populate('returns.processedBy', 'name');
    if (!sale) return res.status(404).json({ message: 'Sale not found' });
    res.json({ sale });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createSale = async (req, res) => {
  try {
    if (!req.body.items || req.body.items.length === 0) {
      return res.status(400).json({ message: 'Sale must contain at least one item' });
    }
    if (!req.body.paymentMethod) {
      return res.status(400).json({ message: 'Missing required fields: paymentMethod' });
    }

    for (const item of req.body.items) {
      const qty = Number(item.quantity);
      if (!(qty > 0)) {
        return res.status(400).json({ message: 'Item quantity must be greater than zero.' });
      }
      const product = await Product.findOne({ _id: item.product, shop: req.user.shop });
      if (!product) {
        return res.status(400).json({ message: 'One or more products in this sale were not found.' });
      }
      if (product.trackStock !== false && qty > product.stock) {
        return res.status(400).json({
          message: `Insufficient stock for "${product.name}". Available: ${product.stock} ${product.unit}, requested: ${qty}.`,
        });
      }
    }

    req.body.shop = req.user.shop;

    // Generate invoice number
    const count = await Sale.countDocuments({ shop: req.user.shop });
    const shopPrefix = req.user.shop?.toString().slice(-4).toUpperCase() || 'INV';
    const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
    req.body.invoiceNo = `${shopPrefix}-${dateStr}-${(count + 1).toString().padStart(4, '0')}`;

    // ─── CRITICAL: USE FRONTEND-CALCULATED VALUES ─────────────────
    // The Confirm Sale modal (POS) is the single source of truth for all
    // monetary calculations. The backend must NOT recalculate GST, subtotal,
    // discount, or totalAmount — doing so produces inconsistent values
    // between the invoice, sales details, and database.
    //
    // The frontend sends these pre-computed values:
    //   subtotal, discount, gstRate, gstAmount, cgst, sgst, igst,
    //   taxableAmount, totalAmount, paidAmount, dueAmount
    //
    // All of these are accepted as-is from the request body.

    // Validate and cap paidAmount / dueAmount against totalAmount
    const totalAmt = Number(req.body.totalAmount) || 0;
    const requestedPaid = Math.max(0, Number(req.body.paidAmount) || 0);
    req.body.paidAmount = Math.min(requestedPaid, totalAmt);
    req.body.dueAmount = Math.max(0, totalAmt - req.body.paidAmount);

    if (req.body.dueAmount === 0) {
      req.body.paymentStatus = 'paid';
    } else if (req.body.paidAmount > 0) {
      req.body.paymentStatus = 'partial';
    } else {
      req.body.paymentStatus = 'unpaid';
    }

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

    for (const item of req.body.items) {
      await Product.findByIdAndUpdate(item.product, { $inc: { stock: -item.quantity } });
    }

    if (sale.customer) {
      // Update customer totals
      await Customer.findByIdAndUpdate(sale.customer, {
        $inc: {
          totalPurchases: sale.totalAmount,
          totalPaid: sale.paidAmount,
          dueAmount: sale.dueAmount,
        },
      });

      // If there's a previous-due payment (sent as prevDuePayment from POS),
      // allocate it across the customer's older unpaid invoices (FIFO).
      const prevDuePayment = Math.max(0, Number(req.body.prevDuePayment) || 0);
      if (prevDuePayment > 0) {
        await allocatePayment(sale.customer, req.user.shop, prevDuePayment, {
          excludeSaleId: sale._id,
        });
      }

      // Recalculate customer-level dueAmount from all invoice dueAmounts
      // to keep it in sync after FIFO allocation.
      const customer = await Customer.findById(sale.customer);
      if (customer) {
        await recalculateCustomerDue(customer, req.user.shop);
      }
    }

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

const getTopSellingProducts = async (req, res) => {
  try {
    const { limit, category } = req.query;
    const limitNum = Math.max(1, parseInt(limit, 10) || 20);

    const pipeline = [
      { $match: { shop: req.user.shop } },
      { $unwind: '$items' },
    ];

    if (category) {
      pipeline.push(
        {
          $lookup: {
            from: 'products',
            localField: 'items.product',
            foreignField: '_id',
            as: 'itemProduct',
          },
        },
        { $unwind: '$itemProduct' },
        { $match: { 'itemProduct.category': new mongoose.Types.ObjectId(category) } },
      );
    }

    pipeline.push(
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
      { $limit: limitNum },
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
    );

    const topProducts = await Sale.aggregate(pipeline);

    if (topProducts.length < limitNum) {
      const excludeIds = topProducts.map((p) => p._id);
      const fallbackQuery = { shop: req.user.shop, isActive: true, _id: { $nin: excludeIds } };
      if (category) fallbackQuery.category = category;

      const fallbackProducts = await Product.find(fallbackQuery)
        .select('name nameBn sellingPrice stock unit barcode category')
        .sort({ name: 1 })
        .limit(limitNum - topProducts.length);

      topProducts.push(...fallbackProducts.map((p) => ({
        _id: p._id,
        name: p.name,
        nameBn: p.nameBn,
        sellingPrice: p.sellingPrice,
        stock: p.stock,
        unit: p.unit,
        barcode: p.barcode,
        category: p.category,
        totalSold: 0,
        totalRevenue: 0,
        lastSold: null,
      })));
    }

    res.json(topProducts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getTopSellingCategories = async (req, res) => {
  try {
    const topCategories = await Sale.aggregate([
      { $match: { shop: req.user.shop } },
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
          _id: '$product.category',
          totalQuantity: { $sum: '$items.quantity' },
          totalReturned: { $sum: { $ifNull: ['$items.returnedQty', 0] } },
        },
      },
      {
        $addFields: {
          netQuantity: { $subtract: ['$totalQuantity', '$totalReturned'] },
        },
      },
      { $sort: { netQuantity: -1 } },
      {
        $lookup: {
          from: 'categories',
          localField: '_id',
          foreignField: '_id',
          as: 'category',
        },
      },
      { $unwind: '$category' },
      {
        $project: {
          _id: '$category._id',
          name: '$category.name',
          nameBn: '$category.nameBn',
          totalQuantity: '$netQuantity',
        },
      },
    ]);

    res.json(topCategories);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getProductSoldCounts = async (req, res) => {
  try {
    const soldCounts = await Sale.aggregate([
      { $match: { shop: req.user.shop } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          totalQuantity: { $sum: '$items.quantity' },
          totalReturned: { $sum: { $ifNull: ['$items.returnedQty', 0] } },
        },
      },
      {
        $project: {
          totalSold: { $subtract: ['$totalQuantity', '$totalReturned'] },
        },
      },
    ]);

    res.json(soldCounts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

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

const getSalesStats = async (req, res) => {
  try {
    const query = await buildSalesQuery(req);
    const stats = await aggregateSalesStats(query);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteSale = async (req, res) => {
  try {
    const sale = await Sale.findOne({ _id: req.params.id, shop: req.user.shop });
    if (!sale) return res.status(404).json({ message: 'Sale not found' });

    for (const item of sale.items) {
      await Product.findByIdAndUpdate(item.product, { $inc: { stock: +item.quantity } });
    }

    await Sale.findByIdAndDelete(sale._id);
    res.json({ message: 'Sale deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateSale = async (req, res) => {
  try {
    const sale = await Sale.findOne({ _id: req.params.id, shop: req.user.shop });
    if (!sale) return res.status(404).json({ message: 'Sale not found' });

    // ─── Restrictions ────────────────────────────────────────────
    // Cannot edit if ANY return exists (partial or full)
    if (sale.returnStatus !== 'none') {
      return res.status(400).json({ message: 'Cannot edit an invoice that has any returns.' });
    }

    // Cannot edit if more than 30 minutes have passed
    const elapsed = Date.now() - new Date(sale.createdAt).getTime();
    if (elapsed > 30 * 60 * 1000) {
      return res.status(400).json({ message: 'Editing time expired (30 minutes). Use Return instead.' });
    }

    if (!req.body.items || req.body.items.length === 0) {
      return res.status(400).json({ message: 'Sale must contain at least one item' });
    }
    if (!req.body.paymentMethod) {
      return res.status(400).json({ message: 'Missing required fields: paymentMethod' });
    }

    for (const item of req.body.items) {
      const qty = Number(item.quantity);
      if (!(qty > 0)) {
        return res.status(400).json({ message: 'Item quantity must be greater than zero.' });
      }
      const product = await Product.findOne({ _id: item.product, shop: req.user.shop });
      if (!product) {
        return res.status(400).json({ message: 'One or more products in this sale were not found.' });
      }
    }

    // ─── Step 1: Restore stock from original invoice ─────────────
    for (const origItem of sale.items) {
      await Product.findByIdAndUpdate(origItem.product, { $inc: { stock: +origItem.quantity } });
    }

    // ─── Step 2: Validate stock for new items ────────────────────
    for (const item of req.body.items) {
      const product = await Product.findOne({ _id: item.product, shop: req.user.shop });
      if (product.trackStock !== false && item.quantity > product.stock) {
        // Restore stock back since we already deducted
        for (const origItem of sale.items) {
          await Product.findByIdAndUpdate(origItem.product, { $inc: { stock: -origItem.quantity } });
        }
        return res.status(400).json({
          message: `Insufficient stock for "${product.name}". Available: ${product.stock} ${product.unit}, requested: ${item.quantity}.`,
        });
      }
    }

    // ─── Step 3: Apply new stock deduction ───────────────────────
    for (const item of req.body.items) {
      await Product.findByIdAndUpdate(item.product, { $inc: { stock: -item.quantity } });
    }

    // ─── Step 4: Update sale fields ──────────────────────────────
    const totalAmt = Number(req.body.totalAmount) || 0;
    const requestedPaid = Math.max(0, Number(req.body.paidAmount) || 0);
    const newPaidAmount = Math.min(requestedPaid, totalAmt);
    const newDueAmount = Math.max(0, totalAmt - newPaidAmount);

    let newPaymentStatus = 'paid';
    if (newDueAmount === 0) {
      newPaymentStatus = 'paid';
    } else if (newPaidAmount > 0) {
      newPaymentStatus = 'partial';
    } else {
      newPaymentStatus = 'unpaid';
    }

    const prevTotalAmount = sale.totalAmount || 0;
    const prevPaidAmount = sale.paidAmount || 0;
    const prevDueAmount = sale.dueAmount || 0;

    sale.items = req.body.items;
    sale.subtotal = Number(req.body.subtotal) || 0;
    sale.discount = Number(req.body.discount) || 0;
    sale.gstRate = Number(req.body.gstRate) || 0;
    sale.cgst = Number(req.body.cgst) || 0;
    sale.sgst = Number(req.body.sgst) || 0;
    sale.igst = Number(req.body.igst) || 0;
    sale.taxableAmount = Number(req.body.taxableAmount) || 0;
    sale.gstAmount = Number(req.body.gstAmount) || 0;
    sale.totalAmount = totalAmt;
    sale.paidAmount = newPaidAmount;
    sale.dueAmount = newDueAmount;
    sale.paymentStatus = newPaymentStatus;
    sale.paymentMethod = req.body.paymentMethod;
    sale.notes = req.body.notes || '';
    sale.updatedBy = req.user._id;
    sale.editCount = (sale.editCount || 0) + 1;

    await sale.save();

    // ─── Step 5: Update customer totals ──────────────────────────
    if (sale.customer) {
      await Customer.findByIdAndUpdate(sale.customer, {
        $inc: {
          totalPurchases: sale.totalAmount - prevTotalAmount,
          totalPaid: sale.paidAmount - prevPaidAmount,
          dueAmount: sale.dueAmount - prevDueAmount,
        },
      });

      const customer = await Customer.findById(sale.customer);
      if (customer) {
        await recalculateCustomerDue(customer, req.user.shop);
      }
    }

    // ─── Step 6: Handle payment record ───────────────────────────
    // If paid amount changed, update or create payment record
    if (sale.customer && sale.paidAmount > 0) {
      const existingPayment = await CustomerPayment.findOne({
        customer: sale.customer,
        sale: sale._id,
        source: { $in: ['sale', 'pos'] },
      });
      if (existingPayment) {
        existingPayment.amount = sale.paidAmount;
        existingPayment.paymentMethod = sale.paymentMethod;
        await existingPayment.save();
      } else {
        await CustomerPayment.create({
          customer: sale.customer,
          shop: req.user.shop,
          amount: sale.paidAmount,
          paymentMethod: sale.paymentMethod,
          notes: `Payment at edit for invoice ${sale.invoiceNo}`,
          collectedBy: req.user._id,
          sale: sale._id,
          source: sale.posType === 'regular' ? 'sale' : 'pos',
        });
      }
    }

    const updatedSale = await Sale.findById(sale._id)
      .populate('customer', 'name phone state')
      .populate('items.product', 'name nameBn unit')
      .populate('returns.processedBy', 'name');

    res.json({ sale: updatedSale });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const processReturn = async (req, res) => {
  try {
    const sale = await Sale.findOne({ _id: req.params.id, shop: req.user.shop });
    if (!sale) return res.status(404).json({ message: 'Sale not found' });

    const { items, reason, refundMethod } = req.body;
    if (!items || items.length === 0) {
      return res.status(400).json({ message: 'At least one item is required for return' });
    }

    // ─── Calculate the effective refund ratio ──────────────────────
    // The sale.totalAmount already includes all discounts (manual + round-off).
    // The sum of item.totals only accounts for item-level discounts + GST.
    // Any extra discount (round-off, extra manual) must be distributed
    // proportionally across all items so the refund matches what the
    // customer actually paid.
    const rawItemTotal = sale.items.reduce((sum, i) => sum + (i.total || 0), 0);
    const effectiveTotal = sale.totalAmount || rawItemTotal;
    // refundRatio = what was actually paid / what the raw items would cost
    // For no discount scenario this is 1.0, for round-off it's < 1.0
    const refundRatio = rawItemTotal > 0 ? effectiveTotal / rawItemTotal : 1;

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

      saleItem.returnedQty = alreadyReturned + ret.quantity;

      await Product.findByIdAndUpdate(ret.productId, { $inc: { stock: +ret.quantity } });

      // Calculate refund using the effective ratio so round-off is included
      // Full return: refund = item.total * refundRatio
      // Partial return: refund = (item.total * refundRatio) * (returnedQty / soldQty)
      // ALWAYS use the backend-calculated refund amount, ignore frontend's value
      // to ensure round-off is properly distributed
      const finalUnitPrice = saleItem.quantity > 0 ? (saleItem.total || 0) / saleItem.quantity : 0;
      const effectiveUnitPrice = finalUnitPrice * refundRatio;
      const refundAmt = effectiveUnitPrice * ret.quantity;
      totalRefund += refundAmt;

      returnItems.push({
        product: ret.productId,
        productName: ret.productName || saleItem.product?.name || '',
        quantity: ret.quantity,
        refundAmount: refundAmt,
        reason: ret.reason || reason || '',
      });
    }

    const prevTotalAmount = sale.totalAmount || 0;
    const prevPaidAmount = sale.paidAmount || 0;
    const prevDueAmount = sale.dueAmount || 0;
    const prevSubtotal = sale.subtotal || 0;
    const prevDiscount = sale.discount || 0;
    const prevTaxableAmount = sale.taxableAmount || 0;
    const prevGstAmount = sale.gstAmount || 0;
    const prevCgst = sale.cgst || 0;
    const prevSgst = sale.sgst || 0;
    const prevIgst = sale.igst || 0;

    // Step 1: Reduce totalAmount by the refund
    sale.totalAmount = Math.floor(Math.max(0, (sale.totalAmount || 0) - totalRefund));

    // Step 2: Recalculate all header fields proportionally based on the
    // ratio of remaining value to original value. This ensures subtotal,
    // discount, taxableAmount, and all GST fields stay consistent with
    // the remaining (non-returned) items.
    const reductionRatio = prevTotalAmount > 0
      ? sale.totalAmount / prevTotalAmount
      : 0;
    sale.subtotal = Math.round(prevSubtotal * reductionRatio * 100) / 100;
    sale.discount = Math.round(prevDiscount * reductionRatio * 100) / 100;
    sale.taxableAmount = Math.round(prevTaxableAmount * reductionRatio * 100) / 100;
    sale.gstAmount = Math.round(prevGstAmount * reductionRatio * 100) / 100;
    sale.cgst = Math.round(prevCgst * reductionRatio * 100) / 100;
    sale.sgst = Math.round(prevSgst * reductionRatio * 100) / 100;
    sale.igst = Math.round(prevIgst * reductionRatio * 100) / 100;

    // Step 3: Reduce due first (always prefer reducing due over refunding cash)
    const newTotal = sale.totalAmount;
    const currentPaid = sale.paidAmount || 0;
    sale.dueAmount = Math.max(0, newTotal - currentPaid);

    // Step 4: Only refund cash if paid amount exceeds the new total
    // (i.e. customer overpaid relative to the reduced invoice)
    const excessPaid = Math.max(0, currentPaid - newTotal);
    sale.paidAmount = currentPaid - excessPaid;

    if (sale.dueAmount === 0 && sale.paidAmount > 0) {
      sale.paymentStatus = 'paid';
    } else if (sale.paidAmount > 0) {
      sale.paymentStatus = 'partial';
    } else {
      sale.paymentStatus = 'unpaid';
    }

    sale.returns.push({
      items: returnItems,
      totalRefund,
      refundMethod: refundMethod || 'cash',
      reason: reason || '',
      processedBy: req.user._id,
      returnDate: new Date(),
    });

    await sale.save();

    if (sale.customer) {
      await Customer.findByIdAndUpdate(sale.customer, {
        $inc: {
          totalPurchases: sale.totalAmount - prevTotalAmount,
          totalPaid: sale.paidAmount - prevPaidAmount,
          dueAmount: sale.dueAmount - prevDueAmount,
        },
      });
      // Recalculate customer-level dueAmount from all invoice dueAmounts
      // to keep it in sync after the return adjustment.
      const customer = await Customer.findById(sale.customer);
      if (customer) {
        await recalculateCustomerDue(customer, req.user.shop);
      }
    }

    const updatedSale = await Sale.findById(sale._id)
      .populate('customer', 'name phone')
      .populate('items.product', 'name nameBn unit')
      .populate('returns.processedBy', 'name');

    res.json({ sale: updatedSale });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getSales, getSale, createSale, updateSale, updateSalePayment, getTopSellingProducts, getTopSellingCategories, getProductSoldCounts, getRecentSales, getSalesStats, deleteSale, processReturn };
