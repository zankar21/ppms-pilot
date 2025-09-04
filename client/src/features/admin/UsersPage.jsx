import React, { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../services/api";
import { getUser } from "../../services/auth";

const ROLES = ["admin", "engineer", "operator"];

function AdminGuard({ children }) {
  const me = getUser();
  if (!me?.role) return <div className="p-6 text-red-500">Unauthenticated.</div>;
  if (me.role !== "admin") return <div className="p-6">Forbidden</div>;
  return children;
}

function Section({ title, children, right = null }) {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xl font-semibold">{title}</h2>
        {right}
      </div>
      <div className="bg-white/80 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
        {children}
      </div>
    </div>
  );
}

function TextInput({
  label,
  value,
  onChange,
  type = "text",
  placeholder = "",
  required = false,
  name,
  autoComplete = "off",
}) {
  return (
    <label className="grid gap-1">
      <span className="text-sm text-slate-600 dark:text-slate-300">{label}</span>
      <input
        className="border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400"
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        name={name}
        autoComplete={autoComplete}
      />
    </label>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <label className="grid gap-1">
      <span className="text-sm text-slate-600 dark:text-slate-300">{label}</span>
      <select
        className="border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </label>
  );
}

function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`inline-flex items-center w-12 h-7 rounded-full transition px-1 ${
        checked ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-700"
      }`}
      aria-pressed={checked}
    >
      <span
        className={`h-5 w-5 bg-white rounded-full shadow transform transition ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

function CreateUserForm() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("operator");
  const [msg, setMsg] = useState("");

  const create = useMutation({
    mutationFn: async () => {
      const payload = { name, email, password, role };
      return (await api.post("/api/users", payload)).data;
    },
    onSuccess: () => {
      setMsg("User created.");
      setName("");
      setEmail("");
      setPassword("");
      setRole("operator");
      qc.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (err) => setMsg(err?.response?.data?.error || "Failed to create user."),
  });

  return (
    <div className="p-4">
      <form
        className="grid gap-4 md:grid-cols-2"
        autoComplete="off" // prevent browser/password manager autofill on admin create form
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate();
        }}
      >
        {/* Decoy fields to satisfy aggressive password managers */}
        <input type="text" name="fake-username" autoComplete="username" className="hidden" readOnly />
        <input type="password" name="fake-password" autoComplete="current-password" className="hidden" readOnly />

        <TextInput
          label="Name"
          value={name}
          onChange={setName}
          placeholder="Jane Doe"
          required
          name="create-name"
          autoComplete="off"
        />

        <TextInput
          label="Email"
          type="email"
          value={email}
          onChange={setEmail}
          placeholder="jane@company.com"
          required
          name="create-email"          // unique name so managers don’t map “username”
          autoComplete="off"           // turn off autofill for this field
        />

        <TextInput
          label="Temporary password"
          type="password"
          value={password}
          onChange={setPassword}
          required
          name="create-temp-password"  // unique name so managers don’t map “password”
          autoComplete="new-password"  // explicitly tell browser this is a NEW password
        />

        <Select label="Role" value={role} onChange={setRole} options={ROLES} />

        <div className="md:col-span-2 flex items-center gap-2">
          <button
            type="submit"
            className="px-4 py-2 rounded-2xl bg-black text-white disabled:opacity-50"
            disabled={create.isPending}
          >
            {create.isPending ? "Creating…" : "Create user"}
          </button>
          {msg && <span className="text-sm text-slate-600 dark:text-slate-300">{msg}</span>}
        </div>
      </form>
    </div>
  );
}

function UsersTable() {
  const qc = useQueryClient();
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["users"],
    queryFn: async () => (await api.get("/api/users")).data,
    refetchOnWindowFocus: false,
    staleTime: 10_000,
  });

  const patch = useMutation({
    mutationFn: async ({ id, patch }) => (await api.patch(`/api/users/${id}`, patch)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });

  const reset = useMutation({
    mutationFn: async ({ id, newPassword }) =>
      (await api.post(`/api/users/${id}/reset-password`, { newPassword })).data,
  });

  if (isLoading) return <div className="p-4">Loading users…</div>;
  if (isError) return <div className="p-4 text-red-500">Failed to load users: {String(error)}</div>;

  const rows = data?.rows || [];

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 dark:bg-slate-800/60">
          <tr className="text-left">
            <th className="p-3">Name</th>
            <th className="p-3">Email</th>
            <th className="p-3">Role</th>
            <th className="p-3">Active</th>
            <th className="p-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((u) => (
            <UserRow key={u._id} u={u} onPatch={patch.mutateAsync} onReset={reset.mutateAsync} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function UserRow({ u, onPatch, onReset }) {
  const [role, setRole] = useState(u.role);
  const [active, setActive] = useState(!!u.isActive);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const save = async () => {
    setBusy(true);
    setMsg("");
    try {
      const patch = {};
      if (role !== u.role) patch.role = role;
      if (active !== u.isActive) patch.isActive = active;
      if (Object.keys(patch).length === 0) {
        setMsg("No changes");
      } else {
        await onPatch({ id: u._id, patch });
        setMsg("Saved");
      }
    } catch (e) {
      setMsg(e?.response?.data?.error || "Failed to save");
    } finally {
      setBusy(false);
    }
  };

  const resetPw = async () => {
    const p = prompt(`Enter a new password for ${u.email}`);
    if (!p) return;
    if (p.length < 6) {
      alert("Password must be at least 6 characters.");
      return;
    }
    setBusy(true);
    setMsg("");
    try {
      await onReset({ id: u._id, newPassword: p });
      setMsg("Password reset");
    } catch (e) {
      setMsg(e?.response?.data?.error || "Failed to reset password");
    } finally {
      setBusy(false);
    }
  };

  return (
    <tr className="border-t border-slate-200 dark:border-slate-800">
      <td className="p-3">
        <div className="font-medium">{u.name}</div>
        <div className="text-slate-500 text-xs">{new Date(u.createdAt).toLocaleString?.() || ""}</div>
      </td>
      <td className="p-3">{u.email}</td>
      <td className="p-3">
        <select
          className="border rounded-lg px-2 py-1 bg-white dark:bg-slate-900"
          value={role}
          onChange={(e) => setRole(e.target.value)}
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </td>
      <td className="p-3">
        <Toggle checked={active} onChange={setActive} />
      </td>
      <td className="p-3">
        <div className="flex items-center gap-2">
          <button
            onClick={save}
            disabled={busy}
            className="px-3 py-1 rounded-xl bg-black text-white text-xs disabled:opacity-50"
          >
            {busy ? "…" : "Save"}
          </button>
          <button
            onClick={resetPw}
            disabled={busy}
            className="px-3 py-1 rounded-xl border text-xs"
          >
            Reset password
          </button>
        </div>
        {msg && <div className="text-xs text-slate-500 mt-1">{msg}</div>}
      </td>
    </tr>
  );
}

export default function UsersPage() {
  const me = getUser();
  const meRole = me?.role || "";
  const subtitle = useMemo(() => (me?.email ? `Signed in as ${me.email} (${meRole})` : ""), [me?.email, meRole]);

  return (
    <AdminGuard>
      <div className="p-4 md:p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Users</h1>
          {subtitle && <div className="text-slate-500 mt-1">{subtitle}</div>}
        </div>

        <Section title="Create user">
          <CreateUserForm />
        </Section>

        <Section title="All users">
          <div className="p-4">
            <UsersTable />
          </div>
        </Section>
      </div>
    </AdminGuard>
  );
}
