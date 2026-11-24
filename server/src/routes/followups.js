import express from 'express';
import mongoose from 'mongoose';
import { authenticate } from '../middleware/auth.js';
import Followup from '../models/Followup.js';
import Inquiry from '../models/Inquiry.js';
import InquiryActivity from '../models/InquiryActivity.js';
import User from '../models/User.js';

const router = express.Router();

function getTodayDateString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// GET /api/followups
router.get('/', authenticate, async (req, res) => {
  try {
    const { category = 'today', search } = req.query;
    const today = getTodayDateString();
    const isStaff = req.user.role === 'staff';
    const userId = new mongoose.Types.ObjectId(req.user.id || req.user._id);

    // Build base filter for followups based on user role
    let staffInquiryIds = null;
    if (isStaff) {
      const allowedInquiries = await Inquiry.find({
        $or: [{ assigned_to: userId }, { created_by: userId }],
      }).select('_id');
      staffInquiryIds = allowedInquiries.map((i) => i._id);
    }

    const buildScopeFilter = () => {
      if (!isStaff) return {};
      return {
        $or: [{ assigned_to: userId }, { inquiry_id: { $in: staffInquiryIds } }],
      };
    };

    const countToday = await Followup.countDocuments({
      status: 'Pending',
      scheduled_date: today,
      ...buildScopeFilter(),
    });

    const countUpcoming = await Followup.countDocuments({
      status: 'Pending',
      scheduled_date: { $gt: today },
      ...buildScopeFilter(),
    });

    const countOverdue = await Followup.countDocuments({
      status: 'Pending',
      scheduled_date: { $lt: today },
      ...buildScopeFilter(),
    });

    const countCompleted = await Followup.countDocuments({
      status: 'Completed',
      ...buildScopeFilter(),
    });

    // Main query
    const followupQuery = { ...buildScopeFilter() };

    if (category === 'today') {
      followupQuery.status = 'Pending';
      followupQuery.scheduled_date = today;
    } else if (category === 'upcoming') {
      followupQuery.status = 'Pending';
      followupQuery.scheduled_date = { $gt: today };
    } else if (category === 'overdue') {
      followupQuery.status = 'Pending';
      followupQuery.scheduled_date = { $lt: today };
    } else if (category === 'completed') {
      followupQuery.status = 'Completed';
    }

    let followupsDocs = await Followup.find(followupQuery)
      .populate('inquiry_id')
      .populate('completed_by', 'name')
      .sort({
        status: -1, // 'Pending' before 'Completed'
        scheduled_date: 1,
        scheduled_time: 1,
      });

    // Format output to match existing response structure
    let formattedFollowups = followupsDocs
      .filter((f) => f.inquiry_id != null)
      .map((f) => {
        const inq = f.inquiry_id;
        return {
          id: f.id || f._id.toString(),
          inquiry_id: inq.id || inq._id.toString(),
          scheduled_date: f.scheduled_date,
          scheduled_time: f.scheduled_time,
          assigned_to: f.assigned_to ? f.assigned_to.toString() : null,
          followup_status: f.status,
          outcome: f.outcome,
          followup_remarks: f.remarks,
          completed_at: f.completed_at,
          completed_by: f.completed_by ? f.completed_by._id || f.completed_by : null,
          completed_by_name: f.completed_by ? f.completed_by.name : null,
          followup_created_at: f.created_at,
          inq_code: inq.inquiry_id,
          student_name: inq.student_name,
          mobile: inq.mobile,
          course_name: inq.course_name,
          inquiry_status: inq.status,
          priority: inq.priority,
          assigned_to_name: inq.assigned_to_name,
          next_followup_date: inq.next_followup_date,
          city: inq.city,
        };
      });

    // Apply search filter if provided
    if (search && search.trim()) {
      const term = search.trim().toLowerCase();
      formattedFollowups = formattedFollowups.filter(
        (f) =>
          (f.student_name && f.student_name.toLowerCase().includes(term)) ||
          (f.mobile && f.mobile.includes(term)) ||
          (f.inq_code && f.inq_code.toLowerCase().includes(term))
      );
    }

    res.json({
      counts: {
        today: countToday,
        upcoming: countUpcoming,
        overdue: countOverdue,
        completed: countCompleted,
        totalPending: countToday + countUpcoming + countOverdue,
      },
      followups: formattedFollowups,
    });
  } catch (err) {
    console.error('Fetch followups error:', err);
    res.status(500).json({ error: 'Failed to retrieve follow-ups.' });
  }
});

