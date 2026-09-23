"use client";

import { useState, useEffect } from "react";
import { Pill, ChevronDown, ChevronUp, Loader2, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface RxItem {
  id: string;
  medication_name: string;
  medicine_name: string;
  dosage: string;
  frequency: string;
  route: string;
  duration: string | null;
  instructions: string | null;
}

interface Prescription {
  id: string;
  patient_id: string;
  diagnosis: string | null;
  notes: string | null;
  status: string;
  created_at: string;
  patient?: { id: string; first_name: string; last_name: string; patient_number?: string } | null;
  doctor?: { user?: { first_name: string; last_name: string } | null } | null;
  items?: RxItem[];
}

const routeLabels: Record<string, string> = {
  oral: "Oral", iv: "IV", intramuscular: "IM", topical: "Topical",
  sublingual: "Sublingual", inhalation: "Inhalation", rectal: "Rectal",
};

export default function PatientPrescriptionsPage() {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch("/api/prescriptions?patient_id=family")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setPrescriptions(json.data || []);
        else setError(json.error || "Failed to load");
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const toggle = (id: string) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  function getPatientLabel(rx: Prescription) {
    if (rx.patient) return `${rx.patient.first_name} ${rx.patient.last_name}`;
    return "You";
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground">Prescriptions</h2>
          <Pill className="w-5 h-5 text-[#e0a84a]" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl border border-border bg-card p-4 animate-pulse">
              <div className="space-y-2">
                <div className="h-4 bg-muted rounded w-1/3" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground">Prescriptions</h2>
        <Pill className="w-5 h-5 text-[#e0a84a]" />
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      {prescriptions.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card backdrop-blur-xl p-6 text-center">
          <Pill className="w-8 h-8 text-muted-foreground/60 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No prescriptions found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {prescriptions.map((rx) => {
            const isOpen = expanded[rx.id];
            return (
              <div key={rx.id} className="rounded-2xl border border-border bg-card backdrop-blur-xl overflow-hidden">
                <button
                  onClick={() => toggle(rx.id)}
                  className="w-full text-left p-4 transition-all hover:bg-muted/30"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Badge className={cn(
                          "text-[10px]",
                          rx.status === "active"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : "bg-muted text-muted-foreground border-border"
                        )}>
                          {rx.status}
                        </Badge>
                        <span className="text-[11px] text-muted-foreground">
                          {new Date(rx.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                        </span>
                      </div>
                      <h4 className="text-sm font-semibold text-foreground">
                        {rx.diagnosis || "Prescription"}
                      </h4>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <User className="w-3 h-3 text-[#e0a84a]" />
                        <p className="text-xs text-[#e0a84a] font-medium">{getPatientLabel(rx)}</p>
                      </div>
                      {rx.doctor?.user && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Prescribed by Dr. {rx.doctor.user.first_name} {rx.doctor.user.last_name}
                        </p>
                      )}
                    </div>
                    {isOpen ? (
                      <ChevronUp className="w-4 h-4 text-muted-foreground/60 shrink-0 mt-1" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground/60 shrink-0 mt-1" />
                    )}
                  </div>

                  {!isOpen && rx.items && rx.items.length > 0 && (
                    <p className="mt-1.5 text-xs text-muted-foreground line-clamp-1">
                      {rx.items.map((it) => it.medication_name || it.medicine_name).join(", ")}
                    </p>
                  )}
                </button>

                {isOpen && (
                  <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
                    {rx.items && rx.items.length > 0 && (
                      <div className="space-y-2">
                        {rx.items.map((item) => (
                          <div key={item.id} className="rounded-xl border border-border bg-muted/30 p-3">
                            <div className="flex items-center gap-2 mb-1.5">
                              <Pill className="size-3.5 text-[#e0a84a] shrink-0" />
                              <p className="text-sm font-semibold text-foreground">
                                {item.medication_name || item.medicine_name}
                              </p>
                            </div>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                              <p className="text-muted-foreground">Dosage: <span className="text-foreground">{item.dosage}</span></p>
                              <p className="text-muted-foreground">Route: <span className="text-foreground">{routeLabels[item.route] || item.route}</span></p>
                              <p className="text-muted-foreground">Frequency: <span className="text-foreground">{item.frequency}</span></p>
                              {item.duration && <p className="text-muted-foreground">Duration: <span className="text-foreground">{item.duration}</span></p>}
                            </div>
                            {item.instructions && (
                              <p className="mt-1.5 text-xs text-muted-foreground italic">{item.instructions}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    {rx.notes && (
                      <div className="rounded-xl border border-border bg-muted/30 p-3">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Notes</p>
                        <p className="text-xs text-foreground/70 whitespace-pre-wrap">{rx.notes}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
