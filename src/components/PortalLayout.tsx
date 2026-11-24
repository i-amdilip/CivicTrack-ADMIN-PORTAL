import React, { useMemo, useState } from 'react';
import {
  Activity,
  BarChart3,
  Bell,
  Building2,
  FileText,
  Gauge,
  Landmark,
  LayoutDashboard,
  LogOut,
  Map as MapIcon,
  Menu,
  Search,
  Settings,
  ShieldAlert,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { usePortal } from '../context/PortalContext';
import { hasPermission } from '../lib/rbac';
import { formatShortDate } from './StatusLabels';

interface NavItem {
  label: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  visible: boolean;
  matchPrefix?: boolean;
}

export const PortalLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    currentUser,
    directoryAccounts,
    notifications,
    settings,
    globalSearch,
    setGlobalSearch,
    toasts,
    dismissToast,
    signInAs,
    logout,
    markAllNotificationsRead,
  } = usePortal();

  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [quickPrefsOpen, setQuickPrefsOpen] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const navItems: NavItem[] = useMemo(() => {
    if (!currentUser) return [];
    const role = currentUser.role;
    return [
      {
        label: 'Dashboard',
        to: '/',
        icon: LayoutDashboard,
        visible: hasPermission(role, 'view_dashboard'),
      },
      {
        label: 'Live Monitoring',
        to: '/map',
        icon: MapIcon,
        visible: hasPermission(role, 'view_live_map'),
      },
      {
        label: 'Complaints',
        to: '/complaints',
        icon: FileText,
        visible: true,
        matchPrefix: true,
      },
      {
        label: 'Assign Cases',
        to: '/assign',
        icon: UserCheck,
        visible: hasPermission(role, 'assign_complaint'),
      },
      {
        label: 'Departments',
        to: '/departments',
        icon: Building2,
        visible: hasPermission(role, 'view_departments'),
      },
      {
        label: 'Officers & Staff',
        to: '/staff',
        icon: Users,
        visible: hasPermission(role, 'view_staff'),
      },
      {
        label: 'Reports',
        to: '/analytics',
        icon: BarChart3,
        visible: hasPermission(role, 'view_analytics'),
      },
      {
        label: 'Performance',
        to: '/performance',
        icon: Gauge,
        visible: hasPermission(role, 'view_performance'),
      },
      {
        label: 'Activity Logs',
        to: '/activity-logs',
        icon: Activity,
        visible: hasPermission(role, 'view_activity_logs'),
      },
      {
        label: 'User Management',
        to: '/users',
        icon: ShieldAlert,
        visible: hasPermission(role, 'manage_users'),
      },
      {
        label: 'Settings',
        to: '/settings',
        icon: Settings,
        visible: hasPermission(role, 'manage_settings'),
      },
    ].filter((i) => i.visible);
  }, [currentUser]);

  const pageHeading = useMemo(() => {
    const p = location.pathname;
    if (p === '/') return 'Overview';
    if (p === '/complaints') return 'Complaints';
    if (p === '/complaints/new') return 'New Complaints';
    if (p === '/complaints/pending') return 'Pending Complaints';
    if (p === '/complaints/in-progress') return 'In Progress';
    if (p === '/complaints/resolved') return 'Resolved Archive';
    if (p === '/complaints/escalated') return 'Escalated & SLA';
    if (p.startsWith('/complaints/')) {
      return `Complaint ${p.replace('/complaints/', '')}`;
    }
    if (p === '/assign') return 'Assign Cases';
    if (p === '/map') return 'Live Monitoring';
    if (p === '/departments') return 'Departments';
    if (p === '/staff') return 'Officers & Staff';
    if (p === '/analytics') return 'Reports';
    if (p === '/performance') return 'Performance';
    if (p === '/activity-logs') return 'Activity Logs';
    if (p === '/users') return 'User Management';
    if (p === '/settings') return 'Settings';
    return 'Overview';
  }, [location.pathname]);

  const handleGlobalSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!location.pathname.startsWith('/complaints')) {
      navigate('/complaints');
    }
  };

  const handleSidebarToggle = () => {
    if (window.innerWidth < 1024) {
      setMobileMenuOpen((v) => !v);
    } else {
      setSidebarCollapsed((v) => !v);
    }
  };

  const handleSettingsClick = () => {
    setNotifOpen(false);
    setProfileOpen(false);
    if (currentUser && hasPermission(currentUser.role, 'manage_settings')) {
      navigate('/settings');
    } else {
      setQuickPrefsOpen((v) => !v);
    }
  };

  const renderSidebar = (isMobileDrawer = false) => {
    const compact = !isMobileDrawer && sidebarCollapsed;
    return (
      <div className="flex h-full flex-col bg-[#003B9E] text-white select-none">
        {/* Brand Emblem Header */}
        <div
          className={`flex items-center ${
            compact ? 'justify-center px-2' : 'justify-between px-5'
          } pt-6 pb-5 shrink-0`}
        >
          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-3 min-w-0"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-[#FACC15]/85 bg-[#00286E] shadow-sm shrink-0">
              <Landmark className="h-5 w-5 text-[#FACC15]" />
            </div>
            {!compact && (
              <span className="text-[19px] font-bold tracking-tight text-white truncate">
                CivicTrack
              </span>
            )}
          </Link>
          {isMobileDrawer && (
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-lg p-1.5 text-white/80 hover:bg-white/10 hover:text-white lg:hidden"
              aria-label="Close navigation menu"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Navigation Links */}
        <nav
          className="flex-1 overflow-y-auto overflow-x-hidden py-2 space-y-1"
          aria-label="Portal Navigation"
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const isComplaintsActive =
              item.matchPrefix && location.pathname.startsWith('/complaints');
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={!item.matchPrefix}
                title={compact ? item.label : undefined}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) => {
                  const active = isActive || Boolean(isComplaintsActive);
                  if (compact) {
                    return `mx-2.5 flex items-center justify-center rounded-xl py-2.5 transition-colors ${
                      active
                        ? 'bg-[#F3F5F8] text-[#003B9E]'
                        : 'text-white/80 hover:bg-white/10 hover:text-white'
                    }`;
                  }
                  return `relative ml-4 flex items-center gap-3.5 rounded-l-full py-2.5 pl-5 pr-4 text-[13.5px] transition-colors whitespace-nowrap ${
                    active
                      ? 'bg-[#F3F5F8] font-semibold text-[#1E293B]'
                      : 'font-medium text-white/85 hover:bg-white/10 hover:text-white'
                  }`;
                }}
              >
                {({ isActive }) => {
                  const active = isActive || Boolean(isComplaintsActive);
                  return (
                    <>
                      {active && !compact && (
                        <>
                          <span
                            aria-hidden="true"
                            className="pointer-events-none absolute -top-4 right-0 hidden h-4 w-4 rounded-br-2xl shadow-[6px_6px_0_0_#F3F5F8] lg:block"
                          />
                          <span
                            aria-hidden="true"
                            className="pointer-events-none absolute -bottom-4 right-0 hidden h-4 w-4 rounded-tr-2xl shadow-[6px_-6px_0_0_#F3F5F8] lg:block"
                          />
                        </>
                      )}
                      <Icon
                        className={`h-[18px] w-[18px] shrink-0 ${
                          active ? 'text-[#003B9E]' : 'text-white/85'
                        }`}
                      />
                      {!compact && <span className="truncate">{item.label}</span>}
                    </>
                  );
                }}
              </NavLink>
            );
          })}
        </nav>

        {/* Bottom Logout */}
        <div className="shrink-0 pb-6 pt-3">
          <button
            type="button"
            onClick={logout}
            title={compact ? 'Logout' : undefined}
            className={
              compact
                ? 'mx-2.5 flex w-[calc(100%-20px)] items-center justify-center rounded-xl py-2.5 text-white/85 hover:bg-white/10 hover:text-white transition-colors'
                : 'ml-4 flex w-[calc(100%-16px)] items-center gap-3.5 rounded-l-full py-2.5 pl-5 pr-4 text-[13.5px] font-medium text-white/85 hover:bg-white/10 hover:text-white transition-colors whitespace-nowrap'
            }
          >
            <LogOut className="h-[18px] w-[18px] shrink-0" />
            {!compact && <span>Logout</span>}
          </button>
        </div>
      </div>
    );
  };

  const userInitials = currentUser
    ? currentUser.name
        .split(' ')
        .map((p) => p[0])
        .slice(0, 2)
        .join('')
    : 'CT';

  return (
    <div className="flex min-h-screen bg-[#003B9E] text-[#1E293B]">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:block lg:shrink-0 lg:sticky lg:top-0 lg:h-screen transition-[width] duration-200 ${
          sidebarCollapsed ? 'lg:w-[72px]' : 'lg:w-[228px]'
        }`}
      >
        {renderSidebar(false)}
      </aside>

      {/* Mobile Sidebar Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <div
            className="fixed inset-0 bg-[#0F172A]/45"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative z-50 w-64 max-w-[80vw] h-full shadow-xl">
            {renderSidebar(true)}
          </aside>
        </div>
      )}

      {/* Main Content Canvas (Curved left edge matching mockup) */}
      <div className="flex flex-1 flex-col min-w-0 bg-[#F3F5F8] lg:rounded-l-[28px] overflow-x-hidden">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 bg-[#F3F5F8]/95 backdrop-blur-sm px-5 sm:px-7 pt-4 pb-3">
          <div className="mx-auto flex w-full max-w-[1440px] items-center justify-between gap-4">
            {/* Left: Menu Toggle + Page Title + Search Input */}
            <div className="flex items-center gap-4 min-w-0 flex-1">
              <button
                type="button"
                onClick={handleSidebarToggle}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-[#1E293B] hover:bg-[#E7EAEF] transition-colors shrink-0"
                aria-label="Toggle navigation sidebar"
              >
                <Menu className="h-5 w-5" />
              </button>

              <h1 className="text-[18px] font-semibold tracking-tight text-[#1E293B] whitespace-nowrap truncate">
                {pageHeading}
              </h1>

              <form
                onSubmit={handleGlobalSearchSubmit}
                className="hidden md:flex items-center relative ml-2 flex-1 max-w-xs lg:max-w-sm"
              >
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]" />
                <input
                  type="search"
                  value={globalSearch}
                  onChange={(e) => setGlobalSearch(e.target.value)}
                  placeholder="Search"
                  aria-label="Global complaint search"
                  className="w-full rounded-lg bg-[#E6E9EF] py-2 pl-10 pr-4 text-[13px] text-[#1E293B] placeholder:text-[#64748B] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#003B9E]/20 transition-colors"
                />
              </form>
            </div>

            {/* Right: Notification Bell, Settings Icon, Official Profile Dropdown */}
            <div className="flex items-center gap-2.5 sm:gap-3.5 shrink-0">
              {/* Notifications Bell */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setNotifOpen((v) => !v);
                    setProfileOpen(false);
                    setQuickPrefsOpen(false);
                  }}
                  className="relative flex h-9 w-9 items-center justify-center rounded-full text-[#1E293B] hover:bg-[#E7EAEF] transition-colors"
                  aria-label="Notifications"
                >
                  <Bell className="h-[19px] w-[19px]" />
                  {unreadCount > 0 && (
                    <span className="absolute right-0.5 top-0.5 flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-[#FACC15] px-1 font-mono-tabular text-[10px] font-bold text-[#1E293B] shadow-xs">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {notifOpen && (
                  <div className="absolute right-0 mt-2 w-80 rounded-xl border border-[#E8ECF2] bg-white shadow-[0_10px_30px_rgba(15,23,42,0.1)] z-40 overflow-hidden">
                    <div className="flex items-center justify-between border-b border-[#EEF1F5] px-4 py-3">
                      <span className="text-xs font-semibold text-[#1E293B]">
                        Operational Notifications
                      </span>
                      <button
                        type="button"
                        onClick={markAllNotificationsRead}
                        className="text-[11px] font-semibold text-[#003B9E] hover:underline"
                      >
                        Mark all read
                      </button>
                    </div>
                    <div className="max-h-72 divide-y divide-[#EEF1F5] overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="px-4 py-6 text-center text-xs text-[#64748B]">
                          No active notifications for your scope.
                        </div>
                      ) : (
                        notifications.map((n) => (
                          <button
                            key={n.id}
                            type="button"
                            onClick={() => {
                              setNotifOpen(false);
                              if (n.complaintId) navigate(`/complaints/${n.complaintId}`);
                            }}
                            className={`block w-full px-4 py-3 text-left hover:bg-[#F8FAFC] transition-colors ${
                              !n.read ? 'bg-[#EFF6FF]/60' : ''
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span
                                className={`text-xs font-semibold ${
                                  n.severity === 'critical'
                                    ? 'text-[#DC2626]'
                                    : n.severity === 'warning'
                                    ? 'text-[#D97706]'
                                    : 'text-[#1E293B]'
                                }`}
                              >
                                {n.title}
                              </span>
                              <span className="text-[10px] text-[#64748B] whitespace-nowrap">
                                {formatShortDate(n.createdAt)}
                              </span>
                            </div>
                            <p className="mt-1 text-[11px] text-[#64748B] line-clamp-2">
                              {n.detail}
                            </p>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Settings Icon Button */}
              <div className="relative">
                <button
                  type="button"
                  onClick={handleSettingsClick}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-[#1E293B] hover:bg-[#E7EAEF] transition-colors"
                  aria-label="Portal Settings"
                  title="Portal Settings"
                >
                  <Settings className="h-[19px] w-[19px]" />
                </button>

                {quickPrefsOpen && (
                  <div className="absolute right-0 mt-2 w-72 rounded-xl border border-[#E8ECF2] bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.1)] z-40">
                    <div className="text-xs font-semibold text-[#1E293B]">
                      Authority & SLA Policy
                    </div>
                    <p className="mt-1 text-[11px] text-[#64748B]">
                      {settings.municipalityName} · {settings.administrativeRegion}
                    </p>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                      <div className="rounded-lg bg-[#F8FAFC] px-2.5 py-1.5">
                        <span className="text-[#64748B]">Critical SLA: </span>
                        <span className="font-mono-tabular font-semibold text-[#1E293B]">
                          {settings.slaHours.Critical}h
                        </span>
                      </div>
                      <div className="rounded-lg bg-[#F8FAFC] px-2.5 py-1.5">
                        <span className="text-[#64748B]">High SLA: </span>
                        <span className="font-mono-tabular font-semibold text-[#1E293B]">
                          {settings.slaHours.High}h
                        </span>
                      </div>
                    </div>
                    <p className="mt-2.5 text-[11px] text-[#64748B]">
                      System configuration edits require Super Admin authorization.
                    </p>
                  </div>
                )}
              </div>

              {/* Official Profile & Role Switcher */}
              {currentUser && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setProfileOpen((v) => !v);
                      setNotifOpen(false);
                      setQuickPrefsOpen(false);
                    }}
                    className="flex items-center gap-2.5 rounded-full py-1 pl-1 pr-2 text-left hover:bg-[#E7EAEF]/70 transition-colors"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#003B9E] text-xs font-bold text-white ring-2 ring-white shadow-xs shrink-0">
                      {userInitials}
                    </div>
                    <div className="hidden sm:block leading-tight">
                      <div className="text-[13px] font-semibold text-[#1E293B] whitespace-nowrap">
                        {currentUser.name}
                      </div>
                      <div className="text-[11px] text-[#64748B] whitespace-nowrap">
                        {currentUser.role === 'Super Admin' ? 'Admin' : currentUser.role}
                      </div>
                    </div>
                  </button>

                  {profileOpen && (
                    <div className="absolute right-0 mt-2 w-72 rounded-xl border border-[#E8ECF2] bg-white shadow-[0_10px_30px_rgba(15,23,42,0.1)] z-40 overflow-hidden">
                      <div className="border-b border-[#EEF1F5] px-4 py-3">
                        <div className="text-xs font-semibold text-[#1E293B]">
                          {currentUser.name}
                        </div>
                        <div className="text-[11px] text-[#64748B]">
                          {currentUser.employeeId} · {currentUser.role}
                        </div>
                        <div className="text-[11px] text-[#64748B]">{currentUser.email}</div>
                      </div>

                      <div className="border-b border-[#EEF1F5] px-4 py-2.5">
                        <div className="mb-1.5 text-[11px] font-semibold text-[#64748B]">
                          Switch Active Official Role
                        </div>
                        <div className="space-y-1">
                          {directoryAccounts.map((acc) => (
                            <button
                              key={acc.id}
                              type="button"
                              onClick={() => {
                                setProfileOpen(false);
                                signInAs(acc.id);
                                navigate('/');
                              }}
                              className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors ${
                                acc.id === currentUser.id
                                  ? 'bg-[#EFF6FF] font-semibold text-[#003B9E]'
                                  : 'text-[#1E293B] hover:bg-[#F8FAFC]'
                              }`}
                            >
                              <span className="truncate">{acc.role}</span>
                              <span className="ml-2 text-[10px] text-[#64748B] truncate">
                                {acc.name}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="p-2">
                        <button
                          type="button"
                          onClick={() => {
                            setProfileOpen(false);
                            logout();
                          }}
                          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-[#DC2626] hover:bg-[#FEF2F2] transition-colors"
                        >
                          <LogOut className="h-3.5 w-3.5" />
                          <span>Sign Out of Portal</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Body */}
        <main className="flex-1 px-5 pb-8 pt-2 sm:px-7">
          <div className="mx-auto w-full max-w-[1440px]">{children}</div>
        </main>
      </div>

      {/* Toast Notifications */}
      {toasts.length > 0 && (
        <div className="fixed bottom-4 right-4 z-50 flex w-80 flex-col gap-2">
          {toasts.map((t) => (
            <div
              key={t.id}
              className={`flex items-start justify-between gap-2 rounded-xl border bg-white p-3.5 shadow-lg ${
                t.type === 'error'
                  ? 'border-[#FCA5A5]'
                  : t.type === 'success'
                  ? 'border-[#86EFAC]'
                  : 'border-[#BFDBFE]'
              }`}
            >
              <div className="min-w-0">
                <div
                  className={`text-xs font-semibold ${
                    t.type === 'error'
                      ? 'text-[#DC2626]'
                      : t.type === 'success'
                      ? 'text-[#16A34A]'
                      : 'text-[#003B9E]'
                  }`}
                >
                  {t.title}
                </div>
                {t.message && <p className="mt-0.5 text-[11px] text-[#64748B]">{t.message}</p>}
              </div>
              <button
                type="button"
                onClick={() => dismissToast(t.id)}
                className="text-[#64748B] hover:text-[#1E293B]"
                aria-label="Dismiss message"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
