"use client";

import { useEffect, useState } from "react";
import { CreditCard, ArrowUpRight, ArrowDownRight, ChevronRight, Receipt, Download, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePaymentStore } from "@/stores/payment-store";
import { useAuth } from "@/contexts/auth-context";
import PayNowButton from "@/components/payments/pay-now-button";
import type { Invoice } from "@/lib/api-types";

const statusColors: Record<string, string> = {
  completed: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  paid: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  pending: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  failed: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  partially_paid: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  refunded: "bg-muted text-muted-foreground border-border",
};

const statusLabels: Record<string, string> = {
  completed: "Paid",
  paid: "Paid",
  pending: "Pending",
  failed: "Overdue",
  partially_paid: "Partial",
  refunded: "Refunded",
};

function GlassCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn(
      "relative rounded-2xl border border-border bg-card backdrop-blur-xl overflow-hidden",
      className
    )}>
      <div className="absolute top-0 right-0 w-32 h-32 translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-[#e0a84a]/[0.04] to-transparent" />
      {children}
    </div>
  );
}

function ReceiptPopup({ invoice, onClose }: { invoice: Invoice; onClose: () => void }) {
  const outstanding = invoice.total - invoice.paid_amount;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 pb-20" onClick={onClose}>
      <div
        className="bg-card backdrop-blur-xl border border-border rounded-2xl w-full max-w-sm p-6 shadow-2xl max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center mb-5">
          <div className="w-12 h-12 rounded-xl bg-[#e0a84a]/10 border border-[#e0a84a]/20 flex items-center justify-center mx-auto mb-3">
            <Receipt className="w-6 h-6 text-[#e0a84a]" />
          </div>
          <h3 className="text-lg font-bold text-foreground">Payment Receipt</h3>
          <p className="text-xs text-muted-foreground">{invoice.invoice_number}</p>
        </div>

        <div className="space-y-3 text-sm border-t border-b border-border py-4 mb-4">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Issue Date</span>
            <span className="font-medium text-foreground/80">{new Date(invoice.issue_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="text-foreground/80">₦{invoice.subtotal.toLocaleString()}</span>
          </div>
          {invoice.discount > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Discount</span>
              <span className="text-rose-400">-₦{invoice.discount.toLocaleString()}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-base">
            <span className="text-foreground">Total</span>
            <span className="text-foreground">₦{invoice.total.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-emerald-400 font-semibold">
            <span>Paid</span>
            <span>₦{invoice.paid_amount.toLocaleString()}</span>
          </div>
          {outstanding > 0 && (
            <div className="flex justify-between text-amber-400 font-semibold">
              <span>Outstanding</span>
              <span>₦{outstanding.toLocaleString()}</span>
            </div>
          )}
        </div>

        {invoice.items && invoice.items.length > 0 && (
          <div className="mb-4">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Line Items</h4>
            {invoice.items.map((item) => (
              <div key={item.id} className="flex justify-between text-sm py-1.5 border-b border-border last:border-0">
                <div>
                  <p className="font-medium text-foreground/80">{item.description}</p>
                  <p className="text-xs text-muted-foreground">{item.quantity} x ₦{item.unit_price.toLocaleString()}</p>
                </div>
                <span className="font-medium text-foreground/80">₦{item.line_total.toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={() => window.print()}
          className="w-full h-10 rounded-xl border border-border text-sm font-semibold text-foreground/70 flex items-center justify-center gap-2 hover:bg-muted transition-all"
        >
          <Download className="w-4 h-4" />
          Print / Save PDF
        </button>
        <button
          onClick={onClose}
          className="w-full h-10 rounded-xl bg-gradient-to-r from-[#e0a84a] to-amber-500 text-[#0a0f1a] text-sm font-semibold mt-2 hover:shadow-lg hover:shadow-[#e0a84a]/20 transition-all"
        >
          Close
        </button>
      </div>
    </div>
  );
}

export default function PaymentsPage() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [receiptInvoice, setReceiptInvoice] = useState<Invoice | null>(null);

  const { user } = useAuth();
  const isDependant = user?.role === "patient" && Boolean(user.patient?.is_dependant);

  const invoices = usePaymentStore((s) => s.invoices);
  const payments = usePaymentStore((s) => s.payments);
  const totals = usePaymentStore((s) => s.totals);
  const loading = usePaymentStore((s) => s.loading);
  const fetchInvoices = usePaymentStore((s) => s.fetchInvoices);
  const fetchPayments = usePaymentStore((s) => s.fetchPayments);

  useEffect(() => {
    fetchInvoices();
    fetchPayments();
  }, [fetchInvoices, fetchPayments]);

  const sortedPayments = payments
    .slice()
    .sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime());

  const lastPayment = sortedPayments[0];

  const summaryCards = [
    { label: "Total Paid", value: loading ? "..." : `₦${totals.totalRevenue.toLocaleString()}`, icon: ArrowUpRight, gradient: "from-emerald-500/20 via-emerald-400/10 to-transparent", iconBg: "bg-emerald-500/10 text-emerald-400" },
    { label: "Outstanding", value: loading ? "..." : `₦${totals.outstandingAmount.toLocaleString()}`, icon: ArrowDownRight, gradient: "from-amber-500/20 via-amber-400/10 to-transparent", iconBg: "bg-amber-500/10 text-amber-400" },
    { label: "Last Payment", value: loading ? "..." : lastPayment ? `₦${lastPayment.amount.toLocaleString()}` : "None", icon: CreditCard, gradient: "from-blue-500/20 via-blue-400/10 to-transparent", iconBg: "bg-blue-500/10 text-blue-400" },
  ];

  const unpaidInvoices = invoices
    .filter((inv) => (inv.status === "pending" || inv.status === "partially_paid") && inv.total - inv.paid_amount > 0);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-foreground">Payments & Billing</h2>

      <div className="grid grid-cols-3 gap-2.5">
        {summaryCards.map((card) => (
          <div key={card.label} className="relative rounded-2xl border border-border bg-card backdrop-blur-xl p-3 overflow-hidden text-center group hover:border-border transition-all">
            <div className="absolute top-0 right-0 w-24 h-24 translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-[#e0a84a]/[0.04] to-transparent" />
            <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center mx-auto mb-2 relative z-10", card.iconBg)}>
              <card.icon className={cn("w-4 h-4", card.iconBg.split(" ")[1])} />
            </div>
            <p className="text-xs text-muted-foreground relative z-10">{card.label}</p>
            <p className="text-sm font-bold text-foreground mt-0.5 relative z-10">{card.value}</p>
          </div>
        ))}
      </div>

      {unpaidInvoices.length > 0 && (
        <GlassCard>
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Outstanding Bills</h3>
            <CreditCard className="w-4 h-4 text-amber-400" />
          </div>
          <div className="divide-y divide-border">
            {unpaidInvoices.map((inv) => {
              const outstanding = inv.total - inv.paid_amount;
              const isDependantInvoice = inv.patient_id !== user?.patient?.id;
              const depName = isDependantInvoice && inv.patient?.user
                ? `${inv.patient.user.first_name} ${inv.patient.user.last_name}`
                : null;
              return (
                <div key={inv.id} className="px-4 py-3 flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground">{inv.invoice_number}</p>
                      <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full border", statusColors[inv.status] || "bg-muted text-muted-foreground border-border")}>
                        {statusLabels[inv.status] || inv.status}
                      </span>
                    </div>
                    {depName && (
                      <p className="text-[10px] text-cyan-400 mt-0.5 font-medium">Dependant: {depName}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {inv.items?.[0]?.description || "Medical Service"}
                      {inv.items && inv.items.length > 1 && ` +${inv.items.length - 1} more`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Total: ₦{inv.total.toLocaleString()} &middot; Paid: ₦{inv.paid_amount.toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <span className="text-sm font-bold text-amber-400">₦{outstanding.toLocaleString()}</span>
                    {isDependant ? (
                      <span className="text-[10px] text-muted-foreground border border-border rounded-xl px-2.5 py-1.5">Paid by main account holder</span>
                    ) : (
                      <PayNowButton
                        invoiceId={inv.id}
                        patientId={inv.patient_id}
                        amount={outstanding}
                        className="h-8 text-xs px-3 bg-gradient-to-r from-[#e0a84a] to-amber-500 text-[#0a0f1a] font-semibold rounded-xl hover:shadow-lg hover:shadow-[#e0a84a]/20 transition-all border-0"
                        onSuccess={() => { fetchInvoices(); fetchPayments(); }}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </GlassCard>
      )}

      <GlassCard>
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Payment History</h3>
          <Receipt className="w-4 h-4 text-muted-foreground" />
        </div>
        <div className="hidden sm:grid grid-cols-4 gap-0 px-4 py-2.5 bg-muted text-xs font-medium text-muted-foreground border-b border-border">
          <span>Date</span>
          <span>Service</span>
          <span className="text-right">Amount</span>
          <span className="text-right">Status</span>
        </div>
        <div className="divide-y divide-border">
          {sortedPayments.length > 0 ? sortedPayments.map((pmt) => {
            const pmtAny = pmt as any;
            const isDependantPayment = pmt.patient_id !== user?.patient?.id;
            const depLabel = isDependantPayment && pmtAny.patient?.user
              ? `${pmtAny.patient.user.first_name} ${pmtAny.patient.user.last_name}`
              : null;
            return (
            <div key={pmt.id}>
              <button
                onClick={() => setExpandedId(expandedId === pmt.id ? null : pmt.id)}
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground/80">
                    {pmt.invoice?.items?.[0]?.description || pmt.invoice?.invoice_number || `Payment #${pmt.transaction_ref || pmt.id.slice(0, 8)}`}
                  </p>
                  {depLabel && (
                    <p className="text-[10px] text-cyan-400 font-medium">Dependant: {depLabel}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {new Date(pmt.payment_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm font-semibold text-foreground">₦{pmt.amount.toLocaleString()}</span>
                  <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full border", statusColors[pmt.status] || "bg-muted text-muted-foreground border-border")}>
                    {statusLabels[pmt.status] || pmt.status}
                  </span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/60" />
                </div>
              </button>
              {expandedId === pmt.id && (
                <div className="px-4 pb-3 pt-0 flex gap-2">
                  <button
                    onClick={() => pmt.invoice && setReceiptInvoice(pmt.invoice)}
                    className="inline-flex items-center gap-1.5 text-xs text-[#e0a84a] font-medium hover:underline"
                  >
                    <Download className="w-3.5 h-3.5" />Receipt
                  </button>
                  {pmt.invoice && (pmt.invoice.total - pmt.invoice.paid_amount > 0) && !isDependant && (
                    <PayNowButton
                      invoiceId={pmt.invoice.id}
                      patientId={pmt.invoice.patient_id}
                      amount={pmt.invoice.total - pmt.invoice.paid_amount}
                      className="h-7 text-xs px-3 bg-gradient-to-r from-[#e0a84a] to-amber-500 text-[#0a0f1a] font-semibold rounded-xl border-0"
                      onSuccess={() => { fetchInvoices(); fetchPayments(); }}
                    />
                  )}
                </div>
              )}
            </div>
          )}) : (
            <div className="px-4 py-6 text-center">
              <p className="text-sm text-muted-foreground">{loading ? "Loading..." : "No payment history yet."}</p>
            </div>
          )}
        </div>
      </GlassCard>

      {receiptInvoice && (
        <ReceiptPopup invoice={receiptInvoice} onClose={() => setReceiptInvoice(null)} />
      )}

      <div className="h-16" />
    </div>
  );
}
