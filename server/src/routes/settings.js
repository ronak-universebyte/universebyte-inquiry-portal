import express from 'express';
import mongoose from 'mongoose';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import Setting from '../models/Setting.js';
import Course from '../models/Course.js';
import InquirySource from '../models/InquirySource.js';

const router = express.Router();

// GET /api/settings - Read settings
router.get('/', authenticate, async (req, res) => {
  try {
    const settingsDocs = await Setting.find({});
    const settings = {};
    for (const doc of settingsDocs) {
      settings[doc.key] = doc.value;
    }

    const totalCourses = await Course.countDocuments({});
    const activeCourses = await Course.countDocuments({ is_active: 1 });
    const totalSources = await InquirySource.countDocuments({});
    const activeSources = await InquirySource.countDocuments({ is_active: 1 });

    res.json({
      settings,
      summary: {
        totalCourses,
        activeCourses,
        totalSources,
        activeSources,
      },
    });
  } catch (err) {
    console.error('Get settings error:', err);
    res.status(500).json({ error: 'Failed to retrieve settings.' });
  }
});

// PUT /api/settings - Update general settings (Admin only)
router.put('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const allowedKeys = [
      'company_name',
      'company_tagline',
      'company_location',
      'company_website',
      'company_whatsapp',
      'company_phone',
      'company_email',
      'company_logo',
      'allow_duplicate_mobile',
      'default_inquiry_status',
      'currency_symbol',
    ];

    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

    const ops = [];
    for (const [key, val] of Object.entries(req.body)) {
      if (allowedKeys.includes(key) && typeof val === 'string') {
        ops.push(
          Setting.findOneAndUpdate(
            { key },
            { $set: { value: val.trim(), updated_at: now } },
            { upsert: true, new: true }
          )
        );
      }
    }

    await Promise.all(ops);
    res.json({ message: 'Settings updated successfully.' });
  } catch (err) {
    console.error('Update settings error:', err);
    res.status(500).json({ error: 'Failed to update settings.' });
  }
});

// GET /api/settings/courses - List courses
router.get('/courses', authenticate, async (req, res) => {
  try {
    const { includeInactive } = req.query;
    const filter = includeInactive === 'true' ? {} : { is_active: 1 };
    const courses = await Course.find(filter).sort({ is_active: -1, name: 1 });
    res.json({ courses });
  } catch (err) {
    console.error('Get courses error:', err);
    res.status(500).json({ error: 'Failed to retrieve courses.' });
  }
});

// POST /api/settings/courses - Add course (Admin only)
router.post('/courses', authenticate, requireAdmin, async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Course name is required.' });
    }

    const regex = new RegExp(`^${name.trim()}$`, 'i');
    const existing = await Course.findOne({ name: regex });
    if (existing) {
      return res.status(409).json({ error: 'Course already exists with this name.' });
    }

    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const newCourse = await Course.create({
      name: name.trim(),
      description: description ? description.trim() : '',
      is_active: 1,
      created_at: now,
      updated_at: now,
    });

    res.status(201).json({ message: 'Course added successfully.', course: newCourse });
  } catch (err) {
    console.error('Add course error:', err);
    res.status(500).json({ error: 'Failed to add course.' });
  }
});

// PUT /api/settings/courses/:id - Edit / Toggle course (Admin only)
router.put('/courses/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const courseId = req.params.id;
    let course = null;

    if (mongoose.Types.ObjectId.isValid(courseId)) {
      course = await Course.findById(courseId);
    }

    if (!course) {
      return res.status(404).json({ error: 'Course not found.' });
    }

    const { name, description, is_active } = req.body;
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

    if (name) course.name = name.trim();
    if (description !== undefined) course.description = description ? description.trim() : '';
    if (is_active !== undefined) course.is_active = is_active ? 1 : 0;
    course.updated_at = now;

    await course.save();
    res.json({ message: 'Course updated successfully.', course });
  } catch (err) {
    console.error('Update course error:', err);
    res.status(500).json({ error: 'Failed to update course.' });
  }
});

// GET /api/settings/sources - List sources
router.get('/sources', authenticate, async (req, res) => {
  try {
    const { includeInactive } = req.query;
    const filter = includeInactive === 'true' ? {} : { is_active: 1 };
    const sources = await InquirySource.find(filter).sort({ is_active: -1, name: 1 });
    res.json({ sources });
  } catch (err) {
    console.error('Get sources error:', err);
    res.status(500).json({ error: 'Failed to retrieve sources.' });
  }
});

// POST /api/settings/sources - Add source (Admin only)
router.post('/sources', authenticate, requireAdmin, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Source name is required.' });
    }

    const regex = new RegExp(`^${name.trim()}$`, 'i');
    const existing = await InquirySource.findOne({ name: regex });
    if (existing) {
      return res.status(409).json({ error: 'Source already exists with this name.' });
    }

    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const newSource = await InquirySource.create({
      name: name.trim(),
      is_active: 1,
      created_at: now,
      updated_at: now,
    });

    res.status(201).json({ message: 'Source added successfully.', source: newSource });
  } catch (err) {
    console.error('Add source error:', err);
    res.status(500).json({ error: 'Failed to add source.' });
  }
});

// PUT /api/settings/sources/:id - Edit / Toggle source (Admin only)
router.put('/sources/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const sourceId = req.params.id;
    let source = null;

    if (mongoose.Types.ObjectId.isValid(sourceId)) {
      source = await InquirySource.findById(sourceId);
    }

    if (!source) {
      return res.status(404).json({ error: 'Source not found.' });
    }

    const { name, is_active } = req.body;
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

    if (name) source.name = name.trim();
    if (is_active !== undefined) source.is_active = is_active ? 1 : 0;
    source.updated_at = now;

    await source.save();
    res.json({ message: 'Source updated successfully.', source });
  } catch (err) {
    console.error('Update source error:', err);
    res.status(500).json({ error: 'Failed to update source.' });
  }
});

// GET /api/settings/statuses - List inquiry statuses
router.get('/statuses', authenticate, (req, res) => {
  const statuses = [
    { name: 'New', description: 'Fresh inquiry received, awaiting initial contact.', badgeColor: 'bg-blue-100 text-blue-800' },
    { name: 'Contacted', description: 'Initial contact made via call, WhatsApp, or email.', badgeColor: 'bg-purple-100 text-purple-800' },
    { name: 'Interested', description: 'Student expressed positive interest in syllabus and batch.', badgeColor: 'bg-emerald-100 text-emerald-800' },
    { name: 'Follow-up Required', description: 'Follow-up call or meeting required on scheduled date.', badgeColor: 'bg-amber-100 text-amber-800' },
    { name: 'Demo Scheduled', description: 'Demo lecture or batch trial session scheduled.', badgeColor: 'bg-indigo-100 text-indigo-800' },
    { name: 'Converted', description: 'Student enrolled and registered successfully.', badgeColor: 'bg-green-100 text-green-800' },
    { name: 'Not Interested', description: 'Student declined enrollment or opted for other plans.', badgeColor: 'bg-rose-100 text-rose-800' },
    { name: 'Invalid Number', description: 'Wrong number, unreachable or spam inquiry.', badgeColor: 'bg-gray-100 text-gray-800' },
  ];

  res.json({ statuses });
});

export default router;
