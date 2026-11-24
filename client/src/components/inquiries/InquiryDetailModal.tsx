import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { StatusBadge, PriorityBadge } from '../common/Badge';
import {
  PhoneCall,
  MessageSquare,
  Edit3,
  RefreshCw,
  Calendar,
  Clock,
  User,
  GraduationCap,
  MapPin,
  Mail,
  Building,
  CheckCircle2,
  AlertCircle,
  FileText,
  Activity,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { WhatsAppModal } from './WhatsAppModal';
import { CallModal } from './CallModal';
import { StatusChangeModal } from './StatusChangeModal';
import { ScheduleFollowupModal } from './ScheduleFollowupModal';
import { EditInquiryModal } from './EditInquiryModal';

interface InquiryDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  inquiryId: number | null;
  courses: string[];
  sources: string[];
  staffList: { id: number; name: string }[];
  onDataChanged: () => void;
}

export const InquiryDetailModal: React.FC<InquiryDetailModalProps> = ({
  isOpen,
  onClose,
  inquiryId,
  courses,
  sources,
  staffList,
  onDataChanged
}) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [inquiry, setInquiry] = useState<any>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [followups, setFollowups] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Sub-modals
  const [showWhatsApp, setShowWhatsApp] = useState(false);
  const [showCall, setShowCall] = useState(false);
  const [showStatus, setShowStatus] = useState(false);
  const [showFollowup, setShowFollowup] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!inquiry || !isAdmin) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await api.delete(`/inquiries/${inquiry.id}`);
      setShowDeleteConfirm(false);
      onClose();
      onDataChanged();
    } catch (err: any) {
      console.error('Failed to delete inquiry:', err);
      setDeleteError(err.response?.data?.error || 'Failed to delete inquiry.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Add remark inline state
  const [newRemark, setNewRemark] = useState('');
  const [isSubmittingRemark, setIsSubmittingRemark] = useState(false);

  const fetchInquiryDetails = async () => {
    if (!inquiryId) return;
    setIsLoading(true);
    try {
      const res = await api.get(`/inquiries/${inquiryId}`);
      setInquiry(res.data.inquiry);
      setActivities(res.data.activities || []);
      setFollowups(res.data.followups || []);
    } catch (err: any) {
      console.error('Failed to load inquiry details:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && inquiryId) {
      fetchInquiryDetails();
    } else {
      setInquiry(null);
    }
  }, [isOpen, inquiryId]);

  const handleAddRemark = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRemark.trim() || !inquiry) return;

    setIsSubmittingRemark(true);
    try {
      await api.post(`/inquiries/${inquiry.id}/remarks`, {
        remarks: newRemark.trim(),
        activity_type: 'REMARK_ADDED'
      });
      setNewRemark('');
      fetchInquiryDetails();
      onDataChanged();
    } catch (err) {
      console.error('Failed to save remark:', err);
    } finally {
      setIsSubmittingRemark(false);
    }
  };

  if (!isOpen || !inquiryId) return null;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        maxWidth="4xl"
        title={
          inquiry ? (
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm px-2.5 py-1 bg-[#10152F] text-[#00D5FF] rounded-lg">
                {inquiry.inquiry_id}
              </span>
              <span className="text-slate-900 dark:text-white font-bold">{inquiry.student_name}</span>
            </div>
          ) : (
            'Inquiry Details'
          )
        }
        subtitle={
          inquiry ? `${inquiry.course_name} • Received on ${inquiry.inquiry_date}` : ''
        }
      >
        {isLoading || !inquiry ? (
          <div className="py-16 text-center text-slate-400">
            <div className="w-8 h-8 border-4 border-[#7138F5] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs font-semibold">Loading inquiry details...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Quick Actions Bar */}
            <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowCall(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#10152F] hover:bg-[#1f2858] text-white text-xs font-bold rounded-xl shadow-sm transition-all"
                >
                  <PhoneCall className="w-3.5 h-3.5 text-[#00D5FF]" />
                  <span>Call Student</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowWhatsApp(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowFollowup(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl transition-all"
                >
                  <Calendar className="w-3.5 h-3.5 text-[#7138F5]" />
                  <span>Schedule Follow-up</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowStatus(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl transition-all"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Change Status</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowEdit(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#7138F5] hover:bg-purple-50 dark:hover:bg-purple-950/40 rounded-xl transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Info</span>
                </button>

                {/* Delete Inquiry (Admin Only) */}
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      setDeleteError(null);
                      setShowDeleteConfirm(true);
                    }}
                    title="Delete Inquiry (Admin Only)"
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                )}
              </div>
            </div>

            {/* Profile & Information Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Left Column: Student Contact & Education */}
              <div className="md:col-span-2 space-y-4">
                <div className="bg-white dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/60">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <User className="w-4 h-4 text-[#7138F5]" />
                    <span>Student Profile & Contact</span>
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <p className="text-slate-400 font-medium">Primary Mobile</p>
                      <a
                        href={`tel:+91${inquiry.mobile}`}
                        className="font-bold text-slate-900 dark:text-white hover:text-[#7138F5] mt-0.5 block"
                      >
                        +91 {inquiry.mobile}
                      </a>
                    </div>
                    <div>
                      <p className="text-slate-400 font-medium">Alternate Mobile</p>
                      <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                        {inquiry.alt_mobile ? `+91 ${inquiry.alt_mobile}` : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-medium">Email Address</p>
                      <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 truncate">
                        {inquiry.email || '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-medium">City / Location</p>
                      <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-rose-500" />
                        <span>{inquiry.city || 'Ahmedabad'}</span>
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-medium">Qualification</p>
                      <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 flex items-center gap-1">
                        <GraduationCap className="w-3.5 h-3.5 text-[#7138F5]" />
                        <span>{inquiry.qualification || '—'}</span>
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-medium">College / University</p>
                      <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 truncate">
                        {inquiry.college || '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-medium">Current Status</p>
                      <span className="inline-block mt-0.5 px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded font-medium">
                        {inquiry.current_status || 'Student'}
                      </span>
                    </div>
                    <div>
                      <p className="text-slate-400 font-medium">Preferred Contact Time</p>
                      <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                        {inquiry.preferred_contact_time || 'Any Time'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Inquiry details */}
                <div className="bg-white dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/60">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-[#00D5FF]" />
                    <span>Inquiry Parameters</span>
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <p className="text-slate-400 font-medium">Interested Course</p>
                      <p className="font-bold text-slate-900 dark:text-white mt-0.5 text-sm">
                        {inquiry.course_name}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-medium">Lead Source</p>
                      <span className="inline-block mt-0.5 px-2.5 py-1 bg-purple-50 dark:bg-purple-950/40 text-[#7138F5] border border-purple-200 dark:border-purple-800 rounded-lg font-semibold">
                        {inquiry.source_name}
                      </span>
                    </div>
                    <div>
                      <p className="text-slate-400 font-medium">Assigned Staff</p>
                      <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                        {inquiry.assigned_to_name || 'Unassigned'}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-medium">Next Follow-up</p>
                      <p className="font-semibold text-amber-600 dark:text-amber-400 mt-0.5">
                        {inquiry.next_followup_date || 'None scheduled'}
                      </p>
                    </div>
                  </div>

                  {inquiry.remarks && (
                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/60">
                      <p className="text-slate-400 font-medium text-xs mb-1">Remarks & Notes</p>
                      <p className="text-xs text-slate-700 dark:text-slate-300 italic bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                        "{inquiry.remarks}"
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Status & Followup Cards */}
              <div className="space-y-4">
                <div className="bg-white dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/60 text-center">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Current Status</p>
                  <div className="mb-3">
                    <StatusBadge status={inquiry.status} size="md" />
                  </div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Priority</p>
                  <div>
                    <PriorityBadge priority={inquiry.priority} size="md" />
                  </div>
                </div>

                {/* Add Quick Remark Form */}
                <div className="bg-white dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/60">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                    Add Staff Remark
                  </h4>
                  <form onSubmit={handleAddRemark} className="space-y-2">
                    <textarea
                      rows={2}
                      required
                      value={newRemark}
                      onChange={(e) => setNewRemark(e.target.value)}
                      placeholder="Add an update note..."
                      className="w-full text-xs text-slate-800 dark:text-slate-100 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-[#7138F5]"
                    />
                    <button
                      type="submit"
                      disabled={isSubmittingRemark || !newRemark.trim()}
                      className="w-full py-2 bg-[#7138F5] hover:bg-[#5b2cd0] text-white text-xs font-bold rounded-xl shadow-sm transition-all disabled:opacity-50"
                    >
                      {isSubmittingRemark ? 'Posting...' : 'Log Remark'}
                    </button>
                  </form>
                </div>
              </div>
            </div>

            {/* Permanent Chronological Activity Timeline */}
            <div className="bg-white dark:bg-slate-800/60 p-5 rounded-2xl border border-slate-200 dark:border-slate-700/60">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#7138F5]" />
                <span>Permanent Activity History & Audit Trail ({activities.length} entries)</span>
              </h4>

              {activities.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">No logged activities recorded yet.</p>
              ) : (
                <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-700">
                  {activities.map((act) => (
                    <div key={act.id} className="relative flex items-start justify-between gap-3 text-xs">
                      {/* Timeline Dot */}
                      <span className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-[#7138F5] ring-4 ring-white dark:ring-slate-800" />
                      <div>
                        <p className="font-semibold text-slate-800 dark:text-slate-200">
                          {act.description}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Logged by <span className="font-medium text-slate-600 dark:text-slate-300">{act.user_name}</span>
                        </p>
                      </div>
                      <time className="text-[11px] text-slate-400 font-mono shrink-0">
                        {act.created_at}
                      </time>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Nested Action Modals */}
      {inquiry && (
        <>
          <WhatsAppModal
            isOpen={showWhatsApp}
            onClose={() => setShowWhatsApp(false)}
            inquiry={inquiry}
            onLogged={() => {
              fetchInquiryDetails();
              onDataChanged();
            }}
          />

          <CallModal
            isOpen={showCall}
            onClose={() => setShowCall(false)}
            inquiry={inquiry}
            onLogged={() => {
              fetchInquiryDetails();
              onDataChanged();
            }}
          />

          <StatusChangeModal
            isOpen={showStatus}
            onClose={() => setShowStatus(false)}
            inquiry={inquiry}
            onUpdated={() => {
              fetchInquiryDetails();
              onDataChanged();
            }}
          />

          <ScheduleFollowupModal
            isOpen={showFollowup}
            onClose={() => setShowFollowup(false)}
            inquiry={inquiry}
            onScheduled={() => {
              fetchInquiryDetails();
              onDataChanged();
            }}
          />

          <EditInquiryModal
            isOpen={showEdit}
            onClose={() => setShowEdit(false)}
            inquiry={inquiry}
            courses={courses}
            sources={sources}
            staffList={staffList}
            onUpdated={() => {
              fetchInquiryDetails();
              onDataChanged();
            }}
          />

          {/* Delete Confirmation Modal (Admin Only) */}
          {isAdmin && showDeleteConfirm && inquiry && (
            <Modal
              isOpen={showDeleteConfirm}
              onClose={() => {
                if (!isDeleting) setShowDeleteConfirm(false);
              }}
              title="Delete Inquiry"
              subtitle="Admin action required"
            >
              <div className="space-y-4">
                <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-2xl flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  <div className="text-xs text-red-800 dark:text-red-200">
                    <p className="font-bold text-sm mb-1 text-red-900 dark:text-red-100">
                      Delete inquiry permanently?
                    </p>
                    <p>
                      You are about to permanently delete inquiry{' '}
                      <strong className="font-mono text-red-950 dark:text-red-50">{inquiry.inquiry_id}</strong> for student{' '}
                      <strong className="font-semibold">{inquiry.student_name}</strong>.
                    </p>
                    <p className="mt-2 text-red-700 dark:text-red-300">
                      All associated student data, follow-up records, and history entries will be removed from MongoDB.
                    </p>
                  </div>
                </div>

                {deleteError && (
                  <p className="text-xs text-red-600 font-semibold">{deleteError}</p>
                )}

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={handleDelete}
                    className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-md transition-all disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{isDeleting ? 'Deleting...' : 'Confirm Delete'}</span>
                  </button>
                </div>
              </div>
            </Modal>
          )}
        </>
      )}
    </>
  );
};
