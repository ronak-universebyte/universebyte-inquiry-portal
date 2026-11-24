import express from 'express';
import mongoose from 'mongoose';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { generateInquiryId } from '../utils/idGenerator.js';
import Inquiry from '../models/Inquiry.js';
import Followup from '../models/Followup.js';
import InquiryActivity from '../models/InquiryActivity.js';
import User from '../models/User.js';
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

function toValidObjectId(id) {
  if (!id) return null;
  if (mongoose.Types.ObjectId.isValid(id)) {
    return new mongoose.Types.ObjectId(id);
  }
  return null;
}

function escapeRegex(text) {
  if (!text || typeof text !== 'string') return '';
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

// GET /api/inquiries/check-duplicate
router.get('/check-duplicate', authenticate, async (req, res) => {
  try {
    const { mobile, excludeId } = req.query;
    if (!mobile) {
      return res.json({ isDuplicate: false, existingInquiry: null });
    }

    const sanitized = sanitizeMobile(mobile);
    const filter = {
      $or: [
        { mobile: mobile },
        { mobile: sanitized },
        { mobile: { $regex: `${sanitized}$` } },
      ],
    };

    if (excludeId && mongoose.Types.ObjectId.isValid(excludeId)) {
      filter._id = { $ne: new mongoose.Types.ObjectId(excludeId) };
    }

    const existing = await Inquiry.findOne(filter).select(
      '_id inquiry_id student_name mobile course_name status assigned_to_name inquiry_date'
    );

    if (existing) {
      return res.json({
        isDuplicate: true,
        existingInquiry: existing,
      });
    }

    return res.json({ isDuplicate: false, existingInquiry: null });
  } catch (err) {
    console.error('Check duplicate error:', err);
    return res.status(500).json({ error: 'Failed to verify duplicate.' });
  }
});

// GET /api/inquiries
router.get('/', authenticate, async (req, res) => {
  try {
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
      limit = 10,
    } = req.query;

    const query = {};

    // Role scoping: Staff can only see their own inquiries
    if (req.user.role === 'staff') {
      const userObjectId = new mongoose.Types.ObjectId(req.user.id || req.user._id);
      query.$or = [{ assigned_to: userObjectId }, { created_by: userObjectId }];
    } else if (assigned_to && assigned_to !== 'all') {
      const assignedObjectId = toValidObjectId(assigned_to);
      if (assignedObjectId) {
        query.assigned_to = assignedObjectId;
      }
    }

    if (search && typeof search === 'string' && search.trim()) {
      const regex = new RegExp(escapeRegex(search.trim()), 'i');
      const searchConditions = [
        { inquiry_id: regex },
        { student_name: regex },
        { mobile: regex },
        { email: regex },
      ];

      if (query.$or) {
        query.$and = [{ $or: query.$or }, { $or: searchConditions }];
        delete query.$or;
      } else {
        query.$or = searchConditions;
      }
    }

    if (course && course !== 'all') {
      query.course_name = course;
    }

    if (source && source !== 'all') {
      query.source_name = source;
    }

    if (status && status !== 'all') {
      query.status = status;
    }

    if (priority && priority !== 'all') {
      query.priority = priority;
    }

    if (date_from && date_to) {
      query.inquiry_date = { $gte: `${date_from} 00:00:00`, $lte: `${date_to} 23:59:59` };
    } else if (date_from) {
      query.inquiry_date = { $gte: `${date_from} 00:00:00` };
    } else if (date_to) {
      query.inquiry_date = { $lte: `${date_to} 23:59:59` };
    }

    if (followup_date_from && followup_date_to) {
      query.next_followup_date = { $gte: `${followup_date_from} 00:00:00`, $lte: `${followup_date_to} 23:59:59` };
    } else if (followup_date_from) {
      query.next_followup_date = { $gte: `${followup_date_from} 00:00:00` };
    } else if (followup_date_to) {
      query.next_followup_date = { $lte: `${followup_date_to} 23:59:59` };
    }

    const totalCount = await Inquiry.countDocuments(query);

    let sortObj = { inquiry_date: -1, _id: -1 };
    if (sort_by === 'oldest') {
      sortObj = { inquiry_date: 1, _id: 1 };
    } else if (sort_by === 'name_asc') {
      sortObj = { student_name: 1 };
    } else if (sort_by === 'name_desc') {
      sortObj = { student_name: -1 };
    } else if (sort_by === 'priority_high') {
      sortObj = { priority: 1, inquiry_date: -1 };
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    let inquiries = await Inquiry.find(query).sort(sortObj).skip(skip).limit(limitNum);

    // If sorting by priority_high, ensure High -> Medium -> Low order
    if (sort_by === 'priority_high') {
      const priorityOrder = { High: 1, Medium: 2, Low: 3 };
      inquiries = inquiries.sort(
        (a, b) => (priorityOrder[a.priority] || 4) - (priorityOrder[b.priority] || 4)
      );
    }

    res.json({
      inquiries,
      pagination: {
        total: totalCount,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(totalCount / limitNum) || 1,
      },
    });
  } catch (err) {
    console.error('Fetch inquiries error:', err);
    res.status(500).json({ error: 'Failed to retrieve inquiries.' });
  }
});

// GET /api/inquiries/export
router.get('/export', authenticate, async (req, res) => {
  try {
    const {
      format = 'csv',
      search,
      course,
      source,
      status,
      priority,
      assigned_to,
      date_from,
      date_to,
    } = req.query;

    const query = {};

    if (req.user.role === 'staff') {
      const userObjectId = new mongoose.Types.ObjectId(req.user.id || req.user._id);
      query.$or = [{ assigned_to: userObjectId }, { created_by: userObjectId }];
    } else if (assigned_to && assigned_to !== 'all') {
      const assignedObjectId = toValidObjectId(assigned_to);
      if (assignedObjectId) query.assigned_to = assignedObjectId;
    }

    if (search && typeof search === 'string' && search.trim()) {
      const regex = new RegExp(escapeRegex(search.trim()), 'i');
      const searchConditions = [
        { inquiry_id: regex },
        { student_name: regex },
        { mobile: regex },
        { email: regex },
      ];
      if (query.$or) {
        query.$and = [{ $or: query.$or }, { $or: searchConditions }];
        delete query.$or;
      } else {
        query.$or = searchConditions;
      }
    }

    if (course && course !== 'all') query.course_name = course;
    if (source && source !== 'all') query.source_name = source;
    if (status && status !== 'all') query.status = status;
    if (priority && priority !== 'all') query.priority = priority;

    if (date_from && date_to) {
      query.inquiry_date = { $gte: `${date_from} 00:00:00`, $lte: `${date_to} 23:59:59` };
    } else if (date_from) {
      query.inquiry_date = { $gte: `${date_from} 00:00:00` };
    } else if (date_to) {
      query.inquiry_date = { $lte: `${date_to} 23:59:59` };
    }

    const rows = await Inquiry.find(query).sort({ inquiry_date: -1 });

    const exportData = rows.map((r) => ({
      'Inquiry ID': r.inquiry_id,
      'Student Name': r.student_name,
      'Mobile Number': r.mobile,
      'Alt Mobile': r.alt_mobile || '',
      'Email Address': r.email || '',
      Qualification: r.qualification || '',
      'College / University': r.college || '',
      'Current Status': r.current_status || '',
      City: r.city || '',
      Course: r.course_name,
      'Lead Source': r.source_name,
      Status: r.status,
      Priority: r.priority,
      'Assigned Staff': r.assigned_to_name || 'Unassigned',
      'Next Follow-up': r.next_followup_date || '',
      'Last Contact Date': r.last_contact_date || '',
      Remarks: r.remarks || '',
      'Inquiry Date': r.inquiry_date,
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
  } catch (err) {
    console.error('Export inquiries error:', err);
    res.status(500).json({ error: 'Failed to export inquiries.' });
  }
});

// GET /api/inquiries/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const inquiryId = req.params.id;
    let inquiry = null;

    if (mongoose.Types.ObjectId.isValid(inquiryId)) {
      inquiry = await Inquiry.findById(inquiryId);
    }
    if (!inquiry) {
      inquiry = await Inquiry.findOne({ inquiry_id: inquiryId });
    }

    if (!inquiry) {
      return res.status(404).json({ error: 'Inquiry not found.' });
    }

    // Role check: staff can only see their own inquiries
    const currentUserIdStr = req.user.id || req.user._id.toString();
    const isOwner =
      (inquiry.assigned_to && inquiry.assigned_to.toString() === currentUserIdStr) ||
      (inquiry.created_by && inquiry.created_by.toString() === currentUserIdStr);

    if (req.user.role === 'staff' && !isOwner) {
      return res.status(403).json({ error: 'Access denied to this inquiry.' });
    }

    const activities = await InquiryActivity.find({ inquiry_id: inquiry._id }).sort({
      created_at: -1,
      _id: -1,
    });

    const followups = await Followup.find({ inquiry_id: inquiry._id }).sort({
      scheduled_date: -1,
      _id: -1,
    });

    res.json({
      inquiry,
      activities,
      followups,
    });
  } catch (err) {
    console.error('Get inquiry details error:', err);
    res.status(500).json({ error: 'Failed to retrieve inquiry details.' });
  }
});

// POST /api/inquiries
router.post('/', authenticate, async (req, res) => {
  try {
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
      allow_duplicate = false,
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

    if (!course_name) {
      return res.status(400).json({ error: 'Interested course is required.' });
    }

    if (!source_name) {
      return res.status(400).json({ error: 'Inquiry source is required.' });
    }

    // Duplicate mobile check
    if (!allow_duplicate) {
      const existing = await Inquiry.findOne({
        $or: [{ mobile: mobile }, { mobile: sanitizedMobile }],
      }).select('_id inquiry_id student_name');

      if (existing) {
        return res.status(409).json({
          error: `Inquiry with mobile number ${sanitizedMobile} already exists (${existing.inquiry_id} - ${existing.student_name}).`,
          existingInquiry: existing,
        });
      }
    }

    let assignedStaffName = null;
    let targetAssignedTo = toValidObjectId(assigned_to);

    if (targetAssignedTo) {
      const staff = await User.findById(targetAssignedTo).select('name');
      if (staff) assignedStaffName = staff.name;
    } else if (req.user.role === 'staff') {
      targetAssignedTo = new mongoose.Types.ObjectId(req.user.id || req.user._id);
      assignedStaffName = req.user.name;
    }

    const inquiry_id = await generateInquiryId();
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const creatorId = new mongoose.Types.ObjectId(req.user.id || req.user._id);

    const createdInquiry = await Inquiry.create({
      inquiry_id,
      student_name: student_name.trim(),
      mobile: sanitizedMobile,
      alt_mobile: alt_mobile ? sanitizeMobile(alt_mobile) : null,
      email: email ? email.trim() : null,
      qualification: qualification ? qualification.trim() : null,
      college: college ? college.trim() : null,
      current_status,
      city: city ? city.trim() : 'Ahmedabad',
      course_name,
      source_name,
      inquiry_date: now,
      preferred_contact_time,
      assigned_to: targetAssignedTo,
      assigned_to_name: assignedStaffName,
      status,
      priority,
      next_followup_date: next_followup_date || null,
      remarks: remarks || null,
      created_by: creatorId,
      created_at: now,
      updated_at: now,
    });

    // Record creation activity
    await InquiryActivity.create({
      inquiry_id: createdInquiry._id,
      user_id: creatorId,
      user_name: req.user.name,
      activity_type: 'CREATED',
      description: `Inquiry created via ${source_name} for ${course_name}`,
      previous_value: null,
      new_value: status,
      created_at: now,
    });

    if (assignedStaffName) {
      await InquiryActivity.create({
        inquiry_id: createdInquiry._id,
        user_id: creatorId,
        user_name: req.user.name,
        activity_type: 'ASSIGNED',
        description: `Assigned to ${assignedStaffName}`,
        previous_value: null,
        new_value: assignedStaffName,
        created_at: now,
      });
    }

    if (next_followup_date) {
      const parts = next_followup_date.split(' ');
      const schedDate = parts[0];
      const schedTime = parts[1] ? parts[1].substring(0, 5) : '16:00';

      await Followup.create({
        inquiry_id: createdInquiry._id,
        scheduled_date: schedDate,
        scheduled_time: schedTime,
        assigned_to: targetAssignedTo,
        status: 'Pending',
        remarks: remarks || 'Initial follow-up scheduled',
        created_at: now,
        updated_at: now,
      });

      await InquiryActivity.create({
        inquiry_id: createdInquiry._id,
        user_id: creatorId,
        user_name: req.user.name,
        activity_type: 'FOLLOWUP_SCHEDULED',
        description: `Follow-up scheduled for ${schedDate} at ${schedTime}`,
        previous_value: null,
        new_value: `${schedDate} ${schedTime}`,
        created_at: now,
      });
    }

    res.status(201).json({
      message: 'Inquiry created successfully.',
      inquiry: createdInquiry,
    });
  } catch (err) {
    console.error('Create inquiry error:', err);
    res.status(500).json({ error: 'Failed to create inquiry.' });
  }
});

// PUT /api/inquiries/:id
router.put('/:id', authenticate, async (req, res) => {
  try {
    const inquiryId = req.params.id;
    let inquiry = null;

    if (mongoose.Types.ObjectId.isValid(inquiryId)) {
      inquiry = await Inquiry.findById(inquiryId);
    }
    if (!inquiry) {
      inquiry = await Inquiry.findOne({ inquiry_id: inquiryId });
    }

    if (!inquiry) {
      return res.status(404).json({ error: 'Inquiry not found.' });
    }

    const currentUserIdStr = req.user.id || req.user._id.toString();
    const isOwner =
      (inquiry.assigned_to && inquiry.assigned_to.toString() === currentUserIdStr) ||
      (inquiry.created_by && inquiry.created_by.toString() === currentUserIdStr);

    if (req.user.role === 'staff' && !isOwner) {
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
      remarks,
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

    if (req.user.role === 'admin' && assigned_to !== undefined) {
      targetAssignedTo = toValidObjectId(assigned_to);
      if (targetAssignedTo) {
        const staff = await User.findById(targetAssignedTo).select('name');
        assignedStaffName = staff ? staff.name : null;
      } else {
        assignedStaffName = null;
      }
    }

    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const userId = new mongoose.Types.ObjectId(req.user.id || req.user._id);

    const oldAssignedTo = inquiry.assigned_to ? inquiry.assigned_to.toString() : null;
    const newAssignedToStr = targetAssignedTo ? targetAssignedTo.toString() : null;

    inquiry.student_name = student_name.trim();
    inquiry.mobile = sanitizedMobile;
    inquiry.alt_mobile = alt_mobile ? sanitizeMobile(alt_mobile) : null;
    inquiry.email = email ? email.trim() : null;
    inquiry.qualification = qualification ? qualification.trim() : null;
    inquiry.college = college ? college.trim() : null;
    if (current_status) inquiry.current_status = current_status;
    if (city) inquiry.city = city.trim();
    if (course_name) inquiry.course_name = course_name;
    if (source_name) inquiry.source_name = source_name;
    if (preferred_contact_time) inquiry.preferred_contact_time = preferred_contact_time;
    inquiry.assigned_to = targetAssignedTo;
    inquiry.assigned_to_name = assignedStaffName;
    if (priority) inquiry.priority = priority;
    if (remarks !== undefined) inquiry.remarks = remarks;
    inquiry.updated_at = now;

    await inquiry.save();

    if (oldAssignedTo !== newAssignedToStr) {
      await InquiryActivity.create({
        inquiry_id: inquiry._id,
        user_id: userId,
        user_name: req.user.name,
        activity_type: 'ASSIGNED',
        description: `Reassigned from ${inquiry.assigned_to_name || 'Unassigned'} to ${assignedStaffName || 'Unassigned'}`,
        previous_value: inquiry.assigned_to_name || 'Unassigned',
        new_value: assignedStaffName || 'Unassigned',
        created_at: now,
      });
    } else {
      await InquiryActivity.create({
        inquiry_id: inquiry._id,
        user_id: userId,
        user_name: req.user.name,
        activity_type: 'EDITED',
        description: 'Inquiry details updated',
        previous_value: null,
        new_value: null,
        created_at: now,
      });
    }

    res.json({ message: 'Inquiry updated successfully.', inquiry });
  } catch (err) {
    console.error('Update inquiry error:', err);
    res.status(500).json({ error: 'Failed to update inquiry.' });
  }
});

// PATCH /api/inquiries/:id/status
router.patch('/:id/status', authenticate, async (req, res) => {
  try {
    const inquiryId = req.params.id;
    let inquiry = null;

    if (mongoose.Types.ObjectId.isValid(inquiryId)) {
      inquiry = await Inquiry.findById(inquiryId);
    }
    if (!inquiry) {
      inquiry = await Inquiry.findOne({ inquiry_id: inquiryId });
    }

    if (!inquiry) {
      return res.status(404).json({ error: 'Inquiry not found.' });
    }

    const currentUserIdStr = req.user.id || req.user._id.toString();
    const isOwner =
      (inquiry.assigned_to && inquiry.assigned_to.toString() === currentUserIdStr) ||
      (inquiry.created_by && inquiry.created_by.toString() === currentUserIdStr);

    if (req.user.role === 'staff' && !isOwner) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const { status, remarks } = req.body;
    const allowedStatuses = [
      'New',
      'Contacted',
      'Interested',
      'Follow-up Required',
      'Demo Scheduled',
      'Converted',
      'Not Interested',
      'Invalid Number',
    ];

    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status provided.' });
    }

    const previousStatus = inquiry.status;
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const userId = new mongoose.Types.ObjectId(req.user.id || req.user._id);

    inquiry.status = status;
    inquiry.last_contact_date = now;
    if (remarks) inquiry.remarks = remarks;
    inquiry.updated_at = now;
    await inquiry.save();

    await InquiryActivity.create({
      inquiry_id: inquiry._id,
      user_id: userId,
      user_name: req.user.name,
      activity_type: 'STATUS_CHANGE',
      description: remarks
        ? `Status changed from ${previousStatus} to ${status}: ${remarks}`
        : `Status changed from ${previousStatus} to ${status}`,
      previous_value: previousStatus,
      new_value: status,
      created_at: now,
    });

    if (['Converted', 'Not Interested', 'Invalid Number'].includes(status)) {
      await Followup.updateMany(
        { inquiry_id: inquiry._id, status: 'Pending' },
        {
          $set: {
            status: 'Completed',
            outcome: `Inquiry marked as ${status}`,
            completed_at: now,
            completed_by: userId,
            updated_at: now,
          },
        }
      );
    }

    res.json({ message: 'Status updated successfully.', inquiry });
  } catch (err) {
    console.error('Update status error:', err);
    res.status(500).json({ error: 'Failed to update status.' });
  }
});

// POST /api/inquiries/:id/remarks
router.post('/:id/remarks', authenticate, async (req, res) => {
  try {
    const inquiryId = req.params.id;
    let inquiry = null;

    if (mongoose.Types.ObjectId.isValid(inquiryId)) {
      inquiry = await Inquiry.findById(inquiryId);
    }
    if (!inquiry) {
      inquiry = await Inquiry.findOne({ inquiry_id: inquiryId });
    }

    if (!inquiry) {
      return res.status(404).json({ error: 'Inquiry not found.' });
    }

    const currentUserIdStr = req.user.id || req.user._id.toString();
    const isOwner =
      (inquiry.assigned_to && inquiry.assigned_to.toString() === currentUserIdStr) ||
      (inquiry.created_by && inquiry.created_by.toString() === currentUserIdStr);

    if (req.user.role === 'staff' && !isOwner) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const { remarks, activity_type = 'REMARK_ADDED' } = req.body;
    if (!remarks || !remarks.trim()) {
      return res.status(400).json({ error: 'Remark content is required.' });
    }

    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const userId = new mongoose.Types.ObjectId(req.user.id || req.user._id);

    inquiry.remarks = remarks.trim();
    if (['CALL_INITIATED', 'WHATSAPP_INITIATED'].includes(activity_type)) {
      inquiry.last_contact_date = now;
    }
    inquiry.updated_at = now;
    await inquiry.save();

    await InquiryActivity.create({
      inquiry_id: inquiry._id,
      user_id: userId,
      user_name: req.user.name,
      activity_type,
      description: remarks.trim(),
      previous_value: null,
      new_value: null,
      created_at: now,
    });

    res.json({ message: 'Remark logged successfully.' });
  } catch (err) {
    console.error('Add remarks error:', err);
    res.status(500).json({ error: 'Failed to log remark.' });
  }
});

// DELETE /api/inquiries/:id (Admin only)
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const inquiryId = req.params.id;
    let inquiry = null;

    if (mongoose.Types.ObjectId.isValid(inquiryId)) {
      inquiry = await Inquiry.findById(inquiryId);
    }
    if (!inquiry) {
      inquiry = await Inquiry.findOne({ inquiry_id: inquiryId });
    }

    if (!inquiry) {
      return res.status(404).json({ error: 'Inquiry not found.' });
    }

    await Followup.deleteMany({ inquiry_id: inquiry._id });
    await InquiryActivity.deleteMany({ inquiry_id: inquiry._id });
    await Inquiry.deleteOne({ _id: inquiry._id });

    res.json({ message: `Inquiry ${inquiry.inquiry_id} deleted successfully.` });
  } catch (err) {
    console.error('Delete inquiry error:', err);
    res.status(500).json({ error: 'Failed to delete inquiry.' });
  }
});

