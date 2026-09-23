"use client";

import { useState, useEffect, useMemo } from "react";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn, formatCurrency } from "@/lib/utils";
import { emitDashboardRefresh } from "@/lib/dashboard-events";
import type { Invoice, InvoiceItem } from "@/lib/api-types";

interface Props {
  invoice: Invoice;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface EditLineItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  vat_percent: number;
}

export default function EditInvoiceModal({ invoice, open, onClose, onSuccess }: Props) {
  const [notes, setNotes] = useState(invoice.notes || "");
  const [issueDate, setIssueDate] = useState(invoice.issue_date || "");
  const [dueDate, setDueDate] = useState(invoice.due_date || "");
  const [items, setItems] = useState<EditLineItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open && invoice.items) {
      setItems(
        invoice.items.map((it) => ({
          id: it.id,
          description: it.description,
          quantity: it.quantity,
          unit_price: it.unit_price,
          vat_percent: it.vat_percent || 0,
        }))
      );
      setNotes(invoice.notes || "");
      setIssueDate(invoice.issue_date || "");
      setDueDate(invoice.due_date || "");
      setError("");
    }
  }, [open, invoice]);

  const subtotal = useMemo(() => items.reduce((s, i) => s + i.quantity * i.unit_price, 0), [items]);
  const taxAmount = useMemo(
    () => items.reduce((s, i) => s + ((i.quantity * i.unit_price) * (i.vat_percent || 0)) / 100, 0),
    [items]
  );
  const total = subtotal + taxAmount;

  const inputClass = "h-8 text-xs bg-white/[0.04] border-white/[0.08] text-black dark:text-white/80 placeholder:text-white/30 focus-visible:border-[#e0a84a]/40 focus-visible:ring-[#e0a84a]/20";

  const addItem = () => {
    setItems([...items, { id: crypto.randomUUID(), description: "", quantity: 1, unit_price: 0, vat_percent: 7.5 }]);
  };

  const removeItem = (id: string) => {
    if (items.length <= 1) return;
    setItems(items.filter((i) => i.id !== id));
  };

  const updateItem = (id: string, field: keyof EditLineItem, value: string | number) => {
    setItems(items.map((i) => (i.id === id ? { ...i, [field]: value } : i)));
  };

  const handleSubmit = async () => {
    setError("");
    if (items.some((i) => !i.description.trim())) {
      setError("All line items must have a description");
      return;
    }
    setSubmitting(true);
    try {
      const lineItems = items.map((i) => ({
        description: i.description,
        quantity: i.quantity,
        unit_price: i.unit_price,
        vat_percent: i.vat_percent || 0,
        vat_amount: ((i.quantity * i.unit_price) * (i.vat_percent || 0)) / 100,
        line_total: i.quantity * i.unit_price + ((i.quantity * i.unit_price) * (i.vat_percent || 0)) / 100,
      }));

      const res = await fetch(`/api/invoices/${invoice.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          issue_date: issueDate,
          due_date: dueDate || null,
          notes: notes || null,
          subtotal,
          tax: taxAmount,
          discount: 0,
          total,
          items: lineItems,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to update invoice");
      onSuccess();
      onClose();
      emitDashboardRefresh("invoices");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto border-white/[0.06] bg-card backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="text-white">Edit Invoice</DialogTitle>
          <DialogDescription className="text-white/50">{invoice.invoice_number}</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Line items */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-white/50">Line Items</label>
              <Button variant="ghost" size="sm" className="h-7 text-xs text-[#e0a84a] hover:text-[#e0a84a]/80 hover:bg-white/[0.06]"
                onClick={addItem}>
                <Plus className="w-3.5 h-3.5 mr-1" />Add Row
              </Button>
            </div>
            <div className="space-y-2">
              <div className="hidden sm:grid grid-cols-[1fr_60px_90px_70px_90px_32px] gap-2 px-1 text-[11px] font-medium text-white/40">
                <span>Description</span>
                <span className="text-center">Qty</span>
                <span className="text-right">Price</span>
                <span className="text-right">VAT%</span>
                <span className="text-right">Total</span>
                <span></span>
              </div>
              {items.map((item) => (
                <div key={item.id} className="grid grid-cols-[1fr_60px_90px_70px_90px_32px] gap-2 items-center">
                  <Input placeholder="Item description" className={inputClass} value={item.description}
                    onChange={(e) => updateItem(item.id, "description", e.target.value)} />
                  <Input type="number" min={1} className={"h-8 text-xs text-center " + inputClass} value={item.quantity}
                    onChange={(e) => updateItem(item.id, "quantity", Math.max(1, parseInt(e.target.value) || 1))} />
                  <Input type="number" min={0} step="0.01" className={"h-8 text-xs text-right " + inputClass} value={item.unit_price || ""} placeholder="0.00"
                    onChange={(e) => updateItem(item.id, "unit_price", parseFloat(e.target.value) || 0)} />
                  <Input type="number" min={0} max={100} step="0.5" className={"h-8 text-xs text-right " + inputClass} value={item.vat_percent || ""} placeholder="7.5"
                    onChange={(e) => updateItem(item.id, "vat_percent", parseFloat(e.target.value) || 0)} />
                  <div className="h-8 flex items-center justify-end text-xs font-semibold text-white">
                    {formatCurrency(item.quantity * item.unit_price)}
                  </div>
                  <button onClick={() => removeItem(item.id)} className="h-8 w-8 flex items-center justify-center text-white/50 hover:text-red-400 transition-colors"
                    disabled={items.length <= 1}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="border-t border-white/[0.06] pt-3 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-white/50">Sub Total</span>
              <span className="text-white">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/50">VAT Amount</span>
              <span className="text-white">{formatCurrency(taxAmount)}</span>
            </div>
            <div className="flex justify-between font-bold text-base border-t border-white/[0.06] pt-1.5">
              <span className="text-white">Total</span>
              <span className="text-white">{formatCurrency(total)}</span>
            </div>
          </div>

          {/* Dates + notes */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1">Invoice Date</label>
              <Input type="date" className={"h-8 text-xs " + inputClass} value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1">Due Date</label>
              <Input type="date" className={"h-8 text-xs " + inputClass} value={dueDate}
                onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-white/50 mb-1">Notes</label>
            <Textarea rows={3} className="border-white/[0.08] bg-white/[0.03] text-black dark:text-white/90 placeholder:text-white/30 text-sm"
              value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          {error && (
            <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-3 text-sm text-rose-400">{error}</div>
          )}
        </div>

        <DialogFooter className="mt-4 gap-2">
          <Button variant="outline" onClick={onClose} disabled={submitting}
            className="bg-white text-black border-border hover:bg-gray-100">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || items.some((i) => !i.description.trim()) || total <= 0}
            className="bg-[#e0a84a] hover:bg-[#e0a84a]/90 text-[#0a0f1a] font-semibold shadow-lg shadow-[#e0a84a]/20">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
            {submitting ? "Saving..." : `Save Changes — ${formatCurrency(total)}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
