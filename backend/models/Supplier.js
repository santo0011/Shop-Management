const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Supplier name is required'],
    trim: true,
  },
  nameBn: {
    type: String,
    trim: true,
  },
  company: {
    type: String,
    trim: true,
  },
  email: {
    type: String,
    lowercase: true,
    trim: true,
  },
  phone: {
    type: String,
    required: [true, 'Phone is required'],
    trim: true,
  },
  address: {
    type: String,
    trim: true,
  },
  state: {
    type: String,
    required: [true, 'State is required'],
    trim: true,
    default: 'West Bengal',
  },
  gstNumber: {
    type: String,
    trim: true,
    default: '',
  },
  shop: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shop',
    required: true,
  },
  openingBalance: {
    type: Number,
    default: 0,
  },
  totalPurchases: {
    type: Number,
    default: 0,
  },
  totalPaid: {
    type: Number,
    default: 0,
  },
  dueAmount: {
    type: Number,
    default: 0,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

// Unique compound indexes: name and phone must be unique within a shop
supplierSchema.index({ name: 1, shop: 1 }, { unique: true });
supplierSchema.index({ phone: 1, shop: 1 }, { unique: true });

module.exports = mongoose.model('Supplier', supplierSchema);