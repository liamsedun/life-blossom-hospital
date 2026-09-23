import type { UserRole } from "./api-types";

export interface NavItem {
  label: string;
  href: string;
  icon: string;
  roles: UserRole[];
  /** Module key used for DB permission checks */
  module?: string;
}

const ALL_STAFF: UserRole[] = ["admin", "doctor", "nurse", "accountant", "cashier", "receptionist", "lab_technician", "pharmacist", "radiographer", "radiologist", "student_staff"];

/** Module keys matching the role_permissions table */
export const MODULE_KEYS = [
  "dashboard", "patients", "appointments", "billing", "banks", "expenses", "other_income",
  "internal_mail", "live_chat", "staff", "reports", "security_audit", "settings", "roles", "profile",
] as const;

/**
 * Each nav item lists which roles can see it (fallback) and the module key for DB checks.
 */
export const NAV_ACCESS: NavItem[] = [
  { label: "Dashboard",       href: "/admin",              icon: "LayoutDashboard",  roles: ALL_STAFF, module: "dashboard" },
  { label: "Patients",        href: "/admin/patients",     icon: "Users",            roles: ALL_STAFF, module: "patients" },
  { label: "Appointments",    href: "/admin/appointments", icon: "CalendarDays",     roles: ALL_STAFF, module: "appointments" },
  { label: "Billing",         href: "/admin/billing",      icon: "Wallet",           roles: ["admin", "accountant", "cashier"], module: "billing" },
  { label: "Banks",           href: "/admin/banks",        icon: "Landmark",         roles: ["admin", "accountant", "cashier"], module: "banks" },
  { label: "Expenses",        href: "/admin/expenses",     icon: "Receipt",          roles: ["admin", "accountant"], module: "expenses" },
  { label: "Other Income",    href: "/admin/other-income", icon: "Gift",             roles: ["admin", "accountant"], module: "other_income" },
  { label: "Internal Mail",   href: "/admin/internal-mail",icon: "Mail",             roles: ALL_STAFF, module: "internal_mail" },
  { label: "Live Chat",       href: "/admin/chats",        icon: "MessageSquare",    roles: ALL_STAFF, module: "live_chat" },
  { label: "Staff",           href: "/admin/staff",        icon: "Stethoscope",      roles: ["admin"], module: "staff" },
  { label: "Reports",         href: "/admin/reports",      icon: "BarChart3",        roles: ["admin", "accountant"], module: "reports" },
  { label: "Security & Audit",href: "/admin/audit-logs",   icon: "ShieldCheck",      roles: ["admin"], module: "security_audit" },
  { label: "Roles & Permissions", href: "/admin/roles",    icon: "ShieldCheck",      roles: ["admin"], module: "roles" },
  { label: "Settings",        href: "/admin/settings",     icon: "Settings",         roles: ["admin"], module: "settings" },
  { label: "Profile",         href: "/admin/profile",      icon: "UserCircle",       roles: ALL_STAFF, module: "profile" },
];

/** Get nav items visible to a given role (hardcoded fallback) */
export function getNavForRole(role?: UserRole | null): NavItem[] {
  if (!role) return [];
  return NAV_ACCESS.filter((item) => item.roles.includes(role));
}

/** Check if a role has can_view for a module (from DB permissions) */
export function canModule(permissions: Array<{ module: string; can_view: boolean }>, module: string): boolean {
  const p = permissions.find((x) => x.module === module);
  return p ? p.can_view : false;
}

/** Filter nav items based on DB permissions */
export function getNavWithPermissions(permissions: Array<{ module: string; can_view: boolean }>): NavItem[] {
  return NAV_ACCESS.filter((item) => {
    if (!item.module) return true; // no module = always show
    return canModule(permissions, item.module);
  });
}

/** Roles that can access general admin (dashboard + most features) */
export const ADMIN_ROLES: UserRole[] = ["admin"];

/** Roles that are clinical staff (doctor / nurse) */
export const CLINICAL_ROLES: UserRole[] = ["doctor", "nurse"];

/** Roles that have full data visibility (can see all records) */
export const FULL_ACCESS_ROLES: UserRole[] = ["admin", "accountant"];