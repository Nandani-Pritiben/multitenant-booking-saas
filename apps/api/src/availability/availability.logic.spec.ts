import { describe, expect, it } from 'vitest';
import { generateSlots, isValidDateOnly, localDateTimeToEpoch } from '../../dist/availability/availability.logic.js';

const date = '2026-10-12';
const hours = { start_time: '09:00:00', end_time: '17:00:00' };
const beforeDate = Date.parse('2026-10-01T00:00:00Z');

describe('availability logic', () => {
  it('generates duration-sized slots only within working hours', () => {
    const slots = generateSlots(date, 'Asia/Kolkata', hours, 60, [], beforeDate);

    expect(slots).toHaveLength(8);
    expect(slots[0]).toMatchObject({ start: '09:00', end: '10:00' });
    expect(slots.at(-1)).toMatchObject({ start: '16:00', end: '17:00' });
  });

  it('removes overlapping occupied intervals but ignores cancelled bookings', () => {
    const slots = generateSlots(date, 'Asia/Kolkata', hours, 30, [
      { start_at: '2026-10-12T04:30:00.000Z', end_at: '2026-10-12T05:30:00.000Z', status: 'confirmed' },
      { start_at: '2026-10-12T06:00:00.000Z', end_at: '2026-10-12T07:00:00.000Z', status: 'cancelled' },
    ], beforeDate);

    expect(slots.some((slot) => slot.start === '10:00' || slot.start === '10:30')).toBe(false);
    expect(slots.some((slot) => slot.start === '11:00')).toBe(true);
    expect(slots.some((slot) => slot.start === '11:30')).toBe(true);
  });

  it('allows slots that touch an existing booking boundary', () => {
    const slots = generateSlots(date, 'Asia/Kolkata', hours, 30, [
      { start_at: '2026-10-12T03:00:00.000Z', end_at: '2026-10-12T03:30:00.000Z', status: 'confirmed' },
      { start_at: '2026-10-12T11:30:00.000Z', end_at: '2026-10-12T12:00:00.000Z', status: 'confirmed' },
    ], beforeDate);

    expect(slots.some((slot) => slot.start === '09:00')).toBe(true);
    expect(slots.some((slot) => slot.start === '16:30')).toBe(true);
  });

  it('filters slots in the past using the business timezone instant', () => {
    const now = Date.parse('2026-10-12T04:00:00.000Z');
    const slots = generateSlots(date, 'Asia/Kolkata', hours, 30, [], now);

    expect(slots[0].start).toBe('09:30');
    expect(slots.every((slot) => Date.parse(slot.start_at) >= now)).toBe(true);
  });

  it('converts local time using the business timezone and skips nonexistent DST times', () => {
    expect(new Date(localDateTimeToEpoch(date, '09:00', 'Asia/Kolkata')!).toISOString())
      .toBe('2026-10-12T03:30:00.000Z');
    expect(localDateTimeToEpoch('2026-03-08', '02:30', 'America/New_York')).toBeNull();
  });

  it('accepts only real YYYY-MM-DD calendar dates', () => {
    expect(isValidDateOnly('2026-10-12')).toBe(true);
    expect(isValidDateOnly('2026-02-30')).toBe(false);
    expect(isValidDateOnly('2026-10-12T09:00:00Z')).toBe(false);
  });
});