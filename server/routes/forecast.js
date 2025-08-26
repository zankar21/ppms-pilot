import express from "express";
import mongoose from "mongoose";

const router = express.Router();

router.get("/inventory", async (req, res) => {
  try {
    const days = Math.max(7, parseInt(req.query.days || "365", 10)); // default wider window
    const alpha = Number(req.query.alpha ?? 0.35);
    const service = Number(req.query.service ?? 0.95);
    const defaultLead = Math.max(1, parseInt(req.query.lead || "7", 10));
    const review = Math.max(0, parseInt(req.query.review || "7", 10));

    const z = service >= 0.975 ? 1.96 : service >= 0.95 ? 1.65 : service >= 0.9 ? 1.28 : 1.0;

    const db = mongoose.connection;
    const txnsCol = db.collection("inventory_txns");
    const itemsCol = db.collection("inventory_items");

    const since = new Date(); since.setDate(since.getDate() - days);

    // Treat as consumption if type is in ISSUE-ish OR qty < 0
    const issueTypes = ["ISSUE", "CONSUME", "OUT", "WITHDRAW"];
    const usage = await txnsCol.aggregate([
      { $match: { txn_dt: { $gte: since } } },
      { $project: {
          itemId: 1, qty: 1, type: 1, txn_dt: 1,
          consume: { $or: [{ $in: ["$type", issueTypes] }, { $lt: ["$qty", 0] }] }
        }
      },
      { $match: { consume: true } },
      { $group: {
          _id: { itemId: "$itemId", d: { $dateToString: { format: "%Y-%m-%d", date: "$txn_dt" } } },
          qty: { $sum: { $abs: "$qty" } }
        }
      },
      { $group: {
          _id: "$_id.itemId",
          series: { $push: { d: "$_id.d", v: "$qty" } },
          total: { $sum: "$qty" }
        }
      },
    ]).toArray();

    const items = await itemsCol
      .find({}, { projection: { _id: 1, code: 1, name: 1, onHand: 1, stock: 1, qty: 1, quantity: 1, leadTimeDays: 1 } })
      .toArray();
    const itemMap = new Map(items.map((it) => [String(it._id), it]));

    function stdev(arr) { if (!arr.length) return { mean: 0, sd: 0 };
      const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
      const v = arr.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / arr.length;
      return { mean, sd: Math.sqrt(v) };
    }
    function expSmooth(arr, a = 0.35) {
      if (!arr.length) return 0; let s = arr[0];
      for (let i = 1; i < arr.length; i++) s = a * arr[i] + (1 - a) * s; return s;
    }
    function firstDefined(obj, keys, fallback = 0) {
      for (const k of keys) if (obj && obj[k] !== undefined && obj[k] !== null) return Number(obj[k]);
      return fallback;
    }

    const today = new Date();
    const results = usage.map((u) => {
      const id = String(u._id);
      const it = itemMap.get(id) || {};
      const series = u.series.sort((a, b) => (a.d < b.d ? -1 : 1)).map((x) => x.v);
      const { mean: avgDaily, sd } = stdev(series);
      const smoothedDaily = expSmooth(series, alpha) || avgDaily || 0;
      const lead = Number(it.leadTimeDays ?? defaultLead);
      const safety = z * sd * Math.sqrt(lead);
      const demandLT = smoothedDaily * lead;
      const rop = demandLT + safety;
      const onHand = firstDefined(it, ["onHand", "stock", "qty", "quantity"], 0);
      const reviewDemand = smoothedDaily * review;
      const reorderQty = Math.max(0, Math.ceil(rop + reviewDemand - onHand));
      const runoutDays = smoothedDaily > 0 ? onHand / smoothedDaily : null;
      const runoutDate = runoutDays ? new Date(today.getTime() + runoutDays * 86400000) : null;

      return {
        itemId: id,
        code: it.code || "",
        name: it.name || "",
        onHand,
        avgDaily: Number(avgDaily.toFixed(2)),
        smoothedDaily: Number(smoothedDaily.toFixed(2)),
        sd: Number(sd.toFixed(2)),
        leadTimeDays: lead,
        safetyStock: Math.ceil(safety),
        reorderPoint: Math.ceil(rop),
        reorderQty,
        runoutDate,
        priority: onHand - rop,
      };
    });

    results.sort((a, b) => a.priority - b.priority);
    res.json({ ok: true, days, count: results.length, rows: results });
  } catch (err) {
    console.error("[forecast/inventory] error:", err);
    res.status(500).json({ ok: false, error: "FORECAST_FAILED", details: err.message });
  }
});

export default router;
