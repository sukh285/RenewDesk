// Overview page - server component
// Protected by requireSession(), fetches data via getOverviewStats()

import { Suspense } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { requireSession } from "@/lib/auth/session";
import { getOverviewStats, OverviewStats } from "@/lib/services/subscriptions";
import {
  SubscriptionWithReview,
  ReviewWithSubscription,
  paiseTo_inr,
} from "@/lib/db/types";
import {
  formatDate,
  daysUntil,
  isWithinDays,
  KOLKATA_TZ,
} from "@/lib/dates";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatInTimeZone } from "date-fns-tz";
import { listReviews } from "@/lib/services/reviews";

// --- Helpers ---

function decisionBadge(decision: string) {
  const map: Record<string, string> = {
    undecided: "bg-amber-100 text-amber-800 border-amber-200",
    keep: "bg-emerald-100 text-emerald-800 border-emerald-200",
    cancel: "bg-red-100 text-red-800 border-red-200",
    need_info: "bg-blue-100 text-blue-800 border-blue-200",
  };
  const label: Record<string, string> = {
    undecided: "Undecided",
    keep: "Keep",
    cancel: "Cancel",
    need_info: "Need info",
  };
  const cls = map[decision] ?? "bg-zinc-100 text-zinc-700 border-zinc-200";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${cls}`}
    >
      {label[decision] ?? decision}
    </span>
  );
}

function daysLabel(days: number) {
  if (days < 0) return <span className="text-red-600 font-medium">Overdue</span>;
  if (days === 0) return <span className="text-red-600 font-medium">Today</span>;
  if (days <= 7) return <span className="text-red-600 font-medium">{days}d</span>;
  if (days <= 30) return <span className="text-amber-600 font-medium">{days}d</span>;
  return <span className="text-zinc-500">{days}d</span>;
}

// --- Skeleton ---

function OverviewSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <Skeleton className="h-8 w-32 mb-2" />
              <Skeleton className="h-4 w-48" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

// --- Stat Card ---

function StatCard({
  title,
  value,
  label,
}: {
  title: string;
  value: string | number;
  label: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-sm font-medium text-zinc-500">{title}</p>
        <p className="mt-1 text-2xl font-bold text-zinc-900 tracking-tight">
          {value}
        </p>
        <p className="mt-1 text-xs text-zinc-400">{label}</p>
      </CardContent>
    </Card>
  );
}

// --- Approaching Renewals Table ---

function ApproachingRenewals({
  subscriptions,
}: {
  subscriptions: SubscriptionWithReview[];
}) {
  if (subscriptions.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 py-10 text-center">
        <p className="text-sm text-zinc-500">No renewals in the next 30 days.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200">
      <table className="min-w-full divide-y divide-zinc-100 text-sm">
        <thead className="bg-zinc-50">
          <tr>
            {["Vendor", "Amount", "Cycle", "Renewal date", "Days left", "Owner", "Decision"].map(
              (h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500"
                >
                  {h}
                </th>
              )
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 bg-white">
          {subscriptions.map((sub) => {
            const days = daysUntil(sub.next_renewal);
            const decision = sub.current_review?.decision ?? "undecided";
            return (
              <tr
                key={sub.id}
                className="hover:bg-zinc-50 transition-colors"
              >
                <td className="px-4 py-3 font-medium text-zinc-900">
                  <Link
                    href="/subscriptions"
                    className="hover:underline hover:text-emerald-700"
                  >
                    {sub.vendor}
                  </Link>
                </td>
                <td className="px-4 py-3 text-zinc-700 tabular-nums">
                  {paiseTo_inr(sub.amount_paise)}
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center rounded-full bg-zinc-100 border border-zinc-200 px-2 py-0.5 text-xs font-medium text-zinc-700 capitalize">
                    {sub.billing_cycle}
                  </span>
                </td>
                <td className="px-4 py-3 text-zinc-600 tabular-nums">
                  {formatDate(sub.next_renewal)}
                </td>
                <td className="px-4 py-3">{daysLabel(days)}</td>
                <td className="px-4 py-3 text-zinc-600">
                  {sub.owner ?? (
                    <span className="text-zinc-400 italic">Unassigned</span>
                  )}
                </td>
                <td className="px-4 py-3">{decisionBadge(decision)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// --- Reviews Due Soon ---

function ReviewsDueSoon({
  reviews,
}: {
  reviews: ReviewWithSubscription[];
}) {
  const dueReviews = reviews.filter(
    (r) =>
      r.action_status === "open" &&
      r.due_date &&
      isWithinDays(r.due_date, 7)
  );

  if (dueReviews.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 py-10 text-center">
        <p className="text-sm text-zinc-500">No reviews due in the next 7 days.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {dueReviews.map((review) => {
        const days = review.due_date ? daysUntil(review.due_date) : null;
        return (
          <Card key={review.id} className="border border-zinc-200">
            <CardContent className="pt-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-zinc-900 text-sm">
                    {review.subscription.vendor}
                  </p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Due{" "}
                    {review.due_date ? formatDate(review.due_date) : "No date"}
                    {days !== null && (
                      <span className="ml-1">({daysLabel(days)})</span>
                    )}
                  </p>
                </div>
                {decisionBadge(review.decision)}
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs text-zinc-500">
                  {review.owner ?? (
                    <span className="text-amber-600">No owner</span>
                  )}
                </span>
                <Link
                  href="/reviews"
                  className="text-xs text-emerald-700 hover:underline font-medium"
                >
                  View review
                </Link>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// --- Main async content ---

async function OverviewContent() {
  const [stats, allReviews] = await Promise.all([
    getOverviewStats(),
    listReviews({ actionStatus: "open" }),
  ]);

  return (
    <div className="space-y-8">
      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          title="Renewals due (next 30 days)"
          value={paiseTo_inr(stats.upcomingRenewalTotal)}
          label="Total actual renewal charges approaching"
        />
        <StatCard
          title="Needs a decision"
          value={stats.reviewsNeedingDecision}
          label="Reviews without an owner or decision"
        />
        <StatCard
          title="Pending cancellations"
          value={stats.cancellationsAwaitingCompletion}
          label="Requires action with the vendor to complete"
        />
      </div>

      {/* Approaching renewals */}
      <section>
        <h2 className="text-base font-semibold text-zinc-900 mb-3">
          Approaching renewals
        </h2>
        <ApproachingRenewals subscriptions={stats.upcomingReviews} />
      </section>

      {/* Reviews due soon */}
      <section>
        <h2 className="text-base font-semibold text-zinc-900 mb-3">
          Reviews due soon
        </h2>
        <ReviewsDueSoon reviews={allReviews} />
      </section>
    </div>
  );
}

// --- Page ---

export default async function OverviewPage() {
  try {
    await requireSession();
  } catch {
    redirect("/login");
  }

  const nowIST = formatInTimeZone(new Date(), KOLKATA_TZ, "d MMM yyyy, h:mm a");

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-6xl mx-auto">
      {/* Page header */}
      <div className="mb-6 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Overview</h1>
        </div>
        <p className="text-xs text-zinc-400">Updated as of {nowIST} IST</p>
      </div>

      <Suspense fallback={<OverviewSkeleton />}>
        <OverviewContent />
      </Suspense>
    </div>
  );
}
