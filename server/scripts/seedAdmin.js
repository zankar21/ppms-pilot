// server/scripts/seedAdmin.js
import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../models/User.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ppms';

async function main() {
  await mongoose.connect(MONGODB_URI);
  console.log('[DB] connected');

  const email = process.env.SEED_ADMIN_EMAIL || 'admin@plant.com';
  const password = process.env.SEED_ADMIN_PASSWORD || 'admin123';
  const name = 'System Admin';

  let user = await User.findOne({ email });
  if (user) {
    console.log(`[INFO] Admin user already exists: ${email}`);
  } else {
    user = await User.createWithPassword({
      email,
      name,
      role: 'admin',
      password,
    });
    console.log(`[OK] Created admin user: ${email} (password: ${password})`);
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
