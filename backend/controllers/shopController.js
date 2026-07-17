const Shop = require('../models/Shop');
const User = require('../models/User');
const Product = require('../models/Product');
const Category = require('../models/Category');
const Supplier = require('../models/Supplier');
const Customer = require('../models/Customer');

// @desc    Get all shops (Super Admin)
// @route   GET /api/shops
const getShops = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';

    // Shops owned by a super_admin (e.g. internal/demo records) are never
    // real shop-owner accounts and must not appear in the Shop List.
    const superAdminIds = await User.find({ role: 'super_admin' }).distinct('_id');

    const query = { owner: { $nin: superAdminIds } };
    if (search) query.name = { $regex: search, $options: 'i' };

    const shops = await Shop.find(query)
      .populate('owner', 'name email phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Shop.countDocuments(query);

    res.json({
      shops,
      page,
      pages: Math.ceil(total / limit),
      total,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single shop
// @route   GET /api/shops/:id
const getShop = async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.id).populate('owner', 'name email phone');
    if (!shop) {
      return res.status(404).json({ message: 'Shop not found' });
    }
    res.json(shop);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a new shop with owner account (Super Admin)
// @route   POST /api/shops
const createShop = async (req, res) => {
  try {
    const { name, ownerName, email, phone, password, address } = req.body;

    if (!name || !ownerName || !email || !phone || !password) {
      return res.status(400).json({ message: 'Please provide all required fields: name, ownerName, email, phone, password' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'A user with this email already exists' });
    }

    // Create the owner user first (without shop reference)
    const owner = await User.create({
      name: ownerName,
      email,
      phone,
      password,
      role: 'admin',
      language: 'bn',
      theme: 'light',
    });

    // Create the shop with the owner reference
    const shop = await Shop.create({
      name,
      phone,
      email,
      address: address || '',
      owner: owner._id,
      subscriptionStatus: 'trial',
    });

    // Update user with shop reference
    owner.shop = shop._id;
    await owner.save();

    res.status(201).json({
      shop,
      owner: {
        _id: owner._id,
        name: owner.name,
        email: owner.email,
        phone: owner.phone,
        role: owner.role,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'A shop or user with this email already exists' });
    }
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update shop
// @route   PUT /api/shops/:id
const updateShop = async (req, res) => {
  try {
    let shop = await Shop.findById(req.params.id);
    if (!shop) {
      return res.status(404).json({ message: 'Shop not found' });
    }

    // Check authorization
    if (req.user.role !== 'super_admin' && req.user.shop.toString() !== req.params.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const { name, email, phone, address, logo, currency, timezone, settings } = req.body;

    if (name) shop.name = name;
    if (email) shop.email = email;
    if (phone) shop.phone = phone;
    if (logo) shop.logo = logo;
    if (currency) shop.currency = currency;
    if (timezone) shop.timezone = timezone;
    if (address) shop.address = { ...shop.address, ...address };
    if (settings) shop.settings = { ...shop.settings, ...settings };

    shop = await shop.save();
    res.json(shop);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Toggle shop active status (Super Admin)
// @route   PUT /api/shops/:id/toggle-status
const toggleShopStatus = async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.id);
    if (!shop) {
      return res.status(404).json({ message: 'Shop not found' });
    }

    shop.isActive = !shop.isActive;
    await shop.save();

    // Also deactivate/activate all users of that shop
    if (!shop.isActive) {
      await User.updateMany({ shop: shop._id }, { isActive: false });
    } else {
      await User.updateMany({ shop: shop._id }, { isActive: true });
    }

    res.json(shop);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get my shop
// @route   GET /api/shops/my
const getMyShop = async (req, res) => {
  try {
    const shop = await Shop.findById(req.user.shop)
      .populate('owner', 'name email phone');
    if (!shop) {
      return res.status(404).json({ message: 'Shop not found' });
    }
    res.json(shop);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get shop statistics (Super Admin)
// @route   GET /api/shops/stats
const getShopStats = async (req, res) => {
  try {
    const superAdminIds = await User.find({ role: 'super_admin' }).distinct('_id');
    const notSuperAdmin = { owner: { $nin: superAdminIds } };

    const totalShops = await Shop.countDocuments(notSuperAdmin);
    const activeShops = await Shop.countDocuments({ ...notSuperAdmin, isActive: true });
    const inactiveShops = await Shop.countDocuments({ ...notSuperAdmin, isActive: false });
    const activeSubscriptions = await Shop.countDocuments({ ...notSuperAdmin, subscriptionStatus: 'active' });
    const expiredSubscriptions = await Shop.countDocuments({ ...notSuperAdmin, subscriptionStatus: 'expired' });
    const trialShops = await Shop.countDocuments({ ...notSuperAdmin, subscriptionStatus: 'trial' });

    res.json({
      totalShops,
      activeShops,
      inactiveShops,
      activeSubscriptions,
      expiredSubscriptions,
      trialShops,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update my shop settings (tax, footer, etc.)
// @route   PUT /api/shops/settings
const updateMyShopSettings = async (req, res) => {
  try {
    const shop = await Shop.findById(req.user.shop);
    if (!shop) {
      return res.status(404).json({ message: 'Shop not found' });
    }

    const { taxRate, taxName, receiptFooter, invoicePrefix, barcodePrefix, barcodeSymbology, autoGenerateBarcode } = req.body;

    if (taxRate !== undefined) shop.settings.taxRate = Math.max(0, Math.min(100, Number(taxRate)));
    if (taxName !== undefined) shop.settings.taxName = taxName;
    if (receiptFooter !== undefined) shop.settings.receiptFooter = receiptFooter;
    if (invoicePrefix !== undefined) shop.settings.invoicePrefix = invoicePrefix;
    if (barcodePrefix !== undefined) shop.settings.barcodePrefix = barcodePrefix;
    if (barcodeSymbology !== undefined) shop.settings.barcodeSymbology = barcodeSymbology;
    if (autoGenerateBarcode !== undefined) shop.settings.autoGenerateBarcode = !!autoGenerateBarcode;

    await shop.save();
    res.json(shop);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Export a backup of the shop's core data (shop info + catalog)
// @route   GET /api/shops/backup
const getShopBackup = async (req, res) => {
  try {
    const shopId = req.user.shop;

    const [shop, products, categories, suppliers, customers] = await Promise.all([
      Shop.findById(shopId).lean(),
      Product.find({ shop: shopId }).lean(),
      Category.find({ shop: shopId }).lean(),
      Supplier.find({ shop: shopId }).lean(),
      Customer.find({ shop: shopId }).lean(),
    ]);

    if (!shop) {
      return res.status(404).json({ message: 'Shop not found' });
    }

    res.json({
      backupVersion: 1,
      exportedAt: new Date().toISOString(),
      shop,
      products,
      categories,
      suppliers,
      customers,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Restore catalog data (products/categories/suppliers/customers) from a backup file
// @route   POST /api/shops/restore
const restoreShopBackup = async (req, res) => {
  try {
    const shopId = req.user.shop;
    const { products = [], categories = [], suppliers = [], customers = [] } = req.body || {};

    const restoreCollection = async (Model, docs) => {
      let restored = 0;
      let failed = 0;
      for (const doc of Array.isArray(docs) ? docs : []) {
        try {
          const { _id, ...rest } = doc;
          // Always force ownership to the requesting shop — never trust the
          // shop field from an uploaded file, so a backup can't be replayed
          // into a different shop's data.
          const payload = { ...rest, shop: shopId };
          if (_id) {
            await Model.findOneAndUpdate(
              { _id, shop: shopId },
              payload,
              { upsert: true, setDefaultsOnInsert: true, runValidators: true }
            );
          } else {
            await Model.create(payload);
          }
          restored++;
        } catch (err) {
          failed++;
        }
      }
      return { restored, failed };
    };

    const [productsResult, categoriesResult, suppliersResult, customersResult] = await Promise.all([
      restoreCollection(Product, products),
      restoreCollection(Category, categories),
      restoreCollection(Supplier, suppliers),
      restoreCollection(Customer, customers),
    ]);

    res.json({
      message: 'Restore completed',
      products: productsResult,
      categories: categoriesResult,
      suppliers: suppliersResult,
      customers: customersResult,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getShops,
  getShop,
  createShop,
  updateShop,
  toggleShopStatus,
  getMyShop,
  getShopStats,
  updateMyShopSettings,
  getShopBackup,
  restoreShopBackup,
};
