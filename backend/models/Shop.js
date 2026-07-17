const mongoose = require('mongoose');

const shopSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Shop name is required'],
    trim: true,
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
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
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: { type: String, default: 'Bangladesh' },
  },
  logo: {
    type: String,
    default: '',
  },
  currency: {
    type: String,
    default: 'BDT',
  },
  timezone: {
    type: String,
    default: 'Asia/Dhaka',
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  subscription: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subscription',
  },
  subscriptionStatus: {
    type: String,
    enum: ['active', 'expired', 'cancelled', 'trial'],
    default: 'trial',
  },
  trialEndsAt: {
    type: Date,
    default: () => new Date(+new Date() + 14 * 24 * 60 * 60 * 1000), // 14 days trial
  },
  settings: {
    taxRate: { type: Number, default: 0 },
    taxName: { type: String, default: 'VAT' },
    invoicePrefix: { type: String, default: 'INV-' },
    receiptFooter: { type: String, default: 'Thank you for your purchase!' },
    lowStockThreshold: { type: Number, default: 10 },
    enableLoyalty: { type: Boolean, default: false },
    loyaltyPointsPerAmount: { type: Number, default: 100 }, // points per 100 currency
    loyaltyRedeemRate: { type: Number, default: 1 }, // 1 point = 1 currency
    barcodePrefix: { type: String, default: '' },
    barcodeSymbology: { type: String, enum: ['CODE128', 'EAN13', 'UPC', 'CODE39'], default: 'CODE128' },
    autoGenerateBarcode: { type: Boolean, default: false },
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Shop', shopSchema);