// POST /api/followups
router.post('/', authenticate, async (req, res) => {
  try {
    const { inquiry_id, scheduled_date, scheduled_time = '16:00', remarks, assigned_to } = req.body;

    if (!inquiry_id || !scheduled_date) {
      return res.status(400).json({ error: 'Inquiry ID and scheduled date are required.' });
    }

    let inquiry = null;
    if (mongoose.Types.ObjectId.isValid(inquiry_id)) {
      inquiry = await Inquiry.findById(inquiry_id);
    }
    if (!inquiry) {
      inquiry = await Inquiry.findOne({ inquiry_id });
    }

    if (!inquiry) {
      return res.status(404).json({ error: 'Inquiry not found.' });
    }

    let targetAssignedTo = assigned_to
      ? mongoose.Types.ObjectId.isValid(assigned_to)
        ? new mongoose.Types.ObjectId(assigned_to)
        : null
      : inquiry.assigned_to || new mongoose.Types.ObjectId(req.user.id || req.user._id);

    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const nextFollowupDateTime = `${scheduled_date} ${scheduled_time}:00`;
    const userId = new mongoose.Types.ObjectId(req.user.id || req.user._id);

    await Followup.create({
      inquiry_id: inquiry._id,
      scheduled_date,
      scheduled_time,
      assigned_to: targetAssignedTo,
      status: 'Pending',
      remarks: remarks || 'Follow-up scheduled',
      created_at: now,
      updated_at: now,
    });

    inquiry.next_followup_date = nextFollowupDateTime;
    if (inquiry.status === 'New') {
      inquiry.status = 'Follow-up Required';
    }
    inquiry.updated_at = now;
    await inquiry.save();

    await InquiryActivity.create({
      inquiry_id: inquiry._id,
      user_id: userId,
      user_name: req.user.name,
      activity_type: 'FOLLOWUP_SCHEDULED',
      description: `Follow-up scheduled for ${scheduled_date} at ${scheduled_time}${
        remarks ? ` - Note: ${remarks}` : ''
      }`,
      previous_value: null,
      new_value: nextFollowupDateTime,
      created_at: now,
    });

    res.status(201).json({ message: 'Follow-up scheduled successfully.' });
  } catch (err) {
    console.error('Schedule followup error:', err);
    res.status(500).json({ error: 'Failed to schedule follow-up.' });
  }
});

