const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

async function request(endpoint, options = {}) {
  const response = await fetch(`${API_URL}${endpoint}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      data?.message?.toString() || "Something went wrong"
    );
  }

  return data;
}

export const authApi = {
  register: (user) =>
    request("/auth/register", {
      method: "POST",
      body: JSON.stringify(user),
    }),

  login: (credentials) =>
    request("/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    }),

  profile: (accessToken) =>
    request("/auth/profile", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }),

  refresh: (refreshToken) =>
    request("/auth/refresh", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${refreshToken}`,
      },
    }),

  logout: (accessToken) =>
    request("/auth/logout", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }),
};