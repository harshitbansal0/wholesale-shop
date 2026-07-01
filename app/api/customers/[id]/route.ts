import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Customer from "@/lib/models/Customer";
import Bill from "@/lib/models/Bill";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;

    const customer = await Customer.findOne({ _id: id, deletedAt: null }).lean();
    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const sort = searchParams.get("sort") || "latest";
    const billSearch = searchParams.get("billSearch") || "";

    let billSort: Record<string, 1 | -1> = { date: -1 };
    const billFilter: Record<string, unknown> = { customerId: id, deletedAt: null };

    switch (sort) {
      case "latest": billSort = { date: -1 }; break;
      case "oldest": billSort = { date: 1 }; break;
      case "highestAmount": billSort = { grandTotal: -1 }; break;
      case "highestDue": billSort = { dueAmount: -1 }; break;
      case "paid": billFilter.dueAmount = 0; break;
      case "unpaid": billFilter.dueAmount = { $gt: 0 }; break;
    }

    if (billSearch) {
      billFilter.$or = [
        { billNumber: { $regex: billSearch, $options: "i" } },
        { date: { $regex: billSearch, $options: "i" } },
      ];
    }

    const bills = await Bill.find(billFilter).sort(billSort).lean();

    return NextResponse.json({ customer, bills });
  } catch (error) {
    console.error("Customer GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;
    const body = await request.json();

    const customer = await Customer.findOneAndUpdate(
      { _id: id, deletedAt: null },
      { $set: { name: body.name, phone: body.phone, address: body.address } },
      { new: true }
    );

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    return NextResponse.json(customer);
  } catch (error) {
    console.error("Customer PUT error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;

    const customer = await Customer.findOneAndUpdate(
      { _id: id, deletedAt: null },
      { $set: { deletedAt: new Date() } },
      { new: true }
    );

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Customer deleted" });
  } catch (error) {
    console.error("Customer DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
