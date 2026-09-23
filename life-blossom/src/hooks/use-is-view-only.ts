import { useAuth } from "@/contexts/auth-context";
import { isViewOnly } from "@/lib/rbac";

/**
 * Returns true if the current user has a view-only role (student_staff, student_patient).
 * Use this to hide action buttons, create/edit/delete UI for these roles.
 */
export function useIsViewOnly(): boolean {
  const { user } = useAuth();
  return isViewOnly(user);
}
