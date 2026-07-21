const Customer = require('../models/Customer');
const Sale = require('../models/Sale');
const CustomerPayment = require('../models/CustomerPayment');

const getCustomers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';

    let query = { shop: req.user.shop };
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { nameBn: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    const customers = await Customer.find(query).sort({ name: 1 }).skip(skip).limit(limit);
    const total = await Customer.countDocuments(query);

    res.json({ customers, page, pages: Math.ceil(total / limit), total });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getCustomer = async (req, res) => {
  try {
    const customer = await Customer.findOne({ _id: req.params.id, shop: req.user.shop })
      .populate('editHistory.updatedBy', 'name email');
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    res.json(customer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createCustomer = async (req, res) => {
  try {
    req.body.shop = req.user.shop;
    const customer = await Customer.create(req.body);
    res.status(201).json(customer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateCustomer = async (req, res) => {
  try {
    const customer = await Customer.findOne({ _id: req.params.id, shop: req.user.shop });
    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    const { name, phone } = req.body;

    if (name || phone) {
      const duplicateQuery = {
        shop: req.user.shop,
        _id: { $ne: customer._id },
      };
      if (name && phone) {
        duplicateQuery.name = name;
        duplicateQuery.phone = phone;
      } else if (name) {
        duplicateQuery.name = name;
        duplicateQuery.phone = customer.phone;
      } else if (phone) {
        duplicateQuery.name = customer.name;
        duplicateQuery.phone = phone;
      }
      const duplicate = await Customer.findOne(duplicateQuery);
      if (duplicate) {
        return res.status(400).json({ message: 'A customer with the same name and phone number already exists.' });
      }
    }

    const historyEntry = {};
    let hasChanges = false;

    if (name !== undefined && name !== customer.name) {
      historyEntry.previousName = customer.name;
      historyEntry.newName = name;
      hasChanges = true;
    }
    if (phone !== undefined && phone !== customer.phone) {
      historyEntry.previousPhone = customer.phone;
      historyEntry.newPhone = phone;
      hasChanges = true;
    }

    if (hasChanges) {
      historyEntry.updatedBy = req.user._id;
      historyEntry.updatedAt = new Date();
      customer.editHistory.push(historyEntry);
    }

    Object.keys(req.body).forEach((key) => {
      customer[key] = req.body[key];
    });

    await customer.save();
    res.json(customer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteCustomer = async (req, res) => {
  try {
    const customer = await Customer.findOne({ _id: req.params.id, shop: req.user.shop });
    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    const salesCount = await Sale.countDocuments({ customer: customer._id, shop: req.user.shop });
    if (salesCount > 0) {
      return res.status(400).json({ message: 'This customer cannot be deleted because they have existing sales history.' });
    }

    await Customer.deleteOne({ _id: customer._id });
    res.json({ message: 'Customer deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const addLoyaltyPoints = async (req, res) => {
  try {
    const { points } = req.body;
    const customer = await Customer.findOne({ _id: req.params.id, shop: req.user.shop });
    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    customer.loyaltyPoints += points;
    customer.totalLoyaltyEarned += points;
    await customer.save();
    res.json(customer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const redeemLoyaltyPoints = async (req, res) => {
  try {
    const { points } = req.body;
    const customer = await Customer.findOne({ _id: req.params.id, shop: req.user.shop });
    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    if (customer.loyaltyPoints < points) {
      return res.status(400).json({ message: 'Insufficient loyalty points' });
    }

    customer.loyaltyPoints -= points;
    customer.totalLoyaltyRedeemed += points;
    await customer.save();
    res.json(customer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── New Endpoints ─────────────────────────────────────────────

const getCustomerStats = async (req, res) => {
  try {
    const shopId = req.user.shop;
    const totalCustomers = await Customer.countDocuments({ shop: shopId });
    const activeCustomers = await Customer.countDocuments({ shop: shopId, isActive: true });
    const result = await Customer.aggregate([
      { $match: { shop: shopId } },
      { $group: { _id: null, totalDue: { $sum: '$dueAmount' } } },
    ]);
    const totalCustomerDue = result.length > 0 ? result[0].totalDue : 0;
    res.json({ totalCustomers, activeCustomers, totalCustomerDue });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getDueCustomers = async (req, res) => {
  try {
    const shopId = req.user.shop;
    const dueCustomers = await Customer.find({ shop: shopId, dueAmount: { $gt: 0 } })
      .sort({ dueAmount: -1 });

    const totalDueCustomers = dueCustomers.length;
    const totalDueAmount = dueCustomers.reduce((sum, c) => sum + c.dueAmount, 0);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayPayments = await CustomerPayment.aggregate([
      { $match: { shop: shopId, createdAt: { $gte: todayStart } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const dueCollectedToday = todayPayments.length > 0 ? todayPayments[0].total : 0;

    res.json({ dueCustomers, totalDueCustomers, totalDueAmount, dueCollectedToday });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getTopCustomers = async (req, res) => {
  try {
    const shopId = req.user.shop;
    const topCustomers = await Customer.find({ shop: shopId })
      .sort({ totalPurchases: -1 })
      .limit(10);

    const topCustomerRevenue = topCustomers.length > 0 ? topCustomers[0].totalPurchases : 0;
    const totalPurchasesTop10 = topCustomers.reduce((sum, c) => sum + c.totalPurchases, 0);
    const averagePurchaseValue = topCustomers.length > 0
      ? Math.round(totalPurchasesTop10 / topCustomers.length)
      : 0;

    const customerIds = topCustomers.map(c => c._id);
    const orderCounts = await Sale.aggregate([
      { $match: { shop: shopId, customer: { $in: customerIds } } },
      { $group: { _id: '$customer', count: { $sum: 1 } } },
    ]);
    const orderMap = {};
    orderCounts.forEach(o => { orderMap[o._id.toString()] = o.count; });

    const customersWithOrders = topCustomers.map(c => ({
      ...c.toObject(),
      totalOrders: orderMap[c._id.toString()] || 0,
    }));

    res.json({
      topCustomers: customersWithOrders,
      topCustomerRevenue,
      totalPurchasesTop10,
      averagePurchaseValue,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const receivePayment = async (req, res) => {
  try {
    const { amount, paymentMethod, notes } = req.body;
    const customer = await Customer.findOne({ _id: req.params.id, shop: req.user.shop });
    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid payment amount' });
    }
    if (amount > customer.dueAmount) {
      return res.status(400).json({ message: 'Payment amount exceeds due amount' });
    }

    const payment = await CustomerPayment.create({
      customer: customer._id,
      shop: req.user.shop,
      amount,
      paymentMethod: paymentMethod || 'cash',
      notes: notes || '',
      collectedBy: req.user._id,
      source: 'due_collection',
    });

    customer.dueAmount -= amount;
    customer.totalPaid += amount;
    await customer.save();

    res.json({ payment, customer });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getCustomerPurchases = async (req, res) => {
  try {
    const sales = await Sale.find({ customer: req.params.id, shop: req.user.shop })
      .populate('items.product', 'name')
      .sort({ saleDate: -1 })
      .limit(50);

    const purchases = [];
    sales.forEach(sale => {
      sale.items.forEach(item => {
        purchases.push({
          invoiceNo: sale.invoiceNo,
          saleDate: sale.saleDate,
          productName: item.product?.name || 'Unknown',
          quantity: item.quantity,
          unitPrice: item.price,
          discount: item.discount || 0,
          total: item.total,
        });
      });
    });

    res.json(purchases);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── Shared ledger-entry builder ──────────────────────────────────
// Merges sales (debit), returns (credit) and payments (credit) into one
// chronological timeline with a running balance. Used by both getCustomerLedger
// (full statement) and getCustomerPayments (payment history + remaining due)
// so the two views can never disagree about the customer's running balance.
const buildLedgerEntries = async (customerId, shopId, dateFilter = {}) => {
  const hasDateFilter = Object.keys(dateFilter).length > 0;

  const saleQuery = { customer: customerId, shop: shopId };
  if (hasDateFilter) saleQuery.saleDate = dateFilter;
  const sales = await Sale.find(saleQuery)
    .populate('items.product', 'name')
    .sort({ createdAt: 1 });

  const paymentQuery = { customer: customerId, shop: shopId };
  if (hasDateFilter) paymentQuery.createdAt = dateFilter;
  const payments = await CustomerPayment.find(paymentQuery)
    .populate('collectedBy', 'name email')
    .populate('sale', 'invoiceNo totalAmount')
    .sort({ createdAt: 1 });

  // Sales created after this fix have their checkout payment recorded as a
  // real CustomerPayment (linked via `sale`) — for those we must NOT also
  // credit paidAmount on the sale entry itself, or the amount gets counted
  // twice. Older sales (created before checkout payments were tracked) have
  // no linked payment, so they still credit paidAmount directly as before.
  const salesWithLinkedPayment = new Set(
    payments.filter((p) => p.sale).map((p) => p.sale._id.toString())
  );

  const entries = [];

  sales.forEach((sale) => {
    const hasLinkedPayment = salesWithLinkedPayment.has(sale._id.toString());
    entries.push({
      date: sale.createdAt,
      type: 'sale',
      invoiceNo: sale.invoiceNo,
      description: `Sale - ${sale.items.length} item(s)`,
      debit: sale.totalAmount,
      credit: hasLinkedPayment ? 0 : (sale.paidAmount || 0),
      note: sale.notes || '',
    });

    if (sale.returns && sale.returns.length > 0) {
      sale.returns.forEach((ret) => {
        entries.push({
          date: ret.returnDate || sale.createdAt,
          type: 'return',
          invoiceNo: sale.invoiceNo,
          description: `Return - ${ret.items?.length || 0} item(s)`,
          debit: 0,
          credit: ret.totalRefund || 0,
          note: ret.reason || '',
        });
      });
    }
  });

  payments.forEach((p) => {
    entries.push({
      date: p.createdAt,
      type: 'payment',
      invoiceNo: p.sale?.invoiceNo || '',
      saleId: p.sale?._id || null,
      invoiceTotal: p.sale?.totalAmount ?? null,
      description: `Payment (${p.paymentMethod})`,
      debit: 0,
      credit: p.amount,
      note: p.notes || '',
      paymentMethod: p.paymentMethod,
      collectedBy: p.collectedBy ? (p.collectedBy.name || p.collectedBy.email || '') : '',
      source: p.source || 'due_collection',
    });
  });

  entries.sort((a, b) => new Date(a.date) - new Date(b.date));

  let runningBalance = 0;
  return entries.map((entry) => {
    runningBalance += entry.debit - entry.credit;
    return { ...entry, balance: runningBalance };
  });
};

const getCustomerPayments = async (req, res) => {
  try {
    const customerId = req.params.id;
    const shopId = req.user.shop;

    const customer = await Customer.findOne({ _id: customerId, shop: shopId });
    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    // The running "remaining due" figure requires the customer's full
    // transaction history, not just the last N payments — so we build the
    // complete timeline first and only trim the payment list afterward.
    const entries = await buildLedgerEntries(customerId, shopId);

    const paymentHistory = entries
      .filter((e) => e.type === 'payment')
      .reverse() // newest first
      .slice(0, 100)
      .map((e) => ({
        date: e.date,
        invoiceNo: e.invoiceNo || null,
        saleId: e.saleId || null,
        invoiceTotal: e.invoiceTotal ?? null,
        paymentMethod: e.paymentMethod,
        amount: e.credit,
        remainingDue: e.balance,
        collectedBy: e.collectedBy || '',
        source: e.source,
        notes: e.note || '',
      }));

    res.json(paymentHistory);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── Customer Due Summary (used by POS "Previous Due" card) ──────
// Read-only — does not touch the sale/payment/ledger creation logic at all.

const getCustomerDueSummary = async (req, res) => {
  try {
    const customer = await Customer.findOne({ _id: req.params.id, shop: req.user.shop });
    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    // Fetched once and reused for both the unpaid-invoice list and the
    // recent-purchases list — read-only, no effect on any sale/payment logic.
    const allSales = await Sale.find({ customer: req.params.id, shop: req.user.shop })
      .sort({ createdAt: -1 })
      .select('invoiceNo createdAt saleDate totalAmount paidAmount dueAmount paymentStatus');

    const unpaidSales = allSales
      .filter((s) => s.dueAmount > 0)
      .slice()
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    res.json({
      dueAmount: customer.dueAmount || 0,
      unpaidInvoiceCount: unpaidSales.length,
      oldestDueDate: unpaidSales.length > 0 ? unpaidSales[0].createdAt : null,
      unpaidInvoices: unpaidSales,
      recentPurchases: allSales.slice(0, 10),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── Customer Ledger ─────────────────────────────────────────────

const getCustomerLedger = async (req, res) => {
  try {
    const customerId = req.params.id;
    const shopId = req.user.shop;
    const { startDate, endDate } = req.query;

    const customer = await Customer.findOne({ _id: customerId, shop: shopId });
    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    // Build date filter
    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      dateFilter.$lte = end;
    }

    const ledgerEntries = await buildLedgerEntries(customerId, shopId, dateFilter);

    // Summary
    const totalPurchase = customer.totalPurchases || 0;
    const totalPaid = customer.totalPaid || 0;
    const currentDue = customer.dueAmount || 0;

    res.json({
      customer: { name: customer.name, phone: customer.phone, _id: customer._id },
      summary: { totalPurchase, totalPaid, currentDue },
      entries: ledgerEntries,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getCustomers, getCustomer, createCustomer, updateCustomer, deleteCustomer,
  addLoyaltyPoints, redeemLoyaltyPoints,
  getCustomerStats, getDueCustomers, getTopCustomers,
  receivePayment, getCustomerPurchases, getCustomerPayments,
  getCustomerLedger, getCustomerDueSummary,
};