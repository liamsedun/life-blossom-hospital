import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";
import { withAuth, ok, err, parseBody, resolveOrgId, resolvePatientId, NotFoundError, ValidationError } from "@/lib/api-utils";

const STAFF_ROLES = ["doctor", "nurse", "admin", "accountant", "cashier", "receptionist", "lab_technician", "pharmacist", "radiographer", "radiologist", "student_staff"];

interface ChatListItem {
  id: string;
  patient_id: string | null;
  staff_user_id: string;
  recipient_user_id: string | null;
  last_message: string | null;
  last_sender_id: string | null;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
  unread_count: number;
  other_user: {
    id: string;
    first_name: string;
    last_name: string;
    role: string;
    avatar_url: string | null;
    phone: string | null;
    specialization?: string | null;
    staff_number?: string | null;
    is_dependant?: boolean;
  } | null;
}

function toChatListItem(chat: any, other: any, unread: number): ChatListItem {
  return {
    id: chat.id,
    patient_id: chat.patient_id,
    staff_user_id: chat.staff_user_id,
    recipient_user_id: chat.recipient_user_id ?? null,
    last_message: chat.last_message,
    last_sender_id: chat.last_sender_id,
    last_message_at: chat.last_message_at,
    created_at: chat.created_at,
    updated_at: chat.updated_at,
    unread_count: unread,
    other_user: other
      ? {
          id: other.id,
          first_name: other.first_name,
          last_name: other.last_name,
          role: other.role,
          avatar_url: other.avatar_url ?? null,
          phone: other.phone ?? null,
          specialization: other.specialization ?? null,
          staff_number: other.staff_number ?? null,
          is_dependant: other.is_dependant ?? false,
        }
      : null,
  };
}

