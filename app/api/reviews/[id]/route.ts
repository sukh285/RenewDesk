// PATCH /api/reviews/[id] - update a review
// POST /api/reviews/[id]/complete - complete a review (human action only)

import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { getReview, updateReview, completeReview } from "@/lib/services/reviews";
import { updateReviewSchema } from "@/lib/validation";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    await requireSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const review = await getReview(id);
  if (!review) {
    return NextResponse.json({ error: "Review not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, data: review });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    await requireSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = updateReviewSchema.safeParse({
    ...(typeof body === "object" && body !== null ? body : {}),
    id,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  try {
    const updated = await updateReview(parsed.data, "user");
    return NextResponse.json({ ok: true, data: updated });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to update review";
    const status = msg.includes("Stale") ? 409 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

