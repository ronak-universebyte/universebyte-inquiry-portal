import React, { useState } from 'react';
import {
  UserPlus,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  RotateCcw,
  Save,
  Phone,
  Mail,
  GraduationCap,
  MapPin,
  Calendar,
  Sparkles
} from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

interface AddInquiryViewProps {
  courses: string[];
  sources: string[];
  staffList: { id: number; name: string }[];
  onInquiryCreated: (inquiry: any) => void;
  onViewExistingInquiry: (id: number) => void;
}

export const AddInquiryView: React.FC<AddInquiryViewProps> = ({
  courses,
  sources,
  staffList,
  onInquiryCreated,
  onViewExistingInquiry
}) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const initialForm = {
    student_name: '',
    mobile: '',
    alt_mobile: '',
    email: '',
    qualification: '',
    college: '',
    current_status: 'Student',
    city: 'Ahmedabad',
    course_name: courses[0] || 'Artificial Intelligence',
    source_name: sources[0] || 'Website',
    preferred_contact_time: 'Any Time',
    assigned_to: isAdmin ? '' : String(user?.id || ''),
    status: 'New',
    priority: 'Medium',
    next_followup_date: '',
    remarks: ''
  };

  const [formData, setFormData] = useState(initialForm);
  const [duplicateWarning, setDuplicateWarning] = useState<any>(null);
  const [allowDuplicate, setAllowDuplicate] = useState(false);
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Check duplicate on blur of mobile field
  const handleMobileBlur = async () => {
    const rawMobile = formData.mobile.replace(/[\s\-\(\)\+]/g, '');
    if (rawMobile.length >= 10) {
      setIsCheckingDuplicate(true);
      try {
        const res = await api.get(`/inquiries/check-duplicate?mobile=${encodeURIComponent(formData.mobile)}`);
        if (res.data.isDuplicate) {
          setDuplicateWarning(res.data.existingInquiry);
        } else {
          setDuplicateWarning(null);
        }
      } catch (err) {
        console.error('Failed to check duplicate:', err);
      } finally {
        setIsCheckingDuplicate(false);
      }
    }
  };

  const validate = () => {
    setErrorMessage(null);
    if (!formData.student_name.trim()) {
      setErrorMessage('Student full name is required.');
      return false;
    }

    const cleanMobile = formData.mobile.replace(/[\s\-\(\)\+]/g, '');
    const sanitized = cleanMobile.startsWith('91') && cleanMobile.length === 12 ? cleanMobile.substring(2) : cleanMobile;

    if (!/^[6-9]\d{9}$/.test(sanitized)) {
      setErrorMessage('Please enter a valid 10-digit Indian mobile number (starting with 6, 7, 8, or 9).');
      return false;
    }

    if (!formData.course_name) {
      setErrorMessage('Please select an interested course.');
      return false;
    }

    if (!formData.source_name) {
      setErrorMessage('Please select a lead source.');
      return false;
    }

    if (duplicateWarning && !allowDuplicate) {
      setErrorMessage('Duplicate mobile number detected. Either review the existing lead or check "Proceed anyway".');
      return false;
    }

    return true;
  };

  const handleSubmit = async (andAddAnother: boolean = false) => {
    if (!validate()) return;

    setIsSubmitting(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const payload = {
        ...formData,
        assigned_to: formData.assigned_to ? parseInt(formData.assigned_to, 10) : undefined,
        allow_duplicate: allowDuplicate
      };

      const res = await api.post('/inquiries', payload);
      const createdInquiry = res.data.inquiry;

      setSuccessMessage(`Inquiry ${createdInquiry.inquiry_id} for ${createdInquiry.student_name} registered successfully!`);
      onInquiryCreated(createdInquiry);

      if (andAddAnother) {
        setFormData({
          ...initialForm,
          course_name: formData.course_name,
          source_name: formData.source_name
        });
        setDuplicateWarning(null);
        setAllowDuplicate(false);
      } else {
        // Keep view or reset after timeout
      }
    } catch (err: any) {
      if (err.response?.status === 409) {
        setDuplicateWarning(err.response.data.existingInquiry);
        setErrorMessage(err.response.data.error);
      } else {
        setErrorMessage(err.response?.data?.error || 'Failed to create inquiry. Please check your inputs.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Notifications */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 rounded-2xl flex items-center justify-between text-xs font-semibold shadow-sm">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMessage(null)}
            className="text-emerald-700 hover:text-emerald-900 dark:text-emerald-300 font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 rounded-2xl flex items-center gap-2.5 text-xs font-semibold shadow-sm">
          <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Duplicate Warning Alert */}
      {duplicateWarning && (
        <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 rounded-2xl shadow-sm space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-300">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>Duplicate Mobile Number Warning</span>
            </div>
            <button
              type="button"
              onClick={() => onViewExistingInquiry(duplicateWarning.id)}
              className="inline-flex items-center gap-1 text-[#7138F5] dark:text-[#00D5FF] font-bold hover:underline"
            >
              <span>View Existing Lead ({duplicateWarning.inquiry_id})</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-slate-600 dark:text-slate-300">
            An inquiry already exists for <strong>{duplicateWarning.student_name}</strong> ({duplicateWarning.mobile}) registered on {duplicateWarning.inquiry_date.split(' ')[0]} for <strong>{duplicateWarning.course_name}</strong> (Status: {duplicateWarning.status}).
          </p>
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="confirmDuplicate"
              checked={allowDuplicate}
              onChange={(e) => setAllowDuplicate(e.target.checked)}
              className="w-4 h-4 text-[#7138F5] rounded border-slate-300 focus:ring-[#7138F5]"
            />
            <label htmlFor="confirmDuplicate" className="font-semibold text-slate-800 dark:text-slate-200">
              Confirm this is a legitimate new inquiry and proceed with registration
            </label>
          </div>
        </div>
      )}

      {/* Form Container */}
      <div className="bg-white dark:bg-[#151A38] p-6 sm:p-8 rounded-3xl border border-slate-200/80 dark:border-[#23294C] shadow-card space-y-6">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-[#7138F5]" />
            <span>New Student Inquiry Registration</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Fill in student details. Unique Inquiry ID and timestamp will be generated automatically upon submission.
          </p>
        </div>

        {/* Section 1: Student Information */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
            <span className="w-5 h-5 rounded-full bg-[#7138F5]/10 text-[#7138F5] flex items-center justify-center font-bold text-xs">
              1
            </span>
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              Student Personal & Educational Details
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Student Full Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Student Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.student_name}
                onChange={(e) => setFormData({ ...formData, student_name: e.target.value })}
                placeholder="e.g. Aarav Mehta"
                className="w-full text-xs font-medium text-slate-800 dark:text-slate-100 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-[#7138F5]"
              />
            </div>

            {/* Mobile Number */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Mobile Number (10 Digits) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 font-semibold text-xs">
                  +91
                </span>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  value={formData.mobile}
                  onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                  onBlur={handleMobileBlur}
                  placeholder="98250 12345"
                  className="w-full text-xs font-medium text-slate-800 dark:text-slate-100 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#7138F5]"
                />
                {isCheckingDuplicate && (
                  <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-[10px] text-slate-400 font-medium">
                    Checking...
                  </span>
                )}
              </div>
            </div>

            {/* Alternate Mobile */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Alternate Mobile (Optional)
              </label>
              <input
                type="tel"
                maxLength={10}
                value={formData.alt_mobile}
                onChange={(e) => setFormData({ ...formData, alt_mobile: e.target.value })}
                placeholder="Guardian or alternate number"
                className="w-full text-xs font-medium text-slate-800 dark:text-slate-100 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-[#7138F5]"
              />
            </div>

            {/* Email Address */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Email Address (Optional)
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="student@example.com"
                className="w-full text-xs font-medium text-slate-800 dark:text-slate-100 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-[#7138F5]"
              />
            </div>

            {/* Qualification */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Educational Qualification
              </label>
              <input
                type="text"
                value={formData.qualification}
                onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
                placeholder="e.g. B.E. Computer / BCA / Diploma"
                className="w-full text-xs font-medium text-slate-800 dark:text-slate-100 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-[#7138F5]"
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
                placeholder="e.g. L.D. College / Gujarat University"
                className="w-full text-xs font-medium text-slate-800 dark:text-slate-100 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-[#7138F5]"
              />
            </div>

            {/* Current Status */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Current Background Status
              </label>
              <select
                value={formData.current_status}
                onChange={(e) => setFormData({ ...formData, current_status: e.target.value })}
                className="w-full text-xs font-medium text-slate-800 dark:text-slate-100 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-[#7138F5]"
              >
                <option value="Student">Student (Currently in College)</option>
                <option value="Fresher">Fresher (Looking for Job / Internship)</option>
                <option value="Working Professional">Working Professional (Upskilling / Career Switch)</option>
              </select>
            </div>

            {/* City */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                City / Location
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="Ahmedabad"
                className="w-full text-xs font-medium text-slate-800 dark:text-slate-100 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-[#7138F5]"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Inquiry Parameters */}
        <div className="space-y-4 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
            <span className="w-5 h-5 rounded-full bg-[#00D5FF]/20 text-[#00D5FF] flex items-center justify-center font-bold text-xs">
              2
            </span>
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              Course, Source & Assignment
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Interested Course */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Interested Course <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.course_name}
                onChange={(e) => setFormData({ ...formData, course_name: e.target.value })}
                className="w-full text-xs font-medium text-slate-800 dark:text-slate-100 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-[#7138F5]"
              >
                {courses.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Lead Source */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Inquiry Source <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.source_name}
                onChange={(e) => setFormData({ ...formData, source_name: e.target.value })}
                className="w-full text-xs font-medium text-slate-800 dark:text-slate-100 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-[#7138F5]"
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
                className="w-full text-xs font-medium text-slate-800 dark:text-slate-100 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-[#7138F5]"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High (Hot Lead)</option>
              </select>
            </div>

            {/* Initial Status */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Initial Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full text-xs font-medium text-slate-800 dark:text-slate-100 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-[#7138F5]"
              >
                <option value="New">New</option>
                <option value="Contacted">Contacted</option>
                <option value="Interested">Interested</option>
                <option value="Follow-up Required">Follow-up Required</option>
              </select>
            </div>

            {/* Assigned Staff (Admin only) */}
            {isAdmin ? (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Assign to Staff Member
                </label>
                <select
                  value={formData.assigned_to}
                  onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                  className="w-full text-xs font-medium text-slate-800 dark:text-slate-100 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-[#7138F5]"
                >
                  <option value="">Auto-Assign / Unassigned</option>
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
                  placeholder="e.g. Evening 5-8 PM"
                  className="w-full text-xs font-medium text-slate-800 dark:text-slate-100 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-[#7138F5]"
                />
              </div>
            )}

            {/* Next Follow-up Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Schedule First Follow-up (Optional)
              </label>
              <input
                type="date"
                value={formData.next_followup_date}
                onChange={(e) => setFormData({ ...formData, next_followup_date: e.target.value })}
                className="w-full text-xs font-medium text-slate-800 dark:text-slate-100 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-[#7138F5]"
              />
            </div>
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Initial Remarks / Counselor Notes
            </label>
            <textarea
              rows={3}
              value={formData.remarks}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              placeholder="e.g. Student called to ask about batch timings and practical projects. Requested demo session."
              className="w-full text-xs text-slate-800 dark:text-slate-100 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-[#7138F5]"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={() => {
              setFormData(initialForm);
              setDuplicateWarning(null);
              setErrorMessage(null);
            }}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Form</span>
          </button>

          <div className="w-full sm:w-auto flex items-center gap-2">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSubmit(true)}
              className="w-full sm:w-auto px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl transition-all disabled:opacity-50"
            >
              Save & Add Another
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSubmit(false)}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-[#7138F5] hover:bg-[#5b2cd0] text-white text-xs font-bold rounded-xl shadow-brand transition-all transform active:scale-95 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? 'Registering...' : 'Save Inquiry'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
