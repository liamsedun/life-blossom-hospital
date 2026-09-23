"use client";

import { useState, useEffect, use, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Landmark, Loader2, ArrowUpRight, ArrowDownRight, ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { useRoleGuard } from "@/hooks/use-role-guard";

interface TxRow {
  id: string; amount: number; date: string; description: string;
  type: "payment" | "expense" | "other_income" | "transfer_in" | "transfer_out";
  category?: string; counterparty?: string; created_at: string;
}

interface AccountInfo {
  id: string; bank_name: string; account_name: string; account_number: string; is_active: boolean;
  balance: number; total_in: number; total_out: number;
}

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  payment: { label: "Patient Payment", color: "text-emerald-400 bg-emerald-500/10" },
  other_income: { label: "Other Income", color: "text-blue-400 bg-blue-500/10" },
  expense: { label: "Expense", color: "text-rose-400 bg-rose-500/10" },
  transfer_in: { label: "Transfer In", color: "text-violet-400 bg-violet-500/10" },
  transfer_out: { label: "Transfer Out", color: "text-amber-400 bg-amber-500/10" },
};

export default function BankDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { authorized } = useRoleGuard(["admin", "accountant", "cashier"]);
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [transactions, setTransactions] = useState<TxRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      fetch("/api/bank-accounts").then((r) => r.json()),
      fetch(`/api/bank-accounts/${id}/transactions`).then((r) => r.json()),
    ]).then(([accJson, txJson]) => {
      const found = (accJson.data || []).find((a: AccountInfo) => a.id === id);
      setAccount(found || null);
      if (txJson.success) setTransactions(txJson.data || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  const runningBalance = useMemo(() => {
    const sorted = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    let bal = 0;
    return sorted.map((tx) => {
      bal += tx.amount;
      return { ...tx, runningBalance: Math.round(bal * 100) / 100 };
    }).reverse();
  }, [transactions]);

  if (!authorized) return null;
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-[#e0a84a]" />
      </div>
    );
  }

  if (!account) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => router.push("/admin/banks")} className="text-white/60 hover:text-white">
          <ArrowLeft className="size-4 mr-1" />Back to Banks
        </Button>
        <p className="text-white/50">Account not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" onClick={() => router.push("/admin/banks")} className="text-white/60 hover:text-white h-8 px-2">
          <ArrowLeft className="size-4" />
        </Button>
        <div>
          <div className="flex items-center gap-2">
            <Landmark className="size-5 text-[#e0a84a]" />
            <h1 className="text-2xl font-bold text-white">{account.bank_name}</h1>
            {!account.is_active && <Badge variant="outline" className="text-[10px] border-0 text-red-400">Inactive</Badge>}
          </div>
          <p className="text-sm text-white/50 mt-0.5">{account.account_name} — {account.account_number}</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-xl p-4">
          <p className="text-xs text-white/50">Balance</p>
          <p className="text-xl font-bold text-white mt-1 tabular-nums">{formatCurrency(account.balance)}</p>
        </div>
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-xl p-4">
          <p className="text-xs text-white/50">Total Inflows</p>
          <p className="text-xl font-bold text-emerald-400 mt-1 tabular-nums">{formatCurrency(account.total_in)}</p>
        </div>
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-xl p-4">
          <p className="text-xs text-white/50">Total Outflows</p>
          <p className="text-xl font-bold text-rose-400 mt-1 tabular-nums">{formatCurrency(account.total_out)}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-white/[0.06]">
          <h2 className="text-sm font-semibold text-white">Transaction History</h2>
        </div>
        {runningBalance.length === 0 ? (
          <div className="py-12 text-center text-sm text-white/40">No transactions yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] text-left text-xs text-white/40">
                  <th className="px-5 py-3 font-medium">Date</th>
                  <th className="px-5 py-3 font-medium">Description</th>
                  <th className="px-5 py-3 font-medium">Type</th>
                  <th className="px-5 py-3 font-medium text-right">Amount</th>
                  <th className="px-5 py-3 font-medium text-right">Balance</th>
                </tr>
              </thead>
              <tbody>
                {runningBalance.map((tx) => {
                  const typeInfo = TYPE_LABELS[tx.type] || { label: tx.type, color: "text-white/40" };
                  return (
                    <tr key={tx.id} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] transition-colors">
                      <td className="px-5 py-3 text-white/60 text-xs">{formatDate(tx.date)}</td>
                      <td className="px-5 py-3">
                        <p className="font-medium text-white text-xs">{tx.description}</p>
                        {tx.counterparty && <p className="text-[10px] text-white/40 mt-0.5">{tx.counterparty}</p>}
                      </td>
                      <td className="px-5 py-3">
                        <Badge variant="outline" className={cn("text-[10px] border-0", typeInfo.color)}>{typeInfo.label}</Badge>
                      </td>
                      <td className={cn("px-5 py-3 text-right font-semibold tabular-nums text-xs", tx.amount >= 0 ? "text-emerald-400" : "text-rose-400")}>
                        {tx.amount >= 0 ? "+" : ""}{formatCurrency(Math.abs(tx.amount))}
                      </td>
                      <td className="px-5 py-3 text-right text-white/60 tabular-nums text-xs">{formatCurrency(tx.runningBalance)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
