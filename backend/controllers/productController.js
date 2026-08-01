const Product = require('../models/Product');
const Category = require('../models/Category');
const Purchase = require('../models/Purchase');
const Sale = require('../models/Sale');
const Shop = require('../models/Shop');
const { GLOBAL_UNIT_KEYS } = require('../config/businessTypes');

// A product's unit must be one of the global catalog units or one of the
// shop's own custom units — replaces the old fixed Mongoose enum so shops
// can add units (e.g. "Sq. Feet") without a schema migration.
const isAllowedUnit = async (shopId, unit) => {
  if (!unit) return true;
  if (GLOBAL_UNIT_KEYS.includes(unit)) return true;
  const shop = await Shop.findById(shopId).select('settings.customUnits');
  const customKeys = (shop?.settings?.customUnits || []).map((u) => u.key);
  return customKeys.includes(unit);
};

const getProducts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;
    const { search, category, lowStock, barcode } = req.query;

    let query = { shop: req.user.shop };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { nameBn: { $regex: search, $options: 'i' } },
        { barcode: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
      ];
    }

    if (category) query.category = category;
    if (barcode) query.barcode = barcode;

    if (lowStock === 'true') {
      query.$expr = { $lte: ['$stock', '$minStock'] };
    }

    const products = await Product.find(query)
      .populate('category', 'name nameBn')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Product.countDocuments(query);

    res.json({
      products,
      page,
      pages: Math.ceil(total / limit),
      total,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getProduct = async (req, res) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, shop: req.user.shop })
      .populate('category', 'name nameBn');
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createProduct = async (req, res) => {
  try {
    req.body.shop = req.user.shop;

    if (req.body.unit && !(await isAllowedUnit(req.user.shop, req.body.unit))) {
      return res.status(400).json({ message: 'Invalid unit selected for this shop.' });
    }

    // Check for duplicate name within shop
    const existingName = await Product.findOne({ name: req.body.name, shop: req.user.shop });
    if (existingName) {
      return res.status(400).json({ message: 'A product with this name already exists in your shop.' });
    }

    // Check for duplicate barcode within shop
    if (req.body.barcode) {
      const existingBarcode = await Product.findOne({ barcode: req.body.barcode, shop: req.user.shop });
      if (existingBarcode) {
        return res.status(400).json({ message: 'A product with this barcode already exists in your shop.' });
      }
    }

    const product = await Product.create(req.body);
    res.status(201).json(product);
  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      if (field === 'barcode') {
        return res.status(400).json({ message: 'A product with this barcode already exists in your shop.' });
      }
      return res.status(400).json({ message: 'A product with this name already exists in your shop.' });
    }
    res.status(500).json({ message: error.message });
  }
};

const updateProduct = async (req, res) => {
  try {
    if (req.body.unit && !(await isAllowedUnit(req.user.shop, req.body.unit))) {
      return res.status(400).json({ message: 'Invalid unit selected for this shop.' });
    }

    // Check for duplicate name (excluding current record)
    if (req.body.name) {
      const existingName = await Product.findOne({
        name: req.body.name,
        shop: req.user.shop,
        _id: { $ne: req.params.id },
      });
      if (existingName) {
        return res.status(400).json({ message: 'Another product with this name already exists in your shop.' });
      }
    }

    // Check for duplicate barcode (excluding current record)
    if (req.body.barcode) {
      const existingBarcode = await Product.findOne({
        barcode: req.body.barcode,
        shop: req.user.shop,
        _id: { $ne: req.params.id },
      });
      if (existingBarcode) {
        return res.status(400).json({ message: 'Another product with this barcode already exists in your shop.' });
      }
    }

    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, shop: req.user.shop },
      req.body,
      { new: true, runValidators: true }
    );
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      if (field === 'barcode') {
        return res.status(400).json({ message: 'Another product with this barcode already exists in your shop.' });
      }
      return res.status(400).json({ message: 'Another product with this name already exists in your shop.' });
    }
    res.status(500).json({ message: error.message });
  }
};

