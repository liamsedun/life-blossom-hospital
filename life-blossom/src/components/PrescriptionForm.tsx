"use client";

import { useState } from "react";
import { Plus, Trash2, Loader2, Pill } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from "@/components/ui/dialog";

const ROUTES = ["oral", "iv", "intramuscular", "topical", "sublingual", "inhalation", "rectal"] as const;

type MedicationLine = {
  medication_name: string;
  dosage: string;
  route: string;
  frequency: string;
  duration: string;
  instructions: string;
};

const emptyLine: MedicationLine = {
  medication_name: "", dosage: "", route: "oral", frequency: "", duration: "", instructions: "",
};

interface PrescriptionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: string;
  patientName?: string;
  doctorId: string;
  doctorName?: string;
  onSaved?: () => void;
}

export default function PrescriptionForm({
  open, onOpenChange, patientId, patientName, doctorId, doctorName, onSaved,
}: PrescriptionFormProps) {
  const [diagnosis, setDiagnosis] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<MedicationLine[]>([{ ...emptyLine }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function addItem() {
    setItems([...items, { ...emptyLine }]);
  }

  function removeItem(i: number) {
    if (items.length <= 1) return;
    setItems(items.filter((_, idx) => idx !== i));
  }

  function updateItem(i: number, field: keyof MedicationLine, value: string) {
    const next = [...items];
    next[i] = { ...next[i], [field]: value };
    setItems(next);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const filled = items.filter((it) => it.medication_name.trim());
    if (!filled.length) {
      setError("Add at least one medication.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/prescriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_id: patientId,
          doctor_id: doctorId,
          diagnosis: diagnosis.trim() || undefined,
          notes: notes.trim() || undefined,
          items: filled.map((it) => ({
            medication_name: it.medication_name.trim(),
            dosage: it.dosage.trim(),
            route: it.route,
            frequency: it.frequency.trim(),
            duration: it.duration.trim() || undefined,
            instructions: it.instructions.trim() || undefined,
          })),
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to create prescription");
      setDiagnosis("");
      setNotes("");
      setItems([{ ...emptyLine }]);
      onOpenChange(false);
      onSaved?.();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { setDiagnosis(""); setNotes(""); setItems([{ ...emptyLine }]); setError(""); } onOpenChange(o); }}>
      <DialogContent className="sm:max-w-2xl border-border bg-card backdrop-blur-xl text-foreground max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <Pill className="size-5 text-[#e0a84a]" /> New Prescription
          </DialogTitle>
          {patientName && (
            <p className="text-xs text-muted-foreground mt-1">
              Patient: <span className="text-foreground font-medium">{patientName}</span>
              {doctorName && <>, prescribed by <span className="text-foreground font-medium">Dr. {doctorName}</span></>}
            </p>
          )}
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && <p className="text-xs text-red-400">{error}</p>}

          <div>
            <p className="text-xs text-muted-foreground mb-1">Diagnosis</p>
            <Input value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)}
              className="bg-background border-border text-foreground"
              placeholder="e.g. Acute Malaria" />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground">Medications</p>
              <Button type="button" variant="ghost" onClick={addItem} size="sm"
                className="h-7 text-xs text-[#e0a84a] hover:text-[#e0a84a] hover:bg-[#e0a84a]/10">
                <Plus className="size-3 mr-1" /> Add Item
              </Button>
            </div>

            {items.map((med, i) => (
              <div key={i} className="rounded-xl border border-border bg-muted/30 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Medication {i + 1}</p>
                  {items.length > 1 && (
                    <button type="button" onClick={() => removeItem(i)}
                      className="text-red-400 hover:text-red-300 p-0.5">
                      <Trash2 className="size-3.5" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-[10px] text-muted-foreground">Name *</p>
                    <Input value={med.medication_name} onChange={(e) => updateItem(i, "medication_name", e.target.value)}
                      className="h-8 text-xs bg-background border-border text-foreground" placeholder="e.g. Amoxicillin" required />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Dosage *</p>
                    <Input value={med.dosage} onChange={(e) => updateItem(i, "dosage", e.target.value)}
                      className="h-8 text-xs bg-background border-border text-foreground" placeholder="e.g. 500mg" required />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <p className="text-[10px] text-muted-foreground">Route</p>
                    <select value={med.route} onChange={(e) => updateItem(i, "route", e.target.value)}
                      className="flex h-8 w-full rounded-lg border border-border bg-background px-2 text-xs text-foreground">
                      {ROUTES.map((r) => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                    </select>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Frequency *</p>
                    <Input value={med.frequency} onChange={(e) => updateItem(i, "frequency", e.target.value)}
                      className="h-8 text-xs bg-background border-border text-foreground" placeholder="e.g. 3x daily" required />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Duration</p>
                    <Input value={med.duration} onChange={(e) => updateItem(i, "duration", e.target.value)}
                      className="h-8 text-xs bg-background border-border text-foreground" placeholder="e.g. 7 days" />
                  </div>
                </div>

                <div>
                  <p className="text-[10px] text-muted-foreground">Instructions</p>
                  <Input value={med.instructions} onChange={(e) => updateItem(i, "instructions", e.target.value)}
                    className="h-8 text-xs bg-background border-border text-foreground" placeholder="e.g. Take after food" />
                </div>
              </div>
            ))}
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-1">General Notes</p>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)}
              className="min-h-[60px] bg-background border-border text-foreground text-sm"
              placeholder="Additional instructions for the patient..." />
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline"
                className="bg-white text-black dark:bg-transparent dark:text-foreground border-border hover:bg-gray-100 dark:hover:bg-muted">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={saving}
              className="bg-gradient-to-r from-[#e0a84a] to-amber-500 text-[#0a0f1a] font-semibold border-0">
              {saving ? <Loader2 className="size-4 animate-spin mr-1" /> : null}
              Save Prescription
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
