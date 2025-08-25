import express from 'express';
import InventoryItem from '../models/InventoryItem.js';
import InventoryTxn from '../models/InventoryTxn.js';
import Maintenance from '../models/Maintenance.js';
import Logbook from '../models/Logbook.js';

const router = express.Router();

router.get('/', async (_req, res) => {
  const [items, txns, maint, logs] = await Promise.all([
    InventoryItem.countDocuments(),
    InventoryTxn.countDocuments(),
    Maintenance.countDocuments(),
    Logbook.countDocuments()
  ]);
  res.json({ inventory_items: items, inventory_txns: txns, maintenance: maint, logbook: logs });
});

// very simple forecast placeholder (to wire UI)
router.get('/forecast/spares', async (_req, res) => {
  // TODO: replace with ES/seasonal calc using InventoryTxn
  res.json({ horizon_days: 60, items: [] });
});

export default router;
