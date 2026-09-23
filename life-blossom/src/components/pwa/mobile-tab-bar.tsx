"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  MessageSquare,
  Wallet,
  Receipt,
  Gift,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import type { UserRole } from "@/lib/api-types";

interface TabDef {
  label: string;
  href: string;
  icon: React.ElementType;
  roles: UserRole[];
}

const TABS: TabDef[] = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard, roles: ["admin", "doctor", "accountant"] },
  { label: "Appointment", href: "/admin/appointments", icon: CalendarDays, roles: ["admin", "doctor", "accountant", "nurse"] },
  { label: "Chat", href: "/admin/chats", icon: MessageSquare, roles: ["admin", "doctor", "accountant", "nurse"] },
  { label: "Billing", href: "/admin/billing", icon: Wallet, roles: ["admin", "doctor", "accountant", "nurse"] },
  { label: "Expenses", href: "/admin/expenses", icon: Receipt, roles: ["admin", "accountant"] },
  { label: "Other Income", href: "/admin/other-income", icon: Gift, roles: ["admin", "accountant"] },
];

function isTabActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin" || pathname === "/admin/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function MobileTabBar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const role = user?.role as UserRole | undefined;

  const tabs = TABS.filter((t) => !role || t.roles.includes(role));

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 lg:hidden border-t border-slate-200 dark:border-white/[0.06] bg-card backdrop-blur-xl pb-safe"
      aria-label="Mobile navigation"
    >
      <div className="flex items-stretch justify-around">
        {tabs.map((tab) => {
          const active = isTabActive(pathname, tab.href);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-label={tab.label}
              title={tab.label}
              className={cn(
                "relative flex flex-1 items-center justify-center py-3 transition-colors",
                active ? "text-[#e0a84a]" : "text-slate-400 hover:text-slate-700 dark:text-white/45 dark:hover:text-white/80"
              )}
            >
              {active && (
                <span className="absolute top-0 inset-x-0 h-0.5 rounded-full bg-gradient-to-r from-[#e0a84a]/0 via-[#e0a84a] to-[#e0a84a]/0" />
              )}
              <Icon className="size-6" strokeWidth={active ? 2.4 : 2} />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
