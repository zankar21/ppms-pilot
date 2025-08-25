import express from 'express';
import Joi from 'joi';
import Maintenance from '../models/Maintenance.js';

const router = express.Router();

router.get('/', async (req, res) => {
  const { from, to, tag } = req.query;
  const where = {};
  if (tag) where.equipment_tag = tag;
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.$gte = new Date(from);
    if (to) where.createdAt.$lte = new Date(to);
  }
  const rows = await Maintenance.find(where).sort({ createdAt: -1 }).limit(500);
  res.json({ rows });
});

router.post('/', async (req, res) => {
  const schema = Joi.object({
    equipment_tag: Joi.string().allow(''),
    type: Joi.string().valid('PM','CM','BD').required(),
    fault: Joi.string().allow(''),
    cause: Joi.string().allow(''),
    remedy: Joi.string().allow(''),
    down_start: Joi.date().optional(),
    down_end: Joi.date().optional(),
    labor_hrs: Joi.number().min(0).optional(),
    parts_used: Joi.array().items(Joi.object({ part_no: Joi.string(), qty: Joi.number().min(0) })),
    remarks: Joi.string().allow('')
  });
  const { value, error } = schema.validate(req.body, { stripUnknown: true });
  if (error) return res.status(400).json({ error: error.message });
  const doc = await Maintenance.create(value);
  res.status(201).json(doc);
});

export default router;
