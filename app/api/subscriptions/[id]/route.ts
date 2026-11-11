// GET /api/subscriptions/[id] - get a single subscription
// PATCH /api/subscriptions/[id] - update a subscription

import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import {
  getSubscription,
  updateSubscription,
  getSubscriptionActivity,
} from "@/lib/services/subscriptions";
import { updateSubscriptionSchema } from "@/lib/validation";

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
  const sub = await getSubscription(id);
  if (!sub) {
    return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
  }

  const activity = await getSubscriptionActivity(id);

  return NextResponse.json({ ok: true, data: { ...sub, activity } });
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

  const parsed = updateSubscriptionSchema.safeParse({
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
    const updated = await updateSubscription(parsed.data);
    return NextResponse.json({ ok: true, data: updated });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to update";
    const status = msg.includes("Stale") ? 409 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

