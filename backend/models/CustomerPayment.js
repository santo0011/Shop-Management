const mongoose = require('mongoose');

const customerPaymentSchema = new mongoose.Schema({
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
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
    enum: ['cash', 'bank_transfer', 'upi', 'mobile_banking', 'card', 'cheque', 'other'],
    default: 'cash',
  },
  notes: {
    type: String,
    default: '',
  },
  collectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  // Set when this payment was collected at checkout for a specific sale
  // (as opposed to a standalone due collection made afterward).
  sale: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sale',
  },
  // Where the payment originated — used by the Payment History UI.
  source: {
    type: String,
    enum: ['pos', 'sale', 'due_collection'],
    default: 'due_collection',
  },
}, {
  timestamps: true,
});

customerPaymentSchema.index({ customer: 1, createdAt: -1 });
customerPaymentSchema.index({ shop: 1, createdAt: -1 });

module.exports = mongoose.model('CustomerPayment', customerPaymentSchema);