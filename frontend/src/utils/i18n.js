import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import bnTranslations from '../locales/bn.json';
import enTranslations from '../locales/en.json';

// Dedicated localStorage key for language preference
// This is independent of the user object to prevent auth data from overriding it
const LANGUAGE_STORAGE_KEY = 'appLanguage';

export const getSavedLanguage = () => {
  try {
    return localStorage.getItem(LANGUAGE_STORAGE_KEY);
  } catch {
    return null;
  }
};

export const saveLanguage = (lang) => {
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
  } catch (error) {
    console.error('Failed to save language to localStorage:', error);
  }
};

export const removeSavedLanguage = () => {
  try {
    localStorage.removeItem(LANGUAGE_STORAGE_KEY);
  } catch {
    // ignore
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      bn: { translation: bnTranslations },
      en: { translation: enTranslations },
    },
    fallbackLng: 'bn',
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: LANGUAGE_STORAGE_KEY,
    },
  });

export default i18n;