export async function GET(req: NextRequest) {
  return withAuth(async (req, supabase, authUserId) => {
    const svc = createServiceClient();
    const orgId = await resolveOrgId(supabase, authUserId);
    if (!orgId) return err("Org not found", 404);

    const { data: caller } = await svc.from("users").select("id, role, first_name, last_name").eq("id", authUserId).single();
    const role = caller?.role ?? "patient";

    // ── Chats visible to the caller ──
    let chatQuery = svc
      .from("chats")
      .select("*")
      .eq("org_id", orgId)
      .order("updated_at", { ascending: false });

    if (role === "patient") {
      const patientId = await resolvePatientId(supabase, authUserId);
      if (!patientId) return err("Patient record not found", 404);
      chatQuery = chatQuery.eq("patient_id", patientId);
    } else {
      // Staff see chats where they are the staff owner OR the recipient
      chatQuery = chatQuery.or(`staff_user_id.eq.${authUserId},recipient_user_id.eq.${authUserId}`);
    }

    const { data: chats, error: chatError } = await chatQuery;
    if (chatError) return err(chatError.message, 500);

    // ── Presence: users seen within the last 60 seconds ──
    const { data: presence } = await svc
      .from("chat_presence")
      .select("user_id")
      .eq("org_id", orgId)
      .gte("last_seen_at", new Date(Date.now() - 60_000).toISOString());
    const online = new Set((presence ?? []).map((p: any) => p.user_id));

    // ── Unread counts per chat (for the caller) ──
    const chatIds = (chats ?? []).map((c: any) => c.id);
    const unreadMap = new Map<string, number>();
    if (chatIds.length > 0) {
      const { data: unreadRows } = await svc
        .from("chat_messages")
        .select("chat_id")
        .eq("is_read", false)
        .neq("sender_id", authUserId)
        .in("chat_id", chatIds);
      for (const row of unreadRows ?? []) {
        const cid = (row as any).chat_id;
        unreadMap.set(cid, (unreadMap.get(cid) ?? 0) + 1);
      }
    }

    // ── Build the list with the other participant's profile ──
    const list: ChatListItem[] = [];
    const otherIds = new Set<string>();
    const patientIds = new Set<string>();
    for (const c of chats ?? []) {
      if (role === "patient") {
        otherIds.add(c.staff_user_id);
      } else if (c.patient_id) {
        patientIds.add(c.patient_id);
      } else if (c.recipient_user_id) {
        otherIds.add(c.recipient_user_id);
      }
    }

    const otherProfileMap = new Map<string, any>();
    const patientProfileMap = new Map<string, any>();

    const otherUserIds = [...otherIds].filter(Boolean);
    if (otherUserIds.length > 0) {
      const { data: others } = await svc
        .from("users")
        .select("id, first_name, last_name, role, avatar_url, phone")
        .in("id", otherUserIds);
      for (const u of others ?? []) otherProfileMap.set(u.id, u);
    }
    if (patientIds.size > 0) {
      const { data: pats } = await svc
        .from("patients")
        .select("id, user_id, primary_account_id, user:users(id, first_name, last_name, avatar_url, phone)")
        .in("id", [...patientIds]);
      for (const p of pats ?? []) patientProfileMap.set(p.id, p);
    }

    for (const c of chats ?? []) {
      let other: any = null;
      if (role === "patient") {
        other = otherProfileMap.get(c.staff_user_id) ?? null;
      } else if (c.patient_id) {
        // Staff-patient chat
        const patientRow = patientProfileMap.get(c.patient_id);
        const u = patientRow?.user;
        other = u
          ? {
              id: patientRow.user_id,
              first_name: u.first_name,
              last_name: u.last_name,
              role: "patient",
              avatar_url: u.avatar_url ?? null,
              phone: u.phone ?? null,
              specialization: null,
              staff_number: null,
              is_dependant: Boolean(patientRow.primary_account_id),
            }
          : null;
      } else if (c.recipient_user_id) {
        // Staff-to-staff chat
        other = otherProfileMap.get(c.recipient_user_id) ?? null;
      }
      list.push(toChatListItem(c, other, unreadMap.get(c.id) ?? 0));
    }

    // ── Directory for starting new conversations ──
    let directory: any[] = [];
    if (role === "patient") {
      // All staff — whether online or not — plus specialization where available.
      const { data: staffUsers } = await svc
        .from("users")
        .select("id, first_name, last_name, role, avatar_url")
        .eq("org_id", orgId)
        .eq("is_active", true)
        .in("role", STAFF_ROLES);
      const staffUserIds = (staffUsers ?? []).map((u: any) => u.id);
      const staffEnrich = new Map<string, any>();
      if (staffUserIds.length > 0) {
        const { data: staffRows } = await svc
          .from("staff")
          .select("user_id, specialization, staff_number")
          .in("user_id", staffUserIds);
        for (const s of staffRows ?? []) staffEnrich.set(s.user_id, s);
      }
      directory = (staffUsers ?? [])
        .map((u: any) => ({
          id: u.id,
          patient_id: null,
          user_id: u.id,
          first_name: u.first_name,
          last_name: u.last_name,
          role: u.role,
          avatar_url: u.avatar_url ?? null,
          specialization: staffEnrich.get(u.id)?.specialization ?? null,
          staff_number: staffEnrich.get(u.id)?.staff_number ?? null,
        }))
        .filter((s: any) => s.id);
    } else {
      // Staff see patients AND other staff members
      const { data: pats } = await svc
        .from("patients")
        .select("id, user_id, primary_account_id, user:users(id, first_name, last_name, avatar_url)")
        .eq("org_id", orgId)
        .not("user_id", "is", null);
      const patientDir = (pats ?? []).map((p: any) => ({
        id: p.user_id,
        patient_id: p.id,
        user_id: p.user_id,
        first_name: p.user?.first_name,
        last_name: p.user?.last_name,
        role: "patient",
        avatar_url: p.user?.avatar_url ?? null,
        specialization: null,
        staff_number: null,
        is_dependant: Boolean(p.primary_account_id),
      })).filter((d: any) => d.id);

      // Also show other staff members (excluding the caller)
      const { data: staffUsers } = await svc
        .from("users")
        .select("id, first_name, last_name, role, avatar_url")
        .eq("org_id", orgId)
        .eq("is_active", true)
        .in("role", STAFF_ROLES)
        .neq("id", authUserId);
      const staffDir = (staffUsers ?? []).map((u: any) => ({
        id: u.id,
        patient_id: null,
        user_id: u.id,
        first_name: u.first_name,
        last_name: u.last_name,
        role: u.role,
        avatar_url: u.avatar_url ?? null,
      }));

      directory = [...staffDir, ...patientDir];
    }

    return ok({
      chats: list,
      directory,
      online: [...online],
      caller_role: role,
    });
  })(req);
}

