import express from 'express';
import db from '../db.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { generateInquiryId } from '../utils/idGenerator.js';
import * as XLSX from 'xlsx';

const router = express.Router();

// Helper to format Indian mobile number (strips spaces, dashes, +91)
function sanitizeMobile(mobile) {
  if (!mobile) return '';
  let cleaned = mobile.toString().replace(/[\s\-\(\)]/g, '');
  if (cleaned.startsWith('+91')) cleaned = cleaned.substring(3);
  else if (cleaned.startsWith('91') && cleaned.length === 12) cleaned = cleaned.substring(2);
  else if (cleaned.startsWith('0') && cleaned.length === 11) cleaned = cleaned.substring(1);
  return cleaned;
}

function isValidIndianMobile(mobile) {
  const sanitized = sanitizeMobile(mobile);
  return /^[6-9]\d{9}$/.test(sanitized);
}

// GET /api/inquiries/check-duplicate
router.get('/check-duplicate', authenticate, (req, res) => {
  const { mobile, excludeId } = req.query;
  if (!mobile) {
    return res.json({ isDuplicate: false, existingInquiry: null });
  }

  const sanitized = sanitizeMobile(mobile);
  let query = 'SELECT id, inquiry_id, student_name, mobile, course_name, status, assigned_to_name, inquiry_date FROM inquiries WHERE (mobile = ? OR mobile = ? OR mobile LIKE ?)';
  const params = [mobile, sanitized, `%${sanitized}`];

  if (excludeId) {
    query += ' AND id != ?';
    params.push(excludeId);
  }

  query += ' LIMIT 1';
  const existing = db.prepare(query).get(...params);

  if (existing) {
    return res.json({
      isDuplicate: true,
      existingInquiry: existing
    });
  }

  return res.json({ isDuplicate: false, existingInquiry: null });
});

