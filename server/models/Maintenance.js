import mongoose from 'mongoose';
const MaintenanceSchema = new mongoose.Schema({
  equipment_tag: { type: String, index: true },
  type: { type: String, enum: ['PM','CM','BD'], required: true }, // preventive/corrective/breakdown
  fault: String,
  cause: String,
  remedy: String,
  down_start: Date,
  down_end: Date,
  labor_hrs: Number,
  parts_used: [{ part_no: String, qty: Number }],
  remarks: String
}, { timestamps: true });
export default mongoose.model('maintenance', MaintenanceSchema);
