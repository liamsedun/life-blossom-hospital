"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  Wallet,
  Stethoscope,
  BarChart3,
  Settings,
  UserCircle,
  Receipt,
  Gift,
  Menu,
  X,
  Bell,
  ChevronDown,
  LogOut,
  CheckCheck,
  Mail,
  MessageSquare,
  ShieldCheck,
  Landmark,
} from "lucide-react";
import { cn, formatDate, formatTime } from "@/lib/utils";
import Logo from "@/components/ui/logo";
import { Button } from "@/components/ui/button";

import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/auth-context";
import { getNavForRole, getNavWithPermissions } from "@/lib/role-access";
import type { UserRole } from "@/lib/api-types";
import IdleLogout from "@/components/ui/IdleLogout";
import MobileTabBar from "@/components/pwa/mobile-tab-bar";
import ThemeToggle from "@/components/ui/theme-toggle";
import { usePushNotifications } from "@/contexts/notification-context";

interface NotificationItem {
  id: string;
  title: string;
  body: string | null;
  type: string;
  is_read: boolean;
  link?: string | null;
  created_at: string;
}

const ICON_MAP: Record<string, React.ElementType> = {
  LayoutDashboard, Users, CalendarDays, Wallet, Receipt, Gift,
  Mail, MessageSquare, Stethoscope, BarChart3, Settings, UserCircle, ShieldCheck, Landmark,
};

function getVisibleNav(role?: UserRole | null, permissions?: Array<{ module: string; can_view: boolean }> | null) {
  const base = permissions && permissions.length > 0
    ? getNavWithPermissions(permissions)
    : getNavForRole(role);
  return base.map((item) => ({
    label: item.label,
    href: item.href,
    icon: ICON_MAP[item.icon] || LayoutDashboard,
  }));
}

