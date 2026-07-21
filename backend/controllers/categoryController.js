const Category = require('../models/Category');
const Product = require('../models/Product');

const getCategories = async (req, res) => {
  try {
    const categories = await Category.find({ shop: req.user.shop })
      .populate('parent', 'name nameBn')
      .sort({ name: 1 });
    res.json(categories);
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

module.exports = { getCategories, getCategory, createCategory, updateCategory, deleteCategory };