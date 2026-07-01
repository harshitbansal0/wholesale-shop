"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface BillItem {
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

function formatCurrency(amount: number) {
  return `₹${amount.toLocaleString("en-IN")}`;
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
      } catch (error) {
        console.error("Failed to fetch bill:", error);
      }
      setLoading(false);
    }
    fetchBill();
  }, [id]);

  const goodsTotal = items.reduce((sum, item) => sum + item.amount, 0);
  const grandTotal = goodsTotal + oldBalance;
  const totalPaid = cashPaid + selfPaid + shopPaid;
  const dueAmount = grandTotal - totalPaid;

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
        router.push(`/bills/${id}`);
      } else {
        const errData = await res.json();
        setError(errData.error || "Failed to update bill");
      }
    } catch (err) {
      setError("Network error. Please try again.");
      console.error(err);
    }
    setSaving(false);
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Edit {billNumber}</h1>
          <p className="text-muted-foreground">Customer: {customerName}</p>
        </div>
        <Button variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>

      {/* Old Balance */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Previous Outstanding</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-w-xs">
            <Label>Old Balance (₹)</Label>
            <Input
              type="number"
              value={oldBalance}
              onChange={(e) => setOldBalance(parseFloat(e.target.value) || 0)}
              min="0"
            />
          </div>
        </CardContent>
      </Card>

      {/* Items */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Bill Items</CardTitle>
            <Button onClick={addItem} size="sm">
              + Add Item
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">S.No</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-24">Qty</TableHead>
                  <TableHead className="w-28">Rate</TableHead>
                  <TableHead className="w-28 text-right">Amount</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>
                      <Input
                        value={item.description}
                        onChange={(e) => updateItem(index, "description", e.target.value)}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={item.quantity || ""}
                        onChange={(e) => updateItem(index, "quantity", e.target.value)}
                        min="1"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={item.rate || ""}
                        onChange={(e) => updateItem(index, "rate", e.target.value)}
                        min="0"
                      />
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(item.amount)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(index)}
                        disabled={items.length === 1}
                        className="text-red-500"
                      >
                        ✕
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Summary & Payment */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Bill Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span>Goods Total</span>
              <span>{formatCurrency(goodsTotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>Old Balance</span>
              <span>{formatCurrency(oldBalance)}</span>
            </div>
            <Separator />
            <div className="flex justify-between text-lg font-bold">
              <span>Grand Total</span>
              <span>{formatCurrency(grandTotal)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Payment Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <Label className="w-16">Cash</Label>
              <Input
                type="number"
                value={cashPaid || ""}
                onChange={(e) => setCashPaid(parseFloat(e.target.value) || 0)}
                min="0"
              />
            </div>
            <div className="flex items-center gap-2">
              <Label className="w-16">Self</Label>
              <Input
                type="number"
                value={selfPaid || ""}
                onChange={(e) => setSelfPaid(parseFloat(e.target.value) || 0)}
                min="0"
              />
            </div>
            <div className="flex items-center gap-2">
              <Label className="w-16">Shop</Label>
              <Input
                type="number"
                value={shopPaid || ""}
                onChange={(e) => setShopPaid(parseFloat(e.target.value) || 0)}
                min="0"
              />
            </div>
            <Separator />
            <div className="flex justify-between font-medium">
              <span>Total Paid</span>
              <span className="text-green-600">{formatCurrency(totalPaid)}</span>
            </div>
            <div className="flex justify-between font-medium">
              <span>Due</span>
              <span className={dueAmount > 0 ? "text-red-600" : "text-green-600"}>
                {formatCurrency(dueAmount)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="flex justify-end gap-4">
        <Button variant="outline" onClick={() => router.push(`/bills/${id}`)}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving} size="lg">
          {saving ? "Saving..." : "Update Bill"}
        </Button>
      </div>
    </div>
  );
}
