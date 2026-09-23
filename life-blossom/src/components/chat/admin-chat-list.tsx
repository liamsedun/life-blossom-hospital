"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, MessageSquare, Loader2, Plus, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import { chatListTime, initials, roleLabel, roleTagClass, useChatPresence, useInboxRealtime } from "@/lib/chat";
import type { ChatListResponse, ChatDirectoryEntry } from "@/lib/api-types";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export function AdminChatList({
  activeChatId,
  onSelect,
  data,
  load,
}: {
  activeChatId?: string | null;
  onSelect: (chatId: string) => void;
  data: ChatListResponse | null;
  load: () => Promise<void>;
}) {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState<string | null>(null);

  const online = useChatPresence(!!data);

  useInboxRealtime(!!data, () => load());

  const startPatientChat = async (patientId: string) => {
    if (creating) return;
    setCreating(patientId);
    try {
      const res = await fetch("/api/chats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patient_id: patientId }),
      });
      const json = await res.json();
      if (json.success) {
        onSelect(json.data.chat.id);
        load();
      }
    } catch { /* ignore */ } finally {
      setCreating(null);
    }
  };

  const startStaffChat = async (staffUserId: string) => {
    if (creating) return;
    setCreating(staffUserId);
    try {
      const res = await fetch("/api/chats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipient_user_id: staffUserId }),
      });
      const json = await res.json();
      if (json.success) {
        onSelect(json.data.chat.id);
        load();
      }
    } catch { /* ignore */ } finally {
      setCreating(null);
    }
  };

  const chats = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = data?.chats ?? [];
    const filtered = !q ? list : list.filter((c) => {
      const name = `${c.other_user?.first_name ?? ""} ${c.other_user?.last_name ?? ""}`.toLowerCase();
      return name.includes(q);
    });
    return [...filtered].sort((a, b) => new Date(b.updated_at || b.last_message_at || b.created_at).getTime() - new Date(a.updated_at || a.last_message_at || a.created_at).getTime());
  }, [data, search]);

  const { staffDirectory, patientDirectory } = useMemo(() => {
    const q = search.trim().toLowerCase();
    const existingPatientIds = new Set((data?.chats ?? []).filter((c) => c.patient_id).map((c) => c.patient_id));
    const existingRecipientIds = new Set((data?.chats ?? []).filter((c) => c.recipient_user_id).map((c) => c.recipient_user_id));

    const staff: ChatDirectoryEntry[] = [];
    const patients: ChatDirectoryEntry[] = [];

    for (const d of data?.directory ?? []) {
      const isStaff = d.role !== "patient";
      if (isStaff) {
        if (!existingRecipientIds.has(d.user_id ?? d.id)) {
          staff.push(d);
        }
      } else {
        if (!existingPatientIds.has(d.patient_id ?? "")) {
          patients.push(d);
        }
      }
    }

    if (q) {
      return {
        staffDirectory: staff.filter((d) => `${d.first_name} ${d.last_name}`.toLowerCase().includes(q)),
        patientDirectory: patients.filter((d) => `${d.first_name} ${d.last_name}`.toLowerCase().includes(q)),
      };
    }

    return { staffDirectory: staff, patientDirectory: patients };
  }, [data, search]);

  const totalUnread = useMemo(() => (data?.chats ?? []).reduce((a, c) => a + c.unread_count, 0), [data]);

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="p-4 pb-2 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-[#e0a84a]" /> Live Chat
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {totalUnread > 0 ? `${totalUnread} unread` : "Conversations"}
            </p>
          </div>
          <Badge variant="outline" className="border-emerald-400/30 text-emerald-600 dark:text-emerald-300 bg-emerald-400/[0.06]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 inline-block" />
            Live
          </Badge>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search conversations..."
            className="w-full bg-background border border-border rounded-xl pl-9 pr-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-[#e0a84a]/40 transition-colors"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1.5 min-h-0">
        {chats.map((chat) => (
          <button
            key={chat.id}
            onClick={() => onSelect(chat.id)}
            className={cn(
              "w-full flex items-center gap-3 rounded-xl p-2.5 transition-colors text-left border",
              activeChatId === chat.id
                ? "bg-[#e0a84a]/10 border-[#e0a84a]/25"
                : "bg-transparent border-transparent hover:bg-muted"
            )}
          >
            <Avatar className="w-10 h-10 shrink-0">
              {chat.other_user?.avatar_url ? (
                <AvatarImage src={chat.other_user.avatar_url} alt={chat.other_user.first_name} />
              ) : (
                <AvatarFallback className={cn(
                  "text-white text-xs",
                  chat.recipient_user_id
                    ? "bg-gradient-to-br from-[#2d4a3e] to-[#4a7a5f]"
                    : "bg-gradient-to-br from-[#1e3a5f] to-[#3b6a8f]"
                )}>
                  {initials(chat.other_user?.first_name, chat.other_user?.last_name)}
                </AvatarFallback>
              )}
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground truncate">
                  {chat.other_user ? `${chat.other_user.first_name} ${chat.other_user.last_name}` : "Chat"}
                </span>
                {chat.other_user?.is_dependant && (
                  <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full border border-[#e0a84a]/30 text-[#e0a84a] bg-[#e0a84a]/10 shrink-0">
                    Dependant
                  </span>
                )}
                {chat.recipient_user_id && (
                  <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full border border-sky-400/30 text-sky-600 dark:text-sky-300 bg-sky-400/10 shrink-0">
                    Staff
                  </span>
                )}
                {online.has(chat.other_user?.id ?? "") && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                )}
              </div>
              <p className={cn("text-xs truncate mt-0.5", chat.unread_count > 0 ? "text-foreground font-medium" : "text-muted-foreground")}>
                {chat.last_sender_id === user?.id ? "You: " : ""}
                {chat.last_message || "No messages yet"}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <span className="text-[10px] text-muted-foreground">{chat.last_message_at ? chatListTime(chat.last_message_at) : ""}</span>
              {chat.unread_count > 0 && (
                <span className="min-w-[18px] h-[18px] flex items-center justify-center bg-gradient-to-br from-[#e0a84a] to-amber-500 text-[#0a0f1a] text-[10px] font-bold rounded-full px-1 leading-none">
                  {chat.unread_count > 9 ? "9+" : chat.unread_count}
                </span>
              )}
            </div>
          </button>
        ))}

        {staffDirectory.length > 0 && (
          <div className="pt-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold px-2 pb-1.5 flex items-center gap-1">
              <Users className="w-3 h-3" /> Staff members
            </p>
            {staffDirectory.map((d) => (
              <button
                key={d.id}
                onClick={() => startStaffChat(d.user_id ?? d.id)}
                disabled={creating === (d.user_id ?? d.id)}
                className="w-full flex items-center gap-3 rounded-xl p-2.5 text-left hover:bg-muted transition-colors disabled:opacity-50 border border-dashed border-border bg-transparent mb-1.5"
              >
                <Avatar className="w-10 h-10 shrink-0">
                  {d.avatar_url ? (
                    <AvatarImage src={d.avatar_url} alt={`${d.first_name} ${d.last_name}`} />
                  ) : (
                    <AvatarFallback className="bg-gradient-to-br from-[#2d4a3e] to-[#4a7a5f] text-white text-xs">
                      {initials(d.first_name, d.last_name)}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-semibold text-foreground truncate block">
                    {d.first_name} {d.last_name}
                  </span>
                  <span className={cn("text-[9px] font-medium px-1.5 py-0.5 rounded-full border inline-block mt-0.5", roleTagClass(d.role))}>
                    {roleLabel(d.role)}
                  </span>
                </div>
                {creating === (d.user_id ?? d.id) ? (
                  <Loader2 className="w-4 h-4 text-[#e0a84a] animate-spin shrink-0" />
                ) : (
                  <Plus className="w-4 h-4 text-muted-foreground shrink-0" />
                )}
              </button>
            ))}
          </div>
        )}

        {patientDirectory.length > 0 && (
          <div className="pt-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold px-2 pb-1.5">
              Patients
            </p>
            {patientDirectory.map((p) => (
              <button
                key={p.id}
                onClick={() => startPatientChat(p.patient_id!)}
                disabled={creating === p.patient_id}
                className="w-full flex items-center gap-3 rounded-xl p-2.5 text-left hover:bg-muted transition-colors disabled:opacity-50 border border-dashed border-border bg-transparent mb-1.5"
              >
                <Avatar className="w-10 h-10 shrink-0">
                  {p.avatar_url ? (
                    <AvatarImage src={p.avatar_url} alt={`${p.first_name} ${p.last_name}`} />
                  ) : (
                    <AvatarFallback className="bg-gradient-to-br from-[#4a2540] to-[#8f3b6d] text-white text-xs">
                      {initials(p.first_name, p.last_name)}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-semibold text-foreground truncate block">
                    {p.first_name} {p.last_name}
                  </span>
                  <span className={cn("text-[9px] font-medium px-1.5 py-0.5 rounded-full border inline-block mt-0.5", p.is_dependant ? "border-[#e0a84a]/30 text-[#e0a84a] bg-[#e0a84a]/10" : roleTagClass("patient"))}>
                    {p.is_dependant ? "Dependant" : roleLabel("patient")}
                  </span>
                </div>
                {creating === p.patient_id ? (
                  <Loader2 className="w-4 h-4 text-[#e0a84a] animate-spin shrink-0" />
                ) : (
                  <Plus className="w-4 h-4 text-muted-foreground shrink-0" />
                )}
              </button>
            ))}
          </div>
        )}

        {chats.length === 0 && staffDirectory.length === 0 && patientDirectory.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <MessageSquare className="w-8 h-8 text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">{search ? "No conversations match your search" : "No conversations yet"}</p>
            {search && (
              <button onClick={() => setSearch("")} className="mt-2 text-xs text-[#e0a84a]">
                Clear search
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
