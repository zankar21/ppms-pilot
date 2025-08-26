// server/routes/auth.js
import express from 'express';
import jwt from 'jsonwebtoken';
import User, { ROLES } from '../models/User.js';

const router = express.Router();

/** Helper: issue a JWT */
function issueToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), role: user.role, email: user.email, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  );
}

/** Middleware: require auth, optional role gate */
export function requireAuth(roles = []) {
  return (req, res, next) => {
    try {
      const hdr = req.headers.authorization || '';
      const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : null;
      if (!token) return res.status(401).json({ ok: false, error: 'NO_TOKEN' });

      const payload = jwt.verify(token, process.env.JWT_SECRET);
      req.user = payload;

      if (roles.length && !roles.includes(payload.role)) {
        return res.status(403).json({ ok: false, error: 'FORBIDDEN' });
      }
      next();
    } catch (err) {
      return res.status(401).json({ ok: false, error: 'INVALID_TOKEN', details: err?.message });
    }
  };
}

/**
 * POST /api/auth/login
 * body: { email, password }
 */
router.post('/login', async (req, res) => {
  try {
    const { email = '', password = '' } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ ok: false, error: 'MISSING_CREDENTIALS' });
    }

    // Need passwordHash to validate; it's select:false in the schema
    const user = await User.findOne({ email }).select('+passwordHash name role email');
    if (!user) return res.status(401).json({ ok: false, error: 'BAD_CREDENTIALS' });

    const valid = await user.validatePassword(password);
    if (!valid) return res.status(401).json({ ok: false, error: 'BAD_CREDENTIALS' });

    user.lastLoginAt = new Date();
    await user.save();

    const token = issueToken(user);
    return res.json({
      ok: true,
      token,
      user: { id: user._id, email: user.email, name: user.name, role: user.role },
    });
  } catch (err) {
    console.error('AUTH /login error:', err);
    return res.status(500).json({ ok: false, error: 'LOGIN_FAILED', details: err?.message });
  }
});

/**
 * POST /api/auth/register  (admin-only)
 * body: { email, name, role, password }
 * Creates a new user. Use to seed accounts.
 */
router.post('/register', requireAuth(['admin']), async (req, res) => {
  try {
    const { email, name, role = 'operator', password } = req.body || {};
    if (!email || !password) return res.status(400).json({ ok: false, error: 'MISSING_FIELDS' });
    if (!ROLES.includes(role)) return res.status(400).json({ ok: false, error: 'INVALID_ROLE' });

    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ ok: false, error: 'EMAIL_EXISTS' });

    const user = await User.createWithPassword({ email, name, role, password });
    return res.status(201).json({ ok: true, user: user.toJSON() });
  } catch (err) {
    console.error('AUTH /register error:', err);
    return res.status(500).json({ ok: false, error: 'REGISTER_FAILED', details: err?.message });
  }
});

/**
 * GET /api/auth/me
 * Returns the current user (from token)
 */
router.get('/me', requireAuth(), async (req, res) => {
  try {
    const user = await User.findById(req.user.sub);
    if (!user) return res.status(404).json({ ok: false, error: 'USER_NOT_FOUND' });
    return res.json({ ok: true, user });
  } catch (err) {
    console.error('AUTH /me error:', err);
    return res.status(500).json({ ok: false, error: 'ME_FAILED', details: err?.message });
  }
});

export default router;
