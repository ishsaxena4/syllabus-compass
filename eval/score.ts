// Scores one extraction against a hand-checked answer key (Benchmark/expected/*.json).
import type { Extraction, ExtractedItem } from '../supabase/functions/process-syllabus/extract/schema.ts'

export interface ExpectedItem {
  title: string
  type: string
  due_date: string | null
  due_time: string | null
  importance: 'required' | 'optional'
  // Other types that are an equally fair reading of the source.
  alt_types?: string[]
}

export interface ExpectedMeeting {
  kind: string
  days: string[]
  start: string | null
  end: string | null
}

export interface AnswerKey {
  course_key: string
  sources: string[]
  context?: { student_notes?: string }
  contacts: { email: string | null }[]
  meetings: ExpectedMeeting[]
  items: ExpectedItem[]
}

export interface ItemMatch {
  expected: ExpectedItem
  actual: ExtractedItem
}

export interface CaseScore {
  required: number
  requiredFound: number
  extracted: number
  falsePositives: ExtractedItem[]
  missed: ExpectedItem[]
  matches: ItemMatch[]
  typeCorrect: number
  timeChecked: number
  timeCorrect: number
  timeWrong: ItemMatch[]
  inventedTimes: number
  meetingsFound: number
  meetingsTotal: number
  emailsFound: number
  emailsTotal: number
}

const SYNONYMS: Record<string, string> = { hw: 'homework', hws: 'homework', mt: 'midterm', rec: 'recitation' }

function tokens(title: string): Set<string> {
  const parts = title.toLowerCase().match(/[a-z]+|\d+/g) ?? []
  return new Set(parts.map(t => SYNONYMS[t] ?? t))
}

function titleSimilarity(a: string, b: string): number {
  const ta = tokens(a)
  const tb = tokens(b)
  if (ta.size === 0 || tb.size === 0) return 0
  let shared = 0
  for (const t of ta) if (tb.has(t)) shared++
  return shared / Math.min(ta.size, tb.size)
}

function typeMatches(expected: ExpectedItem, type: string): boolean {
  return expected.type === type || (expected.alt_types ?? []).includes(type)
}

// Higher is a better pairing; null means the two can't be the same item.
function pairScore(expected: ExpectedItem, actual: ExtractedItem): number | null {
  const sim = titleSimilarity(expected.title, actual.title)
  const sameType = typeMatches(expected, actual.type) ? 1 : 0
  if (expected.due_date !== null) {
    if (actual.due_date !== expected.due_date) return null
    return 2 + sameType + sim
  }
  // Undated items can only be paired on what they are.
  if (actual.due_date !== null) return null
  if (sim < 0.5 && !(sameType && sim > 0)) return null
  return sameType + sim
}

export function scoreCase(key: AnswerKey, extraction: Extraction): CaseScore {
  const candidates: { e: number; a: number; score: number }[] = []
  key.items.forEach((expected, e) => {
    extraction.items.forEach((actual, a) => {
      const score = pairScore(expected, actual)
      if (score !== null) candidates.push({ e, a, score })
    })
  })
  candidates.sort((x, y) => y.score - x.score)

  const usedExpected = new Set<number>()
  const usedActual = new Set<number>()
  const matches: ItemMatch[] = []
  for (const c of candidates) {
    if (usedExpected.has(c.e) || usedActual.has(c.a)) continue
    usedExpected.add(c.e)
    usedActual.add(c.a)
    matches.push({ expected: key.items[c.e], actual: extraction.items[c.a] })
  }

  const required = key.items.filter(i => i.importance === 'required')
  const timed = matches.filter(m => m.expected.due_time !== null)
  const timeWrong = timed.filter(m => m.actual.due_time !== m.expected.due_time)

  const meetingsFound = key.meetings.filter(exp => extraction.meetings.some(act =>
    act.kind === exp.kind
    && [...act.days].sort().join() === [...exp.days].sort().join()
    && act.start_time === exp.start
  )).length

  const expectedEmails = key.contacts.map(c => c.email).filter((e): e is string => Boolean(e))
  const actualEmails = new Set(extraction.contacts.map(c => c.email?.toLowerCase()))

  return {
    required: required.length,
    requiredFound: matches.filter(m => m.expected.importance === 'required').length,
    extracted: extraction.items.length,
    falsePositives: extraction.items.filter((_, a) => !usedActual.has(a)),
    missed: required.filter(i => !matches.some(m => m.expected === i)),
    matches,
    typeCorrect: matches.filter(m => typeMatches(m.expected, m.actual.type)).length,
    timeChecked: timed.length,
    timeCorrect: timed.length - timeWrong.length,
    timeWrong,
    inventedTimes: matches.filter(m => m.expected.due_time === null && m.actual.due_time !== null).length,
    meetingsFound,
    meetingsTotal: key.meetings.length,
    emailsFound: expectedEmails.filter(e => actualEmails.has(e.toLowerCase())).length,
    emailsTotal: expectedEmails.length,
  }
}
