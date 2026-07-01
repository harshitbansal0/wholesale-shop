import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import dbConnect from "@/lib/db";
import Admin from "@/lib/models/Admin";

export async function POST(request: Request) {
  try {
    const { username, password, setupKey } = await request.json();

    const expectedKey = process.env.ADMIN_SETUP_KEY;
    if (!expectedKey || setupKey !== expectedKey) {
      return NextResponse.json({ error: "Invalid setup key" }, { status: 403 });
    }

    if (!username || !password) {
      return NextResponse.json({ error: "Username and password required" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    await dbConnect();

    const existingAdmin = await Admin.findOne({});
    if (existingAdmin) {
      return NextResponse.json({ error: "Admin already exists" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await Admin.create({ username, passwordHash });

    return NextResponse.json({ message: "Admin created successfully" });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