// POST /api/inquiries/bulk-assign (Admin only)
router.post('/bulk-assign', authenticate, requireAdmin, async (req, res) => {
  try {
    const { inquiry_ids, assigned_to } = req.body;
    if (!inquiry_ids || !Array.isArray(inquiry_ids) || inquiry_ids.length === 0) {
      return res.status(400).json({ error: 'Array of inquiry IDs is required.' });
    }

    let assignedStaffName = null;
    const targetAssignedTo = toValidObjectId(assigned_to);

    if (targetAssignedTo) {
      const staff = await User.findById(targetAssignedTo).select('name');
      if (!staff) {
        return res.status(400).json({ error: 'Staff member not found.' });
      }
      assignedStaffName = staff.name;
    }

    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const userId = new mongoose.Types.ObjectId(req.user.id || req.user._id);

    const validIds = inquiry_ids
      .map((id) => (mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : null))
      .filter(Boolean);

    await Inquiry.updateMany(
      { _id: { $in: validIds } },
      {
        $set: {
          assigned_to: targetAssignedTo,
          assigned_to_name: assignedStaffName,
          updated_at: now,
        },
      }
    );

    const activityDocs = validIds.map((id) => ({
      inquiry_id: id,
      user_id: userId,
      user_name: req.user.name,
      activity_type: 'ASSIGNED',
      description: `Bulk assigned to ${assignedStaffName || 'Unassigned'}`,
      previous_value: null,
      new_value: assignedStaffName || 'Unassigned',
      created_at: now,
    }));

    if (activityDocs.length > 0) {
      await InquiryActivity.insertMany(activityDocs);
    }

    res.json({ message: `Successfully updated assignment for ${inquiry_ids.length} inquiries.` });
  } catch (err) {
    console.error('Bulk assign error:', err);
    res.status(500).json({ error: 'Failed to complete bulk assignment.' });
  }
});

