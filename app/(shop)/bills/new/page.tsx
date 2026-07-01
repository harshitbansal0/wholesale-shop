"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Plus,
  Trash2,
  UserCheck,
  UserPlus,
  Phone,
  IndianRupee,
  ShoppingBag,
  Receipt,
  CreditCard,
  Loader2,
  AlertCircle,
} from "lucide-react";

interface BillItem {
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

function formatCurrency(amount: number) {
  return `₹${amount.toLocaleString("en-IN")}`;
}

export default function CreateBillPage() {
  const router = useRouter();

  const [customerPhone, setCustomerPhone] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [isExistingCustomer, setIsExistingCustomer] = useState(false);
  const [customerLookupDone, setCustomerLookupDone] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);

  const [oldBalance, setOldBalance] = useState(0);

  const [items, setItems] = useState<BillItem[]>([
    { description: "", quantity: 1, rate: 0, amount: 0 },
  ]);

  const [cashPaid, setCashPaid] = useState(0);
  const [selfPaid, setSelfPaid] = useState(0);
  const [shopPaid, setShopPaid] = useState(0);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const goodsTotal = items.reduce((sum, item) => sum + item.amount, 0);
  const grandTotal = goodsTotal + oldBalance;
  const totalPaid = cashPaid + selfPaid + shopPaid;
  const dueAmount = grandTotal - totalPaid;

  const lookupCustomer = useCallback(async (phone: string) => {
    if (phone.length < 10) return;
    setLookingUp(true);
    try {
      const res = await fetch(`/api/customers/lookup?phone=${encodeURIComponent(phone)}`);
      const json = await res.json();

      if (json.found) {
        setCustomerName(json.customer.name);
        setCustomerAddress(json.customer.address || "");
        setOldBalance(json.customer.totalDue || 0);
        setIsExistingCustomer(true);
      } else {
        setCustomerName("");
        setCustomerAddress("");
        setOldBalance(0);
        setIsExistingCustomer(false);
      }
      setCustomerLookupDone(true);
    } catch (error) {
      console.error("Lookup failed:", error);
    }
    setLookingUp(false);
  }, []);

  function updateItem(index: number, field: keyof BillItem, value: string | number) {
    const updated = [...items];
    if (field === "description") {
      updated[index].description = value as string;
    } else {
      const numVal = parseFloat(value as string) || 0;
      updated[index][field] = numVal;
      if (field === "quantity" || field === "rate") {
        updated[index].amount = updated[index].quantity * updated[index].rate;
      }
    }
    setItems(updated);
  }

  function addItem() {
    setItems([...items, { description: "", quantity: 1, rate: 0, amount: 0 }]);
  }

  function removeItem(index: number) {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== index));
  }

  async function handleSave() {
    setError("");

    if (!customerPhone || !customerName) {
      setError("Customer name and phone are required");
      return;
    }

    const validItems = items.filter((item) => item.description && item.amount > 0);
    if (validItems.length === 0) {
      setError("At least one valid item is required");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/bills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName,
          customerPhone,
          customerAddress,
          items: validItems,
          oldBalance,
          payment: { cash: cashPaid, self: selfPaid, shop: shopPaid },
        }),
      });

      if (res.ok) {
        const bill = await res.json();
        router.push(`/bills/${bill._id}`);
      } else {
        const errData = await res.json();
        setError(errData.error || "Failed to save bill");
      }
    } catch (err) {
      setError("Network error. Please try again.");
      console.error(err);
    }
    setSaving(false);
  }

  return (
    <div className="max-w-4xl mx-auto pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="size-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">New Bill</h1>
          <p className="text-sm text-muted-foreground">Create a new bill for a customer</p>
        </div>
      </div>

      <div className="space-y-5">
        {/* Customer Info */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-4">
              <Phone className="size-4 text-muted-foreground" />
              <h2 className="font-semibold">Customer</h2>
              {customerLookupDone && isExistingCustomer && (
                <Badge variant="secondary" className="ml-auto gap-1 text-green-700 bg-green-50 border-green-200">
                  <UserCheck className="size-3" />
                  Existing
                </Badge>
              )}
              {customerLookupDone && !isExistingCustomer && customerPhone.length >= 10 && (
                <Badge variant="secondary" className="ml-auto gap-1 text-blue-700 bg-blue-50 border-blue-200">
                  <UserPlus className="size-3" />
                  New Customer
                </Badge>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Phone
                </Label>
                <div className="relative">
                  <Input
                    id="phone"
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => {
                      setCustomerPhone(e.target.value);
                      setCustomerLookupDone(false);
                    }}
                    onBlur={() => lookupCustomer(customerPhone)}
                    placeholder="10-digit number"
                    className="h-10"
                  />
                  {lookingUp && (
                    <Loader2 className="absolute right-2.5 top-2.5 size-4 animate-spin text-muted-foreground" />
                  )}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Name
                </Label>
                <Input
                  id="name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Customer name"
                  disabled={isExistingCustomer}
                  className="h-10"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="address" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Address
                </Label>
                <Input
                  id="address"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  placeholder="Optional"
                  disabled={isExistingCustomer}
                  className="h-10"
                />
              </div>
            </div>
          </CardContent>
        </Card>

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
              {/* Column headers - desktop */}
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
          {/* Bill Summary */}
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
                    onChange={(e) => setOldBalance(parseFloat(e.target.value) || 0)}
                    min="0"
                    className="h-10"
                    placeholder="₹0"
                  />
                  {isExistingCustomer && oldBalance > 0 && (
                    <p className="text-xs text-muted-foreground">Auto-filled from records</p>
                  )}
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

          {/* Payment */}
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
                      onChange={(e) => setCashPaid(parseFloat(e.target.value) || 0)}
                      min="0"
                      placeholder="0"
                      className="h-10 pl-8"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Self</Label>
                  <div className="relative">
                    <IndianRupee className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                    <Input
                      type="number"
                      value={selfPaid || ""}
                      onChange={(e) => setSelfPaid(parseFloat(e.target.value) || 0)}
                      min="0"
                      placeholder="0"
                      className="h-10 pl-8"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Shop</Label>
                  <div className="relative">
                    <IndianRupee className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                    <Input
                      type="number"
                      value={shopPaid || ""}
                      onChange={(e) => setShopPaid(parseFloat(e.target.value) || 0)}
                      min="0"
                      placeholder="0"
                      className="h-10 pl-8"
                    />
                  </div>
                </div>

                <Separator />

                <div className="space-y-2 pt-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Paid</span>
                    <span className="font-medium tabular-nums text-green-600">{formatCurrency(totalPaid)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-bold">Due Amount</span>
                    <span className={`text-lg font-bold tabular-nums ${dueAmount > 0 ? "text-red-600" : "text-green-600"}`}>
                      {formatCurrency(dueAmount)}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Sticky bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 lg:left-64 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 z-30">
        <div className="max-w-4xl mx-auto flex items-center justify-between px-4 py-3 sm:px-6">
          <div className="hidden sm:block">
            {grandTotal > 0 && (
              <p className="text-sm text-muted-foreground">
                Grand Total: <span className="font-semibold text-foreground">{formatCurrency(grandTotal)}</span>
                {dueAmount > 0 && (
                  <span className="text-red-600 ml-2">Due: {formatCurrency(dueAmount)}</span>
                )}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3 ml-auto">
            <Button variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving} className="min-w-[120px]">
              {saving ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Bill"
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Error toast */}
      {error && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-lg animate-in slide-in-from-bottom-4">
          <AlertCircle className="size-4 shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
}
