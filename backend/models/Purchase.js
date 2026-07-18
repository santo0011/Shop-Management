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
  tax: {
    type: Number,
    default: 0,
  },
  total: {
    type: Number,
    required: true,
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
  tax: {
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
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

purchaseSchema.index({ shop: 1, purchaseNo: 1 }, { unique: true });
// A supplier invoice number only needs to be unique per supplier, and is
// optional — the partial filter excludes purchases that left it blank so
// empty strings never collide with each other.
purchaseSchema.index(
  { shop: 1, supplier: 1, supplierInvoiceNo: 1 },
  { unique: true, partialFilterExpression: { supplierInvoiceNo: { $ne: '' } } }
);

module.exports = mongoose.model('Purchase', purchaseSchema);