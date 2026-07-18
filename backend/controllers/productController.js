const Product = require('../models/Product');
const Category = require('../models/Category');
const Purchase = require('../models/Purchase');
const Sale = require('../models/Sale');

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
    const { q, category } = req.query;
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

    const products = await Product.find(query)
      .populate('category', 'name nameBn')
      .limit(20);

    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getProducts, getProduct, createProduct, updateProduct, deleteProduct, adjustStock, searchProducts };