export async function POST(req: NextRequest) {
  return withAuth(async (req, supabase, authUserId) => {
    const svc = createServiceClient();
    const orgId = await resolveOrgId(supabase, authUserId);
    if (!orgId) return err("Org not found", 404);

    const body = await parseBody<{ patient_id?: string; staff_user_id?: string; recipient_user_id?: string }>(req);

    const { data: caller } = await svc.from("users").select("id, role").eq("id", authUserId).single();
    const role = caller?.role ?? "patient";

    let patientId: string | null = null;
    let staffUserId: string;
    let recipientUserId: string | null = null;

    if (role === "patient") {
      patientId = (await resolvePatientId(supabase, authUserId)) ?? "";
      if (!body.staff_user_id) throw new ValidationError("staff_user_id is required");
      staffUserId = body.staff_user_id;

      const { data: staffUser } = await svc
        .from("users")
        .select("id, org_id, role, is_active")
        .eq("id", staffUserId)
        .single();
      if (!staffUser || staffUser.org_id !== orgId) throw new NotFoundError("Staff member not found");
      if (!STAFF_ROLES.includes(staffUser.role)) {
        return err("Patients can only chat with hospital staff", 403);
      }
    } else if (body.recipient_user_id) {
      // Staff-to-staff chat
      staffUserId = authUserId;
      recipientUserId = body.recipient_user_id;

      const { data: recipient } = await svc
        .from("users")
        .select("id, org_id, role, is_active")
        .eq("id", recipientUserId)
        .single();
      if (!recipient || recipient.org_id !== orgId) throw new NotFoundError("Staff member not found");
      if (!STAFF_ROLES.includes(recipient.role)) {
        return err("Can only chat with hospital staff", 403);
      }
      if (recipientUserId === authUserId) {
        return err("Cannot chat with yourself", 400);
      }
    } else {
      // Staff-to-patient chat
      if (!body.patient_id) throw new ValidationError("patient_id or recipient_user_id is required");
      patientId = body.patient_id;
      staffUserId = authUserId;

      const { data: patient } = await svc.from("patients").select("id, org_id").eq("id", patientId).single();
      if (!patient || patient.org_id !== orgId) throw new NotFoundError("Patient not found");
    }

    // Create-or-fetch the conversation
    let existingQuery = svc
      .from("chats")
      .select("*")
      .eq("org_id", orgId)
      .eq("staff_user_id", staffUserId);

    if (recipientUserId) {
      existingQuery = existingQuery.eq("recipient_user_id", recipientUserId).is("patient_id", null);
    } else {
      existingQuery = existingQuery.eq("patient_id", patientId).is("recipient_user_id", null);
    }

    const { data: existing } = await existingQuery.maybeSingle();

    let chat: any = existing;
    if (!chat) {
      const insertData: any = { org_id: orgId, staff_user_id: staffUserId };
      if (recipientUserId) {
        insertData.recipient_user_id = recipientUserId;
      } else {
        insertData.patient_id = patientId;
      }

      const { data: inserted, error: insertError } = await svc
        .from("chats")
        .insert(insertData)
        .select()
        .single();
      if (insertError) return err(insertError.message, 500);
      chat = inserted;
    }

    // Fetch the other participant's profile for the client
    let other: any = null;
    if (role === "patient") {
      const { data: u } = await svc.from("users").select("id, first_name, last_name, role, avatar_url, phone").eq("id", staffUserId).single();
      other = u;
    } else if (recipientUserId) {
      const { data: u } = await svc.from("users").select("id, first_name, last_name, role, avatar_url, phone").eq("id", recipientUserId).single();
      other = u;
    } else {
      const { data: p } = await svc
        .from("patients")
        .select("id, user_id, primary_account_id, user:users(id, first_name, last_name, avatar_url, phone)")
        .eq("id", patientId)
        .single();
      const userRow = (p as any)?.user as any;
      if (userRow) {
        other = {
          id: (p as any).user_id,
          first_name: userRow.first_name,
          last_name: userRow.last_name,
          role: "patient",
          avatar_url: userRow.avatar_url ?? null,
          phone: userRow.phone ?? null,
          is_dependant: Boolean((p as any)?.primary_account_id),
        };
      }
    }

    return ok({
      chat,
      other_user: other
        ? {
            id: other.id,
            first_name: other.first_name,
            last_name: other.last_name,
            role: other.role,
            avatar_url: other.avatar_url ?? null,
            phone: other.phone ?? null,
            is_dependant: other.is_dependant ?? false,
          }
        : null,
    });
  })(req);
}
