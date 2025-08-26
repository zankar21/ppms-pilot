import "dotenv/config";
import mongoose from "mongoose";
import User from "../models/User.js";

const [,, email, password, name = "Admin"] = process.argv;
if (!email || !password) {
  console.error("Usage: node server/scripts/createAdmin.js <email> <password> [name]");
  process.exit(1);
}

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  let u = await User.findOne({ email });
  if (!u) {
    u = await User.create({ email, password, name, role: "admin" });
    console.log("Admin created:", u.email);
  } else {
    console.log("Admin already exists:", u.email);
  }
  await mongoose.disconnect();
})();
