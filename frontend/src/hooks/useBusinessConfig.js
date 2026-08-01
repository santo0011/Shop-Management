import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { GLOBAL_UNITS, getBusinessTypeDefaults } from '../config/businessTypes';

// Single source every page reads business-type config from — merges the
// selected business type's recommended modules with this shop's own
// settings.enabledModules overrides, and combines the global unit catalog
// with the shop's custom units. Replaces the previously duplicated
// hardcoded `units` arrays in Products.jsx / Purchases.jsx.
const useBusinessConfig = () => {
  const myShop = useSelector((state) => state.shop.myShop);
  const { t, i18n } = useTranslation();
  const isBn = i18n?.language === 'bn';

  return useMemo(() => {
    const businessType = myShop?.businessType || 'grocery';
    const defaults = getBusinessTypeDefaults(businessType);
    // Explicit per-shop toggles win over the business type's recommended
    // defaults. Only keys the shop has actually saved a real boolean for
    // count as "explicit" — a module key that's `undefined` (never touched,
    // e.g. a shop that predates this feature) must fall through to the
    // business type default rather than being spread in as a false-y value.
    const shopModules = myShop?.settings?.enabledModules || {};
    const explicitOverrides = Object.fromEntries(
      Object.entries(shopModules).filter(([, v]) => v !== undefined)
    );
    const modules = { ...defaults.modules, ...explicitOverrides };

    const globalUnits = GLOBAL_UNITS.map((u) => ({ value: u.key, label: t(u.i18nKey) }));
    const customUnits = (myShop?.settings?.customUnits || []).map((u) => ({
      value: u.key,
      label: (isBn && u.labelBn) ? u.labelBn : u.label,
    }));

    return {
      businessType,
      modules,
      units: [...globalUnits, ...customUnits],
    };
  }, [myShop, t, isBn]);
};

export default useBusinessConfig;
