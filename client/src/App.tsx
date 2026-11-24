import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { LoginPage } from './components/auth/LoginPage';
import { Sidebar, NavigationTab } from './components/layout/Sidebar';
import { Navbar } from './components/layout/Navbar';
import { DashboardView } from './components/dashboard/DashboardView';
import { AllInquiriesView } from './components/inquiries/AllInquiriesView';
import { AddInquiryView } from './components/inquiries/AddInquiryView';
import { FollowupsView } from './components/followups/FollowupsView';
import { ReportsView } from './components/reports/ReportsView';
import { SettingsView } from './components/settings/SettingsView';
import { InquiryDetailModal } from './components/inquiries/InquiryDetailModal';
import { EditInquiryModal } from './components/inquiries/EditInquiryModal';
import { WhatsAppModal } from './components/inquiries/WhatsAppModal';
import { CallModal } from './components/inquiries/CallModal';
import api from './services/api';

export const App: React.FC = () => {
  const { isAuthenticated, isLoading, user } = useAuth();

  const [currentTab, setCurrentTab] = useState<NavigationTab>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Global shared master data
  const [courses, setCourses] = useState<string[]>([
    'Artificial Intelligence',
    'Python',
    'Full Stack Development',
    'MERN Stack Development',
    'Web Development',
    'PHP & Laravel',
    'Data Science',
    'Other'
  ]);
  const [sources, setSources] = useState<string[]>([
    'Website',
    'WhatsApp',
    'Instagram',
    'Facebook Ads',
    'Google Ads',
    'Walk-in',
    'Reference',
    'Justdial',
    'Other'
  ]);
  const [staffList, setStaffList] = useState<{ id: number; name: string }[]>([]);
  const [overdueCount, setOverdueCount] = useState(0);

  // Inquiries filter pass-through (e.g. clicking KPI card on dashboard)
  const [inquiryFilter, setInquiryFilter] = useState<{ status?: string; course?: string; source?: string } | undefined>(undefined);

  // Active Modals
  const [detailInquiryId, setDetailInquiryId] = useState<number | null>(null);
  const [editingInquiry, setEditingInquiry] = useState<any | null>(null);
  const [whatsAppInquiry, setWhatsAppInquiry] = useState<any | null>(null);
  const [callInquiry, setCallInquiry] = useState<any | null>(null);

  // Key to force refresh of lists when data changes
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchMasterData = async () => {
    if (!isAuthenticated) return;
    try {
      const [cRes, sRes, uRes, fRes] = await Promise.all([
        api.get('/settings/courses'),
        api.get('/settings/sources'),
        api.get('/users?forDropdown=true'),
        api.get('/followups?category=overdue')
      ]);

      if (cRes.data.courses) setCourses(cRes.data.courses.map((c: any) => c.name));
      if (sRes.data.sources) setSources(sRes.data.sources.map((s: any) => s.name));
      if (uRes.data.users) setStaffList(uRes.data.users.map((u: any) => ({ id: u.id, name: u.name })));
      if (fRes.data.counts) setOverdueCount(fRes.data.counts.overdue || 0);
    } catch (err) {
      console.error('Failed to load portal master data:', err);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchMasterData();
    }
  }, [isAuthenticated, refreshKey]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F5F7FC] dark:bg-[#0B0E1F] flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#7138F5] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-xs font-bold text-slate-700 dark:text-slate-300 tracking-wider uppercase">
          UniverseByte Portal Loading...
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  // Dashboard KPI card click handler
  const handleNavigateFromDashboard = (filter?: { status?: string; course?: string; source?: string }) => {
    setInquiryFilter(filter);
    setCurrentTab('inquiries');
  };

  return (
    <div className="min-h-screen bg-[#F5F7FC] dark:bg-[#0B0E1F] flex transition-colors">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          if (tab === 'inquiries') setInquiryFilter(undefined);
          setCurrentTab(tab);
        }}
        overdueCount={overdueCount}
        isOpenMobile={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        {/* Sticky Navbar */}
        <Navbar
          currentTab={currentTab}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          onQuickAddInquiry={() => setCurrentTab('add-inquiry')}
          overdueCount={overdueCount}
        />

        {/* View Router */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {currentTab === 'dashboard' && (
            <DashboardView
              onNavigateToInquiries={handleNavigateFromDashboard}
              onOpenInquiryDetails={(id) => setDetailInquiryId(id)}
              onOpenEditInquiry={(inq) => setEditingInquiry(inq)}
            />
          )}

          {currentTab === 'inquiries' && (
            <AllInquiriesView
              initialFilter={inquiryFilter}
              courses={courses}
              sources={sources}
              staffList={staffList}
              onOpenDetails={(id) => setDetailInquiryId(id)}
              onOpenEdit={(inq) => setEditingInquiry(inq)}
              onOpenWhatsApp={(inq) => setWhatsAppInquiry(inq)}
              onOpenCall={(inq) => setCallInquiry(inq)}
            />
          )}

          {currentTab === 'add-inquiry' && (
            <AddInquiryView
              courses={courses}
              sources={sources}
              staffList={staffList}
              onInquiryCreated={(inq) => {
                setRefreshKey((k) => k + 1);
              }}
              onViewExistingInquiry={(id) => {
                setDetailInquiryId(id);
              }}
            />
          )}

          {currentTab === 'followups' && (
            <FollowupsView
              onOpenDetails={(id) => setDetailInquiryId(id)}
              onOpenWhatsApp={(inq) => setWhatsAppInquiry(inq)}
              onOpenCall={(inq) => setCallInquiry(inq)}
              onCountsUpdated={(counts) => {
                setOverdueCount(counts.overdue || 0);
              }}
            />
          )}

          {currentTab === 'reports' && <ReportsView />}

          {currentTab === 'settings' && (
            <SettingsView
              onRefreshGlobalData={() => {
                setRefreshKey((k) => k + 1);
              }}
            />
          )}
        </main>
      </div>

      {/* Global Modals */}
      {/* 1. Inquiry Detail Modal */}
      <InquiryDetailModal
        isOpen={!!detailInquiryId}
        onClose={() => setDetailInquiryId(null)}
        inquiryId={detailInquiryId}
        courses={courses}
        sources={sources}
        staffList={staffList}
        onDataChanged={() => {
          setRefreshKey((k) => k + 1);
        }}
      />

      {/* 2. Edit Inquiry Modal */}
      {editingInquiry && (
        <EditInquiryModal
          isOpen={!!editingInquiry}
          onClose={() => setEditingInquiry(null)}
          inquiry={editingInquiry}
          courses={courses}
          sources={sources}
          staffList={staffList}
          onUpdated={() => {
            setRefreshKey((k) => k + 1);
          }}
        />
      )}

      {/* 3. WhatsApp Modal */}
      {whatsAppInquiry && (
        <WhatsAppModal
          isOpen={!!whatsAppInquiry}
          onClose={() => setWhatsAppInquiry(null)}
          inquiry={whatsAppInquiry}
          onLogged={() => {
            setRefreshKey((k) => k + 1);
          }}
        />
      )}

      {/* 4. Call Modal */}
      {callInquiry && (
        <CallModal
          isOpen={!!callInquiry}
          onClose={() => setCallInquiry(null)}
          inquiry={callInquiry}
          onLogged={() => {
            setRefreshKey((k) => k + 1);
          }}
        />
      )}
    </div>
  );
};
