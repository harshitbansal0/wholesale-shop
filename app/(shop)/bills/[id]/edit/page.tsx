"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/page-header";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { StickyActionBar } from "@/components/sticky-action-bar";
import { Skeleton } from "@/components/loading-skeleton";
import { formatCurrency, roundMoney } from "@/lib/utils";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  ShoppingBag,
  Receipt,
  CreditCard,
  IndianRupee,
  Loader2,
  AlertCircle,
} from "lucide-react";

interface BillItem {
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

export default function EditBillPage() {
  const { id } = useParams();
  const router = useRouter();

  const [items, setItems] = useState<BillItem[]>([]);
  const [oldBalance, setOldBalance] = useState(0);
  const [cashPaid, setCashPaid] = useState(0);
  const [selfPaid, setSelfPaid] = useState(0);
  const [shopPaid, setShopPaid] = useState(0);
  const [billNumber, setBillNumber] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [dirty, setDirty] = useState(false);

  useUnsavedChanges(dirty);

  useEffect(() => {
    async function fetchBill() {
      try {
        const res = await fetch(`/api/bills/${id}`);
        if (res.ok) {
          const bill = await res.json();
          setBillNumber(bill.billNumber);
          setCustomerName(bill.customerName);
          setItems(
            bill.items.map((i: BillItem) => ({
              description: i.description,
              quantity: i.quantity,
              rate: i.rate,
              amount: i.amount,
            }))
          );
          setOldBalance(bill.oldBalance);
          setCashPaid(bill.payment.cash);
          setSelfPaid(bill.payment.self);
          setShopPaid(bill.payment.shop);
        }
      } catch {
        toast.error("Failed to load bill");
      }
      setLoading(false);
    }
    fetchBill();
  }, [id]);

  const goodsTotal = roundMoney(items.reduce((sum, item) => sum + item.amount, 0));
  const grandTotal = roundMoney(goodsTotal + oldBalance);
  const totalPaid = roundMoney(cashPaid + selfPaid + shopPaid);
  const dueAmount = roundMoney(grandTotal - totalPaid);

  function updateItem(index: number, field: keyof BillItem, value: string | number) {
    setDirty(true);
    const updated = [...items];
    if (field === "description") {
      updated[index].description = value as string;
    } else {
      const numVal = parseFloat(value as string) || 0;
      updated[index][field] = numVal;
      if (field === "quantity" || field === "rate") {
        updated[index].amount = roundMoney(updated[index].quantity * updated[index].rate);
      }
    }
    setItems(updated);
  }

  function addItem() {
    setDirty(true);
    setItems([...items, { description: "", quantity: 1, rate: 0, amount: 0 }]);
  }

  function removeItem(index: number) {
    if (items.length === 1) return;
    setDirty(true);
    setItems(items.filter((_, i) => i !== index));
  }

  async function handleSave() {
    setError("");
    const validItems = items.filter((item) => item.description && item.amount > 0);
    if (validItems.length === 0) {
      setError("At least one valid item is required");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/bills/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: validItems,
          oldBalance,
          payment: { cash: cashPaid, self: selfPaid, shop: shopPaid },
        }),
      });

      if (res.ok) {
        setDirty(false);
        toast.success("Bill updated successfully");
        router.push(`/bills/${id}`);
      } else {
        const errData = await res.json();
        setError(errData.error || "Failed to update bill");
      }
    } catch {
      setError("Network error. Please try again.");
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="rounded-xl border p-6 space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-24">
      <Breadcrumbs items={[
        { label: "Dashboard", href: "/dashboard" },
        { label: billNumber, href: `/bills/${id}` },
        { label: "Edit" },
      ]} />

      <PageHeader
        title={`Edit ${billNumber}`}
        subtitle={`Customer: ${customerName}`}
        backHref
      />

      <div className="space-y-5 mt-6">
        {/* Bill Items */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ShoppingBag className="size-4 text-muted-foreground" />
                <h2 className="font-semibold">Items</h2>
                <span className="text-xs text-muted-foreground">({items.length})</span>
              </div>
              <Button onClick={addItem} variant="outline" size="sm" className="gap-1.5">
                <Plus className="size-3.5" />
                Add Item
              </Button>
            </div>

            <div className="space-y-3">
              <div className="hidden sm:grid sm:grid-cols-[1fr_5rem_6rem_6rem_2rem] gap-2 px-1">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Description</span>
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Qty</span>
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Rate</span>
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider text-right">Amount</span>
                <span />
              </div>

              {items.map((item, index) => (
                <div
                  key={index}
                  className="group grid grid-cols-1 sm:grid-cols-[1fr_5rem_6rem_6rem_2rem] gap-2 rounded-lg border bg-muted/30 p-3 sm:items-center sm:bg-transparent sm:border-0 sm:p-0 sm:rounded-none"
                >
                  <div>
                    <Label className="text-xs text-muted-foreground sm:hidden mb-1 block">Description</Label>
                    <Input
                      value={item.description}
                      onChange={(e) => updateItem(index, "description", e.target.value)}
                      placeholder={`Item ${index + 1}`}
                      className="h-10 sm:h-9"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground sm:hidden mb-1 block">Qty</Label>
                    <Input
                      type="number"
                      value={item.quantity || ""}
                      onChange={(e) => updateItem(index, "quantity", e.target.value)}
                      min="1"
                      inputMode="numeric"
                      className="h-10 sm:h-9"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground sm:hidden mb-1 block">Rate</Label>
                    <Input
                      type="number"
                      value={item.rate || ""}
                      onChange={(e) => updateItem(index, "rate", e.target.value)}
                      min="0"
                      inputMode="decimal"
                      className="h-10 sm:h-9"
                    />
                  </div>
                  <div className="flex items-center justify-between sm:justify-end">
                    <Label className="text-xs text-muted-foreground sm:hidden">Amount</Label>
                    <span className="text-sm font-semibold tabular-nums">
                      {formatCurrency(item.amount)}
                    </span>
                  </div>
                  <div className="flex justify-end">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem(index)}
                      disabled={items.length === 1}
                      className="size-8 text-muted-foreground hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity max-sm:opacity-100"
                      aria-label={`Remove item ${index + 1}`}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              ))}

              {items.length > 1 && <Separator />}

              <div className="flex justify-end px-1">
                <div className="text-right">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">Items Total</span>
                  <p className="text-lg font-bold tabular-nums">{formatCurrency(goodsTotal)}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary & Payment */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-4">
                <Receipt className="size-4 text-muted-foreground" />
                <h2 className="font-semibold">Summary</h2>
              </div>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Old Balance
                  </Label>
                  <Input
                    type="number"
                    value={oldBalance || ""}
                    onChange={(e) => { setOldBalance(parseFloat(e.target.value) || 0); setDirty(true); }}
                    min="0"
                    inputMode="decimal"
                    className="h-10"
                    placeholder="₹0"
                  />
                </div>

                <Separator />

                <div className="space-y-2 pt-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Goods Total</span>
                    <span className="font-medium tabular-nums">{formatCurrency(goodsTotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Old Balance</span>
                    <span className="font-medium tabular-nums">{formatCurrency(oldBalance)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between pt-1">
                    <span className="font-bold">Grand Total</span>
                    <span className="text-lg font-bold tabular-nums">{formatCurrency(grandTotal)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-4">
                <CreditCard className="size-4 text-muted-foreground" />
                <h2 className="font-semibold">Payment</h2>
              </div>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Cash</Label>
                  <div className="relative">
                    <IndianRupee className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                    <Input
                      type="number"
                      value={cashPaid || ""}
                      onChange={(e) => { setCashPaid(parseFloat(e.target.value) || 0); setDirty(true); }}
                      min="0"
                      inputMode="decimal"
                      placeholder="0"
                      className="h-10 pl-8"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Self
                    <span className="ml-1 text-muted-foreground font-normal normal-case tracking-normal">(UPI / Phone)</span>
                  </Label>
                  <div className="relative">
                    <IndianRupee className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                    <Input
                      type="number"
                      value={selfPaid || ""}
                      onChange={(e) => { setSelfPaid(parseFloat(e.target.value) || 0); setDirty(true); }}
                      min="0"
                      inputMode="decimal"
                      placeholder="0"
                      className="h-10 pl-8"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Shop
                    <span className="ml-1 text-muted-foreground font-normal normal-case tracking-normal">(Bank Account)</span>
                  </Label>
                  <div className="relative">
                    <IndianRupee className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                    <Input
                      type="number"
                      value={shopPaid || ""}
                      onChange={(e) => { setShopPaid(parseFloat(e.target.value) || 0); setDirty(true); }}
                      min="0"
                      inputMode="decimal"
                      placeholder="0"
                      className="h-10 pl-8"
                    />
                  </div>
                </div>

                <Separator />

                <div className="space-y-2 pt-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Paid</span>
                    <span className="font-medium tabular-nums text-emerald-600">{formatCurrency(totalPaid)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-bold">Due Amount</span>
                    <span className={`text-lg font-bold tabular-nums ${dueAmount > 0 ? "text-red-600" : "text-emerald-600"}`}>
                      {formatCurrency(dueAmount)}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <StickyActionBar
        summary={
          grandTotal > 0 ? (
            <>
              Grand Total: <span className="font-semibold text-foreground">{formatCurrency(grandTotal)}</span>
              {dueAmount > 0 && (
                <span className="text-red-600 ml-2">Due: {formatCurrency(dueAmount)}</span>
              )}
            </>
          ) : null
        }
      >
        <Button variant="outline" onClick={() => router.push(`/bills/${id}`)}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving} className="min-w-[120px]">
          {saving ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Update Bill"
          )}
        </Button>
      </StickyActionBar>

      {error && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-lg animate-in slide-in-from-bottom-4" role="alert">
          <AlertCircle className="size-4 shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
}
