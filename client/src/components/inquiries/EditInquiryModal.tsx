import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Edit3, CheckCircle2 } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

interface EditInquiryModalProps {
  isOpen: boolean;
  onClose: () => void;
  inquiry: any;
  courses: string[];
  sources: string[];
  staffList: { id: number; name: string }[];
  onUpdated: () => void;
}

export const EditInquiryModal: React.FC<EditInquiryModalProps> = ({
  isOpen,
  onClose,
  inquiry,
  courses,
  sources,
  staffList,
  onUpdated
}) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [formData, setFormData] = useState({
    student_name: '',
    mobile: '',
    alt_mobile: '',
    email: '',
    qualification: '',
    college: '',
    current_status: 'Student',
    city: 'Ahmedabad',
    course_name: '',
    source_name: '',
    preferred_contact_time: 'Any Time',
    assigned_to: '',
    priority: 'Medium',
    remarks: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (inquiry) {
      setFormData({
        student_name: inquiry.student_name || '',
        mobile: inquiry.mobile || '',
        alt_mobile: inquiry.alt_mobile || '',
        email: inquiry.email || '',
        qualification: inquiry.qualification || '',
        college: inquiry.college || '',
        current_status: inquiry.current_status || 'Student',
        city: inquiry.city || 'Ahmedabad',
        course_name: inquiry.course_name || '',
        source_name: inquiry.source_name || '',
        preferred_contact_time: inquiry.preferred_contact_time || 'Any Time',
        assigned_to: inquiry.assigned_to ? String(inquiry.assigned_to) : '',
        priority: inquiry.priority || 'Medium',
        remarks: inquiry.remarks || ''
      });
      setError(null);
    }
  }, [inquiry]);

  if (!inquiry) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.student_name.trim()) {
      setError('Student full name is required.');
      return;
    }

    if (!formData.mobile.trim()) {
      setError('Mobile number is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.put(`/inquiries/${inquiry.id}`, {
        ...formData,
        assigned_to: formData.assigned_to ? parseInt(formData.assigned_to, 10) : null
      });
      onUpdated();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update inquiry.');
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
          <Edit3 className="w-5 h-5" />
          <span>Edit Inquiry – {inquiry.inquiry_id}</span>
        </div>
      }
      subtitle={`Last updated: ${inquiry.updated_at || inquiry.inquiry_date}`}
      maxWidth="3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs rounded-xl">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Student Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Student Full Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.student_name}
              onChange={(e) => setFormData({ ...formData, student_name: e.target.value })}
              className="w-full text-xs font-medium text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-[#7138F5]"
            />
          </div>

          {/* Primary Mobile */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Mobile Number (10 digits) <span className="text-rose-500">*</span>
            </label>
            <input
              type="tel"
              required
              value={formData.mobile}
              onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
              className="w-full text-xs font-medium text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-[#7138F5]"
            />
          </div>

          {/* Alternate Mobile */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Alternate Mobile Number
            </label>
            <input
              type="tel"
              value={formData.alt_mobile}
              onChange={(e) => setFormData({ ...formData, alt_mobile: e.target.value })}
              className="w-full text-xs font-medium text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-[#7138F5]"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Email Address
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full text-xs font-medium text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-[#7138F5]"
            />
          </div>

          {/* Qualification */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Qualification
            </label>
            <input
              type="text"
              value={formData.qualification}
              onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
              placeholder="e.g. B.Tech / BCA / MCA"
              className="w-full text-xs font-medium text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-[#7138F5]"
            />
          </div>

          {/* College */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              College / University
            </label>
            <input
              type="text"
              value={formData.college}
              onChange={(e) => setFormData({ ...formData, college: e.target.value })}
              placeholder="e.g. Gujarat University"
              className="w-full text-xs font-medium text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-[#7138F5]"
            />
          </div>

          {/* Current Status */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Current Status
            </label>
            <select
              value={formData.current_status}
              onChange={(e) => setFormData({ ...formData, current_status: e.target.value })}
              className="w-full text-xs font-medium text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-[#7138F5]"
            >
              <option value="Student">Student</option>
              <option value="Fresher">Fresher</option>
              <option value="Working Professional">Working Professional</option>
            </select>
          </div>

          {/* City */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              City
            </label>
            <input
              type="text"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              className="w-full text-xs font-medium text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-[#7138F5]"
            />
          </div>

          {/* Course */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Interested Course <span className="text-rose-500">*</span>
            </label>
            <select
              value={formData.course_name}
              onChange={(e) => setFormData({ ...formData, course_name: e.target.value })}
              className="w-full text-xs font-medium text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-[#7138F5]"
            >
              {courses.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Source */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Inquiry Source <span className="text-rose-500">*</span>
            </label>
            <select
              value={formData.source_name}
              onChange={(e) => setFormData({ ...formData, source_name: e.target.value })}
              className="w-full text-xs font-medium text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-[#7138F5]"
            >
              {sources.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Priority
            </label>
            <select
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              className="w-full text-xs font-medium text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-[#7138F5]"
            >
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
          </div>

          {/* Assigned Staff (Admin only) */}
          {isAdmin ? (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Assigned Staff Member
              </label>
              <select
                value={formData.assigned_to}
                onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                className="w-full text-xs font-medium text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-[#7138F5]"
              >
                <option value="">Unassigned</option>
                {staffList.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Preferred Contact Time
              </label>
              <input
                type="text"
                value={formData.preferred_contact_time}
                onChange={(e) => setFormData({ ...formData, preferred_contact_time: e.target.value })}
                className="w-full text-xs font-medium text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5"
              />
            </div>
          )}
        </div>

        {/* Remarks */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
            General Remarks / Notes
          </label>
          <textarea
            rows={2}
            value={formData.remarks}
            onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
            className="w-full text-xs text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-[#7138F5]"
          />
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
            disabled={isSubmitting}
            className="flex items-center gap-1.5 px-5 py-2.5 bg-[#7138F5] hover:bg-[#5b2cd0] text-white font-bold text-xs rounded-xl shadow-md transition-all disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isSubmitting ? 'Saving Changes...' : 'Save Changes'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
