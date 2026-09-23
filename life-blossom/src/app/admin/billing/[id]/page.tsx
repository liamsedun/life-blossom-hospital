"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { ArrowLeft, Receipt, CreditCard, Download, CheckCircle, Clock, AlertCircle, Printer, DollarSign, Loader2, Pencil } from "lucide-react";
import { emitDashboardRefresh } from "@/lib/dashboard-events";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { usePaymentStore } from "@/stores/payment-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import EditInvoiceModal from "@/components/billing/edit-invoice-modal";
import type { Invoice, Payment } from "@/lib/api-types";

const statusStyles: Record<string, "success" | "secondary" | "destructive" | "warning" | "outline"> = {
  paid: "success",
  pending: "secondary",
  partially_paid: "warning",
  overdue: "destructive",
  cancelled: "outline",
  draft: "secondary",
};

const statusLabels: Record<string, string> = {
  paid: "Paid",
  pending: "Pending",
  partially_paid: "Partially Paid",
  draft: "Draft",
  cancelled: "Cancelled",
};

interface OrgProfile {
  name: string;
  logo_url: string | null;
  address: string;
  phone: string;
  email: string;
  website: string;
}

const DEFAULT_ORG: OrgProfile = {
  name: "Life Blossom Hospital",
  logo_url: "/logo.png",
  address: "",
  phone: "",
  email: "",
  website: "",
};

// ─── Record Payment Dialog ──────────────────────────────────────

