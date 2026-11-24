import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Download,
  Printer,
  ChevronLeft,
  ChevronRight,
  Eye,
  Edit3,
  PhoneCall,
  MessageSquare,
  CheckSquare,
  Square,
  Users,
  RefreshCw,
  X,
  RotateCcw,
  Sparkles,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import api from '../../services/api';
import { StatusBadge, PriorityBadge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { useAuth } from '../../context/AuthContext';

interface AllInquiriesViewProps {
  initialFilter?: { status?: string; course?: string; source?: string };
  courses: string[];
  sources: string[];
  staffList: { id: number; name: string }[];
  onOpenDetails: (id: number) => void;
  onOpenEdit: (inquiry: any) => void;
  onOpenWhatsApp: (inquiry: any) => void;
  onOpenCall: (inquiry: any) => void;
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

export const AllInquiriesView: React.FC<AllInquiriesViewProps> = ({
  initialFilter,
  courses,
  sources,
  staffList,
  onOpenDetails,
  onOpenEdit,
  onOpenWhatsApp,
  onOpenCall
}) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  // Filters State
  const [search, setSearch] = useState('');
  const [courseFilter, setCourseFilter] = useState(initialFilter?.course || 'all');
  const [statusFilter, setStatusFilter] = useState(initialFilter?.status || 'all');
  const [sourceFilter, setSourceFilter] = useState(initialFilter?.source || 'all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [staffFilter, setStaffFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [followupDateFrom, setFollowupDateFrom] = useState('');
  const [followupDateTo, setFollowupDateTo] = useState('');
  const [sortBy, setSortBy] = useState('latest');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Data
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Bulk actions
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [bulkAssignStaff, setBulkAssignStaff] = useState('');
  const [bulkStatus, setBulkStatus] = useState('');
  const [isBulkExecuting, setIsBulkExecuting] = useState(false);

  // Delete action (Admin only)
  const [inquiryToDelete, setInquiryToDelete] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDeleteInquiry = async () => {
    if (!inquiryToDelete || !isAdmin) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await api.delete(`/inquiries/${inquiryToDelete.id}`);
      setInquiryToDelete(null);
      fetchInquiries();
    } catch (err: any) {
      console.error('Failed to delete inquiry:', err);
      setDeleteError(err.response?.data?.error || 'Failed to delete inquiry.');
    } finally {
      setIsDeleting(false);
    }
  };

  const fetchInquiries = async () => {
    setIsLoading(true);
    try {
      const params: any = {
        page,
        limit,
        sort_by: sortBy
      };

      if (search.trim()) params.search = search.trim();
      if (courseFilter !== 'all') params.course = courseFilter;
      if (statusFilter !== 'all') params.status = statusFilter;
      if (sourceFilter !== 'all') params.source = sourceFilter;
      if (priorityFilter !== 'all') params.priority = priorityFilter;
      if (staffFilter !== 'all') params.assigned_to = staffFilter;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      if (followupDateFrom) params.followup_date_from = followupDateFrom;
      if (followupDateTo) params.followup_date_to = followupDateTo;

      const res = await api.get('/inquiries', { params });
      setInquiries(res.data.inquiries);
      setTotalRecords(res.data.pagination.total);
      setTotalPages(res.data.pagination.totalPages);
    } catch (err) {
      console.error('Failed to fetch inquiries:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInquiries();
  }, [
    page,
    limit,
    sortBy,
    courseFilter,
    statusFilter,
    sourceFilter,
    priorityFilter,
    staffFilter,
    dateFrom,
    dateTo,
    followupDateFrom,
    followupDateTo
  ]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchInquiries();
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset filters
  const handleResetFilters = () => {
    setSearch('');
    setCourseFilter('all');
    setStatusFilter('all');
    setSourceFilter('all');
    setPriorityFilter('all');
    setStaffFilter('all');
    setDateFrom('');
    setDateTo('');
    setFollowupDateFrom('');
    setFollowupDateTo('');
    setSortBy('latest');
    setPage(1);
    setSelectedIds([]);
  };

  // Bulk selection toggles
  const handleSelectAll = () => {
    if (selectedIds.length === inquiries.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(inquiries.map((i) => i.id));
    }
  };

  const handleToggleRow = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Bulk operations
  const handleExecuteBulkAssign = async () => {
    if (!bulkAssignStaff || selectedIds.length === 0) return;
    setIsBulkExecuting(true);
    try {
      await api.post('/inquiries/bulk-assign', {
        inquiry_ids: selectedIds,
        assigned_to: parseInt(bulkAssignStaff, 10)
      });
      setSelectedIds([]);
      setBulkAssignStaff('');
      fetchInquiries();
    } catch (err) {
      console.error('Bulk assign failed:', err);
    } finally {
      setIsBulkExecuting(false);
    }
  };

  const handleExecuteBulkStatus = async () => {
    if (!bulkStatus || selectedIds.length === 0) return;
    setIsBulkExecuting(true);
    try {
      await api.post('/inquiries/bulk-status', {
        inquiry_ids: selectedIds,
        status: bulkStatus
      });
      setSelectedIds([]);
      setBulkStatus('');
      fetchInquiries();
    } catch (err) {
      console.error('Bulk status failed:', err);
    } finally {
      setIsBulkExecuting(false);
    }
  };

  // Export handlers
  const handleExport = (format: 'csv' | 'xlsx') => {
    const params = new URLSearchParams();
    params.set('format', format);
    if (search.trim()) params.set('search', search.trim());
    if (courseFilter !== 'all') params.set('course', courseFilter);
    if (statusFilter !== 'all') params.set('status', statusFilter);
    if (sourceFilter !== 'all') params.set('source', sourceFilter);
    if (priorityFilter !== 'all') params.set('priority', priorityFilter);
    if (staffFilter !== 'all') params.set('assigned_to', staffFilter);
    if (dateFrom) params.set('date_from', dateFrom);
    if (dateTo) params.set('date_to', dateTo);

    window.open(`/api/inquiries/export?${params.toString()}`, '_blank');
  };

  return (
    <div className="space-y-4">
      {/* Search and Primary Filters Bar */}
      <div className="bg-white dark:bg-[#151A38] p-4 sm:p-5 rounded-3xl border border-slate-200/80 dark:border-[#23294C] shadow-card space-y-3 no-print">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Global Search */}
          <div className="relative w-full md:w-80">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by student, mobile, ID, email..."
              className="w-full text-xs pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#7138F5]"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Selectors & Export */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
            {/* Status quick filter */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#7138F5]"
            >
              <option value="all">All Statuses</option>
              {ALL_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            {/* Course quick filter */}
            <select
              value={courseFilter}
              onChange={(e) => {
                setCourseFilter(e.target.value);
                setPage(1);
              }}
              className="text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#7138F5]"
            >
              <option value="all">All Courses</option>
              {courses.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            {/* Toggle Advanced Filters Button */}
            <button
              type="button"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold rounded-xl border transition-all ${
                showAdvancedFilters
                  ? 'bg-[#7138F5] text-white border-[#7138F5]'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Filters</span>
            </button>

            {/* Export Dropdown / Buttons */}
            <div className="flex items-center gap-1 border-l border-slate-200 dark:border-slate-700 pl-2">
              <button
                type="button"
                onClick={() => handleExport('csv')}
                title="Export filtered to CSV"
                className="flex items-center gap-1 px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>CSV</span>
              </button>
              <button
                type="button"
                onClick={() => handleExport('xlsx')}
                title="Export filtered to Excel"
                className="flex items-center gap-1 px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-emerald-500" />
                <span>Excel</span>
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                title="Print inquiry list"
                className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl transition-colors"
              >
                <Printer className="w-4 h-4 text-slate-500" />
              </button>
            </div>
          </div>
        </div>

        {/* Expandable Advanced Filters Drawer */}
        {showAdvancedFilters && (
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {/* Source filter */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Lead Source</label>
              <select
                value={sourceFilter}
                onChange={(e) => {
                  setSourceFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2"
              >
                <option value="all">All Sources</option>
                {sources.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Priority filter */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Priority</label>
              <select
                value={priorityFilter}
                onChange={(e) => {
                  setPriorityFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2"
              >
                <option value="all">All Priorities</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>

            {/* Staff filter (Admin) */}
            {isAdmin && (
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Assigned Staff</label>
                <select
                  value={staffFilter}
                  onChange={(e) => {
                    setStaffFilter(e.target.value);
                    setPage(1);
                  }}
                  className="w-full text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2"
                >
                  <option value="all">All Staff</option>
                  {staffList.map((st) => (
                    <option key={st.id} value={st.id}>{st.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Sort By */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Sort Inquiries</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2"
              >
                <option value="latest">Latest Received First</option>
                <option value="oldest">Oldest First</option>
                <option value="priority_high">Highest Priority First</option>
                <option value="name_asc">Student Name (A-Z)</option>
              </select>
            </div>

            {/* Inquiry Date Range */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Inquiry Date From</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Inquiry Date To</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2"
              />
            </div>

            {/* Next Followup Date Range */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Follow-up Date From</label>
              <input
                type="date"
                value={followupDateFrom}
                onChange={(e) => setFollowupDateFrom(e.target.value)}
                className="w-full text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Follow-up Date To</label>
              <input
                type="date"
                value={followupDateTo}
                onChange={(e) => setFollowupDateTo(e.target.value)}
                className="w-full text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2"
              />
            </div>

            {/* Reset Filters */}
            <div className="col-span-full flex justify-end">
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset All Filters</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bulk Actions Bar (Appears when items are checked) */}
      {selectedIds.length > 0 && (
        <div className="bg-[#10152F] text-white p-3.5 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-lg no-print animate-fade-in">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-[#7138F5] text-white flex items-center justify-center font-bold text-xs">
              {selectedIds.length}
            </span>
            <span className="text-xs font-semibold">inquiries selected for bulk action</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Bulk Assign (Admin only) */}
            {isAdmin && (
              <div className="flex items-center gap-1.5 bg-white/10 p-1 rounded-xl">
                <select
                  value={bulkAssignStaff}
                  onChange={(e) => setBulkAssignStaff(e.target.value)}
                  className="text-xs bg-transparent text-white border-0 focus:ring-0 p-1"
                >
                  <option value="" className="text-slate-800">Select Staff to Assign</option>
                  {staffList.map((st) => (
                    <option key={st.id} value={st.id} className="text-slate-800">{st.name}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleExecuteBulkAssign}
                  disabled={!bulkAssignStaff || isBulkExecuting}
                  className="px-3 py-1 bg-[#7138F5] hover:bg-[#5b2cd0] text-white text-xs font-bold rounded-lg disabled:opacity-50"
                >
                  Assign
                </button>
              </div>
            )}

            {/* Bulk Status Update */}
            <div className="flex items-center gap-1.5 bg-white/10 p-1 rounded-xl">
              <select
                value={bulkStatus}
                onChange={(e) => setBulkStatus(e.target.value)}
                className="text-xs bg-transparent text-white border-0 focus:ring-0 p-1"
              >
                <option value="" className="text-slate-800">Update Status To</option>
                {ALL_STATUSES.map((s) => (
                  <option key={s} value={s} className="text-slate-800">{s}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleExecuteBulkStatus}
                disabled={!bulkStatus || isBulkExecuting}
                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg disabled:opacity-50"
              >
                Update
              </button>
            </div>

            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="text-xs text-slate-400 hover:text-white px-2 py-1"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Main Table Container */}
      <div className="bg-white dark:bg-[#151A38] rounded-3xl border border-slate-200/80 dark:border-[#23294C] shadow-card overflow-hidden">
        {/* Table summary row */}
        <div className="px-6 py-3.5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <div>
            Showing <strong className="text-slate-800 dark:text-white">{inquiries.length}</strong> of{' '}
            <strong className="text-slate-800 dark:text-white">{totalRecords}</strong> total inquiries
          </div>
          <div className="flex items-center gap-2 no-print">
            <span>Rows per page:</span>
            <select
              value={limit}
              onChange={(e) => {
                setLimit(parseInt(e.target.value, 10));
                setPage(1);
              }}
              className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>

        {/* Inquiries Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/70 dark:bg-slate-900/50 border-b border-slate-200/80 dark:border-slate-800 text-slate-400 uppercase font-bold text-[11px] tracking-wider">
                <th className="py-3 px-4 w-10 text-center no-print">
                  <button type="button" onClick={handleSelectAll} className="text-slate-400 hover:text-slate-600">
                    {selectedIds.length > 0 && selectedIds.length === inquiries.length ? (
                      <CheckSquare className="w-4 h-4 text-[#7138F5]" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="py-3 px-3">Inquiry ID</th>
                <th className="py-3 px-3">Student Full Name</th>
                <th className="py-3 px-3">Mobile Number</th>
                <th className="py-3 px-3">Course</th>
                <th className="py-3 px-3">Source</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Priority</th>
                <th className="py-3 px-3">Assigned To</th>
                <th className="py-3 px-3">Next Follow-up</th>
                <th className="py-3 px-3">Inquiry Date</th>
                <th className="py-3 px-4 text-right no-print">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium text-slate-700 dark:text-slate-200">
              {isLoading ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-slate-400">
                    <div className="w-8 h-8 border-3 border-[#7138F5] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <p className="text-xs">Loading inquiries from database...</p>
                  </td>
                </tr>
              ) : inquiries.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-slate-400">
                    <p className="text-sm font-semibold">No inquiries found matching your filters.</p>
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="mt-2 text-xs text-[#7138F5] font-bold hover:underline"
                    >
                      Clear all filters
                    </button>
                  </td>
                </tr>
              ) : (
                inquiries.map((inq) => {
                  const isSelected = selectedIds.includes(inq.id);
                  return (
                    <tr
                      key={inq.id}
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                        isSelected ? 'bg-purple-50/50 dark:bg-purple-950/20' : ''
                      }`}
                    >
                      <td className="py-3 px-4 text-center no-print">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleRow(inq.id)}
                          className="w-4 h-4 text-[#7138F5] rounded border-slate-300 focus:ring-[#7138F5]"
                        />
                      </td>

                      <td className="py-3 px-3 font-mono font-bold text-[#7138F5] dark:text-[#00D5FF] whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => onOpenDetails(inq.id)}
                          className="hover:underline"
                        >
                          {inq.inquiry_id}
                        </button>
                      </td>

                      <td className="py-3 px-3 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                        {inq.student_name}
                      </td>

                      <td className="py-3 px-3 font-mono whitespace-nowrap">
                        <a href={`tel:+91${inq.mobile}`} className="hover:text-[#7138F5]">
                          +91 {inq.mobile}
                        </a>
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap font-medium text-slate-800 dark:text-slate-200">
                        {inq.course_name}
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap text-slate-500 dark:text-slate-400">
                        {inq.source_name}
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap">
                        <StatusBadge status={inq.status} size="sm" />
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap">
                        <PriorityBadge priority={inq.priority} size="sm" />
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap text-slate-600 dark:text-slate-300">
                        {inq.assigned_to_name || <span className="text-slate-400 italic">Unassigned</span>}
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap text-amber-600 dark:text-amber-400 font-medium">
                        {inq.next_followup_date ? inq.next_followup_date.split(' ')[0] : '—'}
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap text-slate-400 font-mono text-[11px]">
                        {inq.inquiry_date.split(' ')[0]}
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap no-print">
                        <div className="flex items-center justify-end gap-1">
                          {/* Quick WhatsApp button */}
                          <button
                            type="button"
                            onClick={() => onOpenWhatsApp(inq)}
                            title="Connect on WhatsApp"
                            className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </button>

                          {/* Quick Call button */}
                          <button
                            type="button"
                            onClick={() => onOpenCall(inq)}
                            title="Call Student"
                            className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
                          >
                            <PhoneCall className="w-3.5 h-3.5" />
                          </button>

                          {/* View details */}
                          <button
                            type="button"
                            onClick={() => onOpenDetails(inq.id)}
                            title="View Profile & Timeline"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-[#7138F5] hover:bg-purple-50 dark:hover:bg-purple-950/40 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit inquiry */}
                          <button
                            type="button"
                            onClick={() => onOpenEdit(inq)}
                            title="Edit Details"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete inquiry (Admin only) */}
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => {
                                setDeleteError(null);
                                setInquiryToDelete(inq);
                              }}
                              title="Delete Inquiry (Admin Only)"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between no-print">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Page <strong className="text-slate-800 dark:text-white">{page}</strong> of{' '}
            <strong className="text-slate-800 dark:text-white">{totalPages}</strong>
          </p>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal (Admin Only) */}
      {isAdmin && inquiryToDelete && (
        <Modal
          isOpen={!!inquiryToDelete}
          onClose={() => {
            if (!isDeleting) setInquiryToDelete(null);
          }}
          title="Confirm Inquiry Deletion"
          subtitle="Permanent database action"
        >
          <div className="space-y-4">
            <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-2xl flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div className="text-xs text-red-800 dark:text-red-200">
                <p className="font-bold text-sm mb-1 text-red-900 dark:text-red-100">
                  Permanently delete inquiry?
                </p>
                <p>
                  Are you sure you want to delete inquiry{' '}
                  <strong className="font-mono text-red-950 dark:text-red-50">
                    {inquiryToDelete.inquiry_id}
                  </strong>{' '}
                  for student <strong className="font-semibold">{inquiryToDelete.student_name}</strong>?
                </p>
                <p className="mt-2 text-red-700 dark:text-red-300">
                  This will permanently remove the student inquiry, follow-ups, and activity history from MongoDB. This action cannot be undone.
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
                onClick={() => setInquiryToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteInquiry}
                className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-md transition-all disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? 'Deleting...' : 'Delete Permanently'}</span>
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
