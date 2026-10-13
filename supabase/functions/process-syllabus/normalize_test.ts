import {
  combineDateAndTime,
  defaultDueTime,
  normalizeAssignment,
  parseHumanDate,
} from './normalize.ts'
import type { CandidateRawItem } from './types.ts'

Deno.test('parseHumanDate handles month day without year', () => {
  const parsed = parseHumanDate('April 6', 2026)
  if (parsed !== '2026-04-06') {
    throw new Error(`expected 2026-04-06, got ${parsed}`)
  }
})

Deno.test('parseHumanDate handles ordinals', () => {
  const parsed = parseHumanDate('April 6th, 2026', 2025)
  if (parsed !== '2026-04-06') {
    throw new Error(`expected 2026-04-06, got ${parsed}`)
  }
})

Deno.test('parseHumanDate handles day-first month names', () => {
  const parsed = parseHumanDate('6 April 2026', 2025)
  if (parsed !== '2026-04-06') {
    throw new Error(`expected 2026-04-06, got ${parsed}`)
  }
})

Deno.test('parseHumanDate rejects invalid calendar dates', () => {
  const parsed = parseHumanDate('2/30/2026', 2026)
  if (parsed !== null) {
    throw new Error(`expected null, got ${parsed}`)
  }
})

Deno.test('default due time is 11:59 PM', () => {
  if (defaultDueTime() !== '23:59') {
    throw new Error(`expected 23:59, got ${defaultDueTime()}`)
  }
})

Deno.test('normalizeAssignment defaults missing due time', () => {
  const item: CandidateRawItem = {
    item_kind: 'assignment',
    title: 'Annotated Bibliography Due',
    payload: {
      title: 'Annotated Bibliography Due',
      type: 'other',
      due_date: 'April 13',
      due_time: null,
    },
    confidence: 'high',
    extraction_method: 'heuristic',
  }

  const normalized = normalizeAssignment(item, 2026)
  if (!normalized) throw new Error('expected normalized assignment')
  if (normalized.payload.due_at !== combineDateAndTime('2026-04-13', '23:59')) {
    throw new Error(`unexpected due_at ${String(normalized.payload.due_at)}`)
  }
  if (normalized.payload.time_inferred !== true) {
    throw new Error('expected time_inferred=true')
  }
})
