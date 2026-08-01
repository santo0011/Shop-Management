const mongoose = require('mongoose');

const globalSettingSchema = new mongoose.Schema({
  companyName: {
    type: String,
    default: '',
    trim: true,
  },
  appName: {
    type: String,
    default: 'GSMS',
    trim: true,
  },
  currency: {
    type: String,
    default: 'INR',
    trim: true,
  },
  timezone: {
    type: String,
    default: 'Asia/Kolkata',
    trim: true,
  },
  dateFormat: {
    type: String,
    default: 'DD/MM/YYYY',
    trim: true,
  },
  taxName: {
    type: String,
    default: 'GST',
    trim: true,
  },
  taxRate: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  logo: {
    type: String,
    default: '',
  },
  favicon: {
    type: String,
    default: '',
  },
  primaryColor: {
    type: String,
    default: '#6C63FF',
  },
  secondaryColor: {
    type: String,
    default: '#00D9A6',
  },
}, {
  timestamps: true,
});

// Ensure only one settings document exists
globalSettingSchema.statics.getSettings = async function () {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

module.exports = mongoose.model('GlobalSetting', globalSettingSchema);