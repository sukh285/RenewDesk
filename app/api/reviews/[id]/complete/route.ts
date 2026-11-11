// POST /api/reviews/[id]/complete
// Explicit human-only action to mark a review as completed

import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { completeReview } from "@/lib/services/reviews";

interface Params {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    await requireSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  let body: { version: number; completion_note?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.version || typeof body.version !== "number") {
    return NextResponse.json({ error: "version is required" }, { status: 400 });
  }

  try {
    const completed = await completeReview(id, body.version, body.completion_note);
    return NextResponse.json({ ok: true, data: completed });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to complete review";
    const status = msg.includes("Stale") || msg.includes("already") ? 409 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

