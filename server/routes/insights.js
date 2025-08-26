// server/routes/insights.js
import express from 'express';
import Logbook from '../models/Logbook.js';
import Maintenance from '../models/Maintenance.js';
import InsightsDaily from '../models/InsightsDaily.js';

const router = express.Router();

/**
 * GET /api/insights/daily
 * Query params:
 *  - days: number (1..30) default 1
 *  - unit: string (optional)
 *  - department: string (optional)
 *  - persist: "1" to save snapshot in InsightsDaily (optional)
 *
 * Returns a summary across Logbook + Maintenance for the last N days,
 * including totals, breakdowns, and highlights.
 */
router.get('/daily', async (req, res) => {
  try {
    const days = Math.max(1, Math.min(30, Number(req.query.days) || 1));
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const unit = (req.query.unit || '').trim();
    const department = (req.query.department || '').trim();

    const matchLog = { createdAt: { $gte: since } };
    const matchMaint = { createdAt: { $gte: since } };

    if (unit) {
      matchLog.unit = unit;
      matchMaint.unit = unit;
    }
    if (department) {
      matchLog.department = department;
      matchMaint.department = department;
    }

    const [logCount, maintCount, byDeptLog, byDeptMaint, byUnitLog, byUnitMaint] =
      await Promise.all([
        Logbook.countDocuments(matchLog),
        Maintenance.countDocuments(matchMaint),

        Logbook.aggregate([
          { $match: matchLog },
          { $group: { _id: '$department', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]),

        Maintenance.aggregate([
          { $match: matchMaint },
          { $group: { _id: '$department', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]),

        Logbook.aggregate([
          { $match: matchLog },
          { $group: { _id: '$unit', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]),

        Maintenance.aggregate([
          { $match: matchMaint },
          { $group: { _id: '$unit', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]),
      ]);

    // Highlights
    const [latestLogs, upcomingMaint] = await Promise.all([
      Logbook.find(matchLog)
        .sort({ createdAt: -1 })
        .limit(5)
        .select('message unit department shift createdAt'),
      Maintenance.find({
        ...matchMaint,
        plannedDate: { $exists: true, $gte: since },
      })
        .sort({ plannedDate: 1 })
        .limit(5)
        .select('title type unit department plannedDate'),
    ]);

    const summary = {
      windowDays: days,
      filters: {
        unit: unit || null,
        department: department || null,
      },
      totals: {
        logbook: logCount,
        maintenance: maintCount,
      },
      byDepartment: {
        logbook: byDeptLog.map((d) => ({ department: d._id, count: d.count })),
        maintenance: byDeptMaint.map((d) => ({
          department: d._id,
          count: d.count,
        })),
      },
      byUnit: {
        logbook: byUnitLog.map((d) => ({ unit: d._id, count: d.count })),
        maintenance: byUnitMaint.map((d) => ({ unit: d._id, count: d.count })),
      },
      highlights: {
        latestLogs,
        upcomingMaintenance: upcomingMaint,
      },
    };

    if (String(req.query.persist || '') === '1') {
      await InsightsDaily.create({
        date: new Date(),
        windowDays: days,
        summary,
      });
    }

    return res.json({ ok: true, summary });
  } catch (err) {
    console.error('INSIGHTS /daily error:', err);
    return res.status(500).json({
      ok: false,
      error: 'INSIGHTS_DAILY_FAILED',
      details: err?.message || 'Unknown error',
    });
  }
});

/**
 * (Optional convenience)
 * GET /api/insights/latest
 * Returns the most recently persisted snapshot from InsightsDaily.
 */
router.get('/latest', async (_req, res) => {
  try {
    const doc = await InsightsDaily.findOne().sort({ date: -1 });
    if (!doc) return res.json({ ok: true, summary: null });
    return res.json({ ok: true, summary: doc.summary, savedAt: doc.date });
  } catch (err) {
    console.error('INSIGHTS /latest error:', err);
    return res.status(500).json({
      ok: false,
      error: 'INSIGHTS_LATEST_FAILED',
      details: err?.message || 'Unknown error',
    });
  }
});

export default router;
