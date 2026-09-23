"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft, Users, UserPlus, X, AlertTriangle, ShieldCheck,
  Calendar, Droplet, Dna, ChevronRight, Baby, Heart, Camera,
  FileText, Wallet, Clock, CheckCircle2, Stethoscope, Pill,
  ChevronDown, ChevronUp, CreditCard, Eye,
} from "lucide-react";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { useIsViewOnly } from "@/hooks/use-is-view-only";
import { fileToSquareImage } from "@/lib/avatar-resize";
import DoctorNotesSection from "@/components/DoctorNotesSection";
import MedicalReportsSection from "@/components/MedicalReportsSection";
import type { Dependant, Invoice, Appointment, Prescription, MedicalRecord } from "@/lib/api-types";

const MAX_DEPENDANTS = 5;

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const GENOTYPES = ["AA", "AS", "SS", "AC", "SC", "CC"];
const RELATIONSHIPS = ["Child", "Spouse", "Parent", "Sibling", "Grandparent", "Other"];

const relationshipIcons: Record<string, React.ElementType> = {
  Child: Baby, Spouse: Heart, Parent: Heart, Sibling: Users, Grandparent: Users, Other: Users,
};

const appointmentStatusStyles: Record<string, { icon: React.ElementType; cls: string }> = {
  scheduled: { icon: Clock, cls: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  confirmed: { icon: CheckCircle2, cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  in_progress: { icon: Stethoscope, cls: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  completed: { icon: CheckCircle2, cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  cancelled: { icon: X, cls: "bg-rose-500/10 text-rose-400 border-rose-500/20" },
  no_show: { icon: AlertTriangle, cls: "bg-rose-500/10 text-rose-400 border-rose-500/20" },
};

const invoiceStatusCls: Record<string, string> = {
  paid: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  issued: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  overdue: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  draft: "bg-muted text-muted-foreground border-border",
  partially_paid: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  void: "bg-muted text-muted-foreground border-border",
  cancelled: "bg-rose-500/10 text-rose-400 border-rose-500/20",
};

const recordTypeLabels: Record<string, string> = {
  diagnosis: "Diagnosis", lab_result: "Lab Result", prescription: "Prescription",
  surgery_report: "Surgery Report", vaccination: "Vaccination", imaging: "Imaging",
};

function GlassCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn(
      "relative rounded-2xl border border-border bg-card backdrop-blur-xl p-4 overflow-hidden",
      className
    )}>
      <div className="absolute top-0 right-0 w-32 h-32 translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-[#e0a84a]/[0.04] to-transparent" />
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{label}</label>
      {children}
    </div>
  );
}

const inputCls =
  "w-full h-11 px-3 border border-border bg-muted rounded-xl text-sm text-foreground placeholder:text-muted-foreground/60 hover:border-[#e0a84a]/40 transition-all focus:outline-none focus:ring-2 focus:ring-[#e0a84a]/20 focus:border-[#e0a84a]/40";

const selectCls =
  "w-full h-11 px-3 border border-border bg-card rounded-xl text-sm text-foreground hover:border-[#e0a84a]/40 transition-all focus:outline-none focus:ring-2 focus:ring-[#e0a84a]/20 focus:border-[#e0a84a]/40";

const textareaCls =
  "w-full px-3 py-2.5 border border-border bg-muted rounded-xl text-sm text-foreground placeholder:text-muted-foreground/60 resize-none hover:border-[#e0a84a]/40 transition-all focus:outline-none focus:ring-2 focus:ring-[#e0a84a]/20 focus:border-[#e0a84a]/40";

/* ───────── Dependant Tabs (inline expanded view) ───────── */

type DepTab = "biodata" | "records" | "bills" | "appointments";

function DependantTabs({ dependant }: { dependant: Dependant }) {
  const [tab, setTab] = useState<DepTab>("biodata");
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [medicalRecords, setMedicalRecords] = useState<MedicalRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = dependant.id;
    setLoading(true);
    Promise.all([
      fetch(`/api/invoices?patient_id=${id}&page_size=50`).then(r => r.json()),
      fetch(`/api/appointments?patient_id=${id}&page_size=50`).then(r => r.json()),
      fetch(`/api/prescriptions?patient_id=${id}&page_size=50`).then(r => r.json()),
      fetch(`/api/medical-records?patient_id=${id}&page_size=50`).then(r => r.json()),
    ]).then(([inv, apt, rx, rec]) => {
      setInvoices(inv.success ? inv.data || [] : []);
      setAppointments(apt.success ? apt.data || [] : []);
      setPrescriptions(rx.success ? rx.data || [] : []);
      setMedicalRecords(rec.success ? rec.data || [] : []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [dependant.id]);

  const tabs: { key: DepTab; label: string; icon: React.ElementType; count?: number }[] = [
    { key: "biodata", label: "Biodata", icon: Heart },
    { key: "records", label: "Records", icon: FileText },
    { key: "bills", label: "Bills", icon: Wallet, count: invoices.filter(i => i.status !== "paid" && i.status !== "void" && i.status !== "cancelled").length || undefined },
    { key: "appointments", label: "Appointments", icon: Calendar, count: appointments.filter(a => a.status !== "completed" && a.status !== "cancelled").length || undefined },
  ];

  const age = (dob: string | null) => {
    if (!dob) return null;
    return Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 3600 * 1000));
  };

  return (
    <div className="mt-3 border-t border-border pt-3 space-y-3">
      {/* Tab bar */}
      <div className="grid grid-cols-4 gap-1.5">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "relative flex flex-col items-center gap-1 py-2 rounded-xl text-[10px] font-medium transition-all",
                active
                  ? "bg-[#e0a84a]/10 text-[#e0a84a] border border-[#e0a84a]/20"
                  : "text-muted-foreground hover:bg-muted border border-transparent"
              )}
            >
              <Icon className="w-4 h-4" />
              <span>{t.label}</span>
              {t.count !== undefined && t.count > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#e0a84a] text-[#0a0f1a] text-[8px] font-bold flex items-center justify-center">
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {tab === "biodata" && (
        <div className="space-y-2">
          {[
            { label: "Full Name", value: dependant.full_name },
            { label: "Date of Birth", value: dependant.date_of_birth ? `${new Date(dependant.date_of_birth).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })} (${age(dependant.date_of_birth)} yrs)` : "—" },
            { label: "Sex", value: dependant.gender ? dependant.gender.charAt(0).toUpperCase() + dependant.gender.slice(1) : "—" },
            { label: "Blood Group", value: dependant.blood_group || "—" },
            { label: "Genotype", value: dependant.genotype || "—" },
            { label: "Allergies", value: dependant.allergies || "None" },
            { label: "Phone", value: dependant.phone || "—" },
            { label: "Relationship", value: dependant.relationship ? dependant.relationship.charAt(0).toUpperCase() + dependant.relationship.slice(1) : "—" },
          ].map((row) => (
            <div key={row.label} className="flex items-center justify-between py-2 border-b border-border last:border-0">
              <span className="text-xs text-muted-foreground">{row.label}</span>
              <span className="text-xs font-medium text-foreground">{row.value}</span>
            </div>
          ))}
        </div>
      )}

      {tab === "records" && (
        <div className="space-y-4">
          {loading ? (
            <div className="space-y-2">
              {[1, 2].map(i => <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />)}
            </div>
          ) : (
            <>
              {/* Medical Records */}
              {medicalRecords.length > 0 && (
                <div className="space-y-2">
                  <h4 className="flex items-center gap-1.5 text-xs font-semibold text-[#e0a84a]">
                    <FileText className="w-3.5 h-3.5" /> Medical Records ({medicalRecords.length})
                  </h4>
                  {medicalRecords.map((r) => (
                    <GlassCard key={r.id} className="!p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[#e0a84a]/10 border border-[#e0a84a]/20 text-[9px] font-semibold text-[#e0a84a]">
                          <FileText className="w-3 h-3" /> {recordTypeLabels[r.record_type] || r.record_type}
                        </span>
                        <span className="text-[10px] text-muted-foreground">{formatDate(r.created_at)}</span>
                      </div>
                      <p className="text-xs font-semibold text-foreground mt-1.5">{r.title}</p>
                      {r.description && <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{r.description}</p>}
                    </GlassCard>
                  ))}
                </div>
              )}

              {/* Prescriptions */}
              {prescriptions.length > 0 && (
                <div className="space-y-2">
                  <h4 className="flex items-center gap-1.5 text-xs font-semibold text-[#e0a84a]">
                    <Pill className="w-3.5 h-3.5" /> Prescriptions ({prescriptions.length})
                  </h4>
                  {prescriptions.map((rx) => (
                    <GlassCard key={rx.id} className="!p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-foreground">{rx.diagnosis || "Prescription"}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {formatDate(rx.created_at)}
                            {rx.doctor?.user && <> — Dr. {rx.doctor.user.first_name} {rx.doctor.user.last_name}</>}
                          </p>
                          {rx.items && rx.items.length > 0 && (
                            <div className="mt-1.5 space-y-0.5">
                              {rx.items.map((item) => (
                                <p key={item.id} className="text-[10px] text-muted-foreground">
                                  • {item.medication_name} — {item.dosage}, {item.frequency}{item.duration ? `, ${item.duration}` : ""}
                                </p>
                              ))}
                            </div>
                          )}
                        </div>
                        <span className={cn(
                          "inline-flex px-1.5 py-0.5 rounded-full text-[9px] font-semibold border capitalize shrink-0",
                          rx.status === "active" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : rx.status === "dispensed" ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                            : "bg-muted text-muted-foreground border-border"
                        )}>
                          {rx.status}
                        </span>
                      </div>
                    </GlassCard>
                  ))}
                </div>
              )}

              <DoctorNotesSection patientId={dependant.id} patientName={dependant.full_name} />
              <MedicalReportsSection
                patientId={dependant.id}
                patient={{ name: dependant.full_name }}
                canWrite={false}
              />
            </>
          )}
        </div>
      )}

      {tab === "bills" && (
        <div className="space-y-2">
          {loading ? (
            <div className="space-y-2">
              {[1, 2].map(i => <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />)}
            </div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-6">
              <Wallet className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">No bills yet</p>
            </div>
          ) : (
            invoices.map((inv) => {
              const due = inv.total - (inv.paid_amount || 0);
              return (
                <GlassCard key={inv.id} className="!p-3">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-foreground">{inv.invoice_number}</span>
                        <span className={cn("inline-flex px-1.5 py-0.5 rounded-full text-[9px] font-semibold border capitalize", invoiceStatusCls[inv.status] || "bg-muted text-muted-foreground border-border")}>
                          {inv.status.replace("_", " ")}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {formatDate(inv.issue_date)} · {inv.items?.length || 0} items
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-bold text-foreground">{formatCurrency(inv.total)}</p>
                      {due > 0 && inv.status !== "paid" && (
                        <p className="text-[10px] text-rose-400">Due: {formatCurrency(due)}</p>
                      )}
                    </div>
                  </div>
                </GlassCard>
              );
            })
          )}
        </div>
      )}

      {tab === "appointments" && (
        <div className="space-y-2">
          {loading ? (
            <div className="space-y-2">
              {[1, 2].map(i => <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />)}
            </div>
          ) : appointments.length === 0 ? (
            <div className="text-center py-6">
              <Calendar className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">No appointments yet</p>
            </div>
          ) : (
            appointments.map((apt) => {
              const st = appointmentStatusStyles[apt.status] || appointmentStatusStyles.scheduled;
              const StIcon = st.icon;
              const aptDate = apt.appointment_date || apt.scheduled_at?.split("T")[0] || "";
              const aptTime = apt.start_time || apt.scheduled_at?.split("T")[1]?.slice(0, 5) || "";
              return (
                <GlassCard key={apt.id} className="!p-3">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-10 h-10 rounded-xl border flex items-center justify-center shrink-0", st.cls)}>
                      <StIcon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-foreground">
                          {aptDate ? new Date(aptDate).toLocaleDateString("en-GB", { weekday: "short", month: "short", day: "numeric" }) : "—"}
                        </span>
                        {aptTime && <span className="text-[11px] text-muted-foreground">{aptTime}</span>}
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate">{apt.reason || "Appointment"}</p>
                    </div>
                    <span className={cn("inline-flex px-1.5 py-0.5 rounded-full text-[9px] font-semibold border capitalize", st.cls)}>
                      {apt.status}
                    </span>
                  </div>
                </GlassCard>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

/* ───────── Add Dependant Modal ───────── */

function AddDependantModal({ open, onClose, onCreated, maxReached }: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  maxReached: boolean;
}) {
  const [form, setForm] = useState({
    full_name: "", date_of_birth: "", sex: "",
    blood_group: "", genotype: "", allergies: "", phone: "", relationship: "",
  });
  const [avatar, setAvatar] = useState("");
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setForm({ full_name: "", date_of_birth: "", sex: "", blood_group: "", genotype: "", allergies: "", phone: "", relationship: "" });
      setAvatar("");
      setError("");
    }
  }, [open]);

  const onAvatarPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!/^image\/(jpeg|png|webp|gif)$/.test(file.type)) {
      setError("Unsupported image type — use JPG, PNG, WebP or GIF");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("Photo must be 2 MB or smaller");
      return;
    }
    try {
      const resized = await fileToSquareImage(file);
      const reader = new FileReader();
      reader.onload = () => setAvatar(String(reader.result || ""));
      reader.readAsDataURL(resized);
    } catch {
      setError("Could not process the photo");
    }
  };

  if (!open) return null;

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async () => {
    setError("");
    if (!form.full_name.trim() || !form.date_of_birth || !form.sex) {
      setError("Full name, date of birth and sex are required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/dependants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: form.full_name.trim(),
          date_of_birth: form.date_of_birth,
          sex: form.sex,
          blood_group: form.blood_group || undefined,
          genotype: form.genotype || undefined,
          allergies: form.allergies.trim() || undefined,
          phone: form.phone.trim() || undefined,
          relationship: form.relationship ? form.relationship.toLowerCase() : undefined,
          avatar: avatar || undefined,
        }),
      });
      const json = await res.json();
      if (json.success) { onCreated(); onClose(); }
      else setError(json.error || "Failed to add dependant");
    } catch { setError("Network error"); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 pb-20" onClick={onClose}>
      <div className="w-full max-w-md max-h-[85vh] overflow-y-auto bg-card border border-border rounded-3xl shadow-2xl p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <div>
            <h3 className="text-lg font-bold text-foreground">Add Dependant</h3>
            <p className="text-xs text-muted-foreground">Family member under your care</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-muted transition-all">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
        <div className={cn("mt-3 flex items-center gap-2 rounded-xl px-3 py-2.5 border text-xs",
          maxReached ? "border-amber-500/30 bg-amber-500/[0.06] text-amber-400" : "border-emerald-500/20 bg-emerald-500/[0.06] text-emerald-400"
        )}>
          {maxReached ? <AlertTriangle className="w-4 h-4 shrink-0" /> : <ShieldCheck className="w-4 h-4 shrink-0" />}
          <span>{maxReached ? "You've reached the maximum of 5 dependants." : `Up to ${MAX_DEPENDANTS} dependants per family account.`}</span>
        </div>
        <div className="space-y-4 mt-4">
          <Field label="Photo (optional)">
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => avatarInputRef.current?.click()}
                className="relative w-16 h-16 rounded-2xl border border-dashed border-white/[0.15] bg-card overflow-hidden flex items-center justify-center group hover:border-[#e0a84a]/50 transition-all">
                {avatar ? <img src={avatar} alt="" className="w-full h-full object-cover" /> : <Camera className="w-5 h-5 text-muted-foreground group-hover:text-[#e0a84a] transition-colors" />}
                <span className="absolute bottom-0 inset-x-0 bg-black/50 text-[9px] text-foreground/80 py-0.5 text-center font-medium">{avatar ? "Change" : "Add"}</span>
              </button>
              <div className="text-xs text-muted-foreground space-y-0.5"><p>Tap to choose a photo</p><p>JPG, PNG, WebP or GIF · max 2 MB</p></div>
              <input ref={avatarInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={onAvatarPick} />
            </div>
          </Field>
          <Field label="Full Name *"><input className={inputCls} value={form.full_name} onChange={set("full_name")} placeholder="e.g. Adaeze Edun" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date of Birth *"><input type="date" className={inputCls} value={form.date_of_birth} onChange={set("date_of_birth")} /></Field>
            <Field label="Sex *"><select className={selectCls} value={form.sex} onChange={set("sex")}><option value="">Select</option><option value="male">Male</option><option value="female">Female</option></select></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Blood Group"><select className={selectCls} value={form.blood_group} onChange={set("blood_group")}><option value="">Select</option>{BLOOD_GROUPS.map(bg => <option key={bg} value={bg}>{bg}</option>)}</select></Field>
            <Field label="Genotype"><select className={selectCls} value={form.genotype} onChange={set("genotype")}><option value="">Select</option>{GENOTYPES.map(g => <option key={g} value={g}>{g}</option>)}</select></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Relationship"><select className={selectCls} value={form.relationship} onChange={set("relationship")}><option value="">Select</option>{RELATIONSHIPS.map(r => <option key={r} value={r}>{r}</option>)}</select></Field>
            <Field label="Phone (optional)"><input className={inputCls} value={form.phone} onChange={set("phone")} placeholder="e.g. 0803 000 0000" /></Field>
          </div>
          <Field label="Allergies"><textarea className={textareaCls} rows={2} value={form.allergies} onChange={set("allergies")} placeholder="e.g. Penicillin, peanuts (leave blank if none)" /></Field>
          {error && <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-3 text-sm text-rose-400">{error}</div>}
          <button onClick={handleSubmit} disabled={saving}
            className="w-full h-12 bg-gradient-to-r from-[#e0a84a] to-amber-500 text-[#0a0f1a] text-sm font-semibold rounded-xl shadow-lg shadow-[#e0a84a]/20 hover:shadow-xl hover:shadow-[#e0a84a]/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]">
            {saving ? "Adding..." : "Add Dependant"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ───────── Main Page ───────── */

export default function DependantsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const viewOnly = useIsViewOnly();
  const isDependant = user?.role === "patient" && Boolean(user.patient?.is_dependant);
  const [dependants, setDependants] = useState<Dependant[]>([]);
  const [familyCode, setFamilyCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = () => {
    fetch("/api/dependants")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          setDependants(json.data.dependants || []);
          setFamilyCode(json.data.family?.family_code || "");
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const maxReached = dependants.length >= MAX_DEPENDANTS;

  const age = (dob: string | null) => {
    if (!dob) return null;
    return Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 3600 * 1000));
  };

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/patient" className="p-1 -ml-1">
          <ArrowLeft className="w-5 h-5 text-muted-foreground hover:text-foreground transition-colors" />
        </Link>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-foreground">Dependants</h2>
          <p className="text-xs text-muted-foreground">Manage family members under your care</p>
        </div>
        {!isDependant && !viewOnly && (
          <button onClick={() => setShowAdd(true)} disabled={maxReached}
            className={cn("inline-flex items-center gap-1.5 h-10 px-4 rounded-xl text-sm font-semibold transition-all active:scale-[0.98]",
              maxReached ? "bg-muted text-muted-foreground/60 cursor-not-allowed" : "bg-gradient-to-r from-[#e0a84a] to-amber-500 text-[#0a0f1a] shadow-lg shadow-[#e0a84a]/20 hover:shadow-xl hover:shadow-[#e0a84a]/30"
            )}>
            <UserPlus className="w-4 h-4" /> Add Dependant
          </button>
        )}
      </div>

      <GlassCard className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
            <Users className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Family Account {familyCode && <span className="text-[#e0a84a]">{familyCode}</span>}</p>
            <p className="text-xs text-muted-foreground">{dependants.length} of {MAX_DEPENDANTS} slots used</p>
          </div>
        </div>
        <div className="w-20 h-2 rounded-full bg-muted overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-[#e0a84a] to-amber-500 transition-all duration-500" style={{ width: `${(dependants.length / MAX_DEPENDANTS) * 100}%` }} />
        </div>
      </GlassCard>

      {maxReached && (
        <div className="flex items-center gap-2 rounded-xl bg-amber-500/[0.06] border border-amber-500/20 px-3 py-2.5 text-xs text-amber-400">
          <AlertTriangle className="w-4 h-4 shrink-0" /> You've reached the maximum of 5 dependants per family account.
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-2xl border border-border bg-card p-4 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-muted" />
                <div className="flex-1 space-y-2"><div className="h-3 w-1/2 bg-muted rounded" /><div className="h-3 w-1/3 bg-muted rounded" /></div>
              </div>
            </div>
          ))}
        </div>
      ) : dependants.length === 0 ? (
        <GlassCard className="flex flex-col items-center justify-center py-10 text-center">
          <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mb-3">
            <Users className="w-7 h-7 text-cyan-400" />
          </div>
          <h3 className="text-base font-semibold text-foreground">No dependants yet</h3>
          <p className="text-xs text-muted-foreground max-w-[240px] mt-1">
            {isDependant ? "Your main account holder manages dependants for your family." : "Add family members — children, spouse or relatives — so they're covered under your family account."}
          </p>
          {!isDependant && !viewOnly && (
            <button onClick={() => setShowAdd(true)}
              className="mt-4 h-10 px-5 bg-gradient-to-r from-[#e0a84a] to-amber-500 text-[#0a0f1a] text-sm font-semibold rounded-xl inline-flex items-center gap-2 shadow-lg shadow-[#e0a84a]/20 hover:shadow-xl hover:shadow-[#e0a84a]/30 transition-all active:scale-[0.98]">
              <UserPlus className="w-4 h-4" /> Add Dependant
            </button>
          )}
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {dependants.map((d) => {
            const RelIcon = relationshipIcons[d.relationship || "Other"] || Users;
            const a = age(d.date_of_birth);
            const expanded = expandedId === d.id;
            return (
              <div key={d.id} className="rounded-2xl border border-border bg-card backdrop-blur-xl overflow-hidden transition-all duration-300">
                {/* Dependant header card */}
                <button
                  onClick={() => toggleExpand(d.id)}
                  className="w-full text-left p-4 relative"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-[#e0a84a]/[0.05] to-transparent" />
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#0b2a4a] to-[#0d5f7a] border border-white/10 overflow-hidden flex items-center justify-center text-sm font-bold text-[#e0a84a] shrink-0">
                      {d.avatar_url ? <img src={d.avatar_url} alt="" className="w-full h-full object-cover" /> : d.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-foreground truncate">{d.full_name}</p>
                        <span className={cn("inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-semibold border",
                          d.status === "needs_attention" ? "bg-amber-500/10 border-amber-500/25 text-amber-400" : "bg-emerald-500/10 border-emerald-500/25 text-emerald-400"
                        )}>
                          {d.status === "needs_attention" ? <AlertTriangle className="w-2.5 h-2.5" /> : <ShieldCheck className="w-2.5 h-2.5" />}
                          {d.status === "needs_attention" ? "Attention" : "Active"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] text-[#e0a84a] font-semibold">{familyCode} · {d.patient_number}</span>
                        <span className="text-[11px] text-muted-foreground">
                          {a !== null ? `${a} yrs` : "—"} · <span className="capitalize">{d.gender || "—"}</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                        <span className="inline-flex items-center gap-0.5"><RelIcon className="w-3 h-3" /> {d.relationship || "Family"}</span>
                        {d.blood_group && <span className="inline-flex items-center gap-0.5"><Droplet className="w-3 h-3 text-rose-400/70" /> {d.blood_group}</span>}
                        {d.genotype && <span className="inline-flex items-center gap-0.5"><Dna className="w-3 h-3 text-cyan-400/70" /> {d.genotype}</span>}
                      </div>
                    </div>
                    <div className="shrink-0 flex items-center gap-2">
                      {d.outstanding > 0 && <span className="text-[10px] font-semibold text-rose-400">₦{d.outstanding.toLocaleString()}</span>}
                      {expanded ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
                    </div>
                  </div>
                </button>

                {/* Expanded content */}
                {expanded && <DependantTabs dependant={d} />}
              </div>
            );
          })}
        </div>
      )}

      {!isDependant && !viewOnly && !maxReached && dependants.length > 0 && (
        <button onClick={() => setShowAdd(true)}
          className="w-full h-12 rounded-2xl border border-dashed border-white/[0.12] text-sm text-muted-foreground hover:text-[#e0a84a] hover:border-[#e0a84a]/40 transition-all inline-flex items-center justify-center gap-2 bg-white/[0.02]">
          <UserPlus className="w-4 h-4" /> Add Dependant
        </button>
      )}

      <AddDependantModal open={showAdd} onClose={() => setShowAdd(false)} onCreated={load} maxReached={maxReached} />

      <p className="text-[11px] text-muted-foreground/60 text-center">
        <Calendar className="inline w-3 h-3 mr-1" />
        Dependants share your family account — medical records, bills and appointments sync across all hospital systems.
      </p>
    </div>
  );
}
