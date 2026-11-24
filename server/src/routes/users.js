import express from 'express';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { User, Inquiry, Followup } from '../models/index.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// GET /api/users - List users (Admin gets full details with workload stats, or staff/forDropdown gets active staff list)
router.get('/', authenticate, async (req, res) => {
  try {
    const { forDropdown } = req.query;

    if (forDropdown === 'true' || req.user.role === 'staff') {
      const activeStaff = await User.find({ is_active: 1 })
        .select('_id name email role phone')
        .sort({ name: 1 });
      return res.json({ users: activeStaff });
    }

    // Admin gets full details with workload stats
    const allUsers = await User.find()
      .select('_id name email role phone is_active created_at updated_at')
      .sort({ role: 1, name: 1 });

    const usersWithStats = await Promise.all(
      allUsers.map(async (u) => {
        const totalInquiries = await Inquiry.countDocuments({ assigned_to: u._id });
        const convertedInquiries = await Inquiry.countDocuments({
          assigned_to: u._id,
          status: 'Converted',
        });
        const pendingFollowups = await Followup.countDocuments({
          assigned_to: u._id,
          status: 'Pending',
        });

        const userObj = u.toJSON ? u.toJSON() : u.toObject();
        return {
          ...userObj,
          total_inquiries: totalInquiries,
          converted_inquiries: convertedInquiries,
          pending_followups: pendingFollowups,
        };
      })
    );

    res.json({ users: usersWithStats });
  } catch (err) {
    console.error('Fetch users error:', err);
    res.status(500).json({ error: 'Failed to retrieve users.' });
  }
});

// POST /api/users - Create new staff/admin (Admin only)
router.post('/', authenticate, requireAdmin, async (req, res) => {
  try {
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

    const existing = await User.findOne({
      email: new RegExp(`^${email.trim()}$`, 'i'),
    });
    if (existing) {
      return res.status(409).json({ error: 'A user with this email address already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

    const newUser = await User.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: hashedPassword,
      role: role || 'staff',
      phone: phone ? phone.trim() : null,
      is_active: 1,
      created_at: now,
      updated_at: now,
    });

    const userObj = newUser.toJSON ? newUser.toJSON() : newUser.toObject();
    delete userObj.password;

    res.status(201).json({ message: 'User created successfully.', user: userObj });
  } catch (err) {
    console.error('Create user error:', err);
    res.status(500).json({ error: 'Failed to create user.' });
  }
});

// PUT /api/users/:id - Edit staff (Admin only)
router.put('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const { name, email, role, phone, is_active } = req.body;

    // Protect against deactivating the last active admin
    if (is_active === 0 && user.role === 'admin') {
      const activeAdminsCount = await User.countDocuments({ role: 'admin', is_active: 1 });
      if (activeAdminsCount <= 1) {
        return res.status(400).json({ error: 'Cannot deactivate the only active administrator.' });
      }
    }

    if (email && email.trim().toLowerCase() !== user.email.toLowerCase()) {
      const existing = await User.findOne({
        email: new RegExp(`^${email.trim()}$`, 'i'),
        _id: { $ne: user._id },
      });
      if (existing) {
        return res.status(409).json({ error: 'Another user already uses this email.' });
      }
      user.email = email.trim().toLowerCase();
    }

    const oldName = user.name;
    if (name) user.name = name.trim();
    if (role) user.role = role;
    if (phone !== undefined) user.phone = phone ? phone.trim() : null;
    if (is_active !== undefined) user.is_active = is_active ? 1 : 0;
    user.updated_at = new Date().toISOString().replace('T', ' ').slice(0, 19);

    await user.save();

    // If staff name was updated, update cached assigned_to_name in inquiries
    if (name && name.trim() !== oldName) {
      await Inquiry.updateMany(
        { assigned_to: user._id },
        { assigned_to_name: user.name }
      );
    }

    const userObj = user.toJSON ? user.toJSON() : user.toObject();
    delete userObj.password;

    res.json({ message: 'User updated successfully.', user: userObj });
  } catch (err) {
    console.error('Update user error:', err);
    res.status(500).json({ error: 'Failed to update user.' });
  }
});

// PATCH /api/users/:id/reset-password - Admin reset password
router.patch('/:id/reset-password', authenticate, requireAdmin, async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.updated_at = new Date().toISOString().replace('T', ' ').slice(0, 19);
    await user.save();

    res.json({ message: 'Password reset successfully.' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Failed to reset password.' });
  }
});

export default router;
