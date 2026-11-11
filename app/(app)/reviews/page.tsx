"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  Ban,
  HelpCircle,
  Pencil,
  Plus,
  Trash2,
  ShieldAlert,
  Calendar,
  User,
  CheckSquare,
  AlertCircle,
  Archive,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import {
  ReviewWithSubscription,
  Decision,
  ChecklistItem,
  paiseTo_inr,
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

// ---- Edit Review Sheet ----

interface EditReviewSheetProps {
  open: boolean;
  onClose: () => void;
  review?: ReviewWithSubscription;
  onSaved: () => void;
}

function EditReviewSheet({
  open,
  onClose,
  review,
  onSaved,
}: EditReviewSheetProps) {
  const [decision, setDecision] = useState<Decision>("undecided");
  const [owner, setOwner] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [rationale, setRationale] = useState("");
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [newChecklistText, setNewChecklistText] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && review) {
      setDecision(review.decision);
      setOwner(review.owner ?? "");
      setDueDate(review.due_date ?? "");
      setRationale(review.rationale ?? "");
      setChecklist(review.checklist ? [...review.checklist] : []);
      setNewChecklistText("");
    }
  }, [open, review]);

  function addChecklistItem() {
    if (!newChecklistText.trim()) return;
    setChecklist([...checklist, { text: newChecklistText.trim(), done: false }]);
    setNewChecklistText("");
  }

  function removeChecklistItem(index: number) {
    setChecklist(checklist.filter((_, i) => i !== index));
  }

  function toggleChecklistItem(index: number) {
    setChecklist(
      checklist.map((item, i) =>
        i === index ? { ...item, done: !item.done } : item
      )
    );
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!review) return;
    setSaving(true);

    try {
      const res = await fetch(`/api/reviews/${review.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          version: review.version,
          decision,
          owner: owner.trim() || null,
          due_date: dueDate || undefined,
          rationale: rationale.trim() || null,
          checklist,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? "Failed to save review");
      }

      toast.success(
        decision === "cancel"
          ? "Decision saved. Cancellation still needs confirmation."
          : "Review decision saved."
      );
      onSaved();
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSaving(false);
    }
  }

  if (!review) return null;

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent className="w-full sm:max-w-md p-6 bg-white overflow-y-auto">
        <SheetHeader className="pb-3 border-b border-stone-100">
          <div className="flex items-center gap-2.5">
            <VendorAvatar vendor={review.subscription.vendor} />
            <div>
              <SheetTitle className="text-base font-semibold text-zinc-900">
                Review: {review.subscription.vendor}
              </SheetTitle>
              <p className="text-xs text-zinc-500 font-mono mt-0.5">
                Renews {formatDate(review.subscription.next_renewal)} ({paiseTo_inr(review.subscription.amount_paise)})
              </p>
            </div>
          </div>
        </SheetHeader>

        <form onSubmit={handleSave} className="mt-5 space-y-4 text-xs">
          {/* Decision */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-zinc-700">
              Renewal Decision <span className="text-red-500">*</span>
            </Label>
            <Select
              value={decision}
              onValueChange={(val) => {
                if (val) setDecision(val as Decision);
              }}
            >
              <SelectTrigger className="h-8 text-xs bg-stone-50/50 border-stone-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="undecided" className="text-xs">Undecided</SelectItem>
                <SelectItem value="keep" className="text-xs">Keep Subscription</SelectItem>
                <SelectItem value="cancel" className="text-xs">Cancel Subscription</SelectItem>
                <SelectItem value="need_info" className="text-xs">Need Information</SelectItem>
              </SelectContent>
            </Select>

            {/* Cancel Warning Notice */}
            {decision === "cancel" && (
              <div className="mt-2 p-2.5 rounded-md bg-red-50 border border-red-200 flex items-start gap-2 text-[11px] text-red-800">
                <AlertTriangle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
                <span>
                  A Cancel decision does not cancel the subscription. Cancellation must be completed with the vendor.
                </span>
              </div>
            )}
          </div>

          {/* Decision Owner */}
          <div className="space-y-1.5">
            <Label htmlFor="review-owner" className="text-xs font-medium text-zinc-700">
              Decision Owner
            </Label>
            <Input
              id="review-owner"
              placeholder="e.g. Priya Sharma"
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              className="h-8 text-xs bg-stone-50/50 border-stone-200"
            />
          </div>

          {/* Due Date */}
          <div className="space-y-1.5">
            <Label htmlFor="review-due" className="text-xs font-medium text-zinc-700">
              Review Due Date
            </Label>
            <Input
              id="review-due"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="h-8 text-xs font-mono bg-stone-50/50 border-stone-200"
            />
          </div>

          {/* Rationale */}
          <div className="space-y-1.5">
            <Label htmlFor="rationale" className="text-xs font-medium text-zinc-700">
              Decision Rationale & Context
            </Label>
            <Textarea
              id="rationale"
              placeholder="Why was this decision made? What was confirmed?"
              rows={3}
              value={rationale}
              onChange={(e) => setRationale(e.target.value)}
              className="text-xs bg-stone-50/50 border-stone-200"
            />
          </div>

          {/* Checklist */}
          <div className="space-y-2 pt-2 border-t border-stone-100">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium text-zinc-700">
                Verification Checklist
              </Label>
              <span className="text-[11px] text-zinc-500 font-mono">
                {checklist.filter((c) => c.done).length}/{checklist.length} done
              </span>
            </div>

            {checklist.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2 rounded bg-stone-50 border border-stone-200/60"
              >
                <label className="flex items-center gap-2 flex-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={item.done}
                    onChange={() => toggleChecklistItem(idx)}
                    className="h-3.5 w-3.5 rounded border-stone-300 text-emerald-800"
                  />
                  <span className={`text-xs ${item.done ? "line-through text-zinc-600" : "text-zinc-800"}`}>
                    {item.text}
                  </span>
                </label>
                <button
                  type="button"
                  onClick={() => removeChecklistItem(idx)}
                  className="text-zinc-400 hover:text-red-600 p-0.5"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}

            <div className="flex items-center gap-1.5 pt-1">
              <Input
                placeholder="Add checklist item..."
                value={newChecklistText}
                onChange={(e) => setNewChecklistText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addChecklistItem();
                  }
                }}
                className="h-7 text-xs bg-stone-50/50 border-stone-200 flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addChecklistItem}
                disabled={!newChecklistText.trim()}
                className="h-7 px-2 text-xs border-stone-200"
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Footer */}
          <div className="pt-4 border-t border-stone-100 flex items-center justify-end gap-2">
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
              {saving ? "Saving..." : "Save Review"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

// ---- Explicit Complete / Confirmation Dialog ----

interface CompleteDialogProps {
  review: ReviewWithSubscription | null;
  open: boolean;
  onClose: () => void;
  onCompleted: () => void;
}

function CompleteReviewDialog({
  review,
  open,
  onClose,
  onCompleted,
}: CompleteDialogProps) {
  const [confirmed, setConfirmed] = useState(false);
  const [note, setNote] = useState("");
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    if (open) {
      setConfirmed(false);
      setNote("");
    }
  }, [open]);

  if (!review) return null;

  const isCancel = review.decision === "cancel";

  async function handleConfirm() {
    if (!review) return;
    if (isCancel && !confirmed) {
      toast.error("Please confirm that you have completed cancellation with the vendor.");
      return;
    }

    setCompleting(true);
    try {
      const res = await fetch(`/api/reviews/${review.id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          version: review.version,
          completion_note: note.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? "Failed to complete review");
      }

      toast.success(
        isCancel
          ? "Cancellation confirmed and review completed."
          : "Review marked as completed."
      );
      onCompleted();
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setCompleting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md p-6 bg-white border-stone-200 text-xs">
        <DialogHeader className="pb-3 border-b border-stone-100">
          <DialogTitle className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
            {isCancel ? (
              <>
                <ShieldAlert className="h-4 w-4 text-red-600" />
                <span>Confirm Vendor Cancellation</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>Complete Renewal Review</span>
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="mt-3 space-y-3.5">
          {isCancel ? (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-900 leading-normal space-y-1.5">
              <p className="font-semibold text-xs">
                Action required outside RenewDesk:
              </p>
              <p className="text-[11px] text-red-800">
                Have you logged into {review.subscription.vendor} or contacted their billing team to cancel this subscription?
              </p>
              <p className="text-[11px] text-red-700">
                RenewDesk records your decision and outcomes. It does not cancel contracts automatically.
              </p>
            </div>
          ) : (
            <p className="text-zinc-600 leading-normal">
              Marking this review for {review.subscription.vendor} as completed locks this occurrence and saves the verified outcome to history.
            </p>
          )}

          {isCancel && (
            <label className="flex items-start gap-2.5 p-2.5 rounded bg-stone-50 border border-stone-200 cursor-pointer">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="h-4 w-4 rounded border-stone-300 text-red-600 mt-0.5"
              />
              <span className="text-xs text-zinc-800 font-medium">
                I confirm that I have contacted {review.subscription.vendor} and completed the necessary cancellation steps.
              </span>
            </label>
          )}

          <div className="space-y-1">
            <Label htmlFor="comp-note" className="text-xs font-medium text-zinc-700">
              Completion Note (Optional)
            </Label>
            <Textarea
              id="comp-note"
              placeholder={isCancel ? "e.g. Cancelled via billing portal on Nov 11" : "e.g. Budget approved for another cycle"}
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="text-xs bg-stone-50/50 border-stone-200"
            />
          </div>
        </div>

        <DialogFooter className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={completing}
            className="h-8 text-xs border-stone-200"
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleConfirm}
            disabled={completing || (isCancel && !confirmed)}
            className={`h-8 text-xs text-white ${
              isCancel
                ? "bg-red-700 hover:bg-red-800"
                : "bg-emerald-800 hover:bg-emerald-900"
            }`}
          >
            {completing
              ? "Confirming..."
              : isCancel
              ? "Confirm & Complete Cancellation"
              : "Mark Review Completed"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---- Main Reviews Page ----

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<ReviewWithSubscription[]>([]);
  const [loading, setLoading] = useState(true);

  const [editingReview, setEditingReview] = useState<ReviewWithSubscription | undefined>();
  const [completingReview, setCompletingReview] = useState<ReviewWithSubscription | null>(null);

  const fetchReviews = useCallback(async () => {
    try {
      const res = await fetch("/api/reviews");
      const json = await res.json();
      if (json?.ok && Array.isArray(json.data)) {
        setReviews(json.data);
      }
    } catch {
      toast.error("Failed to load reviews");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  // Group reviews into logical operational buckets
  const openReviews = reviews.filter((r) => r.action_status === "open");
  const completedReviews = reviews.filter((r) => r.action_status === "completed");

  const needingDecision = openReviews.filter(
    (r) => r.decision === "undecided" || r.decision === "need_info"
  );
  const keepReviews = openReviews.filter((r) => r.decision === "keep");
  const cancelReviews = openReviews.filter((r) => r.decision === "cancel");

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-1 border-b border-stone-200/80">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900">
            Renewal Reviews
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Own the keep or cancel decision for each upcoming subscription renewal.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-zinc-500 font-mono">
          <span>{openReviews.length} open</span>
          <span>•</span>
          <span>{completedReviews.length} completed</span>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Section 1: Needs Decision */}
          <section className="space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-stone-200">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-800">
                  Awaiting Decision ({needingDecision.length})
                </h2>
              </div>
              <span className="text-[11px] text-zinc-500">
                Requires owner and keep or cancel verdict
              </span>
            </div>

            {needingDecision.length === 0 ? (
              <p className="text-xs text-zinc-400 italic p-4 bg-white rounded border border-stone-200 text-center">
                All approaching reviews currently have a recorded decision.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {needingDecision.map((r) => (
                  <ReviewCard
                    key={r.id}
                    review={r}
                    onEdit={() => setEditingReview(r)}
                    onComplete={() => setCompletingReview(r)}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Section 2: Cancel Decisions (Vendor Action Required) */}
          <section className="space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-stone-200">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
                <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-800">
                  Cancel Verdicts Pending Vendor Action ({cancelReviews.length})
                </h2>
              </div>
              <span className="text-[11px] text-red-700 font-medium bg-red-50 px-2 py-0.5 rounded border border-red-200">
                Cancellation must be completed with the vendor
              </span>
            </div>

            {cancelReviews.length === 0 ? (
              <p className="text-xs text-zinc-400 italic p-4 bg-white rounded border border-stone-200 text-center">
                No open cancel verdicts pending vendor completion.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {cancelReviews.map((r) => (
                  <ReviewCard
                    key={r.id}
                    review={r}
                    onEdit={() => setEditingReview(r)}
                    onComplete={() => setCompletingReview(r)}
                    highlightCancel
                  />
                ))}
              </div>
            )}
          </section>

          {/* Section 3: Keep Decisions */}
          <section className="space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-stone-200">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-800">
                  Keep Verdicts ({keepReviews.length})
                </h2>
              </div>
              <span className="text-[11px] text-zinc-500">
                Decision confirmed to continue subscription
              </span>
            </div>

            {keepReviews.length === 0 ? (
              <p className="text-xs text-zinc-400 italic p-4 bg-white rounded border border-stone-200 text-center">
                No active subscriptions marked as keep awaiting completion.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {keepReviews.map((r) => (
                  <ReviewCard
                    key={r.id}
                    review={r}
                    onEdit={() => setEditingReview(r)}
                    onComplete={() => setCompletingReview(r)}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Section 4: Completed Archive */}
          {completedReviews.length > 0 && (
            <section className="space-y-3 pt-4 border-t border-stone-200/80">
              <div className="flex items-center justify-between pb-1 border-b border-stone-200">
                <div className="flex items-center gap-2 text-zinc-500">
                  <Archive className="h-3.5 w-3.5" />
                  <h2 className="text-xs font-semibold uppercase tracking-wider">
                    Completed Reviews Archive ({completedReviews.length})
                  </h2>
                </div>
                <span className="text-[11px] text-zinc-500">
                  Past review occurrences preserved for audit
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 opacity-80 hover:opacity-100 transition-opacity">
                {completedReviews.map((r) => (
                  <ReviewCard
                    key={r.id}
                    review={r}
                    onEdit={() => setEditingReview(r)}
                    onComplete={() => setCompletingReview(r)}
                    isArchived
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Edit Review Sheet */}
      <EditReviewSheet
        open={!!editingReview}
        onClose={() => setEditingReview(undefined)}
        review={editingReview}
        onSaved={fetchReviews}
      />

      {/* Complete Review Dialog */}
      <CompleteReviewDialog
        open={!!completingReview}
        onClose={() => setCompletingReview(null)}
        review={completingReview}
        onCompleted={fetchReviews}
      />
    </div>
  );
}

// ---- Individual Review Card ----

function ReviewCard({
  review,
  onEdit,
  onComplete,
  highlightCancel = false,
  isArchived = false,
}: {
  review: ReviewWithSubscription;
  onEdit: () => void;
  onComplete: () => void;
  highlightCancel?: boolean;
  isArchived?: boolean;
}) {
  const days = review.due_date ? daysUntil(review.due_date) : null;
  const sub = review.subscription;
  const checklistDone = review.checklist ? review.checklist.filter((c) => c.done).length : 0;
  const checklistTotal = review.checklist ? review.checklist.length : 0;

  return (
    <Card
      className={`border bg-white shadow-2xs text-xs flex flex-col justify-between ${
        highlightCancel
          ? "border-red-200 bg-red-50/20"
          : isArchived
          ? "border-stone-200/70 bg-stone-50/50"
          : "border-stone-200"
      }`}
    >
      <CardContent className="p-4 space-y-3">
        {/* Card Header: Vendor + Decision */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <VendorAvatar vendor={sub.vendor} />
            <div className="min-w-0">
              <h3 className="font-semibold text-zinc-900 truncate">{sub.vendor}</h3>
              <p className="text-[11px] text-zinc-500 font-mono">
                {paiseTo_inr(sub.amount_paise)} / {sub.billing_cycle === "monthly" ? "mo" : "yr"}
              </p>
            </div>
          </div>
          <DecisionBadge decision={review.decision} />
        </div>

        {/* Timelines & Owner */}
        <div className="space-y-1.5 pt-2 border-t border-stone-100 text-[11px] text-zinc-600">
          <div className="flex items-center justify-between">
            <span className="text-zinc-600">Next Renewal:</span>
            <span className="font-mono text-zinc-900 font-medium">
              {formatDate(sub.next_renewal)}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-zinc-600">Review Deadline:</span>
            <span className="font-mono text-zinc-900">
              {review.due_date ? formatDate(review.due_date) : "Immediate"}
              {days !== null && !isArchived && (
                <span className={`ml-1 font-sans ${days <= 7 ? "text-red-600 font-medium" : "text-zinc-500"}`}>
                  ({days <= 0 ? "Overdue" : `${days}d`})
                </span>
              )}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-zinc-600">Decision Owner:</span>
            <span className="text-zinc-900 font-medium">
              {review.owner ?? (
                <span className="text-amber-700 bg-amber-50 px-1 py-0.5 rounded border border-amber-200">
                  Unassigned
                </span>
              )}
            </span>
          </div>
        </div>

        {/* Rationale snippet if exists */}
        {review.rationale && (
          <div className="p-2 bg-stone-50 rounded border border-stone-200/60 text-[11px] text-zinc-700 line-clamp-2">
            <span className="font-semibold text-zinc-800 mr-1">Rationale:</span>
            {review.rationale}
          </div>
        )}

        {/* Checklist progress if exists */}
        {checklistTotal > 0 && (
          <div className="flex items-center justify-between text-[11px] text-zinc-500 font-mono bg-stone-50/70 px-2 py-1 rounded">
            <span>Checklist</span>
            <span>
              {checklistDone}/{checklistTotal} verified
            </span>
          </div>
        )}

        {/* Completion note if archived */}
        {isArchived && review.completion_note && (
          <div className="p-2 bg-stone-100/70 rounded text-[11px] text-zinc-600 italic">
            Completed: {review.completion_note}
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-2 border-t border-stone-100 flex items-center justify-between gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={onEdit}
            disabled={isArchived}
            className="h-7 px-2 text-xs border-stone-200 text-zinc-700 gap-1 flex-1"
          >
            <Pencil className="h-3 w-3" />
            <span>{isArchived ? "Archived" : "Edit Decision"}</span>
          </Button>

          {!isArchived && review.decision === "cancel" && (
            <Button
              size="sm"
              onClick={onComplete}
              className="h-7 px-2.5 text-xs bg-red-700 hover:bg-red-800 text-white font-medium"
            >
              Confirm Cancel
            </Button>
          )}

          {!isArchived && review.decision === "keep" && (
            <Button
              size="sm"
              onClick={onComplete}
              className="h-7 px-2.5 text-xs bg-emerald-800 hover:bg-emerald-900 text-white font-medium"
            >
              Mark Done
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
