import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Bill from "@/lib/models/Bill";
import Customer from "@/lib/models/Customer";
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";

export async function GET(request: Request) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "month";
    const customStart = searchParams.get("startDate");
    const customEnd = searchParams.get("endDate");

    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    if (customStart && customEnd) {
      startDate = new Date(customStart + "T00:00:00.000Z");
      endDate = new Date(customEnd + "T23:59:59.999Z");
    } else {
      switch (period) {
        case "today":
          startDate = startOfDay(now);
          endDate = endOfDay(now);
          break;
        case "week":
          startDate = startOfWeek(now, { weekStartsOn: 1 });
          endDate = endOfWeek(now, { weekStartsOn: 1 });
          break;
        case "month":
          startDate = startOfMonth(now);
          endDate = endOfMonth(now);
          break;
        case "year":
          startDate = startOfYear(now);
          endDate = endOfYear(now);
          break;
        default:
          startDate = startOfMonth(now);
          endDate = endOfMonth(now);
      }
    }

    const dateFilter = { deletedAt: null, date: { $gte: startDate, $lte: endDate } };

    const salesInPeriod = await Bill.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
          totalSales: { $sum: "$grandTotal" },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const totals = await Bill.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: null,
          totalSales: { $sum: "$grandTotal" },
          totalReceived: { $sum: "$payment.totalPaid" },
          totalDue: { $sum: "$dueAmount" },
        },
      },
    ]);

    const totalCustomers = await Customer.countDocuments({ deletedAt: null });

    const recentSales = await Bill.find(dateFilter)
      .sort({ date: -1, createdAt: -1 })
      .limit(20)
      .select("billNumber date customerId customerName grandTotal payment.totalPaid dueAmount")
      .lean();

    const summary = totals[0] || { totalSales: 0, totalReceived: 0, totalDue: 0 };

    return NextResponse.json({
      chartData: salesInPeriod,
      summary: {
        totalSales: summary.totalSales,
        totalReceived: summary.totalReceived,
        totalDue: summary.totalDue,
        totalCustomers,
      },
      recentSales,
    });
  } catch (error) {
    console.error("Dashboard API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
