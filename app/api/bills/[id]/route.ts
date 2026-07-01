import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import Bill from "@/lib/models/Bill";
import { recalculateCustomerFinancials } from "@/lib/recalculate";
import { roundMoney } from "@/lib/utils";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid bill ID" }, { status: 400 });
    }

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

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid bill ID" }, { status: 400 });
    }

    const body = await request.json();

    const existingBill = await Bill.findOne({ _id: id, deletedAt: null });
    if (!existingBill) {
      return NextResponse.json({ error: "Bill not found" }, { status: 404 });
    }

    const { items, oldBalance, payment } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "At least one item is required" }, { status: 400 });
    }

    for (const item of items) {
      if (typeof item.quantity !== "number" || typeof item.rate !== "number" ||
          isNaN(item.quantity) || isNaN(item.rate)) {
        return NextResponse.json(
          { error: "Item quantity and rate must be valid numbers" },
          { status: 400 }
        );
      }
      if (item.quantity <= 0 || item.rate < 0) {
        return NextResponse.json(
          { error: "Item quantity must be positive and rate must be non-negative" },
          { status: 400 }
        );
      }
    }

    const processedItems = items.map(
      (item: { description: string; quantity: number; rate: number }, index: number) => ({
        sNo: index + 1,
        description: item.description,
        quantity: item.quantity,
        rate: item.rate,
        amount: roundMoney(item.quantity * item.rate),
      })
    );

    const goodsTotal = roundMoney(processedItems.reduce((sum: number, item: { amount: number }) => sum + item.amount, 0));
    const finalOldBalance = oldBalance || 0;

    if (typeof finalOldBalance !== "number" || isNaN(finalOldBalance)) {
      return NextResponse.json({ error: "Old balance must be a valid number" }, { status: 400 });
    }

    if (finalOldBalance < 0) {
      return NextResponse.json({ error: "Old balance cannot be negative" }, { status: 400 });
    }

    const grandTotal = roundMoney(goodsTotal + finalOldBalance);

    const cashPaid = payment?.cash || 0;
    const selfPaid = payment?.self || 0;
    const shopPaid = payment?.shop || 0;

    if (typeof cashPaid !== "number" || isNaN(cashPaid) ||
        typeof selfPaid !== "number" || isNaN(selfPaid) ||
        typeof shopPaid !== "number" || isNaN(shopPaid)) {
      return NextResponse.json({ error: "Payment amounts must be valid numbers" }, { status: 400 });
    }

    if (cashPaid < 0 || selfPaid < 0 || shopPaid < 0) {
      return NextResponse.json({ error: "Payment amounts cannot be negative" }, { status: 400 });
    }

    const totalPaid = roundMoney(cashPaid + selfPaid + shopPaid);
    const dueAmount = Math.max(0, roundMoney(grandTotal - totalPaid));

    existingBill.items = processedItems;
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

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid bill ID" }, { status: 400 });
    }

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
