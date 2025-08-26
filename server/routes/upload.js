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
    itemId: ["itemid", "item", "item_id", "code", "item code", "item_code", "sku", "part_no", "partno"],
    qty: ["qty", "quantity", "qty_out", "consumed", "issue_qty", "qnty"],
    type: ["type", "txn_type", "movement", "action"],
    txn_dt: ["txn_dt", "date", "txn_date", "timestamp", "datetime"],
    unit: ["unit"],
    dept: ["dept", "department"],
    notes: ["note", "remarks", "comment"],
  },
  maintenance: {
    equipmentId: ["equipmentid", "assetid", "equipment", "asset", "equipment_id", "asset_id", "eq_id", "code", "equipment_tag"],
    type: ["type", "maint_type", "category", "bd/pm/cm", "bdpmcm"],
    reason: ["reason", "fault", "cause", "failure_reason", "remarks", "issue", "task"],
    createdAt: ["createdat", "date", "started_at", "start_date", "reported_on", "created_at", "timestamp"],
    downtimeMins: ["downtimemins", "downtime", "downtime_min", "minutes", "mins"],
    severity: ["severity", "sev", "priority"],
    unit: ["unit"],
    dept: ["dept", "department"],
  },
  logbook: {
    equipmentId: ["equipmentid", "assetid", "equipment", "asset", "equipment_id", "asset_id", "eq_id", "code", "equipment_tag"],
    text: ["text", "remarks", "description", "note", "comment", "message", "summary"],
    createdAt: ["createdat", "date", "timestamp", "created_at", "logged_at"],
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
  const parts = s.split(/[\/\-]/).map((p) => p.trim());
  if (parts.length === 3 && parts[0].length <= 2 && parts[1].length <= 2 && parts[2].length >= 2) {
    // D/M/Y
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

async function collectionExists(name) {
  const cols = await db.listCollections({ name }).toArray();
  return cols.length > 0;
}

/* ---------- Core import ---------- */
async function importRows(kind, rows, userRole) {
  const out = {
    kind, total: rows.length, inserted: 0, skipped: 0,
    errors: [], warnings: [], previewColumns: [],
    unknownItemIdCount: 0, unknownItemIdSample: [],
    unknownEquipmentIdCount: 0, unknownEquipmentIdSample: [],
  };

  // Role guard: operators may upload only logbook
  if (userRole === "operator" && kind !== "logbook") {
    out.errors.push("Operators can upload only logbook data.");
    return out;
  }

  if (!rows.length) return out;

  const lowerHeader = Object.keys(rows[0] || {}).map((k) => String(k).trim().toLowerCase());
  out.previewColumns = lowerHeader;

  // Normalize & map rows
  const docs = [];
  const seenItemIds = new Set();
  const seenEquipIds = new Set();

  for (const row of rows) {
    try {
      const lower = toLowerKeyObj(row);
      const picked = pickBySynonyms(lower, MAPS[kind]);

      if (kind === "inventory") {
        const itemId = (picked.itemId ?? "").toString().trim();
        const qty = asNumber(picked.qty);
        const txn_dt = parseDate(picked.txn_dt) || new Date();
        const type = String(picked.type || (qty < 0 ? "CONSUME" : "RECEIPT")).toUpperCase();
        if (!itemId || qty === null) { out.skipped++; continue; }
        docs.push({
          itemId, qty, type, txn_dt,
          unit: picked.unit || null,
          dept: picked.dept || null,
          notes: picked.notes || null,
          createdAt: new Date(),
        });
        seenItemIds.add(itemId);
      } else if (kind === "maintenance") {
        const equipmentId = (picked.equipmentId ?? "").toString().trim();
        const createdAt = parseDate(picked.createdAt) || new Date();
        const type = CLEAN_TYPE(picked.type, "BD");
        const reason = (picked.reason ?? "").toString().trim() || null;
        // minimal fields for your UI list
        docs.push({
          equipmentId: equipmentId || null,
          type,
          reason,
          createdAt,
          downtimeMins: asNumber(picked.downtimeMins) ?? 0,
          severity: asNumber(picked.severity) ?? 0,
          unit: picked.unit || null,
          dept: picked.dept || null,
        });
        if (equipmentId) seenEquipIds.add(equipmentId);
      } else if (kind === "logbook") {
        const createdAt = parseDate(picked.createdAt) || new Date();
        const text = (picked.text ?? "").toString().trim();
        if (!text) { out.skipped++; continue; }
        const equipmentId = (picked.equipmentId ?? "").toString().trim();
        docs.push({
          equipmentId: equipmentId || null,
          text,
          severity: asNumber(picked.severity) ?? 0,
          unit: picked.unit || null,
          dept: picked.dept || null,
          createdAt,
        });
        if (equipmentId) seenEquipIds.add(equipmentId);
      }
    } catch (e) {
      out.errors.push(String(e?.message || e));
      out.skipped++;
    }
  }

  // Validation (best-effort)
  try {
    if (kind === "inventory" && seenItemIds.size) {
      if (await collectionExists("inventory_items")) {
        const partNos = Array.from(seenItemIds);
        const cursor = db.collection("inventory_items").find({ part_no: { $in: partNos } }, { projection: { part_no: 1 } });
        const known = new Set((await cursor.toArray()).map(x => x.part_no));
        const unknown = partNos.filter(p => !known.has(p));
        if (unknown.length) {
          out.unknownItemIdCount = unknown.length;
          out.unknownItemIdSample = unknown.slice(0, 10);
          out.warnings.push(`Unknown itemId (not in inventory_items.part_no): ${out.unknownItemIdSample.join(", ")}${unknown.length > 10 ? " …" : ""}`);
        }
      } else {
        out.warnings.push("inventory_items collection not found—itemId validation skipped.");
      }
    }

    if ((kind === "maintenance" || kind === "logbook") && seenEquipIds.size) {
      // Try to find an equipment master (flex names)
      const candidates = [
        { col: "equipment_masters", fields: ["tag", "code", "equipment_tag"] },
        { col: "equipment", fields: ["tag", "code", "equipment_tag"] },
        { col: "masters_equipment", fields: ["tag", "code", "equipment_tag"] },
      ];
      let validated = false;
      for (const c of candidates) {
        if (!(await collectionExists(c.col))) continue;
        const ids = Array.from(seenEquipIds);
        const proj = Object.fromEntries(c.fields.map(f => [f, 1]));
        const rows = await db.collection(c.col).find({ $or: c.fields.map(f => ({ [f]: { $in: ids } })) }, { projection: proj }).toArray();
        const known = new Set();
        for (const r of rows) c.fields.forEach(f => r[f] && known.add(String(r[f])));
        const unknown = ids.filter(v => !known.has(v));
        if (unknown.length) {
          out.unknownEquipmentIdCount = unknown.length;
          out.unknownEquipmentIdSample = unknown.slice(0, 10);
          out.warnings.push(`Unknown equipmentId (not in ${c.col}): ${out.unknownEquipmentIdSample.join(", ")}${unknown.length > 10 ? " …" : ""}`);
        }
        validated = true;
        break;
      }
      if (!validated) out.warnings.push("No equipment master collection found—equipmentId validation skipped.");
    }
  } catch (e) {
    out.warnings.push(`Validation check failed: ${String(e?.message || e)}`);
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

/* ---------- POST /api/upload/:kind  ---------- */
router.post("/:kind", upload.single("file"), async (req, res) => {
  try {
    const { kind } = req.params;
    if (!["inventory", "maintenance", "logbook"].includes(kind)) {
      return res.status(400).json({ ok: false, error: "INVALID_KIND" });
    }
    if (!req.file?.buffer) {
      return res.status(400).json({ ok: false, error: "MISSING_FILE" });
    }

    const wb = XLSX.read(req.file.buffer, { type: "buffer" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: null });

    const role = req?.user?.role || "operator";
    const summary = await importRows(kind, rows, role);
    return res.json({ ok: true, summary });
  } catch (err) {
    console.error("[upload] error:", err);
    return res.status(500).json({ ok: false, error: "UPLOAD_FAILED", details: err?.message });
  }
});

export default router;
