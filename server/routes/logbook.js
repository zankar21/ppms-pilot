import express from 'express';
import Joi from 'joi';
import Logbook from '../models/Logbook.js';

const router = express.Router();

// List with filters
router.get('/', async (req, res) => {
  const { from, to, unit, dept } = req.query;
  const where = {};
  if (unit) where.unit = unit;
  if (dept) where.department = dept;
  if (from || to) {
    where.date = {};
    if (from) where.date.$gte = from;
    if (to)   where.date.$lte = to;
  }
  const rows = await Logbook.find(where).sort({ createdAt: -1 }).limit(500);
  res.json({ rows });
});

// Create
router.post('/', async (req, res) => {
  const schema = Joi.object({
    date: Joi.string().required(),
    shift: Joi.string().valid('A','B','C').required(),
    unit: Joi.string().default('UNIT-1'),
    department: Joi.string().default('MECH'),
    summary: Joi.string().allow(''),
    details: Joi.string().allow(''),
    operator: Joi.string().allow(''),
    handed_over_to: Joi.string().allow(''),
    load_mw: Joi.number().min(0).optional(),
    ambient_temp_c: Joi.number().optional(),
    params: Joi.object().unknown(true).optional()
  });
  const { value, error } = schema.validate(req.body, { stripUnknown: true });
  if (error) return res.status(400).json({ error: error.message });
  const doc = await Logbook.create(value);
  res.status(201).json(doc);
});

// Read one
router.get('/:id', async (req, res) => {
  const doc = await Logbook.findById(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Not found' });
  res.json(doc);
});

// Update
router.put('/:id', async (req, res) => {
  const schema = Joi.object({
    date: Joi.string(),
    shift: Joi.string().valid('A','B','C'),
    unit: Joi.string(),
    department: Joi.string(),
    summary: Joi.string().allow(''),
    details: Joi.string().allow(''),
    operator: Joi.string().allow(''),
    handed_over_to: Joi.string().allow(''),
    load_mw: Joi.number().min(0).optional(),
    ambient_temp_c: Joi.number().optional(),
    params: Joi.object().unknown(true)
  });
  const { value, error } = schema.validate(req.body, { stripUnknown: true });
  if (error) return res.status(400).json({ error: error.message });

  const doc = await Logbook.findByIdAndUpdate(req.params.id, value, { new: true });
  if (!doc) return res.status(404).json({ error: 'Not found' });
  res.json(doc);
});

// Delete
router.delete('/:id', async (req, res) => {
  const doc = await Logbook.findByIdAndDelete(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Not found' });
  res.json({ ok: true });
});

export default router;
