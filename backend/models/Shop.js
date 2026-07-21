const mongoose = require('mongoose');
const { BUSINESS_TYPE_KEYS, MODULE_KEYS } = require('../config/businessTypes');

// No `default` here deliberately: shops created before this feature existed
// have no settings.enabledModules in the database at all. If each key
// defaulted to `false`, Mongoose would materialize a fully-false object for
// every legacy shop the moment it's read — silently hiding every module
// (including the ones its business type should enable by default) until the
// owner manually re-toggles each one. Leaving keys genuinely `undefined`
// when unset lets the frontend fall back to the business type's defaults
// for anything the shop has never explicitly touched (see useBusinessConfig).
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
    // Printer settings
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
    // POS product list display limits — how many products (ranked by total
    // quantity sold) show per category, configured separately for desktop
    // and mobile. Applies to every category tab including Top Selling;
    // Product Search always ignores this and searches everything.
    posDisplayLimit: {
      desktop: { type: Number, default: 20 },
      mobile: { type: Number, default: 10 },
    },
    // Multi-business configuration — which optional product modules this
    // shop uses, initialized from the business type's defaults at creation
    // time but independently editable afterward from Settings.
    enabledModules: enabledModulesSchema,
    // Shop-defined units in addition to the global unit catalog.
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

module.exports = mongoose.model('Shop', shopSchema);