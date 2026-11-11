// Review business service
// Used by both web route handlers and MCP tools

import { getDb } from "@/lib/db/client";
import { Review, ReviewWithSubscription, Subscription } from "@/lib/db/types";
import {
  CreateReviewInput,
  UpdateReviewInput,
} from "@/lib/validation";
import { defaultReviewDueDate } from "@/lib/dates";

// --- List reviews with optional filters ---

export interface ListReviewsOptions {
  subscriptionId?: string;
  decision?: string;
  actionStatus?: string;
  windowDays?: number;
}

export async function listReviews(
  opts: ListReviewsOptions = {}
): Promise<ReviewWithSubscription[]> {
  const db = getDb();

  let query = db
    .from("reviews")
    .select(`
      *,
      subscription:subscriptions (*)
    `)
    .order("due_date", { ascending: true, nullsFirst: false });

  if (opts.subscriptionId) {
    query = query.eq("subscription_id", opts.subscriptionId);
  }

  if (opts.decision) {
    query = query.eq("decision", opts.decision);
  }

  if (opts.actionStatus) {
    query = query.eq("action_status", opts.actionStatus);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Failed to list reviews: ${error.message}`);

  return (data || []) as ReviewWithSubscription[];
}

// --- Create a review ---

export async function createReview(
  input: CreateReviewInput,
  actor: "user" | "claude" = "user"
): Promise<Review> {
  const db = getDb();

  // Look up the subscription to get the renewal date for due date calculation
  const { data: sub } = await db
    .from("subscriptions")
    .select("next_renewal, owner")
    .eq("id", input.subscription_id)
    .single();

  const dueDate =
    input.due_date ??
    (sub ? defaultReviewDueDate(sub.next_renewal) : undefined);

  const { data, error } = await db
    .from("reviews")
    .insert({
      subscription_id: input.subscription_id,
      decision: input.decision ?? "undecided",
      action_status: "open",
      owner: input.owner ?? sub?.owner ?? null,
      due_date: dueDate ?? null,
      rationale: input.rationale ?? null,
      checklist: input.checklist ?? [],
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create review: ${error.message}`);

  // Update subscription review_state
  await db
    .from("subscriptions")
    .update({ review_state: "pending" })
    .eq("id", input.subscription_id);

  // Log activity
  await db.from("activity_log").insert({
    subscription_id: input.subscription_id,
    review_id: data.id,
    actor,
    action: "review_created",
    payload: { decision: input.decision },
  });

  return data as Review;
}

// --- Update a review (MCP and web) ---

export async function updateReview(
  input: UpdateReviewInput,
  actor: "user" | "claude" = "user"
): Promise<Review> {
  const db = getDb();

  // Version check
  const { data: current, error: fetchErr } = await db
    .from("reviews")
    .select("version, decision, action_status, subscription_id")
    .eq("id", input.id)
    .single();

  if (fetchErr || !current) {
    throw new Error(`Review not found: ${input.id}`);
  }

  if (current.version !== input.version) {
    throw new Error(
      `Stale update rejected. Current version is ${current.version}, you sent ${input.version}. Refresh and retry.`
    );
  }

  const updateData: Partial<Review> = {};
  if (input.decision !== undefined) updateData.decision = input.decision;
  if (input.owner !== undefined) updateData.owner = input.owner ?? null;
  if (input.due_date !== undefined) updateData.due_date = input.due_date;
  if (input.rationale !== undefined) updateData.rationale = input.rationale ?? null;
  if (input.checklist !== undefined) updateData.checklist = input.checklist;

  const { data, error } = await db
    .from("reviews")
    .update(updateData)
    .eq("id", input.id)
    .select()
    .single();

  if (error) throw new Error(`Failed to update review: ${error.message}`);

  // Update subscription review_state if decision is set
  if (input.decision && input.decision !== "undecided") {
    const sub = current as { subscription_id: string };
    await db
      .from("subscriptions")
      .update({ review_state: "reviewed" })
      .eq("id", sub.subscription_id);
  }

  // Log activity
  await db.from("activity_log").insert({
    subscription_id: (current as { subscription_id: string }).subscription_id,
    review_id: input.id,
    actor,
    action: "review_updated",
    payload: updateData as Record<string, unknown>,
  });

  return data as Review;
}

// --- Complete a review (web UI only - explicit human action) ---

export async function completeReview(
  id: string,
  version: number,
  completionNote?: string
): Promise<Review> {
  const db = getDb();

  // Version check
  const { data: current, error: fetchErr } = await db
    .from("reviews")
    .select("version, decision, action_status, subscription_id")
    .eq("id", id)
    .single();

  if (fetchErr || !current) {
    throw new Error(`Review not found: ${id}`);
  }

  if ((current as Review).version !== version) {
    throw new Error("Stale update. Please refresh and retry.");
  }

  if ((current as Review).action_status === "completed") {
    throw new Error("This review is already marked as completed.");
  }

  const { data, error } = await db
    .from("reviews")
    .update({
      action_status: "completed",
      completed_at: new Date().toISOString(),
      completion_note: completionNote ?? null,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(`Failed to complete review: ${error.message}`);

  // Update subscription review_state
  await db
    .from("subscriptions")
    .update({ review_state: "reviewed" })
    .eq("id", (current as { subscription_id: string }).subscription_id);

  // Log activity
  await db.from("activity_log").insert({
    subscription_id: (current as { subscription_id: string }).subscription_id,
    review_id: id,
    actor: "user",
    action: "review_completed",
    payload: {
      decision: (current as Review).decision,
      completion_note: completionNote,
    },
  });

  return data as Review;
}

// --- Get a single review ---

export async function getReview(id: string): Promise<ReviewWithSubscription | null> {
  const db = getDb();

  const { data, error } = await db
    .from("reviews")
    .select(`
      *,
      subscription:subscriptions (*)
    `)
    .eq("id", id)
    .single();

  if (error) return null;
  return data as ReviewWithSubscription;
}

