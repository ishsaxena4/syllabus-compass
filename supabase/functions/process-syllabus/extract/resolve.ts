// Deterministic checks applied to the model's output. The model reads the
// documents; this code makes sure what it returned is well-formed and converts
// local wall-clock times into absolute timestamps.
import type { Extraction, ExtractedItem } from './schema.ts'

export const DEFAULT_DUE_TIME = '23:59'

export function isValidDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [y, m, d] = value.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d
}

export function isValidTime(value: unknown): value is string {
  return typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value)
}

// Offset of `timeZone` from UTC, in minutes, at the given instant.
function zoneOffsetMinutes(instant: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(new Date(instant))
  const get = (type: string) => Number(parts.find(p => p.type === type)?.value)
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'))
  return (asUtc - instant) / 60_000
}

// "2026-09-04" + "23:00" in America/Indiana/Indianapolis -> "2026-09-05T03:00:00.000Z"
export function localToUtcIso(date: string, time: string, timeZone: string): string {
  const [y, m, d] = date.split('-').map(Number)
  const [hh, mm] = time.split(':').map(Number)
  const wallClockAsUtc = Date.UTC(y, m - 1, d, hh, mm)
  let instant = wallClockAsUtc - zoneOffsetMinutes(wallClockAsUtc, timeZone) * 60_000
  // Re-check once so times next to a DST switch use the offset in effect at that moment.
  instant = wallClockAsUtc - zoneOffsetMinutes(instant, timeZone) * 60_000
  return new Date(instant).toISOString()
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone })
    return true
  } catch {
    return false
  }
}

function normalizeTitle(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

// Nulls out malformed dates/times (with a warning) and drops exact duplicates.
export function cleanExtraction(raw: Extraction, documentCount: number): Extraction {
  const warnings = [...(raw.warnings ?? [])]
  const seen = new Set<string>()
  const items: ExtractedItem[] = []

  for (const item of raw.items ?? []) {
    const clean = { ...item, title: item.title?.trim() || 'Untitled' }
    if (clean.due_date !== null && !isValidDate(clean.due_date)) {
      warnings.push(`"${clean.title}" had an unreadable date (${clean.due_date}); left undated.`)
      clean.due_date = null
    }
    for (const key of ['due_time', 'end_time', 'available_from_time'] as const) {
      if (clean[key] !== null && !isValidTime(clean[key])) clean[key] = null
    }
    if (clean.available_from_date !== null && !isValidDate(clean.available_from_date)) {
      clean.available_from_date = null
    }
    if (clean.due_time === null && clean.time_basis !== 'none') clean.time_basis = 'none'
    if (!(clean.source_document >= 1 && clean.source_document <= documentCount)) clean.source_document = 1

    const key = `${clean.type}|${clean.due_date}|${normalizeTitle(clean.title)}`
    if (seen.has(key)) continue
    seen.add(key)
    items.push(clean)
  }

  const meetings = (raw.meetings ?? []).map(m => ({
    ...m,
    start_time: isValidTime(m.start_time) ? m.start_time : null,
    end_time: isValidTime(m.end_time) ? m.end_time : null,
  }))

  const contacts = (raw.contacts ?? []).filter(c => c.name || c.email).map(c => ({
    ...c,
    email: c.email && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(c.email) ? c.email.toLowerCase() : null,
  }))

  return { ...raw, items, meetings, contacts, warnings }
}
