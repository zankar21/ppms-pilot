// client/src/pages/Maintenance.jsx
import React, { useEffect, useState } from "react";
import { api } from "../services/api";
import Drawer from "../components/Drawer.jsx";
import Filters from "../components/Filters.jsx";
import UploadDataDialog from "../components/UploadDataDialog.jsx";

function exportCsv(name, rows) {
  const cols = ["createdAt", "type", "unit", "department", "equipment_tag", "fault", "status"];
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

export default function Maintenance() {
  // list + filters
  const [rows, setRows] = useState([]);
  const [unit, setUnit] = useState("");
  const [dept, setDept] = useState("");

  // create form (defaults)
  const [form, setForm] = useState({
    type: "BD",
    unit: "UNIT-1",
    department: "MECH",
    equipment_tag: "",
    fault: "",
  });

  // drawer state
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // list loader honors filters
  const load = async () => {
    try {
      const r = await api.get("/api/maintenance", { params: { unit, dept } });
      setRows(r.data.rows || []);
    } catch (e) {
      alert(e?.response?.data?.error || e.message || "Failed to load maintenance");
    }
  };
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unit, dept]);

  // create
  const submit = async () => {
    const payload = {
      type: form.type,
      unit: form.unit,
      department: form.department,
      equipment_tag: form.equipment_tag || "",
      fault: form.fault || "",
    };
    try {
      await api.post("/api/maintenance", payload);
      setForm({ type: "BD", unit: "UNIT-1", department: "MECH", equipment_tag: "", fault: "" });
      load();
    } catch (e) {
      alert(e?.response?.data?.error || e.message || "Failed to add maintenance");
    }
  };

  // open drawer for edit
  const show = (row) => {
    setEdit({
      ...row,
      down_start: row.down_start ? row.down_start.slice(0, 16) : "",
      down_end: row.down_end ? row.down_end.slice(0, 16) : "",
      labor_hrs: row.labor_hrs ?? "",
      cost_estimate: row.cost_estimate ?? "",
      cost_actual: row.cost_actual ?? "",
      _parts_text: formatParts(row.parts_used),
    });
    setOpen(true);
  };

  const onChange = (k, v) => setEdit((prev) => ({ ...prev, [k]: v }));

  // parts helpers
  const parseParts = (s) => {
    if (!s) return [];
    return s
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean)
      .map((pair) => {
        const [part_no, qtyRaw] = pair.split(":").map((t) => t.trim());
        const qty = Number(qtyRaw || 0);
        return { part_no, qty: isNaN(qty) ? 0 : qty };
      });
  };
  const formatParts = (arr) => (arr || []).map((p) => `${p.part_no}:${p.qty}`).join(", ");

  // save
  const save = async () => {
    if (!edit?._id) return;
    setSaving(true);
    try {
      const payload = {
        type: edit.type,
        unit: edit.unit,
        department: edit.department,
        equipment_tag: edit.equipment_tag || "",
        fault: edit.fault || "",
        cause: edit.cause || "",
        remedy: edit.remedy || "",
        status: edit.status || "Open",
        technician: edit.technician || "",
        work_order_id: edit.work_order_id || "",
        cost_estimate: edit.cost_estimate === "" ? undefined : Number(edit.cost_estimate),
        cost_actual: edit.cost_actual === "" ? undefined : Number(edit.cost_actual),
        labor_hrs: edit.labor_hrs === "" ? null : Number(edit.labor_hrs),
        down_start: edit.down_start ? new Date(edit.down_start) : null,
        down_end: edit.down_end ? new Date(edit.down_end) : null,
        parts_used: parseParts(edit._parts_text),
        remarks: edit.remarks || "",
      };
      await api.put(`/api/maintenance/${edit._id}`, payload);
      await load();
      setOpen(false);
    } catch (e) {
      alert(e?.response?.data?.error || e.message || "Failed to save maintenance");
    } finally {
      setSaving(false);
    }
  };

  // delete
  const removeOne = async () => {
    if (!edit?._id) return;
    if (!confirm("Delete this maintenance record?")) return;
    setDeleting(true);
    try {
      await api.delete(`/api/maintenance/${edit._id}`);
      await load();
      setOpen(false);
    } catch (e) {
      alert(e?.response?.data?.error || e.message || "Failed to delete maintenance");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <div className="p-4 md:p-6">
        <h1 className="text-2xl font-bold">Maintenance</h1>
        <div className="flex items-center gap-2" style={{ marginBottom: 12, flexWrap: "wrap" }}>
          <span className="muted">Upload BD/PM/CM history; extra columns ignored.</span>
          <button className="btn" onClick={() => exportCsv("maintenance_filtered.csv", rows)}>
            Export CSV
          </button>
        </div>

        {/* CSV/Excel uploader for maintenance history */}
        <UploadDataDialog kind="maintenance" label="Upload maintenance history (CSV/Excel)" onDone={load} />

        <div className="card" style={{ marginTop: 12 }}>
          <Filters unit={unit} setUnit={setUnit} dept={dept} setDept={setDept} />

          {/* quick create */}
          <div
            className="responsive-grid-6"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(6, minmax(0,1fr))",
              gap: 10,
              marginBottom: 12,
              marginTop: 10,
            }}
          >
            <select className="select" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option>PM</option>
              <option>CM</option>
              <option>BD</option>
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
              placeholder="Equipment Tag"
              value={form.equipment_tag}
              onChange={(e) => setForm({ ...form, equipment_tag: e.target.value })}
            />
            <input
              className="input"
              placeholder="Fault"
              value={form.fault}
              onChange={(e) => setForm({ ...form, fault: e.target.value })}
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
                  <th>When</th>
                  <th>Type</th>
                  <th>Unit</th>
                  <th>Dept</th>
                  <th>Equipment</th>
                  <th>Fault</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r._id} style={{ cursor: "pointer" }} onClick={() => show(r)}>
                    <td>{new Date(r.createdAt).toLocaleString()}</td>
                    <td>
                      <span className="badge">{r.type}</span>
                    </td>
                    <td>{r.unit}</td>
                    <td>{r.department}</td>
                    <td style={{ fontWeight: 700 }}>{r.equipment_tag}</td>
                    <td>{r.fault}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!rows.length && <div className="muted p-3">No records.</div>}
        </div>
      </div>

      {/* drawer */}
      <Drawer open={open} title="Maintenance Details" onClose={() => setOpen(false)}>
        {!edit ? null : (
          <div className="grid grid-2">
            <div className="card">
              <div className="label">Type</div>
              <select className="select" value={edit.type} onChange={(e) => onChange("type", e.target.value)}>
                <option>PM</option>
                <option>CM</option>
                <option>BD</option>
              </select>
            </div>
            <div className="card">
              <div className="label">Status</div>
              <select
                className="select"
                value={edit.status || "Open"}
                onChange={(e) => onChange("status", e.target.value)}
              >
                <option>Open</option>
                <option>In-Progress</option>
                <option>Completed</option>
                <option>Deferred</option>
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

            <div className="card">
              <div className="label">Equipment Tag</div>
              <input
                className="input"
                value={edit.equipment_tag || ""}
                onChange={(e) => onChange("equipment_tag", e.target.value)}
              />
            </div>
            <div className="card">
              <div className="label">Technician</div>
              <input
                className="input"
                value={edit.technician || ""}
                onChange={(e) => onChange("technician", e.target.value)}
              />
            </div>

            <div className="card">
              <div className="label">Work Order ID</div>
              <input
                className="input"
                value={edit.work_order_id || ""}
                onChange={(e) => onChange("work_order_id", e.target.value)}
              />
            </div>
            <div className="card">
              <div className="label">Labor (hrs)</div>
              <input
                className="input"
                type="number"
                step="0.1"
                value={edit.labor_hrs ?? ""}
                onChange={(e) => onChange("labor_hrs", e.target.value)}
              />
            </div>

            <div className="card">
              <div className="label">Down Start</div>
              <input
                className="input"
                type="datetime-local"
                value={edit.down_start || ""}
                onChange={(e) => onChange("down_start", e.target.value)}
              />
            </div>
            <div className="card">
              <div className="label">Down End</div>
              <input
                className="input"
                type="datetime-local"
                value={edit.down_end || ""}
                onChange={(e) => onChange("down_end", e.target.value)}
              />
            </div>

            <div className="card">
              <div className="label">Fault</div>
              <input className="input" value={edit.fault || ""} onChange={(e) => onChange("fault", e.target.value)} />
            </div>
            <div className="card">
              <div className="label">Cause</div>
              <input className="input" value={edit.cause || ""} onChange={(e) => onChange("cause", e.target.value)} />
            </div>

            <div className="card">
              <div className="label">Remedy</div>
              <input className="input" value={edit.remedy || ""} onChange={(e) => onChange("remedy", e.target.value)} />
            </div>
            <div className="card">
              <div className="label">Parts Used (PART:QTY, …)</div>
              <input
                className="input"
                value={edit._parts_text || ""}
                onChange={(e) => onChange("_parts_text", e.target.value)}
                placeholder="BEARING-6205:2, OIL-68:10"
              />
            </div>

            <div className="card">
              <div className="label">Cost Estimate</div>
              <input
                className="input"
                type="number"
                step="0.01"
                value={edit.cost_estimate ?? ""}
                onChange={(e) => onChange("cost_estimate", e.target.value)}
              />
            </div>
            <div className="card">
              <div className="label">Cost Actual</div>
              <input
                className="input"
                type="number"
                step="0.01"
                value={edit.cost_actual ?? ""}
                onChange={(e) => onChange("cost_actual", e.target.value)}
              />
            </div>

            <div className="card" style={{ gridColumn: "1 / -1" }}>
              <div className="label">Remarks</div>
              <input
                className="input"
                value={edit.remarks || ""}
                onChange={(e) => onChange("remarks", e.target.value)}
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
    </>
  );
}
