import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Customer from "@/lib/models/Customer";
import PaymentRecord from "@/lib/models/PaymentRecord";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;
    const body = await request.json();

    const { amount, type, note } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Valid amount is required" }, { status: 400 });
    }

    if (!["cash", "self", "shop"].includes(type)) {
      return NextResponse.json({ error: "Invalid payment type" }, { status: 400 });
    }

    const customer = await Customer.findOne({ _id: id, deletedAt: null });
    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    // Create payment record
    await PaymentRecord.create({
      customerId: id,
      amount,
      type,
      date: new Date(),
      note: note || "",
    });

    customer.totalPaid += amount;
    customer.totalDue = customer.initialBalance + customer.totalPurchase - customer.totalPaid;
    await customer.save();

    return NextResponse.json({ message: "Payment recorded", customer });
  } catch (error) {
    console.error("Payment POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;

    const payments = await PaymentRecord.find({ customerId: id })
      .sort({ date: -1 })
      .lean();

    return NextResponse.json(payments);
  } catch (error) {
    console.error("Payments GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
