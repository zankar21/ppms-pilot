// models/InsightsDaily.js
import mongoose from 'mongoose';

const InsightsDailySchema = new mongoose.Schema({
  day: { type: String, index: true }, // e.g., '2025-08-24'
  summary: { type: String, default: '' },
  stats: {
    totalEntries: { type: Number, default: 0 },
    byUnit: { type: Map, of: Number, default: {} },
    byDepartment: { type: Map, of: Number, default: {} }
  }
}, { timestamps: true });

export default mongoose.model('InsightsDaily', InsightsDailySchema);
