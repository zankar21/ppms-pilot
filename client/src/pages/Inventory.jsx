// client/src/pages/Inventory.jsx
import React, { useEffect, useState } from "react";
import { api } from "../services/api";
import Drawer from "../components/Drawer.jsx";
import Filters from "../components/Filters.jsx";
import UploadDataDialog from "../components/UploadDataDialog.jsx";

function exportCsv(name, rows) {
  const cols = ["part_no", "description", "uom", "min", "max", "location", "unit", "department"];
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

export default function Inventory() {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [unit, setUnit] = useState("");
  const [dept, setDept] = useState("");

  const [newItem, setNewItem] = useState({
    part_no: "",
    description: "",
    uom: "",
    min: 0,
    max: 0,
    location: "",
    unit: "UNIT-1",
    department: "MECH",
  });

  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    try {
      const r = await api.get("/api/inventory/items", { params: { q, unit, dept } });
      setRows(r.data.rows || []);
    } catch (e) {
      alert(e?.response?.data?.error || e.message || "Failed to load items");
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unit, dept]);

  const search = async () => load();

  const add = async () => {
    if (!newItem.part_no) return;
    try {
      const payload = {
        part_no: String(newItem.part_no || "").trim(),
        description: String(newItem.description || "").trim(),
        uom: String(newItem.uom || "").trim(),
        min: Number(newItem.min || 0),
        max: Number(newItem.max || 0),
        location: String(newItem.location || "").trim(),
        unit: String(newItem.unit || "").trim(),
        department: String(newItem.department || "").trim(),
      };
      await api.post("/api/inventory/items", payload);
      setNewItem({
        part_no: "",
        description: "",
        uom: "",
        min: 0,
        max: 0,
        location: "",
        unit: "UNIT-1",
        department: "MECH",
      });
      load();
    } catch (e) {
      alert(e?.response?.data?.error || e.message || "Failed to add item");
    }
  };

  const show = (row) => {
    setEdit({ ...row });
    setOpen(true);
  };
  const onChange = (k, v) => setEdit((p) => ({ ...p, [k]: v }));

  const save = async () => {
    if (!edit?._id) return;
    setSaving(true);
    try {
      const payload = {
        part_no: String(edit.part_no || "").trim(),
        description: String(edit.description || "").trim(),
        uom: String(edit.uom || "").trim(),
        min: Number(edit.min || 0),
        max: Number(edit.max || 0),
        location: String(edit.location || "").trim(),
        unit: String(edit.unit || "").trim(),
        department: String(edit.department || "").trim(),
      };
      await api.put(`/api/inventory/items/${edit._id}`, payload);
      await load();
      setOpen(false);
    } catch (e) {
      alert(e?.response?.data?.error || e.message || "Failed to save item");
    } finally {
      setSaving(false);
    }
  };

  const removeOne = async () => {
    if (!edit?._id) return;
    if (!confirm("Delete this item?")) return;
    setDeleting(true);
    try {
      await api.delete(`/api/inventory/items/${edit._id}`);
      await load();
      setOpen(false);
    } catch (e) {
      alert(e?.response?.data?.error || e.message || "Failed to delete item");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-2xl font-bold">Inventory</h1>
      <div className="flex items-center gap-2" style={{ marginBottom: 12, flexWrap: "wrap" }}>
        <span className="muted">
          Upload historical <b>transactions</b> (doesn’t change master items).
        </span>
        <button className="btn" onClick={() => exportCsv("inventory_items_filtered.csv", rows)}>
          Export CSV (items)
        </button>
      </div>

      {/* CSV/Excel uploader for transactions */}
      <UploadDataDialog
        kind="inventory"
        label="Upload transactions (CSV/Excel)"
        onDone={() => {
          /* items list not affected directly by txn import */
        }}
      />

      {/* Filters */}
      <div className="card" style={{ marginTop: 12 }}>
        <Filters unit={unit} setUnit={setUnit} dept={dept} setDept={setDept} />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr 80px",
            gap: 10,
            marginBottom: 12,
            marginTop: 10,
          }}
        >
          <input
            className="input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()}
            placeholder="Search part no / description / location"
          />
          <button className="btn" onClick={search}>
            Search
          </button>
          <div className="muted" style={{ alignSelf: "center", textAlign: "right" }}>
            {rows.length} items
          </div>
        </div>
      </div>

      {/* Add new item */}
      <div className="card" style={{ marginTop: 12, marginBottom: 12 }}>
        <div className="label" style={{ marginBottom: 8 }}>
          Add New Item
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(8, minmax(0,1fr))", gap: 10 }}>
          <input
            className="input"
            placeholder="Part No"
            value={newItem.part_no}
            onChange={(e) => setNewItem({ ...newItem, part_no: e.target.value })}
          />
          <input
            className="input"
            placeholder="Description"
            value={newItem.description}
            onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
          />
          <input
            className="input"
            placeholder="UOM"
            value={newItem.uom}
            onChange={(e) => setNewItem({ ...newItem, uom: e.target.value })}
          />
          <input
            className="input"
            type="number"
            step="1"
            placeholder="Min"
            value={newItem.min}
            onChange={(e) => setNewItem({ ...newItem, min: e.target.value })}
          />
          <input
            className="input"
            type="number"
            step="1"
            placeholder="Max"
            value={newItem.max}
            onChange={(e) => setNewItem({ ...newItem, max: e.target.value })}
          />
          <input
            className="input"
            placeholder="Location"
            value={newItem.location}
            onChange={(e) => setNewItem({ ...newItem, location: e.target.value })}
          />
          <input
            className="input"
            placeholder="Unit (e.g. UNIT-1)"
            value={newItem.unit}
            onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
          />
          <input
            className="input"
            placeholder="Dept (e.g. MECH)"
            value={newItem.department}
            onChange={(e) => setNewItem({ ...newItem, department: e.target.value })}
          />
        </div>
        <div style={{ marginTop: 10 }}>
          <button className="btn" onClick={add}>
            Add Item
          </button>
        </div>
      </div>

      {/* Items table */}
      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Part No</th>
              <th>Description</th>
              <th>UOM</th>
              <th>Min</th>
              <th>Max</th>
              <th>Location</th>
              <th>Unit</th>
              <th>Dept</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r._id} style={{ cursor: "pointer" }} onClick={() => show(r)}>
                <td style={{ fontWeight: 700 }}>{r.part_no}</td>
                <td>{r.description}</td>
                <td>{r.uom}</td>
                <td>{r.min}</td>
                <td>{r.max}</td>
                <td>{r.location}</td>
                <td>{r.unit}</td>
                <td>{r.department}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <div className="muted p-3">No items.</div>}
      </div>

      {/* Edit drawer */}
      <Drawer open={open} title="Edit Item" onClose={() => setOpen(false)}>
        {!edit ? null : (
          <div className="grid grid-2">
            <div className="card">
              <div className="label">Part No</div>
              <input className="input" value={edit.part_no} onChange={(e) => onChange("part_no", e.target.value)} />
            </div>
            <div className="card">
              <div className="label">UOM</div>
              <input className="input" value={edit.uom || ""} onChange={(e) => onChange("uom", e.target.value)} />
            </div>
            <div className="card" style={{ gridColumn: "1 / -1" }}>
              <div className="label">Description</div>
              <input
                className="input"
                value={edit.description || ""}
                onChange={(e) => onChange("description", e.target.value)}
              />
            </div>
            <div className="card">
              <div className="label">Min</div>
              <input
                className="input"
                type="number"
                value={edit.min ?? 0}
                onChange={(e) => onChange("min", e.target.value)}
              />
            </div>
            <div className="card">
              <div className="label">Max</div>
              <input
                className="input"
                type="number"
                value={edit.max ?? 0}
                onChange={(e) => onChange("max", e.target.value)}
              />
            </div>
            <div className="card">
              <div className="label">Location</div>
              <input
                className="input"
                value={edit.location || ""}
                onChange={(e) => onChange("location", e.target.value)}
              />
            </div>
            <div className="card">
              <div className="label">Unit</div>
              <input className="input" value={edit.unit || ""} onChange={(e) => onChange("unit", e.target.value)} />
            </div>
            <div className="card">
              <div className="label">Dept</div>
              <input
                className="input"
                value={edit.department || ""}
                onChange={(e) => onChange("department", e.target.value)}
              />
            </div>
            <div style={{ display: "flex", gap: 10, gridColumn: "1 / -1" }}>
              <button className="btn" onClick={save} disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </button>
              <button
                className="btn"
                onClick={removeOne}
                disabled={deleting}
                style={{ borderColor: "#ef4444", color: "#ef4444" }}
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
