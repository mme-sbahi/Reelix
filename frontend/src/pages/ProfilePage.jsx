import { useEffect, useState } from "react";
import {
  User,
  Mail,
  Globe,
  Lock,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Calendar,
  AtSign,
  Save,
  Image,
} from "lucide-react";
import Field from "../components/Field.jsx";
import ReelSpinner from "../components/ReelSpinner.jsx";
import { authFetch, getStoredUser } from "../utils/auth.js";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { tr } from "../i18n/core.js";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

function getInitials(user) {
  if (!user) return "?";
  if (user.firstName || user.lastName) {
    const fn = (user.firstName || "").trim()[0] || "";
    const ln = (user.lastName || "").trim()[0] || "";
    if (fn || ln) return (fn + ln).toUpperCase();
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

export default function ProfilePage({ userId, currentUser, onUpdateUser, onBack }) {
  const { t, lang, setLang, languages, locale } = useLanguage();
  const activeUser = currentUser || getStoredUser();
  const isOwner = !userId || userId === activeUser?.id || userId === "me";

  const [userData, setUserData] = useState(isOwner ? activeUser : null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Editable Form fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [password, setPassword] = useState("");

  // Load profile from backend
  useEffect(() => {
    let isMounted = true;
    setErrorMessage("");

    const fetchProfile = async () => {
      setLoading(true);
      try {
        if (isOwner) {
          const res = await authFetch(`${API_URL}/users/me`);
          if (res.ok) {
            const data = await res.json();
            if (isMounted) {
              setUserData(data);
              setFirstName(data.firstName || "");
              setLastName(data.lastName || "");
              setUsername(data.username || "");
              setEmail(data.email || "");
              setAvatarUrl(data.avatarUrl || "");
            }
          } else if (activeUser) {
            if (isMounted) {
              setUserData(activeUser);
              setFirstName(activeUser.firstName || "");
              setLastName(activeUser.lastName || "");
              setUsername(activeUser.username || "");
              setEmail(activeUser.email || "");
              setAvatarUrl(activeUser.avatarUrl || "");
            }
          }
        } else {
          const res = await authFetch(`${API_URL}/users/${userId}`);
          if (res.ok) {
            const data = await res.json();
            if (isMounted) setUserData(data);
          } else {
            if (isMounted) setErrorMessage(tr("profile.notFound"));
          }
        }
      } catch (err) {
        if (isMounted) setErrorMessage(err.message || tr("profile.err.load"));
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchProfile();
    return () => {
      isMounted = false;
    };
  }, [userId, isOwner]);

  const handleSaveChanges = async (e) => {
    if (e) e.preventDefault();
    setErrorMessage("");
    setSaveSuccess(false);

    // Client-side simple validation
    if (!username.trim()) {
      setErrorMessage(t("profile.err.usernameEmpty"));
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setErrorMessage(t("profile.err.email"));
      return;
    }
    if (password && password.trim().length < 8) {
      setErrorMessage(t("profile.err.pwMin"));
      return;
    }

    setSaving(true);

    try {
      const payload = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        username: username.trim(),
        email: email.trim(),
        avatarUrl: avatarUrl.trim(),
        preferredLanguage: lang,
      };

      if (password.trim()) {
        payload.password = password.trim();
      }

      const res = await authFetch(`${API_URL}/users/me`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        const msg = Array.isArray(data?.message)
          ? data.message.join(", ")
          : data?.message || t("profile.err.save");
        throw new Error(msg);
      }

      // Update state & cache
      setUserData(data);
      setPassword("");
      if (onUpdateUser) onUpdateUser(data);

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err) {
      setErrorMessage(err.message || t("profile.err.saveGeneric"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="ht-profile" style={{ display: "flex", justifyContent: "center", padding: "80px 0" }}>
        <ReelSpinner size={44} label={t("profile.loading")} />
      </div>
    );
  }

  if (!userData && errorMessage) {
    return (
      <div className="ht-profile">
        <p className="ht-inkDim">{errorMessage}</p>
        <button className="ht-btn ht-btn--ghost" onClick={onBack}>
          <ArrowLeft size={14} /> {t("profile.backToLibrary")}
        </button>
      </div>
    );
  }

  const initials = getInitials(userData);
  const displayName =
    (userData?.firstName || userData?.lastName
      ? `${userData.firstName || ""} ${userData.lastName || ""}`.trim()
      : null) ||
    userData?.fullName ||
    userData?.username ||
    userData?.email ||
    t("profile.user");

  const memberSince = userData?.createdAt
    ? new Date(userData.createdAt).toLocaleDateString(locale, {
        month: "short",
        year: "numeric",
      })
    : t("profile.recently");

  return (
    <div className="ht-profile">
      <button className="ht-back" onClick={onBack}>
        <ArrowLeft size={14} /> {t("profile.back")}
      </button>

      {/* Profile Header Banner */}
      <div className="ht-profile__head">
        <div
          className="ht-avatar ht-avatar--big"
          style={{
            background: userData?.avatarUrl
              ? undefined
              : "linear-gradient(135deg, rgba(229, 9, 20, 0.2), rgba(229, 9, 20, 0.05))",
            backgroundImage: userData?.avatarUrl ? `url(${userData.avatarUrl})` : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
            color: "#e50914",
            border: "1px solid rgba(229, 9, 20, 0.3)",
          }}
        >
          {!userData?.avatarUrl && initials}
        </div>
        <div>
          <h2 className="ht-display">{displayName}</h2>
          <p className="ht-inkDim">
            {userData?.username ? `@${userData.username} · ` : ""}
            <Calendar size={13} style={{ display: "inline", verticalAlign: "-2px", marginRight: "4px" }} />
            {t("profile.memberSince", { date: memberSince })}
          </p>
        </div>

        {isOwner && (
          <div style={{ display: "flex", gap: "10px", alignItems: "center", marginLeft: "auto" }}>
            <button
              type="button"
              className="ht-btn ht-btn--primary"
              onClick={handleSaveChanges}
              disabled={saving}
              style={{ display: "flex", alignItems: "center", gap: "6px" }}
            >
              <Save size={15} />
              {saving ? t("profile.saving") : t("profile.save")}
            </button>
          </div>
        )}
      </div>

      {/* Success Notification */}
      {saveSuccess && (
        <div
          style={{
            background: "rgba(34, 197, 94, 0.12)",
            border: "1px solid rgba(34, 197, 94, 0.3)",
            color: "#4ade80",
            borderRadius: "8px",
            padding: "12px 16px",
            marginBottom: "20px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            fontSize: "14px",
          }}
        >
          <CheckCircle2 size={18} />
          {t("profile.saved")}
        </div>
      )}

      {/* Error Notification */}
      {errorMessage && (
        <div
          style={{
            background: "rgba(239, 68, 68, 0.12)",
            border: "1px solid rgba(239, 68, 68, 0.35)",
            color: "#f87171",
            borderRadius: "8px",
            padding: "12px 16px",
            marginBottom: "20px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            fontSize: "14px",
          }}
        >
          <AlertCircle size={18} />
          {errorMessage}
        </div>
      )}

      {/* Profile Form (Owner) or Public Readonly View (Viewer) */}
      {isOwner ? (
        <form className="ht-panel ht-profile__form" onSubmit={handleSaveChanges}>
          <div className="ht-auth__row">
            <div>
              <label style={{ fontSize: "12px", color: "var(--ink-dim)", marginBottom: "6px", display: "block" }}>
                {t("profile.firstName")}
              </label>
              <Field
                icon={User}
                value={firstName}
                placeholder={t("profile.ph.firstName")}
                onChange={(e) => {
                  setFirstName(e.target.value);
                  setErrorMessage("");
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: "12px", color: "var(--ink-dim)", marginBottom: "6px", display: "block" }}>
                {t("profile.lastName")}
              </label>
              <Field
                icon={User}
                value={lastName}
                placeholder={t("profile.ph.lastName")}
                onChange={(e) => {
                  setLastName(e.target.value);
                  setErrorMessage("");
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: "12px", color: "var(--ink-dim)", marginBottom: "6px", display: "block" }}>
              {t("profile.username")}
            </label>
            <Field
              icon={AtSign}
              value={username}
              placeholder={t("profile.ph.username")}
              onChange={(e) => {
                setUsername(e.target.value);
                setErrorMessage("");
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: "12px", color: "var(--ink-dim)", marginBottom: "6px", display: "block" }}>
              {t("profile.email")}
            </label>
            <Field
              icon={Mail}
              type="email"
              value={email}
              placeholder={t("profile.ph.email")}
              onChange={(e) => {
                setEmail(e.target.value);
                setErrorMessage("");
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: "12px", color: "var(--ink-dim)", marginBottom: "6px", display: "block" }}>
              {t("profile.avatar")}
            </label>
            <Field
              icon={Image}
              value={avatarUrl}
              placeholder="https://example.com/avatar.jpg"
              onChange={(e) => {
                setAvatarUrl(e.target.value);
                setErrorMessage("");
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: "12px", color: "var(--ink-dim)", marginBottom: "6px", display: "block" }}>
              {t("profile.password")}
            </label>
            <Field
              icon={Lock}
              type="password"
              value={password}
              placeholder={t("profile.ph.password")}
              onChange={(e) => {
                setPassword(e.target.value);
                setErrorMessage("");
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: "12px", color: "var(--ink-dim)", marginBottom: "6px", display: "block" }}>
              {t("profile.language")}
            </label>
            <label className="ht-field">
              <Globe size={16} className="ht-field__icon" />
              <select
                className="ht-field__input"
                value={lang}
                onChange={(e) => {
                  setLang(e.target.value);
                  setErrorMessage("");
                }}
              >
                {languages.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.label} ({l.short})
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div style={{ marginTop: "12px" }}>
            <p className="ht-profile__privacy-note" style={{ margin: 0 }}>
              <Lock size={12} /> {t("profile.privacy")}
            </p>
          </div>
        </form>
      ) : (
        <div className="ht-panel ht-profile__readonly" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div className="ht-profile__readonly-row" style={{ marginTop: 0 }}>
            {userData?.username && (
              <span>
                <strong>{t("profile.ro.username")}</strong> @{userData.username}
              </span>
            )}
            {userData?.firstName && (
              <span>
                <strong>{t("profile.ro.firstName")}</strong> {userData.firstName}
              </span>
            )}
            {userData?.lastName && (
              <span>
                <strong>{t("profile.ro.lastName")}</strong> {userData.lastName}
              </span>
            )}
            <span>
              <strong>{t("profile.ro.memberSince")}</strong> {memberSince}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
