const mongoose = require('mongoose');

const purchaseItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  batchNumber: {
    type: String,
    trim: true,
    default: '',
  },
  expiryDate: {
    type: Date,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  unit: {
    type: String,
    required: true,
  },
  purchasePrice: {
    type: Number,
    required: true,
  },
  sellingPrice: {
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
  // Cumulative quantity of this line item returned to the supplier so far.
  returnedQty: {
    type: Number,
    default: 0,
  },
});

const returnItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
  },
  productName: {
    type: String,
    default: '',
  },
  quantity: {
    type: Number,
    required: true,
  },
  returnValue: {
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
  totalReturnValue: {
    type: Number,
    default: 0,
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

const purchaseSchema = new mongoose.Schema({
  shop: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shop',
    required: true,
  },
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier',
    required: true,
  },
  purchaseNo: {
    type: String,
    required: true,
  },
  supplierInvoiceNo: {
    type: String,
    trim: true,
    default: '',
  },
  purchaseDate: {
    type: Date,
    default: Date.now,
  },
  items: [purchaseItemSchema],
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
  shipping: {
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
    default: 'unpaid',
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'bank_transfer', 'mobile_banking', 'due'],
    default: 'cash',
  },
  notes: {
    type: String,
  },
  // Photo/scan of the supplier's paper invoice, stored as a data URI
  // (this app has no file-storage/upload infra — see Purchase controller).
  invoiceImage: {
    type: String,
    default: '',
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  // Snapshot of the supplier's outstanding due immediately before this
  // purchase was created, and (if the user opted in) how this purchase's
  // payment was applied against those older invoices, oldest first.
  // NOTE: there is currently no DELETE endpoint for purchases. If one is
  // added, it must reverse these allocations (or refuse to delete a
  // purchase that appears here as source or target) — otherwise
  // Supplier.dueAmount and these records will silently desync.
  previousDueIncluded: {
    type: Boolean,
    default: false,
  },
  previousDueAmountAtCreation: {
    type: Number,
    default: 0,
  },
  previousDueAllocations: [{
    _id: false,
    purchase: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Purchase',
    },
    purchaseNo: String,
    amountApplied: Number,
  }],
  // Products returned to the supplier after this purchase, oldest first.
  // Mirrors Sale.returns but inverted: stock leaves (not re-enters) on a
  // purchase return, and it reduces what the shop owes the supplier rather
  // than what's refunded to a customer. NOTE: does not interact with
  // previousDueAllocations above — a return adjusts this purchase's own
  // totals only, it does not retroactively undo FIFO allocations already
  // applied to/from other purchases.
  returns: [returnEntrySchema],
}, {
  timestamps: true,
});

// ─── Indexes for performance ──────────────────────────────────
purchaseSchema.index({ shop: 1, purchaseDate: -1 });
purchaseSchema.index({ shop: 1, purchaseNo: 1 }, { unique: true });
purchaseSchema.index(
  { shop: 1, supplier: 1, supplierInvoiceNo: 1 },
  { unique: true, partialFilterExpression: { supplierInvoiceNo: { $ne: '' } } }
);

module.exports = mongoose.model('Purchase', purchaseSchema);