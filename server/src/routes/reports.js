import express from 'express';
import mongoose from 'mongoose';
import { authenticate } from '../middleware/auth.js';
import Inquiry from '../models/Inquiry.js';
import Followup from '../models/Followup.js';
import User from '../models/User.js';
import * as XLSX from 'xlsx';

const router = express.Router();

function getDateRange(rangeType, customStart, customEnd) {
  const now = new Date();
  const formatYMD = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  let startDate, endDate;

  switch (rangeType) {
    case 'today': {
      startDate = formatYMD(now);
      endDate = formatYMD(now);
      break;
    }
    case 'yesterday': {
      const yest = new Date(now);
      yest.setDate(yest.getDate() - 1);
      startDate = formatYMD(yest);
      endDate = formatYMD(yest);
      break;
    }
    case 'last7days': {
      const d7 = new Date(now);
      d7.setDate(d7.getDate() - 7);
      startDate = formatYMD(d7);
      endDate = formatYMD(now);
      break;
    }
    case 'last30days': {
      const d30 = new Date(now);
      d30.setDate(d30.getDate() - 30);
      startDate = formatYMD(d30);
      endDate = formatYMD(now);
      break;
    }
    case 'thismonth': {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      startDate = formatYMD(firstDay);
      endDate = formatYMD(now);
      break;
    }
    case 'lastmonth': {
      const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      startDate = formatYMD(firstDayLastMonth);
      endDate = formatYMD(lastDayLastMonth);
      break;
    }
    case 'custom': {
      startDate = customStart || formatYMD(now);
      endDate = customEnd || formatYMD(now);
      break;
    }
    default: {
      const def = new Date(now);
      def.setDate(def.getDate() - 30);
      startDate = formatYMD(def);
      endDate = formatYMD(now);
    }
  }

  return { startDate, endDate };
}

