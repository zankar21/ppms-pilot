// server/routes/anomaly.js
import express from 'express';
import Telemetry from '../models/Telemetry.js';

const router = express.Router();

/**
 * Utility: parse comma-separated tags. If empty, return [] (means "all").
 */
function parseTags(q) {
  return String(q || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * GET /api/anomaly/zscore
 *
 * Query params:
 *  - tags: comma-separated list of tag names (optional -> all tags)
 *  - hours: lookback window in hours (default 24, clamp 1..168)
 *  - threshold: absolute z threshold (default 3)
 *  - limit: max anomaly rows to return (default 200, clamp 1..2000)
 *
 * Uses $setWindowFields to compute per-tag mean/std over the window,
 * then emits points whose |z| >= threshold.
 */
router.get('/zscore', async (req, res) => {
  try {
    const tags = parseTags(req.query.tags);
    const hours = Math.max(1, Math.min(168, Number(req.query.hours) || 24));
    const threshold = Math.max(0.5, Math.min(10, Number(req.query.threshold) || 3));
    const limit = Math.max(1, Math.min(2000, Number(req.query.limit) || 200));

    const since = new Date(Date.now() - hours * 3600 * 1000);

    const match = { ts: { $gte: since } };
    if (tags.length) match.tag = { $in: tags };

    const pipe = [
      { $match: match },
      {
        $setWindowFields: {
          partitionBy: '$tag',
          sortBy: { ts: 1 },
          output: {
            mean: { $avg: '$value', window: { documents: ['unbounded', 'current'] } },
            std: { $stdDevSamp: '$value', window: { documents: ['unbounded', 'current'] } },
          },
        },
      },
      {
        $addFields: {
          z: {
            $cond: [
              { $eq: ['$std', 0] },
              0,
              { $divide: [{ $subtract: ['$value', '$mean'] }, '$std'] },
            ],
          },
        },
      },
      {
        $match: {
          $expr: { $gte: [{ $abs: '$z' }, threshold] },
        },
      },
      { $sort: { ts: -1 } },
      {
        $project: {
          _id: 0,
          tag: 1,
          ts: 1,
          value: 1,
          z: 1,
          mean: 1,
          std: 1,
        },
      },
      { $limit: limit },
    ];

    const rows = await Telemetry.aggregate(pipe);
    return res.json({ ok: true, hours, threshold, rows });
  } catch (err) {
    console.error('ANOMALY /zscore error:', err);
    return res.status(500).json({ ok: false, error: 'ANOMALY_ZSCORE_FAILED', details: err?.message });
  }
});

/**
 * GET /api/anomaly/counts
 *
 * Query params:
 *  - tags: comma-separated tags (optional -> all)
 *  - hours: lookback window (default 24, clamp 1..168)
 *  - threshold: abs z threshold (default 3)
 *
 * Returns per-tag anomaly counts within the window.
 */
router.get('/counts', async (req, res) => {
  try {
    const tags = parseTags(req.query.tags);
    const hours = Math.max(1, Math.min(168, Number(req.query.hours) || 24));
    const threshold = Math.max(0.5, Math.min(10, Number(req.query.threshold) || 3));
    const since = new Date(Date.now() - hours * 3600 * 1000);

    const match = { ts: { $gte: since } };
    if (tags.length) match.tag = { $in: tags };

    const pipe = [
      { $match: match },
      {
        $setWindowFields: {
          partitionBy: '$tag',
          output: {
            mean: { $avg: '$value', window: { documents: ['unbounded', 'current'] } },
            std: { $stdDevSamp: '$value', window: { documents: ['unbounded', 'current'] } },
          },
        },
      },
      {
        $addFields: {
          z: {
            $cond: [
              { $eq: ['$std', 0] },
              0,
              { $divide: [{ $subtract: ['$value', '$mean'] }, '$std'] },
            ],
          },
          isAnom: { $gt: [{ $abs: '$z' }, threshold] },
        },
      },
      {
        $group: {
          _id: '$tag',
          anomalies: { $sum: { $cond: ['$isAnom', 1, 0] } },
          total: { $sum: 1 },
        },
      },
      { $sort: { anomalies: -1 } },
      { $project: { _id: 0, tag: '$_id', anomalies: 1, total: 1 } },
    ];

    const rows = await Telemetry.aggregate(pipe);
    return res.json({ ok: true, hours, threshold, rows });
  } catch (err) {
    console.error('ANOMALY /counts error:', err);
    return res.status(500).json({ ok: false, error: 'ANOMALY_COUNTS_FAILED', details: err?.message });
  }
});

export default router;
