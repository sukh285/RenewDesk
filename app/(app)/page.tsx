// Overview page - server component
// Protected by requireSession(), fetches data via getOverviewStats()

import { Suspense } from "react";
import Link from "next/link";
import { requireSession } from "@/lib/auth/session";
import { getOverviewStats } from "@/lib/services/subscriptions";
import { listReviews } from "@/lib/services/reviews";
import {
  SubscriptionWithReview,
  ReviewWithSubscription,
  paiseTo_inr,
} from "@/lib/db/types";
import {
  formatDate,
  daysUntil,
  isWithinDays,
} from "@/lib/dates";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertCircle,
  Clock,
  ArrowUpRight,
  Plus,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Ban,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// --- Visual Helpers ---

function VendorAvatar({ vendor }: { vendor: string }) {
  const initial = vendor ? vendor.charAt(0).toUpperCase() : "?";
  
  // Consistent muted backgrounds based on initial
  const colors = [
    "bg-stone-100 text-stone-800 border-stone-200",
    "bg-zinc-100 text-zinc-800 border-zinc-200",
    "bg-neutral-100 text-neutral-800 border-neutral-200",
  ];
  const colorIndex = (vendor.charCodeAt(0) || 0) % colors.length;

  return (
    <div
      className={`h-7 w-7 rounded-md border flex items-center justify-center font-semibold text-xs shrink-0 select-none ${colors[colorIndex]}`}
      aria-hidden="true"
    >
      {initial}
    </div>
  );
}

