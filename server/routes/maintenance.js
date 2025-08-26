import express from 'express';
import Joi from 'joi';
import Maintenance from '../models/Maintenance.js';

const router = express.Router();

// List with filters
// /api/maintenance?unit=UNIT-1&dept=MECH&from=...&to=...&tag=...
router.get('/', async (req, res) => {
  const { from, to, tag, unit, dept } = req.query;
  const where = {};
  if (unit) where.unit = unit;
  if (dept) where.department = dept;
  if (tag)  where.equipment_tag = tag;
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.$gte = new Date(from);
    if (to)   where.createdAt.$lte = new Date(to);
  }
  const rows = await Maintenance.find(where).sort({ createdAt: -1 }).limit(500);
  res.json({ rows });
});

// Create
router.post('/', async (req, res) => {
  const schema = Joi.object({
    equipment_tag: Joi.string().allow(''),
    unit: Joi.string().default('UNIT-1'),
    department: Joi.string().default('MECH'),
    type: Joi.string().valid('PM','CM','BD').required(),
    fault: Joi.string().allow(''),
    cause: Joi.string().allow(''),
    remedy: Joi.string().allow(''),
    down_start: Joi.date().optional().allow(null),
    down_end: Joi.date().optional().allow(null),
    labor_hrs: Joi.number().min(0).optional().allow(null),
    parts_used: Joi.array().items(Joi.object({ part_no: Joi.string(), qty: Joi.number().min(0) })).optional(),
    status: Joi.string().valid('Open','In-Progress','Completed','Deferred').default('Open'),
    remarks: Joi.string().allow(''),
    cost_estimate: Joi.number().min(0).optional(),
    cost_actual: Joi.number().min(0).optional(),
    technician: Joi.string().allow(''),
    work_order_id: Joi.string().allow('')
  });
  const { value, error } = schema.validate(req.body, { stripUnknown: true });
  if (error) return res.status(400).json({ error: error.message });
  const doc = await Maintenance.create(value);
  res.status(201).json(doc);
});

// Read
router.get('/:id', async (req, res) => {
  const doc = await Maintenance.findById(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Not found' });
  res.json(doc);
});

// Update
router.put('/:id', async (req, res) => {
  const schema = Joi.object({
    equipment_tag: Joi.string().allow(''),
    unit: Joi.string(),
    department: Joi.string(),
    type: Joi.string().valid('PM','CM','BD'),
    fault: Joi.string().allow(''),
    cause: Joi.string().allow(''),
    remedy: Joi.string().allow(''),
    down_start: Joi.date().optional().allow(null),
    down_end: Joi.date().optional().allow(null),
    labor_hrs: Joi.number().min(0).optional().allow(null),
    parts_used: Joi.array().items(Joi.object({ part_no: Joi.string(), qty: Joi.number().min(0) })).optional(),
    status: Joi.string().valid('Open','In-Progress','Completed','Deferred'),
    remarks: Joi.string().allow(''),
    cost_estimate: Joi.number().min(0).optional(),
    cost_actual: Joi.number().min(0).optional(),
    technician: Joi.string().allow(''),
    work_order_id: Joi.string().allow('')
  });
  const { value, error } = schema.validate(req.body, { stripUnknown: true });
  if (error) return res.status(400).json({ error: error.message });

  const doc = await Maintenance.findByIdAndUpdate(req.params.id, value, { new: true });
  if (!doc) return res.status(404).json({ error: 'Not found' });
  res.json(doc);
});

// Delete
router.delete('/:id', async (req, res) => {
  const doc = await Maintenance.findByIdAndDelete(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Not found' });
  res.json({ ok: true });
});

export default router;
