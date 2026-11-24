import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Clock, CheckCircle2 } from 'lucide-react';
import api from '../../services/api';

interface RescheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  followup: {
    id: number;
    inq_code: string;
    student_name: string;
    scheduled_date: string;
    scheduled_time: string;
  } | null;
  onRescheduled: () => void;
}

export const RescheduleModal: React.FC<RescheduleModalProps> = ({
  isOpen,
  onClose,
  followup,
  onRescheduled
}) => {
  const [date, setDate] = useState(followup?.scheduled_date || '');
  const [time, setTime] = useState(followup?.scheduled_time || '16:00');
  const [remarks, setRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    if (followup) {
      setDate(followup.scheduled_date);
      setTime(followup.scheduled_time || '16:00');
      setRemarks('');
    }
  }, [followup]);

  if (!followup) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date) return;

    setIsSubmitting(true);
    try {
      await api.patch(`/followups/${followup.id}/reschedule`, {
        scheduled_date: date,
        scheduled_time: time,
        remarks: remarks.trim() || undefined
      });
      onRescheduled();
      onClose();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to reschedule follow-up');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
          <Clock className="w-5 h-5" />
          <span>Reschedule Follow-up</span>
        </div>
      }
      subtitle={`Student: ${followup.student_name} (${followup.inq_code})`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              New Date <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full text-xs text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-[#7138F5]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              New Time
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
            Reason for Rescheduling
          </label>
          <textarea
            rows={3}
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="e.g. Student requested to connect post office hours..."
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
            className="flex items-center gap-1.5 px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-md transition-all disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isSubmitting ? 'Rescheduling...' : 'Confirm Reschedule'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
