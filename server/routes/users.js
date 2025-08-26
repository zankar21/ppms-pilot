import express from "express";
import User, { ROLES } from "../models/User.js";
import { authRequired, requireRoles } from "../middleware/auth.js";

const router = express.Router();

// GET /api/users  (admin)
router.get("/", authRequired, requireRoles("admin"), async (_req, res) => {
  const users = await User.find().sort({ createdAt: -1 });
  res.json({ rows: users });
});

// POST /api/users  (admin)
router.post("/", authRequired, requireRoles("admin"), async (req, res) => {
  const { name, email, password, role = "operator" } = req.body || {};
  if (!name || !email || !password) return res.status(400).json({ error: "name, email, password required" });
  if (!ROLES.includes(role)) return res.status(400).json({ error: "invalid role" });

  const exists = await User.findOne({ email });
  if (exists) return res.status(409).json({ error: "email already exists" });

  const user = await User.create({ name, email, password, role });
  res.status(201).json({ user: user.toJSON() });
});

// PATCH /api/users/:id  (admin)
router.patch("/:id", authRequired, requireRoles("admin"), async (req, res) => {
  const { role, isActive, name } = req.body || {};
  const patch = {};
  if (name) patch.name = name;
  if (role) {
    if (!ROLES.includes(role)) return res.status(400).json({ error: "invalid role" });
    patch.role = role;
  }
  if (typeof isActive === "boolean") patch.isActive = isActive;

  const user = await User.findByIdAndUpdate(req.params.id, patch, { new: true });
  if (!user) return res.status(404).json({ error: "not found" });
  res.json({ user: user.toJSON() });
});

// POST /api/users/:id/reset-password  (admin)
router.post("/:id/reset-password", authRequired, requireRoles("admin"), async (req, res) => {
  const { newPassword } = req.body || {};
  if (!newPassword || newPassword.length < 6) return res.status(400).json({ error: "newPassword min 6 chars" });
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ error: "not found" });
  user.password = newPassword;
  await user.save();
  res.json({ ok: true });
});

export default router;
