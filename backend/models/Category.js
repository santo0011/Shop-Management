const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Category name is required'],
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
  shop: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shop',
    required: true,
  },
  parent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null,
  },
  image: {
    type: String,
    default: '',
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

// Unique compound index: category name must be unique within a shop
categorySchema.index({ name: 1, shop: 1 }, { unique: true });

module.exports = mongoose.model('Category', categorySchema);
