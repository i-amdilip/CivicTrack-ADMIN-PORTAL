import React from 'react';
import type { ComplaintStatus, PriorityLevel } from '../types/civic';

const STATUS_STYLES: Record<ComplaintStatus, string> = {
  New: 'text-[#0284C7] bg-white border-[#7DD3FC]',
  Reviewed: 'text-[#334155] bg-[#F8FAFC] border-[#CBD5E1]',
  Pending: 'text-[#1D4ED8] bg-white border-[#93C5FD]',
  'In Progress': 'text-[#D97706] bg-white border-[#FCD34D]',
  'Resolution Submitted': 'text-[#B45309] bg-[#FFFBEB] border-[#FBBF24]',
  Resolved: 'text-white bg-[#16A34A] border-[#16A34A]',
  Escalated: 'text-[#DC2626] bg-[#FEF2F2] border-[#FCA5A5]',
  Rejected: 'text-[#64748B] bg-[#F1F5F9] border-[#CBD5E1]',
};

const PRIORITY_STYLES: Record<PriorityLevel, string> = {
  Critical: 'text-[#DC2626] font-semibold',
  High: 'text-[#D97706] font-semibold',
  Medium: 'text-[#1D4ED8] font-medium',
  Low: 'text-[#64748B] font-medium',
};

export const StatusLabel: React.FC<{ status: ComplaintStatus }> = ({ status }) => {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full border px-3 py-0.5 text-[11px] font-medium whitespace-nowrap ${STATUS_STYLES[status]}`}
    >
      {status}
    </span>
  );
};

export const PriorityLabel: React.FC<{ priority: PriorityLevel }> = ({ priority }) => {
  return (
    <span className={`text-xs whitespace-nowrap ${PRIORITY_STYLES[priority]}`}>
      {priority}
    </span>
  );
};

export function formatShortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  });
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
