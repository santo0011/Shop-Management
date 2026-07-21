const Category = require('../models/Category');
const Product = require('../models/Product');

// ─── Get Category Details (view-only) ─────────────────────────────
// Returns full category profile + summary stats + latest products.
// Read-only — does not create / update / delete anything.
const getCategoryDetails = async (req, res) => {
  try {
    const shopId = req.user.shop;
    const categoryId = req.params.id;

    const category = await Category.findOne({ _id: categoryId, shop: shopId });
    if (!category) return res.status(404).json({ message: 'Category not found' });

    // All products for this category (newest first)
    const products = await Product.find({ category: categoryId, shop: shopId })
      .sort({ createdAt: -1 })
      .select('name nameBn stock sellingPrice isActive createdAt');

    // Summary stats
    const totalProducts = products.length;
    const activeProducts = products.filter((p) => p.isActive !== false).length;
    const totalStock = products.reduce((sum, p) => sum + (p.stock || 0), 0);

    // Latest products (top 5)
    const latestProducts = products.slice(0, 5);

    res.json({
      category,
      summary: {
        totalProducts,
        activeProducts,
        totalStock,
      },
      products: latestProducts,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getCategoryDetails };