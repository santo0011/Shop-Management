// Powers Custom Quantity selling (POS) — lets a cashier enter a sale in a
// smaller/larger unit than a product's Base Unit (e.g. sell "200 ml" of a
// product whose Base Unit is Litre) and converts it back to the Base Unit
// for pricing and stock deduction. Each family lists its members' value in
// one shared reference unit for that family (grams for weight, millilitres
// for volume, metres for length) — conversion between any two units in the
// same family is just a ratio of those two factors.
const UNIT_FAMILIES = [
  { gram: 1, kg: 1000, ton: 1000000 },
  { ml: 1, liter: 1000 },
  { inch: 0.0254, feet: 0.3048, meter: 1 },
];

const FAMILY_BY_UNIT = UNIT_FAMILIES.reduce((acc, family) => {
  Object.keys(family).forEach((key) => { acc[key] = family; });
  return acc;
}, {});

// Every unit not listed above (piece, box, packet, roll, bag, bundle,
// carton, and any shop-defined custom unit) has no smaller/larger sibling —
// Custom Quantity for those just means "any decimal amount of the Base Unit
// itself" (e.g. 2.5 Bag), so it's its own single-member family.
export const getUnitFamily = (unitKey) => FAMILY_BY_UNIT[unitKey] || { [unitKey]: 1 };

// Returns the list of unit keys a cashier may enter a Custom Quantity sale
// in for the given Base Unit — always includes the Base Unit itself.
export const getCompatibleUnitKeys = (baseUnitKey) => Object.keys(getUnitFamily(baseUnitKey));

// Converts a quantity typed in `fromUnit` into the equivalent quantity in
// `toUnit` (the product's Base Unit). Both units must belong to the same
// family — callers only ever offer compatible units, so this never needs to
// handle a cross-family conversion.
export const convertToBaseUnit = (quantity, fromUnit, toUnit) => {
  const family = getUnitFamily(toUnit);
  const fromFactor = family[fromUnit] ?? 1;
  const toFactor = family[toUnit] ?? 1;
  return (Number(quantity) || 0) * fromFactor / toFactor;
};
