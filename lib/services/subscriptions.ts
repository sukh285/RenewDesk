// Subscription business service
// Used by both web route handlers and MCP tools

import { getDb } from "@/lib/db/client";
import {
  Subscription,
  SubscriptionWithReview,
  Review,
} from "@/lib/db/types";
import {
  CreateSubscriptionInput,
  UpdateSubscriptionInput,
} from "@/lib/validation";
import { getUpcomingWindow, defaultReviewDueDate } from "@/lib/dates";

// --- List subscriptions with optional filters ---

export interface ListSubscriptionsOptions {
  windowDays?: number;
  decision?: string;
  owner?: string;
}

export async function listSubscriptions(
  opts: ListSubscriptionsOptions = {}
): Promise<SubscriptionWithReview[]> {
  const db = getDb();

  let query = db
    .from("subscriptions")
    .select(
      `
      *,
      reviews (
        id, decision, action_status, owner, due_date, rationale,
        checklist, completed_at, completion_note, created_at, updated_at, version, subscription_id
      )
    `
    )
    .order("next_renewal", { ascending: true });

  if (opts.windowDays) {
    const { start, end } = getUpcomingWindow(opts.windowDays);
    query = query.gte("next_renewal", start).lte("next_renewal", end);
  }

  if (opts.owner) {
    query = query.eq("owner", opts.owner);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Failed to list subscriptions: ${error.message}`);

  // Map to enriched type: attach the most recent review
  return (data || []).map((row: Subscription & { reviews: Review[] }) => {
    const reviews = (row.reviews || []).sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    const current_review = reviews[0] ?? null;

    // Filter by decision if requested
    if (opts.decision && current_review?.decision !== opts.decision) {
      return null;
    }

    return {
      ...row,
      current_review,
    };
  }).filter(Boolean) as SubscriptionWithReview[];
}

// --- Create a subscription ---

export async function createSubscription(
  input: CreateSubscriptionInput
): Promise<{ subscription: Subscription; isDuplicate: boolean }> {
  const db = getDb();

  // Idempotency: check by request_id
  if (input.request_id) {
    const { data: existing } = await db
      .from("subscriptions")
      .select("*")
      .eq("request_id", input.request_id)
      .single();

    if (existing) {
      return { subscription: existing as Subscription, isDuplicate: true };
    }
  }

  // Check for likely duplicates by vendor + next_renewal
  const { data: possible } = await db
    .from("subscriptions")
    .select("id, vendor, next_renewal")
    .eq("vendor", input.vendor)
    .eq("next_renewal", input.next_renewal);

  const likelyDuplicate = (possible?.length ?? 0) > 0;

  if (likelyDuplicate && !input.request_id) {
    // Return a duplicate flag - caller decides whether to proceed
    // For MCP: surface this so Claude can warn the user
  }

  const { data, error } = await db
    .from("subscriptions")
    .insert({
      request_id: input.request_id ?? null,
      vendor: input.vendor,
      amount_paise: input.amount_paise,
      billing_cycle: input.billing_cycle,
      next_renewal: input.next_renewal,
      owner: input.owner ?? null,
      context: input.context ?? null,
      review_state: "pending",
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create subscription: ${error.message}`);

  // Automatically create an initial review with default due date
  const dueDate = defaultReviewDueDate(input.next_renewal);
  await db.from("reviews").insert({
    subscription_id: data.id,
    decision: "undecided",
    action_status: "open",
    owner: input.owner ?? null,
    due_date: dueDate,
    checklist: [],
  });

  // Log activity
  await db.from("activity_log").insert({
    subscription_id: data.id,
    actor: "claude",
    action: "subscription_created",
    payload: { vendor: input.vendor, request_id: input.request_id },
  });

  return { subscription: data as Subscription, isDuplicate: likelyDuplicate };
}

// --- Update a subscription ---

