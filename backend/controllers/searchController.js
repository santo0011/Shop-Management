const Product = require('../models/Product');
const Customer = require('../models/Customer');

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const globalSearch = async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q) return res.json({ products: [], customers: [] });

    const regex = { $regex: escapeRegex(q), $options: 'i' };
    const shop = req.user.shop;

    const [products, customers] = await Promise.all([
      Product.find({
        shop,
        isActive: true,
        $or: [{ name: regex }, { nameBn: regex }, { barcode: regex }, { sku: regex }],
      })
        .select('name nameBn barcode sku sellingPrice stock unit category')
        .populate('category', 'name nameBn')
        .limit(6),
      Customer.find({
        shop,
        isActive: true,
        $or: [{ name: regex }, { nameBn: regex }, { phone: regex }],
      })
        .select('name nameBn phone dueAmount loyaltyPoints')
        .limit(6),
    ]);

    res.json({ products, customers });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { globalSearch };
