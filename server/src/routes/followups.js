import express from 'express';
import db from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Helper to get local date string YYYY-MM-DD
function getTodayDateString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// GET /api/followups
router.get('/', authenticate, (req, res) => {
  const { category = 'today', search } = req.query;
  const today = getTodayDateString();

  const userFilter = req.user.role === 'staff' ? 'AND (f.assigned_to = ? OR i.assigned_to = ?)' : '';
  const userParams = req.user.role === 'staff' ? [req.user.id, req.user.id] : [];

  // Summary counts
  const countToday = db.prepare(`
    SELECT COUNT(*) as count 
    FROM followups f
    JOIN inquiries i ON f.inquiry_id = i.id
    WHERE f.status = 'Pending' AND f.scheduled_date = ? ${userFilter}
  `).get(today, ...userParams).count;

  const countUpcoming = db.prepare(`
    SELECT COUNT(*) as count 
    FROM followups f
    JOIN inquiries i ON f.inquiry_id = i.id
    WHERE f.status = 'Pending' AND f.scheduled_date > ? ${userFilter}
  `).get(today, ...userParams).count;

  const countOverdue = db.prepare(`
    SELECT COUNT(*) as count 
    FROM followups f
    JOIN inquiries i ON f.inquiry_id = i.id
    WHERE f.status = 'Pending' AND f.scheduled_date < ? ${userFilter}
  `).get(today, ...userParams).count;

  const countCompleted = db.prepare(`
    SELECT COUNT(*) as count 
    FROM followups f
    JOIN inquiries i ON f.inquiry_id = i.id
    WHERE f.status = 'Completed' ${userFilter}
  `).get(...userParams).count;

  // Filter based on selected category
  let categoryCondition = '';
  const queryParams = [...userParams];

  if (category === 'today') {
    categoryCondition = "AND f.status = 'Pending' AND f.scheduled_date = ?";
    queryParams.push(today);
  } else if (category === 'upcoming') {
    categoryCondition = "AND f.status = 'Pending' AND f.scheduled_date > ?";
    queryParams.push(today);
  } else if (category === 'overdue') {
    categoryCondition = "AND f.status = 'Pending' AND f.scheduled_date < ?";
    queryParams.push(today);
  } else if (category === 'completed') {
    categoryCondition = "AND f.status = 'Completed'";
  }

  let searchCondition = '';
  if (search && search.trim()) {
    searchCondition = 'AND (i.student_name LIKE ? OR i.mobile LIKE ? OR i.inquiry_id LIKE ?)';
    const term = `%${search.trim()}%`;
    queryParams.push(term, term, term);
  }

  const query = `
    SELECT 
      f.id,
      f.inquiry_id,
      f.scheduled_date,
      f.scheduled_time,
      f.assigned_to,
      f.status as followup_status,
      f.outcome,
      f.remarks as followup_remarks,
      f.completed_at,
      f.completed_by,
      f.created_at as followup_created_at,
      i.inquiry_id as inq_code,
      i.student_name,
      i.mobile,
      i.course_name,
      i.status as inquiry_status,
      i.priority,
      i.assigned_to_name,
      i.next_followup_date,
      i.city,
      u.name as completed_by_name
    FROM followups f
    JOIN inquiries i ON f.inquiry_id = i.id
    LEFT JOIN users u ON f.completed_by = u.id
    WHERE 1=1 ${userFilter} ${categoryCondition} ${searchCondition}
    ORDER BY 
      CASE WHEN f.status = 'Pending' THEN 0 ELSE 1 END,
      f.scheduled_date ASC, 
      f.scheduled_time ASC
  `;

  const followups = db.prepare(query).all(...queryParams);

  res.json({
    counts: {
      today: countToday,
      upcoming: countUpcoming,
      overdue: countOverdue,
      completed: countCompleted,
      totalPending: countToday + countUpcoming + countOverdue
    },
    followups
  });
});

