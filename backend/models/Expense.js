const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  shop: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shop',
    required: true,
  },
  category: {
    type: String,
    required: [true, 'Expense category is required'],
    trim: true,
  },
  categoryBn: {
    type: String,
    trim: true,
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: 0,
  },
  description: {
    type: String,
    trim: true,
  },
  descriptionBn: {
    type: String,
    trim: true,
  },
  expenseDate: {
    type: Date,
    default: Date.now,
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'bank_transfer', 'mobile_banking'],
    default: 'cash',
  },
  reference: {
    type: String,
    trim: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Expense', expenseSchema);