import { addDays, endOfDay, isBefore } from 'date-fns';
import type { Assignment } from '@/types';

// Shared rules for which assignments each view shows, so "upcoming" means the same
// thing on the dashboard, course pages, and calendar.

export function byDueDate(a: Assignment, b: Assignment): number {
  if (!a.dueDate) return b.dueDate ? 1 : 0;
  if (!b.dueDate) return -1;
  return a.dueDate.getTime() - b.dueDate.getTime();
}

// Not done and not yet due. Undated items are included (sorted last).
export function isOpen(a: Assignment): boolean {
  return a.status !== 'completed' && a.status !== 'overdue';
}

export function isOverdue(a: Assignment): boolean {
  return a.status === 'overdue';
}

// Open items due between now and the end of the day `days` from today.
export function dueWithin(a: Assignment, days: number, now = new Date()): boolean {
  if (!a.dueDate || !isOpen(a)) return false;
  return isBefore(a.dueDate, endOfDay(addDays(now, days)));
}
