"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Search, Plus, Eye, MoreHorizontal, Phone, Mail,
  Calendar, MapPin, Loader2, PenLine, Trash2, Clock,
  User, FileText, UserPlus, Pill, CheckCircle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn, formatDate } from "@/lib/utils";
import { usePatients, useCreatePatient } from "@/hooks/use-patients";
import DoctorNotesSection from "@/components/DoctorNotesSection";
import MedicalReportsSection from "@/components/MedicalReportsSection";
import PrescriptionForm from "@/components/PrescriptionForm";
import { useAuth } from "@/contexts/auth-context";
import { useIsViewOnly } from "@/hooks/use-is-view-only";
import type { Patient } from "@/lib/api-types";

function DependantsList({ patientId }: { patientId: string }) {
  const [deps, setDeps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetch(`/api/dependants?patient_id=${patientId}`)
      .then(r => r.json())
      .then(json => {
        if (json.success) setDeps(json.data.dependants || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [patientId]);
  
  if (loading) return <Loader2 className="size-4 animate-spin text-muted-foreground" />;
  if (deps.length === 0) return <p className="text-xs text-muted-foreground">No dependants</p>;
  
  return (
    <div className="flex flex-wrap gap-2">
      {deps.map((d: any) => (
        <span key={d.id} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-card border border-border text-xs text-foreground">
          <span className="w-5 h-5 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-[9px] font-bold text-cyan-400">
            {d.full_name?.charAt(0)?.toUpperCase() || "?"}
          </span>
          {d.full_name}
          {d.relationship && <span className="text-muted-foreground capitalize">({d.relationship})</span>}
        </span>
      ))}
    </div>
  );
}

interface PatientForm {
  email: string; password: string; first_name: string; last_name: string;
  phone: string; gender: string; date_of_birth: string; blood_group: string;
  genotype: string; marital_status: string;
  address: string; city: string; state: string;
  emergency_contact_name: string; emergency_contact_phone: string;
}

const emptyForm: PatientForm = {
  email: "", password: "", first_name: "", last_name: "", phone: "",
  gender: "", date_of_birth: "", blood_group: "", genotype: "", marital_status: "",
  address: "", city: "", state: "", emergency_contact_name: "", emergency_contact_phone: "",
};

function getInitials(name: string) {
  return name.split(/\s+/).filter(Boolean).map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const genotypes = ["AA", "AS", "SS", "AC", "SC", "CC"];
const maritalStatuses = ["single", "married", "divorced", "widowed"];
const relationships = ["child", "spouse", "parent", "sibling", "grandparent", "other"];

interface DependantForm {
  full_name: string; date_of_birth: string; sex: string;
  blood_group: string; genotype: string; allergies: string;
  phone: string; relationship: string;
}
const emptyDepForm: DependantForm = {
  full_name: "", date_of_birth: "", sex: "", blood_group: "", genotype: "",
  allergies: "", phone: "", relationship: "",
};

function PrescriptionsTab({ patientId, patientName, doctorId, currentUserId, refreshKey, onNewRx }: {
  patientId: string; patientName?: string; doctorId: string; currentUserId?: string; refreshKey?: number; onNewRx: () => void;
}) {
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dispensingId, setDispensingId] = useState<string | null>(null);

  useEffect(() => {
    loadPrescriptions();
  }, [patientId, refreshKey]);

  async function loadPrescriptions() {
    setLoading(true);
    try {
      const res = await fetch(`/api/prescriptions?patient_id=${patientId}`);
      const json = await res.json();
      if (json.success) setPrescriptions(json.data || []);
      else setError(json.error || "Failed to load");
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  async function markDispensed(rxId: string) {
    if (!currentUserId) return;
    setDispensingId(rxId);
    try {
      const res = await fetch(`/api/prescriptions/${rxId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "dispensed", dispensed_by: currentUserId, dispensed_at: new Date().toISOString() }),
      });
      const json = await res.json();
      if (json.success) {
        setPrescriptions((prev) => prev.map((r) => r.id === rxId ? { ...r, status: "dispensed", dispensed_by: currentUserId, dispensed_at: new Date().toISOString() } : r));
      } else {
        setError(json.error || "Failed to mark as dispensed");
      }
    } catch (e: any) { setError(e.message); }
    finally { setDispensingId(null); }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {prescriptions.length} prescription{prescriptions.length !== 1 ? "s" : ""} on record
        </p>
        <Button onClick={onNewRx} size="sm"
          className="h-7 text-xs bg-gradient-to-r from-[#e0a84a] to-amber-500 text-[#0a0f1a] font-semibold border-0">
          <Plus className="size-3 mr-1" />New Prescription
        </Button>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="size-5 animate-spin text-[#e0a84a]" />
        </div>
      ) : prescriptions.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No prescriptions yet.</p>
      ) : (
        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
          {prescriptions.map((rx: any) => (
            <div key={rx.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {rx.diagnosis || "Prescription"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(rx.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    {rx.doctor?.user && <> — Dr. {rx.doctor.user.first_name} {rx.doctor.user.last_name}</>}
                  </p>
                </div>
                <Badge className={`text-[10px] ${
                  rx.status === "dispensed"
                    ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                    : rx.status === "active"
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      : "bg-muted text-muted-foreground border-border"
                }`}>
                  {rx.status}
                </Badge>
              </div>
              {rx.items && rx.items.length > 0 && (
                <div className="mt-2 space-y-1">
                  {rx.items.map((item: any) => (
                    <div key={item.id} className="flex items-center gap-2 text-xs text-foreground/70">
                      <Pill className="size-3 text-[#e0a84a] shrink-0" />
                      <span className="font-medium">{item.medication_name || item.medicine_name}</span>
                      <span className="text-muted-foreground">•</span>
                      <span>{item.dosage}</span>
                      <span className="text-muted-foreground">•</span>
                      <span>{item.route}</span>
                      <span className="text-muted-foreground">•</span>
                      <span>{item.frequency}</span>
                      {item.duration && <><span className="text-muted-foreground">•</span><span>{item.duration}</span></>}
                    </div>
                  ))}
                </div>
              )}
              {rx.notes && (
                <p className="mt-2 text-xs text-muted-foreground italic">{rx.notes}</p>
              )}
              {rx.status === "active" && (
                <div className="mt-3 pt-2 border-t border-border">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300"
                    disabled={dispensingId === rx.id}
                    onClick={() => markDispensed(rx.id)}
                  >
                    {dispensingId === rx.id ? (
                      <><Loader2 className="size-3 mr-1 animate-spin" />Dispensing...</>
                    ) : (
                      <><CheckCircle className="size-3 mr-1" />Mark as Dispensed</>
                    )}
                  </Button>
                </div>
              )}
              {rx.status === "dispensed" && rx.dispensed_at && (
                <div className="mt-2 pt-2 border-t border-border">
                  <p className="text-[10px] text-blue-400">
                    Dispensed on {new Date(rx.dispensed_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function PatientsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");
  const { data: patientsData, loading, refresh } = usePatients();
  const { mutate: createPatient, loading: creating } = useCreatePatient();

  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editPatient, setEditPatient] = useState<Patient | null>(null);
  const [deletePatient, setDeletePatient] = useState<Patient | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [canWriteReports, setCanWriteReports] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<PatientForm>(emptyForm);
  const [formError, setFormError] = useState("");

  // Add dependant dialog state
  const [addDepForPatient, setAddDepForPatient] = useState<Patient | null>(null);
  const [depForm, setDepForm] = useState<DependantForm>(emptyDepForm);
  const [depSaving, setDepSaving] = useState(false);
  const [depError, setDepError] = useState("");

  // Prescription form state
  const [showRxForm, setShowRxForm] = useState(false);
  const [rxRefreshKey, setRxRefreshKey] = useState(0);
  const { user } = useAuth();
  const viewOnly = useIsViewOnly();

  function resetForm() { setForm(emptyForm); setFormError(""); }

  const searchParams = useSearchParams();
  const viewPatientId = searchParams.get("view");

  useEffect(() => {
    // Only doctors and the super admin can write medical reports
    fetch("/api/doctor-notes/check-role")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setCanWriteReports(json.data?.role === "doctor" || json.data?.role === "admin");
      })
      .catch(() => {});
  }, []);

  // Auto-open patient dialog when navigated with ?view=<id>
  useEffect(() => {
    if (viewPatientId && patientsData?.length) {
      const match = patientsData.find((p) => p.id === viewPatientId);
      if (match) {
        setSelectedPatient(match);
        // Clear the query param so re-entering the page doesn't re-open the dialog
        router.replace("/admin/patients", { scroll: false });
      }
    }
  }, [viewPatientId, patientsData, router]);

  const filtered = useMemo(() => {
    if (!patientsData) return [];
    return patientsData.filter((p) => {
      const name = `${p.user?.first_name || ""} ${p.user?.last_name || ""}`.toLowerCase();
      const num = p.patient_number?.toLowerCase() || "";
      const matchesSearch = name.includes(search.toLowerCase()) || num.includes(search.toLowerCase());
      const isActive = p.user?.is_active !== false;
      const isDep = Boolean(p.primary_account_id);

      if (tab === "active") return matchesSearch && isActive && !isDep;
      if (tab === "inactive") return matchesSearch && !isActive && !isDep;
      if (tab === "dependants") return matchesSearch && isDep;
      if (tab === "main") return matchesSearch && !isDep;
      return matchesSearch;
    });
  }, [patientsData, search, tab]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    if (!form.email || !form.password || !form.first_name || !form.last_name) {
      setFormError("Email, password, first name, and last name are required");
      return;
    }
    try {
      await createPatient(form as any);
      setShowAdd(false); resetForm(); refresh();
    } catch (err: any) { setFormError(err.message); }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editPatient) return;
    setFormError("");
    setSaving(true);
    try {
      const res = await fetch(`/api/patients/${editPatient.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Update failed");
      setEditPatient(null); refresh();
    } catch (err: any) { setFormError(err.message); }
    finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!deletePatient) return;
    setDeleting(true);
    try {
      await fetch(`/api/patients/${deletePatient.id}`, { method: "DELETE" });
      setDeletePatient(null); refresh();
    } catch { /* ignore */ }
    finally { setDeleting(false); }
  }

  async function handleAddDependant() {
    if (!addDepForPatient) return;
    setDepError("");
    if (!depForm.full_name.trim() || !depForm.date_of_birth || !depForm.sex) {
      setDepError("Full name, date of birth and sex are required");
      return;
    }
    setDepSaving(true);
    try {
      const res = await fetch("/api/dependants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_id: addDepForPatient.id,
          full_name: depForm.full_name.trim(),
          date_of_birth: depForm.date_of_birth,
          sex: depForm.sex,
          blood_group: depForm.blood_group || undefined,
          genotype: depForm.genotype || undefined,
          allergies: depForm.allergies.trim() || undefined,
          phone: depForm.phone.trim() || undefined,
          relationship: depForm.relationship || undefined,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to add dependant");
      setAddDepForPatient(null); setDepForm(emptyDepForm); refresh();
    } catch (e: any) { setDepError(e.message); }
    finally { setDepSaving(false); }
  }

  function openEdit(p: Patient) {
    setEditPatient(p);
    setForm({
      email: p.user?.email || "", password: "",
      first_name: p.user?.first_name || "", last_name: p.user?.last_name || "",
      phone: p.user?.phone || "", gender: p.gender || "",
      date_of_birth: p.date_of_birth?.split("T")[0] || "",
      blood_group: p.blood_group || "", genotype: p.genotype || "",
      marital_status: p.marital_status || "",
      address: p.address || "",
      city: p.city || "", state: p.state || "",
      emergency_contact_name: p.emergency_contact_name || "",
      emergency_contact_phone: p.emergency_contact_phone || "",
    });
    setFormError("");
  }

  const getAge = (dob: string | null | undefined) => {
    if (!dob) return "—";
    const birthDate = new Date(dob);
    if (isNaN(birthDate.getTime())) return "—";
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
  };

  const capitalize = (s: string | null | undefined) => s ? s.charAt(0).toUpperCase() + s.slice(1) : "—";

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Patients</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage all registered patients</p>
        </div>
        {!viewOnly && (
          <Button onClick={() => { resetForm(); setShowAdd(true); }}
            className="bg-gradient-to-r from-[#e0a84a] to-amber-500 text-[#0a0f1a] font-semibold border-0">
            <Plus className="size-4" />Add Patient
          </Button>
        )}
      </div>

      <Card className="border-border bg-card backdrop-blur-xl">
        <CardContent className="p-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search by name or ID..."
              className="h-9 pl-9 bg-muted border-border text-foreground placeholder:text-white/30"
              value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-muted border border-border">
          {[
            { value: "all", label: "All" },
            { value: "active", label: "Active" },
            { value: "inactive", label: "Inactive" },
            { value: "main", label: "Main Patients" },
            { value: "dependants", label: "Dependants" },
          ].map((t) => (
            <TabsTrigger key={t.value} value={t.value}
              className="capitalize data-[state=active]:bg-[#e0a84a]/15 data-[state=active]:text-[#e0a84a] text-muted-foreground">
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={tab} className="mt-4">
          <Card className="border-border bg-card backdrop-blur-xl">
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="size-6 animate-spin text-[#e0a84a]" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="px-5 py-12 text-center text-sm text-muted-foreground">
                  {patientsData?.length === 0 ? "No patients registered yet." : "No patients match your search."}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-xs text-muted-foreground">
                        <th className="px-5 py-3.5 font-medium">Patient</th>
                        <th className="px-5 py-3.5 font-medium">ID</th>
                        <th className="px-5 py-3.5 font-medium">Phone</th>
                        <th className="px-5 py-3.5 font-medium">Email</th>
                        <th className="px-5 py-3.5 font-medium">Registered</th>
                        <th className="px-5 py-3.5 font-medium">Status</th>
                        <th className="px-5 py-3.5 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((p) => {
                        const name = p.user ? `${p.user.first_name} ${p.user.last_name}` : p.id;
                        const initials = p.user ? getInitials(`${p.user.first_name} ${p.user.last_name}`) : "PT";
                        return (
                          <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-3">
                                <Avatar className="size-8 ring-1 ring-[#e0a84a]/20">
                                  <AvatarImage src="" alt={name} />
                                  <AvatarFallback className="text-xs bg-[#1a2540] text-[#e0a84a]">{initials}</AvatarFallback>
                                </Avatar>
                                <span className="font-medium text-foreground">{name}</span>
                                {p.primary_account_id && (
                                  <Badge className="text-[9px] bg-cyan-500/10 text-cyan-400 border-cyan-500/20 ml-1.5">Dependant</Badge>
                                )}
                              </div>
                            </td>
                            <td className="px-5 py-3 text-muted-foreground font-mono text-xs">{p.patient_number}</td>
                            <td className="px-5 py-3 text-muted-foreground">{p.user?.phone || "—"}</td>
                            <td className="px-5 py-3 text-muted-foreground">{p.user?.email || "—"}</td>
                            <td className="px-5 py-3 text-muted-foreground">{p.created_at ? formatDate(p.created_at) : "N/A"}</td>
                            <td className="px-5 py-3">
                              {p.user?.is_active !== false ? (
                                <Badge className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/20">Active</Badge>
                              ) : (
                                <Badge className="text-[10px] bg-amber-500/10 text-amber-400 border-amber-500/20">Inactive</Badge>
                              )}
                            </td>
                            <td className="px-5 py-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button variant="ghost" size="sm"
                                  className="h-8 text-xs text-[#e0a84a]/70 hover:text-[#e0a84a]"
                                  onClick={() => setSelectedPatient(p)}>
                                  <Eye className="size-3.5 mr-1" />View
                                </Button>
                                {!viewOnly && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-foreground">
                                      <MoreHorizontal className="size-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-36 border-border bg-card backdrop-blur-xl text-foreground/80">
                                    <DropdownMenuItem onClick={() => openEdit(p)}
                                      className="hover:bg-white/[0.06] hover:text-foreground">
                                      <PenLine className="size-3.5 mr-2" />Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => router.push("/admin/appointments")}
                                      className="hover:bg-white/[0.06] hover:text-foreground">
                                      <Calendar className="size-3.5 mr-2" />Schedule
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setDeletePatient(p)}
                                      className="text-red-400 hover:bg-white/[0.06] hover:text-red-300">
                                      <Trash2 className="size-3.5 mr-2" />Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* View Patient Dialog */}
      <Dialog open={!!selectedPatient} onOpenChange={(o) => { if (!o) setSelectedPatient(null); }}>
        <DialogContent className="max-w-2xl border-border bg-card backdrop-blur-xl text-foreground max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {selectedPatient?.user ? `${selectedPatient.user.first_name} ${selectedPatient.user.last_name}` : "Patient"}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">Patient ID: {selectedPatient?.patient_number}</DialogDescription>
          </DialogHeader>
          {selectedPatient && (
            <Tabs defaultValue="info" className="mt-2">
              <TabsList className="bg-muted border border-border">
                <TabsTrigger value="info" className="text-xs data-[state=active]:bg-[#e0a84a]/15 data-[state=active]:text-[#e0a84a] text-muted-foreground">
                  <User className="size-3.5 mr-1" />Patient Info
                </TabsTrigger>
                <TabsTrigger value="clinical-notes" className="text-xs data-[state=active]:bg-[#e0a84a]/15 data-[state=active]:text-[#e0a84a] text-muted-foreground">
                  <FileText className="size-3.5 mr-1" />Clinical Notes
                </TabsTrigger>
                <TabsTrigger value="medical-reports" className="text-xs data-[state=active]:bg-[#e0a84a]/15 data-[state=active]:text-[#e0a84a] text-muted-foreground">
                  <FileText className="size-3.5 mr-1" />Medical Reports
                </TabsTrigger>
                <TabsTrigger value="prescriptions" className="text-xs data-[state=active]:bg-[#e0a84a]/15 data-[state=active]:text-[#e0a84a] text-muted-foreground">
                  <Pill className="size-3.5 mr-1" />Prescriptions
                </TabsTrigger>
              </TabsList>

              <TabsContent value="info" className="mt-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Gender</p>
                    <p className="font-medium text-foreground">{capitalize(selectedPatient.gender)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Age</p>
                    <p className="font-medium text-foreground">{getAge(selectedPatient.date_of_birth)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Blood Group</p>
                    <p className="font-medium text-foreground">{selectedPatient.blood_group || "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Genotype</p>
                    <p className="font-medium text-foreground">{selectedPatient.genotype || "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Marital Status</p>
                    <p className="font-medium text-foreground capitalize">{capitalize(selectedPatient.marital_status)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Status</p>
                    {selectedPatient?.user?.is_active !== false ? (
                      <Badge className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/20">Active</Badge>
                    ) : (
                      <Badge className="text-[10px] bg-amber-500/10 text-amber-400 border-amber-500/20">Inactive</Badge>
                    )}
                  </div>
                  <div className="col-span-2">
                    <p className="text-muted-foreground text-xs">Address</p>
                    <p className="font-medium text-foreground">{[selectedPatient.address, selectedPatient.city, selectedPatient.state].filter(Boolean).join(", ") || "—"}</p>
                  </div>
                  <div className="col-span-2 flex items-center gap-4 pt-2 border-t border-border">
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Phone className="size-3.5" />{selectedPatient.user?.phone ? <a href={`tel:${selectedPatient.user.phone}`} className="text-blue-400 hover:underline">{selectedPatient.user.phone}</a> : "—"}
                    </span>
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Mail className="size-3.5" />{selectedPatient.user?.email ? <a href={`mailto:${selectedPatient.user.email}`} className="text-blue-400 hover:underline">{selectedPatient.user.email}</a> : "—"}
                    </span>
                  </div>
                  {selectedPatient && !selectedPatient.primary_account_id && (
                    <div className="col-span-2 pt-2 border-t border-border">
                      <p className="text-muted-foreground text-xs mb-2">Family Dependants</p>
                      <DependantsList patientId={selectedPatient.id} />
                    </div>
                  )}
                </div>
                <DialogFooter className="mt-4 pt-4 border-t border-border">
                  <DialogClose asChild>
                    <Button variant="outline" className="bg-white text-black border-border hover:bg-gray-100">Close</Button>
                  </DialogClose>
                  <Button onClick={() => { if (selectedPatient) openEdit(selectedPatient); setSelectedPatient(null); }}
                    className="bg-gradient-to-r from-[#e0a84a] to-amber-500 text-[#0a0f1a] font-semibold border-0">
                    <PenLine className="size-4 mr-1" />Edit
                  </Button>
                  {selectedPatient && !selectedPatient.primary_account_id && (
                    <Button onClick={() => { 
                      setAddDepForPatient(selectedPatient);
                      setSelectedPatient(null);
                    }}
                      className="bg-gradient-to-r from-cyan-500 to-teal-400 text-white font-semibold border-0">
                      <UserPlus className="size-4 mr-1" />Add Dependant
                    </Button>
                  )}
                </DialogFooter>
              </TabsContent>

              <TabsContent value="clinical-notes" className="mt-4">
                <DoctorNotesSection
                  patientId={selectedPatient.id}
                  patientName={selectedPatient.user ? `${selectedPatient.user.first_name} ${selectedPatient.user.last_name}` : undefined}
                />
                <DialogFooter className="mt-4 pt-4 border-t border-border">
                  <DialogClose asChild>
                    <Button variant="outline" className="bg-white text-black border-border hover:bg-gray-100">Close</Button>
                  </DialogClose>
                </DialogFooter>
              </TabsContent>

              <TabsContent value="medical-reports" className="mt-4">
                <MedicalReportsSection
                  patientId={selectedPatient.id}
                  canWrite={canWriteReports}
                  patient={{
                    name: selectedPatient.user ? `${selectedPatient.user.first_name} ${selectedPatient.user.last_name}` : "Patient",
                    address: [selectedPatient.address, selectedPatient.city, selectedPatient.state].filter(Boolean).join(", ") || undefined,
                    phone: selectedPatient.user?.phone || undefined,
                  }}
                />
                <DialogFooter className="mt-4 pt-4 border-t border-border">
                  <DialogClose asChild>
                    <Button variant="outline" className="bg-white text-black border-border hover:bg-gray-100">Close</Button>
                  </DialogClose>
                </DialogFooter>
              </TabsContent>

              <TabsContent value="prescriptions" className="mt-4">
                <PrescriptionsTab
                  patientId={selectedPatient.id}
                  patientName={selectedPatient.user ? `${selectedPatient.user.first_name} ${selectedPatient.user.last_name}` : undefined}
                  doctorId={user?.id || ""}
                  currentUserId={user?.id}
                  refreshKey={rxRefreshKey}
                  onNewRx={() => setShowRxForm(true)}
                />
                <DialogFooter className="mt-4 pt-4 border-t border-border">
                  <DialogClose asChild>
                    <Button variant="outline" className="bg-white text-black dark:bg-transparent dark:text-foreground border-border hover:bg-gray-100 dark:hover:bg-muted">Close</Button>
                  </DialogClose>
                </DialogFooter>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Prescription Form Dialog */}
      {selectedPatient && (
        <PrescriptionForm
          open={showRxForm}
          onOpenChange={setShowRxForm}
          patientId={selectedPatient.id}
          patientName={selectedPatient.user ? `${selectedPatient.user.first_name} ${selectedPatient.user.last_name}` : undefined}
          doctorId={user?.id || ""}
          doctorName={user ? `${user.first_name} ${user.last_name}` : undefined}
          onSaved={() => { setShowRxForm(false); setRxRefreshKey((k) => k + 1); }}
        />
      )}

      {/* Add Patient Modal */}
      <Dialog open={showAdd} onOpenChange={(o) => { if (!creating) { setShowAdd(o); if (!o) resetForm(); } }}>
        <DialogContent className="sm:max-w-lg border-border bg-card backdrop-blur-xl text-foreground max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-foreground">Add Patient</DialogTitle></DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">First Name *</label>
                <Input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                  className="bg-muted border-border text-foreground" required />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Last Name *</label>
                <Input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                  className="bg-muted border-border text-foreground" required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Email *</label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="bg-muted border-border text-foreground" required />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Password *</label>
                <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Min 6 chars" className="bg-muted border-border text-foreground" required minLength={6} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Phone</label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="bg-muted border-border text-foreground" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Gender</label>
                <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}
                  className="flex h-10 w-full rounded-xl border border-border bg-muted px-3 py-2 text-sm text-foreground">
                  <option value="" className="bg-card">Select</option>
                  <option value="male" className="bg-card">Male</option>
                  <option value="female" className="bg-card">Female</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Date of Birth</label>
                <Input type="date" value={form.date_of_birth} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })}
                  className="bg-muted border-border text-foreground" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Blood Group</label>
                <select value={form.blood_group} onChange={(e) => setForm({ ...form, blood_group: e.target.value })}
                  className="flex h-10 w-full rounded-xl border border-border bg-muted px-3 py-2 text-sm text-foreground">
                  <option value="" className="bg-card">Select</option>
                  {bloodGroups.map((bg) => (
                    <option key={bg} value={bg} className="bg-card">{bg}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Genotype</label>
                <select value={form.genotype} onChange={(e) => setForm({ ...form, genotype: e.target.value })}
                  className="flex h-10 w-full rounded-xl border border-border bg-muted px-3 py-2 text-sm text-foreground">
                  <option value="" className="bg-card">Select</option>
                  {genotypes.map((g) => (
                    <option key={g} value={g} className="bg-card">{g}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Marital Status</label>
              <select value={form.marital_status} onChange={(e) => setForm({ ...form, marital_status: e.target.value })}
                className="flex h-10 w-full rounded-xl border border-border bg-muted px-3 py-2 text-sm text-foreground">
                <option value="" className="bg-card">Select</option>
                {maritalStatuses.map((m) => (
                  <option key={m} value={m} className="dark:bg-[#0d1322] capitalize">{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Address</label>
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="bg-muted border-border text-foreground" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">City</label>
                <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className="bg-muted border-border text-foreground" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">State</label>
                <Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })}
                  className="bg-muted border-border text-foreground" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Emergency Contact Name</label>
                <Input value={form.emergency_contact_name} onChange={(e) => setForm({ ...form, emergency_contact_name: e.target.value })}
                  className="bg-muted border-border text-foreground" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Emergency Contact Phone</label>
                <Input value={form.emergency_contact_phone} onChange={(e) => setForm({ ...form, emergency_contact_phone: e.target.value })}
                  className="bg-muted border-border text-foreground" />
              </div>
            </div>
            {formError && <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 px-3 py-2 text-sm text-rose-400">{formError}</div>}
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" className="bg-white text-black border-border hover:bg-gray-100">Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={creating}
                className="bg-gradient-to-r from-[#e0a84a] to-amber-500 text-[#0a0f1a] font-semibold border-0">
                {creating ? "Creating..." : "Create Patient"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Patient Modal */}
      <Dialog open={!!editPatient} onOpenChange={(o) => { if (!saving) { setEditPatient(null); resetForm(); } }}>
        <DialogContent className="sm:max-w-lg border-border bg-card backdrop-blur-xl text-foreground max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-foreground">Edit Patient</DialogTitle></DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">First Name</label>
                <Input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                  className="bg-muted border-border text-foreground" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Last Name</label>
                <Input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                  className="bg-muted border-border text-foreground" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Phone</label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="bg-muted border-border text-foreground" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Gender</label>
                <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}
                  className="flex h-10 w-full rounded-xl border border-border bg-muted px-3 py-2 text-sm text-foreground">
                  <option value="" className="bg-card">Select</option>
                  <option value="male" className="bg-card">Male</option>
                  <option value="female" className="bg-card">Female</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Date of Birth</label>
              <Input type="date" value={form.date_of_birth} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })}
                className="bg-muted border-border text-foreground" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Blood Group</label>
              <select value={form.blood_group} onChange={(e) => setForm({ ...form, blood_group: e.target.value })}
                className="flex h-10 w-full rounded-xl border border-border bg-muted px-3 py-2 text-sm text-foreground">
                <option value="" className="bg-card">Select</option>
                {bloodGroups.map((bg) => (
                  <option key={bg} value={bg} className="bg-card">{bg}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Genotype</label>
                <select value={form.genotype} onChange={(e) => setForm({ ...form, genotype: e.target.value })}
                  className="flex h-10 w-full rounded-xl border border-border bg-muted px-3 py-2 text-sm text-foreground">
                  <option value="" className="bg-card">Select</option>
                  {genotypes.map((g) => (
                    <option key={g} value={g} className="bg-card">{g}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Marital Status</label>
                <select value={form.marital_status} onChange={(e) => setForm({ ...form, marital_status: e.target.value })}
                  className="flex h-10 w-full rounded-xl border border-border bg-muted px-3 py-2 text-sm text-foreground">
                  <option value="" className="bg-card">Select</option>
                  {maritalStatuses.map((m) => (
                    <option key={m} value={m} className="dark:bg-[#0d1322] capitalize">{m}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Address</label>
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="bg-muted border-border text-foreground" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">City</label>
                <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className="bg-muted border-border text-foreground" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">State</label>
                <Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })}
                  className="bg-muted border-border text-foreground" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Emergency Contact Name</label>
                <Input value={form.emergency_contact_name} onChange={(e) => setForm({ ...form, emergency_contact_name: e.target.value })}
                  className="bg-muted border-border text-foreground" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Emergency Contact Phone</label>
                <Input value={form.emergency_contact_phone} onChange={(e) => setForm({ ...form, emergency_contact_phone: e.target.value })}
                  className="bg-muted border-border text-foreground" />
              </div>
            </div>
            {formError && <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 px-3 py-2 text-sm text-rose-400">{formError}</div>}
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" className="bg-white text-black border-border hover:bg-gray-100">Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={saving}
                className="bg-gradient-to-r from-[#e0a84a] to-amber-500 text-[#0a0f1a] font-semibold border-0">
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deletePatient} onOpenChange={(o) => { if (!o) setDeletePatient(null); }}>
        <DialogContent className="sm:max-w-sm border-border bg-card backdrop-blur-xl text-foreground">
          <DialogHeader>
            <DialogTitle className="text-foreground">Deactivate Patient</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-foreground/60">
            Are you sure you want to deactivate <strong className="text-foreground">
              {deletePatient?.user ? `${deletePatient.user.first_name} ${deletePatient.user.last_name}` : "this patient"}
            </strong>? They will be unable to log in.
          </p>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" className="bg-white text-black border-border hover:bg-gray-100">Cancel</Button>
            </DialogClose>
            <Button type="button" variant="destructive" onClick={handleDelete} disabled={deleting}
              className="bg-gradient-to-r from-rose-500 to-pink-500 text-white border-0">
              {deleting ? "Deactivating..." : "Deactivate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Dependant Dialog */}
      <Dialog open={!!addDepForPatient} onOpenChange={(o) => { if (!o) { setAddDepForPatient(null); setDepForm(emptyDepForm); setDepError(""); } }}>
        <DialogContent className="sm:max-w-lg border-border bg-card backdrop-blur-xl text-foreground max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              Add Dependant for {addDepForPatient?.user ? `${addDepForPatient.user.first_name} ${addDepForPatient.user.last_name}` : "Patient"}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Family member under {addDepForPatient?.user?.first_name || "this patient"}&apos;s account
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Full Name *</label>
              <Input value={depForm.full_name} onChange={(e) => setDepForm({ ...depForm, full_name: e.target.value })}
                placeholder="e.g. Adaeze Edun" className="bg-muted border-border text-foreground" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Date of Birth *</label>
                <Input type="date" value={depForm.date_of_birth} onChange={(e) => setDepForm({ ...depForm, date_of_birth: e.target.value })}
                  className="bg-muted border-border text-foreground" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Sex *</label>
                <select value={depForm.sex} onChange={(e) => setDepForm({ ...depForm, sex: e.target.value })}
                  className="flex h-10 w-full rounded-xl border border-border bg-muted px-3 py-2 text-sm text-foreground">
                  <option value="" className="bg-card">Select</option>
                  <option value="male" className="bg-card">Male</option>
                  <option value="female" className="bg-card">Female</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Blood Group</label>
                <select value={depForm.blood_group} onChange={(e) => setDepForm({ ...depForm, blood_group: e.target.value })}
                  className="flex h-10 w-full rounded-xl border border-border bg-muted px-3 py-2 text-sm text-foreground">
                  <option value="" className="bg-card">Select</option>
                  {bloodGroups.map((bg) => <option key={bg} value={bg} className="bg-card">{bg}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Genotype</label>
                <select value={depForm.genotype} onChange={(e) => setDepForm({ ...depForm, genotype: e.target.value })}
                  className="flex h-10 w-full rounded-xl border border-border bg-muted px-3 py-2 text-sm text-foreground">
                  <option value="" className="bg-card">Select</option>
                  {genotypes.map((g) => <option key={g} value={g} className="bg-card">{g}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Relationship</label>
                <select value={depForm.relationship} onChange={(e) => setDepForm({ ...depForm, relationship: e.target.value })}
                  className="flex h-10 w-full rounded-xl border border-border bg-muted px-3 py-2 text-sm text-foreground">
                  <option value="" className="bg-card">Select</option>
                  {relationships.map((r) => <option key={r} value={r} className="bg-card capitalize">{r}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Phone</label>
                <Input value={depForm.phone} onChange={(e) => setDepForm({ ...depForm, phone: e.target.value })}
                  placeholder="e.g. 0803 000 0000" className="bg-muted border-border text-foreground" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Allergies</label>
              <Input value={depForm.allergies} onChange={(e) => setDepForm({ ...depForm, allergies: e.target.value })}
                placeholder="e.g. Penicillin (leave blank if none)" className="bg-muted border-border text-foreground" />
            </div>
            {depError && <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 px-3 py-2 text-sm text-rose-400">{depError}</div>}
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" className="bg-white text-black border-border hover:bg-gray-100">Cancel</Button>
              </DialogClose>
              <Button type="button" onClick={handleAddDependant} disabled={depSaving}
                className="bg-gradient-to-r from-cyan-500 to-teal-400 text-white font-semibold border-0">
                {depSaving ? "Adding..." : "Add Dependant"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
