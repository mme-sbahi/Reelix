import { useState, useEffect } from "react";
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  AtSign,
  ArrowLeft,
  CheckCircle2,
} from "lucide-react";

import Field from "../components/Field.jsx";
import LanguageSwitcher from "../components/LanguageSwitcher.jsx";
import { login, register } from "../utils/auth.js";
import { useLanguage } from "../i18n/LanguageContext.jsx";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

// Google SVG icon
function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" fill="none">
      <path fill="#4285F4" d="M47.5 24.5c0-1.6-.1-3.2-.4-4.7H24v8.9h13.2c-.6 3-2.4 5.6-5 7.3v6h8.1c4.8-4.4 7.2-10.8 7.2-17.5z"/>
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-8.1-6c-2.1 1.4-4.8 2.2-7.8 2.2-6 0-11.1-4-12.9-9.5H2.8v6.2C6.8 42.9 14.8 48 24 48z"/>
      <path fill="#FBBC05" d="M11.1 28.9A14.9 14.9 0 0 1 9.6 24c0-1.7.3-3.3.9-4.8l-.1-.1L2.2 12.9 2.8 13A24 24 0 0 0 0 24c0 3.9.9 7.5 2.8 10.7l8.3-5.8z"/>
      <path fill="#EA4335" d="M24 9.5c3.4 0 6.4 1.2 8.8 3.5l6.6-6.6C35.9 2.4 30.4 0 24 0 14.8 0 6.8 5.1 2.8 13.3l8.3 5.8C12.9 13.5 18 9.5 24 9.5z"/>
    </svg>
  );
}

// 42 icon
function FortyTwoIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 100 100" fill="currentColor">
      <path d="M0 50L25 25L50 50L25 75L0 50ZM50 50L75 25L100 50L75 75L50 50ZM25 75L50 50L75 75L50 100L25 75Z"/>
    </svg>
  );
}

