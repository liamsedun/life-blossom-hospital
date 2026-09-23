import type { User } from "@/lib/api-types";

export type Role = "patient" | "admin" | "doctor" | "nurse" | "accountant" | "cashier" | "receptionist" | "lab_technician" | "pharmacist" | "radiographer" | "radiologist" | "student_staff" | "student_patient";

/** All staff roles (non-patient). */
export const STAFF_ROLES: Role[] = ["admin", "doctor", "nurse", "accountant", "cashier", "receptionist", "lab_technician", "pharmacist", "radiographer", "radiologist", "student_staff"];

/** Roles that have clinical data access. */
export const CLINICAL_ROLES: Role[] = ["admin", "doctor", "nurse"];

/** Roles that have billing/finance access. */
export const BILLING_ROLES: Role[] = ["admin", "accountant", "cashier"];

/** Roles that can manage users (create/update/delete). */
export const ADMIN_ROLES: Role[] = ["admin"];

/** View-only roles — can see everything but cannot create, edit, or delete. */
export const VIEW_ONLY_ROLES: Role[] = ["student_staff", "student_patient"];

export function hasRole(user: User | null, roles: Role[]): boolean {
  if (!user) return false;
  return roles.includes(user.role as Role);
}

export function isStaff(user: User | null): boolean {
  return hasRole(user, STAFF_ROLES);
}

export function isAdmin(user: User | null): boolean {
  return hasRole(user, ADMIN_ROLES);
}

export function isClinical(user: User | null): boolean {
  return hasRole(user, CLINICAL_ROLES);
}

/** Returns true if the user has a view-only role (student_staff, student_patient). */
export function isViewOnly(user: User | null): boolean {
  return hasRole(user, VIEW_ONLY_ROLES);
}

/** Get the default dashboard path for a given role. */
export function getDefaultPath(role: Role): string {
  switch (role) {
    case "patient":
    case "student_patient":
      return "/patient";
    default:
      return "/admin";
  }
}
