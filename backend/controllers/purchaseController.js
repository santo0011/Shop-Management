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
      .populate('items.product', 'name nameBn sku unit')
      .populate('returns.processedBy', 'name');
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

// Walk a supplier's other unpaid purchases oldest-first and apply an
// explicit, user-chosen amount against them (FIFO) — separate from whatever
// the user pays toward the current purchase itself, so the two never bleed
// into each other. Always computes the "previous due at creation" snapshot
// from the same query (so it can never disagree with what the loop acted on);
// only actually mutates those older purchases when `includePreviousDue` is
// true AND a positive amount was actually requested.
// Uses atomic $inc updates (not read-modify-save) so two purchases created for
// the same supplier back-to-back can't lose each other's write — this codebase
// has no DB transactions anywhere, so this is the cheap safety net for that.
const allocatePreviousDue = async (shopId, supplierId, previousDuePaymentAmount, includePreviousDue) => {
  const unpaidPurchases = await Purchase.find({
    shop: shopId, supplier: supplierId, dueAmount: { $gt: 0.001 },
  }).sort({ purchaseDate: 1, createdAt: 1 });

  const previousDueAmountAtCreation = Math.round(
    unpaidPurchases.reduce((sum, p) => sum + p.dueAmount, 0) * 100
  ) / 100;

  // Never allocate more than the supplier's actual outstanding due, no
  // matter what the client sends.
  let remainingPayment = includePreviousDue
    ? Math.min(Math.max(0, Number(previousDuePaymentAmount) || 0), previousDueAmountAtCreation)
    : 0;
  const previousDueAllocations = [];

  if (includePreviousDue) {
    for (const old of unpaidPurchases) {
      if (remainingPayment <= 0) break;
      const applied = Math.round(Math.min(old.dueAmount, remainingPayment) * 100) / 100;
      if (applied <= 0) continue;

      const updatedOld = await Purchase.findByIdAndUpdate(
        old._id,
        { $inc: { paidAmount: applied, dueAmount: -applied } },
        { new: true }
      );
      updatedOld.paymentStatus = updatedOld.dueAmount <= 0.001 ? 'paid' : 'partial';
      await updatedOld.save();

      previousDueAllocations.push({ purchase: old._id, purchaseNo: old.purchaseNo, amountApplied: applied });
      remainingPayment = Math.round((remainingPayment - applied) * 100) / 100;
    }
  }

  const appliedToPreviousDue = Math.round(
    previousDueAllocations.reduce((sum, a) => sum + a.amountApplied, 0) * 100
  ) / 100;

  return {
    previousDueAmountAtCreation,
    previousDueAllocations,
    previousDueIncluded: previousDueAllocations.length > 0,
    appliedToPreviousDue,
  };
};

