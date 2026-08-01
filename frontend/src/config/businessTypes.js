// Mirrors backend/config/businessTypes.js — keep both in sync (same `key`s
// and module names). Labels are resolved via i18n (`businessTypes.<key>`,
// `units.<key>`) rather than duplicated here, since the strings live in
// locales/en.json and bn.json where the rest of the app's text does.

export const MODULE_KEYS = [
  'barcode', 'batch', 'expiryDate', 'customerDue', 'supplierDue',
  'size', 'color', 'brand', 'serialNumber', 'warranty', 'modelNumber', 'dimensions',
];

const UNIVERSAL_MODULES = { barcode: true, customerDue: true, supplierDue: true };

const emptyModules = () => MODULE_KEYS.reduce((acc, key) => ({ ...acc, [key]: false }), {});

const buildModules = (overrides) => ({ ...emptyModules(), ...UNIVERSAL_MODULES, ...overrides });

// Same 15 entries as the backend catalog (13 spec units + legacy ml/carton
// kept so existing product data never becomes invalid).
export const GLOBAL_UNITS = [
  'piece', 'kg', 'gram', 'meter', 'feet', 'inch', 'liter', 'box',
  'packet', 'roll', 'bag', 'bundle', 'ton', 'ml', 'carton',
].map((key) => ({ key, i18nKey: `units.${key}` }));

export const BUSINESS_TYPES = {
  grocery: {
    i18nKey: 'businessTypes.grocery',
    modules: buildModules({ batch: true, expiryDate: true }),
    defaultUnits: ['piece', 'kg', 'gram', 'liter', 'packet', 'box'],
  },
  garments: {
    i18nKey: 'businessTypes.garments',
    modules: buildModules({ size: true, color: true, brand: true }),
    defaultUnits: ['piece'],
  },
  builders: {
    i18nKey: 'businessTypes.builders',
    modules: buildModules({ dimensions: true }),
    defaultUnits: ['feet', 'meter', 'ton', 'bag'],
  },
  hardware: {
    i18nKey: 'businessTypes.hardware',
    modules: buildModules({ brand: true }),
    defaultUnits: ['piece', 'box', 'packet'],
  },
  electronics: {
    i18nKey: 'businessTypes.electronics',
    modules: buildModules({ serialNumber: true, warranty: true, brand: true, modelNumber: true }),
    defaultUnits: ['piece'],
  },
  machinery: {
    i18nKey: 'businessTypes.machinery',
    modules: buildModules({ serialNumber: true, warranty: true, brand: true, modelNumber: true }),
    defaultUnits: ['piece'],
  },
  stationery: {
    i18nKey: 'businessTypes.stationery',
    modules: buildModules({}),
    defaultUnits: ['piece', 'packet', 'box'],
  },
  furniture: {
    i18nKey: 'businessTypes.furniture',
    modules: buildModules({ brand: true, dimensions: true }),
    defaultUnits: ['piece'],
  },
  cosmetics: {
    i18nKey: 'businessTypes.cosmetics',
    modules: buildModules({ batch: true, expiryDate: true, brand: true }),
    defaultUnits: ['piece', 'box'],
  },
  mobile_shop: {
    i18nKey: 'businessTypes.mobileShop',
    modules: buildModules({ serialNumber: true, warranty: true, brand: true, modelNumber: true }),
    defaultUnits: ['piece'],
  },
  custom: {
    i18nKey: 'businessTypes.custom',
    modules: buildModules({}),
    defaultUnits: ['piece'],
  },
};

export const BUSINESS_TYPE_KEYS = Object.keys(BUSINESS_TYPES);

export const getBusinessTypeDefaults = (key) => BUSINESS_TYPES[key] || BUSINESS_TYPES.grocery;
