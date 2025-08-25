import mongoose from 'mongoose';
const InventoryTxnSchema = new mongoose.Schema({
  txn_dt: { type: Date, default: Date.now },
  part_no: { type: String, required: true, index: true },
  type: { type: String, enum: ['grn','issue','return'], required: true },
  qty: { type: Number, required: true },
  cost_center: String,
  work_order: String,
  note: String
}, { timestamps: true });
export default mongoose.model('inventory_txn', InventoryTxnSchema);
