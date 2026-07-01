"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Separator } from "@/components/ui/separator";
import { useRouter } from "next/navigation";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  format,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  isSameDay,
} from "date-fns";
import {
  CalendarDays,
  IndianRupee,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  FilePlus,
  Search,
} from "lucide-react";
import type { DateRange } from "react-day-picker";
import { RecordPaymentDialog } from "@/components/record-payment-dialog";
import { formatCurrency } from "@/lib/utils";
import { Skeleton, SkeletonCard, SkeletonChart, SkeletonTableRows } from "@/components/loading-skeleton";
import { PageHeader } from "@/components/page-header";
import { MoneyDisplay } from "@/components/money-display";
import { StatusBadge, getPaymentStatus } from "@/components/status-badge";
import { ErrorState } from "@/components/error-state";

interface DashboardData {
  chartData: { _id: string; totalSales: number; count: number }[];
  summary: {
    totalSales: number;
    totalReceived: number;
    totalDue: number;
    totalCustomers: number;
  };
  recentSales: {
    _id: string;
    billNumber: string;
    date: string;
    customerId: string;
    customerName: string;
    grandTotal: number;
    goodsTotal: number;
    payment: { totalPaid: number };
    dueAmount: number;
  }[];
  pagination: { page: number; limit: number; total: number; pages: number };
}

const presets = [
  { key: "today", label: "Today" },
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
  { key: "year", label: "This Year" },
] as const;

type PresetKey = (typeof presets)[number]["key"];

function getPresetRange(key: PresetKey): { from: Date; to: Date } {
  const now = new Date();
  switch (key) {
    case "today":
      return { from: startOfDay(now), to: endOfDay(now) };
    case "week":
      return { from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }) };
    case "month":
      return { from: startOfMonth(now), to: endOfMonth(now) };
    case "year":
      return { from: startOfYear(now), to: endOfYear(now) };
  }
}

function formatDateLabel(from: Date, to: Date): string {
  if (isSameDay(from, to)) {
    return format(from, "dd MMM yyyy");
  }
  if (from.getFullYear() === to.getFullYear()) {
    return `${format(from, "dd MMM")} – ${format(to, "dd MMM yyyy")}`;
  }
  return `${format(from, "dd MMM yyyy")} – ${format(to, "dd MMM yyyy")}`;
}

