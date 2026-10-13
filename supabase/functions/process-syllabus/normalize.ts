import type { CandidateRawItem, Confidence, NormalizedItem } from './types.ts'

const ALLOWED_ASSIGNMENT_TYPES = new Set([
  'homework',
  'quiz',
  'exam',
  'project',
  'reading',
  'lab',
  'other',
])

function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

function isValidDateParts(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1 || day > 31) return false
  const d = new Date(Date.UTC(year, month - 1, day))
  return d.getUTCFullYear() === year
    && d.getUTCMonth() === month - 1
    && d.getUTCDate() === day
}

function normalizeTitle(input: unknown): string | null {
  if (typeof input !== 'string') return null
  const t = input.replace(/\s+/g, ' ').trim()
  return t ? t.slice(0, 200) : null
}

export function defaultDueTime(): string {
  return '23:59'
}

function normalizeConfidence(value: unknown): Confidence {
  if (typeof value !== 'string') return 'medium'
  const v = value.toLowerCase().trim()
  if (v === 'high' || v === 'medium' || v === 'low') return v
  return 'medium'
}

function monthToNumber(token: string): number | null {
  const key = token.toLowerCase().slice(0, 3)
  const map: Record<string, number> = {
    jan: 1,
    feb: 2,
    mar: 3,
    apr: 4,
    may: 5,
    jun: 6,
    jul: 7,
    aug: 8,
    sep: 9,
    oct: 10,
    nov: 11,
    dec: 12,
  }
  return map[key] || null
}

export function parseHumanDate(input: unknown, referenceYear: number): string | null {
  if (typeof input !== 'string') return null
  const text = input
    .trim()
    .replace(/(\d)(st|nd|rd|th)\b/gi, '$1')
    .replace(/\s+/g, ' ')
  if (!text || /\b(tbd|tba|week\s+\d+|end of)\b/i.test(text)) return null

  let m = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (m) {
    const year = Number(m[1])
    const month = Number(m[2])
    const day = Number(m[3])
    if (isValidDateParts(year, month, day)) {
      return `${year}-${pad2(month)}-${pad2(day)}`
    }
  }

  m = text.match(/^(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?$/)
  if (m) {
    const month = Number(m[1])
    const day = Number(m[2])
    const yearRaw = m[3]
    let year = referenceYear
    if (yearRaw) {
      const y = Number(yearRaw)
      year = y < 100 ? 2000 + y : y
    }
    if (isValidDateParts(year, month, day)) {
      return `${year}-${pad2(month)}-${pad2(day)}`
    }
  }

  m = text.match(
    /\b(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})(?:,?\s*(\d{4}))?\b/i,
  )
  if (m) {
    const month = monthToNumber(m[1])
    const day = Number(m[2])
    const year = m[3] ? Number(m[3]) : referenceYear
    if (month && isValidDateParts(year, month, day)) {
      return `${year}-${pad2(month)}-${pad2(day)}`
    }
  }

  m = text.match(
    /\b(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)(?:,?\s*(\d{4}))?\b/i,
  )
  if (m) {
    const day = Number(m[1])
    const month = monthToNumber(m[2])
    const year = m[3] ? Number(m[3]) : referenceYear
    if (month && isValidDateParts(year, month, day)) {
      return `${year}-${pad2(month)}-${pad2(day)}`
    }
  }

  return null
}

function normalizeTimeToken(input: unknown): string | null {
  if (typeof input !== 'string') return null
  const t = input.trim().toLowerCase()
  if (!t) return null

  const m = t.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i)
  if (!m) return null

  let hour = Number(m[1])
  const min = Number(m[2] || '0')
  const ap = m[3]?.toLowerCase()

  if (Number.isNaN(hour) || Number.isNaN(min)) return null
  if (min < 0 || min > 59) return null

  if (ap === 'pm' && hour < 12) hour += 12
  if (ap === 'am' && hour === 12) hour = 0

  if (hour < 0 || hour > 23) return null

  return `${pad2(hour)}:${pad2(min)}`
}

export function combineDateAndTime(date: string, time: string): string {
  return `${date}T${time}:00`
}

function normalizeAssignmentType(input: unknown): string {
  const raw = typeof input === 'string' ? input.toLowerCase().trim() : ''
  if (ALLOWED_ASSIGNMENT_TYPES.has(raw)) return raw

  if (/\b(hw|homework|assignment)\b/.test(raw)) return 'homework'
  if (/\bquiz\b/.test(raw)) return 'quiz'
  if (/\bmidterm|final|exam|test\b/.test(raw)) return 'exam'
  if (/\bproject|capstone\b/.test(raw)) return 'project'
  if (/\breading|chapter\b/.test(raw)) return 'reading'
  if (/\blab\b/.test(raw)) return 'lab'
  return 'other'
}

