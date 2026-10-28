import { useEffect, useRef, useState } from "react";
import { Globe, ChevronDown, Check } from "lucide-react";
import { useLanguage } from "../i18n/LanguageContext.jsx";

export default function LanguageSwitcher() {
  const { lang, setLang, languages, t } = useLanguage();
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  // Close on outside click or Escape.
  useEffect(() => {
    if (!open) return undefined;

    const onMouseDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    const onKeyDown = (e) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const current = languages.find((l) => l.code === lang) || languages[0];

  return (
    <div className="ht-avatar-menu" ref={rootRef}>
      <button
        type="button"
        className="ht-nav__lang"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t("lang.label")}
      >
        <Globe size={14} /> {current.short} <ChevronDown size={12} />
      </button>

      {open && (
        <div className="ht-avatar-menu__pop" role="menu" style={{ top: 38, minWidth: 140 }}>
          {languages.map((l) => {
            const active = l.code === lang;
            return (
              <button
                key={l.code}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                onClick={() => {
                  setLang(l.code);
                  setOpen(false);
                }}
                style={{
                  justifyContent: "space-between",
                  color: active ? "var(--marquee)" : undefined,
                }}
              >
                <span>{l.label}</span>
                {active && <Check size={14} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
