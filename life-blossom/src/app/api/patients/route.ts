import { NextRequest } from "next/server";
import { withAuth, ok, paginated, err, parseBody, getPagination, ValidationError, resolvePatientId, resolveOrgId } from "@/lib/api-utils";
import { createServiceClient } from "@/lib/supabase/server";
import { getOrgSettings, generatePatientNumber } from "@/lib/org-settings";
import { logAudit, logView } from "@/lib/audit";

// GET /api/patients — list patients (patient sees only own, staff sees all in org)
export const GET = withAuth(async (req, supabase, authUserId) => {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search");
  const { page, pageSize, from, to } = getPagination(searchParams);

  // If caller is a patient, return only their own record
  const myPatientId = searchParams.get("patient_id") || await resolvePatientId(supabase, authUserId);
  if (myPatientId) {
    const { data, error } = await supabase
      .from("patients")
      .select("*, user:users(id, org_id, email, role, first_name, last_name, phone, avatar_url, is_active)")
      .eq("id", myPatientId)
      .maybeSingle();

    if (error) return err(error.message, 500);
    if (data) await logView(req, authUserId, "patients", data.id, "Viewed own patient profile");
    return paginated(data ? [data] : [], data ? 1 : 0, page, pageSize);
  }

  let countQuery = supabase.from("patients").select("*", { count: "exact", head: true });
  let dataQuery = supabase
    .from("patients")
    .select("*, user:users(id, org_id, email, role, first_name, last_name, phone, avatar_url, is_active)");

  if (search) {
    const like = `%${search}%`;
    const filter = `user.first_name.ilike.${like},user.last_name.ilike.${like},patient_number.ilike.${like}`;
    countQuery = countQuery.or(filter);
    dataQuery = dataQuery.or(filter);
  }

  const { count: total } = await countQuery;
  if (total === null) return err("Failed to count", 500);

  const { data, error } = await dataQuery
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) return err(error.message, 500);
  return paginated(data, total, page, pageSize);
});

// POST /api/patients — create patient (auth user + profile). RLS requires staff role.
export const POST = withAuth(async (req, supabase, authUserId) => {
  const body = await parseBody<any>(req);

  const { email, password, first_name, last_name } = body;
  if (!email || !password || !first_name || !last_name) {
    throw new ValidationError("Missing required fields: email, password, first_name, last_name");
  }

  // Get org_id of the creating user
  const orgId = await resolveOrgId(supabase, authUserId);
  if (!orgId) return err("User profile not found — visit /api/auth/setup-super-admin to re-create it", 404);

  // Create auth user — try service client first, fall back to regular client
  let svc: ReturnType<typeof createServiceClient> | null = null;
  try { svc = createServiceClient(); } catch { /* service key not set */ }

  // Use service client if available, otherwise use the authenticated RLS client
  const db = svc || supabase;

  // ── Check for an existing user with this email BEFORE creating one ──
  // A previous failed attempt may have left an auth user + users row with no
  // patients row. In that case, complete the registration instead of erroring.
  let newUserId = "";
  const { data: existingUser } = await db
    .from("users")
    .select("id, email")
    .eq("email", email)
    .maybeSingle();

  if (existingUser) {
    const { data: existingPatient } = await db
      .from("patients")
      .select("id, patient_number")
      .eq("user_id", existingUser.id)
      .maybeSingle();

    if (existingPatient) {
      return err(`A patient with email ${email} already exists (${existingPatient.patient_number})`, 409);
    }
    // Orphaned user (auth + profile exist, no patient record) — reuse this user
    // but update password + confirm email so the new credentials work immediately
    newUserId = existingUser.id;
    if (svc) {
      await svc.auth.admin.updateUserById(newUserId, { password, email_confirm: true }).catch(() => {});
    }
  } else if (svc) {
    // Create auth user via admin API (requires service role key)
    const { data: authData, error: signUpError } = await svc.auth.admin.createUser({
      email, password, email_confirm: true,
    });
    if (signUpError) return err(signUpError.message, 400);
    if (!authData.user) return err("Failed to create auth user", 500);
    newUserId = authData.user.id;
  } else {
    // Without service key, create auth user via regular signup
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email, password,
      options: { data: { first_name, last_name, role: "patient" } },
    });
    if (signUpError) return err(signUpError.message, 400);
    if (!authData.user) return err("Failed to create auth user", 500);
    newUserId = authData.user.id;
  }

  // Create user profile (upsert handles both fresh and orphaned users)
  const { error: userError } = await db.from("users").upsert({
    id: newUserId, org_id: orgId, email, role: "patient",
    first_name, last_name, phone: body.phone || null, password_hash: "",
  }, { onConflict: "id" });
  if (userError) return err(userError.message, 500);

  // Generate patient number using the org's configured prefix (default PT-)
  const { patientPrefix } = await getOrgSettings(supabase, orgId);
  const patientNumber = await generatePatientNumber(supabase, orgId, patientPrefix);

  // Create patient record
  const patientFields: Record<string, any> = {
    org_id: orgId,
    user_id: newUserId,
    patient_number: patientNumber,
    first_name,
    last_name,
    is_primary_account: true,
  };
  for (const k of ["date_of_birth", "gender", "blood_group", "genotype", "marital_status", "address", "city", "state",
    "emergency_contact_name", "emergency_contact_phone"] as const) {
    if (body[k] !== undefined && body[k] !== "") {
      // Normalize gender/blood_group to the DB's expected casing (lowercase)
      patientFields[k] = (k === "gender") ? String(body[k]).toLowerCase() : body[k];
    }
  }

  const { data: patient, error: patientError } = await db
    .from("patients").insert(patientFields)
    .select("*, user:users(id, org_id, email, role, first_name, last_name, phone, avatar_url, is_active)")
    .single();

  if (patientError) {
    // Roll back the freshly-created auth user + profile so no orphan blocks a retry.
    // (Only when we created them in THIS request — reused orphaned users are kept.)
    const wasFreshUser = newUserId !== existingUser?.id;
    if (wasFreshUser && svc) {
      await svc.auth.admin.deleteUser(newUserId).catch(() => {});
      await db.from("users").delete().eq("id", newUserId).then(() => {}, () => {});
    }
    return err(patientError.message, 500);
  }
  await logAudit(req, authUserId, { action: "create", entityType: "patients", entityId: patient.id, description: `Patient ${patientNumber} (${first_name} ${last_name}) registered` }).catch(() => {});
  return ok(patient, 201);
});
