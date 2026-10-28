import { useLanguage } from "../i18n/LanguageContext.jsx";

export default function Footer() {
  const { t } = useLanguage();
  const year = new Date().getFullYear();

  return (
    <footer className="ht-footer" style={{
      borderTop: "1px solid var(--line, rgba(255, 255, 255, 0.08))",
      background: "var(--void, #0b0d10)",
      padding: "24px 32px",
      marginTop: "auto",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      flexWrap: "wrap",
      gap: "12px",
      fontSize: "12.5px",
      color: "var(--ink-dim, #71717a)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <span style={{
          fontWeight: 700,
          color: "var(--marquee, #e8a33d)",
          letterSpacing: "0.08em",
          fontFamily: "var(--display, serif)",
        }}>
          HYPERTUBE
        </span>
        <span>&copy; {year} · {t("footer.project")}</span>
      </div>

      <div style={{ display: "flex", gap: "18px", alignItems: "center" }}>
        <span style={{ fontFamily: "var(--mono, monospace)", fontSize: "11px" }}>
          {t("footer.streaming")}
        </span>
      </div>
    </footer>
  );
}
