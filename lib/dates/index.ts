// Date utilities for RenewDesk
// All comparisons use Asia/Kolkata timezone

import { formatInTimeZone, toZonedTime } from "date-fns-tz";
import { addDays, parseISO, isAfter, isBefore, startOfDay } from "date-fns";

export const KOLKATA_TZ = "Asia/Kolkata";

// Get today's date in Kolkata timezone as a YYYY-MM-DD string
export function todayKolkata(): string {
  return formatInTimeZone(new Date(), KOLKATA_TZ, "yyyy-MM-dd");
}

// Get today as a Date object anchored to Kolkata midnight
export function todayKolkataDate(): Date {
  const today = new Date();
  const zonedToday = toZonedTime(today, KOLKATA_TZ);
  return startOfDay(zonedToday);
}

// Parse a YYYY-MM-DD date string to a Date object in Kolkata timezone
export function parseKolkataDate(dateStr: string): Date {
  return toZonedTime(parseISO(dateStr), KOLKATA_TZ);
}

// Check if a date is within the next N days (from today in Kolkata)
export function isWithinDays(dateStr: string, days: number): boolean {
  const today = todayKolkataDate();
  const target = parseKolkataDate(dateStr);
  const future = addDays(today, days);
  return !isBefore(target, today) && !isAfter(target, future);
}

// Check if a date is in the past (before today in Kolkata)
export function isOverdue(dateStr: string): boolean {
  const today = todayKolkataDate();
  const target = parseKolkataDate(dateStr);
  return isBefore(target, today);
}

// Calculate default review due date: 7 days before renewal
// If that is in the past, return today
export function defaultReviewDueDate(renewalDateStr: string): string {
  const today = todayKolkataDate();
  const renewal = parseKolkataDate(renewalDateStr);
  const sevenBefore = addDays(renewal, -7);

  if (isBefore(sevenBefore, today)) {
    return todayKolkata();
  }
  return formatInTimeZone(sevenBefore, KOLKATA_TZ, "yyyy-MM-dd");
}

// Format a YYYY-MM-DD date for display
export function formatDate(dateStr: string): string {
  return formatInTimeZone(parseISO(dateStr), KOLKATA_TZ, "d MMM yyyy");
}

// Get days until a date from today (negative = overdue)
export function daysUntil(dateStr: string): number {
  const today = todayKolkataDate();
  const target = parseKolkataDate(dateStr);
  const diffMs = target.getTime() - today.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

// Get the upcoming 30-day window boundaries in Kolkata timezone
export function getUpcomingWindow(days: number = 30): {
  start: string;
  end: string;
} {
  const today = todayKolkataDate();
  const end = addDays(today, days);
  return {
    start: formatInTimeZone(today, KOLKATA_TZ, "yyyy-MM-dd"),
    end: formatInTimeZone(end, KOLKATA_TZ, "yyyy-MM-dd"),
  };
}

