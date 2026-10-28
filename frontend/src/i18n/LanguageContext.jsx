import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from "./translations.js";
import {
  STORAGE_KEY,
  getLang,
  normalizeLang,
  setCurrentLang,
  translate,
  translateGenre,
} from "./core.js";
import { authFetch, getStoredUser } from "../utils/auth.js";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

const LanguageContext = createContext(null);

/**
 * Where the language lives:
 *  - localStorage ("ht_lang") → works on the login page, before any account exists
 *  - the user's account (preferredLanguage) → follows them across devices
 *
 * English is the default; the browser's language is deliberately NOT sniffed.
 */
export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => getLang());

  // Keep <html lang="…"> correct for screen readers and browser translation.
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  // Save the choice on the account (silently – the UI has already switched).
  const persistToAccount = useCallback((code) => {
    if (!getStoredUser()) return;

    authFetch(`${API_URL}/users/me`, {
      method: "PATCH",
      body: JSON.stringify({ preferredLanguage: code }),
    })
      .then((res) => {
        if (!res.ok) return;
        const stored = getStoredUser();
        if (stored) {
          localStorage.setItem("user", JSON.stringify({ ...stored, preferredLanguage: code }));
        }
      })
      .catch(() => {
        /* the language still changed locally; it will sync on the next change */
      });
  }, []);

  const setLang = useCallback(
    (code, { persist = true } = {}) => {
      const next = normalizeLang(code);
      setCurrentLang(next);
      setLangState(next);
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        /* storage unavailable – language just won't survive a reload */
      }
      if (persist) persistToAccount(next);
    },
    [persistToAccount]
  );

  /**
   * Call right after a successful login / register / OAuth callback.
   *
   *  - Account has a non-default language (e.g. "fr") → use it.
   *  - Account is on the default ("en") → that is indistinguishable from
   *    "never chose one", so keep what the visitor picked on the login page
   *    and save it to the new account.
   */
  const syncWithUser = useCallback(
    (user) => {
      const accountLang = normalizeLang(user?.preferredLanguage);
      if (accountLang !== DEFAULT_LANGUAGE) {
        setLang(accountLang, { persist: false });
      } else if (getLang() !== DEFAULT_LANGUAGE) {
        persistToAccount(getLang());
      }
    },
    [setLang, persistToAccount]
  );

  const value = useMemo(() => {
    const active = SUPPORTED_LANGUAGES.find((l) => l.code === lang) || SUPPORTED_LANGUAGES[0];
    return {
      lang,
      locale: active.locale,
      languages: SUPPORTED_LANGUAGES,
      setLang,
      syncWithUser,
      t: (key, vars) => translate(lang, key, vars),
      tGenre: (name) => translateGenre(lang, name),
    };
  }, [lang, setLang, syncWithUser]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguage must be used inside <LanguageProvider>");
  }
  return ctx;
}
