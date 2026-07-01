"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { RecordPaymentDialog } from "@/components/record-payment-dialog";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { PageHeader } from "@/components/page-header";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { MoneyDisplay } from "@/components/money-display";
import { StatusBadge, getPaymentStatus } from "@/components/status-badge";
import { ErrorState } from "@/components/error-state";
import { Skeleton } from "@/components/loading-skeleton";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import {
  CreditCard,
  MoreHorizontal,
  Pencil,
  Trash2,
  Printer,
  Phone,
} from "lucide-react";

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

export default function BillViewPage() {
  const { id } = useParams();
  const router = useRouter();
  const [bill, setBill] = useState<Bill | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [customerDue, setCustomerDue] = useState<number | null>(null);

  async function handlePayClick() {
    if (!bill) return;
    try {
      const res = await fetch(`/api/customers/${bill.customerId}`);
      const json = await res.json();
      setCustomerDue(json.customer?.totalDue ?? bill.dueAmount);
    } catch {
      setCustomerDue(bill.dueAmount);
    }
    setPaymentOpen(true);
  }

  async function fetchBill() {
    try {
      const res = await fetch(`/api/bills/${id}`);
      if (res.ok) {
        const data = await res.json();
        setBill(data);
      }
    } catch {
      toast.error("Failed to load bill");
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchBill();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleDelete() {
    try {
      const res = await fetch(`/api/bills/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Bill deleted");
        router.push("/dashboard");
      } else {
        toast.error("Failed to delete bill");
      }
    } catch {
      toast.error("Failed to delete bill");
    }
  }

  function handlePrint() {
    window.print();
  }

  if (loading) {
    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        <Skeleton className="h-6 w-40" />
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-9 w-32" />
        </div>
        <div className="rounded-xl border p-6 space-y-3">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-36" />
        </div>
        <div className="rounded-xl border p-6 space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    );
  }

  if (!bill) {
    return (
      <div className="max-w-3xl mx-auto">
        <ErrorState message="Bill not found" />
      </div>
    );
  }

  const status = getPaymentStatus(bill.payment.totalPaid, bill.grandTotal);

  return (
    <div className="space-y-6 max-w-3xl mx-auto print:max-w-none">
      <Breadcrumbs items={[{ label: "Dashboard", href: "/dashboard" }, { label: bill.billNumber }]} />

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{bill.billNumber}</h1>
              <StatusBadge status={status} />
            </div>
            <p className="text-muted-foreground">
              {format(new Date(bill.date), "dd MMMM yyyy")}
            </p>
          </div>
        </div>
        <div className="flex gap-2 print:hidden">
          {bill.dueAmount > 0 && (
            <Button onClick={handlePayClick} className="gap-1.5">
              <CreditCard className="size-4" />
              Record Payment
            </Button>
          )}
          <Button variant="outline" size="icon" onClick={handlePrint} aria-label="Print bill">
            <Printer className="size-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="outline" size="icon" aria-label="More actions" />}>
              <MoreHorizontal className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => router.push(`/bills/${id}/edit`)}>
                <Pencil className="size-4 mr-2" />
                Edit Bill
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDeleteOpen(true)} className="text-destructive">
                <Trash2 className="size-4 mr-2" />
                Delete Bill
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Customer Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Customer</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-x-8 gap-y-2">
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground text-sm">Name:</span>
              <Link
                href={`/customers/${bill.customerId}`}
                className="font-medium text-primary hover:underline"
              >
                {bill.customerName}
              </Link>
            </div>
            <div className="flex items-center gap-1.5">
              <Phone className="size-3.5 text-muted-foreground" />
              <a href={`tel:${bill.customerPhone}`} className="font-medium hover:underline">
                {bill.customerPhone}
              </a>
            </div>
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
                    <TableCell className="text-right tabular-nums">{item.quantity}</TableCell>
                    <TableCell className="text-right">
                      <MoneyDisplay amount={item.rate} />
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      <MoneyDisplay amount={item.amount} />
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
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Goods Total</span>
              <MoneyDisplay amount={bill.goodsTotal} />
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Old Balance</span>
              <MoneyDisplay amount={bill.oldBalance} />
            </div>
            <Separator />
            <div className="flex justify-between text-lg font-bold">
              <span>Grand Total</span>
              <MoneyDisplay amount={bill.grandTotal} className="text-lg font-bold" />
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
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Paid</span>
              <MoneyDisplay amount={bill.payment.totalPaid} variant="paid" showIcon />
            </div>
            <Separator />
            <div className="flex justify-between text-lg font-bold">
              <span>Due Amount</span>
              <MoneyDisplay
                amount={bill.dueAmount}
                variant={bill.dueAmount > 0 ? "due" : "paid"}
                showIcon
                className="text-lg font-bold"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Print-only styles */}
      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          .print\\:max-w-none, .print\\:max-w-none * { visibility: visible; }
          .print\\:hidden { display: none !important; }
          nav[aria-label="Breadcrumb"] { display: none; }
        }
      `}</style>

      <RecordPaymentDialog
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        customerId={bill.customerId}
        customerName={bill.customerName}
        totalDue={customerDue ?? bill.dueAmount}
        onSuccess={() => { fetchBill(); toast.success("Payment recorded"); }}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Bill"
        description={
          <span>
            Are you sure you want to delete <strong>{bill.billNumber}</strong>? This will reverse{" "}
            <strong>{formatCurrency(bill.goodsTotal)}</strong> in purchases and{" "}
            <strong>{formatCurrency(bill.payment.totalPaid)}</strong> in payments for {bill.customerName}.
          </span>
        }
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}
