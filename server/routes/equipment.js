import express from "express";
import mongoose from "mongoose";
import { requireAuth } from "./auth.js";

const router = express.Router();
const db = mongoose.connection;

function idMatch(field, id) {
  const parts = [];
  if (mongoose.Types.ObjectId.isValid(id)) parts.push({ [field]: new mongoose.Types.ObjectId(id) });
  parts.push({ [field]: id });
  return { $or: parts };
}

/* List for dropdown with safe fallback from activity */
router.get("/", requireAuth(["engineer", "admin"]), async (_req, res) => {
  try {
    const equipmentCol = db.collection("equipment");
    const maintCol = db.collection("maintenance");
    const logCol = db.collection("logbook");

    let rows = [];
    try {
      rows = await equipmentCol
        .find({}, { projection: { code: 1, name: 1, unit: 1, dept: 1 } })
        .sort({ name: 1 })
        .toArray();
    } catch {}

    if (!rows || rows.length === 0) {
      const a = await maintCol.distinct("equipmentId");
      const b = await maintCol.distinct("assetId");
      const c = await logCol.distinct("equipmentId");
      const d = await logCol.distinct("assetId");
      const ids = [...new Set([...(a||[]), ...(b||[]), ...(c||[]), ...(d||[])]
        .filter(Boolean).map(String))];

      const masters = [];
      try { masters.push(...await db.collection("equipment").find({ _id: { $in: ids } }, { projection: { name:1, code:1 } }).toArray()); } catch {}
      try { masters.push(...await db.collection("assets").find({ _id: { $in: ids } }, { projection: { name:1, code:1 } }).toArray()); } catch {}
      const byId = new Map(masters.map(m => [String(m._id), m]));

      rows = ids.map(id => {
        const m = byId.get(id);
        return { _id: id, code: m?.code || id, name: m?.name || m?.code || id };
      });
    }

    res.json({ ok: true, rows });
  } catch (err) {
    console.error("[equipment:list] error:", err);
    res.status(500).json({ ok: false, error: "EQUIPMENT_LIST_FAILED", details: err.message });
  }
});