function NotificationDropdown() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const { supported, isSubscribed, subscribe, unsubscribe } = usePushNotifications();

  useEffect(() => {
    const fetchNotifs = () =>
      fetch("/api/notifications?page_size=10&unread_only=true")
        .then((r) => r.json())
        .then((json) => {
          if (json.success) {
            setNotifications(json.data || []);
            setUnreadCount((json.data || []).filter((n: NotificationItem) => !n.is_read).length);
          }
        })
        .catch(() => {});
    fetchNotifs();
    const id = setInterval(fetchNotifs, 60_000);
    return () => clearInterval(id);
  }, []);

  const markAllRead = async () => {
    try {
      await fetch("/api/notifications", { method: "PUT" });
      setNotifications([]);
      setUnreadCount(0);
    } catch {}
  };

  const dismiss = (n: NotificationItem) => {
    fetch(`/api/notifications/${n.id}`, { method: "DELETE" }).catch(() => {});
    setNotifications((prev) => prev.filter((x) => x.id !== n.id));
    setUnreadCount((c) => Math.max(0, c - 1));
    if (n.link) window.location.href = n.link;
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon"
          className="relative text-slate-400 hover:text-slate-900 hover:bg-slate-100 dark:text-white/50 dark:hover:text-white dark:hover:bg-white/[0.06] transition-all">
          <Bell className="size-[18px]" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-gradient-to-br from-[#e0a84a] to-amber-500 text-[10px] font-bold text-[#0a0f1a]">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 border-slate-200 dark:border-white/[0.06] bg-white dark:bg-[#0d1322]/95 backdrop-blur-xl text-slate-700 dark:text-white/80 max-h-[400px] overflow-y-auto">
        {/* Push notification toggle */}
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-200 dark:border-white/[0.06]">
          <span className="text-[11px] font-medium text-slate-500 dark:text-white/60">Push notifications</span>
          {supported ? (
            <button
              onClick={() => isSubscribed ? unsubscribe() : subscribe()}
              className={cn(
                "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
                isSubscribed ? "bg-[#e0a84a]" : "bg-slate-300 dark:bg-white/20"
              )}
            >
              <span className={cn(
                "inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform",
                isSubscribed ? "translate-x-4.5" : "translate-x-0.5"
              )} />
            </button>
          ) : (
            <span className="text-[10px] text-slate-400 dark:text-white/30">N/A</span>
          )}
        </div>

        {/* Notification list header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200 dark:border-white/[0.06]">
          <span className="text-xs font-medium text-slate-500 dark:text-white/60">Notifications</span>
          {unreadCount > 0 && (
            <button onClick={markAllRead}
              className="text-[10px] text-[#e0a84a] hover:text-[#e0a84a]/80 flex items-center gap-1">
              <CheckCheck className="size-3" /> Mark all read
            </button>
          )}
        </div>
        {notifications.length === 0 ? (
          <div className="px-4 py-8 text-center text-xs text-slate-400 dark:text-white/40">No unread notifications</div>
        ) : (
          notifications.map((n) => (
            <DropdownMenuItem
              key={n.id}
              onClick={() => dismiss(n)}
              className="flex flex-col items-start gap-0.5 px-3 py-2.5 border-b border-slate-100 dark:border-white/[0.04] last:border-0 cursor-pointer bg-slate-50 dark:bg-white/[0.03]"
            >
              <div className="flex items-start gap-2 w-full">
                <Mail className="size-3.5 mt-0.5 shrink-0 text-[#e0a84a]" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs leading-tight text-slate-900 dark:text-white font-medium">
                    {n.title}
                  </p>
                  {n.body && (
                    <p className="text-[11px] text-slate-500 dark:text-white/40 mt-0.5 line-clamp-2">{n.body}</p>
                  )}
                  <p className="text-[10px] text-slate-400 dark:text-white/30 mt-1">
                    {formatDate(n.created_at)} at {formatTime(n.created_at)}
                  </p>
                </div>
              </div>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [permissions, setPermissions] = useState<Array<{ module: string; can_view: boolean }>>([]);
  const navItems = React.useMemo(() => getVisibleNav(user?.role as UserRole | null, permissions), [user?.role, permissions]);

  // Redirect unauthenticated users to staff login
  useEffect(() => {
    if (!loading && !user) {
      // Give auth context time to settle after navigation
      const t = setTimeout(() => {
        if (!user) router.replace("/staff-login");
      }, 2000);
      return () => clearTimeout(t);
    }
  }, [loading, user]);

  // Fetch DB permissions for the current user's role
  useEffect(() => {
    if (!user?.role || user.role === "patient") return;
    fetch(`/api/role-permissions?role=${encodeURIComponent(user.role)}`)
      .then((r) => r.json())
      .then((json) => { if (json.success && json.data) setPermissions(json.data); })
      .catch(() => {});
  }, [user?.role]);

  return (
    <div className="relative flex h-screen-safe overflow-hidden bg-slate-50 dark:bg-[#0a0f1a]">
      {/* Full-screen background gradient — extends behind status bar */}
      <div className="fixed inset-0 bg-gradient-to-br from-slate-50 via-slate-50 to-slate-100 dark:from-[#0a0f1a] dark:via-[#0d1322] dark:to-[#0f1a2e] -z-10" />
      <IdleLogout />
      <div className="fixed inset-0 bg-[url('/grid.svg')] opacity-[0.03] pointer-events-none dark:opacity-[0.03] opacity-0 -z-10" />

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-[260px] flex-col border-r border-slate-200 dark:border-white/[0.06] bg-white dark:bg-[#0d1322]/90 backdrop-blur-xl transition-transform duration-300 lg:static lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center border-b border-slate-200 dark:border-white/[0.06] px-6">
          <Logo variant="inline" iconSize={28} textClass="text-slate-900 dark:text-white" subtitleClass="text-slate-500 dark:text-white/80" />
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {navItems.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  active
                    ? "text-[#e0a84a] dark:text-white"
                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-white/50 dark:hover:text-white/80 dark:hover:bg-white/[0.04]"
                )}
              >
                {active && (
                  <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#e0a84a]/10 via-[#e0a84a]/5 to-transparent border border-[#e0a84a]/20 dark:from-[#e0a84a]/20 dark:via-[#e0a84a]/10" />
                )}
                <span className={cn(
                  "relative z-10 flex items-center justify-center size-[18px] shrink-0 transition-transform duration-200",
                  active && "group-hover:scale-110"
                )}>
                  <Icon className="size-[18px]" />
                </span>
                <span className="relative z-10">{item.label}</span>
                {active && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 rounded-full bg-gradient-to-b from-[#e0a84a] to-[#e0a84a]/60" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-slate-200 dark:border-white/[0.06] p-4">
          <Link
            href="/admin/profile"
            className="flex items-center gap-3 rounded-xl p-2 -m-2 hover:bg-slate-100 dark:hover:bg-white/[0.04] transition-colors cursor-pointer"
          >
            <div className="relative shrink-0">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#e0a84a]/40 to-[#e0a84a]/10 blur-sm" />
              <Avatar size="sm" className="relative ring-2 ring-[#e0a84a]/30">
                <AvatarImage src={user?.avatar_url || ""} alt={user?.first_name || "User"} />
                <AvatarFallback className="text-xs bg-slate-100 dark:bg-[#1a2540] text-[#e0a84a] font-semibold">
                  {user ? `${user.first_name[0]}${user.last_name[0]}` : "U"}
                </AvatarFallback>
              </Avatar>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 dark:text-white/90 truncate">
                {user ? `${user.first_name} ${user.last_name}` : "Loading..."}
              </p>
              <Badge variant="default" className="mt-0.5 text-[10px] px-1.5 py-0 capitalize bg-slate-100 dark:bg-white/[0.06] text-slate-500 dark:text-white/60 border-none">
                {user?.role?.replace("_", " ") || ""}
              </Badge>
            </div>
          </Link>
        </div>
      </aside>

      <div className="flex flex-1 flex-col min-w-0">
        <header className="flex shrink-0 items-center gap-4 border-b border-slate-200 dark:border-white/[0.06] bg-white/80 dark:bg-[#0d1322]/60 backdrop-blur-xl lg:px-6">
          <div className="pt-safe w-full">
            <div className="flex items-center gap-4 h-16 px-4 lg:px-0">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden -ml-1 p-1 text-slate-400 hover:text-slate-900 dark:text-white/50 dark:hover:text-white transition-colors"
              >
                <Menu className="size-5" />
              </button>

              <div className="flex items-center gap-2 ml-auto">
                <ThemeToggle />
                <NotificationDropdown />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-xl p-1.5 text-sm text-slate-700 dark:text-white/80 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-all">
                  <div className="relative">
                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#e0a84a]/30 to-transparent blur-[2px]" />
                    <Avatar size="sm" className="relative ring-1 ring-slate-200 dark:ring-white/10">
                      <AvatarImage src={user?.avatar_url || ""} alt={user?.first_name || "User"} />
                      <AvatarFallback className="text-xs bg-slate-100 dark:bg-[#1a2540] text-[#e0a84a] font-semibold">
                        {user ? `${user.first_name[0]}${user.last_name[0]}` : "U"}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <span className="hidden md:inline text-sm font-medium">
                    {user ? user.first_name : "User"}
                  </span>
                  <ChevronDown className="size-4 text-slate-400 dark:text-white/40 hidden md:block" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 border-slate-200 dark:border-white/[0.06] bg-white dark:bg-[#0d1322]/95 backdrop-blur-xl text-slate-700 dark:text-white/80">
                <DropdownMenuItem onClick={() => router.push("/admin/profile")} className="hover:bg-slate-100 dark:hover:bg-white/[0.06] hover:text-slate-900 dark:hover:text-white">
                  <UserCircle className="size-4 mr-2" />Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push("/admin/settings")} className="hover:bg-slate-100 dark:hover:bg-white/[0.06] hover:text-slate-900 dark:hover:text-white">
                  <Settings className="size-4 mr-2" />Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-slate-200 dark:bg-white/[0.06]" />
                <DropdownMenuItem
                  className="text-red-500 hover:bg-red-50 dark:hover:bg-white/[0.06] hover:text-red-600 dark:hover:text-red-300"
                  onClick={async () => {
                    await logout("/staff-login");
                  }}
                >
                  <LogOut className="size-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6 pb-20 lg:pb-6">{children}</main>
      </div>

      {/* Mobile / tablet bottom tab bar (icons only, PWA) */}
      <MobileTabBar />
    </div>
  );
}
