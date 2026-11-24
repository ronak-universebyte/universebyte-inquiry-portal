import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { RefreshCw, CheckCircle2 } from 'lucide-react';
import api from '../../services/api';

interface StatusChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  inquiry: {
    id: number;
    inquiry_id: string;
    student_name: string;
    status: string;
  } | null;
  onUpdated: () => void;
}

const ALL_STATUSES = [
  'New',
  'Contacted',
  'Interested',
  'Follow-up Required',
  'Demo Scheduled',
  'Converted',
  'Not Interested',
  'Invalid Number'
];

export const StatusChangeModal: React.FC<StatusChangeModalProps> = ({
  isOpen,
  onClose,
  inquiry,
  onUpdated
}) => {
  const [newStatus, setNewStatus] = useState<string>(inquiry?.status || 'Contacted');
  const [remarks, setRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    if (inquiry) {
      setNewStatus(inquiry.status);
      setRemarks('');
    }
  }, [inquiry]);

  if (!inquiry) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStatus) return;

    setIsSubmitting(true);
    try {
      await api.patch(`/inquiries/${inquiry.id}/status`, {
        status: newStatus,
        remarks: remarks.trim() || undefined
      });
      onUpdated();
      onClose();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update status');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
          <RefreshCw className="w-5 h-5" />
          <span>Update Inquiry Status</span>
        </div>
      }
      subtitle={`Inquiry ${inquiry.inquiry_id} • ${inquiry.student_name}`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
            Current Status
          </label>
          <div className="text-sm font-semibold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-xl">
            {inquiry.status}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
            Select New Status <span className="text-rose-500">*</span>
          </label>
          <select
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value)}
            className="w-full text-sm font-medium text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-[#7138F5]"
          >
            {ALL_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
            Status Change Remarks (Optional)
          </label>
          <textarea
            rows={3}
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Add reason for status update..."
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
            disabled={isSubmitting || newStatus === inquiry.status}
            className="flex items-center gap-1.5 px-5 py-2.5 bg-[#7138F5] hover:bg-[#5b2cd0] text-white font-bold text-xs rounded-xl shadow-md transition-all disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isSubmitting ? 'Updating...' : 'Update Status'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
