import express from 'express';
import db from '../db.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// GET /api/settings - Read settings
router.get('/', authenticate, (req, res) => {
  const settingsRows = db.prepare('SELECT key, value, description FROM settings').all();
  const settings = {};
  for (const row of settingsRows) {
    settings[row.key] = row.value;
  }

  // Also send course and source counts for settings overview
  const totalCourses = db.prepare('SELECT COUNT(*) as count FROM courses').get().count;
  const activeCourses = db.prepare('SELECT COUNT(*) as count FROM courses WHERE is_active = 1').get().count;
  const totalSources = db.prepare('SELECT COUNT(*) as count FROM inquiry_sources').get().count;
  const activeSources = db.prepare('SELECT COUNT(*) as count FROM inquiry_sources WHERE is_active = 1').get().count;

  res.json({
    settings,
    summary: {
      totalCourses,
      activeCourses,
      totalSources,
      activeSources
    }
  });
});

// PUT /api/settings - Update general settings (Admin only)
router.put('/', authenticate, requireAdmin, (req, res) => {
  const allowedKeys = [
    'company_name',
    'company_tagline',
    'company_location',
    'company_website',
    'company_whatsapp',
    'company_phone',
    'company_email',
    'company_logo',
    'allow_duplicate_mobile'
  ];

  const updateStmt = db.prepare(`
    INSERT OR REPLACE INTO settings (key, value, updated_at) 
    VALUES (?, ?, datetime('now', 'localtime'))
  `);

  db.transaction(() => {
    for (const [key, val] of Object.entries(req.body)) {
      if (allowedKeys.includes(key) && typeof val === 'string') {
        updateStmt.run(key, val.trim());
      }
    }
  })();

  res.json({ message: 'Settings updated successfully.' });
});

// GET /api/settings/courses - List courses
router.get('/courses', authenticate, (req, res) => {
  const { includeInactive } = req.query;
  const query = includeInactive === 'true' 
    ? 'SELECT * FROM courses ORDER BY is_active DESC, name ASC'
    : 'SELECT * FROM courses WHERE is_active = 1 ORDER BY name ASC';
  
  const courses = db.prepare(query).all();
  res.json({ courses });
});

// POST /api/settings/courses - Add course (Admin only)
router.post('/courses', authenticate, requireAdmin, (req, res) => {
  const { name, description } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Course name is required.' });
  }

  const existing = db.prepare('SELECT id FROM courses WHERE LOWER(name) = LOWER(?)').get(name.trim());
  if (existing) {
    return res.status(409).json({ error: 'Course already exists with this name.' });
  }

  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
  const result = db.prepare(`
    INSERT INTO courses (name, description, is_active, created_at, updated_at)
    VALUES (?, ?, 1, ?, ?)
  `).run(name.trim(), description ? description.trim() : null, now, now);

  const newCourse = db.prepare('SELECT * FROM courses WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ message: 'Course added successfully.', course: newCourse });
});

// PUT /api/settings/courses/:id - Edit / Toggle course (Admin only)
router.put('/courses/:id', authenticate, requireAdmin, (req, res) => {
  const course = db.prepare('SELECT * FROM courses WHERE id = ?').get(req.params.id);
  if (!course) {
    return res.status(404).json({ error: 'Course not found.' });
  }

  const { name, description, is_active } = req.body;
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

  db.prepare(`
    UPDATE courses SET 
      name = COALESCE(?, name),
      description = COALESCE(?, description),
      is_active = COALESCE(?, is_active),
      updated_at = ?
    WHERE id = ?
  `).run(
    name ? name.trim() : null,
    description !== undefined ? description : null,
    is_active !== undefined ? (is_active ? 1 : 0) : null,
    now,
    course.id
  );

  const updatedCourse = db.prepare('SELECT * FROM courses WHERE id = ?').get(course.id);
  res.json({ message: 'Course updated successfully.', course: updatedCourse });
});

// GET /api/settings/sources - List sources
router.get('/sources', authenticate, (req, res) => {
  const { includeInactive } = req.query;
  const query = includeInactive === 'true'
    ? 'SELECT * FROM inquiry_sources ORDER BY is_active DESC, name ASC'
    : 'SELECT * FROM inquiry_sources WHERE is_active = 1 ORDER BY name ASC';

  const sources = db.prepare(query).all();
  res.json({ sources });
});

// POST /api/settings/sources - Add source (Admin only)
router.post('/sources', authenticate, requireAdmin, (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Source name is required.' });
  }

  const existing = db.prepare('SELECT id FROM inquiry_sources WHERE LOWER(name) = LOWER(?)').get(name.trim());
  if (existing) {
    return res.status(409).json({ error: 'Source already exists with this name.' });
  }

  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
  const result = db.prepare(`
    INSERT INTO inquiry_sources (name, is_active, created_at, updated_at)
    VALUES (?, 1, ?, ?)
  `).run(name.trim(), now, now);

  const newSource = db.prepare('SELECT * FROM inquiry_sources WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ message: 'Source added successfully.', source: newSource });
});

// PUT /api/settings/sources/:id - Edit / Toggle source (Admin only)
router.put('/sources/:id', authenticate, requireAdmin, (req, res) => {
  const source = db.prepare('SELECT * FROM inquiry_sources WHERE id = ?').get(req.params.id);
  if (!source) {
    return res.status(404).json({ error: 'Source not found.' });
  }

  const { name, is_active } = req.body;
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

  db.prepare(`
    UPDATE inquiry_sources SET 
      name = COALESCE(?, name),
      is_active = COALESCE(?, is_active),
      updated_at = ?
    WHERE id = ?
  `).run(
    name ? name.trim() : null,
    is_active !== undefined ? (is_active ? 1 : 0) : null,
    now,
    source.id
  );

  const updatedSource = db.prepare('SELECT * FROM inquiry_sources WHERE id = ?').get(source.id);
  res.json({ message: 'Source updated successfully.', source: updatedSource });
});

// GET /api/settings/statuses - List inquiry statuses and their descriptions
router.get('/statuses', authenticate, (req, res) => {
  const statuses = [
    { name: 'New', description: 'Fresh inquiry received, awaiting initial contact.', badgeColor: 'bg-blue-100 text-blue-800' },
    { name: 'Contacted', description: 'Initial contact made via call, WhatsApp, or email.', badgeColor: 'bg-purple-100 text-purple-800' },
    { name: 'Interested', description: 'Student expressed positive interest in syllabus and batch.', badgeColor: 'bg-emerald-100 text-emerald-800' },
    { name: 'Follow-up Required', description: 'Follow-up call or meeting required on scheduled date.', badgeColor: 'bg-amber-100 text-amber-800' },
    { name: 'Demo Scheduled', description: 'Demo lecture or batch trial session scheduled.', badgeColor: 'bg-indigo-100 text-indigo-800' },
    { name: 'Converted', description: 'Student enrolled and registered successfully.', badgeColor: 'bg-green-100 text-green-800' },
    { name: 'Not Interested', description: 'Student declined enrollment or opted for other plans.', badgeColor: 'bg-rose-100 text-rose-800' },
    { name: 'Invalid Number', description: 'Wrong number, unreachable or spam inquiry.', badgeColor: 'bg-gray-100 text-gray-800' }
  ];

  res.json({ statuses });
});

export default router;
