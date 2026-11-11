// GET /api/subscriptions - list all subscriptions
// POST /api/subscriptions - create a subscription

import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import {
  listSubscriptions,
  createSubscription,
} from "@/lib/services/subscriptions";
import { createSubscriptionSchema } from "@/lib/validation";

export async function GET(req: NextRequest) {
  try {
    await requireSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const windowDays = url.searchParams.get("window_days");
  const owner = url.searchParams.get("owner") ?? undefined;
  const decision = url.searchParams.get("decision") ?? undefined;

  try {
    const subs = await listSubscriptions({
      windowDays: windowDays ? parseInt(windowDays) : undefined,
      owner,
      decision,
    });
    return NextResponse.json({ ok: true, data: subs });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to list subscriptions" },
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

  const parsed = createSubscriptionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  try {
    const { subscription, isDuplicate } = await createSubscription(parsed.data);
    return NextResponse.json(
      { ok: true, data: subscription, isDuplicate },
      { status: 201 }
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create subscription" },
      { status: 500 }
    );
  }
}

