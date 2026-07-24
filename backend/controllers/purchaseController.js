const Purchase = require('../models/Purchase');
const Product = require('../models/Product');
const Supplier = require('../models/Supplier');
const Shop = require('../models/Shop');
const { calculateItemTotals, calculateInvoiceGst } = require('../utils/gstCalculation');

const getPurchases = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const { startDate, endDate, supplier, status, search } = req.query;

    let query = { shop: req.user.shop };
    if (startDate && endDate) {
      query.purchaseDate = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }
    if (supplier) query.supplier = supplier;
    if (status) query.paymentStatus = status;
    if (search) {
      const matchingSuppliers = await Supplier.find({
        shop: req.user.shop,
        name: { $regex: search, $options: 'i' },
      }).distinct('_id');

      query.$or = [
        { purchaseNo: { $regex: search, $options: 'i' } },
        { supplierInvoiceNo: { $regex: search, $options: 'i' } },
        { supplier: { $in: matchingSuppliers } },
      ];
    }

    const purchases = await Purchase.find(query)
      .populate('supplier', 'name phone state')
      .populate('items.product', 'name nameBn')
      .sort({ purchaseDate: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Purchase.countDocuments(query);
    res.json({ purchases, page, pages: Math.ceil(total / limit), total });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getPurchase = async (req, res) => {
  try {
    const purchase = await Purchase.findOne({ _id: req.params.id, shop: req.user.shop })
      .populate('supplier', 'name phone address state dueAmount')
      .populate('items.product', 'name nameBn sku unit');
    if (!purchase) return res.status(404).json({ message: 'Purchase not found' });
    res.json(purchase);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Auto-generated, e.g. PUR-260718-0001 — never accepted from the client.
const generatePurchaseNo = async (shopId) => {
  const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  const count = await Purchase.countDocuments({ shop: shopId });
  return `PUR-${dateStr}-${String(count + 1).padStart(4, '0')}`;
};

const createPurchase = async (req, res) => {
  try {
    const { supplier, supplierInvoiceNo, purchaseDate, items, subtotal, discount, shipping, totalAmount, paidAmount, paymentMethod, notes } = req.body;

    // A supplier invoice number only needs to be unique for that supplier —
    // the same number from two different suppliers is not a conflict.
    if (supplierInvoiceNo) {
      const duplicate = await Purchase.findOne({ shop: req.user.shop, supplier, supplierInvoiceNo });
      if (duplicate) {
        return res.status(400).json({ message: `Supplier invoice "${supplierInvoiceNo}" already exists for this supplier (${duplicate.purchaseNo}).` });
      }
    }

    // Get business state from shop settings
    const shop = await Shop.findById(req.user.shop);
    const businessState = shop?.settings?.businessState || 'West Bengal';

    // Get supplier state
    const supplierData = await Supplier.findById(supplier);
    const supplierState = supplierData?.state || '';

    const purchaseNo = await generatePurchaseNo(req.user.shop);

    // Calculate GST for each line item and the invoice
    const calculatedItems = (items || []).map(item => {
      const gstRate = Number(item.gstRate) || Number(item.tax) || 0;
      const lineGst = calculateItemTotals(
        item.quantity,
        item.purchasePrice,
        item.discount || 0,
        gstRate,
        businessState,
        supplierState
      );
      return {
        product: item.product,
        batchNumber: item.batchNumber || '',
        expiryDate: item.expiryDate || undefined,
        quantity: Number(item.quantity) || 1,
        unit: item.unit || 'piece',
        purchasePrice: Number(item.purchasePrice) || 0,
        sellingPrice: Number(item.sellingPrice) || 0,
        discount: Number(item.discount) || 0,
        gstRate,
        cgst: lineGst.cgst,
        sgst: lineGst.sgst,
        igst: lineGst.igst,
        taxableAmount: lineGst.taxableAmount,
        gstAmount: lineGst.gstAmount,
        total: lineGst.total,
      };
    });

    const calculatedSubtotal = calculatedItems.reduce((sum, item) => sum + item.taxableAmount + Number(item.discount > 0 ? item.taxableAmount * item.discount / (100 - item.discount) : 0), 0);
    const calcDiscountTotal = calculatedItems.reduce((sum, item) => sum + (item.taxableAmount * item.discount / (100 - item.discount || 1)), 0);
    const calcTaxableAmount = calculatedItems.reduce((sum, item) => sum + item.taxableAmount, 0);
    const calcGstAmount = calculatedItems.reduce((sum, item) => sum + item.gstAmount, 0);
    const calcCgst = calculatedItems.reduce((sum, item) => sum + item.cgst, 0);
    const calcSgst = calculatedItems.reduce((sum, item) => sum + item.sgst, 0);
    const calcIgst = calculatedItems.reduce((sum, item) => sum + item.igst, 0);
    const calcTotalAmount = calculatedItems.reduce((sum, item) => sum + item.total, 0);

    const purchase = await Purchase.create({
      shop: req.user.shop,
      supplier,
      purchaseNo,
      supplierInvoiceNo: supplierInvoiceNo || '',
      purchaseDate: purchaseDate || Date.now(),
      items: calculatedItems,
      subtotal: calculatedSubtotal,
      discount: calcDiscountTotal,
      gstRate: (items[0]?.gstRate || items[0]?.tax || 0),
      cgst: calcCgst,
      sgst: calcSgst,
      igst: calcIgst,
      taxableAmount: calcTaxableAmount,
      gstAmount: calcGstAmount,
      shipping: shipping || 0,
      totalAmount: calcTotalAmount,
      paidAmount: paidAmount || 0,
      dueAmount: calcTotalAmount - (paidAmount || 0),
      paymentStatus: paidAmount >= calcTotalAmount ? 'paid' : paidAmount > 0 ? 'partial' : 'unpaid',
      paymentMethod: paymentMethod || 'cash',
      notes,
      createdBy: req.user._id,
    });

    // Sync each product's stock and latest pricing/batch info
    for (const item of calculatedItems) {
      const productUpdate = {
        $inc: { stock: item.quantity },
        purchasePrice: item.purchasePrice,
        sellingPrice: item.sellingPrice,
      };
      if (item.batchNumber) productUpdate.batchNumber = item.batchNumber;
      if (item.expiryDate) productUpdate.expiryDate = item.expiryDate;
      await Product.findByIdAndUpdate(item.product, productUpdate);
    }

    // Update supplier due
    const dueAmount = calcTotalAmount - (paidAmount || 0);
    await Supplier.findByIdAndUpdate(supplier, {
      $inc: { totalPurchases: calcTotalAmount, totalPaid: paidAmount || 0, dueAmount: dueAmount },
    });

    res.status(201).json(purchase);
  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {}).join(',');
      if (field.includes('supplierInvoiceNo')) {
        return res.status(400).json({ message: 'This supplier invoice number is already used for this supplier.' });
      }
      return res.status(400).json({ message: 'Failed to generate a unique purchase number, please try again.' });
    }
    res.status(500).json({ message: error.message });
  }
};

const updatePurchasePayment = async (req, res) => {
  try {
    const purchase = await Purchase.findOne({ _id: req.params.id, shop: req.user.shop });
    if (!purchase) return res.status(404).json({ message: 'Purchase not found' });

    const { paidAmount, paymentMethod } = req.body;
    const additionalPaid = paidAmount - purchase.paidAmount;

    purchase.paidAmount = paidAmount;
    purchase.dueAmount = purchase.totalAmount - paidAmount;
    purchase.paymentStatus = paidAmount >= purchase.totalAmount ? 'paid' : paidAmount > 0 ? 'partial' : 'unpaid';
    if (paymentMethod) purchase.paymentMethod = paymentMethod;

    await purchase.save();

    await Supplier.findByIdAndUpdate(purchase.supplier, {
      $inc: { totalPaid: additionalPaid, dueAmount: -additionalPaid },
    });

    res.json(purchase);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getPurchases, getPurchase, createPurchase, updatePurchasePayment };