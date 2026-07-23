const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  shop: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shop',
    required: true,
  },
  plan: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Plan',
    required: true,
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    required: true,
  },
  status: {
    type: String,
    enum: ['active', 'queued', 'expired', 'cancelled'],
    default: 'active',
  },
  amount: {
    type: Number,
    required: true,
  },
  discount: {
    type: Number,
    default: 0,
  },
  totalAmount: {
    type: Number,
    required: true,
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'bank_transfer', 'mobile_banking'],
    default: 'cash',
  },
  transactionId: {
    type: String,
  },
  daysCarriedForward: {
    type: Number,
    default: 0,
  },
  notes: {
    type: String,
  },
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  activatedAt: {
    type: Date,
  },
  cancelledAt: {
    type: Date,
  },
  cancellationReason: {
    type: String,
  },
  previousSubscription: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subscription',
  },
  nextSubscription: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subscription',
  },
  // Timeline events
  timeline: [{
    event: {
      type: String,
      enum: ['assigned', 'activated', 'renewed', 'cancelled', 'expired', 'queued'],
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    details: String,
    by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  }],
}, {
  timestamps: true,
});

// Indexes
subscriptionSchema.index({ shop: 1, status: 1, endDate: 1 });
subscriptionSchema.index({ status: 1, endDate: 1 });
subscriptionSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Subscription', subscriptionSchema);