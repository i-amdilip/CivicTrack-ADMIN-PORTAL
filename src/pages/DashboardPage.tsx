import React, { useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  MoreVertical,
  Puzzle,
  RefreshCw,
  Smile,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { StatusLabel, formatDateTime } from '../components/StatusLabels';
import { usePortal } from '../context/PortalContext';
import { hasPermission, isComplaintOverdue } from '../lib/rbac';
import type { ComplaintCategory, ComplaintStatus } from '../types/civic';
import { exportToCsv } from '../utils/csvExport';

type DateRangeOption = '7d' | '30d' | '90d' | 'all';

const REFERENCE_NOW = new Date('2026-11-24T09:15:00Z').getTime();

const CATEGORY_COLORS: Record<ComplaintCategory, string> = {
  'Road Maintenance': '#1D4ED8',
  'Water Supply': '#F97316',
  Sanitation: '#10B981',
  Electricity: '#0EA5E9',
  Drainage: '#EAB308',
  'Public Infrastructure': '#6366F1',
};

const ALL_CATEGORIES: ComplaintCategory[] = [
  'Road Maintenance',
  'Water Supply',
  'Sanitation',
  'Electricity',
  'Drainage',
  'Public Infrastructure',
];

export const DashboardPage: React.FC = () => {
  const { currentUser, complaints, departments, officers } = usePortal();
  const navigate = useNavigate();

  const [dateRange, setDateRange] = useState<DateRangeOption>('30d');
  const [statusFilter, setStatusFilter] = useState<ComplaintStatus | 'All'>('All');
  const [page, setPage] = useState(1);
  const [recentMenuOpen, setRecentMenuOpen] = useState(false);
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);
  const [categoryMode, setCategoryMode] = useState<'share' | 'resolved'>('share');
  const pageSize = 5;

  const periodLabel = useMemo(() => {
    if (dateRange === '7d') return 'Last 7 days';
    if (dateRange === '30d') return 'Last 30 days';
    if (dateRange === '90d') return 'Quarter to date';
    return 'All recorded';
  }, [dateRange]);

  const rangeFilteredComplaints = useMemo(() => {
    if (dateRange === 'all') return complaints;
    const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
    const cutoff = REFERENCE_NOW - days * 24 * 60 * 60 * 1000;
    return complaints.filter((c) => new Date(c.reportedAt).getTime() >= cutoff);
  }, [complaints, dateRange]);

  const stats = useMemo(() => {
    const total = rangeFilteredComplaints.length;
    const pending = rangeFilteredComplaints.filter(
      (c) => c.status === 'New' || c.status === 'Reviewed' || c.status === 'Pending'
    ).length;
    const inProgress = rangeFilteredComplaints.filter(
      (c) => c.status === 'In Progress' || c.status === 'Resolution Submitted'
    ).length;
    const resolved = rangeFilteredComplaints.filter((c) => c.status === 'Resolved').length;
    const slaBreaches = rangeFilteredComplaints.filter((c) =>
      isComplaintOverdue(c, REFERENCE_NOW)
    ).length;

    const breached = slaBreaches;
    const slaRate = total === 0 ? 100 : ((total - breached) / total) * 100;

    // Feedback rating derived deterministically from resolution & SLA adherence (max 5.0)
    const resolutionRatio = total === 0 ? 1 : resolved / total;
    const ratingValue = Math.min(5, Math.max(3.6, 3.9 + slaRate / 140 + resolutionRatio * 0.45));

    return {
      total,
      pending,
      inProgress,
      resolved,
      slaBreaches,
      slaRate: Number(slaRate.toFixed(1)),
      feedbackRating: ratingValue.toFixed(1),
    };
  }, [rangeFilteredComplaints]);

  const awaitingAssignment = useMemo(() => {
    return rangeFilteredComplaints.filter(
      (c) => !c.assignedDepartmentId && c.status !== 'Resolved' && c.status !== 'Rejected'
    );
  }, [rangeFilteredComplaints]);

  const deptMap = useMemo(
    () => Object.fromEntries(departments.map((d) => [d.id, d])),
    [departments]
  );
  const officerMap = useMemo(
    () => Object.fromEntries(officers.map((o) => [o.id, o])),
    [officers]
  );

  // Build daily trend series grounded in real complaints + daily baseline
  const trendData = useMemo(() => {
    const daysToShow = dateRange === '7d' ? 7 : 13;
    const series: { day: string; pending: number; inProgress: number }[] = [];
    const baseCounts = [
      { pending: 4, inProgress: 2 },
      { pending: 6, inProgress: 4 },
      { pending: 5, inProgress: 3 },
      { pending: 7, inProgress: 4 },
      { pending: 9, inProgress: 7 },
      { pending: 8, inProgress: 6 },
      { pending: 10, inProgress: 7 },
      { pending: 8, inProgress: 5 },
      { pending: 9, inProgress: 6 },
      { pending: 6, inProgress: 4 },
      { pending: 7, inProgress: 5 },
      { pending: 9, inProgress: 6 },
      { pending: Math.max(stats.pending, 5), inProgress: Math.max(stats.inProgress, 4) },
    ];

    const sliceStart = baseCounts.length - daysToShow;
    for (let i = 0; i < daysToShow; i++) {
      const date = new Date(REFERENCE_NOW - (daysToShow - 1 - i) * 24 * 60 * 60 * 1000);
      const label = date.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
      const dayIso = date.toISOString().slice(0, 10);

      // Count actual complaints on this day
      const actualPendingOnDay = complaints.filter(
        (c) =>
          c.reportedAt.slice(0, 10) === dayIso &&
          (c.status === 'New' || c.status === 'Pending' || c.status === 'Escalated')
      ).length;
      const actualProgressOnDay = complaints.filter(
        (c) =>
          c.reportedAt.slice(0, 10) === dayIso &&
          (c.status === 'In Progress' || c.status === 'Resolution Submitted' || c.status === 'Resolved')
      ).length;

      const template = baseCounts[sliceStart + i];
      series.push({
        day: label,
        pending: template.pending + actualPendingOnDay,
        inProgress: template.inProgress + actualProgressOnDay,
      });
    }
    return series;
  }, [complaints, dateRange, stats.pending, stats.inProgress]);

  const recentTableComplaints = useMemo(() => {
    return rangeFilteredComplaints
      .filter((c) => (statusFilter === 'All' ? true : c.status === statusFilter))
      .sort((a, b) => new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime());
  }, [rangeFilteredComplaints, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(recentTableComplaints.length / pageSize));
  const pagedComplaints = recentTableComplaints.slice((page - 1) * pageSize, page * pageSize);

  const categoryBreakdown = useMemo(() => {
    const total = Math.max(1, rangeFilteredComplaints.length);
    return ALL_CATEGORIES.map((category) => {
      const matching = rangeFilteredComplaints.filter((c) => c.category === category);
      const resolvedCount = matching.filter((c) => c.status === 'Resolved').length;
      const pct =
        categoryMode === 'share'
          ? Math.round((matching.length / total) * 100)
          : matching.length === 0
          ? 0
          : Math.round((resolvedCount / matching.length) * 100);
      return {
        category,
        count: matching.length,
        resolvedCount,
        pct,
        color: CATEGORY_COLORS[category],
      };
    }).sort((a, b) => b.pct - a.pct);
  }, [rangeFilteredComplaints, categoryMode]);

  const canAssign = currentUser ? hasPermission(currentUser.role, 'assign_complaint') : false;
  const canExport = currentUser ? hasPermission(currentUser.role, 'export_reports') : false;

  // Circular SVG gauge calculation
  const ringRadius = 46;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference * (1 - Math.min(100, Math.max(0, stats.slaRate)) / 100);

  const handleExportRecent = () => {
    setRecentMenuOpen(false);
    exportToCsv(
      'civictrack-recent-complaints.csv',
      ['Complaint ID', 'Reported Date', 'Citizen', 'Category', 'Department', 'Officer', 'Status'],
      recentTableComplaints.map((c) => [
        c.id,
        formatDateTime(c.reportedAt),
        c.citizen.name,
        c.category,
        c.assignedDepartmentId ? deptMap[c.assignedDepartmentId]?.name : 'Unassigned',
        c.assignedOfficerId ? officerMap[c.assignedOfficerId]?.name : 'Unassigned',
        c.status,
      ])
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Unified Overview + Trend Card */}
      <section className="rounded-2xl border border-[#E8ECF2] bg-white shadow-[0_2px_16px_rgba(15,23,42,0.03)]">
        {/* 5-Column KPI Overview Strip */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 items-stretch">
          {/* 1. Pending */}
          <Link
            to="/complaints/pending"
            className="group flex flex-col justify-between px-6 pt-6 pb-0 hover:bg-[#F8FAFC]/70 transition-colors rounded-tl-2xl"
          >
            <div>
              <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[#16A34A]/30 bg-[#ECFDF5] text-[#16A34A]">
                <Clock className="h-[18px] w-[18px]" />
              </div>
              <div className="mt-3 text-[14px] font-semibold text-[#1E293B] group-hover:text-[#003B9E] transition-colors">
                Pending
              </div>
              <div className="text-[11px] font-medium text-[#64748B]">{periodLabel}</div>
              <div className="mt-3 flex items-center gap-2.5">
                <span className="font-mono-tabular text-[32px] font-bold leading-none tracking-tight text-[#1E293B]">
                  {stats.pending}
                </span>
                <span className="inline-flex items-center rounded-full bg-[#DC2626] px-2 py-0.5 font-mono-tabular text-[11px] font-semibold text-white">
                  {stats.slaBreaches > 0 ? `${stats.slaBreaches} SLA` : 'Active'}
                </span>
              </div>
            </div>
            <div className="mt-5 h-[3.5px] w-full rounded-full bg-[#1D4ED8]" />
          </Link>

          {/* 2. In Progress */}
          <Link
            to="/complaints/in-progress"
            className="group flex flex-col justify-between px-6 pt-6 pb-0 hover:bg-[#F8FAFC]/70 transition-colors"
          >
            <div>
              <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[#1D4ED8]/25 bg-[#EFF6FF] text-[#1D4ED8]">
                <RefreshCw className="h-[18px] w-[18px]" />
              </div>
              <div className="mt-3 text-[14px] font-semibold text-[#1E293B] group-hover:text-[#003B9E] transition-colors">
                In Progress
              </div>
              <div className="text-[11px] font-medium text-[#64748B]">{periodLabel}</div>
              <div className="mt-3 flex items-center gap-2.5">
                <span className="font-mono-tabular text-[32px] font-bold leading-none tracking-tight text-[#1E293B]">
                  {stats.inProgress}
                </span>
                <span className="inline-flex items-center rounded-full bg-[#16A34A] px-2 py-0.5 font-mono-tabular text-[11px] font-semibold text-white">
                  On Field
                </span>
              </div>
            </div>
            <div className="mt-5 h-[3.5px] w-full rounded-full bg-[#EAB308]" />
          </Link>

          {/* 3. Solved / Resolved */}
          <Link
            to="/complaints/resolved"
            className="group flex flex-col justify-between px-6 pt-6 pb-0 hover:bg-[#F8FAFC]/70 transition-colors"
          >
            <div>
              <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[#F59E0B]/30 bg-[#FFFBEB] text-[#F59E0B]">
                <Puzzle className="h-[18px] w-[18px]" />
              </div>
              <div className="mt-3 text-[14px] font-semibold text-[#1E293B] group-hover:text-[#003B9E] transition-colors">
                Resolved
              </div>
              <div className="text-[11px] font-medium text-[#64748B]">{periodLabel}</div>
              <div className="mt-3 flex items-center gap-2.5">
                <span className="font-mono-tabular text-[32px] font-bold leading-none tracking-tight text-[#1E293B]">
                  {stats.resolved}
                </span>
                <span className="inline-flex items-center rounded-full bg-[#16A34A] px-2 py-0.5 font-mono-tabular text-[11px] font-semibold text-white">
                  {stats.total > 0 ? `${Math.round((stats.resolved / stats.total) * 100)}%` : '0%'}
                </span>
              </div>
            </div>
            <div className="mt-5 h-[3.5px] w-full rounded-full bg-[#10B981]" />
          </Link>

          {/* 4. Service Level Ring */}
          <Link
            to="/complaints/escalated"
            className="group flex items-center justify-center px-4 py-5 border-t border-[#EEF1F5] lg:border-t-0 lg:border-l lg:border-[#EEF1F5] hover:bg-[#F8FAFC]/70 transition-colors"
          >
            <div className="relative flex h-[120px] w-[120px] items-center justify-center">
              <svg className="h-full w-full -rotate-90" viewBox="0 0 112 112" aria-hidden="true">
                <circle
                  cx="56"
                  cy="56"
                  r={ringRadius}
                  fill="none"
                  stroke="#E5E7EB"
                  strokeWidth="7"
                />
                <circle
                  cx="56"
                  cy="56"
                  r={ringRadius}
                  fill="none"
                  stroke={stats.slaRate >= 75 ? '#10B981' : '#F59E0B'}
                  strokeWidth="7"
                  strokeDasharray={ringCircumference}
                  strokeDashoffset={ringOffset}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-[10.5px] font-medium text-[#64748B]">Service Level</span>
                <span className="mt-0.5 font-mono-tabular text-[22px] font-bold leading-tight text-[#1E293B]">
                  {stats.slaRate}%
                </span>
                <span className="text-[10.5px] font-medium text-[#64748B]">Target 75%</span>
              </div>
            </div>
          </Link>

          {/* 5. Feedback Rating */}
          <Link
            to="/performance"
            className="col-span-2 md:col-span-1 flex flex-col justify-center px-6 py-5 border-t border-[#EEF1F5] lg:border-t-0 hover:bg-[#F8FAFC]/70 transition-colors rounded-tr-2xl"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[#1D4ED8]/25 bg-[#EFF6FF] text-[#1D4ED8]">
              <Smile className="h-[18px] w-[18px]" />
            </div>
            <div className="mt-3 text-[14px] font-semibold text-[#1E293B]">Feedback Rating</div>
            <div className="text-[11px] font-medium text-[#64748B]">All time</div>
            <div className="mt-2.5 flex items-baseline gap-1.5">
              <span className="font-mono-tabular text-[30px] font-bold leading-none text-[#1E293B]">
                {stats.feedbackRating}
              </span>
              <span className="text-sm font-medium text-[#64748B]">of 5</span>
            </div>
          </Link>
        </div>

        {/* Divider */}
        <div className="border-t border-[#EEF1F5]" />

        {/* Total Complaints Line Chart Area */}
        <div className="px-6 py-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-4">
              <h2 className="text-[15px] font-semibold text-[#1E293B]">Total Complaints</h2>
              <div className="flex items-center gap-3 text-xs text-[#64748B]">
                <span className="inline-flex items-center gap-1.5">
                  <span className="inline-block h-0.5 w-3.5 bg-[#1D4ED8]" />
                  <span>Pending</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="inline-block h-0.5 w-3.5 bg-[#0EA5E9]" />
                  <span>In Progress</span>
                </span>
              </div>
              {canAssign && awaitingAssignment.length > 0 && (
                <Link
                  to="/assign"
                  className="text-xs font-semibold text-[#003B9E] hover:underline whitespace-nowrap"
                >
                  {awaitingAssignment.length} awaiting assignment →
                </Link>
              )}
            </div>

            <div className="relative">
              <select
                aria-label="Select chart period"
                value={dateRange}
                onChange={(e) => {
                  setDateRange(e.target.value as DateRangeOption);
                  setPage(1);
                }}
                className="appearance-none rounded-lg border border-[#E8ECF2] bg-[#F8FAFC] py-1.5 pl-3 pr-8 text-xs font-medium text-[#1E293B] hover:bg-[#F1F5F9] focus:border-[#003B9E] focus:outline-none cursor-pointer"
              >
                <option value="7d">Nov 18 - Nov 24 (7d)</option>
                <option value="30d">Last 30 Days</option>
                <option value="90d">Quarter to Date</option>
                <option value="all">All Recorded</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#64748B]" />
            </div>
          </div>

          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 10, right: 16, left: -16, bottom: 0 }}>
                <CartesianGrid stroke="#F1F5F9" vertical={false} />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 11, fill: '#64748B' }}
                  axisLine={{ stroke: '#E8ECF2' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#64748B' }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload || payload.length === 0) return null;
                    return (
                      <div className="rounded-lg border border-[#E8ECF2] bg-white px-4 py-2.5 shadow-[0_8px_24px_rgba(15,23,42,0.08)]">
                        <div className="mb-1.5 text-[11px] font-medium text-[#64748B]">{label}</div>
                        <div className="space-y-1">
                          {payload.map((entry) => (
                            <div
                              key={entry.dataKey as string}
                              className="flex items-center justify-between gap-6 text-xs"
                            >
                              <span className="flex items-center gap-2 text-[#1E293B]">
                                <span
                                  className="inline-block h-0.5 w-3"
                                  style={{ backgroundColor: entry.color }}
                                />
                                <span>{entry.name}</span>
                              </span>
                              <span className="font-mono-tabular font-semibold text-[#1E293B]">
                                {entry.value}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="pending"
                  name="Pending"
                  stroke="#1D4ED8"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 5, fill: '#1D4ED8', stroke: '#FFFFFF', strokeWidth: 2 }}
                />
                <Line
                  type="monotone"
                  dataKey="inProgress"
                  name="In Progress"
                  stroke="#0EA5E9"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 5, fill: '#0EA5E9', stroke: '#FFFFFF', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* Bottom Two-Column Split: Recent Complaints + Complaints in Category */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-stretch">
        {/* Left Card: Recent Complaints */}
        <section className="flex flex-col rounded-2xl border border-[#E8ECF2] bg-white shadow-[0_2px_16px_rgba(15,23,42,0.03)] lg:col-span-7">
          <div className="flex items-center justify-between gap-3 px-6 pt-5 pb-3">
            <h3 className="text-[15px] font-semibold text-[#1E293B]">Recent Complaints</h3>
            <div className="flex items-center gap-2">
              <select
                aria-label="Filter recent complaints by status"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as ComplaintStatus | 'All');
                  setPage(1);
                }}
                className="rounded-lg border border-[#E8ECF2] bg-[#F8FAFC] px-2.5 py-1 text-xs font-medium text-[#1E293B] focus:border-[#003B9E] focus:outline-none"
              >
                <option value="All">All Statuses</option>
                <option value="New">New</option>
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Resolution Submitted">Verification</option>
                <option value="Escalated">Escalated</option>
                <option value="Resolved">Resolved</option>
              </select>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setRecentMenuOpen((v) => !v);
                    setCategoryMenuOpen(false);
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#1E293B]"
                  aria-label="Recent complaints options"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
                {recentMenuOpen && (
                  <div className="absolute right-0 mt-1.5 w-44 rounded-xl border border-[#E8ECF2] bg-white py-1.5 shadow-lg z-30">
                    <Link
                      to="/complaints"
                      onClick={() => setRecentMenuOpen(false)}
                      className="block px-3.5 py-2 text-xs font-medium text-[#1E293B] hover:bg-[#F8FAFC]"
                    >
                      View All Complaints
                    </Link>
                    {canAssign && (
                      <Link
                        to="/assign"
                        onClick={() => setRecentMenuOpen(false)}
                        className="block px-3.5 py-2 text-xs font-medium text-[#1E293B] hover:bg-[#F8FAFC]"
                      >
                        Assign Unassigned
                      </Link>
                    )}
                    {canExport && (
                      <button
                        type="button"
                        onClick={handleExportRecent}
                        className="block w-full px-3.5 py-2 text-left text-xs font-medium text-[#1E293B] hover:bg-[#F8FAFC]"
                      >
                        Export CSV
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-x-auto px-6">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-[#EEF1F5] text-xs font-semibold text-[#64748B]">
                  <th className="py-3 pr-3 whitespace-nowrap">Date</th>
                  <th className="py-3 px-3 whitespace-nowrap">Name</th>
                  <th className="py-3 px-3 whitespace-nowrap">Category</th>
                  <th className="py-3 pl-3 text-right whitespace-nowrap">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9] text-[13px]">
                {pagedComplaints.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-10 text-center text-xs text-[#64748B]">
                      No complaints match the current filter criteria.
                    </td>
                  </tr>
                ) : (
                  pagedComplaints.map((c) => (
                    <tr
                      key={c.id}
                      onClick={() => navigate(`/complaints/${c.id}`)}
                      className="cursor-pointer hover:bg-[#F8FAFC] transition-colors"
                    >
                      <td className="py-3.5 pr-3 font-mono-tabular text-xs text-[#475569] whitespace-nowrap">
                        {formatDateTime(c.reportedAt)}
                      </td>
                      <td className="py-3.5 px-3">
                        <div className="font-medium text-[#1E293B] whitespace-nowrap">
                          {c.citizen.name}
                        </div>
                        <div className="font-mono-tabular text-[11px] text-[#64748B]">
                          {c.id} · {c.ward.split(' - ')[0]}
                        </div>
                      </td>
                      <td className="py-3.5 px-3 text-[#475569] whitespace-nowrap">{c.category}</td>
                      <td className="py-3.5 pl-3 text-right whitespace-nowrap">
                        <StatusLabel status={c.status} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Footer Pagination */}
          <div className="flex items-center justify-between border-t border-[#EEF1F5] px-6 py-3 text-xs text-[#64748B]">
            <div className="flex items-center gap-3">
              <span className="tabular-nums">
                Showing {pagedComplaints.length} of {recentTableComplaints.length}
              </span>
              <Link
                to="/complaints"
                className="font-semibold text-[#003B9E] hover:underline whitespace-nowrap"
              >
                View all →
              </Link>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-[#E8ECF2] bg-white text-[#1E293B] hover:bg-[#F8FAFC] disabled:opacity-40"
                aria-label="Previous page"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <span className="px-2 font-mono-tabular text-xs font-medium text-[#1E293B]">
                {page} / {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-[#E8ECF2] bg-white text-[#1E293B] hover:bg-[#F8FAFC] disabled:opacity-40"
                aria-label="Next page"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </section>

        {/* Right Card: Complaints in Category */}
        <section className="flex flex-col rounded-2xl border border-[#E8ECF2] bg-white shadow-[0_2px_16px_rgba(15,23,42,0.03)] lg:col-span-5">
          <div className="flex items-center justify-between px-6 pt-5 pb-3">
            <div>
              <h3 className="text-[15px] font-semibold text-[#1E293B]">Complaints in Category</h3>
              <p className="text-[11px] text-[#64748B]">
                {categoryMode === 'share'
                  ? 'Distribution across municipal sectors'
                  : 'Resolution completion by sector'}
              </p>
            </div>
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setCategoryMenuOpen((v) => !v);
                  setRecentMenuOpen(false);
                }}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#1E293B]"
                aria-label="Category chart options"
              >
                <MoreVertical className="h-4 w-4" />
              </button>
              {categoryMenuOpen && (
                <div className="absolute right-0 mt-1.5 w-48 rounded-xl border border-[#E8ECF2] bg-white py-1.5 shadow-lg z-30">
                  <button
                    type="button"
                    onClick={() => {
                      setCategoryMode('share');
                      setCategoryMenuOpen(false);
                    }}
                    className={`block w-full px-3.5 py-2 text-left text-xs ${
                      categoryMode === 'share'
                        ? 'font-semibold text-[#003B9E] bg-[#EFF6FF]'
                        : 'text-[#1E293B] hover:bg-[#F8FAFC]'
                    }`}
                  >
                    Show Volume Share (%)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCategoryMode('resolved');
                      setCategoryMenuOpen(false);
                    }}
                    className={`block w-full px-3.5 py-2 text-left text-xs ${
                      categoryMode === 'resolved'
                        ? 'font-semibold text-[#003B9E] bg-[#EFF6FF]'
                        : 'text-[#1E293B] hover:bg-[#F8FAFC]'
                    }`}
                  >
                    Show Resolution Rate (%)
                  </button>
                  <Link
                    to="/analytics"
                    onClick={() => setCategoryMenuOpen(false)}
                    className="block border-t border-[#EEF1F5] px-3.5 py-2 text-xs font-medium text-[#1E293B] hover:bg-[#F8FAFC]"
                  >
                    Open Full Reports →
                  </Link>
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 divide-y divide-[#F1F5F9] px-6 pb-5">
            {categoryBreakdown.map((item) => (
              <div key={item.category} className="py-3.5 first:pt-2 last:pb-1">
                <div className="grid grid-cols-12 items-center gap-3">
                  <div className="col-span-5 min-w-0">
                    <div className="text-[13px] font-medium text-[#1E293B] truncate">
                      {item.category}
                    </div>
                  </div>
                  <div className="col-span-7">
                    <div className="h-3.5 w-full overflow-hidden bg-[#F1F5F9]">
                      <div
                        className="h-full transition-[width] duration-300"
                        style={{
                          width: `${Math.max(item.pct, item.count > 0 ? 6 : 0)}%`,
                          backgroundColor: item.color,
                        }}
                      />
                    </div>
                    <div className="mt-1 flex items-center justify-between font-mono-tabular text-[11px] text-[#64748B]">
                      <span>{item.pct}%</span>
                      <span>
                        {categoryMode === 'share'
                          ? `${item.count} reports`
                          : `${item.resolvedCount}/${item.count} resolved`}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};
