"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { RecordPaymentDialog } from "@/components/record-payment-dialog";
import { PageHeader } from "@/components/page-header";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { MoneyDisplay } from "@/components/money-display";
import { StatusBadge, getPaymentStatus } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { Skeleton } from "@/components/loading-skeleton";
import { EditCustomerDialog } from "@/components/edit-customer-dialog";
import { IndianRupee, Phone as PhoneIcon, MapPin, CreditCard, FileText, Pencil } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";

interface Customer {
  _id: string;
  name: string;
  phone: string;
  address: string;
  initialBalance: number;
  totalPurchase: number;
  totalPaid: number;
  totalDue: number;
}

interface Bill {
  _id: string;
  billNumber: string;
  date: string;
  goodsTotal: number;
  grandTotal: number;
  payment: { cash: number; self: number; shop: number; totalPaid: number };
  dueAmount: number;
}

interface PaymentRecord {
  _id: string;
  amount: number;
  type: "cash" | "self" | "shop";
  date: string;
  note: string;
  billId: string | null;
}

export default function CustomerProfilePage() {
  const { id } = useParams();
  const router = useRouter();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [bills, setBills] = useState<Bill[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [sort, setSort] = useState("latest");
  const [billSearch, setBillSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const [custRes, payRes] = await Promise.all([
        fetch(`/api/customers/${id}?sort=${sort}&billSearch=${encodeURIComponent(billSearch)}`),
        fetch(`/api/customers/${id}/payments`),
      ]);
      const custJson = await custRes.json();
      setCustomer(custJson.customer);
      setBills(custJson.bills || []);

      if (payRes.ok) {
        const payJson = await payRes.json();
        setPayments(payJson.payments || []);
      }
    } catch {
      setError(true);
      toast.error("Failed to load customer data");
    }
    setLoading(false);
  }, [id, sort, billSearch]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function handleRowNav(e: React.KeyboardEvent, billId: string) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      router.push(`/bills/${billId}`);
    }
  }

  if (loading && !customer) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border p-6 space-y-3">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-40" />
          </div>
          <div className="rounded-xl border p-6 space-y-3">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-6 w-24" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="space-y-6">
        <Breadcrumbs items={[{ label: "Customers", href: "/customers" }, { label: "Not found" }]} />
        <ErrorState message="Could not load customer" onRetry={fetchData} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Customers", href: "/customers" }, { label: customer.name }]} />

      <PageHeader title={customer.name}>
        {customer.totalDue > 0 && (
          <Button onClick={() => setPaymentOpen(true)} className="gap-1.5">
            <CreditCard className="size-4" />
            Record Payment
          </Button>
        )}
        <Button variant="outline" onClick={() => setEditOpen(true)} className="gap-1.5">
          <Pencil className="size-4" />
          Edit
        </Button>
      </PageHeader>

      {/* Info & Financial Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <PhoneIcon className="size-4 text-muted-foreground shrink-0" />
              <a href={`tel:${customer.phone}`} className="font-medium text-primary hover:underline">
                {customer.phone}
              </a>
            </div>
            {customer.address && (
              <div className="flex items-start gap-2">
                <MapPin className="size-4 text-muted-foreground shrink-0 mt-0.5" />
                <span className="text-sm">{customer.address}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Financial Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {customer.initialBalance > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Opening Balance</span>
                <MoneyDisplay amount={customer.initialBalance} />
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Purchase</span>
              <MoneyDisplay amount={customer.totalPurchase} />
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Paid</span>
              <MoneyDisplay amount={customer.totalPaid} variant="paid" />
            </div>
            <Separator />
            <div className="flex justify-between items-center">
              <span className="font-semibold">Outstanding Due</span>
              <MoneyDisplay
                amount={customer.totalDue}
                variant={customer.totalDue > 0 ? "due" : "paid"}
                showIcon
                className="text-lg font-bold"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment History */}
      {payments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Payment History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {payments.slice(0, 10).map((p) => (
                <div key={p._id} className="flex items-center justify-between text-sm border-b pb-2 last:border-0">
                  <div className="space-y-0.5">
                    <div className="font-medium">
                      <MoneyDisplay amount={p.amount} variant="paid" showIcon />
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(p.date), "dd MMM yyyy")} &middot; {p.type === "self" ? "UPI/Phone" : p.type === "shop" ? "Bank" : "Cash"}
                      {p.note && ` &middot; ${p.note}`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sales History */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="text-lg">Sales History</CardTitle>
            <div className="flex gap-2">
              <Input
                placeholder="Search bills..."
                value={billSearch}
                onChange={(e) => setBillSearch(e.target.value)}
                className="w-40"
                aria-label="Search bills"
              />
              <Select value={sort} onValueChange={(v) => v && setSort(v)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="latest">Latest</SelectItem>
                  <SelectItem value="oldest">Oldest</SelectItem>
                  <SelectItem value="highestAmount">Highest Amount</SelectItem>
                  <SelectItem value="highestDue">Highest Due</SelectItem>
                  <SelectItem value="paid">Paid Bills</SelectItem>
                  <SelectItem value="unpaid">Unpaid Bills</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div aria-live="polite">
            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bill No.</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Goods Total</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bills.length > 0 ? (
                    bills.map((bill) => (
                      <TableRow
                        key={bill._id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => router.push(`/bills/${bill._id}`)}
                        tabIndex={0}
                        role="link"
                        onKeyDown={(e) => handleRowNav(e, bill._id)}
                      >
                        <TableCell className="font-medium">{bill.billNumber}</TableCell>
                        <TableCell>{format(new Date(bill.date), "dd/MM/yyyy")}</TableCell>
                        <TableCell className="text-right">
                          <MoneyDisplay amount={bill.goodsTotal} />
                        </TableCell>
                        <TableCell className="text-right">
                          <MoneyDisplay amount={bill.payment.totalPaid} variant="paid" />
                        </TableCell>
                        <TableCell className="text-right">
                          {bill.dueAmount > 0 ? (
                            <MoneyDisplay amount={bill.dueAmount} variant="due" showIcon />
                          ) : (
                            <StatusBadge status="paid" />
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5}>
                        <EmptyState icon={FileText} title="No bills found" description="No matching bills for this customer" />
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Mobile card layout */}
            <div className="sm:hidden space-y-2">
              {bills.length > 0 ? (
                bills.map((bill) => (
                  <div
                    key={bill._id}
                    className="rounded-lg border p-3 space-y-2 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => router.push(`/bills/${bill._id}`)}
                    tabIndex={0}
                    role="link"
                    onKeyDown={(e) => handleRowNav(e, bill._id)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{bill.billNumber}</span>
                      <StatusBadge status={getPaymentStatus(bill.payment.totalPaid, bill.grandTotal)} />
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{format(new Date(bill.date), "dd MMM yyyy")}</span>
                      <MoneyDisplay amount={bill.goodsTotal} className="text-sm" />
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState icon={FileText} title="No bills found" />
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <RecordPaymentDialog
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        customerId={customer._id}
        customerName={customer.name}
        totalDue={customer.totalDue}
        onSuccess={() => { fetchData(); toast.success("Payment recorded"); }}
      />

      <EditCustomerDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        customer={customer}
        onSuccess={() => { fetchData(); toast.success("Customer updated"); }}
      />
    </div>
  );
}
