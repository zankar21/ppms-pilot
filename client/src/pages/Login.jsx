// client/src/pages/Login.jsx
import React, { useState } from "react";
import { api } from "../services/api";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function signIn(e) {
    e?.preventDefault?.();
    if (!email || !password) return;
    setBusy(true);
    setErr("");
    try {
      const { data } = await api.post("/api/auth/login", { email, password });
      localStorage.setItem("ppms_jwt", data.token);
      localStorage.setItem("ppms_user", JSON.stringify(data.user));
      window.location.href = "/";
    } catch (e) {
      setErr(e?.response?.data?.error || "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
      }}
    >
      <form
        onSubmit={signIn}
        className="card"
        style={{
          width: "100%",
          maxWidth: 520,
          padding: 24,
        }}
      >
        <h1 className="text-2xl font-bold" style={{ marginBottom: 6 }}>
          Sign in to PPMS
        </h1>
        <div className="muted" style={{ marginBottom: 16 }}>
          Proactive Plant Maintenance System
        </div>

        <label className="label">Email</label>
        <input
          className="input"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="admin@powerpulsetech.in"
          autoFocus
        />

        <label className="label" style={{ marginTop: 10 }}>
          Password
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8 }}>
          <input
            className="input"
            type={show ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
          <button
            type="button"
            className="btn"
            onClick={() => setShow((s) => !s)}
            style={{ whiteSpace: "nowrap" }}
          >
            {show ? "Hide" : "Show"}
          </button>
        </div>

        {err && (
          <div style={{ color: "var(--danger)", marginTop: 10, fontSize: 14 }}>
            {err}
          </div>
        )}

        <button
          type="submit"
          className="btn"
          disabled={busy}
          style={{ marginTop: 14, width: "100%" }}
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>

        <div className="muted" style={{ marginTop: 14, fontSize: 14 }}>
          Need an account? Ask an admin to create one.
        </div>

        <a href="/" className="muted" style={{ display: "inline-block", marginTop: 12 }}>
          ← Back to dashboard
        </a>
      </form>
    </div>
  );
}
