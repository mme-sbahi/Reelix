/**
 * auth.js – Centralized authentication utilities for Hypertube frontend.
 *
 * Backend token flow:
 *  - POST /auth/login  → sets HttpOnly cookies (accessToken, refreshToken), returns { user }
 *  - POST /auth/register → sets HttpOnly cookies, returns { user }
 *  - POST /auth/refresh  (cookie: refreshToken) → sets new HttpOnly cookies, returns { success: true }
 *  - POST /auth/logout   (cookie: accessToken)  → clears cookies, returns { success: true }
 *  - GET  /auth/profile  (cookie: accessToken)  → sanitized user object
 *
 * Token storage: HttpOnly cookies (secure, not accessible from JS)
 * User data: localStorage (non-sensitive profile info only)
 */

import { tr } from "../i18n/core.js";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

// ─── Getters ────────────────────────────────────────────────────────────────

export function getStoredUser() {
  try {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function isAuthenticated() {
  return !!getStoredUser();
}

// ─── Storage ────────────────────────────────────────────────────────────────

function saveUser(user) {
  if (user) localStorage.setItem("user", JSON.stringify(user));
}

function clearUser() {
  localStorage.removeItem("user");
}

// ─── API helpers ────────────────────────────────────────────────────────────

/**
 * Authenticated fetch – automatically includes cookies (credentials: 'include').
 * If the request returns 401, attempts one token refresh and retries.
 * If refresh also fails, the session is cleared and the page goes to /auth.
 */
export async function authFetch(url, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers ?? {}),
  };

  let response = await fetch(url, { ...options, headers, credentials: "include" });

  // Try to refresh once on 401
  if (response.status === 401) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      response = await fetch(url, { ...options, headers, credentials: "include" });
    } else {
      // Refresh also failed – force re-login
      clearUser();
      window.dispatchEvent(new CustomEvent("ht:session-expired"));
      throw new Error(tr("auth.err.sessionExpired"));
    }
  }

  return response;
}

// ─── Auth actions ───────────────────────────────────────────────────────────

export async function login(identifier, password) {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ identifier: identifier.trim(), password }),
  });

  const data = await response.json();

  if (!response.ok) {
    const msg = Array.isArray(data?.message)
      ? data.message.join(", ")
      : data?.message || tr("auth.err.loginFailed");
    throw new Error(msg);
  }

  saveUser(data.user);
  return data.user;
}

export async function register(email, password, firstName, lastName, username) {
  const response = await fetch(`${API_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      email: email.trim(),
      password,
      username: username.trim(),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    const msg = Array.isArray(data?.message)
      ? data.message.join(", ")
      : data?.message || tr("auth.err.registerFailed");
    throw new Error(msg);
  }

  saveUser(data.user);
  return data.user;
}

export async function logout() {
  try {
    await fetch(`${API_URL}/auth/logout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });
  } catch {
    // Network error – still clear local session
  }

  clearUser();
}

export async function getProfile() {
  const response = await authFetch(`${API_URL}/auth/profile`);
  if (!response.ok) return null;
  const data = await response.json();
  saveUser(data);
  return data;
}

// ─── Token refresh ──────────────────────────────────────────────────────────

async function tryRefresh() {
  try {
    const response = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });

    if (!response.ok) return false;
    return true;
  } catch {
    return false;
  }
}