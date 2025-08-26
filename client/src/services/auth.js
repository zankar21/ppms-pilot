// client/src/services/auth.js
import { api } from "./api";

const KEY = "ppms_jwt";
const USER_KEY = "ppms_user";

/** Save token + user in localStorage */
export function setAuth({ token, user }) {
  if (token) localStorage.setItem(KEY, token);
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
}

/** Clear auth info */
export function clearAuth() {
  localStorage.removeItem(KEY);
  localStorage.removeItem(USER_KEY);
}

/** Get JWT */
export function getToken() {
  return localStorage.getItem(KEY);
}

/** Get cached user */
export function getUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY));
  } catch {
    return null;
  }
}

/** Check role (helper) */
export function hasRole(required) {
  const user = getUser();
  if (!user?.role) return false;
  if (user.role === "admin") return true; // admin can do all
  return user.role === required;
}

/** Login */
export async function login(email, password) {
  const res = await api.post("/auth/login", { email, password });
  if (res.data?.ok) setAuth(res.data);
  return res.data;
}

/** Logout */
export function logout() {
  clearAuth();
}

/** Attach JWT to all API calls */
api.interceptors.request.use((cfg) => {
  const t = getToken();
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});
