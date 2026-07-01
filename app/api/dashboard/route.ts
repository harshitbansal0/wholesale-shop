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

    const now = new Date();
    let startDate: Date;
    let endDate: Date;

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

    // Sales in period
    const salesInPeriod = await Bill.aggregate([
      {
        $match: {
          deletedAt: null,
          date: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
          totalSales: { $sum: "$grandTotal" },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Summary totals
    const totals = await Bill.aggregate([
      { $match: { deletedAt: null } },
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

    // Recent sales (last 10)
    const recentSales = await Bill.find({ deletedAt: null })
      .sort({ date: -1, createdAt: -1 })
      .limit(10)
      .select("billNumber date customerName grandTotal payment.totalPaid dueAmount")
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
