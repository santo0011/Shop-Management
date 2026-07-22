const mongoose = require('mongoose');

const saleItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  quantity: {
    // Always the Base Unit quantity actually deducted from stock — for a
    // custom-quantity line (e.g. 200 ml of a Litre-based product) this is
    // the converted decimal (0.2), not the amount the customer asked for.
    type: Number,
    required: true,
    min: 0.001,
  },
  returnedQty: {
    type: Number,
    default: 0,
  },
  unit: {
    // Always the product's Base Unit — see enteredUnit for what the
    // customer/cashier actually typed at checkout.
    type: String,
    required: true,
  },
  // The raw quantity/unit the cashier entered at POS for a Custom Quantity
  // sale (e.g. 200 / 'ml') — kept only for invoice/history display. Absent
  // for ordinary Base-Unit sales, where quantity/unit above are shown as-is.
  enteredQuantity: {
    type: Number,
  },
  enteredUnit: {
    type: String,
  },
  // Manual per-line surcharge entered by the cashier at checkout (e.g. for
  // odd-quantity handling). Never persisted on Product — this is sale-only,
  // one-time transaction data.
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
  tax: {
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
  tax: {
    type: Number,
    default: 0,
  },
  totalAmount: {
    type: Number,
    required: true,
  },
  // Always <= 0 — the amount shaved off the raw (subtotal + tax - discount)
  // total to floor it down to a whole number. Stored so invoices/reprints
  // can always show the same "Round Off" line that was shown at checkout.
  roundOff: {
    type: Number,
    default: 0,
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
    enum: ['cash', 'card', 'upi', 'mobile_banking', 'due'],
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