// POST /api/followups
router.post('/', authenticate, (req, res) => {
  const { inquiry_id, scheduled_date, scheduled_time = '16:00', remarks, assigned_to } = req.body;

  if (!inquiry_id || !scheduled_date) {
    return res.status(400).json({ error: 'Inquiry ID and scheduled date are required.' });
  }

  const inquiry = db.prepare('SELECT * FROM inquiries WHERE id = ?').get(inquiry_id);
  if (!inquiry) {
    return res.status(404).json({ error: 'Inquiry not found.' });
  }

  const targetAssignedTo = assigned_to || inquiry.assigned_to || req.user.id;
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
  const nextFollowupDateTime = `${scheduled_date} ${scheduled_time}:00`;

  db.transaction(() => {
    // Insert new follow-up
    db.prepare(`
      INSERT INTO followups (
        inquiry_id, scheduled_date, scheduled_time, assigned_to,
        status, remarks, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 'Pending', ?, ?, ?)
    `).run(
      inquiry_id, scheduled_date, scheduled_time, targetAssignedTo,
      remarks || 'Follow-up scheduled', now, now
    );

    // Update inquiry's next_followup_date
    db.prepare(`
      UPDATE inquiries SET 
        next_followup_date = ?, 
        status = CASE WHEN status = 'New' THEN 'Follow-up Required' ELSE status END,
        updated_at = ? 
      WHERE id = ?
    `).run(nextFollowupDateTime, now, inquiry_id);

    // Record activity
    db.prepare(`
      INSERT INTO inquiry_activities (
        inquiry_id, user_id, user_name, activity_type,
        description, previous_value, new_value, created_at
      ) VALUES (?, ?, ?, 'FOLLOWUP_SCHEDULED', ?, null, ?, ?)
    `).run(
      inquiry_id, req.user.id, req.user.name,
      `Follow-up scheduled for ${scheduled_date} at ${scheduled_time}${remarks ? ` - Note: ${remarks}` : ''}`,
      nextFollowupDateTime, now
    );
  })();

  res.status(201).json({ message: 'Follow-up scheduled successfully.' });
});