const deleteProduct = async (req, res) => {
  try {
    // Check if product exists in purchases
    const purchaseCount = await Purchase.countDocuments({ 'items.product': req.params.id, shop: req.user.shop });
    if (purchaseCount > 0) {
      return res.status(400).json({
        message: 'This product cannot be deleted because it exists in purchase transactions.',
        usedBy: { purchases: purchaseCount },
      });
    }

    // Check if product exists in sales
    const saleCount = await Sale.countDocuments({ 'items.product': req.params.id, shop: req.user.shop });
    if (saleCount > 0) {
      return res.status(400).json({
        message: 'This product cannot be deleted because it exists in sale transactions.',
        usedBy: { sales: saleCount },
      });
    }

    const product = await Product.findOneAndDelete({ _id: req.params.id, shop: req.user.shop });
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete multiple products at once. Products referenced by any
//          purchase or sale are skipped (never partially/force-deleted) —
//          the remaining, unused ones are still deleted in the same request.
// @route   POST /api/products/bulk-delete
const bulkDeleteProducts = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'No products selected.' });
    }

    // Only ever touch products that actually belong to this shop.
    const products = await Product.find({ _id: { $in: ids }, shop: req.user.shop }).select('_id name');
    const productIds = products.map((p) => p._id);

    const [usedInPurchases, usedInSales] = await Promise.all([
      Purchase.distinct('items.product', { 'items.product': { $in: productIds }, shop: req.user.shop }),
      Sale.distinct('items.product', { 'items.product': { $in: productIds }, shop: req.user.shop }),
    ]);
    const usedSet = new Set([...usedInPurchases, ...usedInSales].map((id) => id.toString()));

    const deletableIds = products.filter((p) => !usedSet.has(p._id.toString())).map((p) => p._id);
    const blockedNames = products.filter((p) => usedSet.has(p._id.toString())).map((p) => p.name);

    let deletedCount = 0;
    if (deletableIds.length > 0) {
      const result = await Product.deleteMany({ _id: { $in: deletableIds }, shop: req.user.shop });
      deletedCount = result.deletedCount;
    }

    res.json({ deletedCount, blockedCount: blockedNames.length, blockedNames });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const adjustStock = async (req, res) => {
  try {
    const { quantity, type, reason } = req.body;
    const product = await Product.findOne({ _id: req.params.id, shop: req.user.shop });
    if (!product) return res.status(404).json({ message: 'Product not found' });

    if (type === 'add') {
      product.stock += quantity;
    } else if (type === 'subtract') {
      if (product.stock < quantity) {
        return res.status(400).json({ message: 'Insufficient stock' });
      }
      product.stock -= quantity;
    }

    await product.save();
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const searchProducts = async (req, res) => {
  try {
    const { q, category, page: pageParam, limit: limitParam, excludeIds } = req.query;
    let query = { shop: req.user.shop, isActive: true };

    if (q) {
      query.$or = [
        { name: { $regex: q, $options: 'i' } },
        { nameBn: { $regex: q, $options: 'i' } },
        { barcode: { $regex: q, $options: 'i' } },
        { sku: { $regex: q, $options: 'i' } },
      ];
    }
    if (category) query.category = category;
    if (excludeIds) {
      const ids = excludeIds.split(',').map((id) => id.trim()).filter(Boolean);
      if (ids.length > 0) query._id = { $nin: ids };
    }

    // Paginated mode — opt-in via ?page=/&limit=, used by the POS category
    // browser's infinite scroll (10 at a time). Existing callers (global
    // quick search, category preload) that pass neither keep getting the
    // bare-array response they already rely on.
    if (pageParam || limitParam) {
      const page = parseInt(pageParam) || 1;
      const limit = parseInt(limitParam) || 20;
      const skip = (page - 1) * limit;

      const [products, total] = await Promise.all([
        Product.find(query).populate('category', 'name nameBn').sort({ name: 1 }).skip(skip).limit(limit),
        Product.countDocuments(query),
      ]);

      return res.json({ products, page, hasMore: skip + products.length < total, total });
    }

    const products = await Product.find(query)
      .populate('category', 'name nameBn')
      .limit(q ? 100 : 20);

    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getProducts, getProduct, createProduct, updateProduct, deleteProduct, bulkDeleteProducts, adjustStock, searchProducts };