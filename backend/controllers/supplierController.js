const Supplier = require('../models/Supplier');
const Purchase = require('../models/Purchase');
const Product = require('../models/Product');

const getSuppliers = async (req, res) => {
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
        { company: { $regex: search, $options: 'i' } },
      ];
    }

    const suppliers = await Supplier.find(query).sort({ name: 1 }).skip(skip).limit(limit);
    const total = await Supplier.countDocuments(query);

    res.json({ suppliers, page, pages: Math.ceil(total / limit), total });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getSupplier = async (req, res) => {
  try {
    const supplier = await Supplier.findOne({ _id: req.params.id, shop: req.user.shop });
    if (!supplier) return res.status(404).json({ message: 'Supplier not found' });
    res.json(supplier);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createSupplier = async (req, res) => {
  try {
    req.body.shop = req.user.shop;

    // Check for duplicate name within shop
    const existingName = await Supplier.findOne({ name: req.body.name, shop: req.user.shop });
    if (existingName) {
      return res.status(400).json({ message: 'A supplier with this name already exists in your shop.' });
    }

    // Check for duplicate phone within shop
    if (req.body.phone) {
      const existingPhone = await Supplier.findOne({ phone: req.body.phone, shop: req.user.shop });
      if (existingPhone) {
        return res.status(400).json({ message: 'A supplier with this phone number already exists in your shop.' });
      }
    }

    const supplier = await Supplier.create(req.body);
    res.status(201).json(supplier);
  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      if (field === 'phone') {
        return res.status(400).json({ message: 'A supplier with this phone number already exists in your shop.' });
      }
      return res.status(400).json({ message: 'A supplier with this name already exists in your shop.' });
    }
    res.status(500).json({ message: error.message });
  }
};

const updateSupplier = async (req, res) => {
  try {
    // Check for duplicate name (excluding current record)
    if (req.body.name) {
      const existingName = await Supplier.findOne({
        name: req.body.name,
        shop: req.user.shop,
        _id: { $ne: req.params.id },
      });
      if (existingName) {
        return res.status(400).json({ message: 'Another supplier with this name already exists in your shop.' });
      }
    }

    // Check for duplicate phone (excluding current record)
    if (req.body.phone) {
      const existingPhone = await Supplier.findOne({
        phone: req.body.phone,
        shop: req.user.shop,
        _id: { $ne: req.params.id },
      });
      if (existingPhone) {
        return res.status(400).json({ message: 'Another supplier with this phone number already exists in your shop.' });
      }
    }

    const supplier = await Supplier.findOneAndUpdate(
      { _id: req.params.id, shop: req.user.shop },
      req.body,
      { new: true, runValidators: true }
    );
    if (!supplier) return res.status(404).json({ message: 'Supplier not found' });
    res.json(supplier);
  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      if (field === 'phone') {
        return res.status(400).json({ message: 'Another supplier with this phone number already exists in your shop.' });
      }
      return res.status(400).json({ message: 'Another supplier with this name already exists in your shop.' });
    }
    res.status(500).json({ message: error.message });
  }
};

const deleteSupplier = async (req, res) => {
  try {
    // Check if any purchase uses this supplier
    const purchaseCount = await Purchase.countDocuments({ supplier: req.params.id, shop: req.user.shop });
    if (purchaseCount > 0) {
      return res.status(400).json({
        message: 'This supplier cannot be deleted because it is already used in purchases.',
        usedBy: { purchases: purchaseCount },
      });
    }

    // Check if any product references this supplier (if product has supplier field)
    const productCount = await Product.countDocuments({ supplier: req.params.id, shop: req.user.shop });
    if (productCount > 0) {
      return res.status(400).json({
        message: 'This supplier cannot be deleted because it is already used by products.',
        usedBy: { products: productCount },
      });
    }

    const supplier = await Supplier.findOneAndDelete({ _id: req.params.id, shop: req.user.shop });
    if (!supplier) return res.status(404).json({ message: 'Supplier not found' });
    res.json({ message: 'Supplier deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete multiple suppliers at once. Suppliers used in any purchase
//          or referenced by any product are skipped (never partially/force-
//          deleted) — the remaining, unused ones are still deleted.
// @route   POST /api/suppliers/bulk-delete
const bulkDeleteSuppliers = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'No suppliers selected.' });
    }

    // Only ever touch suppliers that actually belong to this shop.
    const suppliers = await Supplier.find({ _id: { $in: ids }, shop: req.user.shop }).select('_id name');
    const supplierIds = suppliers.map((s) => s._id);

    const [usedByPurchases, usedByProducts] = await Promise.all([
      Purchase.distinct('supplier', { supplier: { $in: supplierIds }, shop: req.user.shop }),
      Product.distinct('supplier', { supplier: { $in: supplierIds }, shop: req.user.shop }),
    ]);
    const usedSet = new Set([...usedByPurchases, ...usedByProducts].map((id) => id.toString()));

    const deletableIds = suppliers.filter((s) => !usedSet.has(s._id.toString())).map((s) => s._id);
    const blockedNames = suppliers.filter((s) => usedSet.has(s._id.toString())).map((s) => s.name);

    let deletedCount = 0;
    if (deletableIds.length > 0) {
      const result = await Supplier.deleteMany({ _id: { $in: deletableIds }, shop: req.user.shop });
      deletedCount = result.deletedCount;
    }

    res.json({ deletedCount, blockedCount: blockedNames.length, blockedNames });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getSuppliers, getSupplier, createSupplier, updateSupplier, deleteSupplier, bulkDeleteSuppliers };