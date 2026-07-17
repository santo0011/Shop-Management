const Sale = require('../models/Sale');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const Shop = require('../models/Shop');

const getSales = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const { startDate, endDate, customer, status, paymentMethod } = req.query;

    let query = { shop: req.user.shop };
    if (startDate && endDate) {
      query.saleDate = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }
    if (customer) query.customer = customer;
    if (status) query.paymentStatus = status;
    if (paymentMethod) query.paymentMethod = paymentMethod;

    const sales = await Sale.find(query)
      .populate('customer', 'name phone')
      .populate('items.product', 'name nameBn')
      .sort({ saleDate: -1 })
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
      .populate('customer', 'name phone address')
      .populate('items.product', 'name nameBn sku price')
      .populate('createdBy', 'name');
    if (!sale) return res.status(404).json({ message: 'Sale not found' });
    res.json(sale);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createSale = async (req, res) => {
  try {
    const { customer, items, subtotal, discount, tax, paidAmount, paymentMethod, notes, posType } = req.body;

    const count = await Sale.countDocuments({ shop: req.user.shop });
    const invoiceNo = `INV-${String(count + 1).padStart(6, '0')}`;

    // Validate stock
    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) return res.status(404).json({ message: `Product ${item.product} not found` });
      if (product.trackStock && product.stock < item.quantity) {
        return res.status(400).json({ message: `Insufficient stock for ${product.name}. Available: ${product.stock}` });
      }
    }

    const totalAmount = subtotal - (discount || 0) + (tax || 0);
    const dueAmount = totalAmount - (paidAmount || 0);

    const sale = await Sale.create({
      shop: req.user.shop,
      customer: customer || null,
      invoiceNo,
      items,
      subtotal,
      discount: discount || 0,
      tax: tax || 0,
      totalAmount,
      paidAmount: paidAmount || totalAmount,
      dueAmount: dueAmount > 0 ? dueAmount : 0,
      paymentStatus: paidAmount >= totalAmount ? 'paid' : paidAmount > 0 ? 'partial' : 'unpaid',
      paymentMethod: paymentMethod || 'cash',
      posType: posType || 'regular',
      notes,
      createdBy: req.user._id,
    });

    // Decrease product stock
    for (const item of items) {
      await Product.findByIdAndUpdate(item.product, { $inc: { stock: -item.quantity } });
    }

    // Update customer
    if (customer) {
      const cust = await Customer.findById(customer);
      if (cust) {
        cust.totalPurchases += totalAmount;
        cust.totalPaid += paidAmount || totalAmount;
        cust.dueAmount += dueAmount > 0 ? dueAmount : 0;

        // Add loyalty points if enabled
        const shop = await Shop.findById(req.user.shop);
        if (shop.settings.enableLoyalty) {
          const points = Math.floor(totalAmount / shop.settings.loyaltyPointsPerAmount);
          cust.loyaltyPoints += points;
          cust.totalLoyaltyEarned += points;
          sale.loyaltyPointsEarned = points;
        }

        await cust.save();
      }
    }

    res.status(201).json(sale);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateSalePayment = async (req, res) => {
  try {
    const sale = await Sale.findOne({ _id: req.params.id, shop: req.user.shop });
    if (!sale) return res.status(404).json({ message: 'Sale not found' });

    const { paidAmount, paymentMethod } = req.body;
    const additionalPaid = paidAmount - sale.paidAmount;

    sale.paidAmount = paidAmount;
    sale.dueAmount = sale.totalAmount - paidAmount;
    sale.paymentStatus = paidAmount >= sale.totalAmount ? 'paid' : paidAmount > 0 ? 'partial' : 'unpaid';
    if (paymentMethod) sale.paymentMethod = paymentMethod;
    await sale.save();

    if (sale.customer) {
      await Customer.findByIdAndUpdate(sale.customer, {
        $inc: { totalPaid: additionalPaid, dueAmount: -additionalPaid },
      });
    }

    res.json(sale);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getSales, getSale, createSale, updateSalePayment };