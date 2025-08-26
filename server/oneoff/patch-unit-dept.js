// server/oneoff/patch-unit-dept.js
import 'dotenv/config';
import mongoose from 'mongoose';
import Maintenance from '../models/Maintenance.js';
import InventoryItem from '../models/InventoryItem.js';
import Logbook from '../models/Logbook.js';

await mongoose.connect(process.env.MONGODB_URI);

// Default fill
await Maintenance.updateMany(
  { unit: { $exists: false } },
  { $set: { unit: 'UNIT-1', department: 'MECH' } }
);
await InventoryItem.updateMany(
  { unit: { $exists: false } },
  { $set: { unit: 'UNIT-1', department: 'MECH' } }
);
await Logbook.updateMany(
  { unit: { $exists: false } },
  { $set: { unit: 'UNIT-1', department: 'MECH' } }
);

console.log('Patched unit/department defaults.');
process.exit(0);
