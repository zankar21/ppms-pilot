import express from 'express';
import Unit from '../models/Unit.js';
import Department from '../models/Department.js';

const router = express.Router();

router.get('/units', async (_req, res) => {
  const rows = await Unit.find().sort({ code: 1 });
  res.json({ rows });
});

router.get('/departments', async (_req, res) => {
  const rows = await Department.find().sort({ code: 1 });
  res.json({ rows });
});

export default router;
