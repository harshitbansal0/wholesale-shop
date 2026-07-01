import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Bill from "@/lib/models/Bill";
import Customer from "@/lib/models/Customer";
import { getNextBillNumber } from "@/lib/models/Counter";
import { recalculateCustomerFinancials } from "@/lib/recalculate";
import { roundMoney, escapeRegex } from "@/lib/utils";

export async function GET(request: Request) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const filter: Record<string, unknown> = { deletedAt: null };

    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      filter.date = { $gte: start, $lte: end };
    }

    if (search) {
      const escaped = escapeRegex(search);
      filter.$or = [
        { billNumber: { $regex: escaped, $options: "i" } },
        { customerName: { $regex: escaped, $options: "i" } },
      ];
    }

    const total = await Bill.countDocuments(filter);
    const bills = await Bill.find(filter)
      .sort({ date: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return NextResponse.json({
      bills,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Bills GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect();

    const body = await request.json();
    const { customerName, customerPhone, customerAddress, items, oldBalance, payment } = body;

    if (!customerName || !customerPhone || !items || items.length === 0) {
      return NextResponse.json({ error: "Customer info and items are required" }, { status: 400 });
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

    let customer = await Customer.findOne({ phone: customerPhone, deletedAt: null });

    if (!customer) {
      customer = await Customer.create({
        name: customerName,
        phone: customerPhone,
        address: customerAddress || "",
      });
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

    const billNumber = await getNextBillNumber();

    const bill = await Bill.create({
      billNumber,
      date: new Date(),
      customerId: customer._id,
      customerName: customer.name,
      customerPhone: customer.phone,
      items: processedItems,
      goodsTotal,
      oldBalance: finalOldBalance,
      grandTotal,
      payment: { cash: cashPaid, self: selfPaid, shop: shopPaid, totalPaid },
      dueAmount,
    });

    const existingBillCount = await Bill.countDocuments({ customerId: customer._id, deletedAt: null });
    if (existingBillCount === 1 && finalOldBalance > 0 && customer.initialBalance === 0) {
      customer.initialBalance = finalOldBalance;
      await customer.save();
    }

    await recalculateCustomerFinancials(customer._id.toString());

    return NextResponse.json(bill, { status: 201 });
  } catch (error) {
    console.error("Bills POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
