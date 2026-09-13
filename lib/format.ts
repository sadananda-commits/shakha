/**
 * Shared date/time display formatting. Values coming back from the API
 * are Europe/Copenhagen wall-clock strings (e.g. '2026-09-13 10:57' for
 * timestamps, '2026-09-20' for date-only fields) — these helpers turn
 * them into the simple human format used across the app:
 *   formatDisplayDate('2026-09-20')        -> '20th Sep 2026'
 *   formatDisplayDateTime('2026-09-13 10:57') -> '13th Sep 2026, 10:57 AM'
 */

function ordinalSuffix(day: number): string {
  if (day > 3 && day < 21) return 'th';
  switch (day % 10) {
    case 1:
      return 'st';
    case 2:
      return 'nd';
    case 3:
      return 'rd';
    default:
      return 'th';
  }
}

function parseApiDate(value: string): Date | null {
  if (!value) return null;
  // Backend sends 'yyyy-MM-dd HH:mm' or 'yyyy-MM-dd' — swap the space for
  // a 'T' so the browser parses it as a plain local datetime. Since this
  // app's users are assumed to be on Denmark-set devices, that local
  // interpretation matches what the string represents (Copenhagen time).
  const normalized = value.includes(' ') ? value.replace(' ', 'T') : value;
  const date = new Date(normalized);
  return isNaN(date.getTime()) ? null : date;
}

/** '2026-09-20' -> '20th Sep 2026' */
export function formatDisplayDate(value: string): string {
  const date = parseApiDate(value);
  if (!date) return value;
  const day = date.getDate();
  const month = date.toLocaleDateString('en-GB', { month: 'short' });
  return `${day}${ordinalSuffix(day)} ${month} ${date.getFullYear()}`;
}

/** '2026-09-13 10:57' -> '13th Sep 2026, 10:57 AM' */
export function formatDisplayDateTime(value: string): string {
  const date = parseApiDate(value);
  if (!date) return value;
  const day = date.getDate();
  const month = date.toLocaleDateString('en-GB', { month: 'short' });
  const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  return `${day}${ordinalSuffix(day)} ${month} ${date.getFullYear()}, ${time}`;
}

/**
 * Builds a 'yyyy-MM-ddTHH:mm' string for an <input type="datetime-local">
 * using the browser's LOCAL time (not UTC), so the field starts prefilled
 * with the actual current time instead of being off by the UTC offset.
 */
export function toDatetimeLocalValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}
