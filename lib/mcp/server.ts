// MCP Tool Definitions for RenewDesk
// Implements Streamable HTTP MCP protocol using @modelcontextprotocol/sdk
// Tools share business logic with web handlers

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  listSubscriptions,
  createSubscription,
  updateSubscription,
} from "@/lib/services/subscriptions";
import {
  listReviews,
  createReview,
  updateReview,
} from "@/lib/services/reviews";
import {
  listSubscriptionsInputSchema,
  listReviewsInputSchema,
  createSubscriptionSchema,
  updateSubscriptionSchema,
  createReviewSchema,
  updateReviewSchema,
} from "@/lib/validation";
import { paiseTo_inr } from "@/lib/db/types";
import { formatDate, daysUntil, todayKolkata } from "@/lib/dates";

export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: "renewdesk",
    version: "1.0.0",
  });

  // ----------------------------------------------------------------
  // Tool: list_subscriptions
  // ----------------------------------------------------------------
  server.tool(
    "list_subscriptions",
    "List subscriptions from RenewDesk with optional filters. Returns vendor, amount, billing cycle, renewal date, owner, and current review state.",
    {
      window_days: z
        .number()
        .int()
        .min(1)
        .max(365)
        .optional()
        .describe("Filter subscriptions renewing within this many days from today (Asia/Kolkata)"),
      decision: z
        .enum(["undecided", "keep", "cancel", "need_info"])
        .optional()
        .describe("Filter by current review decision"),
      owner: z
        .string()
        .optional()
        .describe("Filter by owner name"),
    },
    async ({ window_days, decision, owner }) => {
      try {
        const subs = await listSubscriptions({ windowDays: window_days, decision, owner });

        if (subs.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: "No subscriptions found matching the specified filters.",
              },
            ],
          };
        }

        const today = todayKolkata();
        const formatted = subs.map((s) => {
          const days = daysUntil(s.next_renewal);
          const review = s.current_review;
          return {
            id: s.id,
            vendor: s.vendor,
            amount: paiseTo_inr(s.amount_paise),
            billing_cycle: s.billing_cycle,
            next_renewal: s.next_renewal,
            renewal_in_days: days,
            owner: s.owner ?? "(unassigned)",
            review_state: s.review_state,
            current_review: review
              ? {
                  id: review.id,
                  version: review.version,
                  decision: review.decision,
                  action_status: review.action_status,
                  owner: review.owner ?? "(unassigned)",
                  due_date: review.due_date,
                  rationale: review.rationale ?? null,
                }
              : null,
          };
        });

        return {
          content: [
            {
              type: "text",
              text: `Found ${subs.length} subscription(s). Today is ${today} (Asia/Kolkata).\n\n${JSON.stringify(formatted, null, 2)}`,
            },
          ],
        };
      } catch (err) {
        return {
          content: [
            {
              type: "text",
              text: `Error listing subscriptions: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // ----------------------------------------------------------------
  // Tool: save_subscriptions
  // ----------------------------------------------------------------
  server.tool(
    "save_subscriptions",
    "Create or update subscriptions in RenewDesk. For creates, provide vendor, amount_paise (INR in paise, e.g. 50000 = INR 500), billing_cycle (monthly/annual), next_renewal (YYYY-MM-DD), and optionally owner and context. Include a unique request_id for idempotent creation. For updates, include id and version (from list_subscriptions). Never invent renewal dates or prices - ask the user if missing.",
    {
      subscriptions: z
        .array(
          z.union([
            createSubscriptionSchema,
            updateSubscriptionSchema,
          ])
        )
        .min(1)
        .max(20)
        .describe("Array of subscriptions to create or update"),
    },
    async ({ subscriptions }) => {
      const results: Array<{
        vendor: string;
        status: "created" | "updated" | "duplicate" | "error";
        id?: string;
        duplicate_warning?: string;
        error?: string;
      }> = [];

      for (const sub of subscriptions) {
        try {
          if ("id" in sub) {
            // Update path
            const updated = await updateSubscription(sub as Parameters<typeof updateSubscription>[0]);
            results.push({
              vendor: updated.vendor,
              status: "updated",
              id: updated.id,
            });
          } else {
            // Create path
            const { subscription, isDuplicate } = await createSubscription(
              sub as Parameters<typeof createSubscription>[0]
            );
            results.push({
              vendor: subscription.vendor,
              status: isDuplicate ? "duplicate" : "created",
              id: subscription.id,
              duplicate_warning: isDuplicate
                ? "A subscription with the same vendor and renewal date already exists. This may be a duplicate. Please verify with the user."
                : undefined,
            });
          }
        } catch (err) {
          results.push({
            vendor: ("vendor" in sub ? sub.vendor : "unknown") as string,
            status: "error",
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }

      const created = results.filter((r) => r.status === "created").length;
      const updated = results.filter((r) => r.status === "updated").length;
      const duplicates = results.filter((r) => r.status === "duplicate").length;
      const errors = results.filter((r) => r.status === "error").length;

      const summary = [
        created > 0 ? `${created} created` : null,
        updated > 0 ? `${updated} updated` : null,
        duplicates > 0 ? `${duplicates} possible duplicate(s) flagged` : null,
        errors > 0 ? `${errors} error(s)` : null,
      ]
        .filter(Boolean)
        .join(", ");

      return {
        content: [
          {
            type: "text",
            text: `Results: ${summary}\n\n${JSON.stringify(results, null, 2)}`,
          },
        ],
        isError: errors > 0 && created === 0 && updated === 0,
      };
    }
  );

  // ----------------------------------------------------------------
  // Tool: list_reviews
  // ----------------------------------------------------------------
  server.tool(
    "list_reviews",
    "List renewal reviews from RenewDesk with subscription context. Returns decision, action status, owner, due date, rationale, and checklist.",
    {
      subscription_id: z
        .string()
        .uuid()
        .optional()
        .describe("Filter reviews for a specific subscription (UUID)"),
      decision: z
        .enum(["undecided", "keep", "cancel", "need_info"])
        .optional()
        .describe("Filter by decision"),
      action_status: z
        .enum(["open", "completed"])
        .optional()
        .describe("Filter by action status"),
      window_days: z
        .number()
        .int()
        .min(1)
        .max(365)
        .optional()
        .describe("Filter reviews due within this many days"),
    },
    async ({ subscription_id, decision, action_status, window_days }) => {
      try {
        const reviews = await listReviews({
          subscriptionId: subscription_id,
          decision,
          actionStatus: action_status,
          windowDays: window_days,
        });

        if (reviews.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: "No reviews found matching the specified filters.",
              },
            ],
          };
        }

        const formatted = reviews.map((r) => ({
          id: r.id,
          version: r.version,
          subscription: {
            id: r.subscription.id,
            vendor: r.subscription.vendor,
            amount: paiseTo_inr(r.subscription.amount_paise),
            next_renewal: r.subscription.next_renewal,
            owner: r.subscription.owner,
            context: r.subscription.context,
          },
          decision: r.decision,
          action_status: r.action_status,
          owner: r.owner ?? "(unassigned)",
          due_date: r.due_date,
          rationale: r.rationale,
          checklist: r.checklist,
          completed_at: r.completed_at,
        }));

        return {
          content: [
            {
              type: "text",
              text: `Found ${reviews.length} review(s).\n\n${JSON.stringify(formatted, null, 2)}`,
            },
          ],
        };
      } catch (err) {
        return {
          content: [
            {
              type: "text",
              text: `Error listing reviews: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // ----------------------------------------------------------------
  // Tool: save_reviews
  // ----------------------------------------------------------------
  server.tool(
    "save_reviews",
    "Create or update renewal reviews in RenewDesk. Can set decision (undecided/keep/cancel/need_info), owner, due_date, rationale, and checklist. IMPORTANT: This tool cannot mark a review as 'completed' - that requires explicit human confirmation in the app. For updates, include id and version from list_reviews. Stale updates are rejected.",
    {
      reviews: z
        .array(
          z.union([
            createReviewSchema,
            updateReviewSchema,
          ])
        )
        .min(1)
        .max(20)
        .describe("Array of reviews to create or update"),
    },
    async ({ reviews }) => {
      const results: Array<{
        status: "created" | "updated" | "error";
        id?: string;
        subscription_id?: string;
        error?: string;
      }> = [];

      for (const review of reviews) {
        try {
          if ("id" in review) {
            // Update path - cannot change action_status to completed
            const updated = await updateReview(
              review as Parameters<typeof updateReview>[0],
              "claude"
            );
            results.push({
              status: "updated",
              id: updated.id,
              subscription_id: updated.subscription_id,
            });
          } else {
            // Create path
            const created = await createReview(
              review as Parameters<typeof createReview>[0],
              "claude"
            );
            results.push({
              status: "created",
              id: created.id,
              subscription_id: created.subscription_id,
            });
          }
        } catch (err) {
          results.push({
            status: "error",
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }

      const created = results.filter((r) => r.status === "created").length;
      const updated = results.filter((r) => r.status === "updated").length;
      const errors = results.filter((r) => r.status === "error").length;

      const notes = [
        "Note: Marking a review as completed requires explicit human confirmation in the RenewDesk app.",
        "Note: Vendor cancellations must be completed by the user directly with the vendor.",
      ].join(" ");

      return {
        content: [
          {
            type: "text",
            text: `Results: ${created} created, ${updated} updated, ${errors} error(s).\n${notes}\n\n${JSON.stringify(results, null, 2)}`,
          },
        ],
        isError: errors > 0 && created === 0 && updated === 0,
      };
    }
  );

  return server;
}

