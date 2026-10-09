export interface WorkingInterval {
  start_time: string;
  end_time: string;
}

export interface OccupiedInterval {
  start_at: string;
  end_at: string;
  status: string;
}

export interface GeneratedSlot {
  start: string;
  end: string;
  start_at: string;
  end_at: string;
}

function dateTimeParts(epochMilliseconds: number, timezone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(epochMilliseconds));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
  };
}

export function localDateTimeToEpoch(date: string, time: string, timezone: string): number | null {
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.slice(0, 5).split(':').map(Number);
  const targetLocalEpoch = Date.UTC(year, month - 1, day, hour, minute);
  let candidate = targetLocalEpoch;

  try {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const actual = dateTimeParts(candidate, timezone);
      const actualAsUtc = Date.UTC(actual.year, actual.month - 1, actual.day, actual.hour, actual.minute);
      const correction = targetLocalEpoch - actualAsUtc;
      if (correction === 0) return candidate;
      candidate += correction;
    }
  } catch {
    return null;
  }

  const actual = dateTimeParts(candidate, timezone);
  if (actual.year !== year || actual.month !== month || actual.day !== day || actual.hour !== hour || actual.minute !== minute) {
    return null;
  }
  return candidate;
}

export function localDateAt(epochMilliseconds: number, timezone: string): string {
  const parts = dateTimeParts(epochMilliseconds, timezone);
  return `${parts.year.toString().padStart(4, '0')}-${parts.month.toString().padStart(2, '0')}-${parts.day.toString().padStart(2, '0')}`;
}

export function weekdayForDate(date: string): number {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

export function nextDate(date: string): string {
  const [year, month, day] = date.split('-').map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + 1));
  return `${next.getUTCFullYear().toString().padStart(4, '0')}-${(next.getUTCMonth() + 1).toString().padStart(2, '0')}-${next.getUTCDate().toString().padStart(2, '0')}`;
}

function minutesSinceMidnight(time: string): number {
  const [hours, minutes] = time.slice(0, 5).split(':').map(Number);
  return hours * 60 + minutes;
}

function formatMinutes(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

export function generateSlots(
  date: string,
  timezone: string,
  workingInterval: WorkingInterval,
  durationMinutes: number,
  bookings: OccupiedInterval[],
  now = Date.now(),
): GeneratedSlot[] {
  const open = minutesSinceMidnight(workingInterval.start_time);
  const close = minutesSinceMidnight(workingInterval.end_time);
  if (durationMinutes <= 0 || open >= close) return [];

  const slots: GeneratedSlot[] = [];
  for (let startMinute = open; startMinute + durationMinutes <= close; startMinute += durationMinutes) {
    const endMinute = startMinute + durationMinutes;
    const start = formatMinutes(startMinute);
    const end = formatMinutes(endMinute);
    const startEpoch = localDateTimeToEpoch(date, start, timezone);
    const endEpoch = localDateTimeToEpoch(date, end, timezone);
    if (startEpoch === null || endEpoch === null || startEpoch < now) continue;

    const overlaps = bookings.some((booking) => {
      if (booking.status === 'cancelled') return false;
      const existingStart = new Date(booking.start_at).getTime();
      const existingEnd = new Date(booking.end_at).getTime();
      return existingStart < endEpoch && existingEnd > startEpoch;
    });
    if (overlaps) continue;

    slots.push({
      start,
      end,
      start_at: new Date(startEpoch).toISOString(),
      end_at: new Date(endEpoch).toISOString(),
    });
  }
  return slots;
}

export function isValidDateOnly(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const parsed = new Date(`${date}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
}