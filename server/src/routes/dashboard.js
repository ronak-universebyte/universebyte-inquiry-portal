import express from 'express';
import db from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// GET /api/dashboard
router.get('/', authenticate, (req, res) => {
  const isStaff = req.user.role === 'staff';
  const userFilter = isStaff ? 'WHERE (assigned_to = ? OR created_by = ?)' : '';
  const userParams = isStaff ? [req.user.id, req.user.id] : [];

  // 1. KPI Cards
  const totalInquiries = db.prepare(`SELECT COUNT(*) as count FROM inquiries ${userFilter}`).get(...userParams).count;

  const countByStatus = db.prepare(`
    SELECT status, COUNT(*) as count 
    FROM inquiries 
    ${userFilter} 
    GROUP BY status
  `).all(...userParams);

  const statusMap = {};
  for (const row of countByStatus) {
    statusMap[row.status] = row.count;
  }

  // Pending follow-ups count
  const followupPendingCount = db.prepare(`
    SELECT COUNT(DISTINCT i.id) as count
    FROM inquiries i
    LEFT JOIN followups f ON f.inquiry_id = i.id AND f.status = 'Pending'
    ${isStaff ? 'WHERE (i.assigned_to = ? OR i.created_by = ?)' : 'WHERE 1=1'}
    AND (i.status = 'Follow-up Required' OR f.id IS NOT NULL)
  `).get(...userParams).count;

  const kpis = {
    total: totalInquiries,
    new: statusMap['New'] || 0,
    contacted: statusMap['Contacted'] || 0,
    interested: statusMap['Interested'] || 0,
    followupPending: followupPendingCount,
    demoScheduled: statusMap['Demo Scheduled'] || 0,
    converted: statusMap['Converted'] || 0,
    notInterested: statusMap['Not Interested'] || 0,
    invalidNumber: statusMap['Invalid Number'] || 0
  };

  // Conversion rate: Converted / (Total - Invalid Number) * 100
  const validTotal = totalInquiries - (statusMap['Invalid Number'] || 0);
  const conversionRate = validTotal > 0 ? ((kpis.converted / validTotal) * 100).toFixed(1) : '0.0';

  // 2. Daily inquiry trends (last 14 days)
  const dailyTrends = db.prepare(`
    SELECT 
      date(inquiry_date) as date,
      COUNT(*) as count
    FROM inquiries
    ${userFilter ? userFilter + " AND inquiry_date >= datetime('now', '-14 days', 'localtime')" : "WHERE inquiry_date >= datetime('now', '-14 days', 'localtime')"}
    GROUP BY date(inquiry_date)
    ORDER BY date ASC
  `).all(...userParams);

  // 3. Monthly inquiry trends (last 6 months)
  const monthlyTrends = db.prepare(`
    SELECT 
      strftime('%Y-%m', inquiry_date) as month,
      COUNT(*) as count,
      SUM(CASE WHEN status = 'Converted' THEN 1 ELSE 0 END) as converted
    FROM inquiries
    ${userFilter ? userFilter + " AND inquiry_date >= datetime('now', '-6 months', 'localtime')" : "WHERE inquiry_date >= datetime('now', '-6 months', 'localtime')"}
    GROUP BY strftime('%Y-%m', inquiry_date)
    ORDER BY month ASC
  `).all(...userParams);

  // 4. Course-wise inquiries
  const courseDistribution = db.prepare(`
    SELECT course_name as name, COUNT(*) as count
    FROM inquiries
    ${userFilter}
    GROUP BY course_name
    ORDER BY count DESC
  `).all(...userParams);

  // 5. Source-wise inquiries
  const sourceDistribution = db.prepare(`
    SELECT source_name as name, COUNT(*) as count
    FROM inquiries
    ${userFilter}
    GROUP BY source_name
    ORDER BY count DESC
  `).all(...userParams);

  // 6. Status distribution
  const statusDistribution = Object.entries(statusMap).map(([name, count]) => ({
    name,
    count
  }));

  // 7. Staff-wise performance (all staff for admin, or self for staff)
  let staffPerformance = [];
  if (!isStaff) {
    staffPerformance = db.prepare(`
      SELECT 
        u.id,
        u.name,
        u.email,
        COUNT(i.id) as total_assigned,
        SUM(CASE WHEN i.status = 'Converted' THEN 1 ELSE 0 END) as converted,
        SUM(CASE WHEN i.status = 'Follow-up Required' OR f.id IS NOT NULL THEN 1 ELSE 0 END) as pending_followups
      FROM users u
      LEFT JOIN inquiries i ON i.assigned_to = u.id
      LEFT JOIN followups f ON f.inquiry_id = i.id AND f.status = 'Pending'
      WHERE u.role = 'staff' AND u.is_active = 1
      GROUP BY u.id
      ORDER BY total_assigned DESC
    `).all();
  }

  // 8. Recent 10 inquiries
  const recentInquiries = db.prepare(`
    SELECT 
      id, inquiry_id, student_name, mobile, course_name, 
      source_name, status, priority, assigned_to_name, inquiry_date
    FROM inquiries
    ${userFilter}
    ORDER BY inquiry_date DESC, id DESC
    LIMIT 10
  `).all(...userParams);

  res.json({
    kpis,
    conversionRate,
    validTotal,
    dailyTrends,
    monthlyTrends,
    courseDistribution,
    sourceDistribution,
    statusDistribution,
    staffPerformance,
    recentInquiries
  });
});

export default router;
