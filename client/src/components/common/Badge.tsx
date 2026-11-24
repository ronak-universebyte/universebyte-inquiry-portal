import React from 'react';

export interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const getBadgeStyle = (s: string) => {
    switch (s) {
      case 'New':
        return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800';
      case 'Contacted':
        return 'bg-purple-50 text-[#7138F5] border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800';
      case 'Interested':
        return 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800';
      case 'Follow-up Required':
        return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800';
      case 'Demo Scheduled':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800';
      case 'Converted':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 font-semibold';
      case 'Not Interested':
        return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800';
      case 'Invalid Number':
        return 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300';
    }
  };

  const getDotColor = (s: string) => {
    switch (s) {
      case 'New': return 'bg-blue-500';
      case 'Contacted': return 'bg-[#7138F5]';
      case 'Interested': return 'bg-[#00D5FF]';
      case 'Follow-up Required': return 'bg-amber-500';
      case 'Demo Scheduled': return 'bg-indigo-500';
      case 'Converted': return 'bg-emerald-500 animate-pulse';
      case 'Not Interested': return 'bg-rose-500';
      case 'Invalid Number': return 'bg-slate-400';
      default: return 'bg-slate-400';
    }
  };

  const pad = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${pad} ${getBadgeStyle(status)}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${getDotColor(status)}`} />
      {status}
    </span>
  );
};

export const PriorityBadge: React.FC<{ priority: string; size?: 'sm' | 'md' }> = ({ priority, size = 'md' }) => {
  const getStyle = (p: string) => {
    switch (p) {
      case 'High':
        return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900';
      case 'Medium':
        return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900';
      case 'Low':
        return 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700';
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  const pad = size === 'sm' ? 'px-1.5 py-0.5 text-[11px]' : 'px-2 py-0.5 text-xs';

  return (
    <span className={`inline-flex items-center rounded border font-medium ${pad} ${getStyle(priority)}`}>
      {priority}
    </span>
  );
};