// GET /api/reports
router.get('/', authenticate, async (req, res) => {
  try {
    const { range = 'last30days', startDate: cStart, endDate: cEnd, staff_id } = req.query;
    const { startDate, endDate } = getDateRange(range, cStart, cEnd);

    const isStaff = req.user.role === 'staff';
    const userId = new mongoose.Types.ObjectId(req.user.id || req.user._id);

    const matchQuery = {
      inquiry_date: {
        $gte: `${startDate} 00:00:00`,
        $lte: `${endDate} 23:59:59`,
      },
    };

    if (isStaff) {
      matchQuery.$or = [{ assigned_to: userId }, { created_by: userId }];
    } else if (staff_id && staff_id !== 'all' && mongoose.Types.ObjectId.isValid(staff_id)) {
      matchQuery.assigned_to = new mongoose.Types.ObjectId(staff_id);
    }

    const total = await Inquiry.countDocuments(matchQuery);

    // Status breakdown
    const statusAgg = await Inquiry.aggregate([
      { $match: matchQuery },
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    const statusMap = {};
    for (const s of statusAgg) {
      statusMap[s._id] = s.count;
    }

    const statusRows = statusAgg.map((s) => ({ status: s._id, count: s.count }));
    const convertedCount = statusMap['Converted'] || 0;
    const invalidCount = statusMap['Invalid Number'] || 0;
    const totalValid = total - invalidCount;
    const conversionRate = totalValid > 0 ? ((convertedCount / totalValid) * 100).toFixed(2) : '0.00';

    // Course breakdown
    const courseAgg = await Inquiry.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$course_name',
          count: { $sum: 1 },
          converted: {
            $sum: { $cond: [{ $eq: ['$status', 'Converted'] }, 1, 0] },
          },
        },
      },
      { $sort: { count: -1 } },
    ]);

    const courseRows = courseAgg.map((c) => ({
      name: c._id,
      count: c.count,
      converted: c.converted,
      conversion_rate: c.count > 0 ? parseFloat(((c.converted / c.count) * 100).toFixed(1)) : 0,
    }));

    // Source breakdown
    const sourceAgg = await Inquiry.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$source_name',
          count: { $sum: 1 },
          converted: {
            $sum: { $cond: [{ $eq: ['$status', 'Converted'] }, 1, 0] },
          },
        },
      },
      { $sort: { count: -1 } },
    ]);

    const sourceRows = sourceAgg.map((s) => ({
      name: s._id,
      count: s.count,
      converted: s.converted,
      conversion_rate: s.count > 0 ? parseFloat(((s.converted / s.count) * 100).toFixed(1)) : 0,
    }));

    // Staff Performance Breakdown (Admin view)
    let staffRows = [];
    if (!isStaff) {
      const activeStaff = await User.find({ role: 'staff', is_active: 1 }).select('name email');

      staffRows = await Promise.all(
        activeStaff.map(async (u) => {
          const staffMatch = {
            assigned_to: u._id,
            inquiry_date: {
              $gte: `${startDate} 00:00:00`,
              $lte: `${endDate} 23:59:59`,
            },
          };

          const totalAssigned = await Inquiry.countDocuments(staffMatch);
          const converted = await Inquiry.countDocuments({ ...staffMatch, status: 'Converted' });
          const interested = await Inquiry.countDocuments({ ...staffMatch, status: 'Interested' });
          const demoScheduled = await Inquiry.countDocuments({ ...staffMatch, status: 'Demo Scheduled' });
          const notInterested = await Inquiry.countDocuments({ ...staffMatch, status: 'Not Interested' });
          const invalid = await Inquiry.countDocuments({ ...staffMatch, status: 'Invalid Number' });

          const valid = totalAssigned - invalid;
          const rate = valid > 0 ? parseFloat(((converted / valid) * 100).toFixed(1)) : 0;

          return {
            id: u.id || u._id.toString(),
            name: u.name,
            email: u.email,
            total_inquiries: totalAssigned,
            converted,
            interested,
            demo_scheduled: demoScheduled,
            not_interested: notInterested,
            conversion_rate: rate,
          };
        })
      );
      staffRows.sort((a, b) => b.total_inquiries - a.total_inquiries);
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    let fupScope = {};
    if (isStaff) {
      fupScope.assigned_to = userId;
    }

    const pendingFollowups = await Followup.countDocuments({
      status: 'Pending',
      ...fupScope,
    });

    const overdueFollowups = await Followup.countDocuments({
      status: 'Pending',
      scheduled_date: { $lt: todayStr },
      ...fupScope,
    });

    res.json({
      dateRange: { startDate, endDate, range },
      summary: {
        totalInquiries: total,
        totalValidInquiries: totalValid,
        convertedInquiries: convertedCount,
        invalidInquiries: invalidCount,
        conversionRate: parseFloat(conversionRate),
        pendingFollowups,
        overdueFollowups,
      },
      reportingFormula:
        'Conversion Rate = Converted Inquiries / (Total Inquiries - Invalid Numbers) * 100. Invalid numbers are excluded from the conversion denominator to provide an accurate reflection of staff sales performance.',
      statusDistribution: statusRows,
      courseDistribution: courseRows,
      sourceDistribution: sourceRows,
      staffPerformance: staffRows,
    });
  } catch (err) {
    console.error('Reports calculation error:', err);
    res.status(500).json({ error: 'Failed to generate report analytics.' });
  }
});

// GET /api/reports/export
router.get('/export', authenticate, async (req, res) => {
  try {
    const { range = 'last30days', startDate: cStart, endDate: cEnd, format = 'csv' } = req.query;
    const { startDate, endDate } = getDateRange(range, cStart, cEnd);

    const isStaff = req.user.role === 'staff';
    const userId = new mongoose.Types.ObjectId(req.user.id || req.user._id);

    const matchQuery = {
      inquiry_date: {
        $gte: `${startDate} 00:00:00`,
        $lte: `${endDate} 23:59:59`,
      },
    };

    if (isStaff) {
      matchQuery.$or = [{ assigned_to: userId }, { created_by: userId }];
    }

    const rows = await Inquiry.find(matchQuery).sort({ inquiry_date: -1 });

    const exportData = rows.map((r) => ({
      'Inquiry ID': r.inquiry_id,
      'Student Name': r.student_name,
      'Mobile Number': r.mobile,
      Course: r.course_name,
      'Lead Source': r.source_name,
      Status: r.status,
      Priority: r.priority,
      'Assigned To': r.assigned_to_name || 'Unassigned',
      'Inquiry Date': r.inquiry_date,
      Remarks: r.remarks || '',
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);
    XLSX.utils.book_append_sheet(wb, ws, 'Report Data');

    const filename = `UniverseByte_Report_${startDate}_to_${endDate}`;

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
    console.error('Reports export error:', err);
    res.status(500).json({ error: 'Failed to export reports.' });
  }
});

export default router;