export default function AuthPage({ onEnter }) {
  const { t } = useLanguage();
  const [mode, setMode] = useState("login"); // "login" | "register" | "forgot" | "reset"
  const [showPw, setShowPw] = useState(false);

  // Form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetToken, setResetToken] = useState("");

  // Request state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Handle URL tokens (OAuth callback or Reset Password token)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token") || params.get("resetToken");

    if (token && window.location.pathname.includes("reset-password")) {
      setResetToken(token);
      setMode("reset");
    }

  }, [onEnter]);

  const handleModeChange = (newMode) => {
    setMode(newMode);
    setError("");
    setSuccessMessage("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccessMessage("");
    setLoading(true);

    try {
      if (mode === "login") {
        const user = await login(email, password);
        if (onEnter) onEnter(user);
      } else if (mode === "register") {
        const user = await register(email, password, firstName, lastName, username);
        if (onEnter) onEnter(user);
      } else if (mode === "forgot") {
        if (!email.trim() || !email.includes("@")) {
          throw new Error(t("auth.err.invalidEmail"));
        }
        const res = await fetch(`${API_URL}/auth/forgot-password`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim() }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.message || t("auth.err.resetFailed"));
        }
        setSuccessMessage(t("auth.ok.forgot"));
      } else if (mode === "reset") {
        if (!password || password.length < 8) {
          throw new Error(t("auth.err.pwMin"));
        }
        if (password !== confirmPassword) {
          throw new Error(t("auth.err.pwMatch"));
        }
        const res = await fetch(`${API_URL}/auth/reset-password`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: resetToken, newPassword: password }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.message || t("auth.err.invalidToken"));
        }
        setSuccessMessage(t("auth.ok.reset"));
        setPassword("");
        setConfirmPassword("");
        setTimeout(() => {
          setMode("login");
          setSuccessMessage("");
        }, 3000);
      }
    } catch (err) {
      if (err instanceof TypeError && err.message === "Failed to fetch") {
        setError(t("auth.err.network"));
      } else {
        setError(err.message || t("auth.err.generic"));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = `${API_URL}/auth/google`;
  };

  const handleFortyTwoLogin = () => {
    window.location.href = `${API_URL}/auth/42`;
  };

  return (
    <div className="ht-auth">
      {/* Language picker – the header is hidden on this page */}
      <div style={{ position: "fixed", top: 16, right: 16, zIndex: 5 }}>
        <LanguageSwitcher />
      </div>

      {/* Brand */}
      <div className="ht-auth__brand">
        <div className="ht-auth__marquee-row">
          {new Array(10).fill(0).map((_, i) => (
            <span
              key={i}
              className="ht-bulb"
              style={{ animationDelay: `${i * 0.12}s` }}
            />
          ))}
        </div>

        <h1 className="ht-display ht-auth__title">HYPERTUBE</h1>

        <p className="ht-auth__tag">
          {t("auth.tagline")}
        </p>
      </div>

      {/* Auth Card */}
      <form className="ht-auth__card" onSubmit={handleSubmit}>
        {/* Tabs for login/register */}
        {(mode === "login" || mode === "register") && (
          <div className="ht-tabs">
            <button
              type="button"
              className={`ht-tabs__btn ${mode === "login" ? "is-active" : ""}`}
              onClick={() => handleModeChange("login")}
            >
              {t("auth.tab.login")}
            </button>

            <button
              type="button"
              className={`ht-tabs__btn ${mode === "register" ? "is-active" : ""}`}
              onClick={() => handleModeChange("register")}
            >
              {t("auth.tab.register")}
            </button>
          </div>
        )}

        {/* Forgot Header */}
        {mode === "forgot" && (
          <div style={{ marginBottom: "8px" }}>
            <h3 style={{ fontSize: "18px", fontWeight: "600", color: "var(--ink)", margin: "0 0 6px" }}>
              {t("auth.forgot.title")}
            </h3>
            <p style={{ fontSize: "13px", color: "var(--ink-dim)", margin: 0 }}>
              {t("auth.forgot.desc")}
            </p>
          </div>
        )}

        {/* Reset Header */}
        {mode === "reset" && (
          <div style={{ marginBottom: "8px" }}>
            <h3 style={{ fontSize: "18px", fontWeight: "600", color: "var(--ink)", margin: "0 0 6px" }}>
              {t("auth.reset.title")}
            </h3>
            <p style={{ fontSize: "13px", color: "var(--ink-dim)", margin: 0 }}>
              {t("auth.reset.desc")}
            </p>
          </div>
        )}

        {/* Registration extra fields */}
        {mode === "register" && (
          <>
            <div className="ht-auth__row">
              <Field
                icon={User}
                placeholder={t("auth.firstName")}
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
              <Field
                icon={User}
                placeholder={t("auth.lastName")}
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
            <Field
              icon={AtSign}
              placeholder={t("auth.username")}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </>
        )}

        {/* Email / identifier */}
        {(mode === "login" || mode === "register" || mode === "forgot") && (
          <Field
            icon={Mail}
            placeholder={
              mode === "login"
                ? t("auth.emailOrUsername")
                : t("auth.email")
            }
            type={mode === "login" ? "text" : "email"}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        )}

        {/* Password (for login, register, reset) */}
        {(mode === "login" || mode === "register" || mode === "reset") && (
          <label className="ht-field">
            <Lock size={16} className="ht-field__icon" />
            <input
              className="ht-field__input"
              placeholder={mode === "reset" ? t("auth.newPassword") : t("auth.password")}
              type={showPw ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              className="ht-field__end"
              onClick={() => setShowPw((v) => !v)}
              aria-label={showPw ? t("auth.hidePassword") : t("auth.showPassword")}
            >
              {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </label>
        )}

        {/* Confirm password (for reset) */}
        {mode === "reset" && (
          <label className="ht-field">
            <Lock size={16} className="ht-field__icon" />
            <input
              className="ht-field__input"
              placeholder={t("auth.confirmPassword")}
              type={showPw ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </label>
        )}

        {/* Success Alert */}
        {successMessage && (
          <div
            style={{
              background: "rgba(34, 197, 94, 0.12)",
              border: "1px solid rgba(34, 197, 94, 0.3)",
              color: "#4ade80",
              borderRadius: "8px",
              padding: "10px 14px",
              fontSize: "13px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <CheckCircle2 size={16} />
            {successMessage}
          </div>
        )}

        {/* Error */}
        {error && <div className="ht-auth__error">{error}</div>}

        {/* Forgot password button */}
        {mode === "login" && (
          <button
            type="button"
            className="ht-link"
            onClick={() => handleModeChange("forgot")}
          >
            {t("auth.forgotLink")}
          </button>
        )}

        {/* Back to login button from forgot/reset */}
        {(mode === "forgot" || mode === "reset") && (
          <button
            type="button"
            className="ht-link"
            style={{ display: "flex", alignItems: "center", gap: "4px", alignSelf: "flex-start" }}
            onClick={() => handleModeChange("login")}
          >
            <ArrowLeft size={13} /> {t("auth.backToLogin")}
          </button>
        )}

        {/* Submit button */}
        <button
          type="submit"
          className="ht-btn ht-btn--primary"
          disabled={loading}
        >
          {loading
            ? t("auth.wait")
            : mode === "login"
            ? t("auth.submit.login")
            : mode === "register"
            ? t("auth.submit.register")
            : mode === "forgot"
            ? t("auth.submit.forgot")
            : t("auth.submit.reset")}
        </button>

        {/* OAuth divider & buttons (for login & register) */}
        {(mode === "login" || mode === "register") && (
          <>
            <div className="ht-divider">
              <span>{t("auth.orContinue")}</span>
            </div>

            <div className="ht-auth__row">
              <button
                type="button"
                className="ht-btn ht-btn--ghost"
                onClick={handleFortyTwoLogin}
              >
                <FortyTwoIcon />
                42
              </button>

              <button
                type="button"
                className="ht-btn ht-btn--ghost"
                onClick={handleGoogleLogin}
              >
                <GoogleIcon />
                Google
              </button>
            </div>
          </>
        )}
      </form>
    </div>
  );
}