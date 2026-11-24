import React, { useState, useEffect } from 'react';
import {
  Settings,
  Building,
  BookOpen,
  Share2,
  Users,
  ShieldCheck,
  Plus,
  Edit2,
  Check,
  X,
  KeyRound,
  Lock,
  Save,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../common/Modal';

interface SettingsViewProps {
  onRefreshGlobalData: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onRefreshGlobalData }) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [activeTab, setActiveTab] = useState<'general' | 'courses' | 'sources' | 'staff' | 'statuses' | 'password'>('general');

  // General Settings State
  const [generalSettings, setGeneralSettings] = useState({
    company_name: 'UniverseByte',
    company_tagline: 'Technology Redefined.',
    company_location: 'Ahmedabad, Gujarat, India',
    company_website: 'https://www.universebyte.in',
    company_whatsapp: '+91 78598 20822',
    company_phone: '+91 78598 20822',
    company_email: 'info@universebyte.in',
    allow_duplicate_mobile: 'warn'
  });

  // Courses & Sources
  const [courses, setCourses] = useState<any[]>([]);
  const [sources, setSources] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [statuses, setStatuses] = useState<any[]>([]);

  // Add / Edit Course Modal
  const [courseModal, setCourseModal] = useState<{ isOpen: boolean; course: any | null }>({ isOpen: false, course: null });
  const [courseNameInput, setCourseNameInput] = useState('');
  const [courseDescInput, setCourseDescInput] = useState('');

  // Add / Edit Source Modal
  const [sourceModal, setSourceModal] = useState<{ isOpen: boolean; source: any | null }>({ isOpen: false, source: null });
  const [sourceNameInput, setSourceNameInput] = useState('');

  // Add / Edit Staff Modal
  const [staffModal, setStaffModal] = useState<{ isOpen: boolean; staff: any | null }>({ isOpen: false, staff: null });
  const [staffForm, setStaffForm] = useState({ name: '', email: '', password: '', role: 'staff', phone: '' });

  // Reset Password Modal (Admin)
  const [resetPassModal, setResetPassModal] = useState<{ isOpen: boolean; staffId: number | null; staffName: string }>({
    isOpen: false,
    staffId: null,
    staffName: ''
  });
  const [newStaffPassword, setNewStaffPassword] = useState('');

  // Change Own Password
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Status & feedback
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchAllSettings = async () => {
    try {
      const [genRes, cRes, sRes, stRes] = await Promise.all([
        api.get('/settings'),
        api.get('/settings/courses?includeInactive=true'),
        api.get('/settings/sources?includeInactive=true'),
        api.get('/settings/statuses')
      ]);

      setGeneralSettings((prev) => ({ ...prev, ...genRes.data.settings }));
      setCourses(cRes.data.courses || []);
      setSources(sRes.data.sources || []);
      setStatuses(stRes.data.statuses || []);

      if (isAdmin) {
        const uRes = await api.get('/users');
        setUsersList(uRes.data.users || []);
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  };

  useEffect(() => {
    fetchAllSettings();
  }, []);

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  // 1. Save General Settings
  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;

    setIsLoading(true);
    try {
      await api.put('/settings', generalSettings);
      showFeedback('success', 'General company settings updated successfully.');
      onRefreshGlobalData();
    } catch (err: any) {
      showFeedback('error', err.response?.data?.error || 'Failed to update settings.');
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Course Handlers
  const handleSaveCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseNameInput.trim()) return;

    try {
      if (courseModal.course) {
        await api.put(`/settings/courses/${courseModal.course.id}`, {
          name: courseNameInput.trim(),
          description: courseDescInput.trim()
        });
        showFeedback('success', 'Course updated successfully.');
      } else {
        await api.post('/settings/courses', {
          name: courseNameInput.trim(),
          description: courseDescInput.trim()
        });
        showFeedback('success', 'New course added successfully.');
      }
      setCourseModal({ isOpen: false, course: null });
      fetchAllSettings();
      onRefreshGlobalData();
    } catch (err: any) {
      showFeedback('error', err.response?.data?.error || 'Failed to save course.');
    }
  };

  const handleToggleCourseActive = async (course: any) => {
    try {
      await api.put(`/settings/courses/${course.id}`, {
        is_active: course.is_active ? 0 : 1
      });
      fetchAllSettings();
      onRefreshGlobalData();
    } catch (err: any) {
      showFeedback('error', err.response?.data?.error || 'Failed to toggle course.');
    }
  };

  // 3. Source Handlers
  const handleSaveSource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceNameInput.trim()) return;

    try {
      if (sourceModal.source) {
        await api.put(`/settings/sources/${sourceModal.source.id}`, {
          name: sourceNameInput.trim()
        });
        showFeedback('success', 'Lead source updated successfully.');
      } else {
        await api.post('/settings/sources', {
          name: sourceNameInput.trim()
        });
        showFeedback('success', 'New lead source added successfully.');
      }
      setSourceModal({ isOpen: false, source: null });
      fetchAllSettings();
      onRefreshGlobalData();
    } catch (err: any) {
      showFeedback('error', err.response?.data?.error || 'Failed to save source.');
    }
  };

  const handleToggleSourceActive = async (source: any) => {
    try {
      await api.put(`/settings/sources/${source.id}`, {
        is_active: source.is_active ? 0 : 1
      });
      fetchAllSettings();
      onRefreshGlobalData();
    } catch (err: any) {
      showFeedback('error', err.response?.data?.error || 'Failed to toggle source.');
    }
  };

  // 4. Staff Handlers
  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (staffModal.staff) {
        await api.put(`/users/${staffModal.staff.id}`, {
          name: staffForm.name.trim(),
          email: staffForm.email.trim(),
          role: staffForm.role,
          phone: staffForm.phone.trim()
        });
        showFeedback('success', 'Staff account updated.');
      } else {
        await api.post('/users', staffForm);
        showFeedback('success', 'New staff account created.');
      }
      setStaffModal({ isOpen: false, staff: null });
      fetchAllSettings();
    } catch (err: any) {
      showFeedback('error', err.response?.data?.error || 'Failed to save staff member.');
    }
  };

  const handleToggleStaffActive = async (staff: any) => {
    try {
      await api.put(`/users/${staff.id}`, {
        is_active: staff.is_active ? 0 : 1
      });
      fetchAllSettings();
    } catch (err: any) {
      showFeedback('error', err.response?.data?.error || 'Failed to toggle user status.');
    }
  };

  const handleResetStaffPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPassModal.staffId || newStaffPassword.length < 6) {
      showFeedback('error', 'Password must be at least 6 characters.');
      return;
    }

    try {
      await api.patch(`/users/${resetPassModal.staffId}/reset-password`, {
        newPassword: newStaffPassword
      });
      showFeedback('success', `Password for ${resetPassModal.staffName} reset successfully.`);
      setResetPassModal({ isOpen: false, staffId: null, staffName: '' });
      setNewStaffPassword('');
    } catch (err: any) {
      showFeedback('error', err.response?.data?.error || 'Failed to reset password.');
    }
  };

  // 5. Change Own Password
  const handleChangeOwnPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showFeedback('error', 'New passwords do not match.');
      return;
    }

    try {
      await api.post('/auth/change-password', {
        currentPassword,
        newPassword
      });
      showFeedback('success', 'Your password has been changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      showFeedback('error', err.response?.data?.error || 'Failed to change password.');
    }
  };

  const settingsTabs = [
    { id: 'general' as const, label: 'General & Company', icon: Building, adminOnly: true },
    { id: 'courses' as const, label: 'Course Offerings', icon: BookOpen, adminOnly: true },
    { id: 'sources' as const, label: 'Inquiry Sources', icon: Share2, adminOnly: true },
    { id: 'staff' as const, label: 'Staff & Roles', icon: Users, adminOnly: true },
    { id: 'statuses' as const, label: 'Status Workflow', icon: ShieldCheck, adminOnly: false },
    { id: 'password' as const, label: 'My Password', icon: KeyRound, adminOnly: false }
  ];

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl border text-xs font-semibold flex items-center justify-between shadow-sm animate-fade-in ${
            feedback.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
              : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button type="button" onClick={() => setFeedback(null)} className="font-bold">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Tabs navigation */}
      <div className="bg-white dark:bg-[#151A38] p-2 rounded-2xl border border-slate-200/80 dark:border-[#23294C] shadow-card flex flex-wrap gap-1">
        {settingsTabs
          .filter((t) => (t.adminOnly ? isAdmin : true))
          .map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-[#7138F5] text-white shadow-brand'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
      </div>

      {/* TAB 1: General Company Settings */}
      {activeTab === 'general' && isAdmin && (
        <div className="bg-white dark:bg-[#151A38] p-6 sm:p-8 rounded-3xl border border-slate-200/80 dark:border-[#23294C] shadow-card">
          <div className="mb-6">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">UniverseByte Organization Profile</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Organization details displayed on portal headers, inquiry templates, and communications.
            </p>
          </div>

          <form onSubmit={handleSaveGeneral} className="space-y-4 max-w-2xl">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Company Name
                </label>
                <input
                  type="text"
                  required
                  value={generalSettings.company_name}
                  onChange={(e) => setGeneralSettings({ ...generalSettings, company_name: e.target.value })}
                  className="w-full text-xs font-medium text-slate-800 dark:text-slate-100 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Official Tagline
                </label>
                <input
                  type="text"
                  required
                  value={generalSettings.company_tagline}
                  onChange={(e) => setGeneralSettings({ ...generalSettings, company_tagline: e.target.value })}
                  className="w-full text-xs font-medium text-slate-800 dark:text-slate-100 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  WhatsApp Contact Number
                </label>
                <input
                  type="text"
                  required
                  value={generalSettings.company_whatsapp}
                  onChange={(e) => setGeneralSettings({ ...generalSettings, company_whatsapp: e.target.value })}
                  className="w-full text-xs font-medium text-slate-800 dark:text-slate-100 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Calling Phone Number
                </label>
                <input
                  type="text"
                  required
                  value={generalSettings.company_phone}
                  onChange={(e) => setGeneralSettings({ ...generalSettings, company_phone: e.target.value })}
                  className="w-full text-xs font-medium text-slate-800 dark:text-slate-100 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Official Contact Email
                </label>
                <input
                  type="email"
                  required
                  value={generalSettings.company_email}
                  onChange={(e) => setGeneralSettings({ ...generalSettings, company_email: e.target.value })}
                  className="w-full text-xs font-medium text-slate-800 dark:text-slate-100 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Official Website URL
                </label>
                <input
                  type="url"
                  required
                  value={generalSettings.company_website}
                  onChange={(e) => setGeneralSettings({ ...generalSettings, company_website: e.target.value })}
                  className="w-full text-xs font-medium text-slate-800 dark:text-slate-100 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Office Location
              </label>
              <input
                type="text"
                required
                value={generalSettings.company_location}
                onChange={(e) => setGeneralSettings({ ...generalSettings, company_location: e.target.value })}
                className="w-full text-xs font-medium text-slate-800 dark:text-slate-100 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5"
              />
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={isLoading}
                className="flex items-center gap-2 px-6 py-2.5 bg-[#7138F5] hover:bg-[#5b2cd0] text-white text-xs font-bold rounded-xl shadow-brand transition-all"
              >
                <Save className="w-4 h-4" />
                <span>Save Organization Settings</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 2: Course Settings */}
      {activeTab === 'courses' && isAdmin && (
        <div className="bg-white dark:bg-[#151A38] p-6 sm:p-8 rounded-3xl border border-slate-200/80 dark:border-[#23294C] shadow-card space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Course Offerings</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Manage courses available for inquiry intake and reports.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setCourseNameInput('');
                setCourseDescInput('');
                setCourseModal({ isOpen: true, course: null });
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#7138F5] hover:bg-[#5b2cd0] text-white text-xs font-bold rounded-xl shadow-brand transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Add Course</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase font-semibold">
                  <th className="pb-2.5">Course Name</th>
                  <th className="pb-2.5">Description</th>
                  <th className="pb-2.5 text-center">Status</th>
                  <th className="pb-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                {courses.map((course) => (
                  <tr key={course.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                    <td className="py-3 font-bold text-slate-900 dark:text-white">{course.name}</td>
                    <td className="py-3 text-slate-500 dark:text-slate-400 max-w-sm truncate">
                      {course.description || '—'}
                    </td>
                    <td className="py-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          course.is_active
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        }`}
                      >
                        {course.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setCourseNameInput(course.name);
                            setCourseDescInput(course.description || '');
                            setCourseModal({ isOpen: true, course });
                          }}
                          className="p-1 text-slate-500 hover:text-[#7138F5] transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleCourseActive(course)}
                          className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition-colors ${
                            course.is_active
                              ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300'
                              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300'
                          }`}
                        >
                          {course.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Inquiry Sources */}
      {activeTab === 'sources' && isAdmin && (
        <div className="bg-white dark:bg-[#151A38] p-6 sm:p-8 rounded-3xl border border-slate-200/80 dark:border-[#23294C] shadow-card space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Lead Generation Sources</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Manage inquiry sources (Website, WhatsApp, Ads, Walk-in, etc.).
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setSourceNameInput('');
                setSourceModal({ isOpen: true, source: null });
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#7138F5] hover:bg-[#5b2cd0] text-white text-xs font-bold rounded-xl shadow-brand transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Add Source</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase font-semibold">
                  <th className="pb-2.5">Source Name</th>
                  <th className="pb-2.5 text-center">Status</th>
                  <th className="pb-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                {sources.map((source) => (
                  <tr key={source.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                    <td className="py-3 font-bold text-slate-900 dark:text-white">{source.name}</td>
                    <td className="py-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          source.is_active
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        }`}
                      >
                        {source.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSourceNameInput(source.name);
                            setSourceModal({ isOpen: true, source });
                          }}
                          className="p-1 text-slate-500 hover:text-[#7138F5] transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleSourceActive(source)}
                          className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition-colors ${
                            source.is_active
                              ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300'
                              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300'
                          }`}
                        >
                          {source.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: Staff Management */}
      {activeTab === 'staff' && isAdmin && (
        <div className="bg-white dark:bg-[#151A38] p-6 sm:p-8 rounded-3xl border border-slate-200/80 dark:border-[#23294C] shadow-card space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Staff & User Management</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Manage staff counselor accounts, assign roles, and handle password resets.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setStaffForm({ name: '', email: '', password: '', role: 'staff', phone: '' });
                setStaffModal({ isOpen: true, staff: null });
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#7138F5] hover:bg-[#5b2cd0] text-white text-xs font-bold rounded-xl shadow-brand transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Add Staff</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase font-semibold">
                  <th className="pb-2.5">Staff Name</th>
                  <th className="pb-2.5">Email & Phone</th>
                  <th className="pb-2.5">Role</th>
                  <th className="pb-2.5 text-center">Assigned Leads</th>
                  <th className="pb-2.5 text-center">Status</th>
                  <th className="pb-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                {usersList.map((st) => (
                  <tr key={st.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                    <td className="py-3 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-[#7138F5]/10 text-[#7138F5] flex items-center justify-center font-bold text-xs">
                        {st.name.charAt(0)}
                      </div>
                      <span>{st.name}</span>
                    </td>
                    <td className="py-3">
                      <p className="font-semibold text-slate-800 dark:text-slate-200">{st.email}</p>
                      <p className="text-[11px] text-slate-400 font-mono">{st.phone || '—'}</p>
                    </td>
                    <td className="py-3">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          st.role === 'admin'
                            ? 'bg-purple-100 text-[#7138F5] dark:bg-purple-950/60 dark:text-purple-300'
                            : 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                        }`}
                      >
                        {st.role.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 text-center font-bold">{st.total_inquiries || 0}</td>
                    <td className="py-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          st.is_active
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                        }`}
                      >
                        {st.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setStaffForm({
                              name: st.name,
                              email: st.email,
                              password: '',
                              role: st.role,
                              phone: st.phone || ''
                            });
                            setStaffModal({ isOpen: true, staff: st });
                          }}
                          className="p-1 text-slate-500 hover:text-[#7138F5] transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setResetPassModal({
                              isOpen: true,
                              staffId: st.id,
                              staffName: st.name
                            })
                          }
                          className="p-1 text-slate-500 hover:text-amber-500 transition-colors"
                          title="Reset Password"
                        >
                          <KeyRound className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleStaffActive(st)}
                          className={`text-[11px] font-bold px-2 py-0.5 rounded-lg transition-colors ${
                            st.is_active
                              ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300'
                              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300'
                          }`}
                        >
                          {st.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: Status Workflow */}
      {activeTab === 'statuses' && (
        <div className="bg-white dark:bg-[#151A38] p-6 sm:p-8 rounded-3xl border border-slate-200/80 dark:border-[#23294C] shadow-card space-y-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Predefined Inquiry Status Workflow</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Standard lifecycle stages followed by counselors. All status modifications preserve immutable audit history.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {statuses.map((st, idx) => (
              <div
                key={st.name}
                className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-900/40 space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-white text-xs flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#7138F5]/10 text-[#7138F5] flex items-center justify-center text-[10px]">
                      {idx + 1}
                    </span>
                    <span>{st.name}</span>
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${st.badgeColor}`}>
                    {st.name}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 pl-7">
                  {st.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 6: Change Password */}
      {activeTab === 'password' && (
        <div className="bg-white dark:bg-[#151A38] p-6 sm:p-8 rounded-3xl border border-slate-200/80 dark:border-[#23294C] shadow-card max-w-xl">
          <div className="mb-6">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Change Account Password</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Update your account password. Must be at least 6 characters.
            </p>
          </div>

          <form onSubmit={handleChangeOwnPassword} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Current Password
              </label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full text-xs font-medium text-slate-800 dark:text-slate-100 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                New Password
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full text-xs font-medium text-slate-800 dark:text-slate-100 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full text-xs font-medium text-slate-800 dark:text-slate-100 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="flex items-center gap-2 px-6 py-2.5 bg-[#7138F5] hover:bg-[#5b2cd0] text-white text-xs font-bold rounded-xl shadow-brand transition-all"
              >
                <Lock className="w-4 h-4" />
                <span>Update Password</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Course Modal */}
      <Modal
        isOpen={courseModal.isOpen}
        onClose={() => setCourseModal({ isOpen: false, course: null })}
        title={courseModal.course ? 'Edit Course Offering' : 'Add New Course Offering'}
        maxWidth="md"
      >
        <form onSubmit={handleSaveCourse} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Course Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={courseNameInput}
              onChange={(e) => setCourseNameInput(e.target.value)}
              placeholder="e.g. Artificial Intelligence"
              className="w-full text-xs font-medium text-slate-800 dark:text-slate-100 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Description / Syllabus Overview
            </label>
            <textarea
              rows={3}
              value={courseDescInput}
              onChange={(e) => setCourseDescInput(e.target.value)}
              placeholder="Course description..."
              className="w-full text-xs font-medium text-slate-800 dark:text-slate-100 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setCourseModal({ isOpen: false, course: null })}
              className="px-4 py-2 text-xs font-semibold text-slate-600 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-[#7138F5] text-white text-xs font-bold rounded-xl shadow-brand"
            >
              Save Course
            </button>
          </div>
        </form>
      </Modal>

      {/* Source Modal */}
      <Modal
        isOpen={sourceModal.isOpen}
        onClose={() => setSourceModal({ isOpen: false, source: null })}
        title={sourceModal.source ? 'Edit Lead Source' : 'Add New Lead Source'}
        maxWidth="md"
      >
        <form onSubmit={handleSaveSource} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Source Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={sourceNameInput}
              onChange={(e) => setSourceNameInput(e.target.value)}
              placeholder="e.g. LinkedIn Ads"
              className="w-full text-xs font-medium text-slate-800 dark:text-slate-100 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setSourceModal({ isOpen: false, source: null })}
              className="px-4 py-2 text-xs font-semibold text-slate-600 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-[#7138F5] text-white text-xs font-bold rounded-xl shadow-brand"
            >
              Save Source
            </button>
          </div>
        </form>
      </Modal>

      {/* Staff Modal */}
      <Modal
        isOpen={staffModal.isOpen}
        onClose={() => setStaffModal({ isOpen: false, staff: null })}
        title={staffModal.staff ? 'Edit Staff Account' : 'Register New Staff Counselor'}
        maxWidth="md"
      >
        <form onSubmit={handleSaveStaff} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Full Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={staffForm.name}
              onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })}
              className="w-full text-xs font-medium text-slate-800 dark:text-slate-100 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Email Address <span className="text-rose-500">*</span>
            </label>
            <input
              type="email"
              required
              value={staffForm.email}
              onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
              className="w-full text-xs font-medium text-slate-800 dark:text-slate-100 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5"
            />
          </div>

          {!staffModal.staff && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Initial Password <span className="text-rose-500">*</span>
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={staffForm.password}
                onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })}
                className="w-full text-xs font-medium text-slate-800 dark:text-slate-100 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Role
              </label>
              <select
                value={staffForm.role}
                onChange={(e) => setStaffForm({ ...staffForm, role: e.target.value })}
                className="w-full text-xs font-medium text-slate-800 dark:text-slate-100 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5"
              >
                <option value="staff">Staff Counselor</option>
                <option value="admin">Administrator</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                value={staffForm.phone}
                onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })}
                className="w-full text-xs font-medium text-slate-800 dark:text-slate-100 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setStaffModal({ isOpen: false, staff: null })}
              className="px-4 py-2 text-xs font-semibold text-slate-600 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-[#7138F5] text-white text-xs font-bold rounded-xl shadow-brand"
            >
              Save Account
            </button>
          </div>
        </form>
      </Modal>

      {/* Reset Password Modal (Admin) */}
      <Modal
        isOpen={resetPassModal.isOpen}
        onClose={() => setResetPassModal({ isOpen: false, staffId: null, staffName: '' })}
        title={`Reset Password for ${resetPassModal.staffName}`}
        maxWidth="sm"
      >
        <form onSubmit={handleResetStaffPassword} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              New Password (Min 6 chars)
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={newStaffPassword}
              onChange={(e) => setNewStaffPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full text-xs font-medium text-slate-800 dark:text-slate-100 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setResetPassModal({ isOpen: false, staffId: null, staffName: '' })}
              className="px-3 py-1.5 text-xs text-slate-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl"
            >
              Reset Password
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
