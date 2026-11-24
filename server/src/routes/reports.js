import express from 'express';
import db from '../db.js';
import { authenticate } from '../middleware/auth.js';
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
      // Default to last 30 days
      const def = new Date(now);
      def.setDate(def.getDate() - 30);
      startDate = formatYMD(def);
      endDate = formatYMD(now);
    }
  }

  return { startDate, endDate };
}

// GET /api/reports
router.get('/', authenticate, (req, res) => {
  const { range = 'last30days', startDate: cStart, endDate: cEnd, staff_id } = req.query;
  const { startDate, endDate } = getDateRange(range, cStart, cEnd);

  const isStaff = req.user.role === 'staff';
  const conditions = ['date(inquiry_date) >= date(?)', 'date(inquiry_date) <= date(?)'];
  const params = [startDate, endDate];

  if (isStaff) {
    conditions.push('(assigned_to = ? OR created_by = ?)');
    params.push(req.user.id, req.user.id);
  } else if (staff_id && staff_id !== 'all') {
    conditions.push('assigned_to = ?');
    params.push(staff_id);
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  // 1. Total Inquiries in Range
  const total = db.prepare(`SELECT COUNT(*) as count FROM inquiries ${whereClause}`).get(...params).count;

  // 2. Status Breakdown
  const statusRows = db.prepare(`
    SELECT status, COUNT(*) as count 
    FROM inquiries 
    ${whereClause} 
    GROUP BY status 
    ORDER BY count DESC
  `).all(...params);

  const statusMap = {};
  for (const s of statusRows) {
    statusMap[s.status] = s.count;
  }

  const convertedCount = statusMap['Converted'] || 0;
  const invalidCount = statusMap['Invalid Number'] || 0;
  const totalValid = total - invalidCount;
  const conversionRate = totalValid > 0 ? ((convertedCount / totalValid) * 100).toFixed(2) : '0.00';

  // 3. Course Breakdown
  const courseRows = db.prepare(`
    SELECT 
      course_name as name, 
      COUNT(*) as count,
      SUM(CASE WHEN status = 'Converted' THEN 1 ELSE 0 END) as converted,
      ROUND(CASE WHEN COUNT(*) > 0 THEN (SUM(CASE WHEN status = 'Converted' THEN 1.0 ELSE 0.0 END) / COUNT(*)) * 100 ELSE 0 END, 1) as conversion_rate
    FROM inquiries 
    ${whereClause} 
    GROUP BY course_name 
    ORDER BY count DESC
  `).all(...params);

  // 4. Source Breakdown
  const sourceRows = db.prepare(`
    SELECT 
      source_name as name, 
      COUNT(*) as count,
      SUM(CASE WHEN status = 'Converted' THEN 1 ELSE 0 END) as converted,
      ROUND(CASE WHEN COUNT(*) > 0 THEN (SUM(CASE WHEN status = 'Converted' THEN 1.0 ELSE 0.0 END) / COUNT(*)) * 100 ELSE 0 END, 1) as conversion_rate
    FROM inquiries 
    ${whereClause} 
    GROUP BY source_name 
    ORDER BY count DESC
  `).all(...params);

  // 5. Staff Performance Breakdown (Admin sees all staff)
  let staffRows = [];
  if (!isStaff) {
    staffRows = db.prepare(`
      SELECT 
        u.id,
        u.name,
        u.email,
        COUNT(i.id) as total_inquiries,
        SUM(CASE WHEN i.status = 'Converted' THEN 1 ELSE 0 END) as converted,
        SUM(CASE WHEN i.status = 'Interested' THEN 1 ELSE 0 END) as interested,
        SUM(CASE WHEN i.status = 'Demo Scheduled' THEN 1 ELSE 0 END) as demo_scheduled,
        SUM(CASE WHEN i.status = 'Not Interested' THEN 1 ELSE 0 END) as not_interested,
        ROUND(CASE WHEN (COUNT(i.id) - SUM(CASE WHEN i.status = 'Invalid Number' THEN 1 ELSE 0 END)) > 0 
          THEN (SUM(CASE WHEN i.status = 'Converted' THEN 1.0 ELSE 0.0 END) / (COUNT(i.id) - SUM(CASE WHEN i.status = 'Invalid Number' THEN 1 ELSE 0 END))) * 100 
          ELSE 0 END, 1) as conversion_rate
      FROM users u
      LEFT JOIN inquiries i ON i.assigned_to = u.id AND date(i.inquiry_date) >= date(?) AND date(i.inquiry_date) <= date(?)
      WHERE u.role = 'staff' AND u.is_active = 1
      GROUP BY u.id
      ORDER BY total_inquiries DESC
    `).all(startDate, endDate);
  }

  // 6. Follow-up summary within the scope
  const todayStr = new Date().toISOString().slice(0, 10);
  const userFupFilter = isStaff ? 'AND (f.assigned_to = ? OR i.assigned_to = ?)' : '';
  const userFupParams = isStaff ? [req.user.id, req.user.id] : [];

  const pendingFollowups = db.prepare(`
    SELECT COUNT(*) as count 
    FROM followups f
    JOIN inquiries i ON f.inquiry_id = i.id
    WHERE f.status = 'Pending' ${userFupFilter}
  `).get(...userFupParams).count;

  const overdueFollowups = db.prepare(`
    SELECT COUNT(*) as count 
    FROM followups f
    JOIN inquiries i ON f.inquiry_id = i.id
    WHERE f.status = 'Pending' AND f.scheduled_date < ? ${userFupFilter}
  `).get(todayStr, ...userFupParams).count;

  res.json({
    dateRange: { startDate, endDate, range },
    summary: {
      totalInquiries: total,
      totalValidInquiries: totalValid,
      convertedInquiries: convertedCount,
      invalidInquiries: invalidCount,
      conversionRate: parseFloat(conversionRate),
      pendingFollowups,
      overdueFollowups
    },
    reportingFormula: 'Conversion Rate = Converted Inquiries / (Total Inquiries - Invalid Numbers) * 100. Invalid numbers are excluded from the conversion denominator to provide an accurate reflection of staff sales performance.',
    statusDistribution: statusRows,
    courseDistribution: courseRows,
    sourceDistribution: sourceRows,
    staffPerformance: staffRows
  });
});

// GET /api/reports/export
router.get('/export', authenticate, (req, res) => {
  const { range = 'last30days', startDate: cStart, endDate: cEnd, format = 'csv' } = req.query;
  const { startDate, endDate } = getDateRange(range, cStart, cEnd);

  const isStaff = req.user.role === 'staff';
  const conditions = ['date(inquiry_date) >= date(?)', 'date(inquiry_date) <= date(?)'];
  const params = [startDate, endDate];

  if (isStaff) {
    conditions.push('(assigned_to = ? OR created_by = ?)');
    params.push(req.user.id, req.user.id);
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;
  const rows = db.prepare(`
    SELECT 
      inquiry_id, student_name, mobile, course_name, source_name,
      status, priority, assigned_to_name, inquiry_date, remarks
    FROM inquiries
    ${whereClause}
    ORDER BY inquiry_date DESC
  `).all(...params);

  const exportData = rows.map(r => ({
    'Inquiry ID': r.inquiry_id,
    'Student Name': r.student_name,
    'Mobile Number': r.mobile,
    'Course': r.course_name,
    'Lead Source': r.source_name,
    'Status': r.status,
    'Priority': r.priority,
    'Assigned To': r.assigned_to_name || 'Unassigned',
    'Inquiry Date': r.inquiry_date,
    'Remarks': r.remarks || ''
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
});

export default router;
