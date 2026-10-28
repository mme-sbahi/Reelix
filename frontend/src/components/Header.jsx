import { Search, User, LogOut } from "lucide-react";
import LanguageSwitcher from "./LanguageSwitcher.jsx";
import { useLanguage } from "../i18n/LanguageContext.jsx";

function Logo({ onClick }) {
  return (
    <button className="ht-logo" onClick={onClick}>
      <span className="ht-logo__lamp" />
      HYPERTUBE
    </button>
  );
}

export function getInitials(user) {
  if (!user) return "?";
  const first = (user.firstName || "").trim();
  const last = (user.lastName || "").trim();
  if (first || last) {
    const f = first ? first[0] : "";
    const l = last ? last[0] : "";
    return (f + l).toUpperCase() || (first.slice(0, 2) || last.slice(0, 2)).toUpperCase();
  }
  if (user.fullName) {
    const parts = user.fullName.trim().split(" ");
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : parts[0].slice(0, 2).toUpperCase();
  }
  if (user.username) return user.username.slice(0, 2).toUpperCase();
  if (user.email) return user.email.slice(0, 2).toUpperCase();
  return "U";
}

export default function Header({
  page,
  setPage,
  query,
  setQuery,
  menuOpen,
  setMenuOpen,
  onOpenOwnProfile,
  onLogout,
  user,
}) {
  const { t } = useLanguage();
  const initials = getInitials(user);
  const displayName =
    (user?.firstName ? `${user.firstName} ${user.lastName || ""}`.trim() : null) ||
    user?.fullName ||
    user?.username ||
    user?.email ||
    t("nav.account");

  return (
    <header className="ht-header">
      <Logo onClick={() => setPage("library")} />

      {page === "library" && (
        <div className="ht-search">
          <Search size={16} className="ht-search__icon" />
          <input
            className="ht-search__input"
            placeholder={t("nav.search")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      )}

      <nav className="ht-nav">
        <button
          className={`ht-nav__link ${page === "library" ? "is-active" : ""}`}
          onClick={() => setPage("library")}
        >
          {t("nav.library")}
        </button>

        <LanguageSwitcher />

        <div className="ht-avatar-menu">
          <button
            className="ht-avatar"
            onClick={() => setMenuOpen((v) => !v)}
            title={displayName}
            style={
              user?.avatarUrl
                ? { backgroundImage: `url(${user.avatarUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
                : {}
            }
          >
            {!user?.avatarUrl && initials}
          </button>

          {menuOpen && (
            <div className="ht-avatar-menu__pop">
              <div
                style={{
                  padding: "8px 12px 4px",
                  fontSize: "12px",
                  color: "var(--ink-dim)",
                  borderBottom: "1px solid var(--glass)",
                  marginBottom: "4px",
                  pointerEvents: "none",
                }}
              >
                {displayName}
              </div>

              <button
                onClick={() => {
                  onOpenOwnProfile?.();
                  setMenuOpen(false);
                }}
              >
                <User size={14} /> {t("nav.profile")}
              </button>

              <button
                onClick={async () => {
                  await onLogout?.();
                }}
                style={{ color: "var(--accent-err, #f87171)" }}
              >
                <LogOut size={14} /> {t("nav.logout")}
              </button>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}
