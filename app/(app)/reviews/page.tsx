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
  ChevronDown,
  ChevronUp,
  Layers,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  const styles: Record<
    string,
    { bg: string; text: string; border: string; icon: React.ElementType; label: string }
  > = {
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
      label: "Need Info",
    },
  };

  const style = styles[decision] || styles.undecided;
  const Icon = style.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border ${style.bg} ${style.text} ${style.border}`}
    >
      <Icon className="h-3 w-3 shrink-0" />
      <span>{style.label}</span>
    </span>
  );
}

function UrgencyBadge({ dueDate }: { dueDate: string | null }) {
  if (!dueDate) return null;
  const days = daysUntil(dueDate);

  if (days < 0) {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-100 text-red-900 border border-red-300">
        <AlertTriangle className="h-2.5 w-2.5" />
        Overdue {Math.abs(days)}d
      </span>
    );
  }

  if (days <= 7) {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-900 border border-amber-300">
        <Clock className="h-2.5 w-2.5" />
        Due in {days}d
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-stone-100 text-zinc-600 border border-stone-200">
      {days}d remaining
    </span>
  );
}

// ---- Sheet: Edit Review ----

interface EditReviewSheetProps {
  review?: ReviewWithSubscription;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

function EditReviewSheet({ review, open, onClose, onSaved }: EditReviewSheetProps) {
  const [decision, setDecision] = useState<Decision>("undecided");
  const [owner, setOwner] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [rationale, setRationale] = useState("");
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [newChecklistText, setNewChecklistText] = useState("");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (review) {
      setDecision(review.decision);
      setOwner(review.owner || "");
      setDueDate(review.due_date || "");
      setRationale(review.rationale || "");
      setChecklist(Array.isArray(review.checklist) ? review.checklist : []);
      setErrors({});
    }
  }, [review]);

  function handleAddChecklistItem() {
    const trimmed = newChecklistText.trim();
    if (!trimmed) return;
    setChecklist([...checklist, { text: trimmed, done: false }]);
    setNewChecklistText("");
  }

  function handleToggleChecklistItem(index: number) {
    const updated = checklist.map((item, i) =>
      i === index ? { ...item, done: !item.done } : item
    );
    setChecklist(updated);
  }

  function handleRemoveChecklistItem(index: number) {
    setChecklist(checklist.filter((_, i) => i !== index));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!review) return;

    setSaving(true);
    setErrors({});

    try {
      const res = await fetch(`/api/reviews/${review.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision,
          owner: owner.trim() || null,
          due_date: dueDate || null,
          rationale: rationale.trim() || null,
          checklist,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.ok) {
        if (json.details) {
          const fieldErrors: Record<string, string> = {};
          for (const [k, v] of Object.entries(json.details)) {
            fieldErrors[k] = (v as string[])[0];
          }
          setErrors(fieldErrors);
        }
        toast.error(json.error || "Failed to update review");
        return;
      }

      toast.success("Review updated successfully");
      onSaved();
      onClose();
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (!review) return null;

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto p-6 bg-white border-l border-stone-200">
        <SheetHeader className="pb-4 border-b border-stone-100">
          <div className="flex items-center gap-3">
            <VendorAvatar vendor={review.subscription.vendor} />
            <div>
              <SheetTitle className="text-base font-bold text-zinc-900">
                {review.subscription.vendor} Review
              </SheetTitle>
              <p className="text-xs text-zinc-500 tabular-nums">
                {paiseTo_inr(review.subscription.amount_paise)} / {review.subscription.billing_cycle}
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
            {errors.due_date && (
              <p className="text-[11px] text-red-600">{errors.due_date}</p>
            )}
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
            <Label className="text-xs font-medium text-zinc-700 flex items-center justify-between">
              <span>Decision Checklist</span>
              <span className="text-[11px] font-normal text-zinc-500">
                {checklist.filter((c) => c.done).length}/{checklist.length} done
              </span>
            </Label>

            <div className="space-y-1.5">
              {checklist.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between gap-2 p-1.5 rounded bg-stone-50 border border-stone-200/80 text-xs"
                >
                  <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                    <input
                      type="checkbox"
                      checked={item.done}
                      onChange={() => handleToggleChecklistItem(index)}
                      className="h-3.5 w-3.5 rounded border-stone-300 text-emerald-700"
                    />
                    <span className={`truncate text-zinc-800 ${item.done ? "line-through text-zinc-400" : ""}`}>
                      {item.text}
                    </span>
                  </label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveChecklistItem(index)}
                    className="h-5 w-5 p-0 text-zinc-400 hover:text-red-600 shrink-0"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex gap-2 pt-1">
              <Input
                placeholder="Add checklist item..."
                value={newChecklistText}
                onChange={(e) => setNewChecklistText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddChecklistItem();
                  }
                }}
                className="h-7 text-xs bg-stone-50/50 border-stone-200"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddChecklistItem}
                className="h-7 px-2.5 text-xs border-stone-200 shrink-0"
              >
                <Plus className="h-3 w-3 mr-1" />
                Add
              </Button>
            </div>
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
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

