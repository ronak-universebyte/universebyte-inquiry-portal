import React from 'react';
import { Menu, Sun, Moon, Plus, Bell, Shield, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { NavigationTab } from './Sidebar';

interface NavbarProps {
  currentTab: NavigationTab;
  onOpenMobileMenu: () => void;
  onQuickAddInquiry: () => void;
  overdueCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onOpenMobileMenu,
  onQuickAddInquiry,
  overdueCount = 0
}) => {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const getTabTitle = () => {
    switch (currentTab) {
      case 'dashboard':
        return { title: 'Dashboard', desc: 'Real-time student inquiry metrics & lead pipeline' };
      case 'inquiries':
        return { title: 'All Inquiries', desc: 'Manage, search, filter and organize student leads' };
      case 'add-inquiry':
        return { title: 'Add New Inquiry', desc: 'Register a new student inquiry with duplicate detection' };
      case 'followups':
        return { title: 'Follow-ups Management', desc: 'Today, upcoming, and overdue scheduled follow-ups' };
      case 'reports':
        return { title: 'Reports & Analytics', desc: 'Performance analytics, conversion rates, and data export' };
      case 'settings':
        return { title: 'System Settings', desc: 'Courses, lead sources, staff accounts, and portal configuration' };
      default:
        return { title: 'UniverseByte Portal', desc: 'Technology Redefined.' };
    }
  };

  const { title, desc } = getTabTitle();

  const currentDateFormatted = new Date().toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  return (
    <header className="sticky top-0 z-30 bg-white/90 dark:bg-[#10152F]/90 backdrop-blur-md border-b border-slate-200/80 dark:border-[#1e254d] px-4 sm:px-6 py-3.5 transition-colors">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Mobile trigger & breadcrumb */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onOpenMobileMenu}
            className="lg:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div>
            <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <span>{title}</span>
            </h1>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">
              {desc}
            </p>
          </div>
        </div>

        {/* Right: Date, theme toggle, quick action, user badge */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Date pill */}
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 text-xs font-medium">
            <span>{currentDateFormatted}</span>
          </div>

          {/* Dark / Light Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-600" />
            )}
          </button>

          {/* Quick Add Inquiry Button */}
          {currentTab !== 'add-inquiry' && (
            <button
              type="button"
              onClick={onQuickAddInquiry}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#7138F5] hover:bg-[#5b2cd0] text-white text-xs font-bold rounded-xl shadow-brand transition-all transform active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">New Inquiry</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
