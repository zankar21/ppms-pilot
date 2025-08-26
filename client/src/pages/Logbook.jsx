// client/src/pages/Logbook.jsx
import React, { useEffect, useState } from "react";
import { api } from "../services/api";
import Drawer from "../components/Drawer.jsx";
import Filters from "../components/Filters.jsx";
import UploadDataDialog from "../components/UploadDataDialog.jsx";

function exportCsv(name, rows) {
  const cols = ["date", "shift", "unit", "department", "summary"];
  const header = cols.join(",");
  const lines = rows.map((r) => cols.map((c) => `"${(r[c] ?? "").toString().replace(/"/g, '""')}"`).join(","));
  const csv = [header, ...lines].join("\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

export default function Logbook() {
  // list + filters
  const [rows, setRows] = useState([]);
  const [unit, setUnit] = useState("");
  const [dept, setDept] = useState("");

  // create form defaults
  const [form, setForm] = useState({
    date: "",
    shift: "A",
    unit: "UNIT-1",
    department: "MECH",
    summary: "",
  });

  // drawer state
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // list honoring filters
  const load = async () => {
    try {
      const r = await api.get("/api/logbook", { params: { unit, dept } });
      setRows(r.data.rows || []);
    } catch (e) {
      alert(e?.response?.data?.error || e.message || "Failed to load logbook");
    }
  };
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unit, dept]);

  // create
  const submit = async () => {
    if (!form.date || !form.unit) return;
    const payload = {
      date: form.date,
      shift: form.shift,
      unit: form.unit,
      department: form.department,
      summary: form.summary || "",
    };
    try {
      await api.post("/api/logbook", payload);
      setForm({ date: "", shift: "A", unit: "UNIT-1", department: "MECH", summary: "" });
      load();
    } catch (e) {
      alert(e?.response?.data?.error || e.message || "Failed to add logbook entry");
    }
  };

  // open drawer
  const show = (row) => {
    setEdit({
      ...row,
      _paramsText: JSON.stringify(row.params || {}, null, 2),
      load_mw: row.load_mw ?? "",
      ambient_temp_c: row.ambient_temp_c ?? "",
    });
    setOpen(true);
  };
  const onChange = (k, v) => setEdit((p) => ({ ...p, [k]: v }));

  // save
  const save = async () => {
    if (!edit?._id) return;
    setSaving(true);
    try {
      const payload = {
        date: edit.date,
        shift: edit.shift,
        unit: edit.unit,
        department: edit.department,
        summary: edit.summary || "",
        details: edit.details || "",
        operator: edit.operator || "",
        handed_over_to: edit.handed_over_to || "",
        load_mw: edit.load_mw === "" ? undefined : Number(edit.load_mw),
        ambient_temp_c: edit.ambient_temp_c === "" ? undefined : Number(edit.ambient_temp_c),
        params: safeParseJSON(edit._paramsText) ?? {},
      };
      await api.put(`/api/logbook/${edit._id}`, payload);
      await load();
      setOpen(false);
    } catch (e) {
      alert(e?.response?.data?.error || e.message || "Failed to save logbook entry");
    } finally {
      setSaving(false);
    }
  };

  // delete
  const removeOne = async () => {
    if (!edit?._id) return;
    if (!confirm("Delete this logbook entry?")) return;
    setDeleting(true);
    try {
      await api.delete(`/api/logbook/${edit._id}`);
      await load();
      setOpen(false);
    } catch (e) {
      alert(e?.response?.data?.error || e.message || "Failed to delete logbook entry");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-2xl font-bold">Logbook</h1>
      <div className="flex items-center gap-2" style={{ marginBottom: 12, flexWrap: "wrap" }}>
        <span className="muted">Upload historical logbook notes (CSV/Excel).</span>
        <button className="btn" onClick={() => exportCsv("logbook_filtered.csv", rows)}>
          Export CSV
        </button>
      </div>

      {/* CSV/Excel uploader for logbook notes (operators are allowed) */}
      <UploadDataDialog kind="logbook" label="Upload logbook notes (CSV/Excel)" onDone={load} />

      <div className="card" style={{ marginTop: 12 }}>
        <Filters unit={unit} setUnit={setUnit} dept={dept} setDept={setDept} />

        {/* quick add */}
        <div
          className="responsive-grid-6"
          style={{ display: "grid", gridTemplateColumns: "repeat(6, minmax(0,1fr))", gap: 10, marginBottom: 12 }}
        >
          <input
            className="input"
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
          />
          <select className="select" value={form.shift} onChange={(e) => setForm({ ...form, shift: e.target.value })}>
            <option>A</option>
            <option>B</option>
            <option>C</option>
          </select>
          <input
            className="input"
            placeholder="Unit (e.g. UNIT-1)"
            value={form.unit}
            onChange={(e) => setForm({ ...form, unit: e.target.value })}
          />
          <input
            className="input"
            placeholder="Dept (MECH/ELEC/INST/CIV)"
            value={form.department}
            onChange={(e) => setForm({ ...form, department: e.target.value })}
          />
          <input
            className="input"
            placeholder="Summary"
            value={form.summary}
            onChange={(e) => setForm({ ...form, summary: e.target.value })}
          />
          <button className="btn" onClick={submit}>
            Add
          </button>
        </div>

        {/* table */}
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Shift</th>
                <th>Unit</th>
                <th>Dept</th>
                <th>Summary</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r._id} style={{ cursor: "pointer" }} onClick={() => show(r)}>
                  <td>{r.date}</td>
                  <td>
                    <span className="badge">{r.shift}</span>
                  </td>
                  <td>{r.unit}</td>
                  <td>{r.department}</td>
                  <td>{r.summary}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!rows.length && <div className="muted p-3">No entries.</div>}
      </div>

      {/* drawer */}
      <Drawer open={open} title="Logbook Entry" onClose={() => setOpen(false)}>
        {!edit ? null : (
          <div className="grid grid-2">
            <div className="card">
              <div className="label">Date</div>
              <input className="input" value={edit.date} onChange={(e) => onChange("date", e.target.value)} />
            </div>
            <div className="card">
              <div className="label">Shift</div>
              <select className="select" value={edit.shift} onChange={(e) => onChange("shift", e.target.value)}>
                <option>A</option>
                <option>B</option>
                <option>C</option>
              </select>
            </div>

            <div className="card">
              <div className="label">Unit</div>
              <input className="input" value={edit.unit || ""} onChange={(e) => onChange("unit", e.target.value)} />
            </div>
            <div className="card">
              <div className="label">Department</div>
              <input
                className="input"
                value={edit.department || ""}
                onChange={(e) => onChange("department", e.target.value)}
              />
            </div>

            <div className="card" style={{ gridColumn: "1 / -1" }}>
              <div className="label">Summary</div>
              <input className="input" value={edit.summary || ""} onChange={(e) => onChange("summary", e.target.value)} />
            </div>
            <div className="card" style={{ gridColumn: "1 / -1" }}>
              <div className="label">Details</div>
              <input className="input" value={edit.details || ""} onChange={(e) => onChange("details", e.target.value)} />
            </div>

            <div className="card">
              <div className="label">Operator</div>
              <input className="input" value={edit.operator || ""} onChange={(e) => onChange("operator", e.target.value)} />
            </div>
            <div className="card">
              <div className="label">Handed Over To</div>
              <input
                className="input"
                value={edit.handed_over_to || ""}
                onChange={(e) => onChange("handed_over_to", e.target.value)}
              />
            </div>

            <div className="card">
              <div className="label">Load (MW)</div>
              <input
                className="input"
                type="number"
                step="0.1"
                value={edit.load_mw ?? ""}
                onChange={(e) => onChange("load_mw", e.target.value)}
              />
            </div>
            <div className="card">
              <div className="label">Ambient Temp (°C)</div>
              <input
                className="input"
                type="number"
                step="0.1"
                value={edit.ambient_temp_c ?? ""}
                onChange={(e) => onChange("ambient_temp_c", e.target.value)}
              />
            </div>

            <div className="card" style={{ gridColumn: "1 / -1" }}>
              <div className="label">Params (JSON)</div>
              <textarea
                className="input"
                style={{ height: 160 }}
                value={edit._paramsText}
                onChange={(e) => onChange("_paramsText", e.target.value)}
              />
            </div>

            <div className="drawer-actions" style={{gridColumn:'1 / -1'}}>
  <button className="btn" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
  <button className="btn danger" onClick={removeOne} disabled={deleting}>
    {deleting ? 'Deleting…' : 'Delete'}
  </button>
</div>
          </div>
        )}
      </Drawer>
    </div>
  );
}

function safeParseJSON(s) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}
