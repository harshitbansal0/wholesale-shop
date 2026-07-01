import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Bill from "@/lib/models/Bill";
import { recalculateCustomerFinancials } from "@/lib/recalculate";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;

    const bill = await Bill.findOne({ _id: id, deletedAt: null }).lean();
    if (!bill) {
      return NextResponse.json({ error: "Bill not found" }, { status: 404 });
    }

    return NextResponse.json(bill);
  } catch (error) {
    console.error("Bill GET error:", error);
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

    const existingBill = await Bill.findOne({ _id: id, deletedAt: null });
    if (!existingBill) {
      return NextResponse.json({ error: "Bill not found" }, { status: 404 });
    }

    const { items, oldBalance, payment } = body;

    // Calculate new totals
    const goodsTotal = items.reduce((sum: number, item: { amount: number }) => sum + item.amount, 0);
    const finalOldBalance = oldBalance || 0;
    const grandTotal = goodsTotal + finalOldBalance;

    const cashPaid = payment?.cash || 0;
    const selfPaid = payment?.self || 0;
    const shopPaid = payment?.shop || 0;
    const totalPaid = cashPaid + selfPaid + shopPaid;
    const dueAmount = grandTotal - totalPaid;

    existingBill.items = items.map((item: { description: string; quantity: number; rate: number }, index: number) => ({
      sNo: index + 1,
      description: item.description,
      quantity: item.quantity,
      rate: item.rate,
      amount: item.quantity * item.rate,
    }));
    existingBill.goodsTotal = goodsTotal;
    existingBill.oldBalance = finalOldBalance;
    existingBill.grandTotal = grandTotal;
    existingBill.payment = { cash: cashPaid, self: selfPaid, shop: shopPaid, totalPaid };
    existingBill.dueAmount = dueAmount;
    await existingBill.save();

    await recalculateCustomerFinancials(existingBill.customerId.toString());

    return NextResponse.json(existingBill);
  } catch (error) {
    console.error("Bill PUT error:", error);
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

    const bill = await Bill.findOne({ _id: id, deletedAt: null });
    if (!bill) {
      return NextResponse.json({ error: "Bill not found" }, { status: 404 });
    }

    bill.deletedAt = new Date();
    await bill.save();

    await recalculateCustomerFinancials(bill.customerId.toString());

    return NextResponse.json({ message: "Bill deleted" });
  } catch (error) {
    console.error("Bill DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