/* Insights for selected equipment */
router.get("/:id/insights", requireAuth(["engineer", "admin"]), async (req, res) => {
  try {
    const { id } = req.params;
    const windowDays = Math.max(30, parseInt(req.query.windowDays || "180", 10));
    const futureDays = Math.max(7, parseInt(req.query.futureDays || "30", 10));

    const since = new Date(); since.setDate(since.getDate() - windowDays);

    const maintCol = db.collection("maintenance");
    const logCol = db.collection("logbook");
    const eqCol = db.collection("equipment");

    const eq = await eqCol.findOne(
      { $or: [{ _id: mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : "__x__" }, { _id: id }, { code: id }] },
      { projection: { name: 1, code: 1, unit: 1, dept: 1 } }
    );

    const matchId = { $or: [idMatch("equipmentId", id), idMatch("assetId", id)] };

    const maint = await maintCol
      .find({ ...matchId, createdAt: { $gte: since } }, { projection: { type: 1, reason: 1, cause: 1, fault: 1, createdAt: 1, downtimeMins: 1, severity: 1 } })
      .sort({ createdAt: -1 }).toArray();

    const logs = await logCol
      .find({ ...matchId, createdAt: { $gte: since } }, { projection: { createdAt: 1, text: 1, remarks: 1, severity: 1 } })
      .sort({ createdAt: -1 }).limit(50).toArray();

    const breakdowns = maint.filter(m => m.type === "BD").sort((a, b) => a.createdAt - b.createdAt);
    const weekKey = d => { const dt = new Date(d), onejan = new Date(dt.getFullYear(),0,1);
      const week = Math.ceil((((dt - onejan) / 86400000) + onejan.getDay() + 1) / 7);
      return `${dt.getFullYear()}-W${String(week).padStart(2,"0")}`; };
    const seriesMap = new Map();
    for (const m of breakdowns) { const k = weekKey(m.createdAt); seriesMap.set(k, (seriesMap.get(k)||0)+1); }
    const series = Array.from(seriesMap.entries()).sort((a,b)=>a[0]<b[0]?-1:1).map(([w,c])=>({week:w,count:c}));

    const reasonText = (r) => (r.reason || r.cause || r.fault || "").toString().trim().toLowerCase();
    const reasonCount = new Map();
    for (const r of breakdowns) { const key = reasonText(r) || "unspecified"; reasonCount.set(key, (reasonCount.get(key)||0)+1); }
    const topReason = Array.from(reasonCount.entries()).sort((a,b)=>b[1]-a[1])[0] || ["unspecified",0];

    let mtbfDays = null, predictedNextDate = null, next30dProb = null;
    if (breakdowns.length >= 2) {
      const diffs = [];
      for (let i=1;i<breakdowns.length;i++){
        const dt = (breakdowns[i].createdAt - breakdowns[i-1].createdAt)/86400000;
        if (dt>0) diffs.push(dt);
      }
      if (diffs.length) {
        mtbfDays = diffs.reduce((a,b)=>a+b,0)/diffs.length;
        const last = breakdowns[breakdowns.length-1].createdAt;
        predictedNextDate = new Date(+last + mtbfDays*86400000);
        const lambda = 1/mtbfDays;
        next30dProb = 1 - Math.exp(-lambda * futureDays);
      }
    }

    const bdCount = breakdowns.length;
    const totalDowntime = maint.reduce((a,m)=>a+(m.downtimeMins||0),0);
    const sevSum = maint.reduce((a,m)=>a+(m.severity||0),0);
    const riskScore = Math.min(100, Math.round((bdCount*12) + (totalDowntime/60) + (sevSum*5)));

    const reason = (topReason[0]||"").toLowerCase();
    const actions = [];
    if (reason.includes("lub") || reason.includes("bearing")) {
      actions.push("Increase lubrication frequency; verify grease spec and schedule.");
      actions.push("Inspect bearings for play/vibration; balance rotating parts.");
    } else if (reason.includes("overheat") || reason.includes("temp")) {
      actions.push("Check ventilation/cooling; clean fins/filters; verify ambient.");
      actions.push("Thermal scan under load; set alert thresholds in SCADA.");
    } else if (reason.includes("elect") || reason.includes("motor")) {
      actions.push("IR test; check terminals/loose contacts; measure current imbalance.");
      actions.push("Plan motor alignment check and tighten mounts.");
    } else if (reason.includes("alignment") || reason.includes("vibration")) {
      actions.push("Laser alignment; torque mounts; schedule vibration analysis.");
    } else if (reason.includes("seal") || reason.includes("leak")) {
      actions.push("Replace seals/gaskets; verify shaft finish & concentricity.");
      actions.push("Introduce leak checks into PM list.");
    } else {
      actions.push("Review latest BD and 5-Why; add a preventive step to PM.");
      actions.push("Increase PM frequency for next 2 cycles and monitor KPIs.");
    }

    const recent = maint.slice(0,15).map(m=>({
      type: m.type, when: m.createdAt,
      reason: m.reason || m.cause || m.fault || "",
      downtimeMins: m.downtimeMins || 0, severity: m.severity || 0,
    }));

    res.json({
      ok: true,
      equipment: { id, name: eq?.name || "", code: eq?.code || id },
      windowDays,
      metrics: {
        breakdowns: bdCount,
        mtbfDays: mtbfDays ? Number(mtbfDays.toFixed(1)) : null,
        topReason: { text: topReason[0], count: topReason[1] || 0 },
        nextFailure: {
          futureDays,
          probability: next30dProb != null ? Number((next30dProb*100).toFixed(1)) : null,
          predictedDate: predictedNextDate
        },
        riskScore,
        downtimeMins: totalDowntime
      },
      series, actions, recent, logs,
    });
  } catch (err) {
    console.error("[equipment:insights] error:", err);
    res.status(500).json({ ok: false, error: "EQUIPMENT_INSIGHTS_FAILED", details: err.message });
  }
});

export default router;
