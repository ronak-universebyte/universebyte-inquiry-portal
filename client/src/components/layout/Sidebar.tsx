import React from 'react';
import {
  LayoutDashboard,
  Users,
  UserPlus,
  CalendarCheck,
  BarChart3,
  Settings,
  LogOut,
  ChevronRight,
  ShieldCheck,
  UserCheck
} from 'lucide-react';
import { BrandLogo } from '../common/BrandLogo';
import { useAuth } from '../../context/AuthContext';

export type NavigationTab =
  | 'dashboard'
  | 'inquiries'
  | 'add-inquiry'
  | 'followups'
  | 'reports'
  | 'settings';

interface SidebarProps {
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  overdueCount?: number;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  overdueCount = 0,
  isOpenMobile,
  onCloseMobile
}) => {
  const { user, logout } = useAuth();

  const navItems = [
    { id: 'dashboard' as NavigationTab, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'inquiries' as NavigationTab, label: 'All Inquiries', icon: Users },
    { id: 'add-inquiry' as NavigationTab, label: 'Add New Inquiry', icon: UserPlus },
    {
      id: 'followups' as NavigationTab,
      label: 'Follow-ups',
      icon: CalendarCheck,
      badge: overdueCount > 0 ? overdueCount : undefined
    },
    { id: 'reports' as NavigationTab, label: 'Reports & Analytics', icon: BarChart3 },
    { id: 'settings' as NavigationTab, label: 'Settings', icon: Settings, adminOnly: true }
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 bg-[#10152F]/70 z-40 lg:hidden backdrop-blur-sm"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-[#10152F] text-slate-300 flex flex-col justify-between transition-transform duration-300 ease-in-out border-r border-[#1e254d] lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div>
          <div className="p-5 border-b border-[#1e254d]">
            <BrandLogo variant="full" size="md" showTagline={true} />
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1.5 mt-2">
            {navItems.map((item) => {
              // Hide settings from non-admin if desired, or let staff see general & status
              const Icon = item.icon;
              const isActive = currentTab === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onSelectTab(item.id);
                    onCloseMobile();
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
                    isActive
                      ? 'bg-[#7138F5] text-white shadow-brand'
                      : 'text-slate-300 hover:bg-[#1a2147] hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                        isActive ? 'text-[#00D5FF]' : 'text-slate-400 group-hover:text-white'
                      }`}
                    />
                    <span>{item.label}</span>
                  </div>

                  {item.badge !== undefined && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white animate-pulse">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* User Profile Card & Logout */}
        <div className="p-4 border-t border-[#1e254d] bg-[#0c1024]">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-xl bg-[#7138F5] flex items-center justify-center font-bold text-white text-xs shrink-0 shadow-sm">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-bold text-white truncate">{user?.name || 'User'}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  {user?.role === 'admin' ? (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-[#00D5FF]">
                      <ShieldCheck className="w-3 h-3" />
                      <span>Admin</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-slate-400">
                      <UserCheck className="w-3 h-3" />
                      <span>Staff</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={logout}
              title="Sign Out"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-[#1a2147] transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
