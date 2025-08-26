// models/Telemetry.js
// Basic telemetry model used by anomaly route. Adjust fields to match your data.
import mongoose from 'mongoose';

const TelemetrySchema = new mongoose.Schema({
  unit: { type: String, index: true },
  department: { type: String, index: true },
  tag: { type: String, index: true },
  value: { type: Number, required: true },
  ts: { type: Date, default: Date.now, index: true }
}, { timestamps: true });

export default mongoose.model('Telemetry', TelemetrySchema);
