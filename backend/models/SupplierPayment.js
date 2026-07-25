const mongoose = require('mongoose');

// Audit trail for standalone "pay down supplier due" payments (as opposed to
// the paidAmount collected at the moment a purchase is created). The actual
// money movement is applied to real Purchase docs via the same FIFO
// allocatePreviousDue helper used at purchase-creation time — this record
// exists purely so payment method/notes/history aren't lost when a single
// payment gets split across multiple purchases.
const supplierPaymentSchema = new mongoose.Schema({
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier',
    required: true,
  },
  shop: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shop',
    required: true,
  },
  amount: {
    type: Number,
    required: true,
    min: 1,
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'upi', 'mobile_banking', 'due'],
    default: 'cash',
  },
  notes: {
    type: String,
    default: '',
  },
  paidBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  // Which purchase(s) this payment was FIFO-allocated across, for traceability.
  allocations: [{
    purchase: { type: mongoose.Schema.Types.ObjectId, ref: 'Purchase' },
    purchaseNo: String,
    amountApplied: Number,
  }],
}, {
  timestamps: true,
});

supplierPaymentSchema.index({ supplier: 1, createdAt: -1 });
supplierPaymentSchema.index({ shop: 1, createdAt: -1 });

module.exports = mongoose.model('SupplierPayment', supplierPaymentSchema);
