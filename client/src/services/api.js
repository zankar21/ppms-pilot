// client/src/services/api.js
import axios from "axios";

// Base URL: from Vite env, fallback to same-origin "/api"
const BASE_URL =
  import.meta.env.VITE_API_BASE?.replace(/\/+$/, "") || "/api";

// Create instance
export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  withCredentials: false,
});

// Attach JWT from localStorage directly (avoid importing auth.js)
function getTokenDirect() {
  try {
    return localStorage.getItem("ppms_jwt");
  } catch {
    return null;
  }
}

api.interceptors.request.use((cfg) => {
  const token = getTokenDirect();
  if (token) {
    cfg.headers = cfg.headers || {};
    cfg.headers.Authorization = `Bearer ${token}`;
  }
  return cfg;
});

// Normalize errors
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const resp = err?.response;
    err.userMessage =
      resp?.data?.error ||
      resp?.statusText ||
      err?.message ||
      "Request failed";
    return Promise.reject(err);
  }
);

// Optional helpers
export async function get(path, params) {
  const res = await api.get(path, { params });
  return res.data;
}
export async function post(path, body, config) {
  const res = await api.post(path, body, config);
  return res.data;
}
export async function put(path, body) {
  const res = await api.put(path, body);
  return res.data;
}
export async function del(path) {
  const res = await api.delete(path);
  return res.data;
}