// PATCH /api/followups/:id/complete
router.patch('/:id/complete', authenticate, async (req, res) => {
  try {
    const followupId = req.params.id;
    let followup = null;

    if (mongoose.Types.ObjectId.isValid(followupId)) {
      followup = await Followup.findById(followupId);
    }
    if (!followup) {
      return res.status(404).json({ error: 'Follow-up not found.' });
    }

    const {
      remarks,
      outcome,
      new_status,
      next_followup_date,
      next_followup_time = '16:00',
      next_followup_remarks,
    } = req.body;

    if (!remarks || !remarks.trim()) {
      return res.status(400).json({ error: 'Follow-up call remarks are required when completing.' });
    }

    if (!outcome || !outcome.trim()) {
      return res.status(400).json({ error: 'Follow-up outcome is required.' });
    }

    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const userId = new mongoose.Types.ObjectId(req.user.id || req.user._id);

    followup.status = 'Completed';
    followup.outcome = outcome.trim();
    followup.remarks = remarks.trim();
    followup.completed_at = now;
    followup.completed_by = userId;
    followup.updated_at = now;
    await followup.save();

    await InquiryActivity.create({
      inquiry_id: followup.inquiry_id,
      user_id: userId,
      user_name: req.user.name,
      activity_type: 'FOLLOWUP_COMPLETED',
      description: `Follow-up completed. Outcome: ${outcome.trim()}. Remarks: ${remarks.trim()}`,
      previous_value: 'Pending',
      new_value: 'Completed',
      created_at: now,
    });

    const inquiry = await Inquiry.findById(followup.inquiry_id);
    if (inquiry) {
      if (new_status && inquiry.status !== new_status) {
        const prevStatus = inquiry.status;
        inquiry.status = new_status;
        inquiry.last_contact_date = now;
        inquiry.updated_at = now;
        await inquiry.save();

        await InquiryActivity.create({
          inquiry_id: inquiry._id,
          user_id: userId,
          user_name: req.user.name,
          activity_type: 'STATUS_CHANGE',
          description: `Status updated to ${new_status} upon follow-up completion`,
          previous_value: prevStatus,
          new_value: new_status,
          created_at: now,
        });
      } else {
        inquiry.last_contact_date = now;
        inquiry.updated_at = now;
        await inquiry.save();
      }

      if (next_followup_date) {
        const nextDateTime = `${next_followup_date} ${next_followup_time}:00`;

        await Followup.create({
          inquiry_id: inquiry._id,
          scheduled_date: next_followup_date,
          scheduled_time: next_followup_time,
          assigned_to: followup.assigned_to,
          status: 'Pending',
          remarks: next_followup_remarks || 'Next follow-up',
          created_at: now,
          updated_at: now,
        });

        inquiry.next_followup_date = nextDateTime;
        inquiry.updated_at = now;
        await inquiry.save();

        await InquiryActivity.create({
          inquiry_id: inquiry._id,
          user_id: userId,
          user_name: req.user.name,
          activity_type: 'FOLLOWUP_SCHEDULED',
          description: `Next follow-up scheduled for ${next_followup_date} at ${next_followup_time}`,
          previous_value: null,
          new_value: nextDateTime,
          created_at: now,
        });
      } else {
        inquiry.next_followup_date = null;
        inquiry.updated_at = now;
        await inquiry.save();
      }
    }

    res.json({ message: 'Follow-up marked as completed.' });
  } catch (err) {
    console.error('Complete followup error:', err);
    res.status(500).json({ error: 'Failed to complete follow-up.' });
  }
});

// PATCH /api/followups/:id/reschedule
router.patch('/:id/reschedule', authenticate, async (req, res) => {
  try {
    const followupId = req.params.id;
    let followup = null;

    if (mongoose.Types.ObjectId.isValid(followupId)) {
      followup = await Followup.findById(followupId);
    }
    if (!followup) {
      return res.status(404).json({ error: 'Follow-up not found.' });
    }

    const { scheduled_date, scheduled_time = '16:00', remarks } = req.body;
    if (!scheduled_date) {
      return res.status(400).json({ error: 'New scheduled date is required.' });
    }

    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const nextDateTime = `${scheduled_date} ${scheduled_time}:00`;
    const userId = new mongoose.Types.ObjectId(req.user.id || req.user._id);

    const prevDate = followup.scheduled_date;
    const prevTime = followup.scheduled_time;

    followup.scheduled_date = scheduled_date;
    followup.scheduled_time = scheduled_time;
    if (remarks) followup.remarks = remarks;
    followup.updated_at = now;
    await followup.save();

    await Inquiry.updateOne(
      { _id: followup.inquiry_id },
      { $set: { next_followup_date: nextDateTime, updated_at: now } }
    );

    await InquiryActivity.create({
      inquiry_id: followup.inquiry_id,
      user_id: userId,
      user_name: req.user.name,
      activity_type: 'FOLLOWUP_SCHEDULED',
      description: `Follow-up rescheduled to ${scheduled_date} at ${scheduled_time}${
        remarks ? ` - Note: ${remarks}` : ''
      }`,
      previous_value: `${prevDate} ${prevTime}`,
      new_value: nextDateTime,
      created_at: now,
    });

    res.json({ message: 'Follow-up rescheduled successfully.' });
  } catch (err) {
    console.error('Reschedule followup error:', err);
    res.status(500).json({ error: 'Failed to reschedule follow-up.' });
  }
});

export default router;
