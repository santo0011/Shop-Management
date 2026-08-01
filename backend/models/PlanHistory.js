const mongoose = require('mongoose');

const planHistorySchema = new mongoose.Schema({
  plan: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Plan',
    required: true,
  },
  action: {
    type: String,
    enum: ['created', 'updated', 'activated', 'deactivated'],
    required: true,
  },
  changedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  previousValues: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  newValues: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  notes: {
    type: String,
    trim: true,
  },
}, {
  timestamps: true,
});

planHistorySchema.index({ plan: 1, createdAt: -1 });

module.exports = mongoose.model('PlanHistory', planHistorySchema);