import { NextResponse } from "next/server";

const VIEW_ONLY_ROLES = ["student_staff", "student_patient"];

/**
 * Returns a 403 JSON response if the user has a view-only role.
 * Use in POST/PUT/DELETE API handlers:
 *   const blocked = rejectIfViewOnly(user.role);
 *   if (blocked) return blocked;
 */
export function rejectIfViewOnly(role?: string | null): NextResponse | null {
  if (!role || !VIEW_ONLY_ROLES.includes(role)) return null;
  return NextResponse.json(
    { success: false, error: "Your role does not have permission to perform this action." },
    { status: 403 },
  );
}
