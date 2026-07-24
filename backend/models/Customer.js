const mongoose = require('mongoose');

const editHistorySchema = new mongoose.Schema({
  previousName: { type: String },
  newName: { type: String },
  previousPhone: { type: String },
  newPhone: { type: String },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  updatedAt: { type: Date, default: Date.now },
});

const customerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Customer name is required'],
    trim: true,
  },
  nameBn: {
    type: String,
    trim: true,
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
    type: String,
    trim: true,
  },
  state: {
    type: String,
    trim: true,
    default: '',
  },
  gstNumber: {
    type: String,
    trim: true,
    default: '',
  },
  shop: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shop',
    required: true,
  },
  openingBalance: {
    type: Number,
    default: 0,
  },
  totalPurchases: {
    type: Number,
    default: 0,
  },
  totalPaid: {
    type: Number,
    default: 0,
  },
  dueAmount: {
    type: Number,
    default: 0,
  },
  loyaltyPoints: {
    type: Number,
    default: 0,
  },
  totalLoyaltyEarned: {
    type: Number,
    default: 0,
  },
  totalLoyaltyRedeemed: {
    type: Number,
    default: 0,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  editHistory: [editHistorySchema],
}, {
  timestamps: true,
});

module.exports = mongoose.model('Customer', customerSchema);