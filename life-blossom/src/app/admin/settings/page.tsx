"use client";

import { useEffect, useState } from "react";
import { Stethoscope, PenLine, Trash2, Plus, KeyRound, Shield, ShieldOff, Landmark, Power, AlertTriangle, Loader2, Hash, CheckCircle2, RotateCcw, Database, Download, Upload, ChevronDown, Bell, BellOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePushNotifications } from "@/contexts/notification-context";
import { useRoleGuard } from "@/hooks/use-role-guard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent } from "@/components/ui/tabs";

interface Doctor {
  id: string;
  name: string;
  specialty: string;
  bio: string | null;
  qualifications: string | null;
  photo_url: string | null;
  experience_years: number | null;
  is_featured: boolean;
  sort_order: number;
  is_active: boolean;
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function SettingsPage() {
  const { authorized } = useRoleGuard(["admin", "accountant", "doctor", "nurse", "cashier", "lab_technician", "pharmacist", "radiographer", "radiologist", "receptionist"]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDoctor, setEditDoctor] = useState<Doctor | null>(null);

  const [patientPrefix, setPatientPrefix] = useState("PT-");
  const [dependantPrefix, setDependantPrefix] = useState("DEP-");
  const [prefixSaving, setPrefixSaving] = useState(false);
  const [prefixMsg, setPrefixMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [resetConfirm, setResetConfirm] = useState("");
  const [resetting, setResetting] = useState(false);
  const [resetMsg, setResetMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState("doctors");

  const [backupLoading, setBackupLoading] = useState(false);
  const [backupMsg, setBackupMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [restoreMsg, setRestoreMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function handleBackup() {
    setBackupMsg(null);
    setBackupLoading(true);
    try {
      const res = await fetch("/api/system/backup");
      if (!res.ok) {
        let msg = "Backup failed";
        try { const j = await res.json(); if (j?.error) msg = j.error; } catch {}
        throw new Error(msg);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `life-blossom-backup-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setBackupMsg({ ok: true, text: "Backup downloaded. Store it somewhere safe — it is the only way to rebuild the system after a crash." });
    } catch (err: any) {
      setBackupMsg({ ok: false, text: err.message });
    } finally {
      setBackupLoading(false);
    }
  }

  async function handleRestore(e: React.FormEvent) {
    e.preventDefault();
    if (!restoreFile) return;
    setRestoreMsg(null);
    setRestoreLoading(true);
    try {
      const text = await restoreFile.text();
      const parsed = JSON.parse(text);
      const res = await fetch("/api/system/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Restore failed");
      const d = json.data || {};
      const total = Object.values(d.restored || {}).reduce((a: number, b: any) => a + (Number(b) || 0), 0);
      setRestoreMsg({
        ok: true,
        text: `Restore complete — ${total} records restored (${d.users?.createdAccounts || 0} accounts recreated with temp passwords, ${d.users?.reusedAccounts || 0} kept). Reload the page to see your data.`,
      });
      setRestoreFile(null);
    } catch (err: any) {
      setRestoreMsg({ ok: false, text: err.message });
    } finally {
      setRestoreLoading(false);
    }
  }

  async function loadDoctors() {
    try {
      const res = await fetch("/api/landing/doctors");
      const json = await res.json();
      if (json.success) setDoctors(json.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDoctors();
    fetch("/api/org")
      .then((r) => r.json())
      .then((json) => {
        if (json.success && json.data) {
          setPatientPrefix(json.data.patientPrefix ?? "PT-");
          setDependantPrefix(json.data.dependantPrefix ?? "DEP-");
        }
      })
      .catch(() => {});
    fetch("/api/doctor-notes/check-role")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setIsSuperAdmin(json.data?.role === "admin");
      })
      .catch(() => {});
  }, []);

  async function savePrefixes(e: React.FormEvent) {
    e.preventDefault();
    setPrefixMsg(null);
    setPrefixSaving(true);
    try {
      const res = await fetch("/api/org", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientPrefix, dependantPrefix }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to save");
      setPrefixMsg({ ok: true, text: "Prefixes saved. New patients and dependants will use these." });
    } catch (err: any) {
      setPrefixMsg({ ok: false, text: err.message });
    } finally {
      setPrefixSaving(false);
    }
  }

  async function handleSystemReset(e: React.FormEvent) {
    e.preventDefault();
    if (resetConfirm !== "RESET SYSTEM") return;
    setResetMsg(null);
    setResetting(true);
    try {
      const res = await fetch("/api/system/reset", { method: "POST" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Reset failed");
      setResetMsg({ ok: true, text: "System reset complete. All entered data has been wiped." });
      setResetConfirm("");
    } catch (err: any) {
      setResetMsg({ ok: false, text: err.message });
    } finally {
      setResetting(false);
    }
  }

  if (!authorized) return null;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-text-secondary mt-1">
          Manage site content and preferences
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="relative mb-4 w-full sm:max-w-xs">
          <select
            value={activeTab}
            onChange={(e) => setActiveTab(e.target.value)}
            className="h-11 w-full appearance-none rounded-lg border border-border bg-card px-3 pr-10 text-sm font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            aria-label="Settings section"
          >
            <option value="doctors">Doctors</option>
            <option value="users">Users</option>
            <option value="bank-accounts">Bank Accounts</option>
            <option value="general">General</option>
            <option value="notifications">Notifications</option>
            <option value="prefixes">ID Prefixes</option>
            {isSuperAdmin && <option value="backups">Backups</option>}
            {isSuperAdmin && <option value="system-reset">System Reset</option>}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 size-4 text-text-secondary" />
        </div>

        <TabsContent value="doctors">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Landing Page Doctors</CardTitle>
              <AddDoctorDialog onSaved={loadDoctors} />
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-16 animate-pulse rounded-lg bg-muted"
                    />
                  ))}
                </div>
              ) : doctors.length === 0 ? (
                <p className="text-sm text-text-secondary text-center py-8">
                  No doctors yet. Click "Add Doctor" to create one.
                </p>
              ) : (
                <div className="divide-y divide-border">
                  {doctors.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center gap-4 py-3"
                    >
                      <Avatar className="size-10 shrink-0">
                        <AvatarImage
                          src={
                            doc.photo_url ||
                            `/images/doctors/doctor-${((doctors.indexOf(doc) % 4) + 1)}.svg`
                          }
                          alt={doc.name}
                        />
                        <AvatarFallback className="text-xs bg-primary-lighter text-primary font-semibold">
                          {getInitials(doc.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {doc.name}
                        </p>
                        <p className="text-xs text-text-secondary truncate">
                          {doc.specialty}
                        </p>
                      </div>
                      <Badge
                        variant={doc.is_active ? "success" : "warning"}
                        className="hidden sm:inline-flex text-[10px]"
                      >
                        {doc.is_active ? "Active" : "Inactive"}
                      </Badge>
                      <div className="flex items-center gap-1 shrink-0">
                        <EditDoctorDialog
                          doctor={doc}
                          onSaved={loadDoctors}
                        />
                        <DeleteDoctorButton
                          doctorId={doc.id}
                          doctorName={doc.name}
                          onDeleted={loadDoctors}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <UsersTab />
        </TabsContent>

        <TabsContent value="bank-accounts">
          <BankAccountsTab />
        </TabsContent>

        <TabsContent value="general">
          <HospitalInfoTab />
        </TabsContent>

        <TabsContent value="notifications">
          <NotificationsTab />
        </TabsContent>

        <TabsContent value="prefixes">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Hash className="w-4 h-4 text-primary" /> Patient / Dependant ID Prefixes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={savePrefixes} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">Patient ID Prefix</label>
                    <Input
                      value={patientPrefix}
                      onChange={(e) => setPatientPrefix(e.target.value)}
                      placeholder="e.g. PT-"
                      maxLength={12}
                    />
                    <p className="text-xs text-text-secondary">
                      Current patients are not re-numbered. New patients get this prefix (e.g. PT-0001).
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">Dependant ID Prefix</label>
                    <Input
                      value={dependantPrefix}
                      onChange={(e) => setDependantPrefix(e.target.value)}
                      placeholder="e.g. DEP-"
                      maxLength={12}
                    />
                    <p className="text-xs text-text-secondary">
                      New dependants get this prefix (e.g. DEP-0001).
                    </p>
                  </div>
                </div>
                {prefixMsg && (
                  <div className={`text-sm px-3 py-2 rounded-lg border ${prefixMsg.ok ? "text-emerald-600 border-emerald-200 bg-emerald-50" : "text-rose-600 border-rose-200 bg-rose-50"}`}>
                    {prefixMsg.ok ? <CheckCircle2 className="w-4 h-4 inline mr-1.5" /> : <AlertTriangle className="w-4 h-4 inline mr-1.5" />}
                    {prefixMsg.text}
                  </div>
                )}
                <Button type="submit" disabled={prefixSaving}>
                  {prefixSaving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  Save Prefixes
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="backups">
          {isSuperAdmin && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Database className="w-4 h-4 text-primary" /> Backup System
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-text-secondary">
                    Downloads a complete JSON backup of every record in the system — patients, staff,
                    medical records, reports, invoices, payments, chats, mail, audit logs and settings.
                    Keep it stored safely off-site; it is the only way to rebuild the hospital system
                    after a total site crash.
                  </p>
                  {backupMsg && (
                    <div className={`text-sm px-3 py-2 rounded-lg border ${backupMsg.ok ? "text-emerald-600 border-emerald-200 bg-emerald-50" : "text-rose-600 border-rose-200 bg-rose-50"}`}>
                      {backupMsg.ok ? <CheckCircle2 className="w-4 h-4 inline mr-1.5" /> : <AlertTriangle className="w-4 h-4 inline mr-1.5" />}
                      {backupMsg.text}
                    </div>
                  )}
                  <Button onClick={handleBackup} disabled={backupLoading}>
                    {backupLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Download className="w-4 h-4 mr-2" />}
                    {backupLoading ? "Backing up…" : "Backup Now"}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2 text-amber-600">
                    <Upload className="w-4 h-4" /> Restore from Backup
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 space-y-1">
                    <p className="font-semibold flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" /> Restoring wipes all current data first.
                    </p>
                    <p>
                      Everything in the system right now will be replaced with the backup contents
                      (your account is kept). Accounts that no longer exist are recreated with a
                      temporary password — reset them from Admin → Users afterwards.
                    </p>
                  </div>
                  <form onSubmit={handleRestore} className="space-y-3">
                    <Input
                      type="file"
                      accept=".json,application/json"
                      onChange={(e) => setRestoreFile(e.target.files?.[0] || null)}
                      className="max-w-md"
                    />
                    {restoreMsg && (
                      <div className={`text-sm px-3 py-2 rounded-lg border max-w-lg ${restoreMsg.ok ? "text-emerald-600 border-emerald-200 bg-emerald-50" : "text-rose-600 border-rose-200 bg-rose-50"}`}>
                        {restoreMsg.ok ? <CheckCircle2 className="w-4 h-4 inline mr-1.5" /> : <AlertTriangle className="w-4 h-4 inline mr-1.5" />}
                        {restoreMsg.text}
                      </div>
                    )}
                    <Button type="submit" variant="outline" disabled={!restoreFile || restoreLoading}
                      className="border-amber-400 text-amber-700 hover:bg-amber-50">
                      {restoreLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                      {restoreLoading ? "Restoring…" : "Restore System"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="system-reset">
          {isSuperAdmin && (
            <Card className="border-rose-200">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 text-rose-600">
                <RotateCcw className="w-4 h-4" /> Reset System
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 space-y-2">
                <p className="font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> This permanently wipes all entered data.
                </p>
                <ul className="list-disc pl-5 space-y-1 text-rose-600">
                  <li>All patients, staff, users, appointments and clinical records</li>
                  <li>All invoices, payments, expenses and other financial data</li>
                  <li>All chat messages, notifications and audit logs</li>
                </ul>
                <p className="text-rose-600">
                  Your hospital name, logo, bank accounts, doctors and system features are kept.
                  Only the super admin account survives. This cannot be undone.
                </p>
              </div>
              <form onSubmit={handleSystemReset} className="space-y-3">
                <label className="block text-sm font-medium text-foreground">
                  Type <span className="font-bold">RESET SYSTEM</span> to confirm
                </label>
                <Input
                  value={resetConfirm}
                  onChange={(e) => setResetConfirm(e.target.value)}
                  placeholder="RESET SYSTEM"
                  className="max-w-xs"
                />
                {resetMsg && (
                  <div className={`text-sm px-3 py-2 rounded-lg border max-w-lg ${resetMsg.ok ? "text-emerald-600 border-emerald-200 bg-emerald-50" : "text-rose-600 border-rose-200 bg-rose-50"}`}>
                    {resetMsg.ok ? <CheckCircle2 className="w-4 h-4 inline mr-1.5" /> : <AlertTriangle className="w-4 h-4 inline mr-1.5" />}
                    {resetMsg.text}
                  </div>
                )}
                <Button
                  type="submit"
                  variant="destructive"
                  disabled={resetConfirm !== "RESET SYSTEM" || resetting}
                >
                  {resetting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  {resetting ? "Resetting…" : "Reset System"}
                </Button>
              </form>
            </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface HospitalInfo {
  name: string;
  logo_url: string;
  address: string;
  phone: string;
  email: string;
  website: string;
}

function NotificationsTab() {
  const { supported, permission, subscribe, unsubscribe, isSubscribed } = usePushNotifications();
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function handleToggle() {
    setSaving(true);
    setMsg(null);
    try {
      if (isSubscribed) {
        await unsubscribe();
        setMsg({ ok: true, text: "Push notifications disabled. You won't receive alerts on this device." });
      } else {
        const ok = await subscribe();
        if (ok) {
          setMsg({ ok: true, text: "Push notifications enabled! You'll receive alerts for appointments, messages, and more." });
        } else {
          setMsg({ ok: false, text: "Could not enable notifications. Check your browser permissions." });
        }
      }
    } catch {
      setMsg({ ok: false, text: "Failed to update notification settings" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Bell className="w-4 h-4 text-primary" /> Push Notifications
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-text-secondary">
          Receive push notifications on this device for new messages, appointment reminders, and system alerts.
        </p>

        <div className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            {isSubscribed ? (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                <Bell className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                <BellOff className="h-5 w-5 text-slate-400" />
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-foreground">
                {isSubscribed ? "Notifications Enabled" : "Notifications Disabled"}
              </p>
              <p className="text-xs text-text-secondary">
                {permission === "granted" ? "Browser permission granted" : permission === "denied" ? "Browser permission denied — enable in browser settings" : "Not yet prompted"}
              </p>
            </div>
          </div>
          <button
            onClick={handleToggle}
            disabled={saving || !supported || permission === "denied"}
            className={cn(
              "relative inline-flex h-8 w-14 items-center rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:opacity-50",
              isSubscribed ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"
            )}
          >
            <span
              className={cn(
                "inline-block h-6 w-6 rounded-full bg-white shadow-lg transition-transform duration-200",
                isSubscribed ? "translate-x-7" : "translate-x-1"
              )}
            />
          </button>
        </div>

        {!supported && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
            Push notifications are not supported in this browser. Try Chrome, Firefox, or Edge.
          </div>
        )}

        {permission === "denied" && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            Notifications are blocked. To enable them, click the lock icon in your browser's address bar and allow notifications for this site.
          </div>
        )}

        {msg && (
          <div className={cn(
            "rounded-lg border p-3 text-sm",
            msg.ok ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"
          )}>
            {msg.ok ? <CheckCircle2 className="w-4 h-4 inline mr-1.5" /> : <AlertTriangle className="w-4 h-4 inline mr-1.5" />}
            {msg.text}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function HospitalInfoTab() {
  const [form, setForm] = useState<HospitalInfo>({
    name: "",
    logo_url: "",
    address: "",
    phone: "",
    email: "",
    website: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/org")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          setForm({
            name: json.data.name || "",
            logo_url: json.data.logo_url || "/logo.png",
            address: json.data.address || "",
            phone: json.data.phone || "",
            email: json.data.email || "",
            website: json.data.website || "",
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setSaving(true);
    try {
      const res = await fetch("/api/org", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          logo_url: form.logo_url.trim() || null,
          address: form.address.trim(),
          phone: form.phone.trim(),
          email: form.email.trim(),
          website: form.website.trim(),
        }),
      });
      const json = await res.json();
      if (json.success) {
        setMessage({ type: "success", text: "Hospital information saved. It will appear on new invoice printouts." });
      } else {
        setMessage({ type: "error", text: json.error || "Failed to save" });
      }
    } catch {
      setMessage({ type: "error", text: "Network error" });
    } finally {
      setSaving(false);
    }
  }

  const inputClass = "flex h-10 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Hospital Information</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-sm text-text-secondary">
              This information appears on the invoice header and footer when printing medical invoices.
            </p>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Hospital / Clinic Name</label>
              <Input
                placeholder="e.g. Life Blossom Hospital"
                className={inputClass}
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Hospital Logo</label>
              <div className="flex items-center gap-4">
                <label className="flex flex-col items-center justify-center w-24 h-24 rounded-xl border-2 border-dashed border-border bg-muted/50 hover:bg-muted cursor-pointer transition-colors overflow-hidden">
                  {form.logo_url ? (
                    <img src={form.logo_url} alt="Logo preview" className="w-full h-full object-contain p-1" />
                  ) : (
                    <>
                      <Upload className="w-5 h-5 text-text-secondary mb-1" />
                      <span className="text-[10px] text-text-secondary">Upload</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const fd = new FormData();
                      fd.append("file", file);
                      try {
                        const res = await fetch("/api/upload/logo", { method: "POST", body: fd });
                        const json = await res.json();
                        if (json.success) setForm((f) => ({ ...f, logo_url: json.data.url }));
                      } catch {}
                    }}
                  />
                </label>
                {form.logo_url && (
                  <button type="button" onClick={() => setForm((f) => ({ ...f, logo_url: "" }))} className="text-xs text-rose-500 hover:underline">Remove</button>
                )}
              </div>
              <p className="text-xs text-text-secondary mt-1">Upload PNG, JPG or SVG. Max 2MB.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Address</label>
              <Input
                placeholder="e.g. 12 Adeola Odeku Street, Victoria Island, Lagos"
                className={inputClass}
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Phone</label>
                <Input
                  placeholder="e.g. +234 800 000 0000"
                  className={inputClass}
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Email</label>
                <Input
                  type="email"
                  placeholder="e.g. hello@lifeblossomcares.com.ng"
                  className={inputClass}
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Website</label>
              <Input
                placeholder="e.g. https://www.lifeblossomcares.com.ng"
                className={inputClass}
                value={form.website}
                onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
              />
            </div>
            {message && (
              <div className={`rounded-md p-3 text-sm ${message.type === "success" ? "bg-accent-light text-accent" : "bg-destructive/10 text-destructive"}`}>
                {message.text}
              </div>
            )}
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save Hospital Information"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

interface BankAccount {
  id: string;
  bank_name: string;
  account_name: string;
  account_number: string;
  is_active: boolean;
}

function BankAccountsTab() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [max, setMax] = useState(5);
  const [loading, setLoading] = useState(true);

  async function loadAccounts() {
    setLoading(true);
    try {
      const res = await fetch("/api/settings/bank-accounts");
      const json = await res.json();
      if (json.success) {
        setAccounts(json.data.accounts || []);
        setMax(json.data.max || 5);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAccounts();
  }, []);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg">Hospital Bank Accounts</CardTitle>
          <p className="text-sm text-text-secondary mt-1">
            Shown to patients when they choose Bank Transfer. Up to {max} accounts.
          </p>
        </div>
        <AddBankAccountDialog
          disabled={accounts.length >= max}
          onSaved={loadAccounts}
        />
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : accounts.length === 0 ? (
          <div className="text-center py-10">
            <Landmark className="size-10 text-text-secondary mx-auto mb-3" />
            <p className="text-sm text-text-secondary">
              No bank accounts yet. Patients need at least one to pay by Bank Transfer.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {accounts.map((acc) => (
              <div key={acc.id} className="flex items-center gap-4 py-3">
                <div className="size-10 rounded-xl bg-primary-lighter/60 flex items-center justify-center shrink-0">
                  <Landmark className="size-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{acc.bank_name}</p>
                  <p className="text-xs text-text-secondary truncate">
                    {acc.account_name} · <span className="font-mono">{acc.account_number}</span>
                  </p>
                </div>
                <Badge variant={acc.is_active ? "success" : "secondary"} className="text-[10px]">
                  {acc.is_active ? "Active" : "Hidden"}
                </Badge>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={async () => {
                      await fetch(`/api/settings/bank-accounts/${acc.id}`, {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ is_active: !acc.is_active }),
                      });
                      loadAccounts();
                    }}
                    className="rounded-lg p-2 text-text-secondary hover:text-foreground hover:bg-muted transition-colors"
                    title={acc.is_active ? "Hide from patients" : "Show to patients"}
                  >
                    <Power className="size-4" />
                  </button>
                  <EditBankAccountDialog account={acc} onSaved={loadAccounts} />
                  <DeleteBankAccountButton
                    accountId={acc.id}
                    accountLabel={`${acc.bank_name} ${acc.account_number}`}
                    onDeleted={loadAccounts}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function BankAccountDialogBody({
  form,
  setForm,
  error,
}: {
  form: { bank_name: string; account_name: string; account_number: string };
  setForm: (f: { bank_name: string; account_name: string; account_number: string }) => void;
  error: string;
}) {
  const inputClass = "flex h-10 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50";
  return (
    <>
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">Bank Name</label>
        <Input
          placeholder="e.g. Access Bank"
          className={inputClass}
          value={form.bank_name}
          onChange={(e) => setForm({ ...form, bank_name: e.target.value })}
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">Account Name</label>
        <Input
          placeholder="e.g. Life Blossom Hospital Ltd"
          className={inputClass}
          value={form.account_name}
          onChange={(e) => setForm({ ...form, account_name: e.target.value })}
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">Account Number</label>
        <Input
          placeholder="10-digit NUBAN account number"
          className={inputClass}
          value={form.account_number}
          onChange={(e) => setForm({ ...form, account_number: e.target.value.replace(/\D/g, "").slice(0, 10) })}
          required
        />
      </div>
      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      )}
    </>
  );
}

function AddBankAccountDialog({ disabled, onSaved }: { disabled: boolean; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ bank_name: "", account_name: "", account_number: "" });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (form.account_number.length !== 10) {
      setError("Account number must be exactly 10 digits");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/settings/bank-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bank_name: form.bank_name.trim(),
          account_name: form.account_name.trim(),
          account_number: form.account_number.trim(),
        }),
      });
      const json = await res.json();
      if (json.success) {
        setOpen(false);
        setForm({ bank_name: "", account_name: "", account_number: "" });
        onSaved();
      } else {
        setError(json.error || "Failed to save account");
      }
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" disabled={disabled} title={disabled ? `Maximum of 5 accounts reached` : "Add a bank account"}>
          <Plus className="size-4" />
          Add Account
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Add Bank Account</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <BankAccountDialogBody form={form} setForm={setForm} error={error} />
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" className="bg-white text-black border-border hover:bg-gray-100 dark:bg-white/[0.06] dark:text-white/80 dark:hover:bg-white/[0.12]">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditBankAccountDialog({ account, onSaved }: { account: BankAccount; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    bank_name: account.bank_name,
    account_name: account.account_name,
    account_number: account.account_number,
  });

  useEffect(() => {
    setForm({
      bank_name: account.bank_name,
      account_name: account.account_name,
      account_number: account.account_number,
    });
  }, [account]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (form.account_number.length !== 10) {
      setError("Account number must be exactly 10 digits");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/settings/bank-accounts/${account.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bank_name: form.bank_name.trim(),
          account_name: form.account_name.trim(),
          account_number: form.account_number.trim(),
        }),
      });
      const json = await res.json();
      if (json.success) {
        setOpen(false);
        onSaved();
      } else {
        setError(json.error || "Failed to save account");
      }
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8">
          <PenLine className="size-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit Bank Account</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <BankAccountDialogBody form={form} setForm={setForm} error={error} />
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" className="bg-white text-black border-border hover:bg-gray-100 dark:bg-white/[0.06] dark:text-white/80 dark:hover:bg-white/[0.12]">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteBankAccountButton({
  accountId,
  accountLabel,
  onDeleted,
}: {
  accountId: string;
  accountLabel: string;
  onDeleted: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      await fetch(`/api/settings/bank-accounts/${accountId}`, { method: "DELETE" });
      setOpen(false);
      onDeleted();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8 text-danger hover:text-danger hover:bg-danger/10">
          <Trash2 className="size-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete Bank Account</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-text-secondary">
          Remove <strong>{accountLabel}</strong>? Patients will no longer see it for Bank Transfer payments.
        </p>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" className="bg-white text-black border-border hover:bg-gray-100 dark:bg-white/[0.06] dark:text-white/80 dark:hover:bg-white/[0.12]">
              Cancel
            </Button>
          </DialogClose>
          <Button type="button" variant="destructive" onClick={handleDelete} disabled={deleting}>
            {deleting ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface UserRecord {
  id: string;
  email: string;
  role: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  is_active: boolean;
  created_at: string;
}

function UsersTab() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState("");

  async function loadUsers() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (roleFilter) params.set("role", roleFilter);
      const res = await fetch(`/api/admin/users?${params}`);
      const json = await res.json();
      if (json.success) setUsers(json.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, [roleFilter]);

  async function toggleActive(userId: string, current: boolean) {
    try {
      await fetch(`/api/admin/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !current }),
      });
      loadUsers();
    } catch (e) {
      console.error(e);
    }
  }

  const roleOptions = ["", "admin", "doctor", "nurse", "accountant", "patient"];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">User Management</CardTitle>
        <div className="flex items-center gap-2">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="h-9 rounded-lg border border-border bg-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            <option value="">All Roles</option>
            {roleOptions.slice(1).map((r) => (
              <option key={r} value={r}>{r.replace("_", " ")}</option>
            ))}
          </select>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : users.length === 0 ? (
          <p className="text-sm text-text-secondary text-center py-8">No users found.</p>
        ) : (
          <div className="divide-y divide-border">
            {users.map((u) => (
              <div key={u.id} className="flex items-center gap-4 py-3">
                <Avatar className="size-9 shrink-0">
                  <AvatarFallback className="text-xs bg-primary-lighter text-primary font-semibold">
                    {u.first_name?.[0]}{u.last_name?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {u.first_name} {u.last_name}
                  </p>
                  <p className="text-xs text-text-secondary truncate">{u.email}</p>
                </div>
                <Badge
                  variant={
                    u.role === "admin" ? "default" :
                    u.role === "doctor" ? "success" :
                    u.role === "nurse" ? "secondary" :
                    u.role === "accountant" ? "secondary" :
                    "outline"
                  }
                  className="hidden sm:inline-flex text-[10px] capitalize"
                >
                  {u.role.replace("_", " ")}
                </Badge>
                <Badge
                  variant={u.is_active ? "success" : "destructive"}
                  className="text-[10px]"
                >
                  {u.is_active ? "Active" : "Inactive"}
                </Badge>
                <div className="flex items-center gap-1 shrink-0">
                  <ResetPasswordDialog userId={u.id} userName={`${u.first_name} ${u.last_name}`} />
                  <button
                    onClick={() => toggleActive(u.id, u.is_active)}
                    className="rounded-lg p-2 text-text-secondary hover:text-foreground hover:bg-muted transition-colors"
                    title={u.is_active ? "Deactivate" : "Activate"}
                  >
                    {u.is_active ? <ShieldOff className="size-4" /> : <Shield className="size-4" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ResetPasswordDialog({ userId, userName }: { userId: string; userName: string }) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    if (password.length < 6) { setMessage("Password must be at least 6 characters"); return; }
    if (password !== confirm) { setMessage("Passwords do not match"); return; }
    setSaving(true);
    try {
      const payload: Record<string, string> = { password };
      if (email.trim()) payload.email = email.trim();
      const res = await fetch(`/api/admin/users/${userId}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success) {
        setMessage("Password reset successfully");
        setPassword("");
        setConfirm("");
        setEmail("");
      } else {
        setMessage(json.error || "Failed to reset password");
      }
    } catch {
      setMessage("Network error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className="rounded-lg p-2 text-text-secondary hover:text-foreground hover:bg-muted transition-colors"
          title="Reset Password"
        >
          <KeyRound className="size-4" />
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Reset Password</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-text-secondary mb-4">
          Set a new password for <strong>{userName}</strong>.
        </p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Login Email (optional)
            </label>
            <Input
              type="email"
              placeholder="For dependants — a real email to log in with"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <p className="text-xs text-text-secondary mt-1">
              Dependants have no real login yet — set a password and (optionally) a real email to activate their login.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              New Password
            </label>
            <Input
              type="password"
              placeholder="Min 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Confirm Password
            </label>
            <Input
              type="password"
              placeholder="Repeat password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
          </div>
          {message && (
            <div
              className={`rounded-md p-3 text-sm ${
                message.includes("success")
                  ? "bg-accent-light text-accent"
                  : "bg-destructive/10 text-destructive"
              }`}
            >
              {message}
            </div>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" className="bg-white text-black border-border hover:bg-gray-100 dark:bg-white/[0.06] dark:text-white/80 dark:hover:bg-white/[0.12]">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={saving}>
              {saving ? "Resetting..." : "Reset Password"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AddDoctorDialog({ onSaved }: { onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    specialty: "",
    bio: "",
    qualifications: "",
    photo_url: "",
    experience_years: "",
  });

  async function handleImageUpload(file: File) {
    setUploading(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await fetch("/api/upload/doctor-image", { method: "POST", body: fd });
      const json = await res.json();
      if (json.success) {
        setForm((f) => ({ ...f, photo_url: json.data.image_url }));
      } else {
        setError(json.error || "Upload failed");
      }
    } catch {
      setError("Image upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.name.trim() || !form.specialty.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/landing/doctors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          specialty: form.specialty.trim(),
          bio: form.bio || null,
          qualifications: form.qualifications || null,
          photo_url: form.photo_url || null,
          experience_years: form.experience_years ? parseInt(form.experience_years) : null,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setOpen(false);
        setForm({ name: "", specialty: "", bio: "", qualifications: "", photo_url: "", experience_years: "" });
        onSaved();
      } else {
        setError(json.error || "Failed to save doctor");
      }
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-4" />
          Add Doctor
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Doctor</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Photo
            </label>
            <div className="flex items-center gap-3">
              {form.photo_url ? (
                <img src={form.photo_url} alt="Preview" className="size-14 rounded-full object-cover border border-border" />
              ) : (
                <div className="size-14 rounded-full bg-muted flex items-center justify-center text-xs text-text-secondary border border-border">
                  No photo
                </div>
              )}
              <label className="cursor-pointer">
                <span className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg border border-border bg-card text-sm font-medium text-foreground hover:bg-muted transition-colors">
                  {uploading ? "Uploading..." : "Choose File"}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageUpload(file);
                  }}
                />
              </label>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Name
            </label>
            <Input
              placeholder="e.g. Dr. Sarah Johnson"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Specialty
            </label>
            <Input
              placeholder="e.g. Cardiologist"
              value={form.specialty}
              onChange={(e) =>
                setForm((f) => ({ ...f, specialty: e.target.value }))
              }
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Availability Text
            </label>
            <Input
              placeholder="e.g. Available Mon–Fri, 9 AM – 4 PM"
              value={form.bio}
              onChange={(e) =>
                setForm((f) => ({ ...f, bio: e.target.value }))
              }
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Qualifications
            </label>
            <Input
              placeholder="e.g. MBBS, FWACP"
              value={form.qualifications}
              onChange={(e) =>
                setForm((f) => ({ ...f, qualifications: e.target.value }))
              }
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Experience (years)
            </label>
            <Input
              type="number"
              placeholder="e.g. 10"
              value={form.experience_years}
              onChange={(e) =>
                setForm((f) => ({ ...f, experience_years: e.target.value }))
              }
            />
          </div>
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" className="bg-white text-black border-border hover:bg-gray-100 dark:bg-white/[0.06] dark:text-white/80 dark:hover:bg-white/[0.12]">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={saving || uploading}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditDoctorDialog({
  doctor,
  onSaved,
}: {
  doctor: Doctor;
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: doctor.name,
    specialty: doctor.specialty,
    bio: doctor.bio || "",
    qualifications: doctor.qualifications || "",
    photo_url: doctor.photo_url || "",
    experience_years: doctor.experience_years?.toString() || "",
  });

  useEffect(() => {
    setForm({
      name: doctor.name,
      specialty: doctor.specialty,
      bio: doctor.bio || "",
      qualifications: doctor.qualifications || "",
      photo_url: doctor.photo_url || "",
      experience_years: doctor.experience_years?.toString() || "",
    });
  }, [doctor]);

  async function handleImageUpload(file: File) {
    setUploading(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await fetch("/api/upload/doctor-image", { method: "POST", body: fd });
      const json = await res.json();
      if (json.success) {
        setForm((f) => ({ ...f, photo_url: json.data.image_url }));
      } else {
        setError(json.error || "Upload failed");
      }
    } catch {
      setError("Image upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.name.trim() || !form.specialty.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/landing/doctors/${doctor.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          specialty: form.specialty.trim(),
          bio: form.bio || null,
          qualifications: form.qualifications || null,
          photo_url: form.photo_url || null,
          experience_years: form.experience_years ? parseInt(form.experience_years) : null,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setOpen(false);
        onSaved();
      } else {
        setError(json.error || "Failed to save doctor");
      }
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8">
          <PenLine className="size-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Doctor</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Photo
            </label>
            <div className="flex items-center gap-3">
              {form.photo_url ? (
                <img src={form.photo_url} alt="Preview" className="size-14 rounded-full object-cover border border-border" />
              ) : (
                <div className="size-14 rounded-full bg-muted flex items-center justify-center text-xs text-text-secondary border border-border">
                  No photo
                </div>
              )}
              <label className="cursor-pointer">
                <span className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg border border-border bg-card text-sm font-medium text-foreground hover:bg-muted transition-colors">
                  {uploading ? "Uploading..." : "Change Photo"}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageUpload(file);
                  }}
                />
              </label>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Name
            </label>
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Specialty
            </label>
            <Input
              value={form.specialty}
              onChange={(e) =>
                setForm((f) => ({ ...f, specialty: e.target.value }))
              }
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Bio / Availability
            </label>
            <Input
              value={form.bio}
              onChange={(e) =>
                setForm((f) => ({ ...f, bio: e.target.value }))
              }
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Qualifications
            </label>
            <Input
              value={form.qualifications}
              onChange={(e) =>
                setForm((f) => ({ ...f, qualifications: e.target.value }))
              }
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Experience (years)
            </label>
            <Input
              type="number"
              value={form.experience_years}
              onChange={(e) =>
                setForm((f) => ({ ...f, experience_years: e.target.value }))
              }
            />
          </div>
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" className="bg-white text-black border-border hover:bg-gray-100 dark:bg-white/[0.06] dark:text-white/80 dark:hover:bg-white/[0.12]">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={saving || uploading}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteDoctorButton({
  doctorId,
  doctorName,
  onDeleted,
}: {
  doctorId: string;
  doctorName: string;
  onDeleted: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      await fetch(`/api/landing/doctors/${doctorId}`, { method: "DELETE" });
      setOpen(false);
      onDeleted();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 text-danger hover:text-danger hover:bg-danger/10"
        >
          <Trash2 className="size-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete Doctor</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-text-secondary">
          Are you sure you want to delete <strong>{doctorName}</strong>? This
          action cannot be undone.
        </p>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" className="bg-white text-black border-border hover:bg-gray-100 dark:bg-white/[0.06] dark:text-white/80 dark:hover:bg-white/[0.12]">
              Cancel
            </Button>
          </DialogClose>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
