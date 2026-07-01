import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Bill from "@/lib/models/Bill";
import Customer from "@/lib/models/Customer";
import PaymentRecord from "@/lib/models/PaymentRecord";
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";

export async function GET(request: Request) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "month";
    const customStart = searchParams.get("startDate");
    const customEnd = searchParams.get("endDate");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    if (customStart && customEnd) {
      startDate = startOfDay(new Date(customStart));
      endDate = endOfDay(new Date(customEnd));
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
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$date", timezone: "Asia/Kolkata" } },
          totalSales: { $sum: "$goodsTotal" },
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
          totalSales: { $sum: "$goodsTotal" },
          totalReceived: { $sum: "$payment.totalPaid" },
          totalDue: { $sum: { $subtract: ["$goodsTotal", "$payment.totalPaid"] } },
        },
      },
    ]);

    const standalonePayments = await PaymentRecord.aggregate([
      { $match: { date: { $gte: startDate, $lte: endDate } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const standalonePaid = standalonePayments[0]?.total || 0;

    const totalCustomers = await Customer.countDocuments({ deletedAt: null });

    const totalBills = await Bill.countDocuments(dateFilter);
    const recentSales = await Bill.find(dateFilter)
      .sort({ date: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select("billNumber date customerId customerName grandTotal goodsTotal payment.totalPaid dueAmount")
      .lean();

    const summary = totals[0] || { totalSales: 0, totalReceived: 0, totalDue: 0 };

    return NextResponse.json({
      chartData: salesInPeriod,
      summary: {
        totalSales: summary.totalSales,
        totalReceived: summary.totalReceived + standalonePaid,
        totalDue: Math.max(0, summary.totalDue - standalonePaid),
        totalCustomers,
      },
      recentSales,
      pagination: { page, limit, total: totalBills, pages: Math.ceil(totalBills / limit) },
    });
  } catch (error) {
    console.error("Dashboard API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