function normalizeDays(input: unknown): string[] {
  if (!Array.isArray(input)) return []
  const allowed = new Set(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'])
  return input
    .filter(v => typeof v === 'string')
    .map(v => v.toLowerCase().trim())
    .filter(v => allowed.has(v))
    .filter((v, idx, arr) => arr.indexOf(v) === idx)
}

export function normalizeAssignment(
  item: CandidateRawItem,
  referenceYear: number,
): NormalizedItem | null {
  const reasons = [...(item.confidence_reasons || [])]
  const payload = item.payload || {}

  const title = normalizeTitle(payload.title ?? item.title)
  if (!title) return null

  const dueDate =
    parseHumanDate(payload.due_date, referenceYear)
    || parseHumanDate(payload.due_hint, referenceYear)
    || parseHumanDate(title, referenceYear)
  let dueTime = normalizeTimeToken(payload.due_time)
  let timeInferred = false
  if (dueDate && !dueTime) {
    dueTime = defaultDueTime()
    timeInferred = true
    reasons.push('due-time-defaulted-11-59pm')
  }

  const dueAt = dueDate && dueTime ? combineDateAndTime(dueDate, dueTime) : null
  const assignmentType = normalizeAssignmentType(payload.type)
  let confidence = normalizeConfidence(item.confidence)

  if (!dueAt) {
    if (confidence === 'high') confidence = 'medium'
    reasons.push('missing-parsed-due-date')
  }
  if (assignmentType === 'other') reasons.push('generic-assignment-type')

  const dedupeKey = `assignment|${title.toLowerCase()}|${dueAt || 'none'}|${assignmentType}`
  return {
    item_kind: 'assignment',
    title,
    payload: {
      title,
      type: assignmentType,
      date_assigned: parseHumanDate(payload.date_assigned, referenceYear),
      due_date: dueDate,
      due_time: dueTime,
      due_at: dueAt,
      time_inferred: timeInferred,
    },
    confidence,
    source_snippet: item.source_snippet?.trim() || null,
    confidence_reasons: reasons,
    extraction_methods: [item.extraction_method],
    dedupe_key: dedupeKey,
  }
}

export function normalizeMeetingTime(item: CandidateRawItem): NormalizedItem | null {
  const reasons = [...(item.confidence_reasons || [])]
  const payload = item.payload || {}

  const days = normalizeDays(payload.days)
  const start = normalizeTimeToken(payload.start_time)
  const end = normalizeTimeToken(payload.end_time)
  const location = normalizeTitle(payload.location)

  if (days.length === 0 || !start || !end) return null

  let confidence = normalizeConfidence(item.confidence)
  if (confidence === 'high' && !location) {
    confidence = 'medium'
    reasons.push('meeting-location-missing')
  }

  const title = `Meeting: ${days.map(d => d.toUpperCase()).join('/')} ${start}-${end}`
  const dedupeKey = `meeting|${days.join(',')}|${start}|${end}|${(location || '').toLowerCase()}`
  return {
    item_kind: 'meeting_time',
    title,
    payload: {
      days,
      start_time: start,
      end_time: end,
      location,
    },
    confidence,
    source_snippet: item.source_snippet?.trim() || null,
    confidence_reasons: reasons,
    extraction_methods: [item.extraction_method],
    dedupe_key: dedupeKey,
  }
}

export function normalizeProfessorEmail(item: CandidateRawItem): NormalizedItem | null {
  const reasons = [...(item.confidence_reasons || [])]
  const payload = item.payload || {}
  const rawEmail = typeof payload.email === 'string' ? payload.email : ''
  const email = rawEmail.trim().toLowerCase()
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return null

  const confidence = normalizeConfidence(item.confidence)
  const dedupeKey = `professor_email|${email}`
  return {
    item_kind: 'professor_email',
    title: `Professor email: ${email}`,
    payload: { email },
    confidence,
    source_snippet: item.source_snippet?.trim() || null,
    confidence_reasons: reasons,
    extraction_methods: [item.extraction_method],
    dedupe_key: dedupeKey,
  }
}

export function normalizeCandidates(
  candidates: CandidateRawItem[],
  referenceYear: number,
): NormalizedItem[] {
  const output: NormalizedItem[] = []
  for (const item of candidates) {
    if (item.item_kind === 'assignment') {
      const normalized = normalizeAssignment(item, referenceYear)
      if (normalized) output.push(normalized)
      continue
    }
    if (item.item_kind === 'meeting_time') {
      const normalized = normalizeMeetingTime(item)
      if (normalized) output.push(normalized)
      continue
    }
    if (item.item_kind === 'professor_email') {
      const normalized = normalizeProfessorEmail(item)
      if (normalized) output.push(normalized)
    }
  }
  return output
}

function confidenceWeight(value: Confidence): number {
  return value === 'high' ? 3 : value === 'medium' ? 2 : 1
}

function fromWeight(weight: number): Confidence {
  if (weight >= 3) return 'high'
  if (weight === 2) return 'medium'
  return 'low'
}

export function dedupeAndReconcile(items: NormalizedItem[]): NormalizedItem[] {
  const groups = new Map<string, NormalizedItem[]>()
  for (const item of items) {
    const arr = groups.get(item.dedupe_key) || []
    arr.push(item)
    groups.set(item.dedupe_key, arr)
  }

  const merged: NormalizedItem[] = []
  for (const [key, group] of groups.entries()) {
    const sorted = [...group].sort(
      (a, b) => confidenceWeight(b.confidence) - confidenceWeight(a.confidence),
    )
    const base = { ...sorted[0] }

    const methods = Array.from(
      new Set(group.flatMap(item => item.extraction_methods)),
    ) as Array<'heuristic' | 'llm'>
    const reasons = Array.from(
      new Set(group.flatMap(item => item.confidence_reasons)),
    )

    let score = confidenceWeight(base.confidence)
    if (methods.length > 1) {
      score = Math.min(3, score + 1)
      reasons.push('llm-and-heuristics-agree')
    }

    if (base.item_kind === 'assignment' && !(base.payload.due_at as string | null)) {
      score = Math.max(1, score - 1)
      reasons.push('assignment-without-due-at')
    }

    base.confidence = fromWeight(score)
    base.confidence_reasons = reasons
    base.extraction_methods = methods
    base.dedupe_key = key
    base.payload = {
      ...base.payload,
      parser_meta: {
        extraction_methods: methods,
        confidence_reasons: reasons,
        parser_version: 'hybrid-v1',
      },
    }
    merged.push(base)
  }

  return merged
}
