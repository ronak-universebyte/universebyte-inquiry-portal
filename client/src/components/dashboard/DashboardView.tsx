import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  PhoneCall,
  Sparkles,
  CalendarCheck,
  Video,
  Award,
  XCircle,
  TrendingUp,
  ArrowRight,
  Eye,
  Edit3
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend
} from 'recharts';
import api from '../../services/api';
import { StatusBadge, PriorityBadge } from '../common/Badge';

interface DashboardViewProps {
  onNavigateToInquiries: (filterParams?: { status?: string; course?: string; source?: string }) => void;
  onOpenInquiryDetails: (id: number) => void;
  onOpenEditInquiry: (inquiry: any) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigateToInquiries,
  onOpenInquiryDetails,
  onOpenEditInquiry
}) => {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/dashboard');
      setData(res.data);
    } catch (err) {
      console.error('Failed to fetch dashboard metrics:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (isLoading || !data) {
    return (
      <div className="py-24 text-center">
        <div className="w-10 h-10 border-4 border-[#7138F5] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs font-semibold text-slate-500">Calculating real-time database statistics...</p>
      </div>
    );
  }

  const { kpis, conversionRate, dailyTrends, monthlyTrends, courseDistribution, sourceDistribution, statusDistribution, staffPerformance, recentInquiries } = data;

  const kpiCards = [
    {
      title: 'Total Inquiries',
      count: kpis.total,
      icon: Users,
      filter: undefined,
      color: 'from-[#10152F] to-[#252f5a] text-white',
      accentColor: '#00D5FF'
    },
    {
      title: 'New Inquiries',
      count: kpis.new,
      icon: UserPlus,
      filter: { status: 'New' },
      color: 'from-blue-600 to-blue-700 text-white',
      accentColor: '#93c5fd'
    },
    {
      title: 'Contacted',
      count: kpis.contacted,
      icon: PhoneCall,
      filter: { status: 'Contacted' },
      color: 'from-[#7138F5] to-[#8d5ef8] text-white',
      accentColor: '#d8b4fe'
    },
    {
      title: 'Interested',
      count: kpis.interested,
      icon: Sparkles,
      filter: { status: 'Interested' },
      color: 'from-cyan-600 to-cyan-700 text-white',
      accentColor: '#a5f3fc'
    },
    {
      title: 'Follow-up Pending',
      count: kpis.followupPending,
      icon: CalendarCheck,
      filter: { status: 'Follow-up Required' },
      color: 'from-amber-500 to-amber-600 text-white',
      accentColor: '#fde68a'
    },
    {
      title: 'Demo Scheduled',
      count: kpis.demoScheduled,
      icon: Video,
      filter: { status: 'Demo Scheduled' },
      color: 'from-indigo-600 to-indigo-700 text-white',
      accentColor: '#c7d2fe'
    },
    {
      title: 'Converted',
      count: kpis.converted,
      icon: Award,
      filter: { status: 'Converted' },
      color: 'from-emerald-600 to-emerald-700 text-white',
      accentColor: '#6ee7b7'
    },
    {
      title: 'Not Interested',
      count: kpis.notInterested,
      icon: XCircle,
      filter: { status: 'Not Interested' },
      color: 'from-rose-600 to-rose-700 text-white',
      accentColor: '#fecdd3'
    }
  ];

  const PIE_COLORS = ['#7138F5', '#00D5FF', '#10B981', '#F59E0B', '#6366F1', '#EC4899', '#8B5CF6', '#64748B'];

  return (
    <div className="space-y-6">
      {/* 8 Clickable KPI Cards */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Inquiry Pipeline Overview
          </h2>
          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Overall Conversion Rate: {conversionRate}%</span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {kpiCards.map((card, idx) => {
            const Icon = card.icon;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => onNavigateToInquiries(card.filter)}
                className={`group relative overflow-hidden rounded-2xl p-4 bg-gradient-to-br ${card.color} shadow-sm hover:shadow-lg transition-all duration-200 transform hover:-translate-y-0.5 text-left`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold opacity-90">{card.title}</span>
                  <div className="p-2 rounded-xl bg-white/15 backdrop-blur-md">
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                </div>
                <div className="mt-3 flex items-baseline justify-between">
                  <span className="text-2xl sm:text-3xl font-extrabold tracking-tight">{card.count}</span>
                  <span className="text-[11px] font-medium opacity-80 flex items-center gap-0.5 group-hover:translate-x-1 transition-transform">
                    View list <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Daily Inquiry Trends */}
        <div className="bg-white dark:bg-[#151A38] p-5 rounded-2xl border border-slate-200/80 dark:border-[#23294C] shadow-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Daily Inquiry Velocity</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Incoming inquiries across the last 14 days</p>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyTrends}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7138F5" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#7138F5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <Tooltip contentStyle={{ backgroundColor: '#10152F', borderColor: '#23294C', borderRadius: '12px', color: '#fff', fontSize: '12px' }} />
                <Area type="monotone" dataKey="count" stroke="#7138F5" strokeWidth={2.5} fillOpacity={1} fill="url(#colorCount)" name="Inquiries" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Course-wise Distribution */}
        <div className="bg-white dark:bg-[#151A38] p-5 rounded-2xl border border-slate-200/80 dark:border-[#23294C] shadow-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Course Demand Breakdown</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Student interest by technology track</p>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={courseDistribution} layout="vertical" margin={{ left: 20 }}>
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <YAxis dataKey="name" type="category" width={110} tick={{ fontSize: 10 }} stroke="#94a3b8" />
                <Tooltip contentStyle={{ backgroundColor: '#10152F', borderColor: '#23294C', borderRadius: '12px', color: '#fff', fontSize: '12px' }} />
                <Bar dataKey="count" fill="#00D5FF" radius={[0, 6, 6, 0]} name="Inquiries" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Source-wise Inquiries */}
        <div className="bg-white dark:bg-[#151A38] p-5 rounded-2xl border border-slate-200/80 dark:border-[#23294C] shadow-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Lead Generation Sources</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Where student leads originate</p>
            </div>
          </div>
          <div className="h-64 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={sourceDistribution}
                  dataKey="count"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  innerRadius={45}
                  paddingAngle={3}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {sourceDistribution.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#10152F', borderColor: '#23294C', borderRadius: '12px', color: '#fff', fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Monthly Performance Trends */}
        <div className="bg-white dark:bg-[#151A38] p-5 rounded-2xl border border-slate-200/80 dark:border-[#23294C] shadow-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Monthly Inquiries vs Conversions</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Inquiry intake and converted students per month</p>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyTrends}>
                <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <Tooltip contentStyle={{ backgroundColor: '#10152F', borderColor: '#23294C', borderRadius: '12px', color: '#fff', fontSize: '12px' }} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="count" fill="#7138F5" radius={[4, 4, 0, 0]} name="Total Inquiries" />
                <Bar dataKey="converted" fill="#10B981" radius={[4, 4, 0, 0]} name="Converted" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Staff Performance (Admin view) */}
      {staffPerformance && staffPerformance.length > 0 && (
        <div className="bg-white dark:bg-[#151A38] p-5 rounded-2xl border border-slate-200/80 dark:border-[#23294C] shadow-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Counsellor & Staff Performance</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Workload distribution and conversion efficiency</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase font-semibold">
                  <th className="pb-2.5 font-bold">Staff Member</th>
                  <th className="pb-2.5 font-bold text-center">Assigned Leads</th>
                  <th className="pb-2.5 font-bold text-center">Converted</th>
                  <th className="pb-2.5 font-bold text-center">Pending Follow-ups</th>
                  <th className="pb-2.5 font-bold text-right">Conversion Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium text-slate-700 dark:text-slate-200">
                {staffPerformance.map((staff: any) => {
                  const rate = staff.total_assigned > 0 ? ((staff.converted / staff.total_assigned) * 100).toFixed(1) : '0.0';
                  return (
                    <tr key={staff.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="py-2.5 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-[#7138F5]/10 text-[#7138F5] flex items-center justify-center font-bold text-[10px]">
                          {staff.name.charAt(0)}
                        </div>
                        <span>{staff.name}</span>
                      </td>
                      <td className="py-2.5 text-center font-bold">{staff.total_assigned}</td>
                      <td className="py-2.5 text-center text-emerald-600 dark:text-emerald-400 font-bold">{staff.converted}</td>
                      <td className="py-2.5 text-center text-amber-600 dark:text-amber-400 font-bold">{staff.pending_followups}</td>
                      <td className="py-2.5 text-right font-extrabold text-[#7138F5]">{rate}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent 10 Inquiries Table */}
      <div className="bg-white dark:bg-[#151A38] p-5 rounded-2xl border border-slate-200/80 dark:border-[#23294C] shadow-card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Recent Student Inquiries</h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Latest 10 registered leads in the system</p>
          </div>
          <button
            type="button"
            onClick={() => onNavigateToInquiries()}
            className="text-xs font-bold text-[#7138F5] hover:underline flex items-center gap-1"
          >
            <span>View All Inquiries</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase font-semibold">
                <th className="pb-2.5 font-bold">ID</th>
                <th className="pb-2.5 font-bold">Student Name</th>
                <th className="pb-2.5 font-bold">Mobile</th>
                <th className="pb-2.5 font-bold">Interested Course</th>
                <th className="pb-2.5 font-bold">Source</th>
                <th className="pb-2.5 font-bold">Status</th>
                <th className="pb-2.5 font-bold">Assigned Staff</th>
                <th className="pb-2.5 font-bold">Inquiry Date</th>
                <th className="pb-2.5 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium text-slate-700 dark:text-slate-200">
              {recentInquiries.map((inq: any) => (
                <tr key={inq.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="py-2.5 font-mono text-[11px] text-[#7138F5] font-bold">
                    {inq.inquiry_id}
                  </td>
                  <td className="py-2.5 font-bold text-slate-900 dark:text-white">
                    {inq.student_name}
                  </td>
                  <td className="py-2.5">
                    <a href={`tel:+91${inq.mobile}`} className="hover:text-[#7138F5]">
                      {inq.mobile}
                    </a>
                  </td>
                  <td className="py-2.5">{inq.course_name}</td>
                  <td className="py-2.5 text-slate-500 dark:text-slate-400">{inq.source_name}</td>
                  <td className="py-2.5">
                    <StatusBadge status={inq.status} size="sm" />
                  </td>
                  <td className="py-2.5 text-slate-600 dark:text-slate-300">
                    {inq.assigned_to_name || 'Unassigned'}
                  </td>
                  <td className="py-2.5 text-slate-400 font-mono text-[11px]">
                    {inq.inquiry_date.split(' ')[0]}
                  </td>
                  <td className="py-2.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => onOpenInquiryDetails(inq.id)}
                        title="View Full Profile"
                        className="p-1.5 rounded-lg text-slate-500 hover:text-[#7138F5] hover:bg-purple-50 dark:hover:bg-purple-950/40 transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenEditInquiry(inq)}
                        title="Edit Details"
                        className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
