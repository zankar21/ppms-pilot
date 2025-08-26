import mongoose from 'mongoose';
const PartSchema = new mongoose.Schema({ part_no: String, qty: Number }, { _id: false });

const MaintenanceSchema = new mongoose.Schema({
  type: { type: String, enum: ['PM','CM','BD'], required: true },
  equipment_tag: { type: String },
  unit: { type: String, required: true, default: 'UNIT-1' },       // NEW
  department: { type: String, required: true, default: 'MECH' },   // NEW
  fault: { type: String },
  cause: { type: String },
  remedy: { type: String },
  down_start: { type: Date },
  down_end: { type: Date },
  labor_hrs: { type: Number },
  parts_used: [PartSchema],
  status: { type: String, enum: ['Open','In-Progress','Completed','Deferred'], default: 'Open' },
  remarks: { type: String },
  cost_estimate: { type: Number, default: 0 },
  cost_actual: { type: Number, default: 0 },
  technician: { type: String },
  work_order_id: { type: String }
}, { timestamps: true });

MaintenanceSchema.index({ createdAt: -1 });
MaintenanceSchema.index({ unit: 1, department: 1, createdAt: -1 });

export default mongoose.model('Maintenance', MaintenanceSchema);