// ---- Dialog: Complete Review ----

interface CompleteDialogProps {
  review: ReviewWithSubscription | null;
  onClose: () => void;
  onCompleted: () => void;
}

function CompleteDialog({ review, onClose, onCompleted }: CompleteDialogProps) {
  const [confirmed, setConfirmed] = useState(false);
  const [note, setNote] = useState("");
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    setConfirmed(false);
    setNote("");
  }, [review]);

  if (!review) return null;

  const isCancel = review.decision === "cancel";

  async function handleConfirm() {
    if (!review) return;

    if (isCancel && !confirmed) {
      toast.error("Please confirm that cancellation was completed with the vendor.");
      return;
    }

    setCompleting(true);
    try {
      const res = await fetch(`/api/reviews/${review.id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          completion_note: note.trim() || undefined,
          confirmed_with_vendor: isCancel ? true : undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.ok) {
        toast.error(json.error || "Failed to complete review");
        return;
      }

      toast.success(
        isCancel
          ? "Vendor cancellation confirmed and completed."
          : "Review marked as completed."
      );
      onCompleted();
      onClose();
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setCompleting(false);
    }
  }

  return (
    <Dialog open={!!review} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md p-5 bg-white border-stone-200 shadow-xl rounded-xl">
        <DialogHeader className="pb-2 border-b border-stone-100">
          <DialogTitle className="text-sm font-bold text-zinc-900 flex items-center gap-2">
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

        <div className="py-2 space-y-3 text-xs text-zinc-600">
          <div className="p-2.5 rounded bg-stone-50 border border-stone-200">
            <div className="font-semibold text-zinc-900">
              {review.subscription.vendor}
            </div>
            <div className="text-[11px] text-zinc-500 tabular-nums">
              {paiseTo_inr(review.subscription.amount_paise)} / {review.subscription.billing_cycle}
            </div>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-[11px] text-zinc-500">Current Decision:</span>
              <DecisionBadge decision={review.decision} />
            </div>
          </div>

          {isCancel ? (
            <div className="p-3 rounded-md bg-red-50/70 border border-red-200/80 space-y-2 text-red-900">
              <p className="font-semibold text-xs text-red-800">
                Human Confirmation Required
              </p>
              <p className="text-[11px] text-red-700 leading-normal">
                Setting a Cancel decision does not terminate your subscription with {review.subscription.vendor}. You must log into their billing portal or contact their team to stop billing.
              </p>
            </div>
          ) : (
            <p className="text-xs text-zinc-600">
              Marking this review as completed records the keep verdict and concludes this renewal cycle.
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

// ---- Board Card: Compact Information Density ----

interface ReviewCardProps {
  review: ReviewWithSubscription;
  onEdit: (review: ReviewWithSubscription) => void;
  onComplete: (review: ReviewWithSubscription) => void;
}

function ReviewCard({ review, onEdit, onComplete }: ReviewCardProps) {
  const checklistItems = Array.isArray(review.checklist) ? review.checklist : [];
  const doneChecklist = checklistItems.filter((c) => c.done).length;
  const isAwaitingAction = review.decision === "keep" || review.decision === "cancel";
  const isCancel = review.decision === "cancel";

  return (
    <div className="p-3 rounded-lg border border-stone-200/90 bg-white depth-card-interactive space-y-2.5">
      {/* Card Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <VendorAvatar vendor={review.subscription.vendor} />
          <div className="min-w-0">
            <h4 className="text-xs font-semibold text-zinc-900 truncate">
              {review.subscription.vendor}
            </h4>
            <p className="text-[11px] text-zinc-500 tabular-nums">
              {paiseTo_inr(review.subscription.amount_paise)} / {review.subscription.billing_cycle}
            </p>
          </div>
        </div>

        <DecisionBadge decision={review.decision} />
      </div>

      {/* Due Date & Urgency */}
      <div className="flex items-center justify-between text-[11px] text-zinc-600 pt-1 border-t border-stone-100">
        <div className="flex items-center gap-1 font-mono text-[11px]">
          <Calendar className="h-3 w-3 text-zinc-400" />
          <span>{review.due_date ? formatDate(review.due_date) : "No due date"}</span>
        </div>
        <UrgencyBadge dueDate={review.due_date} />
      </div>

      {/* Rationale Snippet (if available) */}
      {review.rationale && (
        <p className="text-[11px] text-zinc-600 line-clamp-2 bg-stone-50/70 p-1.5 rounded border border-stone-200/50 leading-relaxed italic">
          "{review.rationale}"
        </p>
      )}

      {/* Owner & Checklist indicators */}
      <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-1 border-t border-stone-100">
        <div className="flex items-center gap-1 truncate pr-2">
          <User className="h-3 w-3 text-zinc-400 shrink-0" />
          <span className="truncate">{review.owner || "Unassigned"}</span>
        </div>

        {checklistItems.length > 0 && (
          <div className="flex items-center gap-1 font-mono text-[10px] text-zinc-600 bg-stone-100 px-1.5 py-0.5 rounded shrink-0">
            <CheckSquare className="h-3 w-3 text-zinc-500" />
            <span>{doneChecklist}/{checklistItems.length}</span>
          </div>
        )}
      </div>

      {/* Card Action Controls */}
      <div className="pt-2 border-t border-stone-100 flex items-center justify-between gap-1.5">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onEdit(review)}
          className="h-6 px-2 text-[11px] font-medium border-stone-200 text-zinc-700 hover:bg-stone-50"
        >
          <Pencil className="h-3 w-3 mr-1 text-zinc-500" />
          Edit Verdict
        </Button>

        {isAwaitingAction && (
          <Button
            type="button"
            size="sm"
            onClick={() => onComplete(review)}
            className={`h-6 px-2 text-[11px] font-medium text-white ${
              isCancel
                ? "bg-red-700 hover:bg-red-800"
                : "bg-emerald-800 hover:bg-emerald-900"
            }`}
          >
            {isCancel ? (
              <>
                <ShieldAlert className="h-3 w-3 mr-1" />
                Confirm Cancel
              </>
            ) : (
              <>
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Mark Done
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

// ---- Main Reviews Page ----

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<ReviewWithSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [archiveOpen, setArchiveOpen] = useState(false);

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

  // Separation of open vs completed
  const openReviews = reviews.filter((r) => r.action_status === "open");
  const completedReviews = reviews.filter((r) => r.action_status === "completed");

  // Documented 3-Column Workflow Stage Mapping:
  // Column 1: "To review" -> Open reviews untouched or awaiting investigation (undecided without notes/checklist progress)
  const toReviewItems = openReviews.filter((r) => {
    const hasNotes = Boolean(r.rationale && r.rationale.trim().length > 0);
    const hasProgress = Array.isArray(r.checklist) && r.checklist.some((c) => c.done);
    return r.decision === "undecided" && !hasNotes && !hasProgress;
  });

  // Column 2: "In progress" -> Under active evaluation (need_info OR undecided with active notes/checklist progress)
  const inProgressItems = openReviews.filter((r) => {
    const hasNotes = Boolean(r.rationale && r.rationale.trim().length > 0);
    const hasProgress = Array.isArray(r.checklist) && r.checklist.some((c) => c.done);
    return r.decision === "need_info" || (r.decision === "undecided" && (hasNotes || hasProgress));
  });

  // Column 3: "Awaiting action" -> Decision reached (keep or cancel) but awaiting explicit human execution/confirmation
  const awaitingActionItems = openReviews.filter(
    (r) => r.decision === "keep" || r.decision === "cancel"
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-stone-200/80">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900">
            Renewal Reviews Board
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Jira-inspired three-stage decision workflow for subscriptions approaching renewal.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-zinc-600 font-mono">
          <span className="px-2 py-0.5 rounded bg-white border border-stone-200">
            {openReviews.length} open
          </span>
          <span>•</span>
          <span className="px-2 py-0.5 rounded bg-stone-100 border border-stone-200">
            {completedReviews.length} completed
          </span>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* 3-COLUMN JIRA INSPIRED WORKFLOW BOARD */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
            {/* COLUMN 1: TO REVIEW */}
            <div className="rounded-xl border border-stone-200/90 bg-stone-50/70 p-3 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-stone-200/80">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-800">
                    To Review
                  </h2>
                </div>
                <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-white text-zinc-700 border border-stone-200 shadow-2xs">
                  {toReviewItems.length}
                </span>
              </div>
              <p className="text-[11px] text-zinc-500">
                Untouched renewals awaiting owner investigation.
              </p>

              {toReviewItems.length === 0 ? (
                <div className="p-4 rounded-lg border border-dashed border-stone-200 bg-white/60 text-center text-xs text-zinc-400 italic">
                  No subscriptions waiting to be reviewed.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {toReviewItems.map((r) => (
                    <ReviewCard
                      key={r.id}
                      review={r}
                      onEdit={setEditingReview}
                      onComplete={setCompletingReview}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* COLUMN 2: IN PROGRESS */}
            <div className="rounded-xl border border-stone-200/90 bg-stone-50/70 p-3 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-stone-200/80">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-blue-500" />
                  <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-800">
                    In Progress
                  </h2>
                </div>
                <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-white text-zinc-700 border border-stone-200 shadow-2xs">
                  {inProgressItems.length}
                </span>
              </div>
              <p className="text-[11px] text-zinc-500">
                Active seat audits, team usage checks, or need-info states.
              </p>

              {inProgressItems.length === 0 ? (
                <div className="p-4 rounded-lg border border-dashed border-stone-200 bg-white/60 text-center text-xs text-zinc-400 italic">
                  No reviews currently in progress.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {inProgressItems.map((r) => (
                    <ReviewCard
                      key={r.id}
                      review={r}
                      onEdit={setEditingReview}
                      onComplete={setCompletingReview}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* COLUMN 3: AWAITING ACTION */}
            <div className="rounded-xl border border-stone-200/90 bg-stone-50/70 p-3 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-stone-200/80">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-600" />
                  <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-800">
                    Awaiting Action
                  </h2>
                </div>
                <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-white text-zinc-700 border border-stone-200 shadow-2xs">
                  {awaitingActionItems.length}
                </span>
              </div>
              <p className="text-[11px] text-zinc-500">
                Decided verdicts pending vendor cancellation or completion.
              </p>

              {awaitingActionItems.length === 0 ? (
                <div className="p-4 rounded-lg border border-dashed border-stone-200 bg-white/60 text-center text-xs text-zinc-400 italic">
                  No decided renewals awaiting execution.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {awaitingActionItems.map((r) => (
                    <ReviewCard
                      key={r.id}
                      review={r}
                      onEdit={setEditingReview}
                      onComplete={setCompletingReview}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* COLLAPSIBLE ARCHIVE: COMPLETED REVIEWS */}
          <div className="pt-2">
            <div className="rounded-xl border border-stone-200/80 bg-white overflow-hidden shadow-2xs">
              <button
                type="button"
                onClick={() => setArchiveOpen(!archiveOpen)}
                className="w-full p-3.5 flex items-center justify-between text-left hover:bg-stone-50/70 transition-colors"
                aria-expanded={archiveOpen}
              >
                <div className="flex items-center gap-2.5">
                  <Archive className="h-4 w-4 text-zinc-500" />
                  <div>
                    <h3 className="text-xs font-semibold text-zinc-900">
                      Completed Reviews Archive
                    </h3>
                    <p className="text-[11px] text-zinc-500">
                      {completedReviews.length} historically resolved and confirmed renewal reviews
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-medium px-2 py-0.5 rounded bg-stone-100 text-zinc-600 border border-stone-200">
                    {completedReviews.length} archived
                  </span>
                  {archiveOpen ? (
                    <ChevronUp className="h-4 w-4 text-zinc-500" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-zinc-500" />
                  )}
                </div>
              </button>

              {archiveOpen && (
                <div className="p-4 pt-1 border-t border-stone-100 space-y-3">
                  {completedReviews.length === 0 ? (
                    <p className="text-xs text-zinc-400 italic p-3 text-center">
                      No reviews have been completed yet.
                    </p>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {completedReviews.map((r) => (
                        <div
                          key={r.id}
                          className="p-3 rounded-lg border border-stone-200 bg-stone-50/50 space-y-2 text-xs"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <VendorAvatar vendor={r.subscription.vendor} />
                              <div>
                                <h4 className="font-semibold text-zinc-900">
                                  {r.subscription.vendor}
                                </h4>
                                <p className="text-[11px] text-zinc-500 tabular-nums">
                                  {paiseTo_inr(r.subscription.amount_paise)} / {r.subscription.billing_cycle}
                                </p>
                              </div>
                            </div>
                            <DecisionBadge decision={r.decision} />
                          </div>

                          <div className="text-[11px] text-zinc-500 space-y-0.5 pt-1 border-t border-stone-200/60">
                            <div>
                              Owner: <span className="text-zinc-700 font-medium">{r.owner || "Unassigned"}</span>
                            </div>
                            <div>
                              Completed: <span className="font-mono text-zinc-700">{r.completed_at ? formatDate(r.completed_at) : "Done"}</span>
                            </div>
                            {r.completion_note && (
                              <p className="mt-1 p-1.5 rounded bg-white border border-stone-200/80 italic text-zinc-600">
                                "{r.completion_note}"
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Sheet */}
      <EditReviewSheet
        review={editingReview}
        open={!!editingReview}
        onClose={() => setEditingReview(undefined)}
        onSaved={fetchReviews}
      />

      {/* Complete Dialog */}
      <CompleteDialog
        review={completingReview}
        onClose={() => setCompletingReview(null)}
        onCompleted={fetchReviews}
      />
    </div>
  );
}