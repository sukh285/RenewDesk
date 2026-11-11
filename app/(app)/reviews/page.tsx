"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Eye, AlertTriangle, CheckCircle } from "lucide-react";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import {
  ReviewWithSubscription,
  Decision,
  ChecklistItem,
  paiseTo_inr,
} from "@/lib/db/types";
import { formatDate, daysUntil } from "@/lib/dates";

// ---- Helpers ----

function decisionLabel(d: Decision | string): string {
  const map: Record<string, string> = {
    undecided: "Undecided",
    keep: "Keep",
    cancel: "Cancel",
    need_info: "Need information",
  };
  return map[d] ?? d;
}

function decisionBadgeCls(d: string): string {
  const map: Record<string, string> = {
    undecided: "bg-amber-100 text-amber-800 border-amber-200",
    keep: "bg-emerald-100 text-emerald-800 border-emerald-200",
    cancel: "bg-red-100 text-red-800 border-red-200",
    need_info: "bg-blue-100 text-blue-800 border-blue-200",
  };
  return map[d] ?? "bg-zinc-100 text-zinc-700 border-zinc-200";
}

function DecisionBadge({ decision }: { decision: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${decisionBadgeCls(decision)}`}
    >
      {decisionLabel(decision)}
    </span>
  );
}

function ActionStatusBadge({ status }: { status: string }) {
  if (status === "completed") {
    return (
      <span className="inline-flex items-center rounded-full border border-zinc-200 bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-500">
        Completed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full border border-zinc-300 bg-white px-2 py-0.5 text-xs font-medium text-zinc-700">
      Open
    </span>
  );
}

function DaysUntilRenewal({ dateStr }: { dateStr: string }) {
  const days = daysUntil(dateStr);
  if (days < 0)
    return (
      <span className="text-xs text-red-600 font-medium">Renewal overdue</span>
    );
  if (days === 0)
    return (
      <span className="text-xs text-red-600 font-medium">Renews today</span>
    );
  if (days <= 7)
    return (
      <span className="text-xs text-red-600 font-medium">
        Renews in {days}d
      </span>
    );
  if (days <= 30)
    return (
      <span className="text-xs text-amber-600 font-medium">
        Renews in {days}d
      </span>
    );
  return (
    <span className="text-xs text-zinc-400">Renews in {days}d</span>
  );
}

// Decision display order
const DECISION_ORDER: Decision[] = ["undecided", "need_info", "keep", "cancel"];
const COMPLETED_KEY = "__completed__";

function groupReviews(
  reviews: ReviewWithSubscription[]
): Map<string, ReviewWithSubscription[]> {
  const groups = new Map<string, ReviewWithSubscription[]>();

  // Open reviews, ordered by decision
  for (const d of DECISION_ORDER) {
    groups.set(d, []);
  }
  groups.set(COMPLETED_KEY, []);

  for (const r of reviews) {
    if (r.action_status === "completed") {
      groups.get(COMPLETED_KEY)!.push(r);
    } else {
      const bucket = groups.get(r.decision);
      if (bucket) bucket.push(r);
      else groups.get("undecided")!.push(r);
    }
  }

  return groups;
}

// ---- Edit Review Sheet ----

interface EditReviewSheetProps {
  open: boolean;
  onClose: () => void;
  review: ReviewWithSubscription | null;
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
  const [newItem, setNewItem] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && review) {
      setDecision(review.decision);
      setOwner(review.owner ?? "");
      setDueDate(review.due_date ?? "");
      setRationale(review.rationale ?? "");
      setChecklist(review.checklist ? [...review.checklist] : []);
      setNewItem("");
    }
  }, [open, review]);

  function addChecklistItem() {
    const text = newItem.trim();
    if (!text) return;
    setChecklist((prev) => [...prev, { text, done: false }]);
    setNewItem("");
  }

  function toggleChecklistItem(index: number) {
    setChecklist((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, done: !item.done } : item
      )
    );
  }

  function removeChecklistItem(index: number) {
    setChecklist((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    if (!review) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/reviews/${review.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: review.id,
          version: review.version,
          decision,
          owner: owner.trim() || null,
          due_date: dueDate || null,
          rationale: rationale.trim() || null,
          checklist,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        toast.error(json.error ?? "Failed to update review");
        return;
      }
      toast.success("Review updated.");
      onSaved();
      onClose();
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  if (!review) return null;

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Edit review - {review.subscription.vendor}</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-5 px-1">
          {/* Decision */}
          <div className="space-y-1.5">
            <Label>Decision</Label>
            <Select
              value={decision}
              onValueChange={(v) => setDecision(v as Decision)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="undecided">Undecided</SelectItem>
                <SelectItem value="keep">Keep</SelectItem>
                <SelectItem value="cancel">Cancel</SelectItem>
                <SelectItem value="need_info">Need information</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Cancel warning */}
          {decision === "cancel" && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 flex gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-700">
                A Cancel decision does not cancel the vendor subscription. You
                must contact the vendor directly to complete the cancellation.
              </p>
            </div>
          )}

          {/* Owner */}
          <div className="space-y-1.5">
            <Label htmlFor="review-owner">Owner</Label>
            <Input
              id="review-owner"
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              placeholder="Who is responsible for this decision"
            />
          </div>

          {/* Due date */}
          <div className="space-y-1.5">
            <Label htmlFor="review-due">Due date</Label>
            <Input
              id="review-due"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          {/* Rationale */}
          <div className="space-y-1.5">
            <Label htmlFor="review-rationale">Rationale</Label>
            <Textarea
              id="review-rationale"
              value={rationale}
              onChange={(e) => setRationale(e.target.value)}
              placeholder="Reason for this decision..."
              rows={3}
            />
          </div>

          {/* Checklist */}
          <div className="space-y-2">
            <Label>Checklist</Label>
            {checklist.length > 0 && (
              <ul className="space-y-2">
                {checklist.map((item, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <Checkbox
                      id={`check-${i}`}
                      checked={item.done}
                      onCheckedChange={() => toggleChecklistItem(i)}
                    />
                    <label
                      htmlFor={`check-${i}`}
                      className={`flex-1 text-sm cursor-pointer select-none ${
                        item.done ? "line-through text-zinc-400" : "text-zinc-700"
                      }`}
                    >
                      {item.text}
                    </label>
                    <button
                      type="button"
                      onClick={() => removeChecklistItem(i)}
                      className="text-zinc-300 hover:text-red-400 transition-colors text-xs"
                      title="Remove item"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex gap-2">
              <Input
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addChecklistItem();
                  }
                }}
                placeholder="Add checklist item..."
                className="text-sm"
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={addChecklistItem}
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          <p className="text-xs text-zinc-400">
            To mark a review as complete, use the complete button on the review
            card.
          </p>
        </div>

        <SheetFooter className="mt-6 px-1">
          <SheetClose asChild>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </SheetClose>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save review"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

// ---- Complete Review Dialog ----

interface CompleteDialogProps {
  open: boolean;
  onClose: () => void;
  review: ReviewWithSubscription | null;
  onCompleted: () => void;
}

function CompleteReviewDialog({
  open,
  onClose,
  review,
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
  const vendor = review.subscription.vendor;

  async function handleComplete() {
    if (!review) return;
    if (isCancel && !confirmed) return;
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
      const json = await res.json();
      if (!res.ok || !json.ok) {
        toast.error(json.error ?? "Failed to complete review");
        return;
      }
      toast.success(
        isCancel
          ? "Review completed. Cancellation confirmed."
          : "Review marked complete."
      );
      onCompleted();
      onClose();
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setCompleting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isCancel ? "Confirm vendor cancellation" : "Mark review complete"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {isCancel ? (
            <>
              <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                <p className="text-sm text-red-700">
                  Have you confirmed cancellation directly with {vendor}? This
                  action records that the vendor contract has been cancelled. It
                  does not cancel anything automatically.
                </p>
              </div>

              <div className="flex items-start gap-3">
                <Checkbox
                  id="confirm-cancel"
                  checked={confirmed}
                  onCheckedChange={(v) => setConfirmed(!!v)}
                  className="mt-0.5"
                />
                <label
                  htmlFor="confirm-cancel"
                  className="text-sm text-zinc-700 cursor-pointer leading-snug"
                >
                  I confirm I have contacted {vendor} and completed the
                  necessary steps to cancel this subscription.
                </label>
              </div>
            </>
          ) : (
            <p className="text-sm text-zinc-600">
              Mark this review as complete for {vendor}? This records that
              the renewal decision has been finalised.
            </p>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="completion-note">Completion note (optional)</Label>
            <Textarea
              id="completion-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Any final notes or confirmation references..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </DialogClose>
          <Button
            onClick={handleComplete}
            disabled={completing || (isCancel && !confirmed)}
            variant={isCancel ? "destructive" : "default"}
          >
            {completing
              ? "Completing..."
              : isCancel
              ? "Confirm cancellation"
              : "Mark complete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---- Review Card ----

interface ReviewCardProps {
  review: ReviewWithSubscription;
  onEdit: (r: ReviewWithSubscription) => void;
  onComplete: (r: ReviewWithSubscription) => void;
  onView: (r: ReviewWithSubscription) => void;
}

function ReviewCard({ review, onEdit, onComplete, onView }: ReviewCardProps) {
  const sub = review.subscription;
  const checklistTotal = review.checklist?.length ?? 0;
  const checklistDone = review.checklist?.filter((c) => c.done).length ?? 0;
  const isOpen = review.action_status === "open";
  const isCancel = review.decision === "cancel";
  const isKeep = review.decision === "keep";
  const daysToRenewal = daysUntil(sub.next_renewal);

  return (
    <Card className="border border-zinc-200 hover:border-zinc-300 transition-colors">
      <CardContent className="pt-4 pb-4">
        {/* Top row */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="min-w-0">
            <h3 className="font-semibold text-zinc-900 text-sm truncate">
              {sub.vendor}
            </h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-xs text-zinc-400">
                {paiseTo_inr(sub.amount_paise)}
              </span>
              <span className="text-zinc-200">|</span>
              <DaysUntilRenewal dateStr={sub.next_renewal} />
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            <DecisionBadge decision={review.decision} />
            <ActionStatusBadge status={review.action_status} />
          </div>
        </div>

        {/* Cancel warning */}
        {isCancel && isOpen && (
          <div className="mb-3 rounded border border-red-200 bg-red-50 px-2.5 py-1.5 flex gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-red-700">
              Contact the vendor to complete cancellation.
            </p>
          </div>
        )}

        {/* Meta row */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs mb-3">
          <div>
            <span className="text-zinc-400">Owner: </span>
            {review.owner ? (
              <span className="text-zinc-700">{review.owner}</span>
            ) : (
              <span className="text-amber-600 font-medium">No owner assigned</span>
            )}
          </div>
          {review.due_date && (
            <div>
              <span className="text-zinc-400">Due: </span>
              <span
                className={
                  daysUntil(review.due_date) <= 0 && isOpen
                    ? "text-red-600 font-medium"
                    : daysUntil(review.due_date) <= 3 && isOpen
                    ? "text-amber-600 font-medium"
                    : "text-zinc-700"
                }
              >
                {formatDate(review.due_date)}
                {isOpen && (
                  <span className="ml-1 text-zinc-400">
                    (
                    {daysUntil(review.due_date) < 0
                      ? "overdue"
                      : daysUntil(review.due_date) === 0
                      ? "today"
                      : `${daysUntil(review.due_date)}d`}
                    )
                  </span>
                )}
              </span>
            </div>
          )}
          {review.action_status === "completed" && review.completed_at && (
            <div>
              <span className="text-zinc-400">Completed: </span>
              <span className="text-zinc-600">
                {new Date(review.completed_at).toLocaleDateString("en-IN", {
                  timeZone: "Asia/Kolkata",
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            </div>
          )}
        </div>

        {/* Rationale */}
        {review.rationale && (
          <p className="text-xs text-zinc-500 mb-3 line-clamp-2">
            {review.rationale}
          </p>
        )}

        {/* Checklist preview */}
        {checklistTotal > 0 && (
          <div className="mb-3 flex items-center gap-1.5 text-xs text-zinc-500">
            <CheckCircle
              className={`h-3.5 w-3.5 ${
                checklistDone === checklistTotal
                  ? "text-emerald-500"
                  : "text-zinc-300"
              }`}
            />
            {checklistDone}/{checklistTotal} checklist items done
          </div>
        )}

        {/* Actions */}
        {isOpen && (
          <div className="flex flex-wrap gap-2 pt-1 border-t border-zinc-100 mt-3">
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={() => onEdit(review)}
            >
              <Pencil className="h-3 w-3 mr-1" />
              Edit decision
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs text-zinc-500"
              onClick={() => onView(review)}
            >
              <Eye className="h-3 w-3 mr-1" />
              Details
            </Button>
            {isCancel && (
              <Button
                size="sm"
                variant="destructive"
                className="h-7 text-xs"
                onClick={() => onComplete(review)}
              >
                Confirm vendor cancellation
              </Button>
            )}
            {isKeep && (
              <Button
                size="sm"
                className="h-7 text-xs"
                onClick={() => onComplete(review)}
              >
                Mark as complete
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---- View Details Sheet (simple) ----

interface ViewDetailsSheetProps {
  open: boolean;
  onClose: () => void;
  review: ReviewWithSubscription | null;
}

function ViewDetailsSheet({ open, onClose, review }: ViewDetailsSheetProps) {
  if (!review) return null;
  const sub = review.subscription;

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="right"
        style={{ maxWidth: 520 }}
        className="w-full overflow-y-auto"
      >
        <SheetHeader>
          <SheetTitle>
            {sub.vendor} - Review details
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-5 px-1 text-sm">
          {/* Subscription info */}
          <section className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400 mb-0.5">
                Amount
              </p>
              <p className="font-semibold text-zinc-900">
                {paiseTo_inr(sub.amount_paise)}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400 mb-0.5">
                Cycle
              </p>
              <p className="capitalize text-zinc-700">{sub.billing_cycle}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400 mb-0.5">
                Next renewal
              </p>
              <p className="text-zinc-700">{formatDate(sub.next_renewal)}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400 mb-0.5">
                Subscription owner
              </p>
              <p className="text-zinc-700">
                {sub.owner ?? (
                  <span className="text-zinc-400 italic">Unassigned</span>
                )}
              </p>
            </div>
          </section>

          {sub.context && (
            <section>
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400 mb-1">
                Context
              </p>
              <p className="text-zinc-600 whitespace-pre-wrap">{sub.context}</p>
            </section>
          )}

          {/* Review info */}
          <section className="border-t border-zinc-100 pt-4">
            <div className="flex items-center gap-2 mb-3">
              <DecisionBadge decision={review.decision} />
              <ActionStatusBadge status={review.action_status} />
            </div>

            {review.decision === "cancel" && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 mb-3">
                <p className="text-xs text-red-700">
                  A Cancel decision does not cancel the vendor subscription.
                  You must contact the vendor directly to complete the
                  cancellation.
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 mb-3">
              {review.owner && (
                <div>
                  <p className="text-xs text-zinc-400 mb-0.5">Review owner</p>
                  <p className="text-zinc-700">{review.owner}</p>
                </div>
              )}
              {review.due_date && (
                <div>
                  <p className="text-xs text-zinc-400 mb-0.5">Due date</p>
                  <p className="text-zinc-700">{formatDate(review.due_date)}</p>
                </div>
              )}
              {review.completed_at && (
                <div>
                  <p className="text-xs text-zinc-400 mb-0.5">Completed</p>
                  <p className="text-zinc-700">
                    {new Date(review.completed_at).toLocaleDateString("en-IN", {
                      timeZone: "Asia/Kolkata",
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
              )}
            </div>

            {review.rationale && (
              <div className="mb-3">
                <p className="text-xs text-zinc-400 mb-1">Rationale</p>
                <p className="text-zinc-700 whitespace-pre-wrap">
                  {review.rationale}
                </p>
              </div>
            )}

            {review.completion_note && (
              <div className="mb-3">
                <p className="text-xs text-zinc-400 mb-1">Completion note</p>
                <p className="text-zinc-600 whitespace-pre-wrap">
                  {review.completion_note}
                </p>
              </div>
            )}

            {review.checklist && review.checklist.length > 0 && (
              <div>
                <p className="text-xs text-zinc-400 mb-2">Checklist</p>
                <ul className="space-y-1.5">
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
                            ? "line-through text-zinc-400 text-sm"
                            : "text-zinc-700 text-sm"
                        }
                      >
                        {item.text}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ---- Section header ----

function SectionHeader({
  title,
  count,
}: {
  title: string;
  count: number;
}) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <h2 className="text-base font-semibold text-zinc-900">{title}</h2>
      <span className="inline-flex items-center rounded-full bg-zinc-100 border border-zinc-200 px-2 py-0.5 text-xs font-medium text-zinc-600">
        {count}
      </span>
    </div>
  );
}

// ---- Main Page ----

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<ReviewWithSubscription[]>([]);
  const [loading, setLoading] = useState(true);

  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ReviewWithSubscription | null>(
    null
  );
  const [completeOpen, setCompleteOpen] = useState(false);
  const [completeTarget, setCompleteTarget] =
    useState<ReviewWithSubscription | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewTarget, setViewTarget] = useState<ReviewWithSubscription | null>(
    null
  );

  const loadReviews = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/reviews");
      const json = await res.json();
      if (json.ok) {
        setReviews(json.data);
      } else {
        toast.error(json.error ?? "Failed to load reviews");
      }
    } catch {
      toast.error("Failed to load reviews");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  const groups = groupReviews(reviews);

  const sectionTitles: Record<string, string> = {
    undecided: "Undecided",
    need_info: "Need information",
    keep: "Keep",
    cancel: "Cancel",
    [COMPLETED_KEY]: "Completed",
  };

  const displayOrder = [
    ...DECISION_ORDER,
    COMPLETED_KEY,
  ];

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-900">Reviews</h1>
        <span className="text-sm text-zinc-400">
          {reviews.filter((r) => r.action_status === "open").length} open
        </span>
      </div>

      {loading ? (
        <div className="space-y-6">
          {[1, 2].map((i) => (
            <div key={i}>
              <Skeleton className="h-6 w-32 mb-3" />
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((j) => (
                  <Skeleton key={j} className="h-40 w-full rounded-lg" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 py-16 text-center">
          <p className="text-sm text-zinc-500">No reviews yet.</p>
          <p className="text-xs text-zinc-400 mt-1">
            Reviews are created automatically when you add a subscription.
          </p>
        </div>
      ) : (
        <div className="space-y-10">
          {displayOrder.map((key) => {
            const group = groups.get(key) ?? [];
            if (group.length === 0) return null;
            return (
              <section key={key}>
                <SectionHeader
                  title={sectionTitles[key] ?? key}
                  count={group.length}
                />
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {group.map((review) => (
                    <ReviewCard
                      key={review.id}
                      review={review}
                      onEdit={(r) => {
                        setEditTarget(r);
                        setEditOpen(true);
                      }}
                      onComplete={(r) => {
                        setCompleteTarget(r);
                        setCompleteOpen(true);
                      }}
                      onView={(r) => {
                        setViewTarget(r);
                        setViewOpen(true);
                      }}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* Edit sheet */}
      <EditReviewSheet
        open={editOpen}
        onClose={() => setEditOpen(false)}
        review={editTarget}
        onSaved={loadReviews}
      />

      {/* Complete dialog */}
      <CompleteReviewDialog
        open={completeOpen}
        onClose={() => setCompleteOpen(false)}
        review={completeTarget}
        onCompleted={loadReviews}
      />

      {/* View details */}
      <ViewDetailsSheet
        open={viewOpen}
        onClose={() => setViewOpen(false)}
        review={viewTarget}
      />
    </div>
  );
}
