import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { PhoneCall, CheckCircle2 } from 'lucide-react';
import api from '../../services/api';

interface CallModalProps {
  isOpen: boolean;
  onClose: () => void;
  inquiry: {
    id: number;
    inquiry_id: string;
    student_name: string;
    mobile: string;
    course_name: string;
  } | null;
  onLogged?: () => void;
}

export const CallModal: React.FC<CallModalProps> = ({
  isOpen,
  onClose,
  inquiry,
  onLogged
}) => {
  const [remarks, setRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!inquiry) return null;

  const dialerNumber = inquiry.mobile.startsWith('+') ? inquiry.mobile : `+91${inquiry.mobile}`;

  const handleStartCall = () => {
    window.location.href = `tel:${dialerNumber}`;
  };

  const handleLogCallRemark = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!remarks.trim()) return;

    setIsSubmitting(true);
    try {
      await api.post(`/inquiries/${inquiry.id}/remarks`, {
        remarks: `Phone Call: ${remarks.trim()}`,
        activity_type: 'CALL_INITIATED'
      });
      if (onLogged) onLogged();
      setRemarks('');
      onClose();
    } catch (err) {
      console.error('Failed to log call remark:', err);
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
          <PhoneCall className="w-5 h-5" />
          <span>Call Student</span>
        </div>
      }
      subtitle={`Student: ${inquiry.student_name} • ${inquiry.course_name}`}
      maxWidth="md"
    >
      <div className="space-y-5">
        {/* Call card */}
        <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
          <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Direct Dial Number</p>
          <p className="text-xl font-bold text-slate-900 dark:text-white mt-1 tracking-wide">{dialerNumber}</p>
          
          <button
            type="button"
            onClick={handleStartCall}
            className="mt-3 inline-flex items-center gap-2 px-5 py-2.5 bg-[#7138F5] hover:bg-[#5b2cd0] text-white font-bold text-xs rounded-xl shadow-md transition-all transform active:scale-95"
          >
            <PhoneCall className="w-4 h-4" />
            <span>Launch Phone Dialer</span>
          </button>
        </div>

        {/* Call remarks form */}
        <form onSubmit={handleLogCallRemark} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Call Discussion Remarks
            </label>
            <textarea
              rows={3}
              required
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Student answered, discussed course syllabus and timings. Scheduled follow-up."
              className="w-full text-xs text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-[#7138F5]"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
            >
              Skip Note
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !remarks.trim()}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#10152F] dark:bg-slate-700 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow transition-all disabled:opacity-50"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Saving...' : 'Save Call Note'}</span>
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};
