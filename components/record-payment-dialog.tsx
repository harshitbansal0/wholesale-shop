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
import { IndianRupee } from "lucide-react";
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

  async function handleSubmit() {
    const numAmount = parseFloat(amount);
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
            <Label>Amount</Label>
            <div className="relative">
              <IndianRupee className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                min="1"
                className="pl-8"
                autoFocus
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Payment Type</Label>
            <Select value={type} onValueChange={(v) => v && setType(v as typeof type)}>
              <SelectTrigger>
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
            <Label>Note (optional)</Label>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g., Partial payment"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <Button onClick={handleSubmit} disabled={loading} className="w-full">
            {loading ? "Processing..." : "Save Payment"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
