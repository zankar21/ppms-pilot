import express from 'express';
import InventoryItem from '../models/InventoryItem.js';
import InventoryTxn from '../models/InventoryTxn.js';
import Maintenance from '../models/Maintenance.js';
import Logbook from '../models/Logbook.js';

const router = express.Router();

// Snapshot tiles
router.get('/', async (_req, res) => {
  const [items, txns, maint, logs] = await Promise.all([
    InventoryItem.countDocuments(),
    InventoryTxn.countDocuments(),
    Maintenance.countDocuments(),
    Logbook.countDocuments()
  ]);
  res.json({ inventory_items: items, inventory_txns: txns, maintenance: maint, logbook: logs });
});

// Forecast placeholder
router.get('/forecast/spares', async (_req, res) => {
  res.json({ horizon_days: 60, items: [] });
});

/**
 * Weekly breakdown trend honoring unit/department filters
 * GET /api/dashboard/trend/breakdowns?weeks=8&type=BD&unit=UNIT-1&dept=MECH
 */
router.get('/trend/breakdowns', async (req, res) => {
  const weeksBack = Math.max(1, parseInt(req.query.weeks || '8', 10));
  const type = (req.query.type ?? 'BD').trim(); // '' means all types
  const unit = req.query.unit?.trim();
  const dept = req.query.dept?.trim();

  const now = new Date();
  const since = new Date(now.getTime() - weeksBack * 7 * 24 * 60 * 60 * 1000);

  const match = { createdAt: { $gte: since } };
  if (type) match.type = type;
  if (unit) match.unit = unit;
  if (dept) match.department = dept;

  const agg = await Maintenance.aggregate([
    { $match: match },
    {
      $addFields: {
        weekStart: {
          $dateTrunc: { date: '$createdAt', unit: 'week', timezone: 'Asia/Kolkata' }
        }
      }
    },
    { $group: { _id: '$weekStart', count: { $sum: 1 } } },
    { $sort: { _id: 1 } }
  ]);

  const countsMap = new Map(agg.map(r => [new Date(r._id).getTime(), r.count]));

  // Build continuous buckets
  const start = new Date(now.getTime() - (weeksBack - 1) * 7 * 24 * 60 * 60 * 1000);
  const startDay = start.getDay(); // 0..6
  const diffToMon = (startDay + 6) % 7;
  start.setDate(start.getDate() - diffToMon);
  start.setHours(0, 0, 0, 0);

  const weeks = [];
  const counts = [];
  for (let i = 0; i < weeksBack; i++) {
    const d = new Date(start.getTime() + i * 7 * 24 * 60 * 60 * 1000);
    const key = d.getTime();
    weeks.push(`Wk ${getISOWeekNumber(d)}`);
    counts.push(countsMap.get(key) || 0);
  }
  res.json({ weeks, counts });
});

function getISOWeekNumber(d) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
}

export default router;
