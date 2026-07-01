import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Bill from "@/lib/models/Bill";
import Customer from "@/lib/models/Customer";
import { getNextBillNumber } from "@/lib/models/Counter";

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
      filter.$or = [
        { billNumber: { $regex: search, $options: "i" } },
        { customerName: { $regex: search, $options: "i" } },
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

    // Find or create customer
    let customer = await Customer.findOne({ phone: customerPhone, deletedAt: null });

    if (!customer) {
      customer = await Customer.create({
        name: customerName,
        phone: customerPhone,
        address: customerAddress || "",
      });
    }

    // Calculate totals
    const goodsTotal = items.reduce((sum: number, item: { amount: number }) => sum + item.amount, 0);
    const finalOldBalance = oldBalance || 0;
    const grandTotal = goodsTotal + finalOldBalance;

    const cashPaid = payment?.cash || 0;
    const selfPaid = payment?.self || 0;
    const shopPaid = payment?.shop || 0;
    const totalPaid = cashPaid + selfPaid + shopPaid;
    const dueAmount = grandTotal - totalPaid;

    // Generate bill number
    const billNumber = await getNextBillNumber();

    // Create bill
    const bill = await Bill.create({
      billNumber,
      date: new Date(),
      customerId: customer._id,
      customerName: customer.name,
      customerPhone: customer.phone,
      items: items.map((item: { description: string; quantity: number; rate: number }, index: number) => ({
        sNo: index + 1,
        description: item.description,
        quantity: item.quantity,
        rate: item.rate,
        amount: item.quantity * item.rate,
      })),
      goodsTotal,
      oldBalance: finalOldBalance,
      grandTotal,
      payment: { cash: cashPaid, self: selfPaid, shop: shopPaid, totalPaid },
      dueAmount,
    });

    // Update customer financials
    customer.totalPurchase += goodsTotal;
    customer.totalPaid += totalPaid;
    customer.totalDue = customer.totalPurchase - customer.totalPaid;
    await customer.save();

    return NextResponse.json(bill, { status: 201 });
  } catch (error) {
    console.error("Bills POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
