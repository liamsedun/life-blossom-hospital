"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Landmark, Loader2, ArrowUpRight, ArrowDownRight, Wallet, ArrowRightLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn, formatCurrency } from "@/lib/utils";
import { useRoleGuard } from "@/hooks/use-role-guard";

interface BankAccount {
  id: string; bank_name: string; account_name: string; account_number: string; is_active: boolean;
  balance: number; total_in: number; total_out: number;
}

function GradientCard({ children, gradient, className }: { children: React.ReactNode; gradient: string; className?: string }) {
  return (
    <div className={cn("relative group", className)}>
      <div className={cn("absolute inset-0 rounded-2xl opacity-20 blur-xl transition-opacity duration-500 group-hover:opacity-30", gradient)} />
      <div className="relative rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-xl p-5 overflow-hidden">
        <div className={cn("absolute top-0 right-0 w-48 h-48 -translate-y-1/2 translate-x-1/2 rounded-full opacity-10", gradient)} />
        {children}
      </div>
    </div>
  );
}

export default function BanksPage() {
  const router = useRouter();
  const { authorized } = useRoleGuard(["admin", "accountant", "cashier"]);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTransfer, setShowTransfer] = useState(false);
  const [saving, setSaving] = useState(false);
  const [transferForm, setTransferForm] = useState({ from: "", to: "", amount: "", description: "", transfer_date: new Date().toISOString().split("T")[0] });

  const load = () => {
    setLoading(true);
    fetch("/api/bank-accounts")
      .then((r) => r.json())
      .then((json) => { if (json.success) setAccounts(json.data || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const totals = useMemo(() => {
    const balance = accounts.reduce((s, a) => s + a.balance, 0);
    const inflow = accounts.reduce((s, a) => s + a.total_in, 0);
    const outflow = accounts.reduce((s, a) => s + a.total_out, 0);
    return { balance, inflow, outflow };
  }, [accounts]);

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/bank-transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from_account_id: transferForm.from,
          to_account_id: transferForm.to,
          amount: parseFloat(transferForm.amount),
          description: transferForm.description || null,
          transfer_date: transferForm.transfer_date,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Transfer failed");
      setShowTransfer(false);
      setTransferForm({ from: "", to: "", amount: "", description: "", transfer_date: new Date().toISOString().split("T")[0] });
      load();
    } catch (err: any) { alert(err.message); }
    finally { setSaving(false); }
  };

  const inputClass = "h-9 text-sm bg-white/[0.04] border-white/[0.08] text-white/80 placeholder:text-white/30 focus-visible:border-[#e0a84a]/40 focus-visible:ring-[#e0a84a]/20";

  if (!authorized) return null;
  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Bank Accounts</h1>
          <p className="text-sm text-white/50 mt-1">All hospital bank and cash accounts</p>
        </div>
        <Button onClick={() => setShowTransfer(true)}
          className="bg-gradient-to-r from-[#e0a84a] to-amber-500 text-[#0a0f1a] font-semibold border-0 shadow-lg shadow-[#e0a84a]/20 h-9">
          <ArrowRightLeft className="size-4" />Transfer
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <GradientCard gradient="bg-gradient-to-br from-emerald-500 via-emerald-400 to-teal-300">
          <div className="flex items-start justify-between relative z-10">
            <div className="min-w-0 flex-1 mr-2">
              <p className="text-xs text-white/50">Total Balance</p>
              <p className="text-lg font-bold text-white mt-0.5 tabular-nums truncate">{formatCurrency(totals.balance)}</p>
            </div>
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.06] backdrop-blur-sm">
              <Wallet className="size-4 text-white/80" />
            </div>
          </div>
        </GradientCard>
        <GradientCard gradient="bg-gradient-to-br from-blue-500 via-indigo-400 to-violet-300">
          <div className="flex items-start justify-between relative z-10">
            <div className="min-w-0 flex-1 mr-2">
              <p className="text-xs text-white/50">Total Inflows</p>
              <p className="text-lg font-bold text-white mt-0.5 tabular-nums truncate">{formatCurrency(totals.inflow)}</p>
            </div>
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.06] backdrop-blur-sm">
              <ArrowUpRight className="size-4 text-white/80" />
            </div>
          </div>
        </GradientCard>
        <GradientCard gradient="bg-gradient-to-br from-rose-500 via-pink-400 to-rose-300">
          <div className="flex items-start justify-between relative z-10">
            <div className="min-w-0 flex-1 mr-2">
              <p className="text-xs text-white/50">Total Outflows</p>
              <p className="text-lg font-bold text-white mt-0.5 tabular-nums truncate">{formatCurrency(totals.outflow)}</p>
            </div>
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.06] backdrop-blur-sm">
              <ArrowDownRight className="size-4 text-white/80" />
            </div>
          </div>
        </GradientCard>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="size-6 animate-spin text-[#e0a84a]" /></div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {accounts.map((acc) => (
            <button key={acc.id} onClick={() => router.push(`/admin/banks/${acc.id}`)}
              className="text-left rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-xl p-5 hover:bg-white/[0.06] transition-colors">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Landmark className="size-4 text-[#e0a84a]" />
                    <h3 className="text-sm font-semibold text-white">{acc.bank_name}</h3>
                    {!acc.is_active && <Badge variant="outline" className="text-[10px] border-0 text-red-400">Inactive</Badge>}
                  </div>
                  <p className="text-xs text-white/50 mt-1">{acc.account_name}</p>
                  <p className="text-xs text-white/40 mt-0.5">{acc.account_number}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-white tabular-nums">{formatCurrency(acc.balance)}</p>
                  <p className="text-[10px] text-white/30 mt-0.5">balance</p>
                </div>
              </div>
              <div className="flex items-center gap-4 mt-3 pt-3 border-t border-white/[0.06]">
                <div className="flex items-center gap-1">
                  <ArrowUpRight className="size-3 text-emerald-400" />
                  <span className="text-xs text-emerald-400 tabular-nums">{formatCurrency(acc.total_in)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <ArrowDownRight className="size-3 text-rose-400" />
                  <span className="text-xs text-rose-400 tabular-nums">{formatCurrency(acc.total_out)}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Transfer Modal */}
      <Dialog open={showTransfer} onOpenChange={(o) => { if (!o && !saving) setShowTransfer(false); }}>
        <DialogContent className="sm:max-w-md border-white/[0.06] bg-card backdrop-blur-xl text-foreground">
          <DialogHeader>
            <DialogTitle className="text-white">Transfer Between Accounts</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleTransfer} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1">From Account *</label>
              <select value={transferForm.from} onChange={(e) => setTransferForm({ ...transferForm, from: e.target.value })} required
                className="flex h-9 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white">
                <option value="" className="bg-card">Select source...</option>
                {accounts.filter((a) => a.is_active).map((a) => (
                  <option key={a.id} value={a.id} className="bg-card">{a.bank_name} — {a.account_name} ({formatCurrency(a.balance)})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1">To Account *</label>
              <select value={transferForm.to} onChange={(e) => setTransferForm({ ...transferForm, to: e.target.value })} required
                className="flex h-9 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white">
                <option value="" className="bg-card">Select destination...</option>
                {accounts.filter((a) => a.is_active && a.id !== transferForm.from).map((a) => (
                  <option key={a.id} value={a.id} className="bg-card">{a.bank_name} — {a.account_name}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1">Amount (₦) *</label>
                <Input type="number" min={0} step="0.01" value={transferForm.amount}
                  onChange={(e) => setTransferForm({ ...transferForm, amount: e.target.value })} required
                  className={inputClass} placeholder="0.00" />
              </div>
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1">Date *</label>
                <Input type="date" value={transferForm.transfer_date}
                  onChange={(e) => setTransferForm({ ...transferForm, transfer_date: e.target.value })} required className={inputClass} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1">Description (optional)</label>
              <Input value={transferForm.description} onChange={(e) => setTransferForm({ ...transferForm, description: e.target.value })}
                className={inputClass} placeholder="e.g. Operational float" />
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" className="bg-white text-black border-border hover:bg-gray-100">Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={saving || !transferForm.from || !transferForm.to}
                className="bg-gradient-to-r from-[#e0a84a] to-amber-500 text-[#0a0f1a] font-semibold border-0 shadow-lg shadow-[#e0a84a]/20">
                {saving ? "Transferring..." : "Transfer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
