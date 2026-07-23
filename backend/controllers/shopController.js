const Shop = require('../models/Shop');
const User = require('../models/User');
const Product = require('../models/Product');
const Category = require('../models/Category');
const Supplier = require('../models/Supplier');
const Customer = require('../models/Customer');
const Sale = require('../models/Sale');
const Purchase = require('../models/Purchase');
const ActivityLog = require('../models/ActivityLog');
const { BUSINESS_TYPE_KEYS, getBusinessTypeDefaults } = require('../config/businessTypes');

// Best-effort, additive-only: creates any default category for `businessType`
// that doesn't already exist (by name) for this shop. Never updates or
// deletes existing categories, so it's always safe to call again later
// (e.g. from a "restore defaults" action after the shop switches type).
const seedDefaultCategories = async (shopId, businessType) => {
  const { defaultCategories } = getBusinessTypeDefaults(businessType);
  if (!defaultCategories || defaultCategories.length === 0) return { created: 0 };

  const existingNames = await Category.find({ shop: shopId }).distinct('name');
  const existingSet = new Set(existingNames.map((n) => n.toLowerCase()));
  const toCreate = defaultCategories.filter((c) => !existingSet.has(c.name.toLowerCase()));

  if (toCreate.length === 0) return { created: 0 };

  await Category.insertMany(
    toCreate.map((c) => ({ name: c.name, nameBn: c.nameBn, shop: shopId })),
    { ordered: false }
  );
  return { created: toCreate.length };
};

// Business Type is locked once a shop has any products — switching would
// leave existing products' fields/units mismatched with the new type's
// configuration (e.g. a Garments product's size/color on a shop switched to
// Grocery). The supported fix is a new shop, not silently drifting data.
const BUSINESS_TYPE_LOCKED_MESSAGE = 'Business Type cannot be changed because this shop already has products. Please create a new shop if you need a different Business Type.';

// Returns a 400 response and `true` if the requested businessType change must
// be blocked; returns `false` (no response sent) if the change is allowed.
// Only ever checks the DB when the request actually asks for a different
// type than the shop currently has — re-saving the same value never counts
// as a "change" and is always allowed.
const rejectIfBusinessTypeLocked = async (res, shop, requestedBusinessType) => {
  if (
    requestedBusinessType === undefined ||
    !BUSINESS_TYPE_KEYS.includes(requestedBusinessType) ||
    requestedBusinessType === shop.businessType
  ) {
    return false;
  }
  const productCount = await Product.countDocuments({ shop: shop._id });
  if (productCount > 0) {
    res.status(400).json({ message: BUSINESS_TYPE_LOCKED_MESSAGE, code: 'BUSINESS_TYPE_LOCKED', productCount });
    return true;
  }
  return false;
};

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
    const shop = await Shop.findById(req.params.id)
      .populate('owner', 'name email phone')
      .populate({
        path: 'subscription',
        populate: { path: 'plan', select: 'name nameBn duration price features featuresBn' },
      });
    if (!shop) {
      return res.status(404).json({ message: 'Shop not found' });
    }
    // productCount lets the Super Admin's Edit Shop UI know upfront whether
    // Business Type is locked, without a separate round trip.
    const productCount = await Product.countDocuments({ shop: shop._id });
    res.json({ ...shop.toObject(), productCount });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get shop statistics for dashboard (Super Admin view of a specific shop)
