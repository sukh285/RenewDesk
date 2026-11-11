// Shared TypeScript types matching the database schema
// These are used across services, MCP tools, and UI

export type BillingCycle = "monthly" | "annual";
export type ReviewState = "none" | "pending" | "reviewed";
export type Decision = "undecided" | "keep" | "cancel" | "need_info";
export type ActionStatus = "open" | "completed";
export type Actor = "user" | "claude" | "system";

export interface Subscription {
  id: string;
  request_id: string | null;
  vendor: string;
  amount_paise: number;      // INR in paise (1 INR = 100 paise)
  billing_cycle: BillingCycle;
  next_renewal: string;      // ISO date string YYYY-MM-DD
  owner: string | null;
  review_state: ReviewState;
  context: string | null;
  created_at: string;
  updated_at: string;
  version: number;
}

export interface ChecklistItem {
  text: string;
  done: boolean;
}

export interface Review {
  id: string;
  subscription_id: string;
  decision: Decision;
  action_status: ActionStatus;
  owner: string | null;
  due_date: string | null;   // ISO date string YYYY-MM-DD
  rationale: string | null;
  checklist: ChecklistItem[];
  completed_at: string | null;
  completion_note: string | null;
  created_at: string;
  updated_at: string;
  version: number;
}

export interface ActivityLogEntry {
  id: string;
  subscription_id: string | null;
  review_id: string | null;
  actor: Actor;
  action: string;
  payload: Record<string, unknown> | null;
  created_at: string;
}

// Enriched types returned by services

export interface SubscriptionWithReview extends Subscription {
  current_review: Review | null;
}

export interface ReviewWithSubscription extends Review {
  subscription: Subscription;
}

// API response shapes

export interface ApiSuccess<T> {
  ok: true;
  data: T;
}

export interface ApiError {
  ok: false;
  error: string;
  details?: Record<string, string[]>;
}

export type ApiResult<T> = ApiSuccess<T> | ApiError;

// Utility: convert paise to INR display string
export function paiseTo_inr(paise: number): string {
  const rupees = paise / 100;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(rupees);
}

// Utility: parse INR rupee amount to paise
export function inrToPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

