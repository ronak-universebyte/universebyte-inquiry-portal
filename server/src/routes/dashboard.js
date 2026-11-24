import express from 'express';
import mongoose from 'mongoose';
import { authenticate } from '../middleware/auth.js';
import Inquiry from '../models/Inquiry.js';
import Followup from '../models/Followup.js';
import User from '../models/User.js';

const router = express.Router();

// GET /api/dashboard
router.get('/', authenticate, async (req, res) => {
  try {
    const isStaff = req.user.role === 'staff';
    const userId = new mongoose.Types.ObjectId(req.user.id || req.user._id);

    const userFilter = isStaff ? { $or: [{ assigned_to: userId }, { created_by: userId }] } : {};

    // 1. Total Inquiries
    const totalInquiries = await Inquiry.countDocuments(userFilter);

    // Group count by status
    const countByStatus = await Inquiry.aggregate([
      { $match: userFilter },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    const statusMap = {};
    for (const row of countByStatus) {
      statusMap[row._id] = row.count;
    }

    // Pending followups
    let followupPendingCount = 0;
    const pendingFollowupsInqIds = await Followup.find({
      status: 'Pending',
      ...(isStaff ? { assigned_to: userId } : {}),
    }).distinct('inquiry_id');

    const pendingQuery = {
      ...userFilter,
      $or: [{ status: 'Follow-up Required' }, { _id: { $in: pendingFollowupsInqIds } }],
    };
    followupPendingCount = await Inquiry.countDocuments(pendingQuery);

    const kpis = {
      total: totalInquiries,
      new: statusMap['New'] || 0,
      contacted: statusMap['Contacted'] || 0,
      interested: statusMap['Interested'] || 0,
      followupPending: followupPendingCount,
      demoScheduled: statusMap['Demo Scheduled'] || 0,
      converted: statusMap['Converted'] || 0,
      notInterested: statusMap['Not Interested'] || 0,
      invalidNumber: statusMap['Invalid Number'] || 0,
    };

    const validTotal = totalInquiries - (statusMap['Invalid Number'] || 0);
    const conversionRate = validTotal > 0 ? ((kpis.converted / validTotal) * 100).toFixed(1) : '0.0';

    // 2. Daily inquiry trends (last 14 days)
    const d14 = new Date();
    d14.setDate(d14.getDate() - 14);
    const d14Str = d14.toISOString().slice(0, 10);

    const dailyTrendsAgg = await Inquiry.aggregate([
      {
        $match: {
          ...userFilter,
          inquiry_date: { $gte: `${d14Str} 00:00:00` },
        },
      },
      {
        $project: {
          date: { $substrCP: ['$inquiry_date', 0, 10] },
        },
      },
      {
        $group: {
          _id: '$date',
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const dailyTrends = dailyTrendsAgg.map((item) => ({
      date: item._id,
      count: item.count,
    }));

    // 3. Monthly inquiry trends (last 6 months)
    const m6 = new Date();
    m6.setMonth(m6.getMonth() - 6);
    const m6Str = m6.toISOString().slice(0, 7);

    const monthlyTrendsAgg = await Inquiry.aggregate([
      {
        $match: {
          ...userFilter,
          inquiry_date: { $gte: `${m6Str}-01 00:00:00` },
        },
      },
      {
        $project: {
          month: { $substrCP: ['$inquiry_date', 0, 7] },
          status: 1,
        },
      },
      {
        $group: {
          _id: '$month',
          count: { $sum: 1 },
          converted: {
            $sum: { $cond: [{ $eq: ['$status', 'Converted'] }, 1, 0] },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const monthlyTrends = monthlyTrendsAgg.map((item) => ({
      month: item._id,
      count: item.count,
      converted: item.converted,
    }));

    // 4. Course-wise inquiries
    const courseDistAgg = await Inquiry.aggregate([
      { $match: userFilter },
      { $group: { _id: '$course_name', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    const courseDistribution = courseDistAgg.map((c) => ({ name: c._id, count: c.count }));

    // 5. Source-wise inquiries
    const sourceDistAgg = await Inquiry.aggregate([
      { $match: userFilter },
      { $group: { _id: '$source_name', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    const sourceDistribution = sourceDistAgg.map((s) => ({ name: s._id, count: s.count }));

    // 6. Status distribution
    const statusDistribution = Object.entries(statusMap).map(([name, count]) => ({
      name,
      count,
    }));

    // 7. Staff-wise performance (for admin)
    let staffPerformance = [];
    if (!isStaff) {
      const activeStaff = await User.find({ role: 'staff', is_active: 1 }).select('name email');

      staffPerformance = await Promise.all(
        activeStaff.map(async (u) => {
          const totalAssigned = await Inquiry.countDocuments({ assigned_to: u._id });
          const converted = await Inquiry.countDocuments({ assigned_to: u._id, status: 'Converted' });
          const pendingFollowups = await Followup.countDocuments({ assigned_to: u._id, status: 'Pending' });

          return {
            id: u.id || u._id.toString(),
            name: u.name,
            email: u.email,
            total_assigned: totalAssigned,
            converted,
            pending_followups: pendingFollowups,
          };
        })
      );
      staffPerformance.sort((a, b) => b.total_assigned - a.total_assigned);
    }

    // 8. Recent 10 inquiries
    const recentInquiries = await Inquiry.find(userFilter)
      .sort({ inquiry_date: -1, _id: -1 })
      .limit(10)
      .select('id inquiry_id student_name mobile course_name source_name status priority assigned_to_name inquiry_date');

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
      recentInquiries,
    });
  } catch (err) {
    console.error('Dashboard metrics error:', err);
    res.status(500).json({ error: 'Failed to retrieve dashboard metrics.' });
  }
});

export default router;
