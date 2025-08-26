import express from "express";
import mongoose from "mongoose";
import { requireAuth } from "./auth.js";

const router = express.Router();
const db = mongoose.connection;

/**
 * Helper: coerce param id to support both ObjectId and string ids
 */
function idMatch(field, id) {
  const parts = [];
  if (mongoose.Types.ObjectId.isValid(id)) {
    parts.push({ [field]: new mongoose.Types.ObjectId(id) });
  }
  parts.push({ [field]: id });
  return { $or: parts };
}

/**
 * GET /api/equipment
 * Minimal list for dropdown
 * Looks up collection "equipment" (adjust if your master is named differently)
 * Projection: {_id, code, name, unit, dept}
 */
router.get("/", requireAuth(["engineer", "admin"]), async (_req, res) => {
  try {
    const equipmentCol = db.collection("equipment");
    const rows = await equipmentCol
      .find({}, { projection: { code: 1, name: 1, unit: 1, dept: 1 } })
      .sort({ name: 1 })
      .toArray();
    res.json({ ok: true, rows });
  } catch (err) {
    console.error("[equipment:list] error:", err);
    res.status(500).json({ ok: false, error: "EQUIPMENT_LIST_FAILED", details: err.message });
  }
});

/**
 * GET /api/equipment/:id/insights?windowDays=180&futureDays=30
 * Pulls maintenance/logbook history, aggregates reasons, computes MTBF,
 * and gives a risk score + next-actions (rule-based).
 *
 * Collections assumed (tweak names/fields if needed):
 *  - maintenance: { equipmentId/assetId, type ('BD'|'PM'|'CM'), reason|cause|fault, createdAt, downtimeMins, severity }
 *  - logbook:    { equipmentId/assetId, text|remarks, createdAt, severity }
 */
