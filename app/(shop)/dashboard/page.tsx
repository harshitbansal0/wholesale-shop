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
import { CalendarDays, IndianRupee } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { RecordPaymentDialog } from "@/components/record-payment-dialog";
import { formatCurrency } from "@/lib/utils";

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
  const router = useRouter();

  const [salesPage, setSalesPage] = useState(1);

  const [paymentTarget, setPaymentTarget] = useState<{
    customerId: string;
    customerName: string;
    dueAmount: number;
  } | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
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
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
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

  return (
    <div className="space-y-6">
      {/* Header with date picker */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>

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
      </div>

      <p className="text-sm text-muted-foreground -mt-3">
        {formatDateLabel(dateRange.from, dateRange.to)}
      </p>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Sales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">
              {formatCurrency(data?.summary.totalSales || 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Amount Received
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 tabular-nums">
              {formatCurrency(data?.summary.totalReceived || 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Outstanding Due
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600 tabular-nums">
              {formatCurrency(data?.summary.totalDue || 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              All Customers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">
              {data?.summary.totalCustomers || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sales Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Sales Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            {data?.chartData && data.chartData.length > 0 ? (
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
      <Card>
        <CardHeader>
          <CardTitle>Sales</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
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
                {data?.recentSales && data.recentSales.length > 0 ? (
                  data.recentSales.map((sale) => (
                    <TableRow
                      key={sale._id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => router.push(`/bills/${sale._id}`)}
                    >
                      <TableCell className="font-medium">{sale.billNumber}</TableCell>
                      <TableCell>{format(new Date(sale.date), "dd/MM/yyyy")}</TableCell>
                      <TableCell>{sale.customerName}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCurrency(sale.goodsTotal)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCurrency(sale.payment.totalPaid)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {sale.dueAmount > 0 ? (
                          <span className="text-red-600">{formatCurrency(sale.dueAmount)}</span>
                        ) : (
                          <span className="text-green-600">Paid</span>
                        )}
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
          {data?.pagination && data.pagination.pages > 1 && (
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
