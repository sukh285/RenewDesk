// POST /api/auth/login
// Server-side credential check and session creation

import { NextRequest, NextResponse } from "next/server";
import { getSession, validateCredentials } from "@/lib/auth/session";

export async function POST(req: NextRequest) {
  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const rawUser = body.username ?? body.email;
    const username = typeof rawUser === "string" ? rawUser.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!username || !password) {
      return NextResponse.json(
        { error: "Email/username and password are required" },
        { status: 400 }
      );
    }

    if (!validateCredentials(username, password)) {
      return NextResponse.json(
        { error: "Invalid credentials. Use demo@renewdesk.app / RenewDesk2026!" },
        { status: 401 }
      );
    }

    const session = await getSession();
    session.isLoggedIn = true;
    session.username = username;
    await session.save();

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Login route error:", err);
    return NextResponse.json(
      { error: "Login failed. Please try again." },
      { status: 500 }
    );
  }
}