function RecordPaymentDialog({
  invoice, open, onClose, onSuccess,
}: {
  invoice: Invoice;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("cash");
  const [ref, setRef] = useState("");
  const [notes, setNotes] = useState("");
  const [bankAccountId, setBankAccountId] = useState("");
  const [bankAccounts, setBankAccounts] = useState<Array<{ id: string; bank_name: string; account_name: string; account_number: string }>>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const outstanding = invoice.total - invoice.paid_amount;

  useEffect(() => {
    fetch("/api/settings/bank-accounts")
      .then((r) => r.json())
      .then((json) => { if (json.success) setBankAccounts(json.data?.accounts || []); })
      .catch(() => {});
  }, []);

  const handleSubmit = async () => {
    const num = parseFloat(amount);
    if (!num || num <= 0) { setError("Enter a valid amount"); return; }
    if (num > outstanding) { setError(`Amount exceeds outstanding of ₦${outstanding.toLocaleString()}`); return; }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/payments/record", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_id: invoice.patient_id,
          amount: num,
          payment_method: method,
          allocation: [{ invoice_id: invoice.id, amount: num }],
          transaction_ref: ref.trim() || undefined,
          notes: notes.trim() || undefined,
          bank_account_id: bankAccountId || undefined,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error || "Failed to record payment");
        return;
      }
      onSuccess();
      onClose();
      setAmount("");
      setRef("");
      setNotes("");
      setBankAccountId("");
      emitDashboardRefresh("payments");
    } catch {
      setError("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm border-border bg-card backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="text-foreground">Record Payment</DialogTitle>
          <DialogDescription className="text-muted-foreground">{invoice.invoice_number}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <div className="flex justify-between p-3 bg-muted rounded-lg">
            <span className="text-muted-foreground">Outstanding</span>
            <span className="font-bold text-amber-400">{formatCurrency(outstanding)}</span>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Amount (₦)</label>
            <Input type="number" min={0} max={outstanding} placeholder="0.00"
              className="h-9 bg-muted border-border text-foreground/80 placeholder:text-muted-foreground/40 focus-visible:border-[#e0a84a]/40 focus-visible:ring-[#e0a84a]/20"
              value={amount} onChange={(e) => { setAmount(e.target.value); setError(""); }} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Method</label>
            <div className="grid grid-cols-2 gap-2">
              {["cash", "transfer", "card", "mobile_money"].map((m) => (
                <button key={m} onClick={() => setMethod(m)}
                  className={cn(
                    "h-9 rounded-lg text-xs font-medium border capitalize transition-colors",
                    method === m
                      ? "border-[#e0a84a]/40 bg-[#e0a84a]/10 text-[#e0a84a]"
                      : "border-border text-muted-foreground hover:bg-muted"
                  )}>
                  {m.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>
          {bankAccounts.length > 0 && (
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Received Into</label>
              <select
                value={bankAccountId}
                onChange={(e) => setBankAccountId(e.target.value)}
                className="h-9 w-full rounded-lg border border-border bg-muted px-3 text-sm text-foreground focus:outline-none focus:border-[#e0a84a]/40"
              >
                <option value="">Select bank / cash account...</option>
                {bankAccounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.bank_name} — {a.account_number}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Reference</label>
            <Input placeholder="Transaction ref"
              className="h-9 bg-muted border-border text-foreground/80 placeholder:text-muted-foreground/40 focus-visible:border-[#e0a84a]/40 focus-visible:ring-[#e0a84a]/20"
              value={ref} onChange={(e) => setRef(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Notes (optional)</label>
            <Input placeholder="e.g. cash payment at front desk"
              className="h-9 bg-muted border-border text-foreground/80 placeholder:text-muted-foreground/40 focus-visible:border-[#e0a84a]/40 focus-visible:ring-[#e0a84a]/20"
              value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          {error && (
            <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 px-3 py-2 text-xs text-rose-400">{error}</div>
          )}
          <p className="text-[10px] text-muted-foreground/60 text-center">
            The patient will be notified automatically when the payment is confirmed.
          </p>
        </div>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose} disabled={submitting}
            className="bg-destructive text-destructive-foreground border-border hover:bg-destructive/90">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || !amount || parseFloat(amount) <= 0}
            className="bg-[#e0a84a] hover:bg-[#e0a84a]/90 text-[#0a0f1a] font-semibold">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
            Record Payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Payment Timeline ───────────────────────────────────────────

function PaymentTimeline({ payments }: { payments: Payment[] }) {
  if (!payments || payments.length === 0) return null;

  const sorted = [...payments].sort(
    (a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()
  );

  return (
    <div className="rounded-2xl border border-border bg-card backdrop-blur-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <CreditCard className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground">Payment Timeline</h3>
      </div>
      <div className="divide-y divide-border">
        {sorted.map((pmt, idx) => (
          <div key={pmt.id} className="px-4 py-3 flex items-start gap-3">
            <div className="relative flex flex-col items-center">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                pmt.status === "completed" ? "bg-emerald-500/10" : "bg-amber-500/10"
              )}>
                {pmt.status === "completed"
                  ? <CheckCircle className="w-4 h-4 text-emerald-400" />
                  : <Clock className="w-4 h-4 text-amber-400" />
                }
              </div>
              {idx < sorted.length - 1 && <div className="w-px flex-1 bg-muted min-h-[24px]" />}
            </div>
            <div className="flex-1 min-w-0 pb-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground capitalize">{pmt.payment_method}</p>
                <span className="text-sm font-bold text-emerald-400">+₦{pmt.amount.toLocaleString()}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {new Date(pmt.payment_date).toLocaleDateString("en-GB", {
                  day: "numeric", month: "short", year: "numeric",
                  hour: "2-digit", minute: "2-digit",
                })}
              </p>
              {pmt.transaction_ref && (
                <p className="text-xs text-muted-foreground mt-0.5">Ref: {pmt.transaction_ref}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Invoice Document (screen + print) ──────────────────────────

function InvoiceDocument({ invoice, org }: { invoice: Invoice; org: OrgProfile }) {
  const outstanding = invoice.total - invoice.paid_amount;
  const patientName = invoice.patient?.user
    ? `${invoice.patient.user.first_name} ${invoice.patient.user.last_name}`
    : "Unknown";
  const patient = invoice.patient;

  return (
    <div className="rounded-2xl border border-border bg-card backdrop-blur-xl p-6 print:p-0 print:rounded-none print:border-0 print:bg-white print:shadow-none print:text-black" id="invoice-print">
      {/* Hospital header */}
      <div className="flex items-start justify-between gap-4 pb-5 border-b-2 border-[#e0a84a]/60 print:border-black/20">
        <div className="flex items-start gap-3">
          {org.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={org.logo_url} alt={org.name} className="w-14 h-14 rounded-lg bg-white object-contain p-1 print:w-14 print:h-14 print:bg-white" />
          ) : (
            <div className="w-14 h-14 rounded-lg bg-[#e0a84a]/10 print:bg-gray-100 flex items-center justify-center">
              <Receipt className="w-7 h-7 text-[#e0a84a] print:text-gray-700" />
            </div>
          )}
          <div>
            <h1 className="text-lg font-bold text-foreground print:text-black">{org.name}</h1>
            {org.address && <p className="text-xs text-foreground/60 print:text-gray-600 print:text-[10px]">{org.address}</p>}
            <p className="text-xs text-foreground/60 print:text-gray-600 print:text-[10px]">
              {[org.phone && `Tel: ${org.phone}`, org.email && org.email].filter(Boolean).join("  •  ")}
            </p>
            {org.website && <p className="text-xs text-foreground/60 print:text-gray-600 print:text-[10px]">{org.website}</p>}
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/60 print:text-gray-500">Medical Invoice</p>
          <h2 className="text-2xl font-black text-foreground print:text-black">{invoice.invoice_number}</h2>
          <p className="text-xs text-foreground/60 print:text-gray-600 mt-1">
            Date: {formatDate(invoice.issue_date)}
            {invoice.due_date ? `  •  Due: ${formatDate(invoice.due_date)}` : ""}
          </p>
          <div className="mt-1.5 inline-block print:hidden">
            <Badge variant={statusStyles[invoice.status] || "secondary"} className="text-xs">
              {statusLabels[invoice.status] || invoice.status}
            </Badge>
          </div>
        </div>
      </div>

      {/* Bill to + attending */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 print:text-gray-500 font-semibold mb-1">Bill To</p>
          <p className="text-sm font-bold text-foreground print:text-black">{patientName}</p>
          {patient?.patient_number && (
            <p className="text-xs text-foreground/60 print:text-gray-600">Patient ID: {patient.patient_number}</p>
          )}
          {patient?.user?.email && (
            <p className="text-xs text-foreground/60 print:text-gray-600">{patient.user.email}</p>
          )}
          {patient?.user?.phone && (
            <p className="text-xs text-foreground/60 print:text-gray-600">{patient.user.phone}</p>
          )}
          {(patient?.address || patient?.city || patient?.state) && (
            <p className="text-xs text-foreground/60 print:text-gray-600">
              {[patient.address, patient.city, patient.state].filter(Boolean).join(", ")}
            </p>
          )}
        </div>
        <div className="sm:text-right">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 print:text-gray-500 font-semibold mb-1">Attending</p>
          {invoice.attending_staff ? (
            <>
              <p className="text-sm font-bold text-foreground print:text-black">
                 {invoice.attending_staff.first_name} {invoice.attending_staff.last_name}
               </p>
              <p className="text-xs text-foreground/60 print:text-gray-600 capitalize">
                {invoice.attending_staff.role.replace("_", " ")}
              </p>
            </>
          ) : (
            <p className="text-xs text-muted-foreground/60 print:text-gray-400">—</p>
          )}
        </div>
      </div>

      {/* Line items */}
      <table className="w-full text-sm mb-4 print:text-[11px]">
        <thead>
          <tr className="border-y border-border print:border-gray-400 text-left text-[11px] print:text-[9px] uppercase tracking-wider text-muted-foreground/60 print:text-gray-600">
            <th className="py-2 font-semibold">Item / Description</th>
            <th className="py-2 font-semibold text-center">Qty</th>
            <th className="py-2 font-semibold text-right">Unit Price</th>
            <th className="py-2 font-semibold text-right">VAT %</th>
            <th className="py-2 font-semibold text-right">VAT (₦)</th>
            <th className="py-2 font-semibold text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {invoice.items?.map((item) => (
            <tr key={item.id} className="border-b border-border print:border-gray-300">
              <td className="py-2.5 text-sm print:text-[11px] font-medium text-foreground print:text-black">{item.description}</td>
              <td className="py-2.5 text-sm print:text-[11px] text-center text-foreground/60 print:text-gray-700">{item.quantity}</td>
              <td className="py-2.5 text-sm print:text-[11px] text-right text-foreground/60 print:text-gray-700">₦{item.unit_price.toLocaleString()}</td>
              <td className="py-2.5 text-sm print:text-[11px] text-right text-foreground/60 print:text-gray-700">{item.vat_percent || 0}%</td>
              <td className="py-2.5 text-sm print:text-[11px] text-right text-foreground/60 print:text-gray-700">₦{Number(item.vat_amount || 0).toLocaleString()}</td>
              <td className="py-2.5 text-sm print:text-[11px] text-right font-semibold text-foreground print:text-black">₦{item.line_total.toLocaleString()}</td>
            </tr>
          ))}
          {(!invoice.items || invoice.items.length === 0) && (
            <tr>
              <td colSpan={6} className="py-3 text-sm print:text-[11px] text-muted-foreground/60 print:text-gray-500">No line items.</td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Totals */}
      <div className="flex justify-end">
        <div className="w-full sm:w-72 space-y-1.5 text-sm print:text-[11px]">
          <div className="flex justify-between">
            <span className="text-muted-foreground print:text-gray-600">Sub Total</span>
            <span className="text-foreground print:text-black">₦{invoice.subtotal.toLocaleString()}</span>
          </div>
          {invoice.discount > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground print:text-gray-600">Discount</span>
              <span className="text-red-400 print:text-red-600">-₦{invoice.discount.toLocaleString()}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground print:text-gray-600">VAT Amount</span>
            <span className="text-foreground print:text-black">₦{invoice.tax.toLocaleString()}</span>
          </div>
          <div className="flex justify-between font-bold text-base print:text-[11px] border-t border-border print:border-gray-400 pt-1.5">
            <span className="text-foreground print:text-black">Total Due</span>
             <span className="text-foreground print:text-black">₦{invoice.total.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-emerald-400 print:text-green-700 font-semibold">
            <span>Paid</span>
            <span>₦{invoice.paid_amount.toLocaleString()}</span>
          </div>
          {outstanding > 0 && invoice.status !== "cancelled" && (
            <div className="flex justify-between text-amber-400 print:text-amber-700 font-bold border-t border-border print:border-gray-400 pt-1.5">
              <span>Balance Due</span>
              <span>₦{outstanding.toLocaleString()}</span>
            </div>
          )}
        </div>
      </div>

      {invoice.notes && (
        <div className="mt-4 pt-3 border-t border-border print:border-gray-300">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 print:text-gray-500 font-semibold">Notes</p>
          <p className="text-sm text-foreground/80 print:text-gray-700 mt-0.5">{invoice.notes}</p>
        </div>
      )}

      {/* Footer */}
      <div className="mt-6 pt-4 border-t border-border print:border-gray-300 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          {org.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={org.logo_url} alt="" className="w-6 h-6 rounded bg-white object-contain p-0.5" />
          ) : (
            <Receipt className="w-4 h-4 text-[#e0a84a] print:text-gray-500" />
          )}
          <span className="text-xs text-foreground/60 print:text-gray-600">{org.name}</span>
        </div>
        <p className="text-xs text-muted-foreground/60 print:text-gray-500">
          {[org.email, org.website].filter(Boolean).join("  •  ")}{org.email || org.website ? "  •  " : ""}
          bills@lifeblossomcares.com.ng
        </p>
      </div>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────

export default function AdminInvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [showPayment, setShowPayment] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [voiding, setVoiding] = useState(false);
  const [org, setOrg] = useState<OrgProfile>(DEFAULT_ORG);

  const invoices = usePaymentStore((s) => s.invoices);
  const loading = usePaymentStore((s) => s.loading);
  const fetchInvoices = usePaymentStore((s) => s.fetchInvoices);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  useEffect(() => {
    fetch("/api/org")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          setOrg({
            name: json.data.name || DEFAULT_ORG.name,
            logo_url: json.data.logo_url || DEFAULT_ORG.logo_url,
            address: json.data.address || "",
            phone: json.data.phone || "",
            email: json.data.email || "",
            website: json.data.website || "",
          });
        }
      })
      .catch(() => {});
  }, []);

  const invoice = invoices.find((i) => i.id === id);

  const handleVoid = async () => {
    if (!confirm("Void this invoice? This cannot be undone.")) return;
    setVoiding(true);
    try {
      const res = await fetch(`/api/invoices/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      fetchInvoices();
      emitDashboardRefresh("invoices");
    } catch (e: any) {
      alert(e.message);
    } finally {
      setVoiding(false);
    }
  };

  if (loading && !invoice) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-[#e0a84a]" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="text-center py-20">
        <Receipt className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
        <p className="text-muted-foreground">Invoice not found.</p>
        <Link href="/admin/billing" className="text-[#e0a84a] text-sm mt-2 inline-block hover:underline">
          Back to Billing
        </Link>
      </div>
    );
  }

  const isActive = invoice.status === "pending" || invoice.status === "partially_paid";

  return (
    <div className="max-w-3xl space-y-5 print:space-y-0">
      {/* Header */}
      <div className="flex items-center justify-between print:hidden">
        <Link href="/admin/billing"
          className="inline-flex items-center gap-1.5 text-sm text-[#e0a84a] font-medium hover:underline">
          <ArrowLeft className="w-4 h-4" />Billing
        </Link>
        <div className="flex gap-1.5">
          {isActive && (
            <Button size="sm" variant="outline" className="h-8 text-xs text-blue-500 border-blue-500/40 hover:bg-blue-500/10 hover:text-blue-600"
              onClick={() => setShowEdit(true)}>
              <Pencil className="w-3.5 h-3.5 mr-1" />Edit
            </Button>
          )}
          {isActive && (
            <Button size="sm" variant="outline" className="h-8 text-xs text-emerald-600 border-emerald-500/40 hover:bg-emerald-500/10 hover:text-emerald-700"
              onClick={() => setShowPayment(true)}>
              <DollarSign className="w-3.5 h-3.5 mr-1" />Record Payment
            </Button>
          )}
          {isActive && (
            <Button size="sm" variant="outline" className="h-8 text-xs text-red-400 border-red-500/30 hover:bg-red-500/10"
              disabled={voiding} onClick={handleVoid}>
              {voiding ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
              Void
            </Button>
          )}
          <Button size="sm" variant="outline" className="h-8 text-xs text-foreground border-border hover:bg-muted"
            onClick={() => window.print()}>
            <Printer className="w-3.5 h-3.5 mr-1" />Print
          </Button>
        </div>
      </div>

      {/* Invoice document */}
      <InvoiceDocument invoice={invoice} org={org} />

      {/* Payment Timeline (screen only) */}
      <div className="print:hidden">
        <PaymentTimeline payments={invoice.payments || []} />
      </div>

      {/* Record Payment Dialog */}
      {showPayment && (
        <RecordPaymentDialog
          invoice={invoice}
          open={showPayment}
          onClose={() => setShowPayment(false)}
          onSuccess={() => fetchInvoices()}
        />
      )}

      {/* Edit Invoice Dialog */}
      {showEdit && (
        <EditInvoiceModal
          invoice={invoice}
          open={showEdit}
          onClose={() => setShowEdit(false)}
          onSuccess={() => fetchInvoices()}
        />
      )}
    </div>
  );
}
