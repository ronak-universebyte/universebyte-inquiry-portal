import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { CheckCircle2, Calendar } from 'lucide-react';
import api from '../../services/api';

interface CompleteFollowupModalProps {
  isOpen: boolean;
  onClose: () => void;
  followup: {
    id: number;
    inquiry_id: number;
    inq_code: string;
    student_name: string;
    mobile: string;
    course_name: string;
    inquiry_status: string;
    scheduled_date: string;
  } | null;
  onCompleted: () => void;
}

const COMMON_OUTCOMES = [
  'Positive Discussion - Reviewing Syllabus',
  'Demo Lecture Scheduled',
  'Enrolled & Converted',
  'Call Not Answered / Busy',
  'Callback Requested',
  'Fees Discussed - Follow-up Needed',
  'Not Interested - Opted for Other',
  'Other'
];

export const CompleteFollowupModal: React.FC<CompleteFollowupModalProps> = ({
  isOpen,
  onClose,
  followup,
  onCompleted
}) => {
  const [outcome, setOutcome] = useState(COMMON_OUTCOMES[0]);
  const [remarks, setRemarks] = useState('');
  const [updateStatus, setUpdateStatus] = useState('');
  const [scheduleNext, setScheduleNext] = useState(false);
  const [nextDate, setNextDate] = useState('');
  const [nextTime, setNextTime] = useState('16:00');
  const [nextRemarks, setNextRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    if (followup) {
      setOutcome(COMMON_OUTCOMES[0]);
      setRemarks('');
      setUpdateStatus(followup.inquiry_status);
      setScheduleNext(false);
      const nextD = new Date();
      nextD.setDate(nextD.getDate() + 2);
      setNextDate(nextD.toISOString().slice(0, 10));
      setNextRemarks('');
    }
  }, [followup]);

  if (!followup) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!remarks.trim()) {
      alert('Please enter follow-up remarks detailing the conversation.');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.patch(`/followups/${followup.id}/complete`, {
        remarks: remarks.trim(),
        outcome,
        new_status: updateStatus || undefined,
        next_followup_date: scheduleNext ? nextDate : undefined,
        next_followup_time: scheduleNext ? nextTime : undefined,
        next_followup_remarks: scheduleNext ? nextRemarks : undefined
      });
      onCompleted();
      onClose();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to complete follow-up');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="w-5 h-5" />
          <span>Complete Follow-up Call</span>
        </div>
      }
      subtitle={`Student: ${followup.student_name} (${followup.inq_code}) • Scheduled: ${followup.scheduled_date}`}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Outcome Selector */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
            Follow-up Outcome <span className="text-rose-500">*</span>
          </label>
          <select
            value={outcome}
            onChange={(e) => setOutcome(e.target.value)}
            className="w-full text-xs font-medium text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {COMMON_OUTCOMES.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </div>

        {/* Remarks */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
            Call Discussion & Remarks <span className="text-rose-500">*</span>
          </label>
          <textarea
            required
            rows={3}
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Detailed discussion summary with the student..."
            className="w-full text-xs text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Update Inquiry Status */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
            Update Student Status
          </label>
          <select
            value={updateStatus}
            onChange={(e) => setUpdateStatus(e.target.value)}
            className="w-full text-xs font-medium text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-[#7138F5]"
          >
            {['New', 'Contacted', 'Interested', 'Follow-up Required', 'Demo Scheduled', 'Converted', 'Not Interested', 'Invalid Number'].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {/* Schedule Next Follow-up Section */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 mb-3">
            <input
              type="checkbox"
              id="scheduleNextFup"
              checked={scheduleNext}
              onChange={(e) => setScheduleNext(e.target.checked)}
              className="w-4 h-4 text-[#7138F5] rounded border-slate-300 focus:ring-[#7138F5]"
            />
            <label htmlFor="scheduleNextFup" className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-[#7138F5]" />
              <span>Schedule Next Follow-up for this Student</span>
            </label>
          </div>

          {scheduleNext && (
            <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    required={scheduleNext}
                    value={nextDate}
                    onChange={(e) => setNextDate(e.target.value)}
                    className="w-full text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">
                    Time
                  </label>
                  <input
                    type="time"
                    value={nextTime}
                    onChange={(e) => setNextTime(e.target.value)}
                    className="w-full text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">
                  Next Agenda Notes
                </label>
                <input
                  type="text"
                  value={nextRemarks}
                  onChange={(e) => setNextRemarks(e.target.value)}
                  placeholder="e.g. Check for batch confirmation"
                  className="w-full text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2"
                />
              </div>
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !remarks.trim()}
            className="flex items-center gap-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isSubmitting ? 'Saving...' : 'Complete Follow-up'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
