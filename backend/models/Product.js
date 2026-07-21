const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
  },
  nameBn: {
    type: String,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  descriptionBn: {
    type: String,
    trim: true,
  },
  sku: {
    type: String,
    trim: true,
  },
  barcode: {
    type: String,
    trim: true,
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true,
  },
  shop: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shop',
    required: true,
  },
  unit: {
    type: String,
    enum: ['kg', 'gram', 'liter', 'ml', 'piece', 'packet', 'box', 'carton'],
    default: 'piece',
  },
  purchasePrice: {
    type: Number,
    required: [true, 'Purchase price is required'],
    min: 0,
  },
  sellingPrice: {
    type: Number,
    required: [true, 'Selling price is required'],
    min: 0,
  },
  wholesalePrice: {
    type: Number,
    min: 0,
  },
  discount: {
    type: Number,
    default: 0,
  },
  tax: {
    type: Number,
    default: 0,
  },
  stock: {
    type: Number,
    default: 0,
  },
  minStock: {
    type: Number,
    default: 10,
  },
  maxStock: {
    type: Number,
    default: 1000,
  },
  image: {
    type: String,
    default: '',
  },
  images: [String],
  variants: [{
    name: { type: String },
    nameBn: { type: String },
    value: { type: String },
    price: { type: Number },
    stock: { type: Number },
  }],
  batchNumber: {
    type: String,
  },
  expiryDate: {
    type: Date,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  trackStock: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

productSchema.index({ name: 'text', nameBn: 'text', barcode: 1, sku: 1 });
productSchema.index({ shop: 1, category: 1 });
productSchema.index({ shop: 1, barcode: 1 }, { unique: true, sparse: true });
productSchema.index({ name: 1, shop: 1 }, { unique: true });

module.exports = mongoose.model('Product', productSchema);