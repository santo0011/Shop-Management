const Product = require('../models/Product');

// ─── Get Product Details (view-only) ────────────────────────────
// Returns full product profile + summary stats.
// Read-only — does not create / update / delete anything.
const getProductDetails = async (req, res) => {
  try {
    const shopId = req.user.shop;
    const productId = req.params.id;

    const product = await Product.findOne({ _id: productId, shop: shopId })
      .populate('category', 'name nameBn');

    if (!product) return res.status(404).json({ message: 'Product not found' });

    // Summary stats
    const currentStock = product.stock || 0;
    const sellingPrice = product.sellingPrice || 0;
    const stockValue = currentStock * (product.purchasePrice || 0);

    // Stock status
    let stockStatus = 'in_stock';
    if (currentStock === 0) {
      stockStatus = 'out_of_stock';
    } else if (product.minStock && currentStock <= product.minStock) {
      stockStatus = 'low_stock';
    }

    res.json({
      product,
      summary: {
        currentStock,
        sellingPrice,
        stockValue,
      },
      inventory: {
        currentStock,
        stockStatus,
        totalStockValue: stockValue,
        minStock: product.minStock || 0,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getProductDetails };