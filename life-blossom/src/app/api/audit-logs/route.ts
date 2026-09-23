import { NextRequest } from "next/server";
import { withAuth, ok, paginated, err, getPagination } from "@/lib/api-utils";

const ADMIN_ROLES = ["admin"];

/**
 * GET /api/audit-logs
 *
 * Admin-only. Filterable by entity (table), entity id, user, role, action,
 * and created_at date range (ISO dates, inclusive of the 'to' day).
 */
export const GET = withAuth(async (req, supabase, authUserId) => {
  const sp = new URL(req.url).searchParams;

  const { data: caller } = await supabase
    .from("users")
    .select("role")
    .eq("id", authUserId)
    .single();
  if (!caller || !ADMIN_ROLES.includes(caller.role)) {
    return err("Only admins can view audit logs", 403);
  }

  const entityType = sp.get("entity_type");
  const entityId = sp.get("entity_id");
  const userId = sp.get("user_id");
  const role = sp.get("role");
  const action = sp.get("action");
  const from = sp.get("from");
  const to = sp.get("to");
  const { page, pageSize, from: offset, to: end } = getPagination(sp);

  let query = supabase
    .from("audit_logs")
    .select("*, user:users(id, first_name, last_name, email)", { count: "exact" });

  if (entityType) query = query.eq("entity_type", entityType);
  if (entityId) query = query.eq("entity_id", entityId);
  if (userId) query = query.eq("user_id", userId);
  if (role) query = query.eq("role", role);
  if (action) query = query.eq("action", action);
  if (from) query = query.gte("created_at", from);
  if (to) query = query.lte("created_at", `${to}T23:59:59.999Z`);

  const { data, error, count } = await query.order("created_at", { ascending: false }).range(offset, end);
  if (error) return err(error.message, 500);
  return paginated(data, count || 0, page, pageSize);
});
