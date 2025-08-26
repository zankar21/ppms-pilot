// server/models/User.js
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const ROLES = ['operator', 'engineer', 'admin'];

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, index: true, trim: true },
    name: { type: String, trim: true },
    passwordHash: { type: String, select: false },
    role: { type: String, enum: ROLES, default: 'operator', index: true },
    // optional: for future password reset / audit
    lastLoginAt: { type: Date },
  },
  { timestamps: true }
);

// Hide sensitive fields when converting to JSON
userSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.passwordHash;
    return ret;
  },
});

// Instance methods
userSchema.methods.setPassword = async function setPassword(plain) {
  const salt = await bcrypt.genSalt(10);
  this.passwordHash = await bcrypt.hash(plain, salt);
};

userSchema.methods.validatePassword = async function validatePassword(plain) {
  if (!this.passwordHash) return false;
  return bcrypt.compare(plain, this.passwordHash);
};

// Static helper to create user with password
userSchema.statics.createWithPassword = async function createWithPassword({
  email,
  name,
  role = 'operator',
  password,
}) {
  const user = new this({ email, name, role });
  await user.setPassword(password);
  return user.save();
};

const User = mongoose.model('User', userSchema);
export default User;
export { ROLES };
