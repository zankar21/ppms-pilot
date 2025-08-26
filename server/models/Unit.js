import mongoose from 'mongoose';

const UnitSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true }, // e.g., UNIT-1
  name: { type: String, required: true },                // e.g., Boiler Unit 1
  plant: { type: String, default: 'Main Plant' }
}, { timestamps: true });

export default mongoose.model('Unit', UnitSchema);
