"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { IndianRupee, AlertTriangle, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface RecordPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  customerName: string;
  totalDue: number;
  onSuccess: () => void;
}

export function RecordPaymentDialog({
  open,
  onOpenChange,
  customerId,
  customerName,
  totalDue,
  onSuccess,
}: RecordPaymentDialogProps) {
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"cash" | "self" | "shop">("cash");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const numAmount = parseFloat(amount) || 0;
  const isOverpayment = numAmount > totalDue && totalDue > 0;

  async function handleSubmit() {
    if (!numAmount || numAmount <= 0) {
      setError("Enter a valid amount");
      return;
    }

    setError("");
    setLoading(true);
    try {
      const res = await fetch(`/api/customers/${customerId}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: numAmount, type, note }),
      });

      if (res.ok) {
        setAmount("");
        setNote("");
        setType("cash");
        onOpenChange(false);
        onSuccess();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to record payment");
      }
    } catch {
      setError("Network error. Try again.");
    }
    setLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
        </DialogHeader>

        <div className="text-sm text-muted-foreground mb-1">
          <span className="font-medium text-foreground">{customerName}</span>
          {totalDue > 0 && (
            <span> — Outstanding: <span className="text-red-600 font-medium">{formatCurrency(totalDue)}</span></span>
          )}
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="pay-amount">Amount</Label>
            <div className="relative">
              <IndianRupee className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                id="pay-amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                min="1"
                inputMode="decimal"
                className="pl-8"
                autoFocus
                aria-describedby={error ? "pay-error" : isOverpayment ? "pay-warning" : undefined}
                aria-invalid={!!error}
              />
            </div>
            {isOverpayment && (
              <div id="pay-warning" className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-2.5 py-1.5 mt-1.5" role="alert">
                <AlertTriangle className="size-3.5 shrink-0" />
                Amount exceeds outstanding due by {formatCurrency(numAmount - totalDue)}
              </div>
            )}
            {totalDue > 0 && !isOverpayment && numAmount === 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 text-xs px-2 mt-1"
                onClick={() => setAmount(totalDue.toString())}
              >
                Pay full amount ({formatCurrency(totalDue)})
              </Button>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pay-type">Payment Type</Label>
            <Select value={type} onValueChange={(v) => v && setType(v as typeof type)}>
              <SelectTrigger id="pay-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="self">Self (UPI/Phone)</SelectItem>
                <SelectItem value="shop">Shop (Bank Account)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pay-note">Note (optional)</Label>
            <Input
              id="pay-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g., Partial payment"
            />
          </div>

          {error && <p id="pay-error" className="text-sm text-red-600" role="alert">{error}</p>}

          <Button onClick={handleSubmit} disabled={loading} className="w-full">
            {loading ? <><Loader2 className="size-4 animate-spin" />Processing...</> : "Save Payment"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
