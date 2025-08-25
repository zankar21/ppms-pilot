import express from 'express';
import Joi from 'joi';
import Logbook from '../models/Logbook.js';

const router = express.Router();

router.get('/', async (req, res) => {
  const { date, shift, unit, q } = req.query;
  const where = {};
  if (date) where.date = date;
  if (shift) where.shift = shift;
  if (unit) where.unit = unit;
  if (q) where.$or = [{ summary: new RegExp(q,'i') }, { details: new RegExp(q,'i') }];
  const rows = await Logbook.find(where).sort({ createdAt: -1 }).limit(500);
  res.json({ rows });
});

router.post('/', async (req, res) => {
  const schema = Joi.object({
    date: Joi.string().required(), // 'YYYY-MM-DD'
    shift: Joi.string().valid('A','B','C').required(),
    unit: Joi.string().required(),
    author: Joi.string().allow(''),
    summary: Joi.string().allow(''),
    details: Joi.string().allow(''),
    params: Joi.any()
  });
  const { value, error } = schema.validate(req.body, { stripUnknown: true });
  if (error) return res.status(400).json({ error: error.message });
  const doc = await Logbook.create(value);
  res.status(201).json(doc);
});

export default router;
