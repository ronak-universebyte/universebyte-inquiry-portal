import express from 'express';
import bcrypt from 'bcryptjs';
import db from '../db.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// GET /api/users - List users (Admin only, or staff can get active staff list for dropdown)
router.get('/', authenticate, (req, res) => {
  const { forDropdown } = req.query;

  if (forDropdown === 'true' || req.user.role === 'staff') {
    const activeStaff = db.prepare(`
      SELECT id, name, email, role, phone 
      FROM users 
      WHERE is_active = 1 
      ORDER BY name ASC
    `).all();
    return res.json({ users: activeStaff });
  }

  // Admin gets full details with workload stats
  const users = db.prepare(`
    SELECT 
      u.id, 
      u.name, 
      u.email, 
      u.role, 
      u.phone, 
      u.is_active, 
      u.created_at,
      u.updated_at,
      COUNT(DISTINCT i.id) as total_inquiries,
      SUM(CASE WHEN i.status = 'Converted' THEN 1 ELSE 0 END) as converted_inquiries,
      SUM(CASE WHEN i.status = 'Follow-up Required' OR f.id IS NOT NULL THEN 1 ELSE 0 END) as pending_followups
    FROM users u
    LEFT JOIN inquiries i ON i.assigned_to = u.id
    LEFT JOIN followups f ON f.inquiry_id = i.id AND f.status = 'Pending'
    GROUP BY u.id
    ORDER BY u.role ASC, u.name ASC
  `).all();

  res.json({ users });
});

// POST /api/users - Create new staff/admin (Admin only)
router.post('/', authenticate, requireAdmin, (req, res) => {
  const { name, email, password, role = 'staff', phone } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Name is required.' });
  }

  if (!email || !email.trim()) {
    return res.status(400).json({ error: 'Email is required.' });
  }

  if (!password || password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE LOWER(email) = LOWER(?)').get(email.trim());
  if (existing) {
    return res.status(409).json({ error: 'A user with this email address already exists.' });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

  const result = db.prepare(`
    INSERT INTO users (name, email, password, role, phone, is_active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 1, ?, ?)
  `).run(name.trim(), email.trim(), hashedPassword, role, phone ? phone.trim() : null, now, now);

  const newUser = db.prepare('SELECT id, name, email, role, phone, is_active, created_at FROM users WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ message: 'User created successfully.', user: newUser });
});

// PUT /api/users/:id - Edit staff (Admin only)
router.put('/:id', authenticate, requireAdmin, (req, res) => {
  const user = db.prepare('SELECT id, email, role FROM users WHERE id = ?').get(req.params.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found.' });
  }

  const { name, email, role, phone, is_active } = req.body;

  // Protect against deactivating the last active admin
  if (is_active === 0 && user.role === 'admin') {
    const activeAdminsCount = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'admin' AND is_active = 1").get().count;
    if (activeAdminsCount <= 1) {
      return res.status(400).json({ error: 'Cannot deactivate the only active administrator.' });
    }
  }

  if (email && email.trim() !== user.email) {
    const existing = db.prepare('SELECT id FROM users WHERE LOWER(email) = LOWER(?) AND id != ?').get(email.trim(), user.id);
    if (existing) {
      return res.status(409).json({ error: 'Another user already uses this email.' });
    }
  }

  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

  db.prepare(`
    UPDATE users SET 
      name = COALESCE(?, name),
      email = COALESCE(?, email),
      role = COALESCE(?, role),
      phone = COALESCE(?, phone),
      is_active = COALESCE(?, is_active),
      updated_at = ?
    WHERE id = ?
  `).run(
    name ? name.trim() : null,
    email ? email.trim() : null,
    role || null,
    phone !== undefined ? phone : null,
    is_active !== undefined ? (is_active ? 1 : 0) : null,
    now,
    user.id
  );

  const updatedUser = db.prepare('SELECT id, name, email, role, phone, is_active, created_at, updated_at FROM users WHERE id = ?').get(user.id);
  res.json({ message: 'User updated successfully.', user: updatedUser });
});

// PATCH /api/users/:id/reset-password - Admin reset password
router.patch('/:id/reset-password', authenticate, requireAdmin, (req, res) => {
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
  }

  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found.' });
  }

  const hashedPassword = bcrypt.hashSync(newPassword, 10);
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

  db.prepare(`UPDATE users SET password = ?, updated_at = ? WHERE id = ?`).run(hashedPassword, now, user.id);
  res.json({ message: 'Password reset successfully.' });
});

export default router;