// PATCH /api/followups/:id/complete
router.patch('/:id/complete', authenticate, (req, res) => {
  const followup = db.prepare('SELECT * FROM followups WHERE id = ?').get(req.params.id);
  if (!followup) {
    return res.status(404).json({ error: 'Follow-up not found.' });
  }

  const {
    remarks,
    outcome,
    new_status,
    next_followup_date,
    next_followup_time = '16:00',
    next_followup_remarks
  } = req.body;

  if (!remarks || !remarks.trim()) {
    return res.status(400).json({ error: 'Follow-up call remarks are required when completing.' });
  }

  if (!outcome || !outcome.trim()) {
    return res.status(400).json({ error: 'Follow-up outcome is required.' });
  }

  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

  db.transaction(() => {
    // 1. Mark follow-up as completed
    db.prepare(`
      UPDATE followups SET 
        status = 'Completed', 
        outcome = ?, 
        remarks = ?, 
        completed_at = ?, 
        completed_by = ?, 
        updated_at = ?
      WHERE id = ?
    `).run(outcome.trim(), remarks.trim(), now, req.user.id, now, followup.id);

    // 2. Record completion activity
    db.prepare(`
      INSERT INTO inquiry_activities (
        inquiry_id, user_id, user_name, activity_type,
        description, previous_value, new_value, created_at
      ) VALUES (?, ?, ?, 'FOLLOWUP_COMPLETED', ?, 'Pending', 'Completed', ?)
    `).run(
      followup.inquiry_id, req.user.id, req.user.name,
      `Follow-up completed. Outcome: ${outcome.trim()}. Remarks: ${remarks.trim()}`,
      now
    );

    // 3. Update inquiry status if requested
    if (new_status) {
      const inq = db.prepare('SELECT status FROM inquiries WHERE id = ?').get(followup.inquiry_id);
      if (inq && inq.status !== new_status) {
        db.prepare(`
          UPDATE inquiries SET 
            status = ?, 
            last_contact_date = ?, 
            updated_at = ? 
          WHERE id = ?
        `).run(new_status, now, now, followup.inquiry_id);

        db.prepare(`
          INSERT INTO inquiry_activities (
        inquiry_id, user_id, user_name, activity_type,
        description, previous_value, new_value, created_at
          ) VALUES (?, ?, ?, 'STATUS_CHANGE', ?, ?, ?, ?)
        `).run(
          followup.inquiry_id, req.user.id, req.user.name,
          `Status updated to ${new_status} upon follow-up completion`,
          inq.status, new_status, now
        );
      }
    } else {
      db.prepare(`UPDATE inquiries SET last_contact_date = ?, updated_at = ? WHERE id = ?`)
        .run(now, now, followup.inquiry_id);
    }

    // 4. Schedule next follow-up if requested
    if (next_followup_date) {
      const nextDateTime = `${next_followup_date} ${next_followup_time}:00`;

      db.prepare(`
        INSERT INTO followups (
          inquiry_id, scheduled_date, scheduled_time, assigned_to,
          status, remarks, created_at, updated_at
        ) VALUES (?, ?, ?, ?, 'Pending', ?, ?, ?)
      `).run(
        followup.inquiry_id, next_followup_date, next_followup_time, followup.assigned_to,
        next_followup_remarks || 'Next follow-up', now, now
      );

      db.prepare(`
        UPDATE inquiries SET 
          next_followup_date = ?, 
          updated_at = ? 
        WHERE id = ?
      `).run(nextDateTime, now, followup.inquiry_id);

      db.prepare(`
        INSERT INTO inquiry_activities (
          inquiry_id, user_id, user_name, activity_type,
          description, previous_value, new_value, created_at
        ) VALUES (?, ?, ?, 'FOLLOWUP_SCHEDULED', ?, null, ?, ?)
      `).run(
        followup.inquiry_id, req.user.id, req.user.name,
        `Next follow-up scheduled for ${next_followup_date} at ${next_followup_time}`,
        nextDateTime, now
      );
    } else {
      // Clear next follow-up date on inquiry if no subsequent follow-up scheduled
      db.prepare(`UPDATE inquiries SET next_followup_date = null, updated_at = ? WHERE id = ?`)
        .run(now, followup.inquiry_id);
    }
  })();

  res.json({ message: 'Follow-up marked as completed.' });
});

// PATCH /api/followups/:id/reschedule
router.patch('/:id/reschedule', authenticate, (req, res) => {
  const followup = db.prepare('SELECT * FROM followups WHERE id = ?').get(req.params.id);
  if (!followup) {
    return res.status(404).json({ error: 'Follow-up not found.' });
  }

  const { scheduled_date, scheduled_time = '16:00', remarks } = req.body;
  if (!scheduled_date) {
    return res.status(400).json({ error: 'New scheduled date is required.' });
  }

  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
  const nextDateTime = `${scheduled_date} ${scheduled_time}:00`;

  db.transaction(() => {
    db.prepare(`
      UPDATE followups SET 
        scheduled_date = ?, 
        scheduled_time = ?, 
        remarks = COALESCE(?, remarks), 
        updated_at = ? 
      WHERE id = ?
    `).run(scheduled_date, scheduled_time, remarks || null, now, followup.id);

    db.prepare(`
      UPDATE inquiries SET 
        next_followup_date = ?, 
        updated_at = ? 
      WHERE id = ?
    `).run(nextDateTime, now, followup.inquiry_id);

    db.prepare(`
      INSERT INTO inquiry_activities (
        inquiry_id, user_id, user_name, activity_type,
        description, previous_value, new_value, created_at
      ) VALUES (?, ?, ?, 'FOLLOWUP_SCHEDULED', ?, ?, ?, ?)
    `).run(
      followup.inquiry_id, req.user.id, req.user.name,
      `Follow-up rescheduled to ${scheduled_date} at ${scheduled_time}${remarks ? ` - Note: ${remarks}` : ''}`,
      `${followup.scheduled_date} ${followup.scheduled_time}`, nextDateTime, now
    );
  })();

  res.json({ message: 'Follow-up rescheduled successfully.' });
});

export default router;
