import mongoose from 'mongoose';

const InventoryItemSchema = new mongoose.Schema({
  part_no: { type: String, required: true, unique: true },
  description: String,
  uom: String,
  min: { type: Number, default: 0 },
  max: { type: Number, default: 0 },
  location: String,
  unit: { type: String, default: 'UNIT-1' },            // NEW
  department: { type: String, default: 'MECH' },        // NEW
  category: String,
  manufacturer: String,
  supplier: String,
  unit_price: Number,
  lead_time_days: Number,
  reorder_point: Number,
  expiry_dt: Date,
  remarks: String
}, { timestamps: true });

InventoryItemSchema.index({ unit: 1, department: 1, part_no: 1 });

export default mongoose.model('InventoryItem', InventoryItemSchema);
