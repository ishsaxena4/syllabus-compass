// Clock times arrive as 24-hour strings ("16:30" or Postgres "16:30:00"); the app
// always shows them in 12-hour form.
export function formatClock(value: string | null | undefined): string {
  if (!value) return '';
  const match = /^(\d{1,2}):(\d{2})/.exec(value);
  if (!match) return value;
  const hours = Number(match[1]);
  const suffix = hours >= 12 ? 'PM' : 'AM';
  const h12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${h12}:${match[2]} ${suffix}`;
}

// "10:30 AM – 11:20 AM", or just the start when there is no end.
export function formatClockRange(start: string | null | undefined, end: string | null | undefined): string {
  if (!start) return '';
  return end ? `${formatClock(start)} – ${formatClock(end)}` : formatClock(start);
}
