"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Plus, Search, Pencil, Eye, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  SubscriptionWithReview,
  ActivityLogEntry,
  paiseTo_inr,
  BillingCycle,
} from "@/lib/db/types";
import { formatDate, daysUntil } from "@/lib/dates";

// ---- Helpers ----

function formatINR(paise: number) {
  return paiseTo_inr(paise);
}

function cycleBadge(cycle: BillingCycle) {
  return (
    <span className="inline-flex items-center rounded-full border border-zinc-200 bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700 capitalize">
      {cycle === "monthly" ? "Monthly" : "Annual"}
    </span>
  );
}

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

function DaysCell({ dateStr }: { dateStr: string }) {
  const days = daysUntil(dateStr);
  if (days <= 7)
    return (
      <span className="font-medium text-red-600">
        {days < 0 ? "Overdue" : days === 0 ? "Today" : `${days}d`}
      </span>
    );
  if (days <= 30)
    return <span className="font-medium text-amber-600">{days}d</span>;
  return <span className="text-zinc-500">{days}d</span>;
}

// ---- Add/Edit Sheet ----

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
  const [cycle, setCycle] = useState<BillingCycle>("annual");
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
      setCycle(subscription?.billing_cycle ?? "annual");
      setRenewal(subscription?.next_renewal ?? "");
      setOwner(subscription?.owner ?? "");
      setContext(subscription?.context ?? "");
      setErrors({});
    }
  }, [open, subscription]);

  function validate() {
    const e: Record<string, string> = {};
    if (!vendor.trim()) e.vendor = "Vendor name is required";
    const amt = parseFloat(amountRupees);
    if (!amountRupees || isNaN(amt) || amt <= 0)
      e.amount = "Enter a valid amount in INR";
    if (!renewal) e.renewal = "Renewal date is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const amount_paise = Math.round(parseFloat(amountRupees) * 100);
      const body = {
        vendor: vendor.trim(),
        amount_paise,
        billing_cycle: cycle,
        next_renewal: renewal,
        owner: owner.trim() || null,
        context: context.trim() || null,
        ...(isEdit ? { id: subscription!.id, version: subscription!.version } : {}),
      };

      const url = isEdit
        ? `/api/subscriptions/${subscription!.id}`
        : "/api/subscriptions";
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const json = await res.json();
      if (!res.ok || !json.ok) {
        toast.error(json.error ?? "Failed to save subscription");
        return;
      }

      if (isEdit) {
        toast.success("Subscription updated.");
      } else {
        const dueDate = json.data?.subscription
          ? formatDate(renewal)
          : formatDate(renewal);
        toast.success(`Subscription added. Review due on ${dueDate}.`);
      }

      onSaved();
      onClose();
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {isEdit ? "Edit subscription" : "Add subscription"}
          </SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5 px-1">
          {/* Vendor */}
          <div className="space-y-1.5">
            <Label htmlFor="vendor">
              Vendor <span className="text-red-500">*</span>
            </Label>
            <Input
              id="vendor"
              value={vendor}
              onChange={(e) => setVendor(e.target.value)}
              placeholder="e.g. Notion, Linear, AWS"
              autoFocus
            />
            {errors.vendor && (
              <p className="text-xs text-red-600">{errors.vendor}</p>
            )}
          </div>

          {/* Amount */}
          <div className="space-y-1.5">
            <Label htmlFor="amount">
              Amount (INR) <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">
                ₹
              </span>
              <Input
                id="amount"
                type="number"
                min="1"
                step="0.01"
                value={amountRupees}
                onChange={(e) => setAmountRupees(e.target.value)}
                placeholder="5000"
                className="pl-7"
              />
            </div>
            {errors.amount && (
              <p className="text-xs text-red-600">{errors.amount}</p>
            )}
          </div>

          {/* Billing cycle */}
          <div className="space-y-1.5">
            <Label>
              Billing cycle <span className="text-red-500">*</span>
            </Label>
            <Select
              value={cycle}
              onValueChange={(v) => setCycle(v as BillingCycle)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="annual">Annual</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Renewal date */}
          <div className="space-y-1.5">
            <Label htmlFor="renewal">
              Next renewal date <span className="text-red-500">*</span>
            </Label>
            <Input
              id="renewal"
              type="date"
              value={renewal}
              onChange={(e) => setRenewal(e.target.value)}
            />
            {errors.renewal && (
              <p className="text-xs text-red-600">{errors.renewal}</p>
            )}
          </div>

          {/* Owner */}
          <div className="space-y-1.5">
            <Label htmlFor="owner">Owner</Label>
            <Input
              id="owner"
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              placeholder="e.g. Priya, Engineering team"
            />
          </div>

          {/* Context */}
          <div className="space-y-1.5">
            <Label htmlFor="context">Context</Label>
            <Textarea
              id="context"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Why we use this, who relies on it, relevant notes..."
              rows={3}
            />
          </div>

          <SheetFooter className="pt-2">
            <SheetClose asChild>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
            </SheetClose>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : isEdit ? "Save changes" : "Add subscription"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

// ---- Detail Drawer ----

interface DetailDrawerProps {
  open: boolean;
  onClose: () => void;
  subscription: SubscriptionWithReview | null;
  onUpdated: () => void;
}

function SubscriptionDetailDrawer({
  open,
  onClose,
  subscription,
  onUpdated,
}: DetailDrawerProps) {
  const [contextEdit, setContextEdit] = useState("");
  const [savingContext, setSavingContext] = useState(false);
  const [activity, setActivity] = useState<ActivityLogEntry[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(false);

  useEffect(() => {
    if (open && subscription) {
      setContextEdit(subscription.context ?? "");
      loadActivity(subscription.id);
    }
  }, [open, subscription]);

  async function loadActivity(id: string) {
    setLoadingActivity(true);
    try {
      const res = await fetch(`/api/subscriptions/${id}`);
      const json = await res.json();
      if (json.ok && json.data?.activity) {
        setActivity(json.data.activity);
      }
    } catch {
      // non-critical
    } finally {
      setLoadingActivity(false);
    }
  }

  async function saveContext() {
    if (!subscription) return;
    setSavingContext(true);
    try {
      const res = await fetch(`/api/subscriptions/${subscription.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: subscription.id,
          version: subscription.version,
          context: contextEdit.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        toast.error(json.error ?? "Failed to save context");
        return;
      }
      toast.success("Context saved.");
      onUpdated();
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setSavingContext(false);
    }
  }

  if (!subscription) return null;
  const review = subscription.current_review;

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="right"
        style={{ maxWidth: 600 }}
        className="w-full overflow-y-auto"
      >
        <SheetHeader>
          <SheetTitle className="text-lg">{subscription.vendor}</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6 px-1">
          {/* Basic details */}
          <section className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400 mb-0.5">
                Amount
              </p>
              <p className="font-semibold text-zinc-900">
                {formatINR(subscription.amount_paise)}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400 mb-0.5">
                Cycle
              </p>
              <p className="capitalize text-zinc-700">
                {subscription.billing_cycle}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400 mb-0.5">
                Next renewal
              </p>
              <p className="text-zinc-700">
                {formatDate(subscription.next_renewal)}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400 mb-0.5">
                Owner
              </p>
              <p className="text-zinc-700">
                {subscription.owner ?? (
                  <span className="text-zinc-400 italic">Unassigned</span>
                )}
              </p>
            </div>
          </section>

          {/* Context */}
          <section>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400 mb-2">
              Context
            </p>
            <Textarea
              value={contextEdit}
              onChange={(e) => setContextEdit(e.target.value)}
              rows={3}
              placeholder="Why we use this, who relies on it..."
              className="text-sm"
            />
            <Button
              size="sm"
              className="mt-2"
              onClick={saveContext}
              disabled={savingContext}
            >
              {savingContext ? "Saving..." : "Save context"}
            </Button>
          </section>

          {/* Current review */}
          {review && (
            <section>
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400 mb-3">
                Current review
              </p>
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  {decisionBadge(review.decision)}
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${
                      review.action_status === "completed"
                        ? "bg-zinc-100 text-zinc-600 border-zinc-200"
                        : "bg-white text-zinc-700 border-zinc-300"
                    }`}
                  >
                    {review.action_status === "completed" ? "Completed" : "Open"}
                  </span>
                </div>
                {review.owner && (
                  <p>
                    <span className="text-zinc-400">Owner:</span>{" "}
                    {review.owner}
                  </p>
                )}
                {review.due_date && (
                  <p>
                    <span className="text-zinc-400">Due:</span>{" "}
                    {formatDate(review.due_date)}
                  </p>
                )}
                {review.rationale && (
                  <div>
                    <p className="text-zinc-400 mb-1">Rationale:</p>
                    <p className="text-zinc-700">{review.rationale}</p>
                  </div>
                )}
                {review.checklist && review.checklist.length > 0 && (
                  <div>
                    <p className="text-zinc-400 mb-1">
                      Checklist:{" "}
                      {review.checklist.filter((c) => c.done).length}/
                      {review.checklist.length} done
                    </p>
                    <ul className="space-y-1">
                      {review.checklist.map((item, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <span
                            className={`inline-block w-3.5 h-3.5 rounded border flex-shrink-0 ${
                              item.done
                                ? "bg-emerald-500 border-emerald-500"
                                : "border-zinc-300"
                            }`}
                          />
                          <span
                            className={
                              item.done
                                ? "line-through text-zinc-400"
                                : "text-zinc-700"
                            }
                          >
                            {item.text}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Activity log */}
          <section>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400 mb-3">
              Activity log
            </p>
            {loadingActivity ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ) : activity.length === 0 ? (
              <p className="text-sm text-zinc-400">No activity yet.</p>
            ) : (
              <ul className="space-y-2">
                {activity.slice(0, 10).map((entry) => (
                  <li
                    key={entry.id}
                    className="flex items-start gap-2 text-xs text-zinc-600"
                  >
                    <span className="mt-0.5 inline-block w-1.5 h-1.5 rounded-full bg-zinc-300 flex-shrink-0" />
                    <span>
                      <span className="font-medium capitalize">
                        {entry.actor}
                      </span>{" "}
                      {entry.action.replace(/_/g, " ")}{" "}
                      <span className="text-zinc-400">
                        {new Date(entry.created_at).toLocaleString("en-IN", {
                          timeZone: "Asia/Kolkata",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ---- Main Page ----

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<SubscriptionWithReview[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCycle, setFilterCycle] = useState<string>("all");
  const [filterDecision, setFilterDecision] = useState<string>("all");

  const [addEditOpen, setAddEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<SubscriptionWithReview | undefined>(
    undefined
  );
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailTarget, setDetailTarget] = useState<SubscriptionWithReview | null>(
    null
  );

  const loadSubscriptions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/subscriptions");
      const json = await res.json();
      if (json.ok) {
        setSubscriptions(json.data);
      } else {
        toast.error(json.error ?? "Failed to load subscriptions");
      }
    } catch {
      toast.error("Failed to load subscriptions");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSubscriptions();
  }, [loadSubscriptions]);

  const filtered = subscriptions.filter((sub) => {
    const matchSearch = sub.vendor
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchCycle =
      filterCycle === "all" || sub.billing_cycle === filterCycle;
    const matchDecision =
      filterDecision === "all" ||
      (sub.current_review?.decision ?? "undecided") === filterDecision;
    return matchSearch && matchCycle && matchDecision;
  });

  function openAdd() {
    setEditTarget(undefined);
    setAddEditOpen(true);
  }

  function openEdit(sub: SubscriptionWithReview) {
    setEditTarget(sub);
    setAddEditOpen(true);
  }

  function openDetail(sub: SubscriptionWithReview) {
    setDetailTarget(sub);
    setDetailOpen(true);
  }

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-zinc-900">Subscriptions</h1>
        <Button onClick={openAdd} className="shrink-0">
          <Plus className="mr-2 h-4 w-4" />
          Add subscription
        </Button>
      </div>

      {/* Filters */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <Input
            placeholder="Search vendor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <Select value={filterCycle} onValueChange={(val) => setFilterCycle(val ?? "all")}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All cycles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All cycles</SelectItem>
            <SelectItem value="monthly">Monthly</SelectItem>
            <SelectItem value="annual">Annual</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterDecision} onValueChange={(val) => setFilterDecision(val ?? "all")}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All decisions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All decisions</SelectItem>
            <SelectItem value="undecided">Undecided</SelectItem>
            <SelectItem value="keep">Keep</SelectItem>
            <SelectItem value="cancel">Cancel</SelectItem>
            <SelectItem value="need_info">Need info</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {loading ? (
        <Card>
          <CardContent className="pt-6 space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 py-16 text-center">
          <p className="text-sm text-zinc-500">
            {subscriptions.length === 0
              ? "No subscriptions yet. Add your first one."
              : "No subscriptions match your filters."}
          </p>
          {subscriptions.length === 0 && (
            <Button onClick={openAdd} variant="outline" className="mt-4">
              <Plus className="mr-2 h-4 w-4" />
              Add subscription
            </Button>
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-zinc-200 overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-zinc-50">
                  <TableHead className="font-semibold text-zinc-600">
                    Vendor
                  </TableHead>
                  <TableHead className="font-semibold text-zinc-600">
                    Amount
                  </TableHead>
                  <TableHead className="font-semibold text-zinc-600">
                    Cycle
                  </TableHead>
                  <TableHead className="font-semibold text-zinc-600">
                    Next renewal
                  </TableHead>
                  <TableHead className="font-semibold text-zinc-600">
                    Days
                  </TableHead>
                  <TableHead className="font-semibold text-zinc-600">
                    Owner
                  </TableHead>
                  <TableHead className="font-semibold text-zinc-600">
                    Decision
                  </TableHead>
                  <TableHead className="font-semibold text-zinc-600">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((sub) => (
                  <TableRow
                    key={sub.id}
                    className="hover:bg-zinc-50 transition-colors"
                  >
                    <TableCell className="font-medium text-zinc-900">
                      {sub.vendor}
                    </TableCell>
                    <TableCell className="tabular-nums text-zinc-700">
                      {formatINR(sub.amount_paise)}
                    </TableCell>
                    <TableCell>{cycleBadge(sub.billing_cycle)}</TableCell>
                    <TableCell className="text-zinc-600">
                      {formatDate(sub.next_renewal)}
                    </TableCell>
                    <TableCell>
                      <DaysCell dateStr={sub.next_renewal} />
                    </TableCell>
                    <TableCell className="text-zinc-600">
                      {sub.owner ?? (
                        <span className="text-zinc-400 italic text-sm">
                          Unassigned
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {decisionBadge(
                        sub.current_review?.decision ?? "undecided"
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openEdit(sub)}
                          title="Edit subscription"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          <span className="sr-only">Edit</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openDetail(sub)}
                          title="View details"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span className="sr-only">Details</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {filtered.length > 0 && (
        <p className="mt-3 text-xs text-zinc-400 text-right">
          {filtered.length} of {subscriptions.length} subscriptions
        </p>
      )}

      {/* Add/Edit sheet */}
      <AddEditSubscriptionSheet
        open={addEditOpen}
        onClose={() => setAddEditOpen(false)}
        subscription={editTarget}
        onSaved={loadSubscriptions}
      />

      {/* Detail drawer */}
      <SubscriptionDetailDrawer
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        subscription={detailTarget}
        onUpdated={loadSubscriptions}
      />
    </div>
  );
}
