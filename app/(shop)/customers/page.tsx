"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
import { RecordPaymentDialog } from "@/components/record-payment-dialog";
import { IndianRupee } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface Customer {
  _id: string;
  name: string;
  phone: string;
  totalPurchase: number;
  totalPaid: number;
  totalDue: number;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("recent");
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const [paymentTarget, setPaymentTarget] = useState<{
    id: string;
    name: string;
    totalDue: number;
  } | null>(null);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/customers?search=${encodeURIComponent(search)}&sort=${sort}`);
      const json = await res.json();
      setCustomers(json.customers || []);
    } catch (error) {
      console.error("Failed to fetch customers:", error);
    }
    setLoading(false);
  }, [search, sort]);

  useEffect(() => {
    const debounce = setTimeout(fetchCustomers, 300);
    return () => clearTimeout(debounce);
  }, [fetchCustomers]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Customers</h1>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4">
            <Input
              placeholder="Search by name or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="sm:max-w-xs"
            />
            <Select value={sort} onValueChange={(v) => v && setSort(v)}>
              <SelectTrigger className="sm:w-48">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Recent Customers</SelectItem>
                <SelectItem value="highestDue">Highest Due</SelectItem>
                <SelectItem value="highestPaid">Highest Paid</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead className="text-right">Total Purchase</TableHead>
                  <TableHead className="text-right">Total Paid</TableHead>
                  <TableHead className="text-right">Total Due</TableHead>
                  <TableHead className="w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : customers.length > 0 ? (
                  customers.map((customer) => (
                    <TableRow
                      key={customer._id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => router.push(`/customers/${customer._id}`)}
                    >
                      <TableCell className="font-medium">{customer.name}</TableCell>
                      <TableCell>{customer.phone}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(customer.totalPurchase)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(customer.totalPaid)}
                      </TableCell>
                      <TableCell className="text-right">
                        {customer.totalDue > 0 ? (
                          <span className="text-red-600">{formatCurrency(customer.totalDue)}</span>
                        ) : (
                          <span className="text-green-600">{formatCurrency(0)}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {customer.totalDue > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 gap-1 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPaymentTarget({
                                id: customer._id,
                                name: customer.name,
                                totalDue: customer.totalDue,
                              });
                            }}
                          >
                            <IndianRupee className="size-3" />
                            Pay
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No customers found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {paymentTarget && (
        <RecordPaymentDialog
          open={!!paymentTarget}
          onOpenChange={(open) => !open && setPaymentTarget(null)}
          customerId={paymentTarget.id}
          customerName={paymentTarget.name}
          totalDue={paymentTarget.totalDue}
          onSuccess={fetchCustomers}
        />
      )}
    </div>
  );
}
