import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Download,
  Calendar,
  TrendingUp,
  Award,
  AlertCircle,
  Clock,
  Printer,
  Info,
  CheckCircle2
} from 'lucide-react';
import api from '../../services/api';

export const ReportsView: React.FC = () => {
  const [range, setRange] = useState('last30days');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reportData, setReportData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchReports = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/reports', {
        params: {
          range,
          startDate: range === 'custom' ? startDate : undefined,
          endDate: range === 'custom' ? endDate : undefined
        }
      });
      setReportData(res.data);
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (range !== 'custom' || (startDate && endDate)) {
      fetchReports();
    }
  }, [range, startDate, endDate]);

  const handleExport = (format: 'csv' | 'xlsx') => {
    const params = new URLSearchParams();
    params.set('format', format);
    params.set('range', range);
    if (range === 'custom') {
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
    }
    window.open(`/api/reports/export?${params.toString()}`, '_blank');
  };

  const ranges = [
    { id: 'today', label: 'Today' },
    { id: 'yesterday', label: 'Yesterday' },
    { id: 'last7days', label: 'Last 7 Days' },
    { id: 'last30days', label: 'Last 30 Days' },
    { id: 'thismonth', label: 'This Month' },
    { id: 'lastmonth', label: 'Previous Month' },
    { id: 'custom', label: 'Custom Range' }
  ];

  return (
    <div className="space-y-6">
      {/* Date Filter & Export Header */}
      <div className="bg-white dark:bg-[#151A38] p-5 rounded-3xl border border-slate-200/80 dark:border-[#23294C] shadow-card space-y-4 no-print">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
          {/* Quick Range Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 w-full lg:w-auto">
            {ranges.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setRange(r.id)}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                  range === r.id
                    ? 'bg-[#10152F] dark:bg-[#7138F5] text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          {/* Export & Print */}
          <div className="flex items-center gap-2 w-full lg:w-auto justify-end">
            <button
              type="button"
              onClick={() => handleExport('csv')}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-xl transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export CSV</span>
            </button>
            <button
              type="button"
              onClick={() => handleExport('xlsx')}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-xl transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-emerald-500" />
              <span>Export Excel</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl transition-colors"
            >
              <Printer className="w-4 h-4 text-slate-500" />
            </button>
          </div>
        </div>

        {/* Custom Range Picker */}
        {range === 'custom' && (
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold text-slate-500">From:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5"
              />
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold text-slate-500">To:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5"
              />
            </div>
          </div>
        )}
      </div>

      {isLoading || !reportData ? (
        <div className="py-24 text-center">
          <div className="w-8 h-8 border-4 border-[#7138F5] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-semibold text-slate-500">Compiling report analytics...</p>
        </div>
      ) : (
        <>
          {/* Summary KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-[#151A38] p-5 rounded-2xl border border-slate-200/80 dark:border-[#23294C] shadow-card">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Inquiries</p>
              <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
                {reportData.summary.totalInquiries}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                Active valid: {reportData.summary.totalValidInquiries}
              </p>
            </div>

            <div className="bg-white dark:bg-[#151A38] p-5 rounded-2xl border border-slate-200/80 dark:border-[#23294C] shadow-card">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Converted Inquiries</p>
              <p className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
                {reportData.summary.convertedInquiries}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">Students enrolled & paid</p>
            </div>

            <div className="bg-white dark:bg-[#151A38] p-5 rounded-2xl border border-slate-200/80 dark:border-[#23294C] shadow-card">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Conversion Rate</p>
              <p className="text-2xl sm:text-3xl font-extrabold text-[#7138F5] dark:text-[#00D5FF] mt-1">
                {reportData.summary.conversionRate}%
              </p>
              <p className="text-[11px] text-slate-400 mt-1">Converted / Valid Inquiries</p>
            </div>

            <div className="bg-white dark:bg-[#151A38] p-5 rounded-2xl border border-slate-200/80 dark:border-[#23294C] shadow-card">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Follow-up Backlog</p>
              <p className="text-2xl sm:text-3xl font-extrabold text-amber-600 dark:text-amber-400 mt-1">
                {reportData.summary.pendingFollowups}
              </p>
              <p className="text-[11px] text-rose-500 font-bold mt-1">
                {reportData.summary.overdueFollowups} Overdue
              </p>
            </div>
          </div>

          {/* Formula Documentation Card */}
          <div className="bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 p-4 rounded-2xl flex items-start gap-3 text-xs text-blue-900 dark:text-blue-300">
            <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Reporting Methodology & Treatment of Invalid Records</p>
              <p className="mt-0.5 opacity-90 leading-relaxed">
                {reportData.reportingFormula} Invalid numbers ({reportData.summary.invalidInquiries} in this period) and deleted inquiries are isolated from performance benchmarks to maintain genuine conversion tracking.
              </p>
            </div>
          </div>

          {/* Course-wise Report Table */}
          <div className="bg-white dark:bg-[#151A38] p-6 rounded-3xl border border-slate-200/80 dark:border-[#23294C] shadow-card">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">
              Course-wise Inquiry & Conversion Performance
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase font-semibold">
                    <th className="pb-2.5">Course Name</th>
                    <th className="pb-2.5 text-center">Inquiries</th>
                    <th className="pb-2.5 text-center">Converted</th>
                    <th className="pb-2.5 text-right">Conversion %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                  {reportData.courseDistribution.map((c: any) => (
                    <tr key={c.name} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                      <td className="py-2.5 font-bold text-slate-900 dark:text-white">{c.name}</td>
                      <td className="py-2.5 text-center font-bold">{c.count}</td>
                      <td className="py-2.5 text-center text-emerald-600 dark:text-emerald-400 font-bold">{c.converted}</td>
                      <td className="py-2.5 text-right font-bold text-[#7138F5]">{c.conversion_rate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Source-wise Report Table */}
          <div className="bg-white dark:bg-[#151A38] p-6 rounded-3xl border border-slate-200/80 dark:border-[#23294C] shadow-card">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">
              Source-wise Lead Performance
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase font-semibold">
                    <th className="pb-2.5">Inquiry Source</th>
                    <th className="pb-2.5 text-center">Inquiries</th>
                    <th className="pb-2.5 text-center">Converted</th>
                    <th className="pb-2.5 text-right">Conversion %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                  {reportData.sourceDistribution.map((s: any) => (
                    <tr key={s.name} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                      <td className="py-2.5 font-bold text-slate-900 dark:text-white">{s.name}</td>
                      <td className="py-2.5 text-center font-bold">{s.count}</td>
                      <td className="py-2.5 text-center text-emerald-600 dark:text-emerald-400 font-bold">{s.converted}</td>
                      <td className="py-2.5 text-right font-bold text-[#7138F5]">{s.conversion_rate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Staff-wise Sales Performance (Admin only) */}
          {reportData.staffPerformance && reportData.staffPerformance.length > 0 && (
            <div className="bg-white dark:bg-[#151A38] p-6 rounded-3xl border border-slate-200/80 dark:border-[#23294C] shadow-card">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">
                Counselor Workload & Conversion Metrics
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase font-semibold">
                      <th className="pb-2.5">Staff Counselor</th>
                      <th className="pb-2.5 text-center">Assigned Inquiries</th>
                      <th className="pb-2.5 text-center">Converted</th>
                      <th className="pb-2.5 text-center">Interested</th>
                      <th className="pb-2.5 text-center">Demo Scheduled</th>
                      <th className="pb-2.5 text-right">Conversion %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                    {reportData.staffPerformance.map((st: any) => (
                      <tr key={st.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                        <td className="py-2.5 font-bold text-slate-900 dark:text-white">{st.name}</td>
                        <td className="py-2.5 text-center font-bold">{st.total_inquiries}</td>
                        <td className="py-2.5 text-center text-emerald-600 dark:text-emerald-400 font-bold">{st.converted}</td>
                        <td className="py-2.5 text-center text-cyan-600 dark:text-cyan-400 font-bold">{st.interested}</td>
                        <td className="py-2.5 text-center text-indigo-600 dark:text-indigo-400 font-bold">{st.demo_scheduled}</td>
                        <td className="py-2.5 text-right font-extrabold text-[#7138F5]">{st.conversion_rate}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
