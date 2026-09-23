"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  Search, Plus, Eye, DollarSign, TrendingUp, Wallet, Receipt,
  Loader2, CheckCircle, AlertCircle, FileText, Landmark, Clock, X, Calendar,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { usePaymentStore } from "@/stores/payment-store";
import CreateInvoiceModal from "@/components/billing/create-invoice-modal";
import EditInvoiceModal from "@/components/billing/edit-invoice-modal";
import type { InvoiceStatus, Invoice } from "@/lib/api-types";
import { emitDashboardRefresh } from "@/lib/dashboard-events";

type DisplayStatus = "Paid" | "Pending" | "Overdue" | "Partial";

interface InvoiceDisplay {
  id: string;
  invoiceNumber: string;
  patient: string;
  patientId: string;
  service: string;
  amount: number;
  paidAmount: number;
  date: string;
  dueDate: string;
  status: DisplayStatus;
  raw: Invoice;
}

const statusStyles: Record<DisplayStatus, "success" | "secondary" | "destructive" | "warning"> = {
  Paid: "success",
  Pending: "secondary",
  Overdue: "destructive",
  Partial: "warning",
};

const statusIcon: Record<DisplayStatus, typeof CheckCircle> = {
  Paid: CheckCircle,
  Pending: FileText,
  Overdue: AlertCircle,
  Partial: AlertCircle,
};

function mapStatus(apiStatus: InvoiceStatus, dueDate: string | null): DisplayStatus {
  switch (apiStatus) {
    case "paid": return "Paid";
    case "partially_paid": return "Partial";
    case "pending":
      if (dueDate && new Date(dueDate) < new Date()) return "Overdue";
      return "Pending";
    default: return "Pending";
  }
}

function GradientCard({ children, gradient, className }: { children: React.ReactNode; gradient: string; className?: string }) {
  return (
    <div className={cn("relative group", className)}>
      <div className={cn("absolute inset-0 rounded-2xl opacity-20 blur-xl transition-opacity duration-500 group-hover:opacity-30", gradient)} />
      <div className="relative rounded-2xl border border-border bg-card backdrop-blur-xl p-5 overflow-hidden">
        <div className={cn("absolute top-0 right-0 w-48 h-48 -translate-y-1/2 translate-x-1/2 rounded-full opacity-10", gradient)} />
        {children}
      </div>
    </div>
  );
}

