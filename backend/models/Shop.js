const mongoose = require('mongoose');
const { BUSINESS_TYPE_KEYS, MODULE_KEYS } = require('../config/businessTypes');

const enabledModulesSchema = MODULE_KEYS.reduce((acc, key) => {
  acc[key] = { type: Boolean };
  return acc;
}, {});

const shopSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Shop name is required'],
    trim: true,
  },
  businessType: {
    type: String,
    enum: BUSINESS_TYPE_KEYS,
    default: 'grocery',
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
    country: { type: String, default: 'India' },
  },
  logo: {
    type: String,
    default: '',
  },
  currency: {
    type: String,
    default: 'INR',
  },
  timezone: {
    type: String,
    default: 'Asia/Kolkata',
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
    enum: ['active', 'expired', 'cancelled', 'trial', 'queued'],
    default: 'trial',
  },
  trialEndsAt: {
    type: Date,
    default: () => new Date(+new Date() + 14 * 24 * 60 * 60 * 1000),
  },
  settings: {
    gstEnabled: { type: Boolean, default: true },
    gstNumber: { type: String, default: '' },
    defaultGstRate: { type: Number, default: 18 },
    cgstRate: { type: Number, default: 9 },
    sgstRate: { type: Number, default: 9 },
    igstRate: { type: Number, default: 18 },
    businessState: { type: String, default: 'West Bengal' },
    roundOffEnabled: { type: Boolean, default: true },
    invoicePrefix: { type: String, default: 'INV-' },
    receiptFooter: { type: String, default: 'Thank you for your purchase!' },
    lowStockThreshold: { type: Number, default: 10 },
    enableLoyalty: { type: Boolean, default: false },
    loyaltyPointsPerAmount: { type: Number, default: 100 },
    loyaltyRedeemRate: { type: Number, default: 1 },
    barcodePrefix: { type: String, default: '' },
    barcodeSymbology: { type: String, enum: ['CODE128', 'EAN13', 'UPC', 'CODE39'], default: 'CODE128' },
    autoGenerateBarcode: { type: Boolean, default: false },
    paperSize: { type: String, enum: ['58mm', '80mm', 'a4'], default: '80mm' },
    invoiceTemplate: { type: String, enum: ['classic', 'modern', 'minimal', 'grocery'], default: 'modern' },
    printMode: { type: String, enum: ['thermal', 'normal'], default: 'thermal' },
    autoPrint: { type: Boolean, default: true },
    printCopies: { type: Number, default: 1 },
    marginTop: { type: Number, default: 0 },
    marginBottom: { type: Number, default: 0 },
    marginLeft: { type: Number, default: 0 },
    marginRight: { type: Number, default: 0 },
    showLogo: { type: Boolean, default: true },
    showQR: { type: Boolean, default: true },
    showBarcode: { type: Boolean, default: false },
    showHeader: { type: Boolean, default: true },
    showFooter: { type: Boolean, default: true },
    posDisplayLimit: {
      desktop: { type: Number, default: 20 },
      mobile: { type: Number, default: 10 },
    },
    enabledModules: enabledModulesSchema,
    customUnits: {
      type: [{
        key: { type: String, required: true, trim: true },
        label: { type: String, required: true, trim: true },
        labelBn: { type: String, trim: true },
      }],
      default: [],
    },
  },
}, {
  timestamps: true,
});

shopSchema.index({ owner: 1 });
shopSchema.index({ isActive: 1, subscriptionStatus: 1 });
shopSchema.index({ subscriptionStatus: 1 });
shopSchema.index({ createdAt: 1 });
shopSchema.index({ owner: 1, isActive: 1 });
shopSchema.index({ owner: 1, subscriptionStatus: 1 });

module.exports = mongoose.model('Shop', shopSchema);