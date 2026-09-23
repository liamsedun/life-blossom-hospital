import type { SupabaseClient } from "@supabase/supabase-js";

export interface OrgSettings {
  patientPrefix: string;
  dependantPrefix: string;
  [key: string]: any;
}

/**
 * Resolve the hospital's active organization id instead of hardcoding it.
 * Falls back to the seed org id if the lookup fails, so auth flows keep
 * working even if the lookup is temporarily unavailable.
 */
export async function getDefaultOrgId(
  supabase: SupabaseClient
): Promise<string> {
  const { data } = await supabase
    .from("organizations")
    .select("id")
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return data?.id || "00000000-0000-4000-8000-000000000001";
}

/**
 * Read per-org settings stored in organizations.settings (JSONB).
 * Prefixes default to PT- / DEP- when unset.
 */
export async function getOrgSettings(
  supabase: SupabaseClient,
  orgId: string
): Promise<OrgSettings> {
  const { data } = await supabase
    .from("organizations")
    .select("settings")
    .eq("id", orgId)
    .maybeSingle();
  const s = (data?.settings as Record<string, any>) || {};
  return {
    patientPrefix: (s.patientPrefix as string) || "PT-",
    dependantPrefix: (s.dependantPrefix as string) || "DEP-",
    ...s,
  };
}

export const PREFIX_PATTERN = /^[A-Za-z0-9_\- ]{1,12}$/;

export function normalizePrefix(raw: string | undefined, fallback: string): string {
  const p = (raw || "").trim().toUpperCase();
  return PREFIX_PATTERN.test(p) ? p : fallback;
}

/**
 * Generate the next sequential number: `<prefix><count+1>` padded to 4 digits.
 * Count is org-scoped so changing the prefix never collides with existing numbers.
 */
export async function generatePatientNumber(
  supabase: SupabaseClient,
  orgId: string,
  prefix: string
): Promise<string> {
  const { count } = await supabase
    .from("patients")
    .select("id", { count: "exact", head: true })
    .eq("org_id", orgId);
  return `${prefix}${String((count || 0) + 1).padStart(4, "0")}`;
}
