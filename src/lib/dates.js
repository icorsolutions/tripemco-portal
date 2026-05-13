// src/lib/dates.js
// Centralized date handling. Never construct a Date from a date-only string —
// JS parses "2026-05-13" as UTC midnight, which becomes the previous day in
// Eastern Time. That's the renewal off-by-one bug.

export function toDateInputValue(dbDate) {
  if (!dbDate) return '';
  return String(dbDate).substring(0, 10);
}

export function addYears(dbDate, years = 1) {
  if (!dbDate) return '';
  const d = new Date(toDateInputValue(dbDate) + 'T12:00:00');
  d.setFullYear(d.getFullYear() + years);
  return d.toISOString().substring(0, 10);
}

export function parseLocalDate(dbDate) {
  if (!dbDate) return null;
  return new Date(toDateInputValue(dbDate) + 'T12:00:00');
}

export function formatDateLong(dbDate) {
  const d = parseLocalDate(dbDate);
  if (!d) return '';
  return d.toLocaleDateString('en-CA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function todayInputValue() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}