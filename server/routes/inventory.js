import express from 'express';
import Joi from 'joi';
import InventoryItem from '../models/InventoryItem.js';
import InventoryTxn from '../models/InventoryTxn.js';
const router = express.Router();

// List items (paged + search)
router.get('/items', async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page || '1'));
  const limit = Math.min(100, parseInt(req.query.limit || '20'));
  const q = (req.query.q || '').trim();
  const where = q ? { $or: [{ part_no: new RegExp(q, 'i') }, { description: new RegExp(q, 'i') }] } : {};
  const [rows, total] = await Promise.all([
    InventoryItem.find(where).sort({ part_no: 1 }).skip((page-1)*limit).limit(limit),
    InventoryItem.countDocuments(where)
  ]);
  res.json({ rows, total, page, pages: Math.ceil(total/limit) });
});

// Create item
router.post('/items', async (req, res) => {
  const schema = Joi.object({
    part_no: Joi.string().required(),
    description: Joi.string().allow(''),
    uom: Joi.string().allow(''),
    min: Joi.number().min(0).default(0),
    max: Joi.number().min(0).default(0),
    lead_time_days: Joi.number().min(0).default(0),
    location: Joi.string().allow('')
  });
  const { value, error } = schema.validate(req.body, { stripUnknown: true });
  if (error) return res.status(400).json({ error: error.message });
  const doc = await InventoryItem.create(value);
  res.status(201).json(doc);
});

// Inventory transactions (GRN/issue/return)
router.get('/txns', async (req, res) => {
  const part = (req.query.part_no || '').trim();
  const where = part ? { part_no: part } : {};
  const rows = await InventoryTxn.find(where).sort({ txn_dt: -1 }).limit(500);
  res.json({ rows });
});

router.post('/txns', async (req, res) => {
  const schema = Joi.object({
    txn_dt: Joi.date().optional(),
    part_no: Joi.string().required(),
    type: Joi.string().valid('grn','issue','return').required(),
    qty: Joi.number().required(),
    cost_center: Joi.string().allow(''),
    work_order: Joi.string().allow(''),
    note: Joi.string().allow('')
  });
  const { value, error } = schema.validate(req.body, { stripUnknown: true });
  if (error) return res.status(400).json({ error: error.message });
  const doc = await InventoryTxn.create(value);
  res.status(201).json(doc);
});

export default router;
