// Central catalog for multi-business configuration. Mirrored (by `key` and
// module names) at frontend/src/config/businessTypes.js for UI rendering —
// keep both in sync when adding/changing a business type.

const MODULE_KEYS = [
  'barcode', 'batch', 'expiryDate', 'customerDue', 'supplierDue',
  'size', 'color', 'brand', 'serialNumber', 'warranty', 'modelNumber', 'dimensions',
];

// Always on for every business type — core, load-bearing ledger/scan features.
const UNIVERSAL_MODULES = { barcode: true, customerDue: true, supplierDue: true };

const emptyModules = () => MODULE_KEYS.reduce((acc, key) => ({ ...acc, [key]: false }), {});

const buildModules = (overrides) => ({ ...emptyModules(), ...UNIVERSAL_MODULES, ...overrides });

// 13 global units per spec, plus `ml`/`carton` already used by existing live
// product data — kept so no existing product's unit value becomes invalid.
const GLOBAL_UNITS = [
  { key: 'piece', label: 'Piece', labelBn: 'পিস' },
  { key: 'kg', label: 'Kg', labelBn: 'কেজি' },
  { key: 'gram', label: 'Gram', labelBn: 'গ্রাম' },
  { key: 'meter', label: 'Meter', labelBn: 'মিটার' },
  { key: 'feet', label: 'Feet', labelBn: 'ফুট' },
  { key: 'inch', label: 'Inch', labelBn: 'ইঞ্চি' },
  { key: 'liter', label: 'Liter', labelBn: 'লিটার' },
  { key: 'box', label: 'Box', labelBn: 'বক্স' },
  { key: 'packet', label: 'Packet', labelBn: 'প্যাকেট' },
  { key: 'roll', label: 'Roll', labelBn: 'রোল' },
  { key: 'bag', label: 'Bag', labelBn: 'ব্যাগ' },
  { key: 'bundle', label: 'Bundle', labelBn: 'বান্ডিল' },
  { key: 'ton', label: 'Ton', labelBn: 'টন' },
  { key: 'ml', label: 'Milliliter', labelBn: 'মিলিলিটার' },
  { key: 'carton', label: 'Carton', labelBn: 'কার্টন' },
];

const GLOBAL_UNIT_KEYS = GLOBAL_UNITS.map((u) => u.key);