export default function DashboardPage() {
  const now = new Date();
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: startOfMonth(now),
    to: endOfMonth(now),
  });
  const [activePreset, setActivePreset] = useState<PresetKey | null>("month");
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarRange, setCalendarRange] = useState<DateRange | undefined>(undefined);

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();

  const [salesPage, setSalesPage] = useState(1);

  const [paymentTarget, setPaymentTarget] = useState<{
    customerId: string;
    customerName: string;
    dueAmount: number;
  } | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const params = new URLSearchParams({
        startDate: format(dateRange.from, "yyyy-MM-dd"),
        endDate: format(dateRange.to, "yyyy-MM-dd"),
        page: salesPage.toString(),
        limit: "20",
      });
      const res = await fetch(`/api/dashboard?${params}`);
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error("Failed to fetch dashboard data:", err);
      setError(true);
    }
    setLoading(false);
  }, [dateRange, salesPage]);

  async function handlePayClick(sale: DashboardData["recentSales"][number]) {
    try {
      const res = await fetch(`/api/customers/${sale.customerId}`);
      const json = await res.json();
      setPaymentTarget({
        customerId: sale.customerId,
        customerName: sale.customerName,
        dueAmount: json.customer?.totalDue ?? sale.dueAmount,
      });
    } catch {
      setPaymentTarget({
        customerId: sale.customerId,
        customerName: sale.customerName,
        dueAmount: sale.dueAmount,
      });
    }
  }

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function selectPreset(key: PresetKey) {
    setActivePreset(key);
    setDateRange(getPresetRange(key));
    setSalesPage(1);
    setCalendarRange(undefined);
    setCalendarOpen(false);
  }

  function handleCalendarSelect(range: DateRange | undefined) {
    setCalendarRange(range);
    if (range?.from) {
      setActivePreset(null);
      const from = range.from;
      const to = range.to || range.from;
      setDateRange({ from, to });
      setSalesPage(1);
    }
  }

  const filteredSales = data?.recentSales?.filter((sale) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      sale.billNumber.toLowerCase().includes(q) ||
      sale.customerName.toLowerCase().includes(q)
    );
  });

  if (error) {
    return <ErrorState message="Failed to load dashboard data" onRetry={fetchData} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard">
        <div className="flex flex-wrap items-center gap-1.5">
          {presets.map((p) => (
            <Button
              key={p.key}
              variant={activePreset === p.key ? "default" : "outline"}
              size="sm"
              onClick={() => selectPreset(p.key)}
            >
              {p.label}
            </Button>
          ))}

          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger
              render={
                <Button
                  variant={activePreset === null ? "default" : "outline"}
                  size="sm"
                  className="gap-1.5"
                />
              }
            >
              <CalendarDays className="size-3.5" />
              {activePreset === null
                ? formatDateLabel(dateRange.from, dateRange.to)
                : "Custom"}
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <div className="p-3 pb-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                  Pick a date or range
                </p>
                <div className="flex flex-wrap gap-1">
                  {presets.map((p) => (
                    <Button
                      key={p.key}
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => selectPreset(p.key)}
                    >
                      {p.label}
                    </Button>
                  ))}
                </div>
              </div>
              <Separator />
              <Calendar
                mode="range"
                selected={calendarRange}
                onSelect={handleCalendarSelect}
                numberOfMonths={1}
                defaultMonth={dateRange.from}
                disabled={{ after: new Date() }}
              />
            </PopoverContent>
          </Popover>
        </div>
      </PageHeader>

      <p className="text-sm text-muted-foreground -mt-3">
        {formatDateLabel(dateRange.from, dateRange.to)}
      </p>

      <div aria-live="polite">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))
            : (
              <>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <DollarSign className="size-5 text-primary" />
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium text-muted-foreground">Total Sales</p>
                        <p className="text-2xl font-bold tabular-nums">
                          {formatCurrency(data?.summary.totalSales || 0)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-emerald-50/50 dark:bg-emerald-950/20">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
                        <TrendingUp className="size-5 text-emerald-600" />
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium text-muted-foreground">Amount Received</p>
                        <p className="text-2xl font-bold tabular-nums text-emerald-600">
                          {formatCurrency(data?.summary.totalReceived || 0)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-red-50/50 dark:bg-red-950/20">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40">
                        <TrendingDown className="size-5 text-red-600" />
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium text-muted-foreground">Outstanding Due</p>
                        <p className="text-2xl font-bold tabular-nums text-red-600">
                          {formatCurrency(data?.summary.totalDue || 0)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <Users className="size-5 text-primary" />
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium text-muted-foreground">Total Customers</p>
                        <p className="text-2xl font-bold tabular-nums">
                          {data?.summary.totalCustomers || 0}
                        </p>
                        <p className="text-xs text-muted-foreground">(all time)</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2 mt-6">
          <Button onClick={() => router.push("/bills/new")} className="gap-1.5">
            <FilePlus className="size-4" />
            Create Bill
          </Button>
          <Button variant="outline" onClick={() => router.push("/customers")} className="gap-1.5">
            <Users className="size-4" />
            View Customers
          </Button>
        </div>

        {/* Sales Chart */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Sales Analytics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {loading ? (
                <SkeletonChart />
              ) : data?.chartData && data.chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="_id"
                      tickFormatter={(val) => {
                        try {
                          return format(new Date(val), "dd MMM");
                        } catch {
                          return val;
                        }
                      }}
                    />
                    <YAxis tickFormatter={(val) => {
                      if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
                      if (val >= 1000) return `₹${(val / 1000).toFixed(0)}k`;
                      return `₹${val}`;
                    }} />
                    <Tooltip
                      formatter={(value) => [formatCurrency(Number(value)), "Sales"]}
                      labelFormatter={(label) => {
                        try {
                          return format(new Date(label), "dd MMM yyyy");
                        } catch {
                          return label;
                        }
                      }}
                    />
                    <Bar dataKey="totalSales" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No sales data for this period
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Sales Table */}
        <Card className="mt-6">
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle>Sales</CardTitle>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search bills or customers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-8 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Mobile card layout */}
            <div className="sm:hidden space-y-2">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="rounded-lg border p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-5 w-16" />
                    </div>
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-3 w-28" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                    <Skeleton className="h-4 w-24" />
                  </div>
                ))
              ) : filteredSales && filteredSales.length > 0 ? (
                filteredSales.map((sale) => (
                  <div
                    key={sale._id}
                    className="rounded-lg border p-3 space-y-2 cursor-pointer hover:bg-muted/50"
                    onClick={() => router.push(`/bills/${sale._id}`)}
                    tabIndex={0}
                    role="link"
                    onKeyDown={(e) => { if (e.key === "Enter") router.push(`/bills/${sale._id}`); }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{sale.billNumber}</span>
                      <StatusBadge status={getPaymentStatus(sale.payment.totalPaid, sale.grandTotal)} />
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{sale.customerName}</span>
                      <span className="text-muted-foreground">{format(new Date(sale.date), "dd/MM/yyyy")}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <MoneyDisplay amount={sale.goodsTotal} />
                      {sale.dueAmount > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 gap-1 text-xs"
                          onClick={(e) => { e.stopPropagation(); handlePayClick(sale); }}
                          aria-label={`Record payment for ${sale.customerName}`}
                        >
                          <IndianRupee className="size-3" />
                          Pay
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-8">No sales in this period</p>
              )}
            </div>

            {/* Desktop table layout */}
            <div className="hidden sm:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bill No.</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead className="text-right">Goods Total</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">Due</TableHead>
                    <TableHead className="w-16"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <SkeletonTableRows rows={5} cols={7} />
                  ) : filteredSales && filteredSales.length > 0 ? (
                    filteredSales.map((sale) => (
                      <TableRow
                        key={sale._id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => router.push(`/bills/${sale._id}`)}
                        tabIndex={0}
                        role="link"
                        onKeyDown={(e) => { if (e.key === "Enter") router.push(`/bills/${sale._id}`); }}
                      >
                        <TableCell className="font-medium">{sale.billNumber}</TableCell>
                        <TableCell>{format(new Date(sale.date), "dd/MM/yyyy")}</TableCell>
                        <TableCell>{sale.customerName}</TableCell>
                        <TableCell className="text-right">
                          <MoneyDisplay amount={sale.goodsTotal} />
                        </TableCell>
                        <TableCell className="text-right">
                          <MoneyDisplay amount={sale.payment.totalPaid} variant="paid" />
                        </TableCell>
                        <TableCell className="text-right">
                          <StatusBadge status={getPaymentStatus(sale.payment.totalPaid, sale.grandTotal)} />
                        </TableCell>
                        <TableCell>
                          {sale.dueAmount > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 gap-1 text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePayClick(sale);
                              }}
                              aria-label={`Record payment for ${sale.customerName}`}
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
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        No sales in this period
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {!loading && data?.pagination && data.pagination.pages > 1 && (
              <div className="flex items-center justify-between pt-4">
                <p className="text-sm text-muted-foreground">
                  Page {data.pagination.page} of {data.pagination.pages} ({data.pagination.total} bills)
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={salesPage <= 1}
                    onClick={() => setSalesPage((p) => p - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={salesPage >= data.pagination.pages}
                    onClick={() => setSalesPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {paymentTarget && (
        <RecordPaymentDialog
          open={!!paymentTarget}
          onOpenChange={(open) => !open && setPaymentTarget(null)}
          customerId={paymentTarget.customerId}
          customerName={paymentTarget.customerName}
          totalDue={paymentTarget.dueAmount}
          onSuccess={fetchData}
        />
      )}
    </div>
  );
}
