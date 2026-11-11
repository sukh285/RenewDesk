// GET /api/overview - returns overview statistics

import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { getOverviewStats } from "@/lib/services/subscriptions";

export async function GET() {
  try {
    await requireSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const stats = await getOverviewStats();
    return NextResponse.json({ ok: true, data: stats });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load overview" },
      { status: 500 }
    );
  }
}

