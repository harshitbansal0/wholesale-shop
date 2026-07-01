import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import Customer from "@/lib/models/Customer";
import PaymentRecord from "@/lib/models/PaymentRecord";
import { recalculateCustomerFinancials } from "@/lib/recalculate";
import { roundMoney, formatCurrency } from "@/lib/utils";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid customer ID" }, { status: 400 });
    }

    const body = await request.json();
    const { amount, type, note } = body;

    if (typeof amount !== "number" || isNaN(amount)) {
      return NextResponse.json({ error: "Amount must be a valid number" }, { status: 400 });
    }

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

    const roundedAmount = roundMoney(amount);

    if (roundedAmount > customer.totalDue) {
      return NextResponse.json(
        { error: `Amount exceeds outstanding due of ${formatCurrency(customer.totalDue)}` },
        { status: 400 }
      );
    }

    await PaymentRecord.create({
      customerId: id,
      amount: roundedAmount,
      type,
      date: new Date(),
      note: note || "",
    });

    await recalculateCustomerFinancials(id);
    const updatedCustomer = await Customer.findById(id).lean();

    return NextResponse.json({ message: "Payment recorded", customer: updatedCustomer });
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

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid customer ID" }, { status: 400 });
    }

    const payments = await PaymentRecord.find({ customerId: id })
      .sort({ date: -1 })
      .lean();

    return NextResponse.json({ payments });
  } catch (error) {
    console.error("Payments GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
