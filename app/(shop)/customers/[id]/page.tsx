"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { formatCurrency } from "@/lib/utils";

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

export default function CustomerProfilePage() {
  const { id } = useParams();
  const router = useRouter();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [bills, setBills] = useState<Bill[]>([]);
  const [sort, setSort] = useState("latest");
  const [billSearch, setBillSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [paymentOpen, setPaymentOpen] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/customers/${id}?sort=${sort}&billSearch=${encodeURIComponent(billSearch)}`
      );
      const json = await res.json();
      setCustomer(json.customer);
      setBills(json.bills || []);
    } catch (error) {
      console.error("Failed to fetch customer:", error);
    }
    setLoading(false);
  }, [id, sort, billSearch]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading && !customer) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  if (!customer) {
    return <div className="text-center py-8">Customer not found</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{customer.name}</h1>
        <Button variant="outline" onClick={() => router.back()}>
          Back
        </Button>
      </div>

      {/* Basic Info & Financial Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <span className="text-sm text-muted-foreground">Name: </span>
              <span className="font-medium">{customer.name}</span>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Phone: </span>
              <span className="font-medium">{customer.phone}</span>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Address: </span>
              <span className="font-medium">{customer.address || "N/A"}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Financial Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {customer.initialBalance > 0 && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Old Balance (Initial)</span>
                <span className="font-medium">{formatCurrency(customer.initialBalance)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Total Purchase</span>
              <span className="font-medium">{formatCurrency(customer.totalPurchase)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Total Paid</span>
              <span className="font-medium text-green-600">
                {formatCurrency(customer.totalPaid)}
              </span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-sm font-medium">Outstanding Due</span>
              <span className={`font-bold ${customer.totalDue > 0 ? "text-red-600" : "text-green-600"}`}>
                {formatCurrency(customer.totalDue)}
              </span>
            </div>
            <Button className="w-full mt-2" disabled={customer.totalDue <= 0} onClick={() => setPaymentOpen(true)}>
              Record Payment
            </Button>
            <RecordPaymentDialog
              open={paymentOpen}
              onOpenChange={setPaymentOpen}
              customerId={customer._id}
              customerName={customer.name}
              totalDue={customer.totalDue}
              onSuccess={fetchData}
            />
          </CardContent>
        </Card>
      </div>

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
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bill No.</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Goods Total</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Due</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bills.length > 0 ? (
                  bills.map((bill) => (
                    <TableRow
                      key={bill._id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => router.push(`/bills/${bill._id}`)}
                    >
                      <TableCell className="font-medium">{bill.billNumber}</TableCell>
                      <TableCell>{format(new Date(bill.date), "dd/MM/yyyy")}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(bill.goodsTotal)}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {bill.payment.cash > 0 && (
                            <Badge variant="outline" className="text-xs">
                              Cash: {formatCurrency(bill.payment.cash)}
                            </Badge>
                          )}
                          {bill.payment.self > 0 && (
                            <Badge variant="outline" className="text-xs">
                              Self: {formatCurrency(bill.payment.self)}
                            </Badge>
                          )}
                          {bill.payment.shop > 0 && (
                            <Badge variant="outline" className="text-xs">
                              Shop: {formatCurrency(bill.payment.shop)}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(bill.payment.totalPaid)}
                      </TableCell>
                      <TableCell className="text-right">
                        {bill.dueAmount > 0 ? (
                          <span className="text-red-600">{formatCurrency(bill.dueAmount)}</span>
                        ) : (
                          <span className="text-green-600">Paid</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No bills found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