const BUSINESS_TYPES = {
  grocery: {
    label: 'Grocery Store',
    labelBn: 'মুদি দোকান',
    modules: buildModules({ batch: true, expiryDate: true }),
    defaultUnits: ['piece', 'kg', 'gram', 'liter', 'packet', 'box'],
    defaultCategories: [
      { name: 'Grains & Cereals', nameBn: 'শস্য ও দানা' },
      { name: 'Beverages', nameBn: 'পানীয়' },
      { name: 'Snacks', nameBn: 'নাস্তা' },
      { name: 'Dairy', nameBn: 'দুগ্ধজাত পণ্য' },
      { name: 'Vegetables & Fruits', nameBn: 'শাকসবজি ও ফল' },
      { name: 'Household', nameBn: 'গৃহস্থালি' },
    ],
  },
  garments: {
    label: 'Garments',
    labelBn: 'পোশাক',
    modules: buildModules({ size: true, color: true, brand: true }),
    defaultUnits: ['piece'],
    defaultCategories: [
      { name: "Men's Wear", nameBn: 'পুরুষদের পোশাক' },
      { name: "Women's Wear", nameBn: 'মহিলাদের পোশাক' },
      { name: "Kids' Wear", nameBn: 'শিশুদের পোশাক' },
      { name: 'Footwear', nameBn: 'জুতা' },
      { name: 'Accessories', nameBn: 'আনুষাঙ্গিক' },
    ],
  },
  builders: {
    label: 'Builders & Construction',
    labelBn: 'নির্মাণ সামগ্রী',
    modules: buildModules({ dimensions: true }),
    defaultUnits: ['feet', 'meter', 'ton', 'bag'],
    defaultCategories: [
      { name: 'Cement', nameBn: 'সিমেন্ট' },
      { name: 'Rod (Steel)', nameBn: 'রড' },
      { name: 'Sand & Aggregate', nameBn: 'বালি ও খোয়া' },
      { name: 'Brick & Block', nameBn: 'ইট ও ব্লক' },
      { name: 'Tiles', nameBn: 'টাইলস' },
      { name: 'Paint', nameBn: 'রং' },
    ],
  },
  hardware: {
    label: 'Hardware',
    labelBn: 'হার্ডওয়্যার',
    modules: buildModules({ brand: true }),
    defaultUnits: ['piece', 'box', 'packet'],
    defaultCategories: [
      { name: 'Hand Tools', nameBn: 'হাতিয়ার' },
      { name: 'Fasteners & Fittings', nameBn: 'ফাস্টেনার ও ফিটিংস' },
      { name: 'Electrical', nameBn: 'ইলেকট্রিক্যাল' },
      { name: 'Plumbing', nameBn: 'প্লাম্বিং' },
      { name: 'Paint & Chemicals', nameBn: 'রং ও রাসায়নিক' },
    ],
  },
  electronics: {
    label: 'Electronics',
    labelBn: 'ইলেকট্রনিক্স',
    modules: buildModules({ serialNumber: true, warranty: true, brand: true, modelNumber: true }),
    defaultUnits: ['piece'],
    defaultCategories: [
      { name: 'TV & Audio', nameBn: 'টিভি ও অডিও' },
      { name: 'Refrigerator & AC', nameBn: 'ফ্রিজ ও এসি' },
      { name: 'Kitchen Appliances', nameBn: 'রান্নাঘরের যন্ত্রপাতি' },
      { name: 'Small Appliances', nameBn: 'ছোট যন্ত্রপাতি' },
      { name: 'Accessories', nameBn: 'আনুষাঙ্গিক' },
    ],
  },
  machinery: {
    label: 'Machinery & Tools',
    labelBn: 'যন্ত্রপাতি ও সরঞ্জাম',
    modules: buildModules({ serialNumber: true, warranty: true, brand: true, modelNumber: true }),
    defaultUnits: ['piece'],
    defaultCategories: [
      { name: 'Power Tools', nameBn: 'পাওয়ার টুলস' },
      { name: 'Hand Tools', nameBn: 'হাতিয়ার' },
      { name: 'Spare Parts', nameBn: 'যন্ত্রাংশ' },
      { name: 'Safety Equipment', nameBn: 'নিরাপত্তা সরঞ্জাম' },
    ],
  },
  stationery: {
    label: 'Stationery',
    labelBn: 'স্টেশনারি',
    modules: buildModules({}),
    defaultUnits: ['piece', 'packet', 'box'],
    defaultCategories: [
      { name: 'Books & Notebooks', nameBn: 'বই ও খাতা' },
      { name: 'Pens & Pencils', nameBn: 'কলম ও পেন্সিল' },
      { name: 'Office Supplies', nameBn: 'অফিস সামগ্রী' },
      { name: 'Art & Craft', nameBn: 'শিল্প ও কারুকাজ' },
    ],
  },
  furniture: {
    label: 'Furniture',
    labelBn: 'আসবাবপত্র',
    modules: buildModules({ brand: true, dimensions: true }),
    defaultUnits: ['piece'],
    defaultCategories: [
      { name: 'Living Room', nameBn: 'লিভিং রুম' },
      { name: 'Bedroom', nameBn: 'শোবার ঘর' },
      { name: 'Office Furniture', nameBn: 'অফিস ফার্নিচার' },
      { name: 'Outdoor', nameBn: 'আউটডোর' },
      { name: 'Storage', nameBn: 'স্টোরেজ' },
    ],
  },
  cosmetics: {
    label: 'Cosmetics',
    labelBn: 'কসমেটিক্স',
    modules: buildModules({ batch: true, expiryDate: true, brand: true }),
    defaultUnits: ['piece', 'box'],
    defaultCategories: [
      { name: 'Skincare', nameBn: 'ত্বকের যত্ন' },
      { name: 'Haircare', nameBn: 'চুলের যত্ন' },
      { name: 'Makeup', nameBn: 'মেকআপ' },
      { name: 'Fragrance', nameBn: 'সুগন্ধি' },
      { name: 'Personal Care', nameBn: 'ব্যক্তিগত যত্ন' },
    ],
  },
  mobile_shop: {
    label: 'Mobile Shop',
    labelBn: 'মোবাইল শপ',
    modules: buildModules({ serialNumber: true, warranty: true, brand: true, modelNumber: true }),
    defaultUnits: ['piece'],
    defaultCategories: [
      { name: 'Smartphones', nameBn: 'স্মার্টফোন' },
      { name: 'Feature Phones', nameBn: 'ফিচার ফোন' },
      { name: 'Accessories', nameBn: 'আনুষাঙ্গিক' },
      { name: 'Tablets', nameBn: 'ট্যাবলেট' },
      { name: 'Spare Parts', nameBn: 'যন্ত্রাংশ' },
    ],
  },
  custom: {
    label: 'Custom Business',
    labelBn: 'কাস্টম ব্যবসা',
    modules: buildModules({}),
    defaultUnits: ['piece'],
    defaultCategories: [],
  },
};

const BUSINESS_TYPE_KEYS = Object.keys(BUSINESS_TYPES);

const getBusinessTypeDefaults = (key) => BUSINESS_TYPES[key] || BUSINESS_TYPES.grocery;

module.exports = {
  MODULE_KEYS,
  GLOBAL_UNITS,
  GLOBAL_UNIT_KEYS,
  BUSINESS_TYPES,
  BUSINESS_TYPE_KEYS,
  getBusinessTypeDefaults,
};
