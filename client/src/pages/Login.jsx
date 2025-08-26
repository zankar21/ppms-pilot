// client/src/pages/Login.jsx
import React, { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { login } from "../services/auth";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = (location.state && location.state.from) || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const res = await login(email.trim(), password);

      if (res?.ok && res?.token) {
        // 🔐 Save JWT for axios interceptor
        localStorage.setItem("ppms_jwt", res.token);
        // (Optional) save user info for UI
        if (res.user) localStorage.setItem("ppms_user", JSON.stringify(res.user));

        navigate(redirectTo, { replace: true });
      } else {
        setErr(res?.error || "Login failed");
      }
    } catch (e) {
      const msg =
        e?.response?.data?.error ||
        e?.userMessage ||
        e?.message ||
        "Login failed";
      setErr(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black">
      <div className="w-full max-w-md p-6 rounded-2xl bg-white/5 border border-white/10 shadow-xl backdrop-blur">
        <div className="mb-4">
          <h1 className="text-2xl font-semibold">Sign in to PPMS</h1>
          <p className="text-slate-400 text-sm">Predictive Plant Maintenance System</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm text-slate-300">Email</label>
            <input
              type="email"
              className="w-full px-3 py-2 rounded-xl bg-black/30 border border-white/10 focus:outline-none focus:ring-2 focus:ring-white/20"
              placeholder="you@plant.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm text-slate-300">Password</label>
            <div className="flex gap-2">
              <input
                type={showPw ? "text" : "password"}
                className="w-full px-3 py-2 rounded-xl bg-black/30 border border-white/10 focus:outline-none focus:ring-2 focus:ring-white/20"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPw((s) => !s)}
                className="px-3 rounded-xl bg-white/5 border border-white/10 text-xs"
                title={showPw ? "Hide password" : "Show password"}
              >
                {showPw ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {err ? (
            <div className="text-red-400 text-sm bg-red-400/10 border border-red-400/30 rounded-xl px-3 py-2">
              {err}
            </div>
          ) : null}

          <button type="submit" className="btn w-full disabled:opacity-60" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <div className="text-xs text-slate-500 mt-4">
          <p>
            Need an account? Ask an <span className="text-slate-300">admin</span> to create one.
          </p>
          <p className="mt-1">
            <Link to="/" className="underline underline-offset-4">
              ← Back to dashboard
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
