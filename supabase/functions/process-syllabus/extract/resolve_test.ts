import { assertEquals } from 'jsr:@std/assert@1'
import { cleanExtraction, isValidDate, localToUtcIso } from './resolve.ts'
import type { Extraction, ExtractedItem } from './schema.ts'

Deno.test('localToUtcIso converts Eastern daylight time', () => {
  assertEquals(localToUtcIso('2026-09-04', '23:00', 'America/Indiana/Indianapolis'), '2026-09-05T03:00:00.000Z')
})

Deno.test('localToUtcIso converts Eastern standard time after DST ends', () => {
  assertEquals(localToUtcIso('2026-12-16', '15:30', 'America/New_York'), '2026-12-16T20:30:00.000Z')
})

Deno.test('localToUtcIso handles the day DST ends', () => {
  // Nov 1 2026: clocks fall back at 02:00 EDT. 23:59 that evening is EST (UTC-5).
  assertEquals(localToUtcIso('2026-11-01', '23:59', 'America/New_York'), '2026-11-02T04:59:00.000Z')
})

Deno.test('localToUtcIso handles UTC and other zones', () => {
  assertEquals(localToUtcIso('2026-10-07', '20:00', 'UTC'), '2026-10-07T20:00:00.000Z')
  assertEquals(localToUtcIso('2026-10-07', '20:00', 'America/Los_Angeles'), '2026-10-08T03:00:00.000Z')
})

Deno.test('isValidDate rejects impossible dates', () => {
  assertEquals(isValidDate('2026-02-30'), false)
  assertEquals(isValidDate('2026-12-02'), true)
  assertEquals(isValidDate('Dec 2'), false)
})

function item(overrides: Partial<ExtractedItem>): ExtractedItem {
  return {
    title: 'HW1', type: 'homework', due_date: '2026-09-04', due_time: '23:00', end_time: null,
    time_basis: 'course_policy', available_from_date: null, available_from_time: null,
    confidence: 'high', ambiguity: null, source_quote: 'HW1 due', source_document: 1,
    ...overrides,
  }
}

function extraction(items: ExtractedItem[]): Extraction {
  return {
    course: { code: null, title: null, term: null, term_start_date: null, term_end_date: null },
    contacts: [], meetings: [], items, rules: [], warnings: [],
  }
}

Deno.test('cleanExtraction drops duplicates and repairs bad fields', () => {
  const cleaned = cleanExtraction(extraction([
    item({}),
    item({ title: 'hw1 ' }),
    item({ title: 'HW2', due_date: '2026-02-30', due_time: '25:00', source_document: 7 }),
  ]), 2)
  assertEquals(cleaned.items.length, 2)
  assertEquals(cleaned.items[1].due_date, null)
  assertEquals(cleaned.items[1].due_time, null)
  assertEquals(cleaned.items[1].time_basis, 'none')
  assertEquals(cleaned.items[1].source_document, 1)
  assertEquals(cleaned.warnings.length, 1)
})
