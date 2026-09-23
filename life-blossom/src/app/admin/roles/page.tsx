"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ShieldCheck, Plus, Trash2, Loader2, Save, ChevronDown, ChevronUp,
  Check, X as XIcon, Settings,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { useRoleGuard } from "@/hooks/use-role-guard";

const MODULES = [
  { key: "dashboard",     label: "Dashboard" },
  { key: "patients",      label: "Patients" },
  { key: "appointments",  label: "Appointments" },
  { key: "billing",       label: "Billing" },
  { key: "expenses",      label: "Expenses" },
  { key: "other_income",  label: "Other Income" },
  { key: "internal_mail", label: "Internal Mail" },
  { key: "live_chat",     label: "Live Chat" },
  { key: "staff",         label: "Staff" },
  { key: "reports",       label: "Reports" },
  { key: "security_audit", label: "Security & Audit" },
  { key: "settings",      label: "Settings" },
  { key: "profile",       label: "Profile" },
];

const BUILTIN_ROLES = [
  "admin", "doctor", "nurse", "accountant", "cashier",
  "receptionist", "lab_technician", "pharmacist", "radiographer", "radiologist",
];

interface RolePermission {
  id?: string;
  role: string;
  module: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

interface CustomRole {
  id: string;
  name: string;
  description: string | null;
}

export default function RolesPage() {
  const authorized = useRoleGuard(["admin"]);
  const [allPerms, setAllPerms] = useState<RolePermission[]>([]);
  const [customRoles, setCustomRoles] = useState<CustomRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedRole, setSelectedRole] = useState("admin");
  const [expandedRole, setExpandedRole] = useState<string | null>("admin");
  const [showAddRole, setShowAddRole] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDesc, setNewRoleDesc] = useState("");
  const [addRoleError, setAddRoleError] = useState("");
  const [addingRole, setAddingRole] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const allRoles = [...BUILTIN_ROLES, ...customRoles.map((r) => r.name.toLowerCase())];

  function showToast(type: "success" | "error", message: string) {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  }

  const loadPermissions = useCallback(async () => {
    setLoading(true);
    try {
      const [permRes, roleRes] = await Promise.all([
        fetch("/api/role-permissions"),
        fetch("/api/custom-roles"),
      ]);
      const permJson = await permRes.json();
      const roleJson = await roleRes.json();
      if (permJson.success) setAllPerms(permJson.data || []);
      if (roleJson.success) setCustomRoles(roleJson.data || []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadPermissions(); }, [loadPermissions]);

  function getPerm(role: string, mod: string): RolePermission {
    const found = allPerms.find((p) => p.role === role && p.module === mod);
    return found || { role, module: mod, can_view: false, can_create: false, can_edit: false, can_delete: false };
  }

  function updatePerm(role: string, mod: string, field: keyof RolePermission, value: boolean) {
    setAllPerms((prev) => {
      const existing = prev.find((p) => p.role === role && p.module === mod);
      if (existing) {
        return prev.map((p) => p.role === role && p.module === mod ? { ...p, [field]: value } : p);
      }
      return [...prev, { role, module: mod, can_view: field === "can_view" ? value : false, can_create: field === "can_create" ? value : false, can_edit: field === "can_edit" ? value : false, can_delete: field === "can_delete" ? value : false }];
    });
  }

  function toggleAllModule(role: string, mod: string, on: boolean) {
    setAllPerms((prev) => {
      const existing = prev.find((p) => p.role === role && p.module === mod);
      if (existing) {
        return prev.map((p) => p.role === role && p.module === mod ? { ...p, can_view: on, can_create: on, can_edit: on, can_delete: on } : p);
      }
      return [...prev, { role, module: mod, can_view: on, can_create: on, can_edit: on, can_delete: on }];
    });
  }

  async function savePermissions() {
    setSaving(true);
    try {
      // Save permissions for the expanded role
      const role = expandedRole;
      if (!role) return;
      const perms = MODULES.map((m) => {
        const p = getPerm(role, m.key);
        return { module: m.key, can_view: p.can_view, can_create: p.can_create, can_edit: p.can_edit, can_delete: p.can_delete };
      });
      const res = await fetch("/api/role-permissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, permissions: perms }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Save failed");
      showToast("success", `Permissions saved for "${role}"`);
      loadPermissions();
    } catch (err: any) {
      showToast("error", err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleAddRole() {
    setAddRoleError("");
    if (!newRoleName.trim()) { setAddRoleError("Role name is required"); return; }
    if (BUILTIN_ROLES.includes(newRoleName.trim().toLowerCase())) {
      setAddRoleError("Cannot create a role with a built-in name");
      return;
    }
    setAddingRole(true);
    try {
      const res = await fetch("/api/custom-roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newRoleName.trim(), description: newRoleDesc.trim() || undefined }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to create role");
      setShowAddRole(false);
      setNewRoleName("");
      setNewRoleDesc("");
      showToast("success", `Role "${newRoleName.trim()}" created`);
      loadPermissions();
      setExpandedRole(newRoleName.trim().toLowerCase());
    } catch (err: any) {
      setAddRoleError(err.message);
    } finally {
      setAddingRole(false);
    }
  }

  async function handleDeleteRole(roleName: string) {
    if (!confirm(`Delete the role "${roleName}"? Staff with this role will need to be reassigned.`)) return;
    try {
      // Find custom role ID
      const custom = customRoles.find((r) => r.name.toLowerCase() === roleName);
      if (custom) {
        const res = await fetch(`/api/custom-roles?id=${custom.id}`, { method: "DELETE" });
        const json = await res.json();
        if (!json.success) throw new Error(json.error || "Delete failed");
      }
      // Also delete permissions
      await fetch(`/api/role-permissions?role=${roleName}`, { method: "DELETE" });
      showToast("success", `Role "${roleName}" deleted`);
      if (expandedRole === roleName) setExpandedRole(null);
      loadPermissions();
    } catch (err: any) {
      showToast("error", err.message || "Delete failed");
    }
  }

  if (!authorized) return null;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Roles &amp; Permissions</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage what each role can access across the system</p>
        </div>
        <Button onClick={() => setShowAddRole(true)}
          className="bg-gradient-to-r from-[#e0a84a] to-amber-500 text-[#0a0f1a] font-semibold border-0">
          <Plus className="size-4 mr-1" />New Role
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="size-6 animate-spin text-[#e0a84a]" />
        </div>
      ) : (
        <div className="space-y-3">
          {allRoles.map((role) => {
            const isExpanded = expandedRole === role;
            const isCustom = customRoles.some((r) => r.name.toLowerCase() === role);
            const permCount = MODULES.filter((m) => {
              const p = getPerm(role, m.key);
              return p.can_view || p.can_create || p.can_edit || p.can_delete;
            }).length;

            return (
              <Card key={role} className="border-border bg-card backdrop-blur-xl">
                <CardContent className="p-0">
                  {/* Role header */}
                  <button
                    onClick={() => setExpandedRole(isExpanded ? null : role)}
                    className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <ShieldCheck className="size-5 text-[#e0a84a] shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-foreground capitalize">{role.replace(/_/g, " ")}</p>
                        <p className="text-xs text-muted-foreground/60">
                          {permCount} of {MODULES.length} modules accessible
                          {isCustom && <Badge className="ml-2 text-[10px] bg-purple-500/10 text-purple-400 border-purple-500/20">Custom</Badge>}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isCustom && (
                        <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); handleDeleteRole(role); }}
                          className="h-7 text-xs text-red-400 hover:text-red-300 px-2">
                          <Trash2 className="size-3.5" />
                        </Button>
                      )}
                      {isExpanded ? <ChevronUp className="size-4 text-muted-foreground/60" /> : <ChevronDown className="size-4 text-muted-foreground/60" />}
                    </div>
                  </button>

                  {/* Permissions matrix */}
                  {isExpanded && (
                    <div className="border-t border-border p-4">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-xs text-muted-foreground font-medium">Module Permissions</p>
                        <Button size="sm" onClick={savePermissions} disabled={saving}
                          className="h-7 text-xs bg-gradient-to-r from-[#e0a84a] to-amber-500 text-[#0a0f1a] font-semibold border-0">
                          {saving ? <Loader2 className="size-3 animate-spin mr-1" /> : <Save className="size-3 mr-1" />}
                          Save Changes
                        </Button>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-border">
                              <th className="text-left py-2 pr-4 text-muted-foreground font-medium">Module</th>
                              <th className="text-center py-2 px-3 text-muted-foreground font-medium">View</th>
                              <th className="text-center py-2 px-3 text-muted-foreground font-medium">Create</th>
                              <th className="text-center py-2 px-3 text-muted-foreground font-medium">Edit</th>
                              <th className="text-center py-2 px-3 text-muted-foreground font-medium">Delete</th>
                              <th className="text-center py-2 pl-3 text-muted-foreground font-medium">All</th>
                            </tr>
                          </thead>
                          <tbody>
                            {MODULES.map((m) => {
                              const p = getPerm(role, m.key);
                              const allOn = p.can_view && p.can_create && p.can_edit && p.can_delete;
                              return (
                                <tr key={m.key} className="border-b border-border hover:bg-muted/30">
                                  <td className="py-2.5 pr-4 text-foreground/70 font-medium">{m.label}</td>
                                  {(["can_view", "can_create", "can_edit", "can_delete"] as const).map((field) => (
                                    <td key={field} className="text-center py-2.5 px-3">
                                      <button
                                        onClick={() => updatePerm(role, m.key, field, !p[field])}
                                        className={`inline-flex items-center justify-center size-5 rounded border transition-colors ${
                                          p[field]
                                            ? "bg-[#e0a84a]/20 border-[#e0a84a]/40 text-[#e0a84a]"
                                            : "bg-card border-border text-muted-foreground/40 hover:border-border"
                                        }`}
                                      >
                                        {p[field] && <Check className="size-3" />}
                                      </button>
                                    </td>
                                  ))}
                                   <td className="text-center py-2.5 pl-3">
                                     <button
                                       onClick={() => toggleAllModule(role, m.key, !allOn)}
                                       className={`inline-flex items-center justify-center size-5 rounded border transition-colors ${
                                         allOn
                                           ? "bg-[#e0a84a]/20 border-[#e0a84a]/40 text-[#e0a84a]"
                                           : "bg-card border-border text-muted-foreground/40 hover:border-border"
                                       }`}
                                     >
                                       {allOn && <Check className="size-3" />}
                                     </button>
                                   </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Role Dialog */}
      <Dialog open={showAddRole} onOpenChange={(o) => { if (!o) { setShowAddRole(false); setAddRoleError(""); } }}>
        <DialogContent className="sm:max-w-md border-border bg-card backdrop-blur-xl text-foreground">
          <DialogHeader><DialogTitle className="text-foreground">Create New Role</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Role Name *</p>
              <Input value={newRoleName} onChange={(e) => setNewRoleName(e.target.value)}
                placeholder="e.g. Ward Manager, Head Nurse" className="bg-muted border-border text-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Description</p>
              <Input value={newRoleDesc} onChange={(e) => setNewRoleDesc(e.target.value)}
                placeholder="Brief description of this role" className="bg-muted border-border text-foreground" />
            </div>
            {addRoleError && <p className="text-xs text-red-400">{addRoleError}</p>}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" className="bg-background text-foreground border-border hover:bg-muted">Cancel</Button>
            </DialogClose>
            <Button onClick={handleAddRole} disabled={addingRole}
              className="bg-gradient-to-r from-[#e0a84a] to-amber-500 text-[#0a0f1a] font-semibold border-0">
              {addingRole ? <Loader2 className="size-4 animate-spin mr-1" /> : <Plus className="size-4 mr-1" />}
              Create Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-2xl border text-sm font-medium transition-all animate-in slide-in-from-right ${
          toast.type === "success" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-rose-500/10 border-rose-500/20 text-rose-400"
        }`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
