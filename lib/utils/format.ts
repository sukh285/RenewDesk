// Shared UI utility types and formatting helpers for the client

// Format paise to INR display
export function formatINR(paise: number): string {
  const rupees = paise / 100;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(rupees);
}

// Format date string for display
export function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  const date = new Date(dateStr + "T00:00:00+05:30");
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
}

// Get days until a date
export function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T00:00:00+05:30");
  const diffMs = target.getTime() - today.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

// Get urgency color class based on days
export function urgencyClass(days: number): string {
  if (days <= 0) return "text-red-600 font-semibold";
  if (days <= 7) return "text-red-500 font-medium";
  if (days <= 30) return "text-amber-600 font-medium";
  return "text-zinc-500";
}

// Decision display labels
export const DECISION_LABELS: Record<string, string> = {
  undecided: "Undecided",
  keep: "Keep",
  cancel: "Cancel",
  need_info: "Need information",
};

// Decision badge colors (Tailwind classes)
export const DECISION_BADGE_CLASSES: Record<string, string> = {
  undecided: "bg-amber-100 text-amber-800 border-amber-200",
  keep: "bg-emerald-100 text-emerald-800 border-emerald-200",
  cancel: "bg-red-100 text-red-800 border-red-200",
  need_info: "bg-blue-100 text-blue-800 border-blue-200",
};

export const CYCLE_LABELS: Record<string, string> = {
  monthly: "Monthly",
  annual: "Annual",
};

export const REVIEW_STATE_LABELS: Record<string, string> = {
  none: "None",
  pending: "Pending",
  reviewed: "Reviewed",
};

export const ACTION_STATUS_LABELS: Record<string, string> = {
  open: "Open",
  completed: "Completed",
};

