import { NextRequest } from "next/server";
import { withAuth, ok, paginated, err, parseBody, getPagination, ValidationError, resolveOrgId } from "@/lib/api-utils";
import { createServiceClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";

export const GET = withAuth(async (req, supabase, authUserId) => {
  const sp = new URL(req.url).searchParams;
  const department = sp.get("department");
  const is_available = sp.get("is_available");
  const role = sp.get("role");
  const { page, pageSize, from, to } = getPagination(sp);

  const svc = createServiceClient();

  // If caller is a patient, return only public fields (name, specialty, department)
  const { data: caller } = await supabase.from("users").select("role").eq("id", authUserId).single();
  const isPatientCaller = caller?.role === "patient";

  if (isPatientCaller) {
    let query = svc
      .from("staff")
      .select("id, employee_code, role, specialty, department_id, is_active, user:users!inner(id, first_name, last_name)",
        { count: "exact" });

    if (role) {
      const roles = role.split(",").map((r) => r.trim()).filter(Boolean);
      if (roles.length === 1) query = query.eq("role", roles[0]);
      else if (roles.length > 1) query = query.in("role", roles);
    }
    if (department) query = query.eq("department_id", department);
    if (is_available !== null) query = query.eq("is_active", is_available === "true");

    const { data, error, count } = await query.order("created_at", { ascending: false }).range(from, to);
    if (error) return err(error.message, 500);
    return paginated(data, count || 0, page, pageSize);
  }

  let query = svc
    .from("staff")
    .select("*, user:users(id, org_id, email, role, first_name, last_name, phone, avatar_url, is_active)",
      { count: "exact" });

  if (role) {
    const roles = role.split(",").map((r) => r.trim()).filter(Boolean);
    if (roles.length === 1) query = query.eq("role", roles[0]);
    else if (roles.length > 1) query = query.in("role", roles);
  }
  if (department) query = query.eq("department_id", department);
  if (is_available !== null) query = query.eq("is_active", is_available === "true");

  const { data, error, count } = await query.order("created_at", { ascending: false }).range(from, to);
  if (error) return err(error.message, 500);
  return paginated(data, count || 0, page, pageSize);
});

export const POST = withAuth(async (req, supabase, authUserId) => {
  const body = await parseBody<{
    email: string; password: string; first_name: string; last_name: string;
    phone?: string; role: string; specialization?: string; license_number?: string;
    department?: string; qualification?: string; employment_type?: string;
  }>(req);

  if (!body.email || !body.password || !body.first_name || !body.last_name || !body.role) {
    throw new ValidationError("Missing required fields: email, password, first_name, last_name, role");
  }
  const ALL_STAFF_ROLES = ["doctor", "nurse", "admin", "accountant", "cashier", "receptionist", "lab_technician", "pharmacist", "radiographer", "radiologist"];
  if (!ALL_STAFF_ROLES.includes(body.role)) {
    throw new ValidationError(`Invalid role. Must be one of: ${ALL_STAFF_ROLES.join(", ")}`);
  }

  // Check caller's role - only admin can create admin
  const { data: caller } = await supabase.from("users").select("role").eq("id", authUserId).single();
  const callerRole = caller?.role;
  if (body.role === "admin" && callerRole !== "admin") {
    throw new ValidationError("Only admin can create admin users");
  }

  const svc = createServiceClient();

  // Get org_id
  const orgId = await resolveOrgId(supabase, authUserId);
  if (!orgId) return err("User profile not found", 404);

  // ── Check for an existing user with this email BEFORE creating one ──
  // A previous failed attempt may have left an auth user + users row with no
  // staff row. In that case, complete the registration instead of erroring.
  let newUserId = "";
  const { data: existingUser } = await svc
    .from("users")
    .select("id, email")
    .eq("email", body.email)
    .maybeSingle();

  if (existingUser) {
    const { data: existingStaff } = await svc
      .from("staff")
      .select("id, employee_code")
      .eq("user_id", existingUser.id)
      .maybeSingle();

    if (existingStaff) {
      return err(`A staff member with email ${body.email} already exists (${existingStaff.employee_code})`, 409);
    }
    // Orphaned user (auth + profile exist, no staff record) — reuse this user
    // but update password + confirm email so the new credentials work immediately
    newUserId = existingUser.id;
    await svc.auth.admin.updateUserById(newUserId, { password: body.password, email_confirm: true }).catch(() => {});
  } else {
    // Create auth user (use service admin so we bypass signup rate limits)
    const { data: authData, error: signUpError } = await svc.auth.admin.createUser({
      email: body.email, password: body.password, email_confirm: true,
    });
    if (signUpError) return err(signUpError.message, 400);
    if (!authData.user) return err("Failed to create auth user", 500);
    newUserId = authData.user.id;
  }

  // Create/upsert user record (handles both fresh and orphaned users)
  const { error: userError } = await svc.from("users").upsert({
    id: newUserId, org_id: orgId, email: body.email,
    role: body.role, first_name: body.first_name, last_name: body.last_name,
    phone: body.phone || null, password_hash: "",
  }, { onConflict: "id" });
  if (userError) return err(userError.message, 500);

  // Generate employee code
  const { count } = await supabase.from("staff").select("id", { count: "exact", head: true });
  const employeeCode = `STF-${String((count || 0) + 1).padStart(4, "0")}`;

  const { data, error } = await svc.from("staff").insert({
    id: newUserId, org_id: orgId, user_id: newUserId, employee_code: employeeCode,
    first_name: body.first_name, last_name: body.last_name,
    role: body.role, email: body.email,
    specialty: body.specialization || null, phone: body.phone || null,
    title: body.specialization || null,
    is_active: true,
  }).select("*, user:users(id, org_id, email, role, first_name, last_name, phone, avatar_url, is_active)").single();

  if (error) return err(error.message, 500);
  logAudit(req, authUserId, { action: "create", entityType: "staff", entityId: data.id, description: `Created staff member ${employeeCode}` }).catch(() => {});
  return ok(data, 201);
});
