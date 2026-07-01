"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { format } from "date-fns";

interface Bill {
  _id: string;
  billNumber: string;
  date: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  items: { sNo: number; description: string; quantity: number; rate: number; amount: number }[];
  goodsTotal: number;
  oldBalance: number;
  grandTotal: number;
  payment: { cash: number; self: number; shop: number; totalPaid: number };
  dueAmount: number;
}

function formatCurrency(amount: number) {
  return `₹${amount.toLocaleString("en-IN")}`;
}

export default function BillViewPage() {
  const { id } = useParams();
  const router = useRouter();
  const [bill, setBill] = useState<Bill | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    async function fetchBill() {
      try {
        const res = await fetch(`/api/bills/${id}`);
        if (res.ok) {
          const data = await res.json();
          setBill(data);
        }
      } catch (error) {
        console.error("Failed to fetch bill:", error);
      }
      setLoading(false);
    }
    fetchBill();
  }, [id]);

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/bills/${id}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/dashboard");
      }
    } catch (error) {
      console.error("Delete failed:", error);
    }
    setDeleting(false);
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  if (!bill) {
    return <div className="text-center py-8">Bill not found</div>;
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{bill.billNumber}</h1>
          <p className="text-muted-foreground">
            {format(new Date(bill.date), "dd MMMM yyyy")}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.back()}>
            Back
          </Button>
          <Button variant="outline" onClick={() => router.push(`/bills/${id}/edit`)}>
            Edit
          </Button>
          <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
            <DialogTrigger render={<Button variant="destructive" />}>
              Delete
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Confirm Delete</DialogTitle>
              </DialogHeader>
              <p>Are you sure you want to delete {bill.billNumber}? This action will reverse the customer&apos;s financials.</p>
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => setDeleteOpen(false)}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
                  {deleting ? "Deleting..." : "Delete"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Customer Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Customer</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-x-8 gap-y-1">
            <span>
              <span className="text-muted-foreground">Name: </span>
              <span
                className="font-medium cursor-pointer text-primary hover:underline"
                onClick={() => router.push(`/customers/${bill.customerId}`)}
              >
                {bill.customerName}
              </span>
            </span>
            <span>
              <span className="text-muted-foreground">Phone: </span>
              <span className="font-medium">{bill.customerPhone}</span>
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Items */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">S.No</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bill.items.map((item) => (
                  <TableRow key={item.sNo}>
                    <TableCell>{item.sNo}</TableCell>
                    <TableCell>{item.description}</TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.rate)}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(item.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Bill Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span>Goods Total</span>
              <span>{formatCurrency(bill.goodsTotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>Old Balance</span>
              <span>{formatCurrency(bill.oldBalance)}</span>
            </div>
            <Separator />
            <div className="flex justify-between text-lg font-bold">
              <span>Grand Total</span>
              <span>{formatCurrency(bill.grandTotal)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Payment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex flex-wrap gap-2 mb-2">
              {bill.payment.cash > 0 && (
                <Badge variant="outline">Cash: {formatCurrency(bill.payment.cash)}</Badge>
              )}
              {bill.payment.self > 0 && (
                <Badge variant="outline">Self: {formatCurrency(bill.payment.self)}</Badge>
              )}
              {bill.payment.shop > 0 && (
                <Badge variant="outline">Shop: {formatCurrency(bill.payment.shop)}</Badge>
              )}
            </div>
            <div className="flex justify-between">
              <span>Total Paid</span>
              <span className="font-medium text-green-600">
                {formatCurrency(bill.payment.totalPaid)}
              </span>
            </div>
            <Separator />
            <div className="flex justify-between text-lg font-bold">
              <span>Due Amount</span>
              <span className={bill.dueAmount > 0 ? "text-red-600" : "text-green-600"}>
                {bill.dueAmount > 0 ? formatCurrency(bill.dueAmount) : "Paid"}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
