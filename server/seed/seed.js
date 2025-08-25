import 'dotenv/config';
import mongoose from 'mongoose';
import InventoryItem from '../models/InventoryItem.js';
import InventoryTxn from '../models/InventoryTxn.js';
import Maintenance from '../models/Maintenance.js';
import Logbook from '../models/Logbook.js';

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  await Promise.all([
    InventoryItem.deleteMany({}),
    InventoryTxn.deleteMany({}),
    Maintenance.deleteMany({}),
    Logbook.deleteMany({})
  ]);

  await InventoryItem.insertMany([
    { part_no:'BEARING-6205', description:'Ball bearing 6205', uom:'nos', min:2, max:10, lead_time_days:7, location:'Store-A' },
    { part_no:'OIL-68', description:'Hydraulic Oil ISO 68', uom:'litre', min:50, max:200, lead_time_days:10, location:'Lube Room' }
  ]);

  await InventoryTxn.insertMany([
    { part_no:'BEARING-6205', type:'grn', qty:10, note:'Initial stock' },
    { part_no:'OIL-68', type:'grn', qty:200, note:'Initial stock' },
    { part_no:'BEARING-6205', type:'issue', qty:2, work_order:'IDFAN-1 repair' }
  ]);

  await Maintenance.insertMany([
    { equipment_tag:'IDFAN-1', type:'BD', fault:'Vibration high', down_start:new Date(), down_end:new Date(), labor_hrs:4, parts_used:[{ part_no:'BEARING-6205', qty:2 }] },
    { equipment_tag:'PUMP-2', type:'PM', fault:'Scheduled oil change', down_start:new Date(), down_end:new Date(), labor_hrs:2, parts_used:[{ part_no:'OIL-68', qty:10 }] }
  ]);

  await Logbook.insertMany([
    { date:'2025-08-25', shift:'A', unit:'Unit-1', author:'Operator-A', summary:'Normal ops', details:'No abnormality' },
    { date:'2025-08-25', shift:'B', unit:'Unit-1', author:'Operator-B', summary:'Minor noise in IDFAN-1', details:'Monitoring' }
  ]);

  console.log('Seeded ✔');
  process.exit(0);
};

run().catch(e => { console.error(e); process.exit(1); });