const createPurchase = async (req, res) => {
  try {
    const { supplier, supplierInvoiceNo, purchaseDate, items, subtotal, discount, shipping, totalAmount, paidAmount, previousDuePaymentAmount, paymentMethod, notes, includePreviousDue, invoiceImage } = req.body;

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

    // The user now explicitly splits payment into two amounts: how much goes
    // toward the supplier's older unpaid invoices (FIFO, oldest first — only
    // when includePreviousDue is true) and how much goes toward this purchase
    // itself. Neither figure is inferred from the other. Both are capped
    // defensively so a direct API call can't push anything negative.
    const allocation = await allocatePreviousDue(req.user.shop, supplier, previousDuePaymentAmount || 0, !!includePreviousDue);
    const currentPurchasePaid = Math.min(Math.max(0, Number(paidAmount) || 0), calcTotalAmount);

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
      paidAmount: currentPurchasePaid,
      dueAmount: calcTotalAmount - currentPurchasePaid,
      paymentStatus: currentPurchasePaid >= calcTotalAmount ? 'paid' : currentPurchasePaid > 0 ? 'partial' : 'unpaid',
      previousDueIncluded: allocation.previousDueIncluded,
      previousDueAmountAtCreation: allocation.previousDueAmountAtCreation,
      previousDueAllocations: allocation.previousDueAllocations,
      paymentMethod: paymentMethod || 'cash',
      notes,
      invoiceImage: invoiceImage || '',
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

    // Update supplier due. Total cash actually received this transaction is
    // the sum of both explicit amounts — what went toward this purchase
    // (currentPurchasePaid) and what went toward clearing older invoices
    // (allocation.appliedToPreviousDue, already capped to real available due).
    const totalCashReceived = Math.round((currentPurchasePaid + allocation.appliedToPreviousDue) * 100) / 100;
    const dueAmount = calcTotalAmount - totalCashReceived;
    await Supplier.findByIdAndUpdate(supplier, {
      $inc: { totalPurchases: calcTotalAmount, totalPaid: totalCashReceived, dueAmount: dueAmount },
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

// Replace or clear the invoice photo on an existing purchase. Does not touch
// any amount/due/stock fields — purely an image edit.
const updatePurchaseInvoiceImage = async (req, res) => {
  try {
    const purchase = await Purchase.findOne({ _id: req.params.id, shop: req.user.shop });
    if (!purchase) return res.status(404).json({ message: 'Purchase not found' });

    purchase.invoiceImage = req.body.invoiceImage || '';
    await purchase.save();

    res.json(purchase);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Return one or more purchased line items back to the supplier. Mirrors
// Sale processReturn but inverted: stock leaves (goods physically go back),
// and it's what the shop owes the supplier that shrinks, not a customer
// refund. Each call appends one return "event" — items can be returned
// across multiple calls as long as the cumulative returnedQty per line
// never exceeds what was originally purchased.
const processPurchaseReturn = async (req, res) => {
  try {
    const purchase = await Purchase.findOne({ _id: req.params.id, shop: req.user.shop });
    if (!purchase) return res.status(404).json({ message: 'Purchase not found' });

    const { items, reason } = req.body;
    if (!items || items.length === 0) {
      return res.status(400).json({ message: 'At least one item is required for return' });
    }

    let totalReturnValue = 0;
    const returnItems = [];

    for (const ret of items) {
      const purchaseItem = purchase.items.find((i) => i.product.toString() === ret.productId);
      if (!purchaseItem) {
        return res.status(400).json({ message: `Product ${ret.productId} not found in this purchase` });
      }

      const alreadyReturned = purchaseItem.returnedQty || 0;
      const maxReturnable = purchaseItem.quantity - alreadyReturned;

      if (!ret.quantity || ret.quantity <= 0 || ret.quantity > maxReturnable) {
        return res.status(400).json({
          message: `Cannot return ${ret.quantity} of "${ret.productName || ret.productId}". Max returnable: ${maxReturnable}`,
        });
      }

      purchaseItem.returnedQty = alreadyReturned + ret.quantity;

      // Goods physically leave stock on a purchase return — opposite of a
      // sale return, where returned goods re-enter stock.
      await Product.findByIdAndUpdate(ret.productId, { $inc: { stock: -ret.quantity } });

      const unitValue = purchaseItem.purchasePrice || 0;
      const returnVal = Math.round((ret.returnValue || unitValue * ret.quantity) * 100) / 100;
      totalReturnValue += returnVal;

      returnItems.push({
        product: ret.productId,
        productName: ret.productName || '',
        quantity: ret.quantity,
        returnValue: returnVal,
        reason: ret.reason || reason || '',
      });
    }

    const prevTotalAmount = purchase.totalAmount || 0;
    const prevPaidAmount = purchase.paidAmount || 0;
    const prevDueAmount = purchase.dueAmount || 0;

    purchase.totalAmount = Math.max(0, Math.round(((purchase.totalAmount || 0) - totalReturnValue) * 100) / 100);
    purchase.paidAmount = Math.max(0, Math.round(((purchase.paidAmount || 0) - totalReturnValue) * 100) / 100);
    purchase.dueAmount = Math.max(0, Math.round((purchase.totalAmount - purchase.paidAmount) * 100) / 100);

    if (purchase.dueAmount === 0 && purchase.paidAmount > 0) {
      purchase.paymentStatus = 'paid';
    } else if (purchase.paidAmount > 0) {
      purchase.paymentStatus = 'partial';
    } else {
      purchase.paymentStatus = 'unpaid';
    }

    purchase.returns.push({
      items: returnItems,
      totalReturnValue,
      reason: reason || '',
      processedBy: req.user._id,
      returnDate: new Date(),
    });

    await purchase.save();

    await Supplier.findByIdAndUpdate(purchase.supplier, {
      $inc: {
        totalPurchases: purchase.totalAmount - prevTotalAmount,
        totalPaid: purchase.paidAmount - prevPaidAmount,
        dueAmount: purchase.dueAmount - prevDueAmount,
      },
    });

    const updatedPurchase = await Purchase.findById(purchase._id)
      .populate('supplier', 'name phone address state dueAmount')
      .populate('items.product', 'name nameBn sku unit')
      .populate('returns.processedBy', 'name');

    res.json(updatedPurchase);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getPurchases, getPurchase, createPurchase, updatePurchasePayment, updatePurchaseInvoiceImage, processPurchaseReturn };