// @route   GET /api/shops/:id/stats
const getShopStats = async (req, res) => {
  try {
    const shopId = req.params.id;
    
    const [
      totalProducts,
      totalCustomers,
      totalSuppliers,
      totalSalesAgg,
      totalPurchasesAgg,
    ] = await Promise.all([
      Product.countDocuments({ shop: shopId }),
      Customer.countDocuments({ shop: shopId }),
      Supplier.countDocuments({ shop: shopId }),
      Sale.aggregate([
        { $match: { shop: shopId } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]),
      Purchase.aggregate([
        { $match: { shop: shopId } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]),
    ]);

    res.json({
      totalProducts,
      totalCustomers,
      totalSuppliers,
      totalSales: totalSalesAgg[0]?.total || 0,
      totalPurchases: totalPurchasesAgg[0]?.total || 0,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get recent activity logs for a specific shop
// @route   GET /api/shops/:id/activities
const getShopActivities = async (req, res) => {
  try {
    const shopId = req.params.id;
    
    // Find the shop's owner user to filter activities
    const shop = await Shop.findById(shopId).select('owner');
    if (!shop) {
      return res.status(404).json({ message: 'Shop not found' });
    }

    const logs = await ActivityLog.find({ user: shop.owner })
      .select('action details createdAt')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a new shop with owner account (Super Admin)
// @route   POST /api/shops
const createShop = async (req, res) => {
  try {
    const { name, ownerName, email, phone, password, address, businessType } = req.body;

    if (!name || !ownerName || !email || !phone || !password) {
      return res.status(400).json({ message: 'Please provide all required fields: name, ownerName, email, phone, password' });
    }

    const resolvedBusinessType = BUSINESS_TYPE_KEYS.includes(businessType) ? businessType : 'grocery';

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

    // Create the shop with the owner reference, initializing its module
    // config from the selected business type's recommended defaults.
    const shop = await Shop.create({
      name,
      phone,
      email,
      address: address || '',
      owner: owner._id,
      subscriptionStatus: 'trial',
      businessType: resolvedBusinessType,
      settings: { enabledModules: getBusinessTypeDefaults(resolvedBusinessType).modules },
    });

    // Update user with shop reference
    owner.shop = shop._id;
    await owner.save();

    // Best-effort: seed the business type's default categories. Never blocks
    // shop creation if this fails for any reason.
    try {
      await seedDefaultCategories(shop._id, resolvedBusinessType);
    } catch (seedError) {
      console.error('Default category seeding failed for new shop:', seedError.message);
    }

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

    const { name, ownerName, email, phone, address, logo, currency, timezone, settings, businessType } = req.body;

    // Reject the whole request up front if this would change Business Type
    // on a shop that already has products — no partial update where every
    // other field silently saves while businessType is quietly skipped.
    if (await rejectIfBusinessTypeLocked(res, shop, businessType)) return;

    if (name) shop.name = name;
    if (email) shop.email = email;
    if (phone) shop.phone = phone;
    if (logo) shop.logo = logo;
    if (currency) shop.currency = currency;
    if (timezone) shop.timezone = timezone;
    if (settings) shop.settings = { ...shop.settings, ...settings };
    // Changing business type here only relabels the shop — it never touches
    // settings.enabledModules, so it can't silently undo module toggles the
    // owner already customized. Applying new recommended modules is a
    // separate, explicit action (see updateMyShopSettings).
    if (businessType && BUSINESS_TYPE_KEYS.includes(businessType)) shop.businessType = businessType;

    // Handle address: if it's a string (comma-separated from frontend), parse it into an object
    if (address !== undefined) {
      if (typeof address === 'string') {
        const parts = address.split(',').map(s => s.trim()).filter(Boolean);
        shop.address = {
          street: parts[0] || '',
          city: parts[1] || '',
          state: parts[2] || '',
          zipCode: parts[3] || '',
          country: parts[4] || 'India',
        };
      } else if (typeof address === 'object' && address !== null) {
        shop.address = { ...shop.address, ...address };
      }
    }

    // Handle ownerName: update the associated User document's name
    if (ownerName && shop.owner) {
      await User.findByIdAndUpdate(shop.owner, { name: ownerName });
    }

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
    // productCount lets the Business Configuration settings UI know upfront
    // whether Business Type is locked, without a separate round trip.
    const productCount = await Product.countDocuments({ shop: shop._id });
    res.json({ ...shop.toObject(), productCount });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get shop statistics (Super Admin)
// @route   GET /api/shops/stats
const getShopStatsOverview = async (req, res) => {
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

// @desc    Update my shop settings (tax, footer, print, etc.)
// @route   PUT /api/shops/settings
const updateMyShopSettings = async (req, res) => {
  try {
    const shop = await Shop.findById(req.user.shop);
    if (!shop) {
      return res.status(404).json({ message: 'Shop not found' });
    }

    const {
      taxRate, taxName, receiptFooter, invoicePrefix,
      barcodePrefix, barcodeSymbology, autoGenerateBarcode,
      // Printer settings
      paperSize, invoiceTemplate, printMode, autoPrint,
      printCopies, marginTop, marginBottom, marginLeft, marginRight,
      showLogo, showQR, showBarcode, showHeader, showFooter,
      // Multi-business configuration
      businessType, enabledModules, customUnits, applyRecommendedModules,
      // POS display settings
      posDisplayLimit,
    } = req.body;

    // Reject the whole request up front if this would change Business Type
    // on a shop that already has products — no partial update where
    // unrelated settings in the same payload silently save anyway.
    if (await rejectIfBusinessTypeLocked(res, shop, businessType)) return;

    if (taxRate !== undefined) shop.settings.taxRate = Math.max(0, Math.min(100, Number(taxRate)));
    if (taxName !== undefined) shop.settings.taxName = taxName;
    if (receiptFooter !== undefined) shop.settings.receiptFooter = receiptFooter;
    if (invoicePrefix !== undefined) shop.settings.invoicePrefix = invoicePrefix;
    if (barcodePrefix !== undefined) shop.settings.barcodePrefix = barcodePrefix;
    if (barcodeSymbology !== undefined) shop.settings.barcodeSymbology = barcodeSymbology;
    if (autoGenerateBarcode !== undefined) shop.settings.autoGenerateBarcode = !!autoGenerateBarcode;

    // Printer settings
    if (paperSize !== undefined) shop.settings.paperSize = paperSize;
    if (invoiceTemplate !== undefined) shop.settings.invoiceTemplate = invoiceTemplate;
    if (printMode !== undefined) shop.settings.printMode = printMode;
    if (autoPrint !== undefined) shop.settings.autoPrint = !!autoPrint;
    if (printCopies !== undefined) shop.settings.printCopies = Math.max(1, Number(printCopies));
    if (marginTop !== undefined) shop.settings.marginTop = Number(marginTop);
    if (marginBottom !== undefined) shop.settings.marginBottom = Number(marginBottom);
    if (marginLeft !== undefined) shop.settings.marginLeft = Number(marginLeft);
    if (marginRight !== undefined) shop.settings.marginRight = Number(marginRight);
    if (showLogo !== undefined) shop.settings.showLogo = !!showLogo;
    if (showQR !== undefined) shop.settings.showQR = !!showQR;
    if (showBarcode !== undefined) shop.settings.showBarcode = !!showBarcode;
    if (showHeader !== undefined) shop.settings.showHeader = !!showHeader;
    if (showFooter !== undefined) shop.settings.showFooter = !!showFooter;

    // POS display settings — partial merge, clamped to the settings UI's
    // valid option ranges (5-30 desktop, 5-20 mobile).
    if (posDisplayLimit && typeof posDisplayLimit === 'object') {
      const current = shop.settings.posDisplayLimit?.toObject?.() || shop.settings.posDisplayLimit || {};
      const next = { ...current };
      if (posDisplayLimit.desktop !== undefined) next.desktop = Math.max(5, Math.min(30, Number(posDisplayLimit.desktop) || 20));
      if (posDisplayLimit.mobile !== undefined) next.mobile = Math.max(5, Math.min(20, Number(posDisplayLimit.mobile) || 10));
      shop.settings.posDisplayLimit = next;
    }

    // Multi-business configuration
    if (businessType !== undefined && BUSINESS_TYPE_KEYS.includes(businessType)) {
      shop.businessType = businessType;
    }
    // Partial merge — only the module keys the client actually sent are
    // changed, so a toggle for one module never resets the others.
    if (enabledModules && typeof enabledModules === 'object') {
      shop.settings.enabledModules = { ...(shop.settings.enabledModules?.toObject?.() || shop.settings.enabledModules || {}), ...enabledModules };
    }
    // Explicit opt-in only — never runs automatically when businessType
    // changes, so the owner's own toggles are never silently overwritten.
    if (applyRecommendedModules) {
      shop.settings.enabledModules = getBusinessTypeDefaults(shop.businessType).modules;
    }
    // Full replace — the Unit Manager UI always sends its complete list.
    if (Array.isArray(customUnits)) {
      shop.settings.customUnits = customUnits
        .filter((u) => u && u.key && u.label)
        .map((u) => ({ key: String(u.key).trim(), label: String(u.label).trim(), labelBn: u.labelBn ? String(u.labelBn).trim() : '' }));
    }

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

// @desc    Add this shop's business-type default categories (skips any that
//          already exist by name) — lets a shop "catch up" after switching
//          business type without ever touching existing categories.
// @route   POST /api/shops/seed-categories
const restoreDefaultCategories = async (req, res) => {
  try {
    const shop = await Shop.findById(req.user.shop);
    if (!shop) {
      return res.status(404).json({ message: 'Shop not found' });
    }
    const result = await seedDefaultCategories(shop._id, shop.businessType);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getShops,
  getShop,
  getShopStats: getShopStatsOverview,
  getShopDetailStats: getShopStats,
  getShopActivities,
  createShop,
  updateShop,
  toggleShopStatus,
  getMyShop,
  updateMyShopSettings,
  getShopBackup,
  restoreShopBackup,
  restoreDefaultCategories,
};
