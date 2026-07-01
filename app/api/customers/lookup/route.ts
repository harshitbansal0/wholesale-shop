import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Customer from "@/lib/models/Customer";

export async function GET(request: Request) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const phone = searchParams.get("phone");

    if (!phone) {
      return NextResponse.json({ error: "Phone number required" }, { status: 400 });
    }

    const customer = await Customer.findOne({ phone, deletedAt: null }).lean();

    if (!customer) {
      return NextResponse.json({ found: false });
    }

    return NextResponse.json({ found: true, customer });
  } catch (error) {
    console.error("Customer lookup error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
