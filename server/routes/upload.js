// server/routes/upload.js
import express from "express";
import mongoose from "mongoose";
import multer from "multer";
import * as XLSX from "xlsx";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const db = mongoose.connection;

/* ---------- Column synonym maps (lowercased keys) ---------- */
const MAPS = {
  inventory: {
    itemId: ["itemid", "item", "item_id", "code", "item code", "item_code", "sku"],
    qty: ["qty", "quantity", "qty_out", "consumed", "issue_qty", "qnty"],
    type: ["type", "txn_type", "movement", "action"],
    txn_dt: ["txn_dt", "date", "txn_date", "timestamp", "datetime"],
    unit: ["unit"],
    dept: ["dept", "department"],
    notes: ["note", "remarks", "comment"],
  },
  maintenance: {
    equipmentId: ["equipmentid", "assetid", "equipment", "asset", "equipment_id", "asset_id", "eq_id", "code"],
    type: ["type", "maint_type", "category", "bd/pm/cm", "bdpmcm"],
    reason: ["reason", "cause", "fault", "failure_reason", "remarks", "issue"],
    createdAt: ["createdat", "date", "started_at", "start_date", "reported_on", "created_at", "timestamp"],
    downtimeMins: ["downtimemins", "downtime", "downtime_min", "minutes", "mins"],
    severity: ["severity", "sev", "priority"],
    unit: ["unit"],
    dept: ["dept", "department"],
  },
  logbook: {
    equipmentId: ["equipmentid", "assetid", "equipment", "asset", "equipment_id", "asset_id", "eq_id", "code"],
    text: ["text", "remarks", "description", "note", "comment", "message"],
    createdAt: ["createdat", "date", "timestamp", "created_at"],
    severity: ["severity", "sev", "priority"],
    unit: ["unit"],
    dept: ["dept", "department"],
  },
};

/* ---------- Helpers ---------- */
const toLowerKeyObj = (row) =>
  Object.fromEntries(Object.entries(row).map(([k, v]) => [String(k).trim().toLowerCase(), v]));

function pickBySynonyms(rowLower, mapList) {
  const out = {};
  for (const [canon, candidates] of Object.entries(mapList)) {
    for (const c of candidates) {
      if (rowLower.hasOwnProperty(c)) {
        out[canon] = rowLower[c];
        break;
      }
    }
  }
  return out;
}

function asNumber(x) {
  if (x === null || x === undefined || x === "") return null;
  const n = Number(String(x).replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

function parseDate(x) {
  if (!x && x !== 0) return null;
  if (x instanceof Date) return x;
  // Excel serial?
  if (typeof x === "number" && x > 59) {
    const epoch = new Date(Date.UTC(1899, 11, 30));
    return new Date(epoch.getTime() + x * 86400000);
  }
  const s = String(x).trim();
  // dd/mm/yyyy or yyyy-mm-dd, etc.
  const parts = s.split(/[\/\-]/).map((p) => p.trim());
  if (parts.length === 3 && parts[0].length <= 2 && parts[1].length <= 2 && parts[2].length >= 2) {
    // assume D/M/Y
    const [d, m, y] = parts.map((p) => Number(p));
    if (d && m && y) return new Date(y, m - 1, d);
  }
  const d = new Date(s);
  return isNaN(+d) ? null : d;
}

const CLEAN_TYPE = (t, fallback = "BD") => {
  const s = String(t || "").toUpperCase();
  if (["BD", "PM", "CM"].includes(s)) return s;
  if (/break|bd/.test(s)) return "BD";
  if (/prevent|pm/.test(s)) return "PM";
  if (/corr|cm/.test(s)) return "CM";
  return fallback;
};

/* ---------- Core import ---------- */
async function importRows(kind, rows) {
  const out = { kind, total: rows.length, inserted: 0, skipped: 0, errors: [], previewColumns: [] };
  if (!rows.length) return out;

  const lowerHeader = Object.keys(rows[0] || {}).map((k) => String(k).trim().toLowerCase());
  out.previewColumns = lowerHeader;

  // Map each row to our canonical schema
  const docs = [];
  for (const row of rows) {
    try {
      const lower = toLowerKeyObj(row);
      const picked = pickBySynonyms(lower, MAPS[kind]);
      if (kind === "inventory") {
        const itemId = (picked.itemId ?? "").toString().trim();
        const qty = asNumber(picked.qty);
        const txn_dt = parseDate(picked.txn_dt) || new Date();
        const type = String(picked.type || (qty < 0 ? "CONSUME" : "ISSUE")).toUpperCase();
        if (!itemId || qty === null) { out.skipped++; continue; }
        docs.push({
          itemId,
          qty,
          type,
          txn_dt,
          unit: picked.unit || null,
          dept: picked.dept || null,
          notes: picked.notes || null,
          createdAt: new Date(),
        });
      } else if (kind === "maintenance") {
        const equipmentId = (picked.equipmentId ?? "").toString().trim();
        const createdAt = parseDate(picked.createdAt) || new Date();
        const type = CLEAN_TYPE(picked.type, "BD");
        if (!createdAt) { out.skipped++; continue; }
        docs.push({
          equipmentId: equipmentId || null,
          type,
          reason: picked.reason || null,
          createdAt,
          downtimeMins: asNumber(picked.downtimeMins) ?? 0,
          severity: asNumber(picked.severity) ?? 0,
          unit: picked.unit || null,
          dept: picked.dept || null,
        });
      } else if (kind === "logbook") {
        const createdAt = parseDate(picked.createdAt) || new Date();
        const text = (picked.text ?? "").toString().trim();
        if (!text) { out.skipped++; continue; }
        docs.push({
          equipmentId: (picked.equipmentId ?? "").toString().trim() || null,
          text,
          severity: asNumber(picked.severity) ?? 0,
          unit: picked.unit || null,
          dept: picked.dept || null,
          createdAt,
        });
      }
    } catch (e) {
      out.errors.push(String(e?.message || e));
      out.skipped++;
    }
  }

  if (!docs.length) return out;

  const target =
    kind === "inventory" ? "inventory_txns" :
    kind === "maintenance" ? "maintenance" :
    "logbook";

  const col = db.collection(target);
  const ops = docs.map((d) => ({ insertOne: { document: d } }));
  const res = await col.bulkWrite(ops, { ordered: false });
  out.inserted = res.insertedCount ?? (res.nInserted ?? 0);
  return out;
}

/* ---------- POST /api/upload/:kind  (kind: inventory|maintenance|logbook) ---------- */
router.post("/:kind", upload.single("file"), async (req, res) => {
  try {
    const { kind } = req.params;
    if (!["inventory", "maintenance", "logbook"].includes(kind)) {
      return res.status(400).json({ ok: false, error: "INVALID_KIND" });
    }
    if (!req.file?.buffer) {
      return res.status(400).json({ ok: false, error: "MISSING_FILE" });
    }

    // Parse CSV/Excel using xlsx (it handles both)
    const wb = XLSX.read(req.file.buffer, { type: "buffer" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: null }); // array of objects

    const summary = await importRows(kind, rows);
    return res.json({ ok: true, summary });
  } catch (err) {
    console.error("[upload] error:", err);
    return res.status(500).json({ ok: false, error: "UPLOAD_FAILED", details: err?.message });
  }
});

export default router;
