const { BUSINESS_TYPES, BUSINESS_TYPE_KEYS } = require('../config/businessTypes');

// @desc    Get all business types
// @route   GET /api/business-types
const getBusinessTypes = async (req, res) => {
  try {
    const types = BUSINESS_TYPE_KEYS.map((key) => ({
      key,
      name: BUSINESS_TYPES[key].label,
      nameBn: BUSINESS_TYPES[key].labelBn,
      active: true, // All configured types are active
      modules: BUSINESS_TYPES[key].modules,
      defaultUnits: BUSINESS_TYPES[key].defaultUnits,
      defaultCategoriesCount: (BUSINESS_TYPES[key].defaultCategories || []).length,
    }));
    res.json(types);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get business type by key
// @route   GET /api/business-types/:key
const getBusinessType = async (req, res) => {
  try {
    const { key } = req.params;
    const type = BUSINESS_TYPES[key];
    if (!type) {
      return res.status(404).json({ message: 'Business type not found' });
    }
    res.json({ key, name: type.label, nameBn: type.labelBn, ...type });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getBusinessTypes, getBusinessType };