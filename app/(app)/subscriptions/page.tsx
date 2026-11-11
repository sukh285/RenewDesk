"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  Plus,
  Search,
  Pencil,
  Eye,
  X,
  Filter,
  RotateCcw,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Ban,
  HelpCircle,
  Calendar,
  User,
  FileText,
  History,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  SubscriptionWithReview,
  ActivityLogEntry,
  paiseTo_inr,
  BillingCycle,
} from "@/lib/db/types";
import { formatDate, daysUntil } from "@/lib/dates";

// ---- Visual Helpers ----

function VendorAvatar({ vendor }: { vendor: string }) {
  const initial = vendor ? vendor.charAt(0).toUpperCase() : "?";
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
        {days}d
      </span>
    );
  }
  if (days <= 30) {
    return (
      <span className="inline-flex items-center text-xs font-medium text-zinc-700 bg-stone-100 border border-stone-200 px-1.5 py-0.5 rounded">
        {days}d
      </span>
    );
  }
  return <span className="text-xs text-zinc-500">{days}d</span>;
}

// ---- Add/Edit Subscription Sheet ----

interface AddEditSheetProps {
  open: boolean;
  onClose: () => void;
  subscription?: SubscriptionWithReview;
  onSaved: () => void;
}

function AddEditSubscriptionSheet({
  open,
  onClose,
  subscription,
  onSaved,
}: AddEditSheetProps) {
  const isEdit = !!subscription;

  const [vendor, setVendor] = useState("");
  const [amountRupees, setAmountRupees] = useState("");
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  const [renewal, setRenewal] = useState("");
  const [owner, setOwner] = useState("");
  const [context, setContext] = useState("");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      setVendor(subscription?.vendor ?? "");
      setAmountRupees(
        subscription ? String(subscription.amount_paise / 100) : ""
      );
      setCycle(subscription?.billing_cycle ?? "monthly");
      setRenewal(subscription?.next_renewal ?? "");
      setOwner(subscription?.owner ?? "");
      setContext(subscription?.context ?? "");
      setErrors({});
    }
  }, [open, subscription]);

  function validate() {
    const errs: Record<string, string> = {};
    if (!vendor.trim()) errs.vendor = "Vendor name is required";
    const amt = parseFloat(amountRupees);
    if (!amountRupees || isNaN(amt) || amt <= 0) {
      errs.amount = "Enter a valid amount in INR (e.g. 1650)";
    }
    if (!renewal) errs.renewal = "Next renewal date is required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);

    try {
      const amount_paise = Math.round(parseFloat(amountRupees) * 100);

      if (isEdit) {
        const res = await fetch(`/api/subscriptions/${subscription.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            version: subscription.version,
            vendor: vendor.trim(),
            amount_paise,
            billing_cycle: cycle,
            next_renewal: renewal,
            owner: owner.trim() || null,
            context: context.trim() || null,
          }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.error ?? "Failed to update subscription");
        }

        toast.success(`Updated ${vendor.trim()}`);
      } else {
        const res = await fetch("/api/subscriptions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            vendor: vendor.trim(),
            amount_paise,
            billing_cycle: cycle,
            next_renewal: renewal,
            owner: owner.trim() || null,
            context: context.trim() || null,
          }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.error ?? "Failed to create subscription");
        }

        toast.success(`Subscription added. Review due 7 days prior to renewal.`);
      }

      onSaved();
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent className="w-full sm:max-w-md p-6 bg-white overflow-y-auto">
        <SheetHeader className="pb-4 border-b border-stone-100">
          <SheetTitle className="text-base font-semibold text-zinc-900">
            {isEdit ? `Edit ${subscription?.vendor}` : "Add New Subscription"}
          </SheetTitle>
          <p className="text-xs text-zinc-500 mt-0.5">
            {isEdit
              ? "Update subscription terms, owner, or business context."
              : "Register a software tool to track renewal decisions and ownership."}
          </p>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Vendor */}
          <div className="space-y-1.5">
            <Label htmlFor="vendor" className="text-xs font-medium text-zinc-700">
              Vendor / Software Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="vendor"
              placeholder="e.g. Notion, Figma, Slack"
              value={vendor}
              onChange={(e) => setVendor(e.target.value)}
              className="h-8 text-xs bg-stone-50/50 border-stone-200"
            />
            {errors.vendor && (
              <p className="text-[11px] text-red-600">{errors.vendor}</p>
            )}
          </div>

          {/* Amount & Cycle */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="amount" className="text-xs font-medium text-zinc-700">
                Amount (INR) <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-zinc-500 font-mono">
                  ₹
                </span>
                <Input
                  id="amount"
                  type="number"
                  step="any"
                  min="0"
                  placeholder="1650"
                  value={amountRupees}
                  onChange={(e) => setAmountRupees(e.target.value)}
                  className="h-8 text-xs pl-6 font-mono tabular-nums bg-stone-50/50 border-stone-200"
                />
              </div>
              {errors.amount && (
                <p className="text-[11px] text-red-600">{errors.amount}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cycle" className="text-xs font-medium text-zinc-700">
                Billing Cycle <span className="text-red-500">*</span>
              </Label>
              <Select
                value={cycle}
                onValueChange={(val) => {
                  if (val) setCycle(val as BillingCycle);
                }}
              >
                <SelectTrigger id="cycle" className="h-8 text-xs bg-stone-50/50 border-stone-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly" className="text-xs">Monthly</SelectItem>
                  <SelectItem value="annual" className="text-xs">Annual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Next Renewal Date */}
          <div className="space-y-1.5">
            <Label htmlFor="renewal" className="text-xs font-medium text-zinc-700">
              Next Renewal Date <span className="text-red-500">*</span>
            </Label>
            <Input
              id="renewal"
              type="date"
              value={renewal}
              onChange={(e) => setRenewal(e.target.value)}
              className="h-8 text-xs font-mono bg-stone-50/50 border-stone-200"
            />
            {errors.renewal && (
              <p className="text-[11px] text-red-600">{errors.renewal}</p>
            )}
            <p className="text-[11px] text-zinc-500">
              Review will be scheduled 7 days prior in Asia/Kolkata timezone.
            </p>
          </div>

          {/* Owner */}
          <div className="space-y-1.5">
            <Label htmlFor="owner" className="text-xs font-medium text-zinc-700">
              Decision Owner
            </Label>
            <Input
              id="owner"
              placeholder="e.g. Priya Sharma"
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              className="h-8 text-xs bg-stone-50/50 border-stone-200"
            />
            <p className="text-[11px] text-zinc-500">
              Team member accountable for the keep or cancel verdict.
            </p>
          </div>

          {/* Context / Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="context" className="text-xs font-medium text-zinc-700">
              Usage & Context
            </Label>
            <Textarea
              id="context"
              placeholder="e.g. 8 team seats, used daily by design team. Evaluating tier downgrade."
              rows={3}
              value={context}
              onChange={(e) => setContext(e.target.value)}
              className="text-xs bg-stone-50/50 border-stone-200"
            />
          </div>

          <div className="pt-3 border-t border-stone-100 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={saving}
              className="h-8 text-xs border-stone-200"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={saving}
              className="h-8 text-xs bg-emerald-800 hover:bg-emerald-900 text-white"
            >
              {saving ? "Saving..." : isEdit ? "Save Changes" : "Add Subscription"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

// ---- Detail Drawer ----

interface DetailDrawerProps {
  subscription: SubscriptionWithReview | null;
  open: boolean;
  onClose: () => void;
  onEdit: (sub: SubscriptionWithReview) => void;
}

function SubscriptionDetailDrawer({
  subscription,
  open,
  onClose,
  onEdit,
}: DetailDrawerProps) {
  const [activity, setActivity] = useState<ActivityLogEntry[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(false);

  useEffect(() => {
    if (open && subscription) {
      setLoadingActivity(true);
      fetch(`/api/subscriptions/${subscription.id}`)
        .then((r) => r.json())
        .then((res) => {
          if (res?.ok && res?.data?.activity) {
            setActivity(res.data.activity);
          }
        })
        .catch(() => {})
        .finally(() => setLoadingActivity(false));
    }
  }, [open, subscription]);

  if (!subscription) return null;

  const days = daysUntil(subscription.next_renewal);
  const review = subscription.current_review;

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent className="w-full sm:max-w-lg p-6 bg-white overflow-y-auto">
        <SheetHeader className="pb-3 border-b border-stone-100 flex flex-row items-start justify-between">
          <div className="flex items-center gap-3">
            <VendorAvatar vendor={subscription.vendor} />
            <div>
              <SheetTitle className="text-base font-semibold text-zinc-900">
                {subscription.vendor}
              </SheetTitle>
              <p className="text-xs text-zinc-500 capitalize">
                {subscription.billing_cycle} Subscription
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              onClose();
              onEdit(subscription);
            }}
            className="h-7 text-xs border-stone-200 gap-1.5"
          >
            <Pencil className="h-3 w-3" />
            <span>Edit</span>
          </Button>
        </SheetHeader>

        <div className="mt-5 space-y-5 text-xs">
          {/* Key Metric Grid */}
          <div className="grid grid-cols-2 gap-3 p-3 bg-stone-50 rounded-lg border border-stone-200/80">
            <div>
              <span className="text-[11px] text-zinc-500">Amount per cycle</span>
              <p className="text-sm font-semibold text-zinc-900 font-mono mt-0.5">
                {paiseTo_inr(subscription.amount_paise)}
              </p>
            </div>
            <div>
              <span className="text-[11px] text-zinc-500">Next renewal</span>
              <p className="text-sm font-semibold text-zinc-900 font-mono mt-0.5">
                {formatDate(subscription.next_renewal)}
              </p>
            </div>
            <div>
              <span className="text-[11px] text-zinc-500">Urgency</span>
              <div className="mt-1">
                <UrgencyBadge days={days} />
              </div>
            </div>
            <div>
              <span className="text-[11px] text-zinc-500">Decision owner</span>
              <p className="text-xs font-medium text-zinc-800 mt-1">
                {subscription.owner ?? "Unassigned"}
              </p>
            </div>
          </div>

          {/* Context */}
          <div>
            <h4 className="text-xs font-semibold text-zinc-700 uppercase tracking-wider text-[11px] mb-1.5">
              Business Context
            </h4>
            <div className="p-3 bg-stone-50/60 rounded border border-stone-200/60 text-zinc-700 leading-normal">
              {subscription.context || "No context recorded for this subscription."}
            </div>
          </div>

          {/* Current Review Details */}
          <div>
            <h4 className="text-xs font-semibold text-zinc-700 uppercase tracking-wider text-[11px] mb-1.5">
              Current Renewal Review
            </h4>
            {review ? (
              <div className="p-3 bg-stone-50 rounded border border-stone-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-zinc-500">Decision Verdict:</span>
                  <DecisionBadge decision={review.decision} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-zinc-500">Review Due Date:</span>
                  <span className="font-mono text-[11px] text-zinc-800">
                    {review.due_date ? formatDate(review.due_date) : "Immediate"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-zinc-500">Action Status:</span>
                  <span className="font-medium text-[11px] text-zinc-700 capitalize">
                    {review.action_status}
                  </span>
                </div>
                {review.rationale && (
                  <div className="pt-2 border-t border-stone-200/60">
                    <span className="text-[11px] text-zinc-500 font-medium">Rationale:</span>
                    <p className="text-[11px] text-zinc-700 mt-0.5">{review.rationale}</p>
                  </div>
                )}
                {review.checklist && review.checklist.length > 0 && (
                  <div className="pt-2 border-t border-stone-200/60 space-y-1">
                    <span className="text-[11px] text-zinc-500 font-medium">Checklist:</span>
                    {review.checklist.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-1.5 text-[11px] text-zinc-700">
                        <span className={item.done ? "text-emerald-600" : "text-zinc-400"}>
                          {item.done ? "✓" : "○"}
                        </span>
                        <span className={item.done ? "line-through text-zinc-400" : ""}>
                          {item.text}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3 text-center text-zinc-500 bg-stone-50 rounded border border-stone-200">
                No active review linked.
              </div>
            )}
          </div>

          {/* Activity History */}
          <div>
            <h4 className="text-xs font-semibold text-zinc-700 uppercase tracking-wider text-[11px] mb-1.5">
              Recent Activity
            </h4>
            {loadingActivity ? (
              <div className="space-y-1.5">
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
              </div>
            ) : activity.length === 0 ? (
              <p className="text-zinc-400 italic text-[11px]">No activity logged yet.</p>
            ) : (
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {activity.map((entry) => (
                  <div
                    key={entry.id}
                    className="p-2 rounded bg-stone-50 border border-stone-100 flex items-center justify-between text-[11px]"
                  >
                    <div>
                      <span className="font-semibold text-zinc-800 capitalize mr-1.5">
                        {entry.actor}:
                      </span>
                      <span className="text-zinc-600">{entry.action.replace(/_/g, " ")}</span>
                    </div>
                    <span className="text-[10px] text-zinc-600 font-mono">
                      {new Date(entry.created_at).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ---- Main Subscriptions Page ----

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<SubscriptionWithReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCycle, setFilterCycle] = useState<string>("all");
  const [filterDecision, setFilterDecision] = useState<string>("all");

  const [addEditOpen, setAddEditOpen] = useState(false);
  const [editingSub, setEditingSub] = useState<SubscriptionWithReview | undefined>();
  const [detailSub, setDetailSub] = useState<SubscriptionWithReview | null>(null);

  const fetchSubscriptions = useCallback(async () => {
    try {
      const res = await fetch("/api/subscriptions");
      const json = await res.json();
      if (json?.ok && Array.isArray(json.data)) {
        setSubscriptions(json.data);
      }
    } catch {
      toast.error("Failed to load subscriptions");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubscriptions();
  }, [fetchSubscriptions]);

  // Client-side filtering
  const filtered = subscriptions.filter((sub) => {
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchVendor = sub.vendor.toLowerCase().includes(q);
      const matchOwner = sub.owner?.toLowerCase().includes(q);
      const matchContext = sub.context?.toLowerCase().includes(q);
      if (!matchVendor && !matchOwner && !matchContext) return false;
    }

    if (filterCycle !== "all" && sub.billing_cycle !== filterCycle) {
      return false;
    }

    if (filterDecision !== "all") {
      const dec = sub.current_review?.decision ?? "undecided";
      if (dec !== filterDecision) return false;
    }

    return true;
  });

  const hasActiveFilters = search.trim() !== "" || filterCycle !== "all" || filterDecision !== "all";

  function resetFilters() {
    setSearch("");
    setFilterCycle("all");
    setFilterDecision("all");
  }

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-1 border-b border-stone-200/80">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900">
            Subscriptions
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Maintain paid software inventory, active ownership, and upcoming billing terms.
          </p>
        </div>

        <Button
          onClick={() => {
            setEditingSub(undefined);
            setAddEditOpen(true);
          }}
          size="sm"
          className="h-8 text-xs font-medium bg-emerald-800 hover:bg-emerald-900 text-white gap-1.5"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Add Subscription</span>
        </Button>
      </div>

      {/* Filter / Search Bar */}
      <div className="p-3 bg-white rounded-lg border border-stone-200 depth-card space-y-2.5">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
            <Input
              placeholder="Search vendor, owner, or context..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 text-xs pl-8 bg-stone-50/50 border-stone-200 w-full"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Cycle Filter */}
          <Select value={filterCycle} onValueChange={(val) => setFilterCycle(val || "all")}>
            <SelectTrigger className="h-8 w-full sm:w-36 text-xs bg-stone-50/50 border-stone-200">
              <SelectValue placeholder="All cycles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All Cycles</SelectItem>
              <SelectItem value="monthly" className="text-xs">Monthly</SelectItem>
              <SelectItem value="annual" className="text-xs">Annual</SelectItem>
            </SelectContent>
          </Select>

          {/* Decision Filter */}
          <Select value={filterDecision} onValueChange={(val) => setFilterDecision(val || "all")}>
            <SelectTrigger className="h-8 w-full sm:w-40 text-xs bg-stone-50/50 border-stone-200">
              <SelectValue placeholder="All decisions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All Decisions</SelectItem>
              <SelectItem value="undecided" className="text-xs">Undecided</SelectItem>
              <SelectItem value="keep" className="text-xs">Keep</SelectItem>
              <SelectItem value="cancel" className="text-xs">Cancel</SelectItem>
              <SelectItem value="need_info" className="text-xs">Need Info</SelectItem>
            </SelectContent>
          </Select>

          {/* Reset Filters */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="h-8 px-2.5 text-xs text-zinc-500 hover:text-zinc-800"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Main Table */}
      <Card className="border-stone-200 bg-white depth-card overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <p className="text-sm font-semibold text-zinc-800">
                No subscriptions found
              </p>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                {hasActiveFilters
                  ? "Try resetting your search query or status filters."
                  : "Start by registering your first vendor subscription."}
              </p>
              {hasActiveFilters && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetFilters}
                  className="mt-2 h-7 text-xs border-stone-200"
                >
                  Reset filters
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-stone-200/80 bg-stone-50/70 text-zinc-600 font-medium uppercase tracking-wider text-[11px]">
                    <th className="py-2.5 px-4">Vendor</th>
                    <th className="py-2.5 px-3">Price & Cycle</th>
                    <th className="py-2.5 px-3">Next Renewal</th>
                    <th className="py-2.5 px-3">Urgency</th>
                    <th className="py-2.5 px-3">Decision Owner</th>
                    <th className="py-2.5 px-3">Review State</th>
                    <th className="py-2.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filtered.map((sub) => {
                    const days = daysUntil(sub.next_renewal);
                    const decision = sub.current_review?.decision ?? "undecided";

                    return (
                      <tr
                        key={sub.id}
                        className="hover:bg-stone-50/60 transition-colors group"
                      >
                        {/* Vendor */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <VendorAvatar vendor={sub.vendor} />
                            <div>
                              <button
                                type="button"
                                onClick={() => setDetailSub(sub)}
                                className="font-semibold text-zinc-900 hover:text-emerald-800 text-left cursor-pointer"
                              >
                                {sub.vendor}
                              </button>
                              {sub.context && (
                                <p className="text-[11px] text-zinc-600 truncate max-w-[220px]">
                                  {sub.context}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Price & Cycle */}
                        <td className="py-3 px-3">
                          <span className="font-mono font-medium text-zinc-900 tabular-nums">
                            {paiseTo_inr(sub.amount_paise)}
                          </span>
                          <span className="text-[11px] text-zinc-600 ml-1 capitalize">
                            / {sub.billing_cycle === "monthly" ? "mo" : "yr"}
                          </span>
                        </td>

                        {/* Next Renewal */}
                        <td className="py-3 px-3 font-mono text-[11px] text-zinc-700">
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

                        {/* Review State */}
                        <td className="py-3 px-3">
                          <DecisionBadge decision={decision} />
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right space-x-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDetailSub(sub)}
                            className="h-7 w-7 text-zinc-600 hover:text-zinc-900"
                            title="View details"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditingSub(sub);
                              setAddEditOpen(true);
                            }}
                            className="h-7 w-7 text-zinc-600 hover:text-emerald-800"
                            title="Edit subscription"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
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

      {/* Add / Edit Sheet */}
      <AddEditSubscriptionSheet
        open={addEditOpen}
        onClose={() => setAddEditOpen(false)}
        subscription={editingSub}
        onSaved={fetchSubscriptions}
      />

      {/* Detail Drawer */}
      <SubscriptionDetailDrawer
        subscription={detailSub}
        open={!!detailSub}
        onClose={() => setDetailSub(null)}
        onEdit={(sub) => {
          setEditingSub(sub);
          setAddEditOpen(true);
        }}
      />
    </div>
  );
}
