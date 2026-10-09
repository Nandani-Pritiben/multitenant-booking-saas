import { DateTime } from 'luxon';

export type CalendarView = 'day' | 'week' | 'month';

/**
 * Returns a YYYY-MM-DD string representing "today" in the given timezone.
 */
export function todayInTz(timezone: string): string {
  return DateTime.now().setZone(timezone).toISODate() ?? DateTime.now().toISODate()!;
}

/**
 * Returns an ISO date string for the start of the week (Monday) containing the given date.
 */
export function weekStart(date: string): string {
  const dt = DateTime.fromISO(date);
  const monday = dt.startOf('week'); // Luxon week starts Monday
  return monday.toISODate()!;
}

/**
 * Returns an array of 7 date strings (YYYY-MM-DD) for Mon–Sun of the week containing date.
 */
export function weekDays(date: string): string[] {
  const start = DateTime.fromISO(weekStart(date));
  return Array.from({ length: 7 }, (_, i) => start.plus({ days: i }).toISODate()!);
}

/**
 * Returns the start date (YYYY-MM-DD) of the month containing the given date.
 */
export function monthStart(date: string): string {
  return DateTime.fromISO(date).startOf('month').toISODate()!;
}

/**
 * Returns all dates (YYYY-MM-DD) visible in a month-grid calendar (incl. padding from prev/next month).
 */
export function monthGridDates(date: string): string[] {
  const dt = DateTime.fromISO(date);
  const start = dt.startOf('month').startOf('week'); // Monday of the first week
  const end = dt.endOf('month').endOf('week');       // Sunday of the last week
  const dates: string[] = [];
  let cursor = start;
  while (cursor <= end) {
    dates.push(cursor.toISODate()!);
    cursor = cursor.plus({ days: 1 });
  }
  return dates;
}

/**
 * Returns ISO date strings for the date range to fetch for a given view.
 * Returns { startDate: 'YYYY-MM-DD', endDate: 'YYYY-MM-DD' }
 */
export function fetchRange(view: CalendarView, date: string): { startDate: string; endDate: string } {
  const dt = DateTime.fromISO(date);
  if (view === 'day') {
    return { startDate: date, endDate: date };
  }
  if (view === 'week') {
    const mon = dt.startOf('week');
    return { startDate: mon.toISODate()!, endDate: mon.plus({ days: 6 }).toISODate()! };
  }
  // month
  const start = dt.startOf('month');
  const end = dt.endOf('month');
  return { startDate: start.toISODate()!, endDate: end.toISODate()! };
}

/**
 * Navigate to previous/next period.
 */
export function navigateDate(view: CalendarView, date: string, direction: -1 | 1): string {
  const dt = DateTime.fromISO(date);
  if (view === 'day') return dt.plus({ days: direction }).toISODate()!;
  if (view === 'week') return dt.plus({ weeks: direction }).toISODate()!;
  return dt.plus({ months: direction }).toISODate()!;
}

/**
 * Returns a human-readable label for the current period.
 */
export function periodLabel(view: CalendarView, date: string): string {
  const dt = DateTime.fromISO(date);
  if (view === 'day') return dt.toFormat('cccc, d MMMM yyyy');
  if (view === 'week') {
    const mon = dt.startOf('week');
    const sun = mon.plus({ days: 6 });
    if (mon.month === sun.month) return `${mon.toFormat('d')}–${sun.toFormat('d MMMM yyyy')}`;
    return `${mon.toFormat('d MMM')}–${sun.toFormat('d MMM yyyy')}`;
  }
  return dt.toFormat('MMMM yyyy');
}

/**
 * Format a booking's start time to HH:mm (24h) in the business timezone.
 */
export function bookingTime(startAt: string, timezone: string): string {
  return DateTime.fromISO(startAt, { zone: 'utc' }).setZone(timezone).toFormat('HH:mm');
}

/**
 * Returns a YYYY-MM-DD key for a booking start_at in the given timezone.
 */
export function bookingDateKey(startAt: string, timezone: string): string {
  return DateTime.fromISO(startAt, { zone: 'utc' }).setZone(timezone).toISODate()!;
}

/**
 * Groups bookings by their local date in the given timezone.
 */
export function groupByDate<T extends { start_at: string }>(
  bookings: T[],
  timezone: string,
): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const b of bookings) {
    const key = bookingDateKey(b.start_at, timezone);
    const group = map.get(key);
    if (group) group.push(b);
    else map.set(key, [b]);
  }
  return map;
}

/**
 * Returns 24-hour slots from 00:00 to 23:30 (30-min increments).
 */
export function dayTimeSlots(): string[] {
  const slots: string[] = [];
  for (let h = 0; h < 24; h++) {
    slots.push(`${String(h).padStart(2, '0')}:00`);
    slots.push(`${String(h).padStart(2, '0')}:30`);
  }
  return slots;
}