export default function BillingPage() {
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editInvoice, setEditInvoice] = useState<Invoice | null>(null);
  const [pendingPayments, setPendingPayments] = useState<any[]>([]);
  const [pendingLoading, setPendingLoading] = useState(true);
  const [recordCtx, setRecordCtx] = useState<{ invoice?: Invoice; payment?: any } | null>(null);
  const [cancelCtx, setCancelCtx] = useState<any>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const now = new Date();
  const [month, setMonth] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  );
  const [summary, setSummary] = useState<{
    collectedRevenue: number;
    outstanding: number;
    invoicedTotal: number;
    invoiceCount: number;
  } | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);

  const invoicesData = usePaymentStore((s) => s.invoices);
  const loading = usePaymentStore((s) => s.loading);
  const fetchInvoices = usePaymentStore((s) => s.fetchInvoices);

  const loadPending = async () => {
    setPendingLoading(true);
    try {
      const res = await fetch("/api/payments?status=pending&page_size=100");
      const json = await res.json();
      if (json.success) setPendingPayments(json.data || []);
    } catch {
      setPendingPayments([]);
    } finally {
      setPendingLoading(false);
    }
  };

  const loadSummary = async (m: string) => {
    setSummaryLoading(true);
    try {
      const res = await fetch(`/api/billing/summary?month=${m}`);
      const json = await res.json();
      if (json.success) setSummary(json.data);
    } catch {
      setSummary(null);
    } finally {
      setSummaryLoading(false);
    }
  };

  useEffect(() => { fetchInvoices({ pageSize: 100 }); loadPending(); }, [fetchInvoices]);
  useEffect(() => { loadSummary(month); }, [month]);

  const refreshAll = () => { fetchInvoices({ pageSize: 100 }); loadPending(); loadSummary(month); };

  const handleCancel = async () => {
    if (!cancelCtx) return;
    setCancelling(true);
    setCancelError("");
    try {
      const res = await fetch("/api/payments/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pending_payment_id: cancelCtx.id }),
      });
      const json = await res.json();
      if (json.success) {
        setCancelCtx(null);
        loadPending();
        emitDashboardRefresh("payments");
      } else {
        setCancelError(json.error || "Failed to cancel declaration");
      }
    } catch {
      setCancelError("Network error");
    } finally {
      setCancelling(false);
    }
  };

  const overdueInvoices = useMemo(() => {
    if (!invoicesData) return [];
    const now = Date.now();
    return invoicesData.filter(
      (i) => i.status === "pending" && !!i.due_date && new Date(i.due_date).getTime() < now
    );
  }, [invoicesData]);

  const invoices = useMemo(() => {
    if (!invoicesData) return [];
    return invoicesData
      .filter((inv) => inv.status !== "draft" && inv.status !== "cancelled" && inv.status !== "refunded")
      .map((inv) => {
        const patientName = inv.patient?.user
          ? `${inv.patient.user.first_name} ${inv.patient.user.last_name}`
          : inv.patient_id;
        return {
          id: inv.id,
          invoiceNumber: inv.invoice_number,
          patient: patientName,
          patientId: inv.patient_id,
          service: inv.items?.[0]?.description || inv.notes || "Medical Service",
          amount: inv.total,
          paidAmount: inv.paid_amount,
          date: inv.created_at ? formatDate(inv.created_at) : "—",
          dueDate: inv.due_date ? formatDate(inv.due_date) : "—",
          status: mapStatus(inv.status, inv.due_date),
          raw: inv,
        };
      });
  }, [invoicesData]);

  const monthLabel = useMemo(() => {
    const [y, m] = month.split("-").map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString("en-GB", { month: "short", year: "numeric" });
  }, [month]);

  const summaryCards = [
    { label: "Collected Revenue", value: summaryLoading || !summary ? "—" : formatCurrency(summary.collectedRevenue), icon: TrendingUp, gradient: "bg-gradient-to-br from-emerald-500 via-emerald-400 to-teal-300" },
    { label: "Outstanding", value: summaryLoading || !summary ? "—" : formatCurrency(summary.outstanding), icon: Wallet, gradient: "bg-gradient-to-br from-amber-500 via-orange-400 to-rose-300" },
    { label: "This Month", value: summaryLoading || !summary ? "—" : formatCurrency(summary.invoicedTotal), icon: DollarSign, gradient: "bg-gradient-to-br from-blue-500 via-indigo-400 to-violet-300" },
    { label: "Total Invoices", value: summaryLoading || !summary ? "—" : String(summary.invoiceCount), icon: Receipt, gradient: "bg-gradient-to-br from-purple-500 via-pink-400 to-rose-300" },
  ];

  const filtered = invoices.filter(
    (inv) =>
      (statusFilter === "all" || inv.status === statusFilter) &&
      (inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
       inv.patient.toLowerCase().includes(search.toLowerCase()) ||
       inv.service.toLowerCase().includes(search.toLowerCase()))
  );

  const totalOutstanding = overdueInvoices.reduce((s, i) => s + (i.total - i.paid_amount), 0);

  return (
    <div className="space-y-5">
      {overdueInvoices.length > 0 && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-red-500/10 border border-red-500/20 rounded-xl text-sm">
          <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
          <span className="text-red-700 dark:text-red-400 font-medium">
            {overdueInvoices.length} overdue invoice{overdueInvoices.length > 1 ? "s" : ""} — {formatCurrency(totalOutstanding)}
          </span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Billing</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage invoices and payments</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/60 pointer-events-none" />
            <input
              type="month"
              value={month}
              onChange={(e) => e.target.value && setMonth(e.target.value)}
              className="h-10 rounded-xl border border-border bg-muted pl-9 pr-3 text-sm text-foreground focus:outline-none focus:border-[#e0a84a]/40"
              aria-label="Reporting period"
            />
          </div>
          <Button onClick={() => setShowCreate(true)}
            className="bg-[#e0a84a] hover:bg-[#e0a84a]/90 text-[#0a0f1a] font-semibold shadow-lg shadow-[#e0a84a]/20">
            <Plus className="size-4" />Create Invoice
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <GradientCard key={card.label} gradient={card.gradient}>
              <div className="flex items-start justify-between relative z-10">
                <div>
                  <p className="text-sm text-muted-foreground">{card.label}</p>
                   <p className="text-xl font-bold text-foreground mt-1">{card.value}</p>
                  <p className="text-[10px] text-muted-foreground/40 mt-0.5">{monthLabel}</p>
                </div>
                <div className="flex size-11 items-center justify-center rounded-xl border border-border bg-muted backdrop-blur-sm">
                  <Icon className="size-5 text-foreground/80" />
            </div>
            <span className="text-xs text-muted-foreground/60 hidden sm:inline">{filtered.length} invoice{filtered.length !== 1 ? "s" : ""}</span>
          </div>
            </GradientCard>
          );
        })}
      </div>

      {pendingPayments.length > 0 && (
        <div className="rounded-2xl border border-[#e0a84a]/20 bg-[#e0a84a]/[0.04]">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Landmark className="size-4 text-[#e0a84a]" />
               <h3 className="text-sm font-semibold text-foreground">Pending Bank Transfers</h3>
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[#e0a84a]/15 text-[#e0a84a]">
                {pendingPayments.length}
              </span>
            </div>
            <span className="text-xs text-muted-foreground/60">Patients waiting for you to verify</span>
          </div>
          <div className="divide-y divide-border">
            {pendingLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="size-5 animate-spin text-[#e0a84a]" />
              </div>
            ) : (
              pendingPayments.map((pmt) => {
                const patientName = pmt.patient?.user
                  ? `${pmt.patient.user.first_name} ${pmt.patient.user.last_name}`
                  : "Patient";
                return (
                  <div key={pmt.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="size-9 rounded-xl bg-[#e0a84a]/10 border border-[#e0a84a]/20 flex items-center justify-center shrink-0">
                      <Clock className="size-4 text-[#e0a84a]" />
                    </div>
                    <div className="flex-1 min-w-0">
                       <p className="text-sm font-semibold text-foreground truncate">
                         ₦{pmt.amount.toLocaleString()} · {patientName}
                      </p>
                      <p className="text-xs text-muted-foreground/60 truncate">
                        {pmt.invoice?.invoice_number || "Multiple invoices"} · Ref{" "}
                        <span className="font-mono">{pmt.transaction_ref}</span> ·{" "}
                        {new Date(pmt.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        onClick={() => setRecordCtx({ payment: pmt })}
                        className="h-8 text-xs px-3 bg-gradient-to-r from-[#e0a84a] to-amber-500 text-[#0a0f1a] font-semibold rounded-xl hover:shadow-lg hover:shadow-[#e0a84a]/20 transition-all border-0"
                      >
                        Verify & Record
                      </Button>
                      <Button
                        onClick={() => { setCancelError(""); setCancelCtx(pmt); }}
                        variant="outline"
                        className="h-8 text-xs px-3 bg-destructive text-destructive-foreground font-semibold rounded-xl border border-border hover:bg-destructive/90"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-border bg-card backdrop-blur-xl">
        <div className="p-4 border-b border-border">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/60" />
              <Input placeholder="Search invoices..."
                className="h-9 pl-9 text-sm bg-muted border-border text-foreground/80 placeholder:text-muted-foreground/40 focus-visible:border-[#e0a84a]/40 focus-visible:ring-[#e0a84a]/20"
                value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="flex items-center gap-2">
              {(["all", "Paid", "Pending", "Partial", "Overdue"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={cn(
                    "h-8 px-3 rounded-lg text-xs font-medium transition-all border",
                    statusFilter === s
                      ? "bg-[#e0a84a]/15 border-[#e0a84a]/30 text-[#e0a84a]"
                      : "bg-transparent border-border text-muted-foreground hover:text-foreground hover:border-foreground/20"
                  )}
                >
                  {s === "all" ? "All" : s}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="size-6 animate-spin text-[#e0a84a]" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground/60">
                  <th className="px-5 py-3.5 font-medium">Invoice #</th>
                  <th className="px-5 py-3.5 font-medium">Patient</th>
                  <th className="px-5 py-3.5 font-medium">Service</th>
                  <th className="px-5 py-3.5 font-medium">Amount</th>
                  <th className="px-5 py-3.5 font-medium">Outstanding</th>
                  <th className="px-5 py-3.5 font-medium">Date</th>
                  <th className="px-5 py-3.5 font-medium">Status</th>
                  <th className="px-5 py-3.5 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={8} className="px-5 py-12 text-center text-sm text-muted-foreground/60">No invoices found.</td></tr>
                ) : (
                  filtered.map((inv) => {
                    const outstanding = inv.raw.total - inv.raw.paid_amount;
                    const StatusIcon = statusIcon[inv.status];
                    return (
                      <tr key={inv.id} className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
                        <td className="px-5 py-3.5 font-mono text-xs font-medium text-foreground">{inv.invoiceNumber}</td>
                        <td className="px-5 py-3.5 font-medium text-foreground/80">{inv.patient}</td>
                        <td className="px-5 py-3.5 text-muted-foreground">{inv.service}</td>
                        <td className="px-5 py-3.5 font-medium text-foreground">{formatCurrency(inv.amount)}</td>
                        <td className="px-5 py-3.5">
                          {inv.status === "Paid" ? (
                            <span className="text-emerald-400 text-xs font-medium">Cleared</span>
                          ) : (
                            <span className={cn("text-xs font-semibold", outstanding > 0 ? "text-amber-400" : "text-muted-foreground")}>
                              {outstanding > 0 ? formatCurrency(outstanding) : "—"}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-muted-foreground">{inv.date}</td>
                        <td className="px-5 py-3.5">
                          <Badge variant={statusStyles[inv.status]} className="text-[11px] flex items-center gap-1 w-fit">
                            <StatusIcon className="size-3" />
                            {inv.status}
                          </Badge>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {outstanding > 0 && (
                              <button
                                onClick={() => setRecordCtx({ invoice: inv.raw })}
                                className="inline-flex items-center gap-1 h-8 px-3 rounded-lg text-xs text-emerald-400 font-medium hover:bg-emerald-500/10 transition-colors"
                                title="Record payment received (POS, cash, transfer…)"
                              >
                                <DollarSign className="size-3.5" />Record
                              </button>
                            )}
                            {inv.raw.status === "pending" && (
                              <button
                                onClick={() => setEditInvoice(inv.raw)}
                                className="inline-flex items-center gap-1 h-8 px-3 rounded-lg text-xs text-blue-400 font-medium hover:bg-blue-500/10 transition-colors"
                                title="Edit invoice items, dates, or notes"
                              >
                                <FileText className="size-3.5" />Edit
                              </button>
                            )}
                            <Link
                              href={`/admin/billing/${inv.id}`}
                              className="inline-flex items-center gap-1 h-8 px-3 rounded-lg text-xs text-[#e0a84a] font-medium hover:bg-[#e0a84a]/10 transition-colors"
                            >
                              <Eye className="size-3.5" />View
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <CreateInvoiceModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onSuccess={() => fetchInvoices()}
      />

      {editInvoice && (
        <EditInvoiceModal
          invoice={editInvoice}
          open={!!editInvoice}
          onClose={() => setEditInvoice(null)}
          onSuccess={() => { fetchInvoices(); setEditInvoice(null); }}
        />
      )}

      {recordCtx && (
        <RecordPaymentModal
          ctx={recordCtx}
          invoices={invoicesData || []}
          onClose={() => setRecordCtx(null)}
          onDone={refreshAll}
        />
      )}

      {cancelCtx && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => !cancelling && setCancelCtx(null)}>
          <div
            className="w-full max-w-sm max-h-[92vh] overflow-y-auto bg-card border border-border rounded-t-3xl sm:rounded-3xl shadow-2xl p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
               <h3 className="text-base font-bold text-foreground">Cancel declaration?</h3>
              <button onClick={() => setCancelCtx(null)} disabled={cancelling} className="p-2 rounded-xl hover:bg-muted text-muted-foreground">
                <X className="size-4" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              This will cancel{" "}
               <span className="text-foreground font-semibold">
                 ₦{cancelCtx.amount.toLocaleString()}
               </span>{" "}
               declared for{" "}
               <span className="text-foreground font-semibold">
                 {cancelCtx.invoice?.invoice_number || "multiple invoices"}
               </span>{" "}
              (Ref <span className="font-mono text-[#e0a84a]">{cancelCtx.transaction_ref}</span>).
              The patient will be notified that the payment could not be confirmed.
            </p>
            {cancelError && (
              <div className="mt-3 rounded-xl bg-rose-500/10 border border-rose-500/20 p-3 text-sm text-rose-400">{cancelError}</div>
            )}
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                onClick={() => setCancelCtx(null)}
                disabled={cancelling}
                className="h-10 rounded-xl border border-border bg-muted text-sm text-foreground/70 font-medium hover:bg-muted disabled:opacity-50"
              >
                Keep it
              </button>
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="h-10 rounded-xl bg-destructive text-destructive-foreground text-sm font-semibold border border-border hover:bg-destructive/90 disabled:opacity-50 inline-flex items-center justify-center gap-2"
              >
                {cancelling ? <Loader2 className="size-4 animate-spin" /> : <X className="size-4" />}
                {cancelling ? "Cancelling..." : "Cancel declaration"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const METHOD_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "pos", label: "POS" },
  { value: "cash", label: "Cash" },
  { value: "card", label: "Card (Online)" },
  { value: "transfer", label: "Transfer" },
  { value: "insurance", label: "Insurance" },
  { value: "mobile_money", label: "Mobile Money" },
];

function patientNameOf(inv: Invoice): string {
  return inv.patient?.user
    ? `${inv.patient.user.first_name} ${inv.patient.user.last_name}`
    : "Patient";
}

function RecordPaymentModal({ ctx, invoices, onClose, onDone }: {
  ctx: { invoice?: Invoice; payment?: any };
  invoices: Invoice[];
  onClose: () => void;
  onDone: () => void;
}) {
  const patientId = ctx.invoice?.patient_id || ctx.payment?.patient_id || "";
  const defaultAmount =
    (ctx.payment && ctx.payment.amount) ||
    (ctx.invoice ? ctx.invoice.total - ctx.invoice.paid_amount : 0) ||
    "";

  const [amount, setAmount] = useState(defaultAmount || "");
  const [method, setMethod] = useState(ctx.payment?.method || "bank_transfer");
  const [ref, setRef] = useState(ctx.payment?.transaction_ref || "");
  const [notes, setNotes] = useState("");
  const [alloc, setAlloc] = useState<Record<string, number>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [bankAccountId, setBankAccountId] = useState(ctx.payment?.bank_account_id || "");
  const [bankAccounts, setBankAccounts] = useState<Array<{ id: string; bank_name: string; account_name: string; account_number: string }>>([]);

  useEffect(() => {
    fetch("/api/settings/bank-accounts")
      .then((r) => r.json())
      .then((json) => { if (json.success) setBankAccounts(json.data?.accounts || []); })
      .catch(() => {});
  }, []);

  const patientInvoices = useMemo(() => {
    const now = new Date().toISOString().slice(0, 10);
    return (invoices || [])
      .filter((i) => {
        if (i.status === "cancelled" || i.status === "refunded") return false;
        if (i.patient_id === patientId) return true;
        if (i.patient?.primary_account_id === patientId) return true;
        return false;
      })
      .filter((i) => {
        if (ctx.invoice) return i.id === ctx.invoice.id;
        return (i.total - i.paid_amount) > 0 && (i.status === "pending" || i.status === "partially_paid" || new Date(i.issue_date).toISOString().slice(0, 10) <= now);
      });
  }, [invoices, patientId, ctx.invoice]);

  const allocSum = useMemo(
    () => Object.entries(alloc).reduce((s, [id, v]) => (selected.has(id) ? s + v : s), 0),
    [alloc, selected]
  );
  const remaining = Number(amount) - allocSum;

  function redistribute(amt: number, sel: Set<string>, current: Record<string, number>) {
    let rem = amt;
    const next: Record<string, number> = {};
    for (const inv of patientInvoices) {
      if (!sel.has(inv.id)) continue;
      const outstanding = inv.total - inv.paid_amount;
      const val = Math.max(0, Math.min(current[inv.id] ?? outstanding, outstanding, rem));
      next[inv.id] = val;
      rem -= val;
    }
    setAlloc(next);
  }

  function toggleInvoice(id: string) {
    setError("");
    const sel = new Set(selected);
    if (sel.has(id)) sel.delete(id);
    else sel.add(id);
    setSelected(sel);
    redistribute(Number(amount), sel, alloc);
  }

  function setInvoiceAmount(id: string, v: number) {
    const inv = patientInvoices.find((i) => i.id === id);
    if (!inv) return;
    const outstanding = inv.total - inv.paid_amount;
    setAlloc((a) => ({ ...a, [id]: Math.max(0, Math.min(v, outstanding)) }));
  }

  async function handleSubmit() {
    setError("");
    if (!patientId) { setError("Patient not resolved for this payment"); return; }
    const amt = Number(amount);
    if (!amt || amt <= 0) { setError("Enter a valid amount"); return; }
    if (!selected.size) { setError("Select at least one invoice to allocate the payment to"); return; }
    if (Math.abs(allocSum - amt) > 0.01) {
      setError(`Allocated (₦${allocSum.toLocaleString()}) must equal the payment amount (₦${amt.toLocaleString()})`);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/payments/record", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_id: patientId,
          amount: amt,
          payment_method: method,
          allocation: Object.entries(alloc)
            .filter(([id]) => selected.has(id))
            .map(([invoice_id, a]) => ({ invoice_id, amount: a })),
          pending_payment_id: ctx.payment?.id,
          transaction_ref: ref.trim() || undefined,
          notes: notes.trim() || undefined,
          bank_account_id: bankAccountId || undefined,
        }),
      });
      const json = await res.json();
      if (json.success) {
        onDone();
        onClose();
        emitDashboardRefresh("payments");
      } else {
        setError(json.error || "Failed to record payment");
      }
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-md max-h-[92vh] overflow-y-auto bg-card border border-border rounded-t-3xl sm:rounded-3xl shadow-2xl p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-foreground">Record Payment</h3>
            <p className="text-xs text-muted-foreground/60">Confirm money received from the patient</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-muted text-muted-foreground">
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Amount (₦)</label>
              <input
                type="number"
                min="0"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  redistribute(Number(e.target.value), selected, alloc);
                }}
                className="h-10 w-full rounded-xl border border-border bg-muted px-3 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-[#e0a84a]/40"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Method</label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="h-10 w-full rounded-xl border border-border bg-muted px-3 text-sm text-foreground focus:outline-none focus:border-[#e0a84a]/40 [&>option]:text-black"
              >
                {METHOD_OPTIONS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Reference (optional)</label>
              <input
                value={ref}
                onChange={(e) => setRef(e.target.value)}
                className="h-10 w-full rounded-xl border border-border bg-muted px-3 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-[#e0a84a]/40 font-mono"
                placeholder="TRF-..."
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Notes (optional)</label>
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="h-10 w-full rounded-xl border border-border bg-muted px-3 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-[#e0a84a]/40"
                placeholder="e.g. transfer from GTB"
              />
            </div>
          </div>

          {bankAccounts.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Receive Into (Bank Account)</label>
              <select
                value={bankAccountId}
                onChange={(e) => setBankAccountId(e.target.value)}
                className="h-10 w-full rounded-xl border border-border bg-muted px-3 text-sm text-foreground focus:outline-none focus:border-[#e0a84a]/40 [&>option]:text-black"
              >
                <option value="">Select bank account...</option>
                {bankAccounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.bank_name} — {a.account_name} ({a.account_number})</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Allocate to invoices{" "}
                <span className="text-muted-foreground/40">({ctx.invoice ? "this invoice" : "pick one or more"})</span>
              </label>
              <span className={`text-xs font-semibold ${remaining < -0.01 ? "text-rose-400" : "text-muted-foreground/60"}`}>
                ₦{Math.max(0, allocSum).toLocaleString()} allocated
              </span>
            </div>
            {patientInvoices.length === 0 ? (
              <div className="rounded-xl bg-card border border-border p-4 text-center text-sm text-muted-foreground/60">
                No outstanding invoices for this patient.
              </div>
            ) : (
              <div className="space-y-2">
                {patientInvoices.map((inv) => {
      const outstanding = inv.total - inv.paid_amount;
                  const isSel = selected.has(inv.id);
                  return (
                    <div
                      key={inv.id}
                      className={`flex items-center gap-2 rounded-xl border p-2.5 transition-colors ${
                        isSel ? "border-[#e0a84a]/40 bg-[#e0a84a]/[0.06]" : "border-border bg-muted/50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSel}
                        onChange={() => toggleInvoice(inv.id)}
                        className="size-4 accent-[#e0a84a]"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate">{inv.invoice_number}</p>
                        <p className="text-[10px] text-muted-foreground/60 truncate">
                          {inv.items?.[0]?.description || "Service"} · outstanding ₦{outstanding.toLocaleString()}
                        </p>
                      </div>
                      {isSel && (
                        <input
                          type="number"
                          min="0"
                          max={outstanding}
                          value={alloc[inv.id] ?? ""}
                          onChange={(e) => setInvoiceAmount(inv.id, Number(e.target.value))}
                          className="h-8 w-28 rounded-lg border border-border bg-muted px-2 text-xs text-foreground focus:outline-none focus:border-[#e0a84a]/40"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {error && (
            <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-3 text-sm text-rose-400">{error}</div>
          )}

          <button
            onClick={handleSubmit}
            disabled={saving || patientInvoices.length === 0}
            className="w-full h-11 bg-gradient-to-r from-[#e0a84a] to-amber-500 text-[#0a0f1a] text-sm font-semibold rounded-xl shadow-lg shadow-[#e0a84a]/20 disabled:opacity-50 inline-flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle className="size-4" />}
            {saving ? "Recording..." : "Confirm Payment"}
          </button>
        </div>
      </div>
    </div>
  );
}
