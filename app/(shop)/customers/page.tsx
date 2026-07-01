"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
import { PageHeader } from "@/components/page-header";
import { MoneyDisplay } from "@/components/money-display";
import { StatusBadge, getPaymentStatus } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { Skeleton } from "@/components/loading-skeleton";
import { IndianRupee, UserPlus, Users, Download } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";

interface Customer {
  _id: string;
  name: string;
  phone: string;
  totalPurchase: number;
  totalPaid: number;
  totalDue: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("recent");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const router = useRouter();
  const [paymentTarget, setPaymentTarget] = useState<{
    id: string;
    name: string;
    totalDue: number;
  } | null>(null);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const params = new URLSearchParams({
        search,
        sort,
        page: page.toString(),
        limit: "20",
      });
      const res = await fetch(`/api/customers?${params}`);
      const json = await res.json();
      setCustomers(json.customers || []);
      setPagination(json.pagination || null);
    } catch {
      setError(true);
      toast.error("Failed to load customers");
    }
    setLoading(false);
  }, [search, sort, page]);

  useEffect(() => {
    const debounce = setTimeout(fetchCustomers, 300);
    return () => clearTimeout(debounce);
  }, [fetchCustomers]);

  function handleRowNav(e: React.KeyboardEvent, id: string) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      router.push(`/customers/${id}`);
    }
  }

  if (error && !loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Customers" />
        <ErrorState message="Failed to load customers" onRetry={fetchCustomers} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Customers">
        <Button onClick={() => router.push("/bills/new")} className="gap-1.5">
          <UserPlus className="size-4" />
          New Customer
        </Button>
      </PageHeader>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4">
            <Input
              placeholder="Search by name or phone..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="sm:max-w-xs"
              aria-label="Search customers"
            />
            <Select value={sort} onValueChange={(v) => { if (v) { setSort(v); setPage(1); } }}>
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
          <div aria-live="polite">
            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead className="text-right">Total Purchase</TableHead>
                    <TableHead className="text-right">Total Paid</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                    <TableHead className="w-16"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
                        <TableCell><Skeleton className="h-7 w-14" /></TableCell>
                      </TableRow>
                    ))
                  ) : customers.length > 0 ? (
                    customers.map((customer) => (
                      <TableRow
                        key={customer._id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => router.push(`/customers/${customer._id}`)}
                        tabIndex={0}
                        role="link"
                        onKeyDown={(e) => handleRowNav(e, customer._id)}
                      >
                        <TableCell className="font-medium">{customer.name}</TableCell>
                        <TableCell>{customer.phone}</TableCell>
                        <TableCell className="text-right">
                          <MoneyDisplay amount={customer.totalPurchase} />
                        </TableCell>
                        <TableCell className="text-right">
                          <MoneyDisplay amount={customer.totalPaid} variant="paid" />
                        </TableCell>
                        <TableCell className="text-right">
                          {customer.totalDue > 0 ? (
                            <div className="flex items-center justify-end gap-2">
                              <MoneyDisplay amount={customer.totalDue} variant="due" showIcon />
                            </div>
                          ) : (
                            <StatusBadge status="paid" />
                          )}
                        </TableCell>
                        <TableCell>
                          {customer.totalDue > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 gap-1 text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPaymentTarget({
                                  id: customer._id,
                                  name: customer.name,
                                  totalDue: customer.totalDue,
                                });
                              }}
                              aria-label={`Record payment for ${customer.name}`}
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
                      <TableCell colSpan={6}>
                        <EmptyState
                          icon={Users}
                          title="No customers found"
                          description={search ? "Try a different search term" : "Create your first bill to add a customer"}
                          action={!search ? { label: "Create Bill", href: "/bills/new" } : undefined}
                        />
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Mobile card layout */}
            <div className="sm:hidden space-y-2">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="rounded-lg border p-3 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                ))
              ) : customers.length > 0 ? (
                customers.map((customer) => (
                  <div
                    key={customer._id}
                    className="rounded-lg border p-3 space-y-2 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => router.push(`/customers/${customer._id}`)}
                    tabIndex={0}
                    role="link"
                    onKeyDown={(e) => handleRowNav(e, customer._id)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{customer.name}</span>
                      {customer.totalDue > 0 ? (
                        <StatusBadge status={getPaymentStatus(customer.totalPaid, customer.totalPurchase)} />
                      ) : (
                        <StatusBadge status="paid" />
                      )}
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{customer.phone}</span>
                      <MoneyDisplay amount={customer.totalPurchase} className="text-sm" />
                    </div>
                    {customer.totalDue > 0 && (
                      <div className="flex items-center justify-between pt-1 border-t">
                        <span className="text-xs text-muted-foreground">Due</span>
                        <div className="flex items-center gap-2">
                          <MoneyDisplay amount={customer.totalDue} variant="due" showIcon className="text-sm" />
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 gap-1 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPaymentTarget({
                                id: customer._id,
                                name: customer.name,
                                totalDue: customer.totalDue,
                              });
                            }}
                            aria-label={`Record payment for ${customer.name}`}
                          >
                            <IndianRupee className="size-3" />
                            Pay
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <EmptyState
                  icon={Users}
                  title="No customers found"
                  description={search ? "Try a different search term" : "Create your first bill to add a customer"}
                  action={!search ? { label: "Create Bill", href: "/bills/new" } : undefined}
                />
              )}
            </div>
          </div>

          {/* Pagination */}
          {!loading && pagination && pagination.pages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <p className="text-sm text-muted-foreground">
                Showing {((pagination.page - 1) * pagination.limit) + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} customers
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= pagination.pages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {paymentTarget && (
        <RecordPaymentDialog
          open={!!paymentTarget}
          onOpenChange={(open) => !open && setPaymentTarget(null)}
          customerId={paymentTarget.id}
          customerName={paymentTarget.name}
          totalDue={paymentTarget.totalDue}
          onSuccess={() => { fetchCustomers(); toast.success("Payment recorded"); }}
        />
      )}
    </div>
  );
}
