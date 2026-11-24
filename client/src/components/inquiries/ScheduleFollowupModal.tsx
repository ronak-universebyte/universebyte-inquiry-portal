import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Calendar, Clock, CheckCircle2 } from 'lucide-react';
import api from '../../services/api';

interface ScheduleFollowupModalProps {
  isOpen: boolean;
  onClose: () => void;
  inquiry: {
    id: number;
    inquiry_id: string;
    student_name: string;
    course_name: string;
    assigned_to?: number;
  } | null;
  onScheduled: () => void;
}

export const ScheduleFollowupModal: React.FC<ScheduleFollowupModalProps> = ({
  isOpen,
  onClose,
  inquiry,
  onScheduled
}) => {
  const getTomorrowDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  };

  const [date, setDate] = useState(getTomorrowDate());
  const [time, setTime] = useState('16:00');
  const [remarks, setRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!inquiry) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date) return;

    setIsSubmitting(true);
    try {
      await api.post('/followups', {
        inquiry_id: inquiry.id,
        scheduled_date: date,
        scheduled_time: time,
        remarks: remarks.trim() || 'Follow-up scheduled'
      });
      onScheduled();
      onClose();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to schedule follow-up');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2 text-[#7138F5]">
          <Calendar className="w-5 h-5" />
          <span>Schedule Follow-up</span>
        </div>
      }
      subtitle={`Student: ${inquiry.student_name} (${inquiry.inquiry_id}) • ${inquiry.course_name}`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Follow-up Date <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full text-xs text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-[#7138F5]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Preferred Time
            </label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full text-xs text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-[#7138F5]"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
            Agenda / Remarks
          </label>
          <textarea
            rows={3}
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="e.g. Call to discuss course fee structure and weekend batch timing."
            className="w-full text-xs text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-[#7138F5]"
          />
        </div>

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
            disabled={isSubmitting || !date}
            className="flex items-center gap-1.5 px-5 py-2.5 bg-[#7138F5] hover:bg-[#5b2cd0] text-white font-bold text-xs rounded-xl shadow-md transition-all disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isSubmitting ? 'Scheduling...' : 'Confirm Schedule'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
