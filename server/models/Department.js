import mongoose from 'mongoose';

const DepartmentSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true }, // MECH, ELEC, INST, CIV
  name: { type: String, required: true }
}, { timestamps: true });

export default mongoose.model('Department', DepartmentSchema);
