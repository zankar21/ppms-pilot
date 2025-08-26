// models/Logbook.js
import mongoose from 'mongoose';

const LogbookSchema = new mongoose.Schema({
  date: { type: String, required: true }, // YYYY-MM-DD
  shift: { type: String, enum: ['A','B','C'], required: true },
  unit: { type: String, required: true, default: 'UNIT-1' },
  department: { type: String, default: 'MECH' }, // NEW

  summary: String,
  details: String,
  operator: String,
  handed_over_to: String,
  load_mw: Number,
  ambient_temp_c: Number,
  params: { type: Object },

  // ✅ AI/Vector search field
  embedding: { type: [Number], default: undefined }
}, { timestamps: true });

// Indexes
LogbookSchema.index({ date: -1, unit: 1, department: 1 });
// For Atlas Vector Search: create index via Atlas UI using logbook-embedding.json

export default mongoose.model('Logbook', LogbookSchema);
