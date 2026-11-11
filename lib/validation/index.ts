// Zod validation schemas for all data operations
// Shared between web handlers and MCP tools

import { z } from "zod";

// --- Subscription schemas ---

export const billingCycleSchema = z.enum(["monthly", "annual"]);
export const reviewStateSchema = z.enum(["none", "pending", "reviewed"]);
export const decisionSchema = z.enum(["undecided", "keep", "cancel", "need_info"]);
export const actionStatusSchema = z.enum(["open", "completed"]);

// Date string as YYYY-MM-DD
const dateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format");

// Amount in INR rupees (we convert to paise on save)
export const amountRupeesSchema = z
  .number()
  .positive("Amount must be positive")
  .multipleOf(0.01, "Amount cannot have more than 2 decimal places");

export const createSubscriptionSchema = z.object({
  request_id: z.string().min(1).max(128).optional(),
  vendor: z.string().min(1, "Vendor name is required").max(200),
  amount_paise: z
    .number()
    .int("Amount must be an integer in paise")
    .nonnegative("Amount cannot be negative"),
  billing_cycle: billingCycleSchema,
  next_renewal: dateStringSchema,
  owner: z.string().max(200).nullish(),
  context: z.string().max(2000).nullish(),
});

export const updateSubscriptionSchema = createSubscriptionSchema
  .partial()
  .extend({
    id: z.string().uuid("Invalid subscription ID"),
    version: z.number().int().positive("Version must be a positive integer"),
  });

export const checklistItemSchema = z.object({
  text: z.string().min(1).max(500),
  done: z.boolean(),
});

export const createReviewSchema = z.object({
  subscription_id: z.string().uuid("Invalid subscription ID"),
  decision: decisionSchema.default("undecided"),
  owner: z.string().max(200).nullish(),
  due_date: dateStringSchema.optional(),
  rationale: z.string().max(2000).nullish(),
  checklist: z.array(checklistItemSchema).default([]),
});

export const updateReviewSchema = z.object({
  id: z.string().uuid("Invalid review ID"),
  version: z.number().int().positive("Version must be a positive integer"),
  decision: decisionSchema.optional(),
  owner: z.string().max(200).nullish().optional(),
  due_date: dateStringSchema.optional(),
  rationale: z.string().max(2000).nullish().optional(),
  checklist: z.array(checklistItemSchema).optional(),
  // Note: action_status = 'completed' can only be set through the web UI
  // MCP tools cannot mark cancellations as completed
});

export const completeReviewSchema = z.object({
  id: z.string().uuid(),
  version: z.number().int().positive(),
  completion_note: z.string().max(1000).optional(),
});

// --- MCP tool input schemas ---

export const listSubscriptionsInputSchema = z.object({
  window_days: z.number().int().min(1).max(365).optional().describe(
    "Filter subscriptions renewing within this many days from today"
  ),
  decision: decisionSchema.optional().describe(
    "Filter by review decision (undecided, keep, cancel, need_info)"
  ),
  owner: z.string().optional().describe(
    "Filter by owner name"
  ),
});

export const saveSubscriptionsInputSchema = z.object({
  subscriptions: z
    .array(
      z.union([createSubscriptionSchema, updateSubscriptionSchema])
    )
    .min(1, "At least one subscription is required")
    .max(20, "Maximum 20 subscriptions per batch"),
});

export const listReviewsInputSchema = z.object({
  subscription_id: z.string().uuid().optional().describe(
    "Filter reviews for a specific subscription"
  ),
  decision: decisionSchema.optional().describe(
    "Filter by decision"
  ),
  action_status: actionStatusSchema.optional().describe(
    "Filter by action status (open or completed)"
  ),
  window_days: z.number().int().min(1).max(365).optional().describe(
    "Filter reviews due within this many days"
  ),
});

export const saveReviewsInputSchema = z.object({
  reviews: z
    .array(
      z.union([createReviewSchema, updateReviewSchema])
    )
    .min(1, "At least one review is required")
    .max(20, "Maximum 20 reviews per batch"),
});

export type CreateSubscriptionInput = z.infer<typeof createSubscriptionSchema>;
export type UpdateSubscriptionInput = z.infer<typeof updateSubscriptionSchema>;
export type CreateReviewInput = z.infer<typeof createReviewSchema>;
export type UpdateReviewInput = z.infer<typeof updateReviewSchema>;
export type ListSubscriptionsInput = z.infer<typeof listSubscriptionsInputSchema>;
export type SaveSubscriptionsInput = z.infer<typeof saveSubscriptionsInputSchema>;
export type ListReviewsInput = z.infer<typeof listReviewsInputSchema>;
export type SaveReviewsInput = z.infer<typeof saveReviewsInputSchema>;

