import React, { useState, useEffect } from 'react';
import {
  CalendarCheck,
  Clock,
  AlertTriangle,
  CheckCircle2,
  PhoneCall,
  MessageSquare,
  Eye,
  Calendar,
  RotateCcw,
  Search,
  CheckSquare
} from 'lucide-react';
import api from '../../services/api';
import { StatusBadge, PriorityBadge } from '../common/Badge';
import { CompleteFollowupModal } from './CompleteFollowupModal';
import { RescheduleModal } from './RescheduleModal';

interface FollowupsViewProps {
  onOpenDetails: (inquiryId: number) => void;
  onOpenWhatsApp: (inquiry: any) => void;
  onOpenCall: (inquiry: any) => void;
  onCountsUpdated?: (counts: any) => void;
}

export const FollowupsView: React.FC<FollowupsViewProps> = ({
  onOpenDetails,
  onOpenWhatsApp,
  onOpenCall,
  onCountsUpdated
}) => {
  const [category, setCategory] = useState<'today' | 'upcoming' | 'overdue' | 'completed'>('today');
  const [search, setSearch] = useState('');
  const [followups, setFollowups] = useState<any[]>([]);
  const [counts, setCounts] = useState({
    today: 0,
    upcoming: 0,
    overdue: 0,
    completed: 0,
    totalPending: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [selectedForComplete, setSelectedForComplete] = useState<any>(null);
  const [selectedForReschedule, setSelectedForReschedule] = useState<any>(null);

  const fetchFollowups = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/followups', {
        params: {
          category,
          search: search.trim() || undefined
        }
      });
      setFollowups(res.data.followups || []);
      setCounts(res.data.counts || {});
      if (onCountsUpdated) onCountsUpdated(res.data.counts);
    } catch (err) {
      console.error('Failed to load follow-ups:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFollowups();
  }, [category]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchFollowups();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const tabs = [
    {
      id: 'today' as const,
      label: "Today's Follow-ups",
      count: counts.today,
      color: 'text-[#7138F5]',
      badgeBg: 'bg-[#7138F5] text-white'
    },
    {
      id: 'upcoming' as const,
      label: 'Upcoming Follow-ups',
      count: counts.upcoming,
      color: 'text-blue-600',
      badgeBg: 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200'
    },
    {
      id: 'overdue' as const,
      label: 'Overdue Follow-ups',
      count: counts.overdue,
      color: 'text-rose-600',
      badgeBg: 'bg-rose-500 text-white animate-pulse'
    },
    {
      id: 'completed' as const,
      label: 'Completed Follow-ups',
      count: counts.completed,
      color: 'text-emerald-600',
      badgeBg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200'
    }
  ];

  return (
    <div className="space-y-5">
      {/* Category Tabs Header */}
      <div className="bg-white dark:bg-[#151A38] p-4 rounded-3xl border border-slate-200/80 dark:border-[#23294C] shadow-card space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Tab buttons */}
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setCategory(t.id)}
                className={`flex items-center gap-2 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                  category === t.id
                    ? 'bg-[#10152F] dark:bg-[#7138F5] text-white shadow-md'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <span>{t.label}</span>
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold ${t.badgeBg}`}>
                  {t.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search bar */}
          <div className="relative w-full sm:w-72">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-3.5 h-3.5" />
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search follow-ups..."
              className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7138F5]"
            />
          </div>
        </div>

        {category === 'overdue' && counts.overdue > 0 && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 rounded-2xl flex items-center gap-2 text-xs font-semibold">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>
              <strong>Attention:</strong> You have {counts.overdue} overdue follow-up{counts.overdue > 1 ? 's' : ''}. Prompt follow-up significantly increases student conversion rate. Overdue leads are never automatically deleted.
            </span>
          </div>
        )}
      </div>

      {/* Follow-ups List Table */}
      <div className="bg-white dark:bg-[#151A38] rounded-3xl border border-slate-200/80 dark:border-[#23294C] shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/70 dark:bg-slate-900/50 border-b border-slate-200/80 dark:border-slate-800 text-slate-400 uppercase font-bold text-[11px] tracking-wider">
                <th className="py-3 px-4">Student & Inquiry</th>
                <th className="py-3 px-3">Contact</th>
                <th className="py-3 px-3">Course</th>
                <th className="py-3 px-3">Scheduled Date & Time</th>
                <th className="py-3 px-3">Assigned Staff</th>
                <th className="py-3 px-3">Remarks / Agenda</th>
                {category === 'completed' && <th className="py-3 px-3">Outcome</th>}
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium text-slate-700 dark:text-slate-200">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="w-8 h-8 border-3 border-[#7138F5] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <p className="text-xs">Loading follow-ups...</p>
                  </td>
                </tr>
              ) : followups.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <CheckCircle2 className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                    <p className="text-sm font-semibold">No follow-ups found in this category.</p>
                  </td>
                </tr>
              ) : (
                followups.map((fup) => (
                  <tr key={fup.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    {/* Student & Inquiry */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-bold text-slate-900 dark:text-white text-xs">
                        {fup.student_name}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="font-mono text-[10px] text-[#7138F5] dark:text-[#00D5FF] font-bold">
                          {fup.inq_code}
                        </span>
                        <StatusBadge status={fup.inquiry_status} size="sm" />
                      </div>
                    </td>

                    {/* Contact */}
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <a href={`tel:+91${fup.mobile}`} className="font-mono font-medium hover:text-[#7138F5]">
                        +91 {fup.mobile}
                      </a>
                    </td>

                    {/* Course */}
                    <td className="py-3.5 px-3 whitespace-nowrap font-medium text-slate-800 dark:text-slate-200">
                      {fup.course_name}
                    </td>

                    {/* Scheduled Date & Time */}
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 font-bold">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span className={category === 'overdue' ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-slate-200'}>
                          {fup.scheduled_date} at {fup.scheduled_time || '16:00'}
                        </span>
                      </div>
                      {category === 'overdue' && (
                        <span className="inline-block mt-0.5 px-1.5 py-0.5 bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-[10px] rounded font-bold">
                          Overdue
                        </span>
                      )}
                    </td>

                    {/* Assigned Staff */}
                    <td className="py-3.5 px-3 whitespace-nowrap text-slate-600 dark:text-slate-300">
                      {fup.assigned_to_name || 'Unassigned'}
                    </td>

                    {/* Remarks */}
                    <td className="py-3.5 px-3 max-w-xs truncate text-slate-500 dark:text-slate-400 text-xs italic">
                      "{fup.followup_remarks || 'No notes'}"
                    </td>

                    {/* Outcome if completed */}
                    {category === 'completed' && (
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <span className="px-2 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-lg font-semibold text-[11px]">
                          {fup.outcome || 'Completed'}
                        </span>
                      </td>
                    )}

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* If pending, show Complete and Reschedule */}
                        {fup.followup_status === 'Pending' && (
                          <>
                            <button
                              type="button"
                              onClick={() => setSelectedForComplete(fup)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
                            >
                              Complete Call
                            </button>
                            <button
                              type="button"
                              onClick={() => setSelectedForReschedule(fup)}
                              title="Reschedule"
                              className="p-1.5 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-lg transition-colors"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                          </>
                        )}

                        {/* WhatsApp */}
                        <button
                          type="button"
                          onClick={() =>
                            onOpenWhatsApp({
                              id: fup.inquiry_id,
                              inquiry_id: fup.inq_code,
                              student_name: fup.student_name,
                              mobile: fup.mobile,
                              course_name: fup.course_name
                            })
                          }
                          title="WhatsApp"
                          className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg transition-colors"
                        >
                          <MessageSquare className="w-4 h-4" />
                        </button>

                        {/* Call */}
                        <button
                          type="button"
                          onClick={() =>
                            onOpenCall({
                              id: fup.inquiry_id,
                              inquiry_id: fup.inq_code,
                              student_name: fup.student_name,
                              mobile: fup.mobile,
                              course_name: fup.course_name
                            })
                          }
                          title="Call"
                          className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors"
                        >
                          <PhoneCall className="w-4 h-4" />
                        </button>

                        {/* Profile View */}
                        <button
                          type="button"
                          onClick={() => onOpenDetails(fup.inquiry_id)}
                          title="View Profile"
                          className="p-1.5 text-slate-500 hover:text-[#7138F5] hover:bg-purple-50 dark:hover:bg-purple-950/40 rounded-lg transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Complete Follow-up Modal */}
      {selectedForComplete && (
        <CompleteFollowupModal
          isOpen={!!selectedForComplete}
          onClose={() => setSelectedForComplete(null)}
          followup={selectedForComplete}
          onCompleted={() => {
            fetchFollowups();
          }}
        />
      )}

      {/* Reschedule Modal */}
      {selectedForReschedule && (
        <RescheduleModal
          isOpen={!!selectedForReschedule}
          onClose={() => setSelectedForReschedule(null)}
          followup={selectedForReschedule}
          onRescheduled={() => {
            fetchFollowups();
          }}
        />
      )}
    </div>
  );
};
