// server/routes/upload.js
import express from 'express';
import multer from 'multer';
import csv from 'csv-parser';
import stream from 'stream';

import Maintenance from '../models/Maintenance.js';
import Logbook from '../models/Logbook.js';

const router = express.Router();

// Use memory storage (small CSVs < 10MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

/**
 * Helper: parse CSV buffer into array of objects
 */
function parseCsv(buffer) {
  return new Promise((resolve, reject) => {
    const rows = [];
    const rs = new stream.Readable();
    rs._read = () => {};
    rs.push(buffer);
    rs.push(null);

    rs.pipe(csv())
      .on('data', (row) => rows.push(row))
      .on('end', () => resolve(rows))
      .on('error', reject);
  });
}

/**
 * POST /api/upload/maintenance.csv
 * Accepts a CSV with fields: equipmentId, department, unit, type, title, plannedDate
 */
router.post('/maintenance.csv', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ ok: false, error: 'NO_FILE' });

    const rows = await parseCsv(req.file.buffer);
    const docs = rows.map((r) => ({
      equipmentId: r.equipmentId,
      department: r.department,
      unit: r.unit,
      type: r.type, // BD/PM/CM
      title: r.title,
      plannedDate: r.plannedDate ? new Date(r.plannedDate) : undefined,
    }));

    const result = await Maintenance.insertMany(docs, { ordered: false });
    return res.json({ ok: true, inserted: result.length });
  } catch (err) {
    console.error('UPLOAD maintenance error:', err);
    return res.status(500).json({ ok: false, error: 'UPLOAD_MAINTENANCE_FAILED', details: err?.message });
  }
});

/**
 * POST /api/upload/logbook.csv
 * Accepts a CSV with fields: message, department, unit, shift, createdAt
 */
router.post('/logbook.csv', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ ok: false, error: 'NO_FILE' });

    const rows = await parseCsv(req.file.buffer);
    const docs = rows.map((r) => ({
      message: r.message,
      department: r.department,
      unit: r.unit,
      shift: r.shift,
      createdAt: r.createdAt ? new Date(r.createdAt) : new Date(),
    }));

    const result = await Logbook.insertMany(docs, { ordered: false });
    return res.json({ ok: true, inserted: result.length });
  } catch (err) {
    console.error('UPLOAD logbook error:', err);
    return res.status(500).json({ ok: false, error: 'UPLOAD_LOGBOOK_FAILED', details: err?.message });
  }
});

export default router;