export async function updateSubscription(
  input: UpdateSubscriptionInput
): Promise<Subscription> {
  const db = getDb();

  // Version check to prevent stale updates
  const { data: current, error: fetchErr } = await db
    .from("subscriptions")
    .select("version")
    .eq("id", input.id)
    .single();

  if (fetchErr || !current) {
    throw new Error(`Subscription not found: ${input.id}`);
  }

  if (current.version !== input.version) {
    throw new Error(
      `Stale update rejected. Expected version ${current.version}, got ${input.version}. Please refresh and retry.`
    );
  }

  const updateData: Partial<Subscription> = {};
  if (input.vendor !== undefined) updateData.vendor = input.vendor;
  if (input.amount_paise !== undefined) updateData.amount_paise = input.amount_paise;
  if (input.billing_cycle !== undefined) updateData.billing_cycle = input.billing_cycle;
  if (input.next_renewal !== undefined) updateData.next_renewal = input.next_renewal;
  if (input.owner !== undefined) updateData.owner = input.owner ?? null;
  if (input.context !== undefined) updateData.context = input.context ?? null;

  const { data, error } = await db
    .from("subscriptions")
    .update(updateData)
    .eq("id", input.id)
    .select()
    .single();

  if (error) throw new Error(`Failed to update subscription: ${error.message}`);

  // Log activity
  await db.from("activity_log").insert({
    subscription_id: input.id,
    actor: "user",
    action: "subscription_updated",
    payload: updateData as Record<string, unknown>,
  });

  return data as Subscription;
}

// --- Get a single subscription ---

export async function getSubscription(id: string): Promise<SubscriptionWithReview | null> {
  const db = getDb();

  const { data, error } = await db
    .from("subscriptions")
    .select(`
      *,
      reviews (
        id, decision, action_status, owner, due_date, rationale,
        checklist, completed_at, completion_note, created_at, updated_at, version, subscription_id
      )
    `)
    .eq("id", id)
    .single();

  if (error) return null;

  const reviews = ((data as Subscription & { reviews: Review[] }).reviews || []).sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return {
    ...(data as Subscription),
    current_review: reviews[0] ?? null,
  };
}

// --- Get activity log for a subscription ---

export async function getSubscriptionActivity(subscriptionId: string) {
  const db = getDb();
  const { data, error } = await db
    .from("activity_log")
    .select("*")
    .eq("subscription_id", subscriptionId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw new Error(`Failed to get activity log: ${error.message}`);
  return data || [];
}

// --- Overview stats ---

export interface OverviewStats {
  upcomingRenewalTotal: number;    // in paise, next 30 days
  reviewsNeedingDecision: number;
  cancellationsAwaitingCompletion: number;
  upcomingReviews: SubscriptionWithReview[];
}

export async function getOverviewStats(): Promise<OverviewStats> {
  const db = getDb();
  const { start, end } = getUpcomingWindow(30);

  // Upcoming renewals in next 30 days
  const { data: upcoming } = await db
    .from("subscriptions")
    .select(`
      *,
      reviews (
        id, decision, action_status, owner, due_date, rationale,
        checklist, completed_at, completion_note, created_at, updated_at, version, subscription_id
      )
    `)
    .gte("next_renewal", start)
    .lte("next_renewal", end)
    .order("next_renewal", { ascending: true });

  const upcomingWithReviews = (upcoming || []).map((row: Subscription & { reviews: Review[] }) => {
    const reviews = (row.reviews || []).sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    return { ...row, current_review: reviews[0] ?? null };
  }) as SubscriptionWithReview[];

  // Sum upcoming renewal amounts (actual amounts, not monthly equivalents)
  const upcomingRenewalTotal = upcomingWithReviews.reduce(
    (sum, s) => sum + s.amount_paise,
    0
  );

  // Count reviews needing a decision (undecided and open)
  const { count: needsDecision } = await db
    .from("reviews")
    .select("*", { count: "exact", head: true })
    .eq("decision", "undecided")
    .eq("action_status", "open");

  // Count cancel decisions awaiting vendor completion
  const { count: awaitingCancellation } = await db
    .from("reviews")
    .select("*", { count: "exact", head: true })
    .eq("decision", "cancel")
    .eq("action_status", "open");

  return {
    upcomingRenewalTotal,
    reviewsNeedingDecision: needsDecision ?? 0,
    cancellationsAwaitingCompletion: awaitingCancellation ?? 0,
    upcomingReviews: upcomingWithReviews,
  };
}