// GET /api/inquiries
router.get('/', authenticate, (req, res) => {
  const {
    search,
    course,
    source,
    status,
    priority,
    assigned_to,
    date_from,
    date_to,
    followup_date_from,
    followup_date_to,
    sort_by = 'latest',
    page = 1,
    limit = 10
  } = req.query;

  const conditions = [];
  const params = [];

  // Role scoping: Staff can only see their own inquiries
  if (req.user.role === 'staff') {
    conditions.push('(assigned_to = ? OR created_by = ?)');
    params.push(req.user.id, req.user.id);
  } else if (assigned_to) {
    conditions.push('assigned_to = ?');
    params.push(assigned_to);
  }

  if (search && search.trim()) {
    const term = `%${search.trim()}%`;
    conditions.push('(inquiry_id LIKE ? OR student_name LIKE ? OR mobile LIKE ? OR email LIKE ?)');
    params.push(term, term, term, term);
  }

  if (course && course !== 'all') {
    conditions.push('course_name = ?');
    params.push(course);
  }

  if (source && source !== 'all') {
    conditions.push('source_name = ?');
    params.push(source);
  }

  if (status && status !== 'all') {
    conditions.push('status = ?');
    params.push(status);
  }

  if (priority && priority !== 'all') {
    conditions.push('priority = ?');
    params.push(priority);
  }

  if (date_from) {
    conditions.push('date(inquiry_date) >= date(?)');
    params.push(date_from);
  }

  if (date_to) {
    conditions.push('date(inquiry_date) <= date(?)');
    params.push(date_to);
  }

  if (followup_date_from) {
    conditions.push('date(next_followup_date) >= date(?)');
    params.push(followup_date_from);
  }

  if (followup_date_to) {
    conditions.push('date(next_followup_date) <= date(?)');
    params.push(followup_date_to);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Count total matching
  const totalCount = db.prepare(`SELECT COUNT(*) as count FROM inquiries ${whereClause}`).get(...params).count;

  // Sorting
  let orderBy = 'inquiry_date DESC, id DESC';
  if (sort_by === 'oldest') {
    orderBy = 'inquiry_date ASC, id ASC';
  } else if (sort_by === 'name_asc') {
    orderBy = 'student_name ASC';
  } else if (sort_by === 'name_desc') {
    orderBy = 'student_name DESC';
  } else if (sort_by === 'priority_high') {
    orderBy = "CASE priority WHEN 'High' THEN 1 WHEN 'Medium' THEN 2 WHEN 'Low' THEN 3 ELSE 4 END, inquiry_date DESC";
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
  const offset = (pageNum - 1) * limitNum;

  const inquiries = db.prepare(`
    SELECT * FROM inquiries 
    ${whereClause} 
    ORDER BY ${orderBy} 
    LIMIT ? OFFSET ?
  `).all(...params, limitNum, offset);

  res.json({
    inquiries,
    pagination: {
      total: totalCount,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(totalCount / limitNum) || 1
    }
  });
});

// GET /api/inquiries/export
router.get('/export', authenticate, (req, res) => {
  const { format = 'csv', search, course, source, status, priority, assigned_to, date_from, date_to } = req.query;

  const conditions = [];
  const params = [];

  if (req.user.role === 'staff') {
    conditions.push('(assigned_to = ? OR created_by = ?)');
    params.push(req.user.id, req.user.id);
  } else if (assigned_to) {
    conditions.push('assigned_to = ?');
    params.push(assigned_to);
  }

  if (search && search.trim()) {
    const term = `%${search.trim()}%`;
    conditions.push('(inquiry_id LIKE ? OR student_name LIKE ? OR mobile LIKE ? OR email LIKE ?)');
    params.push(term, term, term, term);
  }

  if (course && course !== 'all') {
    conditions.push('course_name = ?');
    params.push(course);
  }

  if (source && source !== 'all') {
    conditions.push('source_name = ?');
    params.push(source);
  }

  if (status && status !== 'all') {
    conditions.push('status = ?');
    params.push(status);
  }

  if (priority && priority !== 'all') {
    conditions.push('priority = ?');
    params.push(priority);
  }

  if (date_from) {
    conditions.push('date(inquiry_date) >= date(?)');
    params.push(date_from);
  }

  if (date_to) {
    conditions.push('date(inquiry_date) <= date(?)');
    params.push(date_to);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const rows = db.prepare(`SELECT * FROM inquiries ${whereClause} ORDER BY inquiry_date DESC`).all(...params);

  const exportData = rows.map(r => ({
    'Inquiry ID': r.inquiry_id,
    'Student Name': r.student_name,
    'Mobile Number': r.mobile,
    'Alt Mobile': r.alt_mobile || '',
    'Email Address': r.email || '',
    'Qualification': r.qualification || '',
    'College / University': r.college || '',
    'Current Status': r.current_status || '',
    'City': r.city || '',
    'Course': r.course_name,
    'Lead Source': r.source_name,
    'Status': r.status,
    'Priority': r.priority,
    'Assigned Staff': r.assigned_to_name || 'Unassigned',
    'Next Follow-up': r.next_followup_date || '',
    'Last Contact Date': r.last_contact_date || '',
    'Remarks': r.remarks || '',
    'Inquiry Date': r.inquiry_date
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(exportData);
  XLSX.utils.book_append_sheet(wb, ws, 'Inquiries');

  const filename = `UniverseByte_Inquiries_${new Date().toISOString().slice(0, 10)}`;

  if (format === 'xlsx') {
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    return res.send(buffer);
  } else {
    const csv = XLSX.utils.sheet_to_csv(ws);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
    res.setHeader('Content-Type', 'text/csv');
    return res.send(csv);
  }
});

// GET /api/inquiries/:id
router.get('/:id', authenticate, (req, res) => {
  const inquiry = db.prepare('SELECT * FROM inquiries WHERE id = ?').get(req.params.id);

  if (!inquiry) {
    return res.status(404).json({ error: 'Inquiry not found.' });
  }

  // Role check: staff can only see their own inquiries
  if (req.user.role === 'staff' && inquiry.assigned_to !== req.user.id && inquiry.created_by !== req.user.id) {
    return res.status(403).json({ error: 'Access denied to this inquiry.' });
  }

  // Get activities
  const activities = db.prepare(`
    SELECT * FROM inquiry_activities 
    WHERE inquiry_id = ? 
    ORDER BY created_at DESC, id DESC
  `).all(inquiry.id);

  // Get followups
  const followups = db.prepare(`
    SELECT * FROM followups 
    WHERE inquiry_id = ? 
    ORDER BY scheduled_date DESC, id DESC
  `).all(inquiry.id);

  res.json({
    inquiry,
    activities,
    followups
  });
});

// POST /api/inquiries
router.post('/', authenticate, (req, res) => {
  const {
    student_name,
    mobile,
    alt_mobile,
    email,
    qualification,
    college,
    current_status = 'Student',
    city = 'Ahmedabad',
    course_name,
    source_name,
    preferred_contact_time = 'Any Time',
    assigned_to,
    status = 'New',
    priority = 'Medium',
    next_followup_date,
    remarks,
    allow_duplicate = false
  } = req.body;

  // Validation
  if (!student_name || !student_name.trim()) {
    return res.status(400).json({ error: 'Student full name is required.' });
  }

  if (!mobile || !mobile.trim()) {
    return res.status(400).json({ error: 'Mobile number is required.' });
  }

  const sanitizedMobile = sanitizeMobile(mobile);
  if (!isValidIndianMobile(sanitizedMobile)) {
    return res.status(400).json({ error: 'Please enter a valid 10-digit Indian mobile number.' });
  }

  if (!course_name) {
    return res.status(400).json({ error: 'Interested course is required.' });
  }

  if (!source_name) {
    return res.status(400).json({ error: 'Inquiry source is required.' });
  }

  // Duplicate mobile check
  if (!allow_duplicate) {
    const existing = db.prepare('SELECT id, inquiry_id, student_name FROM inquiries WHERE mobile = ? OR mobile = ?').get(mobile, sanitizedMobile);
    if (existing) {
      return res.status(409).json({
        error: `Inquiry with mobile number ${sanitizedMobile} already exists (${existing.inquiry_id} - ${existing.student_name}).`,
        existingInquiry: existing
      });
    }
  }

  // Determine assigned staff name
  let assignedStaffName = null;
  let targetAssignedTo = assigned_to ? parseInt(assigned_to, 10) : null;

  if (targetAssignedTo) {
    const staff = db.prepare('SELECT name FROM users WHERE id = ?').get(targetAssignedTo);
    if (staff) assignedStaffName = staff.name;
  } else if (req.user.role === 'staff') {
    targetAssignedTo = req.user.id;
    assignedStaffName = req.user.name;
  }

  const inquiry_id = generateInquiryId();
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

  // Transaction for atomic insertion of inquiry, activity, and optional followup
  const insertTransaction = db.transaction(() => {
    const insertStmt = db.prepare(`
      INSERT INTO inquiries (
        inquiry_id, student_name, mobile, alt_mobile, email,
        qualification, college, current_status, city,
        course_name, source_name, inquiry_date, preferred_contact_time,
        assigned_to, assigned_to_name, status, priority,
        next_followup_date, remarks, created_by, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?
      )
    `);

    const result = insertStmt.run(
      inquiry_id, student_name.trim(), sanitizedMobile, alt_mobile ? sanitizeMobile(alt_mobile) : null, email ? email.trim() : null,
      qualification ? qualification.trim() : null, college ? college.trim() : null, current_status, city ? city.trim() : 'Ahmedabad',
      course_name, source_name, now, preferred_contact_time,
      targetAssignedTo, assignedStaffName, status, priority,
      next_followup_date || null, remarks || null, req.user.id, now, now
    );

    const newInquiryId = result.lastInsertRowid;

    // Record creation activity
    db.prepare(`
      INSERT INTO inquiry_activities (
        inquiry_id, user_id, user_name, activity_type,
        description, previous_value, new_value, created_at
      ) VALUES (?, ?, ?, 'CREATED', ?, null, ?, ?)
    `).run(
      newInquiryId, req.user.id, req.user.name,
      `Inquiry created via ${source_name} for ${course_name}`,
      status, now
    );

    // If assigned, log activity
    if (assignedStaffName) {
      db.prepare(`
        INSERT INTO inquiry_activities (
          inquiry_id, user_id, user_name, activity_type,
          description, previous_value, new_value, created_at
        ) VALUES (?, ?, ?, 'ASSIGNED', ?, null, ?, ?)
      `).run(
        newInquiryId, req.user.id, req.user.name,
        `Assigned to ${assignedStaffName}`,
        assignedStaffName, now
      );
    }

    // If next follow-up date provided, create follow-up record
    if (next_followup_date) {
      const parts = next_followup_date.split(' ');
      const schedDate = parts[0];
      const schedTime = parts[1] ? parts[1].substring(0, 5) : '16:00';

      db.prepare(`
        INSERT INTO followups (
          inquiry_id, scheduled_date, scheduled_time, assigned_to,
          status, remarks, created_at, updated_at
        ) VALUES (?, ?, ?, ?, 'Pending', ?, ?, ?)
      `).run(
        newInquiryId, schedDate, schedTime, targetAssignedTo,
        remarks || 'Initial follow-up scheduled', now, now
      );

      db.prepare(`
        INSERT INTO inquiry_activities (
          inquiry_id, user_id, user_name, activity_type,
          description, previous_value, new_value, created_at
        ) VALUES (?, ?, ?, 'FOLLOWUP_SCHEDULED', ?, null, ?, ?)
      `).run(
        newInquiryId, req.user.id, req.user.name,
        `Follow-up scheduled for ${schedDate} at ${schedTime}`,
        `${schedDate} ${schedTime}`, now
      );
    }

    return newInquiryId;
  });

  const createdId = insertTransaction();
  const createdInquiry = db.prepare('SELECT * FROM inquiries WHERE id = ?').get(createdId);

  res.status(201).json({
    message: 'Inquiry created successfully.',
    inquiry: createdInquiry
  });
});

// PUT /api/inquiries/:id
router.put('/:id', authenticate, (req, res) => {
  const inquiry = db.prepare('SELECT * FROM inquiries WHERE id = ?').get(req.params.id);
  if (!inquiry) {
    return res.status(404).json({ error: 'Inquiry not found.' });
  }

  // Role check: staff can only edit their own
  if (req.user.role === 'staff' && inquiry.assigned_to !== req.user.id && inquiry.created_by !== req.user.id) {
    return res.status(403).json({ error: 'Access denied.' });
  }

  const {
    student_name,
    mobile,
    alt_mobile,
    email,
    qualification,
    college,
    current_status,
    city,
    course_name,
    source_name,
    preferred_contact_time,
    assigned_to,
    priority,
    remarks
  } = req.body;

  if (!student_name || !student_name.trim()) {
    return res.status(400).json({ error: 'Student full name is required.' });
  }

  if (!mobile || !mobile.trim()) {
    return res.status(400).json({ error: 'Mobile number is required.' });
  }

  const sanitizedMobile = sanitizeMobile(mobile);
  if (!isValidIndianMobile(sanitizedMobile)) {
    return res.status(400).json({ error: 'Please enter a valid 10-digit Indian mobile number.' });
  }

  let assignedStaffName = inquiry.assigned_to_name;
  let targetAssignedTo = inquiry.assigned_to;

  // Only admin can reassign inquiry (or staff if allowed)
  if (req.user.role === 'admin' && assigned_to !== undefined) {
    targetAssignedTo = assigned_to ? parseInt(assigned_to, 10) : null;
    if (targetAssignedTo) {
      const staff = db.prepare('SELECT name FROM users WHERE id = ?').get(targetAssignedTo);
      assignedStaffName = staff ? staff.name : null;
    } else {
      assignedStaffName = null;
    }
  }

  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

  db.transaction(() => {
    db.prepare(`
      UPDATE inquiries SET
        student_name = ?, mobile = ?, alt_mobile = ?, email = ?,
        qualification = ?, college = ?, current_status = ?, city = ?,
        course_name = ?, source_name = ?, preferred_contact_time = ?,
        assigned_to = ?, assigned_to_name = ?, priority = ?, remarks = ?,
        updated_at = ?
      WHERE id = ?
    `).run(
      student_name.trim(), sanitizedMobile, alt_mobile ? sanitizeMobile(alt_mobile) : null, email ? email.trim() : null,
      qualification ? qualification.trim() : null, college ? college.trim() : null, current_status, city ? city.trim() : 'Ahmedabad',
      course_name || inquiry.course_name, source_name || inquiry.source_name, preferred_contact_time,
      targetAssignedTo, assignedStaffName, priority || inquiry.priority, remarks || inquiry.remarks,
      now, inquiry.id
    );

    // If assignment changed
    if (inquiry.assigned_to !== targetAssignedTo) {
      db.prepare(`
        INSERT INTO inquiry_activities (
          inquiry_id, user_id, user_name, activity_type,
          description, previous_value, new_value, created_at
        ) VALUES (?, ?, ?, 'ASSIGNED', ?, ?, ?, ?)
      `).run(
        inquiry.id, req.user.id, req.user.name,
        `Reassigned from ${inquiry.assigned_to_name || 'Unassigned'} to ${assignedStaffName || 'Unassigned'}`,
        inquiry.assigned_to_name || 'Unassigned', assignedStaffName || 'Unassigned', now
      );
    } else {
      db.prepare(`
        INSERT INTO inquiry_activities (
          inquiry_id, user_id, user_name, activity_type,
          description, previous_value, new_value, created_at
        ) VALUES (?, ?, ?, 'EDITED', 'Inquiry details updated', null, null, ?)
      `).run(inquiry.id, req.user.id, req.user.name, now);
    }
  })();

  const updatedInquiry = db.prepare('SELECT * FROM inquiries WHERE id = ?').get(inquiry.id);
  res.json({ message: 'Inquiry updated successfully.', inquiry: updatedInquiry });
});

// PATCH /api/inquiries/:id/status
router.patch('/:id/status', authenticate, (req, res) => {
  const inquiry = db.prepare('SELECT * FROM inquiries WHERE id = ?').get(req.params.id);
  if (!inquiry) {
    return res.status(404).json({ error: 'Inquiry not found.' });
  }

  // Staff check
  if (req.user.role === 'staff' && inquiry.assigned_to !== req.user.id && inquiry.created_by !== req.user.id) {
    return res.status(403).json({ error: 'Access denied.' });
  }

  const { status, remarks } = req.body;
  const allowedStatuses = ['New', 'Contacted', 'Interested', 'Follow-up Required', 'Demo Scheduled', 'Converted', 'Not Interested', 'Invalid Number'];

  if (!status || !allowedStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status provided.' });
  }

  const previousStatus = inquiry.status;
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

  db.transaction(() => {
    db.prepare(`
      UPDATE inquiries SET 
        status = ?, 
        last_contact_date = ?,
        remarks = COALESCE(?, remarks),
        updated_at = ?
      WHERE id = ?
    `).run(status, now, remarks || null, now, inquiry.id);

    // Record activity
    db.prepare(`
      INSERT INTO inquiry_activities (
        inquiry_id, user_id, user_name, activity_type,
        description, previous_value, new_value, created_at
      ) VALUES (?, ?, ?, 'STATUS_CHANGE', ?, ?, ?, ?)
    `).run(
      inquiry.id, req.user.id, req.user.name,
      remarks ? `Status changed from ${previousStatus} to ${status}: ${remarks}` : `Status changed from ${previousStatus} to ${status}`,
      previousStatus, status, now
    );

    // If converted or not interested, auto complete pending followups
    if (['Converted', 'Not Interested', 'Invalid Number'].includes(status)) {
      db.prepare(`
        UPDATE followups SET 
          status = 'Completed', 
          outcome = ?, 
          completed_at = ?, 
          completed_by = ?,
          updated_at = ?
        WHERE inquiry_id = ? AND status = 'Pending'
      `).run(`Inquiry marked as ${status}`, now, req.user.id, now, inquiry.id);
    }
  })();

  const updatedInquiry = db.prepare('SELECT * FROM inquiries WHERE id = ?').get(inquiry.id);
  res.json({ message: 'Status updated successfully.', inquiry: updatedInquiry });
});

// POST /api/inquiries/:id/remarks
router.post('/:id/remarks', authenticate, (req, res) => {
  const inquiry = db.prepare('SELECT * FROM inquiries WHERE id = ?').get(req.params.id);
  if (!inquiry) {
    return res.status(404).json({ error: 'Inquiry not found.' });
  }

  if (req.user.role === 'staff' && inquiry.assigned_to !== req.user.id && inquiry.created_by !== req.user.id) {
    return res.status(403).json({ error: 'Access denied.' });
  }

  const { remarks, activity_type = 'REMARK_ADDED' } = req.body;
  if (!remarks || !remarks.trim()) {
    return res.status(400).json({ error: 'Remark content is required.' });
  }

  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

  db.transaction(() => {
    db.prepare(`
      UPDATE inquiries SET 
        remarks = ?, 
        last_contact_date = CASE WHEN ? IN ('CALL_INITIATED', 'WHATSAPP_INITIATED') THEN ? ELSE last_contact_date END,
        updated_at = ? 
      WHERE id = ?
    `).run(remarks.trim(), activity_type, now, now, inquiry.id);

    db.prepare(`
      INSERT INTO inquiry_activities (
        inquiry_id, user_id, user_name, activity_type,
        description, previous_value, new_value, created_at
      ) VALUES (?, ?, ?, ?, ?, null, null, ?)
    `).run(
      inquiry.id, req.user.id, req.user.name,
      activity_type, remarks.trim(), now
    );
  })();

  res.json({ message: 'Remark logged successfully.' });
});

// DELETE /api/inquiries/:id (Admin only!)
router.delete('/:id', authenticate, requireAdmin, (req, res) => {
  const inquiry = db.prepare('SELECT * FROM inquiries WHERE id = ?').get(req.params.id);
  if (!inquiry) {
    return res.status(404).json({ error: 'Inquiry not found.' });
  }

  db.prepare('DELETE FROM inquiries WHERE id = ?').run(inquiry.id);
  res.json({ message: `Inquiry ${inquiry.inquiry_id} deleted successfully.` });
});

// POST /api/inquiries/bulk-assign (Admin only)
router.post('/bulk-assign', authenticate, requireAdmin, (req, res) => {
  const { inquiry_ids, assigned_to } = req.body;
  if (!inquiry_ids || !Array.isArray(inquiry_ids) || inquiry_ids.length === 0) {
    return res.status(400).json({ error: 'Array of inquiry IDs is required.' });
  }

  let assignedStaffName = null;
  const targetAssignedTo = assigned_to ? parseInt(assigned_to, 10) : null;
  if (targetAssignedTo) {
    const staff = db.prepare('SELECT name FROM users WHERE id = ?').get(targetAssignedTo);
    if (!staff) {
      return res.status(400).json({ error: 'Staff member not found.' });
    }
    assignedStaffName = staff.name;
  }

  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

  db.transaction(() => {
    const updateStmt = db.prepare(`
      UPDATE inquiries SET 
        assigned_to = ?, 
        assigned_to_name = ?, 
        updated_at = ? 
      WHERE id = ?
    `);

    const actStmt = db.prepare(`
      INSERT INTO inquiry_activities (
        inquiry_id, user_id, user_name, activity_type,
        description, previous_value, new_value, created_at
      ) VALUES (?, ?, ?, 'ASSIGNED', ?, null, ?, ?)
    `);

    for (const id of inquiry_ids) {
      updateStmt.run(targetAssignedTo, assignedStaffName, now, id);
      actStmt.run(
        id, req.user.id, req.user.name,
        `Bulk assigned to ${assignedStaffName || 'Unassigned'}`,
        assignedStaffName || 'Unassigned', now
      );
    }
  })();

  res.json({ message: `Successfully updated assignment for ${inquiry_ids.length} inquiries.` });
});

// POST /api/inquiries/bulk-status
router.post('/bulk-status', authenticate, (req, res) => {
  const { inquiry_ids, status, remarks } = req.body;
  if (!inquiry_ids || !Array.isArray(inquiry_ids) || inquiry_ids.length === 0) {
    return res.status(400).json({ error: 'Array of inquiry IDs is required.' });
  }

  const allowedStatuses = ['New', 'Contacted', 'Interested', 'Follow-up Required', 'Demo Scheduled', 'Converted', 'Not Interested', 'Invalid Number'];
  if (!status || !allowedStatuses.includes(status)) {
    return res.status(400).json({ error: 'Valid status is required.' });
  }

  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

  db.transaction(() => {
    const updateStmt = db.prepare(`
      UPDATE inquiries SET 
        status = ?, 
        last_contact_date = ?,
        updated_at = ? 
      WHERE id = ?
    `);

    const actStmt = db.prepare(`
      INSERT INTO inquiry_activities (
        inquiry_id, user_id, user_name, activity_type,
        description, previous_value, new_value, created_at
      ) VALUES (?, ?, ?, 'STATUS_CHANGE', ?, null, ?, ?)
    `);

    for (const id of inquiry_ids) {
      // If staff, verify ownership
      if (req.user.role === 'staff') {
        const inq = db.prepare('SELECT assigned_to, created_by FROM inquiries WHERE id = ?').get(id);
        if (!inq || (inq.assigned_to !== req.user.id && inq.created_by !== req.user.id)) {
          continue; // skip unauthorized
        }
      }

      updateStmt.run(status, now, now, id);
      actStmt.run(
        id, req.user.id, req.user.name,
        remarks ? `Bulk status update to ${status}: ${remarks}` : `Bulk status update to ${status}`,
        status, now
      );
    }
  })();

  res.json({ message: `Successfully updated status for selected inquiries.` });
});

export default router;
