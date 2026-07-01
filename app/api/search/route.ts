import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Bill from "@/lib/models/Bill";
import Customer from "@/lib/models/Customer";
import { escapeRegex } from "@/lib/utils";

export async function GET(request: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim();

    if (!q || q.length < 2) {
      return NextResponse.json({ customers: [], bills: [] });
    }

    const regex = new RegExp(escapeRegex(q), "i");

    const [customers, bills] = await Promise.all([
      Customer.find({
        deletedAt: null,
        $or: [{ name: regex }, { phone: regex }],
      })
        .limit(5)
        .select("name phone totalDue")
        .lean(),
      Bill.find({
        deletedAt: null,
        $or: [{ billNumber: regex }, { customerName: regex }],
      })
        .sort({ date: -1 })
        .limit(5)
        .select("billNumber customerName date grandTotal dueAmount")
        .lean(),
    ]);

    return NextResponse.json({ customers, bills });
  } catch (error) {
    console.error("Search API error:", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
