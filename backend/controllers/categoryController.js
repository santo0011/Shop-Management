const Category = require('../models/Category');
const Product = require('../models/Product');

const getCategories = async (req, res) => {
  try {
    const { search, page: pageParam, limit: limitParam } = req.query;

    const query = { shop: req.user.shop };
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { nameBn: { $regex: search, $options: 'i' } },
      ];
    }

    const baseQuery = Category.find(query).populate('parent', 'name nameBn').sort({ name: 1 });

    // Pagination is opt-in via ?page=/&limit= — existing callers (the
    // product/purchase "category" dropdowns, and bulk-import duplicate
    // checks) call this with neither and rely on getting the full list
    // back as a bare array. Only requests that ask for a page get the
    // {categories, page, pages, total} envelope.
    if (!pageParam && !limitParam) {
      const categories = await baseQuery;
      return res.json(categories);
    }

    const page = parseInt(pageParam) || 1;
    const limit = parseInt(limitParam) || 10;
    const skip = (page - 1) * limit;

    const [categories, total] = await Promise.all([
      baseQuery.skip(skip).limit(limit),
      Category.countDocuments(query),
    ]);

    res.json({
      categories,
      page,
      pages: Math.ceil(total / limit) || 1,
      total,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getCategory = async (req, res) => {
  try {
    const category = await Category.findOne({ _id: req.params.id, shop: req.user.shop });
    if (!category) return res.status(404).json({ message: 'Category not found' });
    res.json(category);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createCategory = async (req, res) => {
  try {
    req.body.shop = req.user.shop;

    // Check for duplicate name within shop
    const existing = await Category.findOne({ name: req.body.name, shop: req.user.shop });
    if (existing) {
      return res.status(400).json({ message: 'A category with this name already exists in your shop.' });
    }

    const category = await Category.create(req.body);
    res.status(201).json(category);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'A category with this name already exists in your shop.' });
    }
    res.status(500).json({ message: error.message });
  }
};

const updateCategory = async (req, res) => {
  try {
    // Check for duplicate name (excluding current record)
    if (req.body.name) {
      const existing = await Category.findOne({
        name: req.body.name,
        shop: req.user.shop,
        _id: { $ne: req.params.id },
      });
      if (existing) {
        return res.status(400).json({ message: 'Another category with this name already exists in your shop.' });
      }
    }

    const category = await Category.findOneAndUpdate(
      { _id: req.params.id, shop: req.user.shop },
      req.body,
      { new: true, runValidators: true }
    );
    if (!category) return res.status(404).json({ message: 'Category not found' });
    res.json(category);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Another category with this name already exists in your shop.' });
    }
    res.status(500).json({ message: error.message });
  }
};

const deleteCategory = async (req, res) => {
  try {
    // Check if any product uses this category
    const productCount = await Product.countDocuments({ category: req.params.id, shop: req.user.shop });
    if (productCount > 0) {
      return res.status(400).json({
        message: 'This category cannot be deleted because it is already used by one or more products.',
        usedBy: { products: productCount },
      });
    }

    const category = await Category.findOneAndDelete({ _id: req.params.id, shop: req.user.shop });
    if (!category) return res.status(404).json({ message: 'Category not found' });
    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete multiple categories at once. Categories used by any
//          product are skipped (never partially/force-deleted) — the
//          remaining, unused ones are still deleted in the same request.
// @route   POST /api/categories/bulk-delete
const bulkDeleteCategories = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'No categories selected.' });
    }

    // Only ever touch categories that actually belong to this shop.
    const categories = await Category.find({ _id: { $in: ids }, shop: req.user.shop }).select('_id name');

    const usedCategoryIds = await Product.distinct('category', {
      category: { $in: categories.map((c) => c._id) },
      shop: req.user.shop,
    });
    const usedSet = new Set(usedCategoryIds.map((id) => id.toString()));

    const deletableIds = categories.filter((c) => !usedSet.has(c._id.toString())).map((c) => c._id);
    const blockedNames = categories.filter((c) => usedSet.has(c._id.toString())).map((c) => c.name);

    let deletedCount = 0;
    if (deletableIds.length > 0) {
      const result = await Category.deleteMany({ _id: { $in: deletableIds }, shop: req.user.shop });
      deletedCount = result.deletedCount;
    }

    res.json({ deletedCount, blockedCount: blockedNames.length, blockedNames });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getCategories, getCategory, createCategory, updateCategory, deleteCategory, bulkDeleteCategories };