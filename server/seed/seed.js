import 'dotenv/config';
import mongoose from 'mongoose';

// IMPORTANT: this file must live at: server/seed/seed.js
// so that ../models/* resolves to server/models/*
import Unit from '../models/Unit.js';
import Department from '../models/Department.js';
import InventoryItem from '../models/InventoryItem.js';
import InventoryTxn from '../models/InventoryTxn.js';
import Maintenance from '../models/Maintenance.js';
import Logbook from '../models/Logbook.js';

async function run() {
  if (!process.env.MONGODB_URI) {
    console.error('❌ Missing MONGODB_URI in environment');
    process.exit(1);
  }

  console.log('Connecting to DB…');
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected');

  try {
    console.log('Seeding masters (Units, Departments)…');
    await Unit.deleteMany({});
    await Department.deleteMany({});
    await Unit.insertMany([
      { code: 'UNIT-1', name: 'Unit 1' },
      { code: 'UNIT-2', name: 'Unit 2' }
    ]);
    await Department.insertMany([
      { code: 'MECH', name: 'Mechanical' },
      { code: 'ELEC', name: 'Electrical' },
      { code: 'INST', name: 'Instrumentation' },
      { code: 'CIV',  name: 'Civil' }
    ]);

    console.log('Seeding inventory items…');
    await InventoryItem.deleteMany({});
    const items = await InventoryItem.insertMany([
      {
        part_no: 'BEARING-6205',
        description: 'Deep Groove Ball Bearing 6205',
        uom: 'NOS', min: 2, max: 10, location: 'Store-A1',
        unit: 'UNIT-1', department: 'MECH', category: 'Bearing', manufacturer: 'SKF'
      },
      {
        part_no: 'OIL-68',
        description: 'Hydraulic Oil ISO VG-68',
        uom: 'L', min: 50, max: 300, location: 'Oil Yard-01',
        unit: 'UNIT-1', department: 'MECH', category: 'Lubricants', supplier: 'IOC'
      },
      {
        part_no: 'FUSE-10A',
        description: 'Fuse 10A 250V',
        uom: 'NOS', min: 10, max: 100, location: 'Elec Rack-B2',
        unit: 'UNIT-2', department: 'ELEC', category: 'Electrical'
      }
    ]);

    console.log('Seeding inventory transactions…');
    await InventoryTxn.deleteMany({});
    const now = new Date();
    const daysAgo = (n) => new Date(now.getTime() - n*24*60*60*1000);
    await InventoryTxn.insertMany([
      { part_no: 'BEARING-6205', type: 'ISSUE', qty: 2, txn_dt: daysAgo(2),  ref: 'WO-1001' },
      { part_no: 'OIL-68',      type: 'RECEIPT', qty: 200, txn_dt: daysAgo(5), ref: 'PO-55'   },
      { part_no: 'FUSE-10A',    type: 'ISSUE', qty: 5, txn_dt: daysAgo(1),  ref: 'WO-1002' }
    ]);

    console.log('Seeding maintenance…');
    await Maintenance.deleteMany({});
    await Maintenance.insertMany([
      {
        type: 'BD',
        unit: 'UNIT-1', department: 'MECH',
        equipment_tag: 'PUMP-P1',
        fault: 'Bearing noise',
        cause: 'Wear',
        remedy: 'Replaced 6205',
        parts_used: [{ part_no: 'BEARING-6205', qty: 2 }],
        down_start: daysAgo(10), down_end: daysAgo(9),
        labor_hrs: 4, status: 'Completed', remarks: 'Normalised'
      },
      {
        type: 'PM',
        unit: 'UNIT-1', department: 'ELEC',
        equipment_tag: 'MOTOR-M2',
        fault: 'Planned lubrication',
        remedy: 'Topped up oil',
        parts_used: [{ part_no: 'OIL-68', qty: 20 }],
        down_start: daysAgo(7), down_end: daysAgo(7),
        labor_hrs: 2, status: 'Completed'
      },
      {
        type: 'CM',
        unit: 'UNIT-2', department: 'ELEC',
        equipment_tag: 'PANEL-DB1',
        fault: 'Fuse blown',
        remedy: 'Replaced 10A fuse',
        parts_used: [{ part_no: 'FUSE-10A', qty: 2 }],
        down_start: daysAgo(3), down_end: daysAgo(3),
        labor_hrs: 1, status: 'Completed'
      }
    ]);

    console.log('Seeding logbook…');
    await Logbook.deleteMany({});
    const yyyy_mm_dd = (d) => d.toISOString().slice(0,10);
    await Logbook.insertMany([
      {
        date: yyyy_mm_dd(daysAgo(2)), shift: 'A', unit: 'UNIT-1', department: 'MECH',
        summary: 'Unit running smooth',
        details: 'No abnormality',
        operator: 'Operator A', handed_over_to: 'Operator B',
        load_mw: 210, ambient_temp_c: 33,
        params: { boiler_pressure_bar: 170, turbine_inlet_temp_c: 530 }
      },
      {
        date: yyyy_mm_dd(daysAgo(1)), shift: 'B', unit: 'UNIT-2', department: 'ELEC',
        summary: 'Minor voltage fluctuation',
        details: 'Checked panels',
        operator: 'Operator C', handed_over_to: 'Operator A',
        load_mw: 195, ambient_temp_c: 31,
        params: { gen_voltage_kv: 11, frequency_hz: 50.0 }
      }
    ]);

    console.log('✅ Seed done.');
  } catch (err) {
    console.error('❌ Seed failed:', err);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

run().then(() => process.exit());
