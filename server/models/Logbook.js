import mongoose from 'mongoose';
const LogbookSchema = new mongoose.Schema({
  date: { type: String, required: true }, // 'YYYY-MM-DD'
  shift: { type: String, enum: ['A','B','C'], required: true },
  unit: { type: String, required: true },
  author: String,
  summary: String,
  details: String,
  params: mongoose.Schema.Types.Mixed
}, { timestamps: true });
export default mongoose.model('logbook', LogbookSchema);
