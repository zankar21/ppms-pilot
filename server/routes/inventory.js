import express from 'express';
import Joi from 'joi';
import InventoryItem from '../models/InventoryItem.js';
import InventoryTxn from '../models/InventoryTxn.js';

const router = express.Router();

/* Items */

router.get('/items', async (req, res) => {
  const { q, unit, dept } = req.query;
  const where = {};
  if (unit) where.unit = unit;
  if (dept) where.department = dept;
  if (q) {
    where.$or = [
      { part_no: { $regex: q, $options: 'i' } },
      { description: { $regex: q, $options: 'i' } },
      { location: { $regex: q, $options: 'i' } }
    ];
  }
  const rows = await InventoryItem.find(where).sort({ part_no: 1 }).limit(1000);
  res.json({ rows });
});

router.post('/items', async (req, res) => {
  const schema = Joi.object({
    part_no: Joi.string().required(),
    description: Joi.string().allow(''),
    uom: Joi.string().allow(''),
    min: Joi.number().min(0).default(0),
    max: Joi.number().min(0).default(0),
    location: Joi.string().allow(''),
    unit: Joi.string().default('UNIT-1'),
    department: Joi.string().default('MECH'),
    category: Joi.string().allow(''),
    manufacturer: Joi.string().allow(''),
    supplier: Joi.string().allow(''),
    unit_price: Joi.number().min(0).optional(),
    lead_time_days: Joi.number().min(0).optional(),
    reorder_point: Joi.number().min(0).optional(),
    expiry_dt: Joi.date().optional().allow(null),
    remarks: Joi.string().allow('')
  });
  const { value, error } = schema.validate(req.body, { stripUnknown: true });
  if (error) return res.status(400).json({ error: error.message });

  const exists = await InventoryItem.findOne({ part_no: value.part_no });
  if (exists) return res.status(409).json({ error: 'Part already exists' });

  const doc = await InventoryItem.create(value);
  res.status(201).json(doc);
});

router.put('/items/:id', async (req, res) => {
  const schema = Joi.object({
    part_no: Joi.string(),
    description: Joi.string().allow(''),
    uom: Joi.string().allow(''),
    min: Joi.number().min(0),
    max: Joi.number().min(0),
    location: Joi.string().allow(''),
    unit: Joi.string(),
    department: Joi.string(),
    category: Joi.string().allow(''),
    manufacturer: Joi.string().allow(''),
    supplier: Joi.string().allow(''),
    unit_price: Joi.number().min(0),
    lead_time_days: Joi.number().min(0),
    reorder_point: Joi.number().min(0),
    expiry_dt: Joi.date().optional().allow(null),
    remarks: Joi.string().allow('')
  });
  const { value, error } = schema.validate(req.body, { stripUnknown: true });
  if (error) return res.status(400).json({ error: error.message });

  const doc = await InventoryItem.findByIdAndUpdate(req.params.id, value, { new: true });
  if (!doc) return res.status(404).json({ error: 'Not found' });
  res.json(doc);
});

router.delete('/items/:id', async (req, res) => {
  const doc = await InventoryItem.findByIdAndDelete(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Not found' });
  res.json({ ok: true });
});

/* Transactions (read-only) */
router.get('/txns', async (_req, res) => {
  const rows = await InventoryTxn.find().sort({ txn_dt: -1 }).limit(500);
  res.json({ rows });
});

export default router;