function DecisionBadge({ decision }: { decision: string }) {
  const styles: Record<string, { bg: string; text: string; border: string; icon: React.ElementType; label: string }> = {
    undecided: {
      bg: "bg-amber-50",
      text: "text-amber-800",
      border: "border-amber-200",
      icon: Clock,
      label: "Undecided",
    },
    keep: {
      bg: "bg-emerald-50",
      text: "text-emerald-800",
      border: "border-emerald-200",
      icon: CheckCircle2,
      label: "Keep",
    },
    cancel: {
      bg: "bg-red-50",
      text: "text-red-800",
      border: "border-red-200",
      icon: Ban,
      label: "Cancel",
    },
    need_info: {
      bg: "bg-blue-50",
      text: "text-blue-800",
      border: "border-blue-200",
      icon: HelpCircle,
      label: "Need info",
    },
  };

  const current = styles[decision] ?? styles.undecided;
  const Icon = current.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium border ${current.bg} ${current.text} ${current.border}`}
    >
      <Icon className="h-3 w-3 shrink-0" />
      <span>{current.label}</span>
    </span>
  );
}

function UrgencyBadge({ days }: { days: number }) {
  if (days < 0) {
    return (
      <span className="inline-flex items-center text-xs font-medium text-red-700 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">
        Overdue
      </span>
    );
  }
  if (days === 0) {
    return (
      <span className="inline-flex items-center text-xs font-medium text-red-700 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">
        Today
      </span>
    );
  }
  if (days <= 7) {
    return (
      <span className="inline-flex items-center text-xs font-medium text-red-700 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">
        {days}d left
      </span>
    );
  }
  if (days <= 30) {
    return (
      <span className="inline-flex items-center text-xs font-medium text-zinc-700 bg-stone-100 border border-stone-200 px-1.5 py-0.5 rounded">
        {days}d left
      </span>
    );
  }
  return <span className="text-xs text-zinc-500">{days}d</span>;
}

// --- Skeleton Fallback ---

function OverviewSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="border-stone-200 bg-white shadow-2xs">
            <CardContent className="p-4 space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-7 w-36" />
              <Skeleton className="h-3 w-44" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card className="border-stone-200 bg-white shadow-2xs">
        <CardHeader className="p-4 pb-2">
          <Skeleton className="h-5 w-44" />
        </CardHeader>
        <CardContent className="p-4 pt-2">
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

// --- Overview Content ---

async function OverviewDataView() {
  const [stats, allReviews] = await Promise.all([
    getOverviewStats(),
    listReviews({ windowDays: 7, actionStatus: "open" }),
  ]);

  const approachingSubscriptions = stats.upcomingReviews;
  const urgentReviews = allReviews.filter(
    (r) => r.action_status === "open" && r.due_date && isWithinDays(r.due_date, 7)
  );

  return (
    <div className="space-y-6">
      {/* 3 Metric Summary Cards */}
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
        {/* Card 1: 30-Day Total Renewal Commit */}
        <Card className="border-stone-200 bg-white depth-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-zinc-500 font-medium">
              <span>30-Day Renewal Spend</span>
              <span className="text-[11px] font-mono bg-stone-100 text-zinc-600 px-1.5 py-0.5 rounded border border-stone-200">
                INR Only
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-zinc-900 tabular-nums">
                {paiseTo_inr(stats.upcomingRenewalTotal)}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-zinc-500 leading-normal">
              Actual scheduled renewal charges due within the next 30 days.
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Reviews Needing Decision */}
        <Card className="border-stone-200 bg-white depth-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-zinc-500 font-medium">
              <span>Awaiting Decision</span>
              {stats.reviewsNeedingDecision > 0 && (
                <span className="text-[11px] font-medium bg-amber-50 text-amber-800 px-1.5 py-0.5 rounded border border-amber-200">
                  Action required
                </span>
              )}
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-zinc-900 tabular-nums">
                {stats.reviewsNeedingDecision}
              </span>
              <span className="text-xs text-zinc-500">subscriptions</span>
            </div>
            <p className="mt-1 text-[11px] text-zinc-500 leading-normal">
              Upcoming renewals without an explicit keep or cancel decision.
            </p>
          </CardContent>
        </Card>

        {/* Card 3: Pending Vendor Cancellations */}
        <Card className="border-stone-200 bg-white depth-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-zinc-500 font-medium">
              <span>Pending Vendor Action</span>
              {stats.cancellationsAwaitingCompletion > 0 && (
                <span className="text-[11px] font-medium bg-red-50 text-red-800 px-1.5 py-0.5 rounded border border-red-200">
                  Manual step
                </span>
              )}
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-zinc-900 tabular-nums">
                {stats.cancellationsAwaitingCompletion}
              </span>
              <span className="text-xs text-zinc-500">to cancel</span>
            </div>
            <p className="mt-1 text-[11px] text-zinc-500 leading-normal">
              Cancel verdicts awaiting explicit human confirmation with vendor.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Section: Approaching Renewals Table */}
      <Card className="border-stone-200 bg-white depth-card overflow-hidden">
        <CardHeader className="p-4 pb-3 border-b border-stone-100 flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-sm font-semibold text-zinc-900">
              Upcoming Renewals (Next 30 Days)
            </CardTitle>
            <p className="text-xs text-zinc-500 mt-0.5">
              Subscriptions requiring review or action prior to auto-billing.
            </p>
          </div>
          <Link
            href="/subscriptions"
            className="text-xs font-medium text-emerald-800 hover:text-emerald-900 inline-flex items-center gap-1"
          >
            <span>View all</span>
            <ArrowUpRight className="h-3 w-3" />
          </Link>
        </CardHeader>

        <CardContent className="p-0">
          {approachingSubscriptions.length === 0 ? (
            <div className="p-8 text-center text-xs text-zinc-500">
              No subscriptions scheduled to renew within the next 30 days.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-stone-200/80 bg-stone-50/70 text-zinc-600 font-medium uppercase tracking-wider text-[11px]">
                    <th className="py-2.5 px-4">Vendor</th>
                    <th className="py-2.5 px-3">Amount</th>
                    <th className="py-2.5 px-3">Billing Cycle</th>
                    <th className="py-2.5 px-3">Renewal Date</th>
                    <th className="py-2.5 px-3">Urgency</th>
                    <th className="py-2.5 px-3">Owner</th>
                    <th className="py-2.5 px-3">Decision</th>
                    <th className="py-2.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {approachingSubscriptions.map((sub) => {
                    const days = daysUntil(sub.next_renewal);
                    const decision = sub.current_review?.decision ?? "undecided";

                    return (
                      <tr
                        key={sub.id}
                        className="hover:bg-stone-50/60 transition-colors"
                      >
                        {/* Vendor */}
                        <td className="py-3 px-4 font-medium text-zinc-900">
                          <div className="flex items-center gap-2.5">
                            <VendorAvatar vendor={sub.vendor} />
                            <div>
                              <div className="font-semibold text-zinc-900">
                                {sub.vendor}
                              </div>
                              {sub.context && (
                                <div className="text-[11px] text-zinc-500 truncate max-w-[200px]">
                                  {sub.context}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Amount */}
                        <td className="py-3 px-3 font-mono font-medium text-zinc-900 tabular-nums">
                          {paiseTo_inr(sub.amount_paise)}
                        </td>

                        {/* Cycle */}
                        <td className="py-3 px-3 text-zinc-600 capitalize">
                          {sub.billing_cycle}
                        </td>

                        {/* Renewal Date */}
                        <td className="py-3 px-3 text-zinc-700 font-mono text-[11px]">
                          {formatDate(sub.next_renewal)}
                        </td>

                        {/* Urgency */}
                        <td className="py-3 px-3">
                          <UrgencyBadge days={days} />
                        </td>

                        {/* Owner */}
                        <td className="py-3 px-3 text-zinc-700">
                          {sub.owner ? (
                            <span>{sub.owner}</span>
                          ) : (
                            <span className="text-amber-700 font-medium text-[11px] bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                              Unassigned
                            </span>
                          )}
                        </td>

                        {/* Decision */}
                        <td className="py-3 px-3">
                          <DecisionBadge decision={decision} />
                        </td>

                        {/* Action */}
                        <td className="py-3 px-4 text-right">
                          <Link
                            href="/reviews"
                            className="inline-flex items-center text-xs font-medium text-emerald-800 hover:text-emerald-950"
                          >
                            Review
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Secondary Section: Reviews Due Within 7 Days */}
      {urgentReviews.length > 0 && (
        <Card className="border-stone-200 bg-white shadow-2xs">
          <CardHeader className="p-4 pb-2 border-b border-stone-100 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold text-zinc-900 flex items-center gap-1.5">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <span>Reviews Due Within 7 Days</span>
              </CardTitle>
              <p className="text-xs text-zinc-500 mt-0.5">
                Target review deadlines scheduled 7 days prior to vendor billing.
              </p>
            </div>
            <Link
              href="/reviews"
              className="text-xs font-medium text-emerald-800 hover:text-emerald-900 inline-flex items-center gap-1"
            >
              <span>Manage reviews</span>
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          </CardHeader>

          <CardContent className="p-4 pt-3">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {urgentReviews.map((review) => {
                const days = review.due_date ? daysUntil(review.due_date) : null;
                return (
                  <div
                    key={review.id}
                    className="p-3 rounded-md bg-stone-50 border border-stone-200/90 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-semibold text-zinc-900 text-xs truncate">
                          {review.subscription.vendor}
                        </span>
                        <DecisionBadge decision={review.decision} />
                      </div>
                      <p className="text-[11px] text-zinc-500 mt-1">
                        Due: <span className="font-mono">{review.due_date ? formatDate(review.due_date) : "Immediate"}</span>
                        {days !== null && <span className="ml-1 text-amber-700 font-medium">({days}d)</span>}
                      </p>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-stone-200/60 flex items-center justify-between text-xs">
                      <span className="text-[11px] text-zinc-600 truncate">
                        {review.owner ?? "No owner"}
                      </span>
                      <Link
                        href="/reviews"
                        className="text-[11px] font-medium text-emerald-800 hover:underline"
                      >
                        Open review
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default async function OverviewPage() {
  await requireSession();

  return (
    <div className="space-y-5">
      {/* Top Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-1 border-b border-stone-200/80">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900">
            Overview
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Decision control center for SaaS subscriptions approaching renewal.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/subscriptions"
            className="inline-flex items-center justify-center h-8 px-2.5 rounded-lg border border-stone-200 bg-white text-xs font-medium text-zinc-700 hover:bg-stone-50 transition-colors"
          >
            Manage Subscriptions
          </Link>
          <Link
            href="/reviews"
            className="inline-flex items-center justify-center h-8 px-2.5 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-xs font-medium text-white transition-colors"
          >
            Open Reviews
          </Link>
        </div>
      </div>

      {/* Main Content with Suspense */}
      <Suspense fallback={<OverviewSkeleton />}>
        <OverviewDataView />
      </Suspense>
    </div>
  );
}
