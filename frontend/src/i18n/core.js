/**
 * core.js – translation helpers that do NOT depend on React or on auth.js,
 * so they can be imported from anywhere (including utils/auth.js) without
 * creating a circular import.
 */
import {
  DEFAULT_LANGUAGE,
  SUPPORTED_LANGUAGES,
  translations,
  genreNames,
} from "./translations.js";

export const STORAGE_KEY = "ht_lang";

export function isSupported(code) {
  return SUPPORTED_LANGUAGES.some((l) => l.code === code);
}

/** "fr", "FR", "fr-FR" → "fr". Anything unsupported (e.g. "es") → default. */
export function normalizeLang(code) {
  const short = String(code || "").toLowerCase().slice(0, 2);
  return isSupported(short) ? short : DEFAULT_LANGUAGE;
}

function readStoredLang() {
  try {
    return normalizeLang(localStorage.getItem(STORAGE_KEY));
  } catch {
    return DEFAULT_LANGUAGE;
  }
}

// Current language, kept in sync by <LanguageProvider>.
let currentLang = readStoredLang();

export function getLang() {
  return currentLang;
}

export function setCurrentLang(code) {
  currentLang = normalizeLang(code);
}

/** Look up `key` in `lang`, fall back to English, then to the key itself. */
export function translate(lang, key, vars) {
  const str = translations[lang]?.[key] ?? translations[DEFAULT_LANGUAGE][key] ?? key;
  if (!vars) return str;
  return str.replace(/\{(\w+)\}/g, (match, name) => (vars[name] ?? match));
}

/** Translate using the current language – for non-React code (api helpers, async callbacks). */
export function tr(key, vars) {
  return translate(currentLang, key, vars);
}

export function translateGenre(lang, name) {
  return genreNames[lang]?.[name] ?? name;
}