// POST /api/inquiries/bulk-status
router.post('/bulk-status', authenticate, async (req, res) => {
  try {
    const { inquiry_ids, status, remarks } = req.body;
    if (!inquiry_ids || !Array.isArray(inquiry_ids) || inquiry_ids.length === 0) {
      return res.status(400).json({ error: 'Array of inquiry IDs is required.' });
    }

    const allowedStatuses = [
      'New',
      'Contacted',
      'Interested',
      'Follow-up Required',
      'Demo Scheduled',
      'Converted',
      'Not Interested',
      'Invalid Number',
    ];
    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({ error: 'Valid status is required.' });
    }

    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const userId = new mongoose.Types.ObjectId(req.user.id || req.user._id);

    let validIds = inquiry_ids
      .map((id) => (mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : null))
      .filter(Boolean);

    if (req.user.role === 'staff') {
      const allowedInquiries = await Inquiry.find({
        _id: { $in: validIds },
        $or: [{ assigned_to: userId }, { created_by: userId }],
      }).select('_id');
      validIds = allowedInquiries.map((i) => i._id);
    }

    await Inquiry.updateMany(
      { _id: { $in: validIds } },
      {
        $set: {
          status,
          last_contact_date: now,
          updated_at: now,
        },
      }
    );

    const activityDocs = validIds.map((id) => ({
      inquiry_id: id,
      user_id: userId,
      user_name: req.user.name,
      activity_type: 'STATUS_CHANGE',
      description: remarks
        ? `Bulk status update to ${status}: ${remarks}`
        : `Bulk status update to ${status}`,
      previous_value: null,
      new_value: status,
      created_at: now,
    }));

    if (activityDocs.length > 0) {
      await InquiryActivity.insertMany(activityDocs);
    }

    res.json({ message: 'Successfully updated status for selected inquiries.' });
  } catch (err) {
    console.error('Bulk status error:', err);
    res.status(500).json({ error: 'Failed to update status for selected inquiries.' });
  }
});

export default router;
