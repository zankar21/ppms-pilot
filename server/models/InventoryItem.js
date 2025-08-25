import mongoose from 'mongoose';
const InventoryItemSchema = new mongoose.Schema({
  part_no: { type: String, required: true, index: true },
  description: String,
  uom: String,
  min: { type: Number, default: 0 },
  max: { type: Number, default: 0 },
  lead_time_days: { type: Number, default: 0 },
  location: String
}, { timestamps: true });
export default mongoose.model('inventory_item', InventoryItemSchema);
