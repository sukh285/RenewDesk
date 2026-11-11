// GET /api/reviews - list reviews
// POST /api/reviews - create a review

import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { listReviews, createReview } from "@/lib/services/reviews";
import { createReviewSchema } from "@/lib/validation";

export async function GET(req: NextRequest) {
  try {
    await requireSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const subscriptionId = url.searchParams.get("subscription_id") ?? undefined;
  const decision = url.searchParams.get("decision") ?? undefined;
  const actionStatus = url.searchParams.get("action_status") ?? undefined;
  const windowDays = url.searchParams.get("window_days");

  try {
    const reviews = await listReviews({
      subscriptionId,
      decision,
      actionStatus,
      windowDays: windowDays ? parseInt(windowDays) : undefined,
    });
    return NextResponse.json({ ok: true, data: reviews });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to list reviews" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createReviewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  try {
    const review = await createReview(parsed.data, "user");
    return NextResponse.json({ ok: true, data: review }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create review" },
      { status: 500 }
    );
  }
}

