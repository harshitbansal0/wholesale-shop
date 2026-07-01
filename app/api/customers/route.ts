import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Customer from "@/lib/models/Customer";

export async function GET(request: Request) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const sort = searchParams.get("sort") || "recent";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const filter: Record<string, unknown> = { deletedAt: null };

    if (search) {
      const isPhone = /^\d+$/.test(search);
      if (isPhone) {
        filter.phone = { $regex: search, $options: "i" };
      } else {
        filter.name = { $regex: search, $options: "i" };
      }
    }

    let sortOption: Record<string, 1 | -1> = { createdAt: -1 };
    switch (sort) {
      case "recent":
        sortOption = { createdAt: -1 };
        break;
      case "highestDue":
        sortOption = { totalDue: -1 };
        break;
      case "highestPaid":
        sortOption = { totalPaid: -1 };
        break;
    }

    const total = await Customer.countDocuments(filter);
    const customers = await Customer.find(filter)
      .sort(sortOption)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return NextResponse.json({
      customers,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Customers GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect();

    const body = await request.json();
    const { name, phone, address } = body;

    if (!name || !phone) {
      return NextResponse.json({ error: "Name and phone are required" }, { status: 400 });
    }

    const existing = await Customer.findOne({ phone, deletedAt: null });
    if (existing) {
      return NextResponse.json({ error: "Customer with this phone already exists" }, { status: 409 });
    }

    const customer = await Customer.create({ name, phone, address: address || "" });
    return NextResponse.json(customer, { status: 201 });
  } catch (error) {
    console.error("Customers POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