router.get("/:id/insights", requireAuth(["engineer", "admin"]), async (req, res) => {
  try {
    const { id } = req.params;
    const windowDays = Math.max(30, parseInt(req.query.windowDays || "180", 10));
    const futureDays = Math.max(7, parseInt(req.query.futureDays || "30", 10));

    const since = new Date();
    since.setDate(since.getDate() - windowDays);

    const maintCol = db.collection("maintenance");
    const logCol = db.collection("logbook");
    const eqCol = db.collection("equipment");

    // Equipment header (name/code)
    const eq = await eqCol.findOne(
      { $or: [{ _id: mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : "__no__" }, { _id: id }, { code: id }] },
      { projection: { name: 1, code: 1, unit: 1, dept: 1 } }
    );

    const eqName = eq?.name || "";
    const eqCode = eq?.code || id;

    // Build a match for both ObjectId and string ids, and both equipmentId/assetId fields
    const matchId = { $or: [idMatch("equipmentId", id), idMatch("assetId", id)] };

    // 1) Maintenance in window
    const maint = await maintCol
      .find({ ...matchId, createdAt: { $gte: since } }, { projection: { type: 1, reason: 1, cause: 1, fault: 1, createdAt: 1, downtimeMins: 1, severity: 1 } })
      .sort({ createdAt: -1 })
      .toArray();

    // 2) Logbook in window (last 50)
    const logs = await logCol
      .find({ ...matchId, createdAt: { $gte: since } }, { projection: { createdAt: 1, text: 1, remarks: 1, severity: 1 } })
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();

    // ---- Aggregations ----
    // Breakdowns series (weekly)
    const breakdowns = maint.filter(m => m.type === "BD").sort((a, b) => a.createdAt - b.createdAt);
    const weekKey = d => {
      const dt = new Date(d); const onejan = new Date(dt.getFullYear(), 0, 1);
      const week = Math.ceil((((dt - onejan) / 86400000) + onejan.getDay() + 1) / 7);
      return `${dt.getFullYear()}-W${String(week).padStart(2, "0")}`;
    };
    const seriesMap = new Map();
    for (const m of breakdowns) {
      const k = weekKey(m.createdAt);
      seriesMap.set(k, (seriesMap.get(k) || 0) + 1);
    }
    const series = Array.from(seriesMap.entries()).sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([w, c]) => ({ week: w, count: c }));

    // Top failure reason (normalize across fields)
    const reasonText = (r) => (r.reason || r.cause || r.fault || "").toString().trim().toLowerCase();
    const reasonCount = new Map();
    for (const r of breakdowns) {
      const key = reasonText(r) || "unspecified";
      reasonCount.set(key, (reasonCount.get(key) || 0) + 1);
    }
    const topReason = Array.from(reasonCount.entries()).sort((a, b) => b[1] - a[1])[0] || ["unspecified", 0];

    // MTBF (days) from breakdown intervals
    let mtbfDays = null, predictedNextDate = null, next30dProb = null;
    if (breakdowns.length >= 2) {
      const diffs = [];
      for (let i = 1; i < breakdowns.length; i++) {
        const dt = (breakdowns[i].createdAt - breakdowns[i - 1].createdAt) / 86400000;
        if (dt > 0) diffs.push(dt);
      }
      if (diffs.length) {
        mtbfDays = diffs.reduce((a, b) => a + b, 0) / diffs.length;
        const last = breakdowns[breakdowns.length - 1].createdAt;
        predictedNextDate = new Date(+last + mtbfDays * 86400000);
        // Poisson risk within futureDays using rate λ = 1/mtbf
        const lambda = 1 / mtbfDays;
        next30dProb = 1 - Math.exp(-lambda * futureDays);
      }
    }

    // Risk score (0-100) — simple composite
    const bdCount = breakdowns.length;
    const totalDowntime = maint.reduce((a, m) => a + (m.downtimeMins || 0), 0);
    const sevSum = maint.reduce((a, m) => a + (m.severity || 0), 0);
    const riskScore = Math.min(100, Math.round(
      (bdCount * 12) + (totalDowntime / 60) + (sevSum * 5)
    ));

    // Next actions (rule-based from top reason)
    const reason = topReason[0];
    const actions = [];
    const R = reason.toLowerCase();
    if (R.includes("lub") || R.includes("bearing")) {
      actions.push("Increase lubrication frequency; verify grease spec and schedule.");
      actions.push("Inspect bearings for play and vibration; balance rotating parts.");
    } else if (R.includes("overheat") || R.includes("temp")) {
      actions.push("Check cooling/ventilation; clean fins/filters; verify ambient conditions.");
      actions.push("Thermal scan under load; set alert thresholds in SCADA.");
    } else if (R.includes("elect") || R.includes("motor")) {
      actions.push("Insulation resistance test; check terminals/loose contacts.");
      actions.push("Measure current imbalance; plan motor alignment check.");
    } else if (R.includes("alignment") || R.includes("vibration")) {
      actions.push("Laser alignment; tighten mounts; update torque logs.");
      actions.push("Schedule vibration analysis (1x/3x harmonics).");
    } else if (R.includes("seal") || R.includes("leak")) {
      actions.push("Replace seals/gaskets; verify shaft finish and concentricity.");
      actions.push("Introduce leak checks into PM list.");
    } else {
      actions.push("Review latest BD log and 5-Why; add preventive step to PM.");
      actions.push("Increase PM frequency for the next 2 cycles and monitor KPIs.");
    }

    // Recent events (last 15 maintenance rows)
    const recent = maint
      .slice(0, 15)
      .map(m => ({
        type: m.type,
        when: m.createdAt,
        reason: m.reason || m.cause || m.fault || "",
        downtimeMins: m.downtimeMins || 0,
        severity: m.severity || 0,
      }));

    res.json({
      ok: true,
      equipment: { id, name: eqName, code: eqCode },
      windowDays,
      metrics: {
        breakdowns: bdCount,
        mtbfDays: mtbfDays ? Number(mtbfDays.toFixed(1)) : null,
        topReason: { text: reason, count: topReason[1] || 0 },
        nextFailure: {
          futureDays,
          probability: next30dProb != null ? Number((next30dProb * 100).toFixed(1)) : null, // %
          predictedDate: predictedNextDate,
        },
        riskScore,
        downtimeMins: totalDowntime,
      },
      series,   // [{week: "2025-W30", count: 2}, ...]
      actions,  // string[]
      recent,   // last 15 maintenance events
      logs,     // last 50 logbook entries (raw subset)
    });
  } catch (err) {
    console.error("[equipment:insights] error:", err);
    res.status(500).json({ ok: false, error: "EQUIPMENT_INSIGHTS_FAILED", details: err.message });
  }
});

export default router;
