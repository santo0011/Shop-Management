const mongoose = require('mongoose');

const saleItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 0.001,
  },
  returnedQty: {
    type: Number,
    default: 0,
  },
  unit: {
    type: String,
    required: true,
  },
  enteredQuantity: {
    type: Number,
  },
  enteredUnit: {
    type: String,
  },
  extraCharge: {
    type: Number,
    default: 0,
  },
  price: {
    type: Number,
    required: true,
  },
  discount: {
    type: Number,
    default: 0,
  },
  gstRate: {
    type: Number,
    default: 0,
  },
  cgst: {
    type: Number,
    default: 0,
  },
  sgst: {
    type: Number,
    default: 0,
  },
  igst: {
    type: Number,
    default: 0,
  },
  taxableAmount: {
    type: Number,
    default: 0,
  },
  gstAmount: {
    type: Number,
    default: 0,
  },
  total: {
    type: Number,
    required: true,
  },
});

const returnItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  productName: {
    type: String,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  refundAmount: {
    type: Number,
    default: 0,
  },
  reason: {
    type: String,
    default: '',
  },
});

const returnEntrySchema = new mongoose.Schema({
  items: [returnItemSchema],
  totalRefund: {
    type: Number,
    default: 0,
  },
  refundMethod: {
    type: String,
    enum: ['cash', 'card', 'upi', 'mobile_banking', 'due'],
    default: 'cash',
  },
  reason: {
    type: String,
    default: '',
  },
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  returnDate: {
    type: Date,
    default: Date.now,
  },
});

const saleSchema = new mongoose.Schema({
  shop: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shop',
    required: true,
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
  },
  invoiceNo: {
    type: String,
    required: true,
  },
  saleDate: {
    type: Date,
    default: Date.now,
  },
  items: [saleItemSchema],
  subtotal: {
    type: Number,
    required: true,
  },
  discount: {
    type: Number,
    default: 0,
  },
  gstRate: {
    type: Number,
    default: 0,
  },
  cgst: {
    type: Number,
    default: 0,
  },
  sgst: {
    type: Number,
    default: 0,
  },
  igst: {
    type: Number,
    default: 0,
  },
  taxableAmount: {
    type: Number,
    default: 0,
  },
  gstAmount: {
    type: Number,
    default: 0,
  },
  totalAmount: {
    type: Number,
    required: true,
  },
  paidAmount: {
    type: Number,
    default: 0,
  },
  dueAmount: {
    type: Number,
    default: 0,
  },
  paymentStatus: {
    type: String,
    enum: ['paid', 'partial', 'unpaid'],
    default: 'paid',
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'bank_transfer', 'upi', 'mobile_banking', 'card', 'cheque', 'other'],
    default: 'cash',
  },
  posType: {
    type: String,
    enum: ['pos', 'regular'],
    default: 'pos',
  },
  loyaltyPointsEarned: {
    type: Number,
    default: 0,
  },
  loyaltyPointsRedeemed: {
    type: Number,
    default: 0,
  },
  notes: {
    type: String,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  returns: [returnEntrySchema],
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// ─── Indexes for performance ──────────────────────────────────
saleSchema.index({ shop: 1, saleDate: -1 });
saleSchema.index({ shop: 1, createdAt: -1 });
saleSchema.index({ shop: 1, paymentMethod: 1 });
saleSchema.index({ shop: 1, invoiceNo: 1 });

// Virtual: return status
saleSchema.virtual('returnStatus').get(function() {
  if (!this.returns || this.returns.length === 0) return 'none';
  if (this.items.every(item => (item.returnedQty || 0) >= item.quantity)) return 'full';
  return 'partial';
});

module.exports = mongoose.model('Sale', saleSchema);